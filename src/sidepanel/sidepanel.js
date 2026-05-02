// DOM Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const healthCheckBtn = document.getElementById('btn-health-check');
const swStatusEl = document.getElementById('sw-status');
const logContainer = document.getElementById('log-output');
const appVersionEl = document.getElementById('app-version');
const helpAppVersionEl = document.getElementById('help-app-version');

// Scan DOM Elements
const scanBtn = document.getElementById('btn-scan-all');
const scanFolderRoot = document.getElementById('scan-folder-root');
const dedupeBtn = document.getElementById('btn-dedupe');
const setupFoldersBtn = document.getElementById('btn-setup-folders');
const exportJsonBtn = document.getElementById('btn-export-json');
const exportCsvBtn = document.getElementById('btn-export-csv');
const moveDupesBtn = document.getElementById('btn-move-dupes');
const checkLinksBtn = document.getElementById('btn-check-links');
const recheckBrokenBtn = document.getElementById('btn-recheck-broken');
const filterStatus = document.getElementById('filter-status');
const statusFiltersContainer = document.getElementById('status-filters');
const extractSelectedBtn = document.getElementById('btn-extract-selected');
const captureSelectedBtn = document.getElementById('btn-capture-selected');
const viewDeleteCandidatesBtn = document.getElementById('btn-view-delete-candidates');
const checkBatchLimit = document.getElementById('check-batch-limit');

// Phase 8: Queue Progress Elements
const queueProgressCard = document.getElementById('queue-progress-card');
const queueTypeEl = document.getElementById('queue-type');
const queueBar = document.getElementById('queue-bar');
const queueStats = document.getElementById('queue-stats');
const pauseQueueBtn = document.getElementById('btn-pause-queue');
const resumeQueueBtn = document.getElementById('btn-resume-queue');

// Phase 8: Recheck Scheduling Elements
const recheckIntervalSelect = document.getElementById('recheck-interval');
const scheduleRecheckBtn = document.getElementById('btn-schedule-recheck');
const cancelRecheckBtn = document.getElementById('btn-cancel-recheck');
const recheckStatusEl = document.getElementById('recheck-status');

// Phase 8: Delete Confirmation Elements
const deleteConfirmModal = document.getElementById('delete-confirm-modal');
const deleteConfirmCount = document.getElementById('delete-confirm-count');
const deleteConfirmList = document.getElementById('delete-confirm-list');
const btnCloseDeleteModal = document.getElementById('btn-close-delete-modal');
const btnCancelDelete = document.getElementById('btn-cancel-delete');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const clearLogsBtn = document.getElementById('btn-clear-logs');
const inputSearch = document.getElementById('input-search');
const btnGoToScan = document.getElementById('btn-go-to-scan');
const bulkActions = document.getElementById('bulk-actions');
const reviewCleanupActions = document.getElementById('review-cleanup-actions');
const searchResultsInfo = document.getElementById('search-results-info');
const swLastCheckedEl = document.getElementById('sw-last-checked');
const swLatencyEl = document.getElementById('sw-latency');
const swVersionEl = document.getElementById('sw-version');
const swPendingEl = document.getElementById('sw-pending');
const swStatusChip = document.getElementById('sw-status-chip');
const swStatusDetail = document.getElementById('sw-status-detail');
const diagHiddenPlaceholder = document.getElementById('diagnostics-hidden-placeholder');
const btnToggleLogs = document.getElementById('btn-toggle-logs');
const diagnosticsPanel = document.getElementById('diagnostics-panel');
const btnGoToScanAction = document.getElementById('btn-go-to-scan-action');
const btnGoToReviewAction = document.getElementById('btn-go-to-review-action');
const btnSaveObsidian = document.getElementById('btn-save-obsidian');

let pendingDeleteIds = []; // IDs staged for deletion

// Extraction Preview Modal Elements
const previewModal = document.getElementById('preview-modal');
const btnClosePreview = document.getElementById('btn-close-preview');
const previewTitle = document.getElementById('preview-title');
const previewStatus = document.getElementById('preview-status');
const previewWarnings = document.getElementById('preview-warnings');
const previewContent = document.getElementById('preview-content');

if (btnClosePreview) btnClosePreview.addEventListener('click', () => previewModal.close());

// Note Preview Modal Elements
const notePreviewModal = document.getElementById('note-preview-modal');
const btnCloseNotePreview = document.getElementById('btn-close-note-preview');
const notePreviewHeading = document.getElementById('note-preview-heading');
const notePreviewPath = document.getElementById('note-preview-path');
const notePreviewAction = document.getElementById('note-preview-action');
const notePreviewBody = document.getElementById('note-preview-body');
const btnCaptureFromPreview = document.getElementById('btn-capture-from-preview');

let notePreviewCurrentId = null; // Track which bookmark is being previewed

if (btnCloseNotePreview) btnCloseNotePreview.addEventListener('click', () => notePreviewModal.close());

const scanSummary = document.getElementById('scan-summary');
const summaryTotal = document.getElementById('summary-total');
const summaryFolders = document.getElementById('summary-folders');
const bookmarkListContainer = document.getElementById('bookmark-list');

// Obsidian DOM Elements
const obsUrlInput = document.getElementById('obsidian-url');
const obsKeyInput = document.getElementById('obsidian-key');
const obsFolderInput = document.getElementById('obsidian-folder');
const obsTemplateInput = document.getElementById('obsidian-template');
const obsTestBtn = document.getElementById('btn-test-connection');
const obsSampleBtn = document.getElementById('btn-create-sample');

// UI Preference Toggles
const toggleShowObsidian = document.getElementById('toggle-show-obsidian');
const toggleShowMaintenance = document.getElementById('toggle-show-maintenance');
const toggleShowDiagnostics = document.getElementById('toggle-show-diagnostics');
const obsidianSettingsGroup = document.getElementById('obsidian-settings-group');
const maintenanceSection = document.getElementById('maintenance-section');
const dashboardHealthActions = document.getElementById('dashboard-health-actions');
const dashboardHealthSimple = document.getElementById('dashboard-health-simple');
const btnHealthCheckSimple = document.getElementById('btn-health-check-simple');

