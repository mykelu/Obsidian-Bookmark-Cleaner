import { extractContent } from '../content/extractors/readability.js';

// Dynamically import pdf.js to avoid loading it for non-PDF extractions
let pdfjsLib = null;

async function initPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  try {
    pdfjsLib = await import('../lib/vendor/pdf.min.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('src/lib/vendor/pdf.worker.min.mjs');
    return pdfjsLib;
  } catch (err) {
    console.error('[Offscreen] Failed to load pdf.js:', err);
    throw new Error('PDF library failed to load.');
  }
}

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

async function extractTextFromPdf(url) {
  const lib = await initPdfJs();
  const loadingTask = lib.getDocument(url);
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  let markdown = `## PDF Document: ${url.split('/').pop()}\n\n`;
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    
    fullText += pageText + '\n\n';
    markdown += `### Page ${i}\n${pageText}\n\n`;
    
    // Add progress or limit for extremely long PDFs
    if (i > 50) {
      markdown += `\n> [!NOTE]\n> Extraction truncated at 50 pages for performance.\n`;
      break;
    }
  }
  
  return {
    markdown,
    plainText: fullText,
    numPages: pdf.numPages
  };
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

  if (isPdf) {
    try {
      const filename = finalFetchedUrl.split('/').pop() || 'Document.pdf';
      const pdfData = await extractTextFromPdf(finalFetchedUrl);
      
      return {
        title: filename,
        extractionStatus: 'success',
        isFile: true,
        isPdf: true,
        contentType: contentType,
        markdown: pdfData.markdown,
        plainText: pdfData.plainText,
        metadata: {
          numPages: pdfData.numPages
        }
      };
    } catch (err) {
      console.warn('[Offscreen] PDF extraction failed, falling back to shell:', err);
      // Fallback to basic file info if parsing fails
      const filename = finalFetchedUrl.split('/').pop() || 'Downloaded File';
      return {
        title: filename,
        extractionStatus: 'file',
        isFile: true,
        isPdf: true,
        contentType: contentType,
        markdown: `## PDF Detected (Extraction Failed)\n\n**Source**: [${filename}](${finalFetchedUrl})\n**Type**: ${contentType}\n\n> [!WARNING]\n> Local PDF extraction failed: ${err.message}. You can download the file or try a cloud scraper.`,
        plainText: `PDF detected: ${finalFetchedUrl}. Extraction failed.`,
        extractionWarnings: [`PDF parsing error: ${err.message}`]
      };
    }
  }

  if (isBinary) {
    const filename = finalFetchedUrl.split('/').pop() || 'Downloaded File';
    return {
      title: filename,
      extractionStatus: 'file',
      isFile: true,
      isPdf: false,
      contentType: contentType,
      markdown: `## Binary File Detected\n\n**Source**: [${filename}](${finalFetchedUrl})\n**Type**: ${contentType}\n\n> [!NOTE]\n> Standard extraction does not support non-PDF binary files. You can download this file directly.`,
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
