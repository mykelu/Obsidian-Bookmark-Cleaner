import { isToolHomepage } from './junk-filter.js';

/**
 * Pure function to normalize a URL.
 * Removes trailing slashes, standardizes protocols, drops fragments.
 */
export function normalizeUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    url.hash = ''; // Remove fragment
    let clean = url.toString();
    if (clean.endsWith('/')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch (e) {
    return urlStr; // Return original if invalid
  }
}

/**
 * Pure function to hash a URL (SHA-256).
 * Useful for duplicate detection and Obsidian filenames.
 */
export async function hashUrl(url) {
  const msgUint8 = new TextEncoder().encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Recursively flattens the Chrome bookmark tree.
 */
export async function flattenBookmarks(nodes, folderPath = []) {
  let result = [];
  
  const processPromises = nodes.map(async (node) => {
    // If node has a URL, it's a bookmark
    if (node.url) {
      if (isToolHomepage(node.url)) {
        return [];
      }
      const normalized = normalizeUrl(node.url);
      const hash = await hashUrl(normalized);
      return [{
        id: node.id,
        title: node.title || 'Untitled',
        url: node.url,
        normalizedUrl: normalized,
        hash: hash,
        folderPath: folderPath.join(' / ') || 'Root',
        parentId: node.parentId,
        status: 'pending' // placeholder for Phase 5
      }];
    }
    
    // If node has children, it's a folder
    if (node.children) {
      const newPath = node.title ? [...folderPath, node.title] : folderPath;
      return flattenBookmarks(node.children, newPath);
    }
    
    return [];
  });
  
  const arrays = await Promise.all(processPromises);
  return arrays.flat();
}

/**
 * Chrome API wrapper: get all bookmarks and flatten them.
 * Optionally starts from a specific folder root.
 */
export async function scanBookmarksTree(rootId = null) {
  return new Promise((resolve) => {
    if (rootId) {
      chrome.bookmarks.getSubTree(rootId, async (nodes) => {
        const flatList = await flattenBookmarks(nodes);
        resolve(flatList);
      });
    } else {
      chrome.bookmarks.getTree(async (tree) => {
        const flatList = await flattenBookmarks(tree);
        resolve(flatList);
      });
    }
  });
}