const diagResultsContainer = document.getElementById('diagnostic-results');
const diagList = document.getElementById('diagnostic-list');
const diagSummary = document.getElementById('diagnostic-summary');

// We'll import exporter functions dynamically for the browser context
import { generateJsonBlob, generateCsvBlob } from '../lib/exporter.js';

let currentBookmarks = []; // Keep a local reference for exports

// Display version
if (appVersionEl) appVersionEl.textContent = chrome.runtime.getManifest().version;
if (helpAppVersionEl) helpAppVersionEl.textContent = chrome.runtime.getManifest().version;

// Load Obsidian Settings
chrome.storage.local.get(['obsidianSettings', 'uiPrefs'], (result) => {
  if (result.obsidianSettings) {
    if (obsUrlInput) obsUrlInput.value = result.obsidianSettings.baseUrl || 'https://127.0.0.1:27124';
    if (obsKeyInput) obsKeyInput.value = result.obsidianSettings.apiKey || '';
    if (obsFolderInput) obsFolderInput.value = result.obsidianSettings.destinationFolder || '03 Resources/Web Clips/Bookmarks/';
    if (obsTemplateInput) obsTemplateInput.value = result.obsidianSettings.filenameTemplate || '{title}.md';
  }
  if (result.uiPrefs) {
    refreshUIByPrefs(result.uiPrefs);
  }
});

function saveObsidianSettings() {
  const settings = {
    baseUrl: obsUrlInput ? obsUrlInput.value : 'https://127.0.0.1:27124',
    apiKey: obsKeyInput ? obsKeyInput.value : '',
    destinationFolder: obsFolderInput ? obsFolderInput.value : '03 Resources/Web Clips/Bookmarks/',
    filenameTemplate: obsTemplateInput ? obsTemplateInput.value : '{title}.md'
  };
  chrome.storage.local.set({ obsidianSettings: settings });
  return settings;
}

// Utility: Add log entry
function addLog(message, type = 'info') {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const p = document.createElement('p');
  p.className = `log-entry ${type}`;
  p.textContent = `[${time}] ${message}`;
  logContainer.appendChild(p);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Tab Switching Logic
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    switchTab(targetId);
  });
});

function switchTab(targetId) {
  // Remove active class from all
  tabBtns.forEach(b => b.classList.remove('active'));
  tabPanes.forEach(p => p.classList.remove('active'));

  // Add active class to target
  const targetBtn = Array.from(tabBtns).find(b => b.getAttribute('data-target') === targetId);
  const targetPane = document.getElementById(targetId);
  
  if (targetBtn) targetBtn.classList.add('active');
  if (targetPane) targetPane.classList.add('active');
  
  addLog(`Switched to ${targetId} tab`, 'system');
}

// Navigation Bridges
if (btnGoToScanAction) btnGoToScanAction.addEventListener('click', () => switchTab('scan'));
if (btnGoToReviewAction) btnGoToReviewAction.addEventListener('click', () => switchTab('review'));
if (btnSaveObsidian) btnSaveObsidian.addEventListener('click', () => {
  saveObsidianSettings();
  addLog('Obsidian settings saved.', 'success');
});

// ── UI Preference Logic ─────────────────────────────────────────────

function refreshUIByPrefs(prefs) {
  if (!prefs) return;

  // Obsidian Integration
  if (obsidianSettingsGroup) {
    obsidianSettingsGroup.style.display = prefs.showObsidian ? 'block' : 'none';
  }
  if (toggleShowObsidian) toggleShowObsidian.checked = !!prefs.showObsidian;

  // Maintenance Tools
  if (maintenanceSection) {
    maintenanceSection.style.display = prefs.showMaintenance ? 'block' : 'none';
  }
  if (toggleShowMaintenance) toggleShowMaintenance.checked = !!prefs.showMaintenance;

  // Diagnostics Toggle
  if (dashboardHealthActions && dashboardHealthSimple) {
    dashboardHealthActions.style.display = prefs.showDiagnostics ? 'flex' : 'none';
    dashboardHealthSimple.style.display = prefs.showDiagnostics ? 'none' : 'block';
  }
  if (toggleShowDiagnostics) toggleShowDiagnostics.checked = !!prefs.showDiagnostics;
}

async function saveUIPrefs() {
  const prefs = {
    showObsidian: toggleShowObsidian ? toggleShowObsidian.checked : false,
    showMaintenance: toggleShowMaintenance ? toggleShowMaintenance.checked : false,
    showDiagnostics: toggleShowDiagnostics ? toggleShowDiagnostics.checked : false
  };
  await chrome.storage.local.set({ uiPrefs: prefs });
  refreshUIByPrefs(prefs);
  addLog('UI preferences updated.', 'success');
}

if (toggleShowObsidian) toggleShowObsidian.addEventListener('change', saveUIPrefs);
if (toggleShowMaintenance) toggleShowMaintenance.addEventListener('change', saveUIPrefs);
if (toggleShowDiagnostics) toggleShowDiagnostics.addEventListener('change', saveUIPrefs);
if (btnHealthCheckSimple) {
  btnHealthCheckSimple.addEventListener('click', () => checkServiceWorkerHealth(true));
}

// ── Service Worker Health Check (Proactive) ─────────────────────────

