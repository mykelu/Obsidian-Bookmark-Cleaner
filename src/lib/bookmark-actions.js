/**
 * Creates the required review folder structure safely under "Other Bookmarks".
 */
export async function setupReviewFolders() {
  const rootFolderName = "_Obsidian Cleaner";
  const requiredFolders = [
    "_Inbox Imported",
    "_Review Broken",
    "_Review Duplicates",
    "_Archive Captured",
    "_Processed"
  ];
  
  // Default to "Other Bookmarks" (ID 2 in Chrome)
  const rootId = '2'; 
  
  // Find or create the master parent folder
  const children = await chrome.bookmarks.getChildren(rootId);
  let cleanerRoot = children.find(c => c.title === rootFolderName);
  
  if (!cleanerRoot) {
    cleanerRoot = await chrome.bookmarks.create({
      parentId: rootId,
      title: rootFolderName
    });
  }
  
  const existingSubFolders = await chrome.bookmarks.getChildren(cleanerRoot.id);
  const createdFolders = {};
  
  for (const name of requiredFolders) {
    let folder = existingSubFolders.find(f => f.title === name);
    if (!folder) {
      folder = await chrome.bookmarks.create({
        parentId: cleanerRoot.id,
        title: name
      });
    }
    createdFolders[name] = folder.id; // Map name to Chrome folder ID
  }
  
  return createdFolders;
}

/**
 * Moves a bookmark to a destination folder ID.
 */
export async function moveBookmark(bookmarkId, destinationFolderId) {
  return new Promise((resolve) => {
    chrome.bookmarks.move(bookmarkId, { parentId: destinationFolderId }, (result) => {
      resolve(result);
    });
  });
}
