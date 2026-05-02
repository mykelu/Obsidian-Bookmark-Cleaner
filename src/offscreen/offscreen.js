/**
 * Offscreen Document Script
 * Handles secure fetching and DOM parsing for content extraction.
 */

import { extractContent } from '../content/extractors/readability.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target === 'offscreen' && message.action === 'EXTRACT_CONTENT') {
    handleExtraction(message.url)
      .then(data => sendResponse({ status: 'success', data }))
      .catch(err => sendResponse({ status: 'error', message: err.toString() }));
    
    // Return true to indicate we will sendResponse asynchronously
    return true; 
  }
});

async function handleExtraction(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const finalFetchedUrl = response.redirected ? response.url : url;
  
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Delegate pure DOM manipulation to adapter
  const data = extractContent(doc, finalFetchedUrl);
  
  if (response.redirected) {
    data.extractionWarnings.push(`Extraction redirected to: ${finalFetchedUrl}`);
  }
  
  // Basic CSR check: If body has lots of scripts but tiny text
  if (doc.scripts.length > 5 && data.plainText.length < 200) {
    data.extractionStatus = 'partial';
    data.extractionWarnings.push('Heavy client-side rendering (CSR) detected. Extraction may be incomplete without a headless browser.');
  }
  
  return data;
}