async function checkServiceWorkerHealth(isManual = false) {
  healthCheckBtn.disabled = true;
  healthCheckBtn.textContent = 'Checking…';
  if (btnHealthCheckSimple) {
    btnHealthCheckSimple.disabled = true;
    btnHealthCheckSimple.textContent = 'Checking…';
  }

  swStatusChip.className = 'status-chip checking';
  swStatusChip.textContent = 'Checking…';
  swStatusDetail.textContent = isManual ? 'Refreshing worker status…' : 'Checking service worker status…';
  if (isManual) addLog('Refreshing worker status…', 'system');

  const startTime = Date.now();
  try {
    const response = await chrome.runtime.sendMessage({ action: 'HEALTH_CHECK' });
    const latency = Date.now() - startTime;
    
    if (response && response.ok) {
      swStatusChip.className = 'status-chip responsive';
      swStatusChip.textContent = 'Responsive';
      swStatusDetail.textContent = 'Background worker is available.';
      swLatencyEl.textContent = `${latency}ms`;
      swVersionEl.textContent = response.workerVersion || '—';
      swPendingEl.textContent = response.pendingJobs ?? '—';
      
      swLastCheckedEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (isManual) addLog('Worker status refreshed.', 'success');
      
      if (response.hasBookmarks) {
        currentBookmarks = response.bookmarks || [];
        updateSummaryCounts(currentBookmarks);
      }
    } else {
      swStatusChip.className = 'status-chip error';
      swStatusChip.textContent = 'Error';
      swStatusDetail.textContent = 'The status check failed. Review diagnostics.';
      swLatencyEl.textContent = '—';
      addLog('Could not confirm worker status.', 'error');
    }
  } catch (error) {
    const isWaking = error.message.includes('Could not establish connection') || error.message.includes('receiving end does not exist');
    
    if (isWaking) {
      swStatusChip.className = 'status-chip waking';
      swStatusChip.textContent = 'Waking';
      swStatusDetail.textContent = 'The worker may be starting up.';
    } else {
      swStatusChip.className = 'status-chip not-responding';
      swStatusChip.textContent = 'Not responding';
      swStatusDetail.textContent = 'No response was received. Try refreshing status.';
    }
    swLatencyEl.textContent = '—';
    addLog(`Health check info: ${error.message}`, 'info');
  } finally {
    // Always restore buttons after check completes
    if (healthCheckBtn) {
      healthCheckBtn.disabled = false;
      healthCheckBtn.textContent = 'Refresh Worker Status';
    }
    if (btnHealthCheckSimple) {
      btnHealthCheckSimple.disabled = false;
      btnHealthCheckSimple.textContent = 'Refresh Worker Status';
    }
  }
}

if (healthCheckBtn) healthCheckBtn.addEventListener('click', () => checkServiceWorkerHealth(true));

// Diagnostics Toggle
if (btnToggleLogs) btnToggleLogs.addEventListener('click', () => {
  const isHidden = diagnosticsPanel.style.display === 'none';
  diagnosticsPanel.style.display = isHidden ? 'block' : 'none';
  if (diagHiddenPlaceholder) diagHiddenPlaceholder.style.display = isHidden ? 'none' : 'block';
  btnToggleLogs.textContent = isHidden ? 'Hide diagnostics' : 'Show diagnostics';
  addLog(isHidden ? 'Diagnostics shown.' : 'Diagnostics hidden.', 'system');
});

// Scan Bookmarks Logic
if (scanBtn) scanBtn.addEventListener('click', async () => {
  const rootId = (scanFolderRoot && scanFolderRoot.value) ? scanFolderRoot.value : null;
  scanBtn.disabled = true;
  scanBtn.textContent = 'Scanning...';
  addLog(`Starting ${rootId ? 'folder' : 'full'} bookmark scan...`, 'system');
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'SCAN_BOOKMARKS',
      rootId: rootId
    });
    if (response.status === 'success') {
      addLog(`Scan complete: found ${response.total} bookmarks.`, 'success');
      
      // Update Summary
      if (scanSummary) scanSummary.style.display = 'block';
      if (summaryTotal) summaryTotal.textContent = response.total;
      
      if (summaryFolders) {
        summaryFolders.innerHTML = '';
        for (const [folder, count] of Object.entries(response.folderStats)) {
          const li = document.createElement('li');
          li.textContent = `${folder}: ${count}`;
          summaryFolders.appendChild(li);
        }
      }
      
      currentBookmarks = response.bookmarks;
      if (statusFiltersContainer) statusFiltersContainer.style.display = 'block';
      if (bulkActions) bulkActions.style.display = 'flex';
      if (reviewCleanupActions) reviewCleanupActions.style.display = 'block';
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
      
      // Enable secondary actions
      if (dedupeBtn) dedupeBtn.disabled = false;
      if (exportJsonBtn) exportJsonBtn.disabled = false;
      if (exportCsvBtn) exportCsvBtn.disabled = false;
      if (checkLinksBtn) checkLinksBtn.disabled = false;
      if (recheckBrokenBtn) recheckBrokenBtn.disabled = false;
      if (extractSelectedBtn) extractSelectedBtn.disabled = false;
      if (captureSelectedBtn) captureSelectedBtn.disabled = false;
      if (viewDeleteCandidatesBtn) viewDeleteCandidatesBtn.disabled = false;
      
    } else {
      addLog(`Scan failed: ${response.message}`, 'error');
    }
  } catch (error) {
    addLog(`Scan error: ${error.message}`, 'error');
  } finally {
    if (scanBtn) {
      scanBtn.disabled = false;
      scanBtn.textContent = 'Start Scan';
    }
  }
});

