import { isDomainForSale } from './junk-filter.js';

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
  let data = null;
  let currentMethod = scraperSettings.method;

  try {
    // Initial Attempt
    data = await runExtractionAttempt(url, currentMethod, scraperSettings);
  } catch (e) {
    console.warn(`[Extractor] ${currentMethod} extraction failed for ${url}:`, e);
    // If auto-switch is OFF, we bubble up the error
    if (!scraperSettings.autoSwitch) throw e;
  }

  // Auto-Switch Logic: If result is poor or failed, try fallbacks
  if (scraperSettings.autoSwitch) {
    const wordCount = (data && data.plainText) ? data.plainText.trim().split(/\s+/).length : 0;
    const threshold = scraperSettings.autoSwitchThreshold || 200;
    const isPoor = !data || data.extractionStatus === 'partial' || wordCount < threshold;

    if (isPoor && !data?.isFile) {
      console.log(`[Extractor] Auto-switching for ${url} (Current: ${currentMethod}, Words: ${wordCount})`);
      
      // Fallback 1: Jina (if we haven't tried it yet)
      if (currentMethod === 'standard') {
        try {
          const fallbackData = await extractWithJina(url, scraperSettings.extractSiteContext);
          fallbackData.extractionWarnings.push(`Auto-switched from Standard (Standard yielded ${wordCount} words)`);
          data = fallbackData;
          currentMethod = 'jina';
        } catch (err) {
          console.error('[Extractor] Jina fallback failed:', err);
        }
      }

      // Fallback 2: Firecrawl (if key exists and we aren't already there)
      const stillPoor = !data || data.extractionStatus === 'partial' || (data.plainText?.trim().split(/\s+/).length || 0) < threshold;
      if (stillPoor && currentMethod !== 'firecrawl' && scraperSettings.firecrawlApiKey) {
        try {
          const fallbackData = await extractWithFirecrawl(url, scraperSettings.firecrawlApiKey, scraperSettings.extractSiteContext);
          fallbackData.extractionWarnings.push(`Auto-switched to Firecrawl fallback`);
          data = fallbackData;
        } catch (err) {
          console.error('[Extractor] Firecrawl fallback failed:', err);
        }
      }
    }
  }

  if (scraperSettings.extractSiteContext && data && !data.siteContext) {
    data.siteContext = await fetchSiteContext(url);
  }

  if (!data) throw new Error('Extraction failed: No data returned from any engine.');

  if (isDomainForSale(data.plainText)) {
    console.warn(`[Extractor] Junk content detected for ${url}: Domain for sale`);
    data.extractionStatus = 'junk';
    data.extractionWarnings.push('Identified as a "Domain for Sale" page');
  }

  return data;
}

async function runExtractionAttempt(url, method, settings) {
  switch (method) {
    case 'jina':
      return extractWithJina(url, settings.extractSiteContext);
    case 'firecrawl':
      return extractWithFirecrawl(url, settings.firecrawlApiKey, settings.extractSiteContext);
    case 'standard':
    default:
      return extractWithStandard(url);
  }
}

async function extractWithStandard(url) {
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

async function extractWithFirecrawl(url, apiKey, extractContext = false) {
  if (!apiKey) throw new Error('Firecrawl API key missing');
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      url: url,
      formats: ['markdown']
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Firecrawl Error: ${response.status} - ${err.error || 'Unknown'}`);
  }

  const result = await response.json();
  if (!result.success) throw new Error(`Firecrawl failed: ${result.error || 'Unknown'}`);

  const data = {
    title: result.data.metadata?.title || url,
    markdown: result.data.markdown || '',
    plainText: (result.data.markdown || '').replace(/[#*`\[\]]/g, '').substring(0, 10000),
    extractionStatus: 'success',
    extractionWarnings: ['Extracted via Firecrawl Premium']
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
