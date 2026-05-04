// Obsidian Bookmark Cleaner - Service Worker
import { scanBookmarksTree } from '../lib/bookmark-scanner.js';
import { markDuplicates } from '../lib/deduper.js';
import { setupReviewFolders, moveBookmark } from '../lib/bookmark-actions.js';
import { checkLinksInBatches, checkBookmark } from '../lib/link-checker.js';
import { extractContentFromUrl, closeOffscreenDocument } from '../lib/extractor.js';
import { buildMarkdownNote, generateAttachmentPath } from '../lib/note-builder.js';
import { noteExists, createNote, updateNote, uploadFile } from '../lib/obsidian-api.js';
import { saveBookmarks, saveBookmarksNow, loadBookmarks, saveQueueState, loadQueueState, clearQueueState, saveAlarmConfig, loadAlarmConfig } from '../lib/state-store.js';
import { createQueue, serializeQueueState, restoreQueueState, dequeue, markDone, markFailed, pause, resume, getProgress, isComplete } from '../lib/task-queue.js';
import { isRecheckDue, shouldPromoteToDeleteCandidate, classifyAction } from '../lib/recheck-policy.js';

// Basic state in memory
const WORKER_START_TIME = new Date().toISOString();
const manifest = chrome.runtime.getManifest();

const state = {
  settings: {
    obsidianBaseUrl: 'https://127.0.0.1:27124',
    apiKey: '',
    destinationFolder: 'Bookmarks',
    filenameTemplate: '{title}.md'
  },
  scraperSettings: {
    method: 'standard',
    extractSiteContext: false
  },
  isScanning: false,
  isBusy: false, // Prevents concurrent batch operations
  bookmarks: [],
  reviewFolders: null,
  activeQueue: null, // Current task queue
  isHydrated: false // Tracks if storage load is complete
};

/**
 * Hardened busy check that accounts for Service Worker restarts.
 * If a queue exists and is running, we are busy even if state.isBusy was reset.
 */
function isTrulyBusy() {
  if (state.isScanning) return true;
  if (state.isBusy) return true;
  if (state.activeQueue && !isComplete(state.activeQueue) && !state.activeQueue.paused) return true;
  return false;
}

// ── State Hydration ──────────────────────────────────────────────────

async function hydrateState() {
  try {
    const stored = await loadBookmarks();
    if (stored && stored.length > 0) {
      state.bookmarks = stored;
      console.log(`[Service Worker] Hydrated ${stored.length} bookmarks from storage`);
    }

    const queueData = await loadQueueState();
    if (queueData) {
      state.activeQueue = restoreQueueState(queueData);
      if (state.activeQueue && !isComplete(state.activeQueue)) {
        // Mark as paused — user must manually resume
        state.activeQueue.paused = true;
        console.log(`[Service Worker] Found in-progress queue (${state.activeQueue.type}), marked as paused`);
      }
    }

    const scraperData = await chrome.storage.local.get('scraperSettings');
    if (scraperData.scraperSettings) {
      state.scraperSettings = scraperData.scraperSettings;
      console.log('[Service Worker] Hydrated scraper settings:', state.scraperSettings);
    }
  } catch (e) {
    console.error('[Service Worker] State hydration failed:', e);
  } finally {
    state.isHydrated = true;
  }
}

let hydrationPromise = null;
async function ensureHydrated() {
  if (state.isHydrated) return;
  if (!hydrationPromise) {
    hydrationPromise = hydrateState();
  }
  return hydrationPromise;
}

// Run hydration on module load
ensureHydrated();

// ── Alarms ───────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[Service Worker] Alarm fired: ${alarm.name}`);

  if (alarm.name === 'recheck-soft-broken') {
    if (isTrulyBusy()) {
      console.log('[Service Worker] Skipping recheck — busy with another operation');
      return;
    }

    state.isBusy = true;
    try {
      // Ensure we have bookmarks
      if (state.bookmarks.length === 0) {
        const stored = await loadBookmarks();
        if (stored.length > 0) state.bookmarks = stored;
      }

      // Filter to items eligible for recheck
      const eligible = state.bookmarks.filter(b =>
        (b.status === 'soft-broken' || b.status === 'hard-broken') && isRecheckDue(b)
      );

      if (eligible.length === 0) {
        console.log('[Service Worker] No bookmarks eligible for recheck');
        return;
      }

      console.log(`[Service Worker] Rechecking ${eligible.length} eligible bookmarks`);

      // Reset eligible items to pending so the checker picks them up
      eligible.forEach(b => { b.status = 'pending'; });

      await checkLinksInBatches(eligible, 10);
      await saveBookmarksNow(state.bookmarks);

      // Update last run timestamp
      const config = await loadAlarmConfig();
      config.lastRun = new Date().toISOString();
      await saveAlarmConfig(config);

      console.log('[Service Worker] Alarm recheck completed');
    } catch (e) {
      console.error('[Service Worker] Alarm recheck error:', e);
    } finally {
      state.isBusy = false;
    }
  }
});