function renderList(bookmarks) {
  bookmarkListContainer.style.display = 'block';
  bookmarkListContainer.innerHTML = '';
  
  const selectedFilter = filterStatus.value;
  const searchTerm = inputSearch.value.toLowerCase();
  
  let filtered = bookmarks.filter(b => {
    // Status Filter
    let statusMatch = true;
    if (selectedFilter === 'delete-candidate') {
      const days = b.firstChecked ? (Date.now() - new Date(b.firstChecked).getTime()) / (24*60*60*1000) : 0;
      statusMatch = (b.status === 'hard-broken' && (b.attempts || 0) >= 3 && days >= 21);
    } else if (selectedFilter !== 'all') {
      statusMatch = (b.status === selectedFilter);
    }

    // Search Filter
    const searchMatch = !searchTerm || 
                        b.title.toLowerCase().includes(searchTerm) || 
                        b.url.toLowerCase().includes(searchTerm);

    return statusMatch && searchMatch;
  });
  
  // Update result count info
  if (searchResultsInfo) {
    if (searchTerm || selectedFilter !== 'all') {
      searchResultsInfo.textContent = `Showing ${Math.min(filtered.length, 100)} of ${filtered.length} matches`;
      searchResultsInfo.style.display = 'block';
    } else {
      searchResultsInfo.style.display = 'none';
    }
  }
  
  const toRender = filtered.slice(0, 100);
  toRender.forEach(b => {
    const div = document.createElement('div');
    div.className = 'bookmark-item';
    
    // Build diagnostic details HTML
    let detailsHtml = '';
    if (b.error || b.finalUrl || b.extractedData) {
      detailsHtml = `<div style="font-size: 10px; color: #666; margin-top: 4px; border-top: 1px dashed #ccc; padding-top: 4px;">`;
      if (b.finalUrl && b.finalUrl !== b.url) detailsHtml += `<div><strong>Final URL:</strong> <span style="word-break: break-all;">${b.finalUrl}</span></div>`;
      if (b.httpStatus) detailsHtml += `<div><strong>HTTP:</strong> ${b.httpStatus}</div>`;
      if (b.error) detailsHtml += `<div><strong>Reason:</strong> ${b.error} (retries: ${b.attempts ? b.attempts - 1 : 0})</div>`;
      if (b.extractedData) {
        const wordCount = b.extractedData.plainText ? b.extractedData.plainText.split(/\s+/).length : 0;
        const eStatus = b.extractionStatus || 'success';
        const color = eStatus === 'success' ? '#0a7a3b' : (eStatus === 'partial' ? '#b07f00' : '#c92a2a');
        detailsHtml += `<div style="color: ${color}; font-weight: bold; margin-top: 2px;">Extracted: ${eStatus} (${wordCount} words)</div>`;
      }
      detailsHtml += `</div>`;
    }

    const canExtract = b.status === 'healthy' || b.status === 'redirected';
    const hasExtraction = !!b.extractedData;
    const captureColor = { created: '#0a7a3b', updated: '#1a73e8', skipped: '#888', failed: '#c92a2a' };

    div.innerHTML = `
      <div style="display:flex; align-items:flex-start;">
        <input type="checkbox" class="bookmark-select" data-id="${b.id}" style="margin-right:8px;" ${b.status === 'duplicate' ? 'checked' : ''}>
        <div style="flex:1; overflow:hidden;">
          <div class="bookmark-item-title">${b.title}</div>
          <div class="bookmark-item-url">${b.url}</div>
          <div class="bookmark-item-meta">
            <span>Folder: ${b.folderPath}</span>
            <span class="badge badge-${b.status}">${b.status}</span>
            ${b.extractionStatus ? `<span class="badge badge-${b.extractionStatus}">Ext: ${b.extractionStatus}</span>` : ''}
            ${b.captureStatus ? `<span class="badge" style="background-color: ${captureColor[b.captureStatus] || '#888'}; color: white;">📋 ${b.captureStatus}</span>` : ''}
          </div>
          ${detailsHtml}
          <div style="margin-top: 6px; display: flex; gap: 4px; flex-wrap: wrap;">
            <button class="btn-row-recheck" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px;">Recheck</button>
            <button class="btn-row-extract" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px;" ${canExtract ? '' : 'disabled'}>Extract Content</button>
            ${hasExtraction ? `<button class="btn-row-preview" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;">View Preview</button>` : ''}
            <button class="btn-row-note-preview" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #e8f0fe; border: 1px solid #1a73e8; border-radius: 4px; color: #1a73e8;">Preview Note</button>
          </div>
        </div>
      </div>
    `;
    bookmarkListContainer.appendChild(div);
  });
  
  if (filtered.length > 100) {
    const msg = document.createElement('div');
    msg.style.padding = '10px';
    msg.style.textAlign = 'center';
    msg.style.fontStyle = 'italic';
    msg.textContent = `...and ${filtered.length - 100} more not shown to preserve UI performance.`;
    bookmarkListContainer.appendChild(msg);
  }
  
  // Attach Recheck Listeners
  document.querySelectorAll('.btn-row-recheck').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      e.target.disabled = true;
      e.target.textContent = '...';
      const response = await chrome.runtime.sendMessage({ action: 'CHECK_SINGLE_LINK', id });
      if (response.status === 'success') {
        currentBookmarks = response.allBookmarks;
        renderList(currentBookmarks);
      } else {
        addLog(`Recheck failed: ${response.message}`, 'error');
        e.target.disabled = false;
        e.target.textContent = 'Recheck';
      }
    });
  });

  // Attach Extract Listeners
  document.querySelectorAll('.btn-row-extract').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      e.target.disabled = true;
      e.target.textContent = 'Extracting...';
      const response = await chrome.runtime.sendMessage({ action: 'EXTRACT_BATCH', ids: [id] });
      if (response.status === 'success') {
        currentBookmarks = response.allBookmarks;
        addLog(`Successfully extracted content for bookmark ${id}.`, 'success');
        renderList(currentBookmarks);
      } else {
        addLog(`Extraction failed: ${response.message}`, 'error');
        e.target.disabled = false;
        e.target.textContent = 'Extract Content';
      }
    });
  });

  // Attach Preview Listeners
  document.querySelectorAll('.btn-row-preview').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const b = currentBookmarks.find(bk => bk.id === id);
      if (b && b.extractedData) {
        previewTitle.textContent = b.extractedData.title || b.title;
        previewStatus.textContent = `Status: ${b.extractionStatus}`;
        previewStatus.style.color = b.extractionStatus === 'success' ? '#0a7a3b' : '#b07f00';
        
        previewWarnings.innerHTML = (b.extractedData.extractionWarnings || []).map(w => `<div>⚠ ${w}</div>`).join('');
        previewContent.textContent = b.extractedData.markdown;
        
        previewModal.showModal();
      }
    });
  });

  // Attach Note Preview Listeners
  document.querySelectorAll('.btn-row-note-preview').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      e.target.disabled = true;
      e.target.textContent = '...';
      
      const response = await chrome.runtime.sendMessage({ action: 'PREVIEW_NOTE', id });
      if (response.status === 'success') {
        notePreviewCurrentId = id;
        notePreviewHeading.textContent = 'Note Preview';
        notePreviewPath.textContent = `📁 Path: ${response.notePath}`;
        notePreviewAction.textContent = response.willUpdate ? '⚡ Action: UPDATE existing note' : '✨ Action: CREATE new note';
        notePreviewAction.style.color = response.willUpdate ? '#1a73e8' : '#0a7a3b';
        notePreviewBody.textContent = response.noteContent;
        notePreviewModal.showModal();
      } else {
        addLog(`Note preview failed: ${response.message}`, 'error');
      }
      
      e.target.disabled = false;
      e.target.textContent = 'Preview Note';
    });
  });
}

// Write to Obsidian from note preview modal
if (btnCaptureFromPreview) {
  btnCaptureFromPreview.addEventListener('click', async () => {
  if (!notePreviewCurrentId) return;
  
  btnCaptureFromPreview.disabled = true;
  btnCaptureFromPreview.textContent = 'Writing...';
  
  const response = await chrome.runtime.sendMessage({ action: 'CAPTURE_BATCH', ids: [notePreviewCurrentId] });
  if (response.status === 'success') {
    const result = response.results[0];
    if (result.action === 'created' || result.action === 'updated') {
      addLog(`Note ${result.action}: ${result.notePath}`, 'success');
    } else if (result.action === 'skipped') {
      addLog(`Note skipped (unchanged): ${result.notePath}`, 'info');
    } else {
      addLog(`Note failed: ${result.reason}`, 'error');
    }
    currentBookmarks = response.allBookmarks;
    renderList(currentBookmarks);
    notePreviewModal.close();
  } else {
    addLog(`Capture failed: ${response.message}`, 'error');
  }
  
  btnCaptureFromPreview.disabled = false;
  btnCaptureFromPreview.textContent = 'Write to Obsidian';
});
}

// Bulk Extract logic
if (extractSelectedBtn) {
  extractSelectedBtn.addEventListener('click', async () => {
  const selected = document.querySelectorAll('.bookmark-select:checked');
  const ids = Array.from(selected).map(cb => cb.getAttribute('data-id'));
  if (ids.length === 0) return;
  
  extractSelectedBtn.disabled = true;
  extractSelectedBtn.textContent = 'Extracting...';
  addLog(`Sending ${ids.length} bookmarks for batch extraction...`, 'info');
  
  const response = await chrome.runtime.sendMessage({ action: 'EXTRACT_BATCH', ids });
  if (response.status === 'success') {
    currentBookmarks = response.allBookmarks;
    renderList(currentBookmarks);
    addLog('Batch extraction completed.', 'success');
  } else {
    addLog(`Batch extraction error: ${response.message}`, 'error');
  }
  
  extractSelectedBtn.disabled = false;
  extractSelectedBtn.textContent = 'Extract Selected';
});
}

// Bulk Capture logic
if (captureSelectedBtn) {
  captureSelectedBtn.addEventListener('click', async () => {
  const selected = document.querySelectorAll('.bookmark-select:checked');
  const ids = Array.from(selected).map(cb => cb.getAttribute('data-id'));
  if (ids.length === 0) {
    addLog('No bookmarks selected for capture.', 'error');
    return;
  }
  
  captureSelectedBtn.disabled = true;
  captureSelectedBtn.textContent = 'Capturing...';
  addLog(`Capturing ${ids.length} bookmarks to Obsidian...`, 'info');
  
  const response = await chrome.runtime.sendMessage({ action: 'CAPTURE_BATCH', ids });
  if (response.status === 'success') {
    currentBookmarks = response.allBookmarks;
    renderList(currentBookmarks);
    
    const created = response.results.filter(r => r.action === 'created').length;
    const updated = response.results.filter(r => r.action === 'updated').length;
    const skipped = response.results.filter(r => r.action === 'skipped').length;
    const failed = response.results.filter(r => r.action === 'failed').length;
    
    addLog(`Capture complete: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed.`, 'success');
  } else {
    addLog(`Capture error: ${response.message}`, 'error');
  }
  
  captureSelectedBtn.disabled = false;
  captureSelectedBtn.textContent = 'Capture to Obsidian';
});
}

function updateSummaryCounts(bookmarks) {
  if (!bookmarks) return;
  const counts = { healthy: 0, redirected: 0, duplicate: 0, 'soft-broken': 0, 'hard-broken': 0, pending: 0 };
  bookmarks.forEach(b => {
    counts[b.status] = (counts[b.status] || 0) + 1;
  });
  
  if (summaryTotal) summaryTotal.textContent = bookmarks.length;
  // Let's create a dynamic breakdown element if it doesn't exist
  let breakdown = document.getElementById('summary-breakdown');
  if (!breakdown && scanSummary) {
    breakdown = document.createElement('div');
    breakdown.id = 'summary-breakdown';
    breakdown.style.fontSize = '12px';
    breakdown.style.marginTop = '8px';
    scanSummary.appendChild(breakdown);
  }
  
  if (breakdown) {
    breakdown.innerHTML = `
      <span class="badge badge-healthy">Healthy: ${counts.healthy}</span>
      <span class="badge badge-redirected">Redirected: ${counts.redirected}</span>
      <span class="badge badge-soft-broken">Soft-Broken: ${counts['soft-broken']}</span>
      <span class="badge badge-hard-broken">Hard-Broken: ${counts['hard-broken']}</span>
      <span class="badge badge-duplicate">Duplicates: ${counts.duplicate}</span>
    `;
  }
}

// Filter status dropdown triggers a re-render
if (filterStatus) filterStatus.addEventListener('change', () => {
  renderList(currentBookmarks);
});

if (inputSearch) inputSearch.addEventListener('input', () => {
  renderList(currentBookmarks);
});

if (btnGoToScan) btnGoToScan.addEventListener('click', () => {
  switchTab('scan');
});

// Deduplication Logic
if (dedupeBtn) dedupeBtn.addEventListener('click', async () => {
  addLog('Finding duplicates...', 'system');
  const response = await chrome.runtime.sendMessage({ action: 'DEDUPE_BOOKMARKS' });
  if (response.status === 'success') {
    addLog(`Found ${response.duplicateCount} duplicates.`, 'success');
    currentBookmarks = response.bookmarks;
    renderList(currentBookmarks);
    if (response.duplicateCount > 0 && moveDupesBtn) {
      moveDupesBtn.disabled = false;
    }
  } else {
    addLog(`Dedupe failed: ${response.message}`, 'error');
  }
});

// Setup Folders Logic
if (setupFoldersBtn) setupFoldersBtn.addEventListener('click', async () => {
  addLog('Setting up review folders...', 'system');
  const response = await chrome.runtime.sendMessage({ action: 'SETUP_FOLDERS' });
  if (response.status === 'success') {
    addLog('Review folders created/verified successfully.', 'success');
  } else {
    addLog(`Setup failed: ${response.message}`, 'error');
  }
});

// Move Dupes Logic
if (moveDupesBtn) moveDupesBtn.addEventListener('click', async () => {
  const checkedBoxes = document.querySelectorAll('.bookmark-select:checked');
  const idsToMove = Array.from(checkedBoxes).map(cb => cb.getAttribute('data-id'));
  
  if (idsToMove.length === 0) {
    addLog('No items selected to move.', 'error');
    return;
  }
  
  addLog(`Moving ${idsToMove.length} items to _Review Duplicates...`, 'system');
  const response = await chrome.runtime.sendMessage({ 
    action: 'MOVE_BOOKMARKS', 
    bookmarkIds: idsToMove, 
    folderName: '_Review Duplicates' 
  });
  
  if (response.status === 'success') {
    addLog(`Successfully moved ${response.count} items.`, 'success');
    // Refresh list locally
    currentBookmarks = currentBookmarks.filter(b => !idsToMove.includes(b.id));
    renderList(currentBookmarks);
  } else {
    addLog(`Move failed: ${response.message}`, 'error');
  }
});

// Export Logic
function downloadBlobLocally(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

if (exportJsonBtn) exportJsonBtn.addEventListener('click', () => {
  if (!currentBookmarks.length) return;
  const blob = generateJsonBlob(currentBookmarks);
  downloadBlobLocally(blob, 'bookmarks_export.json');
  addLog('Exported JSON successfully.', 'success');
});

if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => {
  if (!currentBookmarks.length) return;
  const blob = generateCsvBlob(currentBookmarks);
  downloadBlobLocally(blob, 'bookmarks_export.csv');
  addLog('Exported CSV successfully.', 'success');
});

// Link Checking Logic
if (checkLinksBtn) checkLinksBtn.addEventListener('click', async () => {
  const limit = checkBatchLimit ? parseInt(checkBatchLimit.value) : 0;
  addLog(`Starting link check (limit: ${limit || 'All'})...`, 'system');
  
  checkLinksBtn.disabled = true;
  checkLinksBtn.textContent = 'Checking...';
  startQueuePolling();
  
  const response = await chrome.runtime.sendMessage({ 
    action: 'CHECK_LINKS',
    limit: limit
  });
  stopQueuePolling();
  if (response.status === 'success') {
    addLog('Finished checking links.', 'success');
    currentBookmarks = response.bookmarks;
    updateSummaryCounts(currentBookmarks);
    renderList(currentBookmarks);
  } else {
    addLog(`Link check failed: ${response.message}`, 'error');
  }
  
  checkLinksBtn.disabled = false;
  checkLinksBtn.textContent = 'Check Links';
});

if (recheckBrokenBtn) {
  recheckBrokenBtn.addEventListener('click', async () => {
  addLog('Rechecking soft-broken links...', 'system');
  if (recheckBrokenBtn) {
    recheckBrokenBtn.disabled = true;
    recheckBrokenBtn.textContent = 'Rechecking...';
  }
  
  const response = await chrome.runtime.sendMessage({ action: 'RECHECK_BROKEN' });
  if (response.status === 'success') {
    addLog('Finished rechecking broken links.', 'success');
    currentBookmarks = response.bookmarks;
    updateSummaryCounts(currentBookmarks);
    renderList(currentBookmarks);
  } else {
    addLog(`Recheck failed: ${response.message}`, 'error');
  }
  
  if (recheckBrokenBtn) {
    recheckBrokenBtn.disabled = false;
    recheckBrokenBtn.textContent = 'Recheck Broken';
  }
});
}

// --- Obsidian API Logic ---

async function runDiagnostics(baseUrl, apiKey) {
  const results = [];
  const addResult = (step, status, message) => results.push({ step, status, message });

  // 1. URL Format
  let urlObj;
  try {
    urlObj = new URL(baseUrl);
    addResult('URL Format', 'pass', `Valid URL structure: ${urlObj.origin}`);
  } catch (e) {
    addResult('URL Format', 'fail', 'Invalid URL format. Must start with http:// or https://');
    return results; // Halt
  }

  // 2. Connectivity & TLS Trust
  const testUrl = `${urlObj.origin.replace(/\/$/, '')}/`;
  let response;
  try {
    response = await fetch(testUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey || 'test'}` }
    });
    addResult('TLS & Connectivity', 'pass', 'Successfully connected to server endpoint.');
  } catch (e) {
    addResult('TLS & Connectivity', 'fail', `Connection failed. Obsidian closed OR Chrome blocked the self-signed certificate. Please open ${urlObj.origin} in a new tab and click Advanced -> Proceed.`);
    return results; // Halt
  }

  // 3. Auth Validation
  if (response.status === 401) {
    addResult('Authentication', 'fail', 'Unauthorized (401). Your API Key is missing or incorrect.');
  } else if (response.ok || response.status === 200) {
    addResult('Authentication', 'pass', 'API Key accepted successfully.');
  } else {
    addResult('Authentication', 'fail', `Unexpected API response code: ${response.status}`);
  }

  return results;
}

