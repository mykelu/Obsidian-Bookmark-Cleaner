// Obsidian Bookmark Cleaner - Service Worker
import { scanBookmarksTree } from '../lib/bookmark-scanner.js';
import { markDuplicates } from '../lib/deduper.js';
import { setupReviewFolders, moveBookmark } from '../lib/bookmark-actions.js';
import { checkLinksInBatches, checkBookmark } from '../lib/link-checker.js';
import { extractContentFromUrl, closeOffscreenDocument } from '../lib/extractor.js';
import { buildMarkdownNote } from '../lib/note-builder.js';
import { noteExists, createNote, updateNote } from '../lib/obsidian-api.js';
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
  isScanning: false,
  isBusy: false, // Prevents concurrent batch operations
  bookmarks: [],
  reviewFolders: null,
  activeQueue: null // Current task queue
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
  } catch (e) {
    console.error('[Service Worker] State hydration failed:', e);
  }
}

// Run hydration on module load
hydrateState();

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
  // Skip messages targeted at the offscreen document
  if (message.target === 'offscreen') return false;

  console.log('[Service Worker] Received message:', message.action);

  if (message.action === 'HEALTH_CHECK') {
    const pendingJobs = state.activeQueue ? (state.activeQueue.ids.length - state.activeQueue.cursor) : 0;
    sendResponse({
      ok: true,
      status: 'ok', // for backward compatibility
      workerVersion: manifest.version,
      timestamp: new Date().toISOString(),
      uptimeHint: WORKER_START_TIME,
      pendingJobs: Math.max(0, pendingJobs),
      message: state.isBusy ? 'Processing queue...' : 'Idle',
      state: state.settings,
      hasBookmarks: state.bookmarks.length > 0,
      hasQueue: !!state.activeQueue && !isComplete(state.activeQueue)
    });
  }

  if (message.action === 'SCAN_BOOKMARKS') {
    state.isScanning = true;
    state.isBusy = true;
    scanBookmarksTree(message.rootId).then(async (bookmarks) => {
      state.bookmarks = bookmarks;
      state.isScanning = false;
      state.isBusy = false;

      // Calculate summary stats
      const folderStats = {};
      bookmarks.forEach(b => {
        folderStats[b.folderPath] = (folderStats[b.folderPath] || 0) + 1;
      });

      // Persist
      await saveBookmarksNow(bookmarks);

      sendResponse({
        status: 'success',
        total: bookmarks.length,
        folderStats,
        bookmarks
      });
    }).catch(err => {
      state.isScanning = false;
      state.isBusy = false;
      sendResponse({ status: 'error', message: err.toString() });
    });
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
  }

  if (message.action === 'SETUP_FOLDERS') {
    setupReviewFolders().then(folders => {
      state.reviewFolders = folders;
      sendResponse({ status: 'success', folders });
    }).catch(err => sendResponse({ status: 'error', message: err.toString() }));
  }

  if (message.action === 'MOVE_BOOKMARKS') {
    const { bookmarkIds, folderName } = message;
    const folderId = state.reviewFolders?.[folderName];

    if (!folderId) {
      sendResponse({ status: 'error', message: `Target folder '${folderName}' not found. Please Setup Review Folders first.` });
    } else {
      Promise.all(bookmarkIds.map(id => moveBookmark(id, folderId)))
        .then(() => sendResponse({ status: 'success', count: bookmarkIds.length }))
        .catch(err => sendResponse({ status: 'error', message: err.toString() }));
    }
  }

  if (message.action === 'CHECK_LINKS') {
    if (isTrulyBusy()) {
      sendResponse({ status: 'error', message: 'Another operation is in progress. Please wait or pause it first.' });
      return true;
    }

    state.isBusy = true;

    // Create a queue for link checking
    const ids = state.bookmarks
      .filter(b => b.status !== 'duplicate' && b.status !== 'healthy')
      .map(b => b.id);
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
            const data = await extractContentFromUrl(urlToExtract);
            bookmark.extractedData = data;
            bookmark.extractionStatus = data.extractionStatus || 'success';
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
                  const data = await extractContentFromUrl(bookmark.finalUrl || bookmark.url);
                  bookmark.extractedData = data;
                  bookmark.extractionStatus = data.extractionStatus || 'success';
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

            while (true) {
              const id = dequeue(state.activeQueue);
              if (id === null) break;
              const bookmark = state.bookmarks.find(b => b.id === id);
              if (bookmark && apiKey) {
                try {
                  const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings);
                  const exists = await noteExists(baseUrl, apiKey, notePath);
                  if (exists && bookmark.capturedContentHash === contentHash) {
                    bookmark.captureStatus = 'skipped';
                  } else {
                    if (exists) await updateNote(baseUrl, apiKey, notePath, noteContent);
                    else await createNote(baseUrl, apiKey, notePath, noteContent);
                    bookmark.captureStatus = exists ? 'updated' : 'created';
                  }
                  bookmark.capturedAt = capturedAt;
                  bookmark.capturedNotePath = notePath;
                  bookmark.capturedContentHash = contentHash;
                  markDone(state.activeQueue, id);
                } catch (e) {
                  bookmark.captureStatus = 'failed';
                  markFailed(state.activeQueue, id, e.toString());
                }
              } else {
                markFailed(state.activeQueue, id, 'Missing data or key');
              }
              if (state.activeQueue.cursor % 5 === 0) {
                saveBookmarks(state.bookmarks);
                await saveQueueState(serializeQueueState(state.activeQueue));
              }
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
    } else {
      sendResponse({ status: 'error', message: 'No paused queue to resume' });
    }
  }

  if (message.action === 'GET_QUEUE_STATUS') {
    sendResponse({
      status: 'success',
      progress: getProgress(state.activeQueue),
      isBusy: state.isBusy
    });
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

  // ── Phase 8: Classify Actions ────────────────────────────────────

  if (message.action === 'CLASSIFY_ALL') {
    const classified = state.bookmarks.map(b => ({
      id: b.id,
      action: classifyAction(b)
    }));
    sendResponse({ status: 'success', classified });
  }

  // Ensure we return true if we want to send a response asynchronously later
  return true;
});

console.log('[Service Worker] Initialized');
