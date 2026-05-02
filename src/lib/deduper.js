/**
 * Identifies duplicates in a flat list of bookmarks.
 * Groups by normalizedUrl. The first seen is 'canonical', the rest are 'duplicate'.
 */
export function markDuplicates(bookmarks) {
  const seenUrls = new Map();
  const results = [];

  for (const b of bookmarks) {
    const item = { ...b };
    
    if (seenUrls.has(item.normalizedUrl)) {
      item.status = 'duplicate';
      item.canonicalId = seenUrls.get(item.normalizedUrl);
    } else {
      seenUrls.set(item.normalizedUrl, item.id);
      item.status = item.status === 'pending' ? 'canonical' : item.status;
    }
    results.push(item);
  }
  
  return {
    processed: results,
    duplicateCount: results.filter(b => b.status === 'duplicate').length
  };
}
