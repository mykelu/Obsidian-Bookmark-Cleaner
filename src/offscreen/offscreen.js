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
    return true; 
  } else if (message.target === 'offscreen' && message.action === 'EXTRACT_METADATA') {
    handleMetadataExtraction(message.url)
      .then(data => sendResponse({ status: 'success', data }))
      .catch(err => sendResponse({ status: 'error', message: err.toString() }));
    return true;
  }
});

/**
 * Sanitizes raw HTML string by stripping out tags that might trigger CSP violations
 * or external resource loads (scripts, links, iframes) before DOM parsing.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<img\b[^>]*\bsrc\s*=\s*["'](?!(?:https?|data):)[^"']*["'][^>]*>/gi, ''); // Block relative or weird images early
}

async function handleMetadataExtraction(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitizeHtml(html), 'text/html');
    
    return {
      siteTitle: doc.title || '',
      siteDescription: doc.querySelector('meta[name="description"]')?.content || doc.querySelector('meta[property="og:description"]')?.content || '',
      siteKeywords: doc.querySelector('meta[name="keywords"]')?.content || '',
      ogSiteName: doc.querySelector('meta[property="og:site_name"]')?.content || ''
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function handleExtraction(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const finalFetchedUrl = response.redirected ? response.url : url;
  const contentType = response.headers.get('Content-Type') || '';
  
  // Detect binary files / PDFs
  const isPdf = contentType.includes('application/pdf') || finalFetchedUrl.toLowerCase().endsWith('.pdf');
  const isBinary = contentType.includes('application/octet-stream') || 
                   contentType.includes('application/zip') || 
                   contentType.includes('application/msword') ||
                   contentType.includes('application/vnd.openxmlformats-officedocument');

  if (isPdf || isBinary) {
    const filename = finalFetchedUrl.split('/').pop() || 'Downloaded File';
    return {
      title: filename,
      extractionStatus: 'file',
      isFile: true,
      isPdf: isPdf,
      contentType: contentType,
      markdown: `## Binary File Detected\n\n**Source**: [${filename}](${finalFetchedUrl})\n**Type**: ${contentType}\n\n> [!NOTE]\n> Standard extraction does not support binary files. You can download this file directly or use Jina Reader for PDF-to-Markdown conversion.`,
      plainText: `Binary file detected: ${finalFetchedUrl} (${contentType})`,
      extractionWarnings: [`Detected binary file type: ${contentType}`]
    };
  }
  
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizeHtml(html), 'text/html');
  
  // Delegate pure DOM manipulation to adapter
  const data = extractContent(doc, finalFetchedUrl);
  
  if (response.redirected) {
    data.extractionWarnings.push(`Extraction redirected to: ${finalFetchedUrl}`);
  }
  
  // Basic CSR check: If original html had lots of script tags but extracted text is tiny
  const scriptCount = (html.match(/<script/gi) || []).length;
  if (scriptCount > 5 && data.plainText.length < 200) {
    data.extractionStatus = 'partial';
    data.extractionWarnings.push('Heavy client-side rendering (CSR) detected. Extraction may be incomplete without a headless browser.');
  }
  
  return data;
}