if (obsTestBtn) {
  obsTestBtn.addEventListener('click', async () => {
  const settings = saveObsidianSettings();
  addLog(`Running detailed diagnostics for ${settings.baseUrl}...`, 'system');
  
  diagList.innerHTML = '';
  diagResultsContainer.style.display = 'block';
  diagSummary.textContent = 'Running diagnostics...';
  diagSummary.className = 'summary-text system';

  const results = await runDiagnostics(settings.baseUrl, settings.apiKey);
  
  let allPassed = true;
  for (const res of results) {
    if (res.status === 'fail') allPassed = false;
    const li = document.createElement('li');
    li.className = `diag-item diag-${res.status}`;
    li.innerHTML = `<strong>${res.step}:</strong> ${res.message}`;
    diagList.appendChild(li);
  }

  if (allPassed) {
    if (diagSummary) {
      diagSummary.textContent = 'All diagnostics passed! Ready to create notes.';
      diagSummary.className = 'summary-text success';
    }
    addLog('Obsidian diagnostics passed.', 'success');
    
    // Enable sample note button if we have bookmarks
    if (currentBookmarks.length > 0 && obsSampleBtn) {
      obsSampleBtn.disabled = false;
    }
  } else {
    if (diagSummary) {
      diagSummary.textContent = 'Diagnostics failed. Please fix the issues above and try again.';
      diagSummary.className = 'summary-text error';
    }
    addLog('Obsidian diagnostics failed.', 'error');
    if (obsSampleBtn) obsSampleBtn.disabled = true;
  }
});
}

