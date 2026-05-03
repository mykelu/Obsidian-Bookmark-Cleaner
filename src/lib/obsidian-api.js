/**
 * Utility function to handle standard Obsidian Local REST API requests.
 */
async function obsidianFetch(url, apiKey, method = 'GET', body = null, contentType = 'application/json') {
  if (!apiKey) throw new Error("Missing API Key. Please provide one in the settings.");
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`
  };
  
  if (body && contentType) {
    headers['Content-Type'] = contentType;
  }
  
  const options = { method, headers };
  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch (error) {
    console.error('[Obsidian API] Fetch error:', error);
    // A fetch failure on localhost HTTPS is almost always a TLS certificate trust issue or the server is offline.
    throw new Error(`Connection failed. The Obsidian server might be offline, or Chrome is blocking the self-signed certificate. Please open ${new URL(url).origin} in a new tab and accept the security warning. Underlying error: ${error.message}`);
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error("Unauthorized (401). Check your API Key.");
    if (response.status === 404) throw new Error("Not Found (404).");
    
    let errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return response;
}

export async function testConnection(baseUrl, apiKey) {
  const url = `${baseUrl.replace(/\/$/, '')}/`;
  const response = await obsidianFetch(url, apiKey, 'GET');
  return response.json();
}

export async function noteExists(baseUrl, apiKey, path) {
  const safePath = path.split('/').filter(p => p).map(encodeURIComponent).join('/');
  const url = `${baseUrl.replace(/\/$/, '')}/vault/${safePath}`;
  try {
    await obsidianFetch(url, apiKey, 'GET');
    return true; // Exists if we get a 200 OK
  } catch (e) {
    if (e.message.includes("404")) return false;
    throw e;
  }
}

export async function createFolder(baseUrl, apiKey, folderPath) {
  const safePath = folderPath.split('/').filter(p => p).map(encodeURIComponent).join('/');
  const url = `${baseUrl.replace(/\/$/, '')}/vault/${safePath}/`;
  try {
    await obsidianFetch(url, apiKey, 'POST');
    return true;
  } catch (e) {
    if (e.message.includes("409")) return true; // Already exists
    // If it's a 404, we might need to create parent folders recursively
    if (e.message.includes("404") && folderPath.includes('/')) {
      const parts = folderPath.split('/').filter(p => p);
      if (parts.length > 1) {
        const parentPath = parts.slice(0, -1).join('/');
        await createFolder(baseUrl, apiKey, parentPath);
        // Retry
        await obsidianFetch(url, apiKey, 'POST');
        return true;
      }
    }
    throw e;
  }
}

export async function createNote(baseUrl, apiKey, path, content) {
  const safePath = path.split('/').filter(p => p).map(encodeURIComponent).join('/');
  const url = `${baseUrl.replace(/\/$/, '')}/vault/${safePath}`;
  try {
    const response = await obsidianFetch(url, apiKey, 'POST', content, 'text/markdown');
    return response.text();
  } catch (e) {
    if (e.message.includes("404")) {
      // Extract folder path
      const parts = path.split('/').filter(p => p);
      if (parts.length > 1) {
        const folderPath = parts.slice(0, -1).join('/');
        await createFolder(baseUrl, apiKey, folderPath);
        // Retry once
        const response = await obsidianFetch(url, apiKey, 'POST', content, 'text/markdown');
        return response.text();
      }
    }
    throw e;
  }
}

export async function updateNote(baseUrl, apiKey, path, content) {
  const safePath = path.split('/').filter(p => p).map(encodeURIComponent).join('/');
  const url = `${baseUrl.replace(/\/$/, '')}/vault/${safePath}`;
  try {
    const response = await obsidianFetch(url, apiKey, 'PUT', content, 'text/markdown');
    return response.text();
  } catch (e) {
    if (e.message.includes("404")) {
      const parts = path.split('/').filter(p => p);
      if (parts.length > 1) {
        const folderPath = parts.slice(0, -1).join('/');
        await createFolder(baseUrl, apiKey, folderPath);
        const response = await obsidianFetch(url, apiKey, 'PUT', content, 'text/markdown');
        return response.text();
      }
    }
    throw e;
  }
}

export async function patchNote(baseUrl, apiKey, path, target, content) {
  const url = `${baseUrl.replace(/\/$/, '')}/vault/${encodeURIComponent(path)}`;
  // A standard Local REST API PATCH can append or replace based on specific headers.
  // For Phase 4 we just stub the required interface.
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'text/markdown',
    'Operation': 'append',
    'Target': target
  };
  throw new Error("Patch note is stubbed and not fully implemented yet.");
}
