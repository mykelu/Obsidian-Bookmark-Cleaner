/**
 * Pure helpers for building Obsidian-compatible Markdown notes from bookmark data.
 * No Chrome API or DOM dependencies — fully testable in isolation.
 */

/**
 * Sanitize a string for use as a filename.
 * Removes characters illegal in Windows/macOS/Obsidian vault paths.
 */
export function sanitizeFilename(raw) {
  if (!raw || typeof raw !== 'string') return 'Untitled';

  let safe = raw
    .replace(/[\\/:*?"<>|#^[\]]/g, '-')  // Replace illegal chars
    .replace(/\s+/g, ' ')                 // Collapse whitespace
    .replace(/-{2,}/g, '-')               // Collapse consecutive dashes
    .replace(/^[-\s]+|[-\s]+$/g, '')      // Trim leading/trailing dashes and spaces
    .trim();

  // Obsidian has a practical filename length limit
  if (safe.length > 200) {
    safe = safe.substring(0, 200).trim();
  }

  return safe || 'Untitled';
}

/**
 * Extract the domain from a URL string.
 */
export function extractDomain(urlStr) {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Compute a SHA-256 hex hash of arbitrary text content.
 * Used for content-based idempotency checks.
 */
export async function computeContentHash(text) {
  const msgUint8 = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Escape a YAML string value.
 * Always quotes strings that contain YAML-unsafe characters including
 * colons, slashes, brackets, and special punctuation.
 */
function yamlValue(val) {
  if (val === null || val === undefined) return '""';
  const s = String(val);
  // Quote aggressively: any colon, slash, hash, bracket, or special char
  if (/[:#{}[\],&*?|>!%@`/\\]/.test(s) || s.includes('\n') || s.startsWith('"') || s.startsWith("'") || s.includes(': ')) {
    return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return s;
}

// Sentinel placeholder for content hash injection.
// Chosen to be unique and impossible to collide with real content.
const HASH_PLACEHOLDER = '__CONTENT_HASH_PLACEHOLDER_7f3a9b__';

/**
 * Build YAML frontmatter block from bookmark + extraction data.
 * @param {Object} bookmark
 * @param {Object} settings
 * @param {string} frozenTimestamp - A single ISO timestamp shared across the entire note
 */
export function buildFrontmatter(bookmark, settings = {}, frozenTimestamp) {
  const ext = bookmark.extractedData || {};
  const now = frozenTimestamp || new Date().toISOString();
  const domain = extractDomain(bookmark.url);
  const canonical = ext.canonicalUrl || bookmark.finalUrl || bookmark.url;
  const title = ext.title || bookmark.title || 'Untitled';

  // Ordered key-value pairs for deterministic output
  const lines = [
    '---',
    `type: web-clip`,
    `title: ${yamlValue(title)}`,
    `source_url: ${yamlValue(bookmark.url)}`,
    `canonical_url: ${yamlValue(canonical)}`,
    `domain: ${yamlValue(domain)}`,
    `captured_at: ${yamlValue(now)}`,
    `bookmark_folder: ${yamlValue(bookmark.folderPath || 'Root')}`,
    `status: ${bookmark.status || 'pending'}`,
    `tags:`,
    `  - bookmarks`,
    `  - web`,
    `  - captured`,
    `para_area: Resources`,
    `review_needed: ${!ext.markdown || ext.extractionStatus !== 'success'}`,
    `is_attachment: ${!!bookmark.isFile}`,
    `content_type: ${yamlValue(bookmark.contentType || 'text/html')}`,
    `hash_url: ${bookmark.hash || ''}`,
    `hash_content: ${HASH_PLACEHOLDER}`,
    '---',
  ];

  return { yaml: lines.join('\n') + '\n', capturedAt: now };
}

/**
 * Build the body section of a Markdown note.
 * Handles both full extractions and shell notes (no extraction).
 * @param {Object} bookmark
 * @param {string} frozenTimestamp - shared timestamp for consistency
 * @param {Array} relatedNotes - discovered relevant notes in the vault
 */
export function buildNoteBody(bookmark, frozenTimestamp, relatedNotes = []) {
  const ext = bookmark.extractedData || {};
  const title = ext.title || bookmark.title || 'Untitled';
  const description = ext.metaDescription || '';
  const now = frozenTimestamp || new Date().toISOString();

  let body = `\n# ${title}\n\n`;

  // Summary
  body += `## Summary\n\n`;
  if (description) {
    body += `${description}\n\n`;
  } else {
    body += `> *No summary available. Review the extracted content below or visit the source page.*\n\n`;
  }

  // Key points (extracted headings if available)
  body += `## Key points\n\n`;
  if (ext.headings && ext.headings.length > 0) {
    const topHeadings = ext.headings.slice(0, 10);
    topHeadings.forEach(h => {
      body += `- ${h.text}\n`;
    });
    body += '\n';
  } else {
    body += `- *No structured headings extracted from this page.*\n\n`;
  }

  // Related Notes (Vault-Aware)
  if (relatedNotes && relatedNotes.length > 0) {
    body += `## Related Notes\n\n`;
    relatedNotes.forEach(note => {
      const cleanTitle = note.filename.replace(/\.md$/, '');
      body += `- [[${cleanTitle}]]\n`;
    });
    body += '\n';
  }

  // Extracted content
  body += `## Extracted content\n\n`;
  if (bookmark.isFile) {
    const attachmentName = generateAttachmentFilename(bookmark);
    body += `> [!info] Binary File Detected\n`;
    body += `> This bookmark points to a binary file (${bookmark.contentType || 'unknown type'}).\n\n`;
    body += `![[${attachmentName}]]\n\n`;
    body += `[Download Original](${bookmark.finalUrl || bookmark.url})\n\n`;
  } else if (ext.markdown && ext.markdown.length > 0) {
    body += `<details>\n<summary>Click to expand original content</summary>\n\n`;
    body += ext.markdown;
    body += `\n\n</details>\n\n`;
  } else {
    body += `> *No content was extracted. The page may require authentication, use heavy client-side rendering, or be unreachable.*\n\n`;
  }

  // Extraction warnings
  if (ext.extractionWarnings && ext.extractionWarnings.length > 0) {
    body += `> [!warning] Extraction Warnings\n`;
    ext.extractionWarnings.forEach(w => {
      body += `> - ${w}\n`;
    });
    body += '\n';
  }

  // Metadata footer
  body += `## Metadata\n\n`;
  body += `- **Original URL:** ${bookmark.url}\n`;
  body += `- **Canonical URL:** ${ext.canonicalUrl || bookmark.finalUrl || bookmark.url}\n`;
  body += `- **Bookmark folder:** ${bookmark.folderPath || 'Root'}\n`;
  body += `- **Captured at:** ${now}\n`;
  body += `- **Status:** ${bookmark.status || 'pending'}\n`;
  if (bookmark.extractionStatus) {
    body += `- **Extraction status:** ${bookmark.extractionStatus}\n`;
  }

  return body;
}

/**
 * Assemble a complete Obsidian note: frontmatter + body.
 * Uses a single frozen timestamp for full determinism.
 * Returns { noteContent, contentHash, notePath, capturedAt }.
 */
export async function buildMarkdownNote(bookmark, settings = {}, relatedNotes = []) {
  // Freeze the timestamp so frontmatter and body are perfectly consistent
  const frozenTimestamp = new Date().toISOString();

  const { yaml, capturedAt } = buildFrontmatter(bookmark, settings, frozenTimestamp);
  const body = buildNoteBody(bookmark, frozenTimestamp, relatedNotes);

  // Compute the idempotency hash from SEMANTIC content only.
  // Excludes timestamps so that re-capturing unchanged bookmarks produces
  // the same hash and is correctly skipped.
  const ext = bookmark.extractedData || {};
  const semanticInput = [
    bookmark.url,
    bookmark.hash || '',
    bookmark.status || '',
    bookmark.extractionStatus || '',
    ext.title || bookmark.title || '',
    ext.metaDescription || '',
    ext.canonicalUrl || '',
    ext.markdown || '',
    (ext.headings || []).map(h => h.text).join('|'),
    (ext.extractionWarnings || []).join('|'),
    (relatedNotes || []).map(n => n.filename).join('|')
  ].join('\n');
  const contentHash = await computeContentHash(semanticInput);

  // Inject the real hash into the placeholder
  const finalYaml = yaml.replace(HASH_PLACEHOLDER, contentHash);
  const noteContent = finalYaml + body;

  // Generate file path
  const notePath = generateNotePath(bookmark, settings);

  return {
    noteContent,
    contentHash,
    notePath,
    capturedAt
  };
}

/**
 * Generate a deterministic file path for a bookmark note.
 * Appends a short URL hash suffix to disambiguate bookmarks with identical titles
 * from different domains (e.g., two bookmarks both titled "Home").
 * Falls back to hash-based filename if title is empty or too generic.
 */
export function generateNotePath(bookmark, settings = {}) {
  const ext = bookmark.extractedData || {};
  const rawTitle = ext.title || bookmark.title || '';
  const template = settings.filenameTemplate || '{title}.md';
  
  // Clean the folder path: 
  // 1. Convert backslashes to forward slashes
  // 2. Remove leading/trailing slashes
  // 3. Collapse multiple slashes
  let folder = (settings.destinationFolder || 'Bookmarks')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');

  let safeTitle = sanitizeFilename(rawTitle);

  // Fallback to hash-based filename if title is empty or generic
  if (!safeTitle || safeTitle === 'Untitled' || safeTitle.length < 3) {
    const hashSlice = (bookmark.hash || 'unknown').substring(0, 12);
    safeTitle = `web-clip-${hashSlice}`;
  } else {
    // Append short hash suffix to prevent title collisions across different URLs
    const hashSuffix = (bookmark.hash || '').substring(0, 8);
    if (hashSuffix) {
      safeTitle = `${safeTitle} (${hashSuffix})`;
    }
  }

  const filename = template.replace('{title}', safeTitle);

  return folder ? `${folder}/${filename}` : filename;
}

/**
 * Generate a filename for the attachment (binary) file.
 */
export function generateAttachmentFilename(bookmark) {
  const url = bookmark.finalUrl || bookmark.url;
  let filename = url.split('/').pop().split('?')[0] || 'file.dat';
  
  // If filename is too generic, use the title slug
  if (filename.length < 5 || filename.includes('index') || filename.includes('download')) {
    const titleSlug = sanitizeFilename(bookmark.title).substring(0, 50);
    const ext = url.split('.').pop().split('?')[0];
    if (ext && ext.length < 5) {
      filename = `${titleSlug}.${ext}`;
    } else {
      filename = titleSlug;
    }
  }

  // Ensure it has the correct extension if we know the content type
  if (bookmark.contentType === 'application/pdf' && !filename.toLowerCase().endsWith('.pdf')) {
    filename += '.pdf';
  }

  return filename;
}

/**
 * Generate a full vault path for the attachment.
 */
export function generateAttachmentPath(bookmark, settings = {}) {
  const filename = generateAttachmentFilename(bookmark);
  let folder = (settings.destinationFolder || 'Bookmarks')
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\/+/g, '/');

  // We place attachments in an "Attachments" subfolder
  return folder ? `${folder}/Attachments/${filename}` : `Attachments/${filename}`;
}