// ── Side Panel ───────────────────────────────────────────────────────

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting panel behavior:', error));

// ── Message Handling ─────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Handle HEALTH_CHECK immediately (don't wait for hydration)
  if (message.action === 'SAVE_BOOKMARKS') {
    state.bookmarks = message.bookmarks;
    saveBookmarksNow(state.bookmarks).then(() => {
      sendResponse({ status: 'success' });
    }).catch(err => {
      sendResponse({ status: 'error', message: err.toString() });
    });
    return true;
  }

  if (message.action === 'HEALTH_CHECK') {
    const pendingJobs = (state.activeQueue && state.activeQueue.items) ? (state.activeQueue.items.length - state.activeQueue.cursor) : 0;
    sendResponse({
      ok: true,
      status: 'ok',
      isHydrated: state.isHydrated,
      workerVersion: manifest.version,
      timestamp: new Date().toISOString(),
      uptimeHint: WORKER_START_TIME,
      pendingJobs: Math.max(0, pendingJobs),
      message: state.isBusy ? 'Processing queue...' : (state.isHydrated ? 'Idle' : 'Hydrating...'),
      state: state.settings,
      hasBookmarks: state.bookmarks.length > 0,
      bookmarks: state.bookmarks,
      hasQueue: !!state.activeQueue && !isComplete(state.activeQueue),
      isBusy: state.isBusy,
      isScanning: state.isScanning
    });
    return false;
  }

  if (message.action === 'UPDATE_SETTINGS') {
    if (message.obsidianSettings) state.settings = { ...state.settings, ...message.obsidianSettings };
    if (message.scraperSettings) state.scraperSettings = { ...state.scraperSettings, ...message.scraperSettings };
    sendResponse({ status: 'success' });
    return false;
  }

  if (message.action === 'GET_BOOKMARKS') {
    sendResponse({ status: 'success', bookmarks: state.bookmarks });
    return false;
  }

  // 2. Wait for hydration for all other actions to complete
  ensureHydrated().then(() => {
    processMessage(message, sender, sendResponse);
  }).catch(err => {
    console.error('[Service Worker] Message failed due to hydration error:', err);
    sendResponse({ status: 'error', message: 'Initialization failed. Please reload the extension.' });
  });

  return true; // Keep channel open for async response
});

