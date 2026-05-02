/**
 * Persistent state management via chrome.storage.local.
 * Strips large payloads (extraction body) before saving to stay under quota.
 * No DOM or UI dependencies — usable from service worker only.
 */

const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarkState',
  QUEUE: 'queueState',
  ALARM_CONFIG: 'alarmConfig',
  // obsidianSettings is managed by sidepanel.js directly
};

/**
 * Strip heavy fields from a bookmark before persisting.
 * Keeps all metadata but removes extraction body text.
 */
function lightenBookmark(b) {
  const light = { ...b };
  if (light.extractedData) {
    // Keep metadata, drop the heavy body
    const { markdown, plainText, ...meta } = light.extractedData;
    light.extractedData = meta;
    light._hadExtraction = true; // Flag so UI knows extraction existed
  }
  return light;
}

// ── Bookmarks ────────────────────────────────────────────────────────

let _saveTimer = null;

/**
 * Save bookmarks to storage with 500ms debounce.
 * Call freely after every item — actual write is batched.
 */
export function saveBookmarks(bookmarks) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    const lightened = bookmarks.map(lightenBookmark);
    chrome.storage.local.set({
      [STORAGE_KEYS.BOOKMARKS]: lightened,
      bookmarkSavedAt: new Date().toISOString()
    });
  }, 500);
}

/**
 * Immediately flush bookmarks to storage (no debounce).
 * Use at end of batch operations.
 */
export function saveBookmarksNow(bookmarks) {
  clearTimeout(_saveTimer);
  const lightened = bookmarks.map(lightenBookmark);
  return new Promise(resolve => {
    chrome.storage.local.set({
      [STORAGE_KEYS.BOOKMARKS]: lightened,
      bookmarkSavedAt: new Date().toISOString()
    }, resolve);
  });
}

/**
 * Load bookmarks from storage.
 * Returns [] if nothing is stored.
 */
export function loadBookmarks() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.BOOKMARKS], result => {
      resolve(result[STORAGE_KEYS.BOOKMARKS] || []);
    });
  });
}

// ── Queue State ──────────────────────────────────────────────────────

export function saveQueueState(queue) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.QUEUE]: queue }, resolve);
  });
}

export function loadQueueState() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.QUEUE], result => {
      resolve(result[STORAGE_KEYS.QUEUE] || null);
    });
  });
}

export function clearQueueState() {
  return new Promise(resolve => {
    chrome.storage.local.remove(STORAGE_KEYS.QUEUE, resolve);
  });
}

// ── Alarm Config ─────────────────────────────────────────────────────

export function saveAlarmConfig(config) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [STORAGE_KEYS.ALARM_CONFIG]: config }, resolve);
  });
}

export function loadAlarmConfig() {
  return new Promise(resolve => {
    chrome.storage.local.get([STORAGE_KEYS.ALARM_CONFIG], result => {
      resolve(result[STORAGE_KEYS.ALARM_CONFIG] || { enabled: false, intervalMinutes: 1440 });
    });
  });
}

// ── Full Reset ───────────────────────────────────────────────────────

export function clearAll() {
  return new Promise(resolve => {
    chrome.storage.local.remove(Object.values(STORAGE_KEYS), resolve);
  });
}