if (obsSampleBtn) {
  obsSampleBtn.addEventListener('click', async () => {
  if (!currentBookmarks.length) {
    addLog("No bookmarks available. Run a bookmark scan first.", 'error');
    return;
  }
  
  // Pick the first checked bookmark, or just the first bookmark
  const checkedBox = document.querySelector('.bookmark-select:checked');
  const bookmark = checkedBox 
    ? currentBookmarks.find(b => b.id === checkedBox.getAttribute('data-id'))
    : currentBookmarks[0];

  // Save settings so the service worker can read them
  saveObsidianSettings();
  
  addLog(`Creating sample note for: ${bookmark.title}...`, 'system');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CAPTURE_BATCH', ids: [bookmark.id] });
    if (response.status === 'success') {
      const result = response.results[0];
      if (result.action === 'created') {
        addLog(`Created sample note: ${result.notePath}`, 'success');
      } else if (result.action === 'updated') {
        addLog(`Updated existing note: ${result.notePath}`, 'success');
      } else if (result.action === 'skipped') {
        addLog(`Note unchanged, skipped: ${result.notePath}`, 'info');
      } else {
        addLog(`Sample note failed: ${result.reason}`, 'error');
      }
      currentBookmarks = response.allBookmarks;
      renderList(currentBookmarks);
    } else {
      addLog(`Sample note failed: ${response.message}`, 'error');
    }
  } catch (error) {
    addLog(`Note creation failed: ${error.message}`, 'error');
  }
});
}

