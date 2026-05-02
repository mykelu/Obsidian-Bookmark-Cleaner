const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

let creating; // Promise to track creation

/**
 * Manages the lifecycle of the single MV3 offscreen document.
 */
export async function setupOffscreenDocument() {
  const path = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  
  // Check if it already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [path]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Handle concurrent creation requests
  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_PARSER'],
    justification: 'Parse bookmark HTML to securely extract content for Obsidian'
  });
  
  await creating;
  creating = null;
}

/**
 * Sends a message to the offscreen document to fetch and parse the URL.
 */
export async function extractContentFromUrl(url) {
  await setupOffscreenDocument();
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      target: 'offscreen',
      action: 'EXTRACT_CONTENT',
      url: url
    }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.status === 'error') {
        reject(new Error(response.message));
      } else if (response && response.status === 'success') {
        resolve(response.data);
      } else {
        reject(new Error('Unknown response from offscreen document'));
      }
    });
  });
}

/**
 * Tears down the offscreen document to free memory and conform to MV3 best practices.
 */
export async function closeOffscreenDocument() {
  const path = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [path]
  });

  if (existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}
