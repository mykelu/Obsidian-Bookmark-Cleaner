/**
 * Minimal DOM-to-Markdown extractor.
 * Executes purely in the offscreen document.
 */

export function extractContent(doc, url) {
  const warnings = [];
  
  // 1. Strip standard noise
  const noisySelectors = [
    'script', 'style', 'noscript', 'nav', 'header', 'footer', 
    'aside', 'iframe', 'svg', '[role="banner"]', '[role="navigation"]',
    '.ads', '.advertisement', '.social-share', '#comments', '.comments'
  ];
  noisySelectors.forEach(sel => {
    doc.querySelectorAll(sel).forEach(el => el.remove());
  });

  // 2. Extract Metadata
  const title = doc.title ? doc.title.trim() : '';
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  const canonicalUrl = canonicalLink ? canonicalLink.href : null;
  const metaDesc = doc.querySelector('meta[name="description"]');
  const metaDescription = metaDesc ? metaDesc.content.trim() : null;

  // 3. Extract Headings
  const headings = [];
  doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
    const text = h.innerText.trim();
    if (text) {
      headings.push({ level: parseInt(h.tagName[1], 10), text });
    }
  });

  // 4. Locate Main Content Container
  let main = doc.querySelector('article') || doc.querySelector('main') || doc.querySelector('.content') || doc.body;
  if (!main || main === doc.body) {
    warnings.push('No primary <article> or <main> tag found; falling back to <body> extraction.');
    main = doc.body;
  }

  // 5. Convert to Simple Markdown
  function domToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      return text.trim() ? text : (text.includes('\\n') ? '\\n' : ' ');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    let md = '';

    if (/^h[1-6]$/.test(tag)) {
      const level = tag[1];
      md += `\\n\\n${'#'.repeat(level)} ${node.textContent.trim()}\\n\\n`;
    } else if (tag === 'p') {
      md += '\\n\\n';
      node.childNodes.forEach(child => md += domToMarkdown(child));
      md += '\\n\\n';
    } else if (tag === 'a') {
      let href = node.getAttribute('href') || '';
      if (href && !href.startsWith('http')) {
        try { href = new URL(href, url).href; } catch(e) {}
      }
      md += `[`;
      node.childNodes.forEach(child => md += domToMarkdown(child));
      md += `](${href})`;
    } else if (tag === 'img') {
      let src = node.getAttribute('src') || '';
      if (src && !src.startsWith('http')) {
        try { src = new URL(src, url).href; } catch(e) {}
      }
      md += `![${node.getAttribute('alt') || ''}](${src})`;
    } else if (tag === 'strong' || tag === 'b') {
      md += `**`;
      node.childNodes.forEach(child => md += domToMarkdown(child));
      md += `**`;
    } else if (tag === 'em' || tag === 'i') {
      md += `*`;
      node.childNodes.forEach(child => md += domToMarkdown(child));
      md += `*`;
    } else if (tag === 'ul' || tag === 'ol') {
      md += '\\n';
      node.childNodes.forEach(child => {
        if (child.tagName && child.tagName.toLowerCase() === 'li') {
          let liText = '';
          child.childNodes.forEach(c => liText += domToMarkdown(c));
          md += `- ${liText.trim()}\\n`;
        }
      });
      md += '\\n';
    } else {
      // Pass through container elements like <div>, <span>
      node.childNodes.forEach(child => md += domToMarkdown(child));
    }
    
    return md;
  }

  let markdown = domToMarkdown(main)
    .replace(/\\n{3,}/g, '\\n\\n') // Collapse excessive newlines
    .trim();
    
  let plainText = main.innerText.trim();

  // 6. Security & Payload limits
  const MAX_LEN = 150000;
  if (markdown.length > MAX_LEN) {
    markdown = markdown.substring(0, MAX_LEN) + '\\n\\n...[Content Truncated]';
    warnings.push('Markdown payload truncated due to size limits.');
  }

  let extractionStatus = 'success';
  if (markdown.length < 50) {
    extractionStatus = 'partial';
    warnings.push('Extracted content is unusually short. The page might require login or use heavy client-side rendering.');
  }

  return {
    title,
    canonicalUrl,
    metaDescription,
    headings,
    markdown,
    plainText: plainText.substring(0, MAX_LEN),
    extractionStatus,
    extractionWarnings: warnings
  };
}
