/**
 * Pure recheck-policy helpers.
 * No Chrome API dependencies — fully testable in isolation.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cooldown period before a soft-broken bookmark should be rechecked.
 * Grows with each failed attempt.
 */
export function getRecheckCooldownMs(attempts) {
  if (attempts <= 1) return 7 * DAY_MS;    // 7 days after first failure
  if (attempts === 2) return 14 * DAY_MS;  // 14 days after second
  return 30 * DAY_MS;                       // 30 days after third+
}

/**
 * Returns true if enough time has passed since lastChecked for a recheck.
 */
export function isRecheckDue(bookmark) {
  if (!bookmark.lastChecked) return true; // never checked
  if (bookmark.status !== 'soft-broken' && bookmark.status !== 'hard-broken') return false;

  const elapsed = Date.now() - new Date(bookmark.lastChecked).getTime();
  const cooldown = getRecheckCooldownMs(bookmark.attempts || 0);
  return elapsed >= cooldown;
}

/**
 * Returns the ISO date string of the next eligible recheck.
 */
export function getNextRecheckDate(bookmark) {
  if (!bookmark.lastChecked) return new Date().toISOString();
  const cooldown = getRecheckCooldownMs(bookmark.attempts || 0);
  return new Date(new Date(bookmark.lastChecked).getTime() + cooldown).toISOString();
}

/**
 * A bookmark becomes a delete candidate when:
 * 1. Status is hard-broken
 * 2. At least 3 checks have been performed
 * 3. At least 21 days have passed since the first check
 */
export function shouldPromoteToDeleteCandidate(bookmark) {
  if (bookmark.status !== 'hard-broken') return false;
  if ((bookmark.attempts || 0) < 3) return false;
  if (!bookmark.firstChecked) return false;

  const daysSinceFirst = (Date.now() - new Date(bookmark.firstChecked).getTime()) / DAY_MS;
  return daysSinceFirst >= 21;
}

/**
 * Classify what action is appropriate for a bookmark.
 * Returns one of:
 *   'delete-candidate' — hard-broken, repeatedly confirmed
 *   'awaiting-recheck' — broken but cooldown not expired
 *   'safe-to-capture'  — healthy or redirected, ready for Obsidian
 *   'safe-to-archive'  — redirected, suggest URL update
 *   'pending'          — not yet checked
 */
export function classifyAction(bookmark) {
  if (shouldPromoteToDeleteCandidate(bookmark)) return 'delete-candidate';

  if (bookmark.status === 'hard-broken') return 'awaiting-recheck';
  if (bookmark.status === 'soft-broken') return 'awaiting-recheck';

  if (bookmark.status === 'redirected') return 'safe-to-archive';
  if (bookmark.status === 'healthy') return 'safe-to-capture';
  if (bookmark.status === 'duplicate') return 'safe-to-archive';

  return 'pending';
}