// ── Phase 8: Queue Progress Polling ────────────────────────────────

let queuePollTimer = null;

function startQueuePolling() {
  queueProgressCard.style.display = 'block';
  pauseQueueBtn.disabled = false;
  queuePollTimer = setInterval(async () => {
    try {
      const r = await chrome.runtime.sendMessage({ action: 'GET_QUEUE_STATUS' });
      if (r.status === 'success') updateQueueUI(r.progress);
    } catch (e) { /* SW may be restarting */ }
  }, 2000);
}

function stopQueuePolling() {
  clearInterval(queuePollTimer);
  queuePollTimer = null;
  queueProgressCard.style.display = 'none';
}

function updateQueueUI(p) {
  if (!p || p.total === 0) { queueProgressCard.style.display = 'none'; return; }
  queueProgressCard.style.display = 'block';
  const pct = Math.round(((p.done + p.failed) / p.total) * 100);
  queueTypeEl.textContent = `Operation: ${p.type || 'unknown'}`;
  queueBar.style.width = `${pct}%`;
  queueStats.textContent = `Done: ${p.done} | Failed: ${p.failed} | Remaining: ${p.remaining} | ${p.paused ? '⏸ Paused' : '▶ Running'}`;
  pauseQueueBtn.disabled = p.paused;
  resumeQueueBtn.disabled = !p.paused;
}

if (pauseQueueBtn) {
  pauseQueueBtn.addEventListener('click', async () => {
  const r = await chrome.runtime.sendMessage({ action: 'PAUSE_QUEUE' });
  if (r.status === 'success') { updateQueueUI(r.progress); addLog('Queue paused.', 'system'); }
  else addLog(`Pause failed: ${r.message}`, 'error');
});
}

if (resumeQueueBtn) {
  resumeQueueBtn.addEventListener('click', async () => {
  addLog('Resuming queue...', 'system');
  startQueuePolling();
  const r = await chrome.runtime.sendMessage({ action: 'RESUME_QUEUE' });
  stopQueuePolling();
  if (r.status === 'success' && r.bookmarks) {
    currentBookmarks = r.bookmarks;
    updateSummaryCounts(currentBookmarks);
    renderList(currentBookmarks);
    addLog('Queue completed after resume.', 'success');
  } else if (r.status === 'error') {
    addLog(`Resume failed: ${r.message}`, 'error');
  }
});
}

// ── Phase 8: Scheduled Rechecks ────────────────────────────────────

if (scheduleRecheckBtn) {
  scheduleRecheckBtn.addEventListener('click', async () => {
  const mins = parseInt(recheckIntervalSelect.value);
  const r = await chrome.runtime.sendMessage({ action: 'SCHEDULE_RECHECK', intervalMinutes: mins });
  if (r.status === 'success') {
    recheckStatusEl.textContent = `✅ Scheduled every ${mins} minutes`;
    addLog(`Recheck alarm scheduled (every ${mins} min).`, 'success');
  }
});
}

if (cancelRecheckBtn) {
  cancelRecheckBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'CANCEL_RECHECK' });
  recheckStatusEl.textContent = 'No recheck scheduled.';
  addLog('Recheck alarm cancelled.', 'system');
});
}

