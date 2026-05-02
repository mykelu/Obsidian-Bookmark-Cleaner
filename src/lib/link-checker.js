/**
 * Link Checker Module
 * Pure logic and Chrome API wrappers separated.
 */

export function isUnsupportedScheme(url) {
  return /^(javascript|data|chrome|about|file|mailto):/i.test(url);
}

export function detectRedirect(response, originalUrl) {
  if (response.redirected && response.url !== originalUrl) {
    return response.url;
  }
  return null;
}

export function classifyResponse(response, finalUrl, error, attempts) {
  if (error) {
    if (error.name === 'AbortError' || error.message.toLowerCase().includes('timeout')) {
      return { status: 'soft-broken', message: 'Timeout' };
    }
    // Repeated network/DNS errors become hard-broken
    return { status: attempts > 1 ? 'hard-broken' : 'soft-broken', message: `Network/Fetch Error: ${error.message}` };
  }

  // Login wall heuristic
  if (finalUrl && finalUrl.toLowerCase().includes('login')) {
    return { status: 'soft-broken', message: 'Redirected to login wall' };
  }

  if (response.ok) {
    return { status: response.redirected ? 'redirected' : 'healthy', message: 'OK' };
  }

  if ([403, 429].includes(response.status)) {
    return { status: 'soft-broken', message: `HTTP ${response.status} (Forbidden/Rate Limited)` };
  }

  if ([404, 410].includes(response.status)) {
    return { 
      status: attempts > 1 ? 'hard-broken' : 'soft-broken', 
      message: `HTTP ${response.status} (Not Found)` 
    };
  }

  if (response.status >= 500) {
    return { status: 'soft-broken', message: `HTTP ${response.status} (Server Error)` };
  }

  return { status: 'soft-broken', message: `HTTP ${response.status}` };
}

export function shouldRetry(bookmark) {
  return bookmark.status === 'soft-broken';
}

async function fetchWithFallback(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    let response = await fetch(url, { method: 'HEAD', signal: controller.signal });
    
    // Fall back to GET if HEAD is rejected by the server
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, { method: 'GET', signal: controller.signal });
    }
    
    clearTimeout(id);
    return { response, error: null };
  } catch (error) {
    clearTimeout(id);
    return { response: null, error };
  }
}

export async function checkBookmark(bookmark) {
  if (bookmark.status === 'duplicate' || bookmark.status === 'healthy' || bookmark.isChecking) {
    return bookmark;
  }

  bookmark.isChecking = true;
  bookmark.attempts = (bookmark.attempts || 0) + 1;
  bookmark.lastChecked = new Date().toISOString();
  if (!bookmark.firstChecked) bookmark.firstChecked = bookmark.lastChecked;

  try {
    if (isUnsupportedScheme(bookmark.url)) {
      bookmark.status = 'hard-broken';
      bookmark.error = 'Unsupported scheme (e.g., javascript:, chrome:)';
      return bookmark;
    }

    try {
      new URL(bookmark.url); // Validate URL parse
    } catch (e) {
      bookmark.status = 'hard-broken';
      bookmark.error = 'Malformed URL format';
      return bookmark;
    }

    const { response, error } = await fetchWithFallback(bookmark.url);
    const finalUrl = response ? detectRedirect(response, bookmark.url) : null;
    const { status, message } = classifyResponse(response, finalUrl, error, bookmark.attempts);

    // Record metadata
    if (finalUrl) bookmark.finalUrl = finalUrl;
    if (response) bookmark.httpStatus = response.status;
    bookmark.status = status;
    bookmark.error = message;

    return bookmark;
  } finally {
    bookmark.isChecking = false;
  }
}

export async function checkLinksInBatches(bookmarks, concurrency = 10) {
  let active = 0;
  let index = 0;
  
  return new Promise((resolve) => {
    function next() {
      if (index >= bookmarks.length && active === 0) {
        resolve(bookmarks);
        return;
      }
      
      while (active < concurrency && index < bookmarks.length) {
        const bookmark = bookmarks[index++];
        if (bookmark.status === 'duplicate' || bookmark.status === 'healthy') {
           next();
           continue;
        }
        
        active++;
        checkBookmark(bookmark).then(() => {
          active--;
          next();
        });
      }
    }
    next();
  });
}
