/**
 * Serializable task queue with pause/resume/checkpoint.
 * No Chrome API dependencies — pure data structure.
 */

/**
 * Create a new queue from an array of bookmark IDs.
 * @param {string[]} ids - Array of bookmark IDs to process
 * @param {string} type - Queue type: 'check-links', 'extract', 'capture'
 */
export function createQueue(ids, type) {
  return {
    type,
    items: ids.map(id => ({ id, status: 'pending', error: null })),
    cursor: 0,
    paused: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Serialize queue state for chrome.storage.local.
 */
export function serializeQueueState(queue) {
  if (!queue) return null;
  return { ...queue, updatedAt: new Date().toISOString() };
}

/**
 * Restore queue state from stored data.
 */
export function restoreQueueState(data) {
  if (!data || !data.items) return null;
  return { ...data };
}

/**
 * Return the next pending item ID, or null if paused/exhausted.
 */
export function dequeue(queue) {
  if (!queue || queue.paused) return null;

  while (queue.cursor < queue.items.length) {
    const item = queue.items[queue.cursor];
    if (item.status === 'pending') {
      item.status = 'processing';
      queue.updatedAt = new Date().toISOString();
      return item.id;
    }
    queue.cursor++;
  }
  return null; // All items processed or skipped
}

/**
 * Mark an item as done.
 */
export function markDone(queue, id) {
  const item = queue.items.find(i => i.id === id);
  if (item) {
    item.status = 'done';
    queue.cursor++;
    queue.updatedAt = new Date().toISOString();
  }
}

/**
 * Mark an item as failed.
 */
export function markFailed(queue, id, reason) {
  const item = queue.items.find(i => i.id === id);
  if (item) {
    item.status = 'failed';
    item.error = reason;
    queue.cursor++;
    queue.updatedAt = new Date().toISOString();
  }
}

/**
 * Pause the queue. Currently processing item will finish, but no new items dequeue.
 */
export function pause(queue) {
  if (queue) {
    queue.paused = true;
    queue.updatedAt = new Date().toISOString();
  }
}

/**
 * Resume a paused queue.
 */
export function resume(queue) {
  if (queue) {
    queue.paused = false;
    queue.updatedAt = new Date().toISOString();
  }
}

/**
 * Get progress summary.
 */
export function getProgress(queue) {
  if (!queue) return { total: 0, done: 0, failed: 0, remaining: 0, paused: false, type: null };

  const total = queue.items.length;
  const done = queue.items.filter(i => i.status === 'done').length;
  const failed = queue.items.filter(i => i.status === 'failed').length;
  const remaining = total - done - failed;

  return {
    total,
    done,
    failed,
    remaining,
    paused: queue.paused,
    type: queue.type
  };
}

/**
 * Returns true if the queue has finished (all items done or failed).
 */
export function isComplete(queue) {
  if (!queue) return true;
  return queue.items.every(i => i.status === 'done' || i.status === 'failed');
}