// Load alarm status on panel open
(async () => {
  try {
    const r = await chrome.runtime.sendMessage({ action: 'GET_ALARM_CONFIG' });
    if (r.status === 'success' && r.config.enabled) {
      recheckStatusEl.textContent = `✅ Scheduled every ${r.config.intervalMinutes} min` + (r.config.lastRun ? ` | Last: ${new Date(r.config.lastRun).toLocaleString()}` : '');
    } else {
      recheckStatusEl.textContent = 'No recheck scheduled.';
    }
  } catch (e) { /* ignore */ }
})();

// ── Phase 8: Delete Candidate Review ───────────────────────────────

if (viewDeleteCandidatesBtn) {
  viewDeleteCandidatesBtn.addEventListener('click', async () => {
  const r = await chrome.runtime.sendMessage({ action: 'GET_DELETE_CANDIDATES' });
  if (r.status === 'success') {
    if (r.candidates.length === 0) {
      addLog('No delete candidates found. Bookmarks need ≥3 checks over ≥21 days as hard-broken.', 'info');
      return;
    }
    pendingDeleteIds = r.candidates.map(c => c.id);
    deleteConfirmCount.textContent = `${r.candidates.length} bookmark(s) are eligible for deletion:`;
    deleteConfirmList.innerHTML = r.candidates.map(c =>
      `<div style="padding:2px 0;border-bottom:1px solid #fee;">• <strong>${c.title}</strong><br><span style="color:#888;font-size:10px;">${c.url} (${c.attempts} checks)</span></div>`
    ).join('');
    deleteConfirmModal.showModal();
  } else {
    addLog(`Failed to load candidates: ${r.message}`, 'error');
  }
});
}

if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', () => deleteConfirmModal && deleteConfirmModal.close());
if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => deleteConfirmModal && deleteConfirmModal.close());

if (btnConfirmDelete) {
  btnConfirmDelete.addEventListener('click', async () => {
  if (pendingDeleteIds.length === 0) return;
  btnConfirmDelete.disabled = true;
  btnConfirmDelete.textContent = 'Deleting...';
  addLog(`Deleting ${pendingDeleteIds.length} bookmarks...`, 'system');

  const r = await chrome.runtime.sendMessage({ action: 'DELETE_BOOKMARKS', ids: pendingDeleteIds, confirmed: true });
  if (r.status === 'success') {
    const deleted = r.results.filter(x => x.action === 'deleted').length;
    const failed = r.results.filter(x => x.action === 'failed').length;
    addLog(`Deleted: ${deleted}, Failed: ${failed}`, deleted > 0 ? 'success' : 'error');
    currentBookmarks = r.allBookmarks;
    updateSummaryCounts(currentBookmarks);
    renderList(currentBookmarks);
  } else {
    addLog(`Deletion failed: ${r.message}`, 'error');
  }

  pendingDeleteIds = [];
  btnConfirmDelete.disabled = false;
  btnConfirmDelete.textContent = 'Yes, Delete Permanently';
  deleteConfirmModal.close();
});
}

// ── Phase 8: Clear Logs ────────────────────────────────────────────

if (clearLogsBtn) {
  clearLogsBtn.addEventListener('click', () => {
  logContainer.innerHTML = '';
  addLog('Logs cleared.', 'system');
});
}

// ── Folder List Logic ───────────────────────────────────────────────

async function loadFolderList() {
  if (!scanFolderRoot) return;
  
  try {
    const tree = await chrome.bookmarks.getTree();
    const folders = [];
    
    function findFolders(nodes, path = []) {
      nodes.forEach(node => {
        if (node.children) {
          const newPath = node.title ? [...path, node.title] : path;
          if (node.id !== '0') { // Root of tree is invisible
            folders.push({ id: node.id, path: newPath.join(' / ') || 'Root' });
          }
          findFolders(node.children, newPath);
        }
      });
    }
    
    findFolders(tree);
    
    // Clear existing except first
    while (scanFolderRoot.options.length > 1) {
      scanFolderRoot.remove(1);
    }
    
    folders.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.path;
      scanFolderRoot.appendChild(opt);
    });
  } catch (e) {
    console.error('Failed to load folders:', e);
  }
}

// ── State Hydration on Panel Open ──────────────────────────────────

(async () => {
  // 1. Load UI Preferences
  const storage = await chrome.storage.local.get(['uiPrefs']);
  if (storage.uiPrefs) {
    refreshUIByPrefs(storage.uiPrefs);
  } else {
    // Default minimal state
    refreshUIByPrefs({
      showObsidian: false,
      showMaintenance: false,
      showDiagnostics: false
    });
  }

  // 1b. Load Folders
  await loadFolderList();

  // 2. Proactive Health Check
  await checkServiceWorkerHealth();

  // 3. Hydrate bookmarks and queue details
  try {
    const r = await chrome.runtime.sendMessage({ action: 'HEALTH_CHECK' });
    if (r && r.status === 'ok') {
      if (r.hasBookmarks) {
        currentBookmarks = r.bookmarks || [];
        if (scanSummary) scanSummary.style.display = 'block';
        if (statusFiltersContainer) statusFiltersContainer.style.display = 'block';
        if (bulkActions) bulkActions.style.display = 'flex';
        if (reviewCleanupActions) reviewCleanupActions.style.display = 'block';
        updateSummaryCounts(currentBookmarks);
        renderList(currentBookmarks);
        addLog('Restored bookmarks from previous session.', 'system');
      }
      if (r.hasQueue) {
        addLog('⏸ A paused queue was detected from a previous session. Click Resume to continue.', 'info');
        queueProgressCard.style.display = 'block';
        resumeQueueBtn.disabled = false;
        // Fetch queue status
        const qs = await chrome.runtime.sendMessage({ action: 'GET_QUEUE_STATUS' });
        if (qs.status === 'success') updateQueueUI(qs.progress);
      }
    }
  } catch (e) { /* SW not ready yet */ }
})();

// Initial greeting
const manifest_data = chrome.runtime.getManifest();
addLog(`Side panel loaded (v${manifest_data.version}).`, 'system');
