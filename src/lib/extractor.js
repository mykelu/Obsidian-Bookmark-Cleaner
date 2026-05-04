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
export async function extractContentFromUrl(url, scraperSettings = { method: 'standard', extractSiteContext: false }) {
  if (scraperSettings.method === 'jina') {
    return extractWithJina(url, scraperSettings.extractSiteContext);
  }

  await setupOffscreenDocument();
  
  const data = await new Promise((resolve, reject) => {
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

  if (scraperSettings.extractSiteContext && data) {
    data.siteContext = await fetchSiteContext(url);
  }

  return data;
}

async function extractWithJina(url, extractContext = false) {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(jinaUrl);
  if (!response.ok) throw new Error(`Jina Reader Error: ${response.status}`);
  const markdown = await response.text();
  
  const lines = markdown.split('\n');
  let title = '';
  if (lines[0].startsWith('# ')) {
    title = lines[0].substring(2).trim();
  }

  const data = {
    title: title || url,
    markdown: markdown,
    plainText: markdown.replace(/[#*`\[\]]/g, '').substring(0, 10000),
    extractionStatus: 'success',
    extractionWarnings: ['Extracted via Jina Reader proxy']
  };

  if (extractContext) {
    data.siteContext = await fetchSiteContext(url);
  }

  return data;
}

async function fetchSiteContext(url) {
  try {
    const parsed = new URL(url);
    const rootUrl = `${parsed.protocol}//${parsed.hostname}`;
    
    // We'll use the offscreen document for this too, but for simplicity here we'll just do a light fetch
    // Actually, offscreen is safer for DOM parsing.
    await setupOffscreenDocument();
    
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        target: 'offscreen',
        action: 'EXTRACT_METADATA',
        url: rootUrl
      }, response => {
        if (response && response.status === 'success') {
          resolve(response.data);
        } else {
          resolve(null);
        }
      });
    });
  } catch (e) {
    console.error('[Extractor] Site context fetch failed:', e);
    return null;
  }
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