function processMessage(message, sender, sendResponse) {
  console.log('[Service Worker] Processing message:', message.action);

  if (message.action === 'SCAN_BOOKMARKS') {
    state.isScanning = true;
    state.isBusy = true;
    scanBookmarksTree(message.rootId).then(async (freshBookmarks) => {
      // Build a lookup of existing bookmark data to preserve enrichment
      const existingById = {};
      const existingByUrl = {};
      for (const b of state.bookmarks) {
        existingById[b.id] = b;
        existingByUrl[b.url] = b;
      }

      // Merge: preserve previously gathered data for known bookmarks
      const merged = freshBookmarks.map(fresh => {
        const existing = existingById[fresh.id] || existingByUrl[fresh.url];
        if (existing) {
          return {
            ...fresh,
            status: existing.status || fresh.status,
            httpStatus: existing.httpStatus,
            error: existing.error,
            finalUrl: existing.finalUrl,
            attempts: existing.attempts || 0,
            firstChecked: existing.firstChecked,
            lastChecked: existing.lastChecked,
            extractedData: existing.extractedData,
            extractionStatus: existing.extractionStatus,
            captureStatus: existing.captureStatus,
            capturedAt: existing.capturedAt,
            capturedNotePath: existing.capturedNotePath,
            capturedContentHash: existing.capturedContentHash
          };
        }
        return { ...fresh, status: 'pending' };
      });

      state.bookmarks = merged;
      state.lastScannedAt = new Date().toISOString();
      state.isScanning = false;
      state.isBusy = false;

      // Calculate summary stats
      const folderStats = {};
      merged.forEach(b => {
        folderStats[b.folderPath] = (folderStats[b.folderPath] || 0) + 1;
      });

      const alreadyChecked = merged.filter(b => b.status && b.status !== 'pending').length;

      // Persist
      await saveBookmarksNow(merged);

      sendResponse({
        status: 'success',
        total: merged.length,
        alreadyChecked,
        lastScannedAt: state.lastScannedAt,
        folderStats,
        bookmarks: merged
      });
    }).catch(err => {
      state.isScanning = false;
      state.isBusy = false;
      sendResponse({ status: 'error', message: err.toString() });
    });
    return true;
  }

  if (message.action === 'DEDUPE_BOOKMARKS') {
    if (!state.bookmarks || state.bookmarks.length === 0) {
      sendResponse({ status: 'error', message: 'No bookmarks scanned.' });
    } else {
      const { processed, duplicateCount } = markDuplicates(state.bookmarks);
      state.bookmarks = processed;
      saveBookmarks(state.bookmarks);
      sendResponse({ status: 'success', duplicateCount, bookmarks: state.bookmarks });
    }
    return false;
  }

  if (message.action === 'SETUP_FOLDERS') {
    setupReviewFolders().then(folders => {
      state.reviewFolders = folders;
      sendResponse({ status: 'success', folders });
    }).catch(err => sendResponse({ status: 'error', message: err.toString() }));
    return true;
  }

  if (message.action === 'MOVE_BOOKMARKS') {
    const { bookmarkIds, folderName } = message;
    const folderId = state.reviewFolders?.[folderName];

    if (!folderId) {
      sendResponse({ status: 'error', message: `Target folder '${folderName}' not found. Please Setup Review Folders first.` });
      return false;
    } else {
      Promise.all(bookmarkIds.map(id => moveBookmark(id, folderId)))
        .then(() => sendResponse({ status: 'success', count: bookmarkIds.length }))
        .catch(err => sendResponse({ status: 'error', message: err.toString() }));
      return true;
    }
  }

  if (message.action === 'CHECK_LINKS') {
    if (isTrulyBusy()) {
      sendResponse({ status: 'error', message: 'Another operation is in progress. Please wait or pause it first.' });
      return true;
    }

    state.isBusy = true;

    // Create a queue for link checking
    let eligible = state.bookmarks.filter(b => b.status !== 'duplicate' && b.status !== 'healthy');
    
    // Apply limit if requested
    if (message.limit && message.limit > 0) {
      eligible = eligible.slice(0, message.limit);
    }
    
    const ids = eligible.map(b => b.id);
    state.activeQueue = createQueue(ids, 'check-links');

    (async () => {
      try {
        while (true) {
          const id = dequeue(state.activeQueue);
          if (id === null) break;

          const bookmark = state.bookmarks.find(b => b.id === id);
          if (bookmark) {
            await checkBookmark(bookmark);
            markDone(state.activeQueue, id);
          } else {
            markFailed(state.activeQueue, id, 'Not found');
          }

          // Periodic save
          if (state.activeQueue.cursor % 10 === 0) {
            saveBookmarks(state.bookmarks);
            await saveQueueState(serializeQueueState(state.activeQueue));
          }
        }

        await saveBookmarksNow(state.bookmarks);
        await clearQueueState();
        state.activeQueue = null;
        sendResponse({ status: 'success', bookmarks: state.bookmarks });
      } catch (err) {
        sendResponse({ status: 'error', message: err.toString() });
      } finally {
        state.isBusy = false;
      }
    })();
    return true;
  }

  if (message.action === 'RECHECK_BROKEN') {
    state.bookmarks.forEach(b => {
      if (b.status === 'soft-broken') {
        b.status = 'pending';
      }
    });

    state.isBusy = true;
    checkLinksInBatches(state.bookmarks, 10).then(async () => {
      await saveBookmarksNow(state.bookmarks);
      state.isBusy = false;
      sendResponse({ status: 'success', bookmarks: state.bookmarks });
    }).catch(err => {
      state.isBusy = false;
      sendResponse({ status: 'error', message: err.toString() });
    });
    return true;
  }

  if (message.action === 'CHECK_SINGLE_LINK') {
    const bookmark = state.bookmarks.find(b => b.id === message.id);
    if (!bookmark) {
      sendResponse({ status: 'error', message: 'Bookmark not found' });
      return true;
    }

    if (bookmark.status === 'soft-broken') bookmark.status = 'pending';

    checkBookmark(bookmark).then(async (updated) => {
      saveBookmarks(state.bookmarks);
      sendResponse({ status: 'success', bookmark: updated, allBookmarks: state.bookmarks });
    }).catch(err => {
      sendResponse({ status: 'error', message: err.toString() });
    });
    return true;
  }

  if (message.action === 'EXTRACT_BATCH') {
    if (isTrulyBusy()) {
      sendResponse({ status: 'error', message: 'Another operation is in progress.' });
      return true;
    }

    const ids = message.ids;
    state.isBusy = true;
    state.activeQueue = createQueue(ids, 'extract');

    (async () => {
      try {
        while (true) {
          const id = dequeue(state.activeQueue);
          if (id === null) break;

          const bookmark = state.bookmarks.find(b => b.id === id);
          if (!bookmark || (bookmark.status !== 'healthy' && bookmark.status !== 'redirected')) {
            markDone(state.activeQueue, id);
            continue;
          }

          bookmark.extractionStatus = 'pending';
          const urlToExtract = bookmark.finalUrl || bookmark.url;

          try {
            if (bookmark.isFile) {
              bookmark.extractionStatus = 'file';
            } else {
              const data = await extractContentFromUrl(urlToExtract, state.scraperSettings);
              bookmark.extractedData = data;
              bookmark.extractionStatus = data.extractionStatus || 'success';
            }
            markDone(state.activeQueue, id);
          } catch (e) {
            bookmark.extractionStatus = 'failed';
            bookmark.extractedData = { extractionWarnings: [e.toString()] };
            markFailed(state.activeQueue, id, e.toString());
          }

          // Periodic save (metadata only, extraction body is stripped)
          if (state.activeQueue.cursor % 5 === 0) {
            saveBookmarks(state.bookmarks);
            await saveQueueState(serializeQueueState(state.activeQueue));
          }
        }

        await closeOffscreenDocument();
        await saveBookmarksNow(state.bookmarks);
        await clearQueueState();
        state.activeQueue = null;
        sendResponse({ status: 'success', allBookmarks: state.bookmarks });
      } catch (err) {
        sendResponse({ status: 'error', message: err.toString() });
      } finally {
        state.isBusy = false;
      }
    })();
    return true;
  }

  if (message.action === 'PREVIEW_NOTE') {
    const bookmark = state.bookmarks.find(b => b.id === message.id);
    if (!bookmark) {
      sendResponse({ status: 'error', message: 'Bookmark not found' });
      return true;
    }

    chrome.storage.local.get(['obsidianSettings'], async (result) => {
      const settings = result.obsidianSettings || state.settings;
      try {
        const { noteContent, notePath, contentHash } = await buildMarkdownNote(bookmark, settings);
        const exists = await noteExists(settings.baseUrl || settings.obsidianBaseUrl, settings.apiKey, notePath);
        sendResponse({
          status: 'success',
          noteContent,
          notePath,
          contentHash,
          willUpdate: exists
        });
      } catch (e) {
        sendResponse({ status: 'error', message: e.toString() });
      }
    });
    return true;
  }

  if (message.action === 'CAPTURE_BATCH') {
    if (isTrulyBusy()) {
      sendResponse({ status: 'error', message: 'Another operation is in progress.' });
      return true;
    }

    const ids = message.ids;
    state.isBusy = true;
    state.activeQueue = createQueue(ids, 'capture');

    chrome.storage.local.get(['obsidianSettings'], async (result) => {
      const settings = result.obsidianSettings || state.settings;
      const baseUrl = settings.baseUrl || settings.obsidianBaseUrl;
      const apiKey = settings.apiKey;

      if (!apiKey) {
        state.isBusy = false;
        state.activeQueue = null;
        sendResponse({ status: 'error', message: 'No API key configured. Go to Obsidian tab and run diagnostics first.' });
        return;
      }

      try {
        while (true) {
          const id = dequeue(state.activeQueue);
          if (id === null) break;

          const bookmark = state.bookmarks.find(b => b.id === id);
          if (!bookmark) {
            markFailed(state.activeQueue, id, 'Bookmark not found');
            continue;
          }

          try {
            const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings);
            let action;
            const exists = await noteExists(baseUrl, apiKey, notePath);

            // Handle binary upload if it's a file
            if (bookmark.isFile) {
              const attachmentPath = generateAttachmentPath(bookmark, settings);
              const response = await fetch(bookmark.finalUrl || bookmark.url);
              if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
              const blob = await response.blob();
              await uploadFile(baseUrl, apiKey, attachmentPath, blob);
            }

            if (exists) {
              if (bookmark.capturedContentHash === contentHash) {
                action = 'skipped';
                bookmark.captureStatus = action;
                markDone(state.activeQueue, id);
                continue;
              }
              await updateNote(baseUrl, apiKey, notePath, noteContent);
              action = 'updated';
            } else {
              await createNote(baseUrl, apiKey, notePath, noteContent);
              action = 'created';
            }

            bookmark.captureStatus = action;
            bookmark.capturedAt = capturedAt;
            bookmark.capturedNotePath = notePath;
            bookmark.capturedContentHash = contentHash;
            markDone(state.activeQueue, id);
          } catch (e) {
            bookmark.captureStatus = 'failed';
            bookmark.captureError = e.toString();
            markFailed(state.activeQueue, id, e.toString());
          }

          // Periodic save
          if (state.activeQueue.cursor % 5 === 0) {
            saveBookmarks(state.bookmarks);
            await saveQueueState(serializeQueueState(state.activeQueue));
          }
        }

        await saveBookmarksNow(state.bookmarks);
        await clearQueueState();
        state.activeQueue = null;
        sendResponse({ status: 'success', allBookmarks: state.bookmarks });
      } catch (err) {
        sendResponse({ status: 'error', message: err.toString() });
      } finally {
        state.isBusy = false;
      }
    });
    return true;
  }

  // ── Phase 8: Queue Control ───────────────────────────────────────

  if (message.action === 'PAUSE_QUEUE') {
    if (state.activeQueue) {
      pause(state.activeQueue);
      saveQueueState(serializeQueueState(state.activeQueue));
      sendResponse({ status: 'success', progress: getProgress(state.activeQueue) });
    } else {
      sendResponse({ status: 'error', message: 'No active queue to pause' });
    }
    return false;
  }

  if (message.action === 'RESUME_QUEUE') {
    if (state.activeQueue && state.activeQueue.paused) {
      resume(state.activeQueue);
      state.isBusy = true;

      const queueType = state.activeQueue.type;
      
      (async () => {
        try {
          if (queueType === 'check-links') {
            while (true) {
              const id = dequeue(state.activeQueue);
              if (id === null) break;
              const bookmark = state.bookmarks.find(b => b.id === id);
              if (bookmark) {
                await checkBookmark(bookmark);
                markDone(state.activeQueue, id);
              } else {
                markFailed(state.activeQueue, id, 'Not found');
              }
              if (state.activeQueue.cursor % 10 === 0) {
                saveBookmarks(state.bookmarks);
                await saveQueueState(serializeQueueState(state.activeQueue));
              }
            }
          } else if (queueType === 'extract') {
            while (true) {
              const id = dequeue(state.activeQueue);
              if (id === null) break;
              const bookmark = state.bookmarks.find(b => b.id === id);
              if (bookmark && (bookmark.status === 'healthy' || bookmark.status === 'redirected')) {
                try {
                  if (bookmark.isFile) {
                    bookmark.extractionStatus = 'file';
                  } else {
                    const data = await extractContentFromUrl(bookmark.finalUrl || bookmark.url, state.scraperSettings);
                    bookmark.extractedData = data;
                    bookmark.extractionStatus = data.extractionStatus || 'success';
                  }
                  markDone(state.activeQueue, id);
                } catch (e) {
                  bookmark.extractionStatus = 'failed';
                  markFailed(state.activeQueue, id, e.toString());
                }
              } else {
                markDone(state.activeQueue, id);
              }
              if (state.activeQueue.cursor % 5 === 0) {
                saveBookmarks(state.bookmarks);
                await saveQueueState(serializeQueueState(state.activeQueue));
              }
            }
            await closeOffscreenDocument();
          } else if (queueType === 'capture') {
            const settings = (await chrome.storage.local.get(['obsidianSettings'])).obsidianSettings || state.settings;
            const baseUrl = settings.baseUrl || settings.obsidianBaseUrl;
            const apiKey = settings.apiKey;

            const results = [];
            while (true) {
              const id = dequeue(state.activeQueue);
              if (id === null) break;
              const bookmark = state.bookmarks.find(b => b.id === id);
              if (bookmark && apiKey) {
                try {
                  const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings);
                  
                  // Handle binary upload if it's a file
                  if (bookmark.isFile) {
                    const attachmentPath = generateAttachmentPath(bookmark, settings);
                    const response = await fetch(bookmark.finalUrl || bookmark.url);
                    if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
                    const blob = await response.blob();
                    await uploadFile(baseUrl, apiKey, attachmentPath, blob);
                  }

                  const exists = await noteExists(baseUrl, apiKey, notePath);
                  let action = '';
                  if (exists && bookmark.capturedContentHash === contentHash) {
                    bookmark.captureStatus = 'skipped';
                    action = 'skipped';
                  } else {
                    if (exists) await updateNote(baseUrl, apiKey, notePath, noteContent);
                    else await createNote(baseUrl, apiKey, notePath, noteContent);
                    bookmark.captureStatus = exists ? 'updated' : 'created';
                    action = bookmark.captureStatus;
                  }
                  bookmark.capturedAt = capturedAt;
                  bookmark.capturedNotePath = notePath;
                  bookmark.capturedContentHash = contentHash;
                  markDone(state.activeQueue, id);
                  results.push({ id, action, notePath });
                } catch (e) {
                  bookmark.captureStatus = 'failed';
                  bookmark.captureError = e.toString();
                  markFailed(state.activeQueue, id, e.toString());
                  results.push({ id, action: 'failed', reason: e.toString() });
                }
              } else {
                markFailed(state.activeQueue, id, 'Missing data or key');
                results.push({ id, action: 'failed', reason: 'Missing data or key' });
              }
              if (state.activeQueue.cursor % 5 === 0) {
                saveBookmarks(state.bookmarks);
                await saveQueueState(serializeQueueState(state.activeQueue));
              }
            }
            await saveBookmarksNow(state.bookmarks);
            await clearQueueState();
            state.activeQueue = null;
            sendResponse({ status: 'success', allBookmarks: state.bookmarks, results });
            return; // Exit after async sendResponse
          }
        } catch (err) {
          sendResponse({ status: 'error', message: err.toString() });
        } finally {
          state.isBusy = false;
        }
      })();
      return true;
    } else {
      sendResponse({ status: 'error', message: 'No paused queue to resume' });
      return false;
    }
  }

  if (message.action === 'GET_QUEUE_STATUS') {
    sendResponse({
      status: 'success',
      progress: getProgress(state.activeQueue),
      isBusy: state.isBusy
    });
    return false;
  }

  // ── Phase 8: Alarm Scheduling ────────────────────────────────────

  if (message.action === 'SCHEDULE_RECHECK') {
    const intervalMinutes = message.intervalMinutes || 1440;
    chrome.alarms.create('recheck-soft-broken', { periodInMinutes: intervalMinutes });
    const config = { enabled: true, intervalMinutes, lastRun: null };
    saveAlarmConfig(config);
    sendResponse({ status: 'success', config });
  }

  if (message.action === 'CANCEL_RECHECK') {
    chrome.alarms.clear('recheck-soft-broken');
    saveAlarmConfig({ enabled: false, intervalMinutes: 1440, lastRun: null });
    sendResponse({ status: 'success' });
    return false;
  }

  if (message.action === 'GET_ALARM_CONFIG') {
    loadAlarmConfig().then(config => sendResponse({ status: 'success', config }));
    return true;
  }

  // ── Phase 8: Delete Candidate Review ─────────────────────────────

  if (message.action === 'GET_DELETE_CANDIDATES') {
    const candidates = state.bookmarks
      .filter(shouldPromoteToDeleteCandidate)
      .map(b => ({
        id: b.id,
        title: b.title,
        url: b.url,
        status: b.status,
        attempts: b.attempts,
        firstChecked: b.firstChecked,
        lastChecked: b.lastChecked,
        action: classifyAction(b)
      }));
    sendResponse({ status: 'success', candidates });
  }

  if (message.action === 'DELETE_BOOKMARKS') {
    if (!message.confirmed) {
      sendResponse({ status: 'error', message: 'Deletion requires explicit confirmation (confirmed: true)' });
      return true;
    }

    const ids = message.ids;
    if (!ids || ids.length === 0) {
      sendResponse({ status: 'error', message: 'No bookmark IDs provided' });
      return true;
    }

    // SAFETY GUARD: Verify all IDs meet the deletion policy before proceeding
    const safeToDeleteIds = ids.filter(id => {
      const b = state.bookmarks.find(item => item.id === id);
      const isCandidate = b && shouldPromoteToDeleteCandidate(b);
      if (!isCandidate && b) {
        console.warn(`[Service Worker] Blocked deletion attempt for non-candidate: ${b.title} (${id})`);
      }
      return isCandidate;
    });

    if (safeToDeleteIds.length === 0) {
      sendResponse({ status: 'error', message: 'None of the provided bookmarks meet the 21-day/3-check deletion policy.' });
      return true;
    }

    (async () => {
      const results = [];
      for (const id of safeToDeleteIds) {
        try {
          await chrome.bookmarks.remove(id);
          results.push({ id, action: 'deleted' });
        } catch (e) {
          results.push({ id, action: 'failed', reason: e.toString() });
        }
      }
      // Remove deleted bookmarks from state
      const deletedIds = new Set(results.filter(r => r.action === 'deleted').map(r => r.id));
      state.bookmarks = state.bookmarks.filter(b => !deletedIds.has(b.id));
      await saveBookmarksNow(state.bookmarks);
      sendResponse({ status: 'success', results, allBookmarks: state.bookmarks });
    })();
    return true;
  }

  // ── User-Driven Manual Deletion (no policy gate) ─────────────────
  // For bookmarks the user has manually reviewed and selected for removal.

  if (message.action === 'DELETE_BOOKMARKS_MANUAL') {
    if (!message.confirmed) {
      sendResponse({ status: 'error', message: 'Deletion requires explicit confirmation (confirmed: true)' });
      return true;
    }

    const ids = message.ids;
    if (!ids || ids.length === 0) {
      sendResponse({ status: 'error', message: 'No bookmark IDs provided' });
      return true;
    }

    // Verify all IDs exist in our state (safety check)
    const validIds = ids.filter(id => state.bookmarks.some(b => b.id === id));
    if (validIds.length === 0) {
      sendResponse({ status: 'error', message: 'None of the provided IDs match known bookmarks.' });
      return true;
    }

    (async () => {
      // Export backup before deletion
      const backupBookmarks = state.bookmarks
        .filter(b => validIds.includes(b.id))
        .map(b => ({ id: b.id, title: b.title, url: b.url, folderPath: b.folderPath, status: b.status }));
      
      console.log('[Service Worker] Manual deletion backup:', JSON.stringify(backupBookmarks));

      const results = [];
      for (const id of validIds) {
        try {
          await chrome.bookmarks.remove(id);
          results.push({ id, action: 'deleted' });
        } catch (e) {
          results.push({ id, action: 'failed', reason: e.toString() });
        }
      }
      // Remove deleted bookmarks from state
      const deletedIds = new Set(results.filter(r => r.action === 'deleted').map(r => r.id));
      state.bookmarks = state.bookmarks.filter(b => !deletedIds.has(b.id));
      await saveBookmarksNow(state.bookmarks);
      sendResponse({ status: 'success', results, backup: backupBookmarks, allBookmarks: state.bookmarks });
    })();
    return true;
  }

  // ── Phase 8: Classify Actions ────────────────────────────────────

  // Phase 8: Classify Actions (Sync)
  if (message.action === 'CLASSIFY_ALL') {
    const classified = state.bookmarks.map(b => ({
      id: b.id,
      action: classifyAction(b)
    }));
    sendResponse({ status: 'success', classified });
    return false;
  }

  return false;
}

console.log('[Service Worker] Initialized');
