import { buildMarkdownNote, generateAttachmentPath } from '../lib/note-builder.js';
import { noteExists, createNote, updateNote, uploadFile } from '../lib/obsidian-api.js';

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
const filterFolder = document.getElementById('filter-folder');
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
const queuePercentEl = document.getElementById('queue-percent');

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
const reviewStatusStrip = document.getElementById('review-status-strip');
const reviewStatusTotal = document.getElementById('review-status-total');
const reviewCheckedBar = document.getElementById('review-checked-bar');
const reviewCheckedLabel = document.getElementById('review-checked-label');
const reviewStatusBadges = document.getElementById('review-status-badges');
const reviewRecommendation = document.getElementById('review-recommendation');
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

// Select All & Delete Selected Elements
const selectAllRow = document.getElementById('select-all-row');
const checkboxSelectAll = document.getElementById('checkbox-select-all');
const selectAllCount = document.getElementById('select-all-count');
const btnDeleteSelected = document.getElementById('btn-delete-selected');
let manualDeleteAction = null; // tracks whether delete flow uses policy or manual

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

const scraperMethod = document.getElementById('scraper-method');
const toggleSiteContext = document.getElementById('toggle-site-context');
const firecrawlApiKey = document.getElementById('firecrawl-api-key');
const firecrawlConfig = document.getElementById('firecrawl-config');
const toggleAutoSwitch = document.getElementById('toggle-auto-switch');
const autoSwitchConfig = document.getElementById('auto-switch-config');
const autoSwitchThreshold = document.getElementById('auto-switch-threshold');

const diagResultsContainer = document.getElementById('diagnostic-results');
const diagList = document.getElementById('diagnostic-list');
const diagSummary = document.getElementById('diagnostic-summary');

// Vault Intelligence
const toggleVaultAware = document.getElementById('toggle-vault-aware');
const scaffoldPreset = document.getElementById('scaffold-preset');
const btnScaffoldVault = document.getElementById('btn-scaffold-vault');

// We'll import exporter functions dynamically for the browser context
import { generateJsonBlob, generateCsvBlob } from '../lib/exporter.js';

let currentBookmarks = []; // Keep a local reference for exports
let selectedIds = new Set(); // Track selected bookmark IDs across renders

// Display version
if (appVersionEl) appVersionEl.textContent = chrome.runtime.getManifest().version;
if (helpAppVersionEl) helpAppVersionEl.textContent = chrome.runtime.getManifest().version;

// Compact Footer Toggle
const footer = document.getElementById('app-footer');
if (footer) {
  footer.addEventListener('click', () => {
    footer.classList.toggle('expanded');
  });
}

// Load Obsidian Settings
chrome.storage.local.get(['obsidianSettings', 'uiPrefs'], (result) => {
  if (result.obsidianSettings) {
    if (obsUrlInput) obsUrlInput.value = result.obsidianSettings.baseUrl || 'https://127.0.0.1:27124';
    if (obsKeyInput) obsKeyInput.value = result.obsidianSettings.apiKey || '';
    if (obsFolderInput) obsFolderInput.value = result.obsidianSettings.destinationFolder || '03 Resources/Web Clips/Bookmarks/';
    if (obsTemplateInput) obsTemplateInput.value = result.obsidianSettings.filenameTemplate || '{title}.md';
    if (toggleVaultAware) toggleVaultAware.checked = !!result.obsidianSettings.enableVaultAwareLinking;
  }
  
  if (result.scraperSettings) {
    if (scraperMethod) {
      scraperMethod.value = result.scraperSettings.method || 'standard';
      updateScraperPanelVisibility(scraperMethod.value);
    }
    if (toggleSiteContext) toggleSiteContext.checked = !!result.scraperSettings.extractSiteContext;
    if (firecrawlApiKey) firecrawlApiKey.value = result.scraperSettings.firecrawlApiKey || '';
    if (toggleAutoSwitch) {
      toggleAutoSwitch.checked = !!result.scraperSettings.autoSwitch;
      if (autoSwitchConfig) autoSwitchConfig.style.display = toggleAutoSwitch.checked ? 'block' : 'none';
    }
    if (autoSwitchThreshold) autoSwitchThreshold.value = result.scraperSettings.autoSwitchThreshold || 200;
  }
  
  if (result.uiPrefs) {
    refreshUIByPrefs(result.uiPrefs);
  }
});

function saveObsidianSettings() {
  let folder = obsFolderInput ? obsFolderInput.value.trim() : 'Bookmarks';
  // Normalize Windows-style backslashes to forward slashes
  folder = folder.replace(/\\/g, '/');
  // Ensure it ends with a slash if not empty
  if (folder && !folder.endsWith('/')) folder += '/';

  const settings = {
    baseUrl: obsUrlInput ? obsUrlInput.value.trim() : 'https://127.0.0.1:27124',
    apiKey: obsKeyInput ? obsKeyInput.value.trim() : '',
    destinationFolder: folder,
    filenameTemplate: obsTemplateInput ? obsTemplateInput.value.trim() : '{title}.md',
    enableVaultAwareLinking: toggleVaultAware ? toggleVaultAware.checked : false
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
  saveScraperSettings();
  addLog('Settings saved.', 'success');
});

async function saveScraperSettings() {
  const settings = {
    method: scraperMethod ? scraperMethod.value : 'standard',
    extractSiteContext: toggleSiteContext ? toggleSiteContext.checked : false,
    firecrawlApiKey: firecrawlApiKey ? firecrawlApiKey.value.trim() : '',
    autoSwitch: toggleAutoSwitch ? toggleAutoSwitch.checked : false,
    autoSwitchThreshold: autoSwitchThreshold ? parseInt(autoSwitchThreshold.value, 10) : 200
  };
  await chrome.storage.local.set({ scraperSettings: settings });
  // Notify background
  chrome.runtime.sendMessage({ action: 'UPDATE_SETTINGS', scraperSettings: settings });
}

function updateScraperPanelVisibility(method) {
  if (firecrawlConfig) {
    firecrawlConfig.style.display = method === 'firecrawl' ? 'block' : 'none';
  }
}

if (scraperMethod) scraperMethod.addEventListener('change', (e) => {
  updateScraperPanelVisibility(e.target.value);
  saveScraperSettings();
});

if (toggleSiteContext) toggleSiteContext.addEventListener('change', saveScraperSettings);
if (firecrawlApiKey) firecrawlApiKey.addEventListener('input', saveScraperSettings);
if (toggleAutoSwitch) toggleAutoSwitch.addEventListener('change', (e) => {
  if (autoSwitchConfig) autoSwitchConfig.style.display = e.target.checked ? 'block' : 'none';
  saveScraperSettings();
});
if (autoSwitchThreshold) autoSwitchThreshold.addEventListener('input', saveScraperSettings);

if (toggleVaultAware) toggleVaultAware.addEventListener('change', () => {
  saveObsidianSettings();
  addLog(`Vault-Aware Linking ${toggleVaultAware.checked ? 'enabled' : 'disabled'}.`, 'system');
});

if (btnScaffoldVault) {
  btnScaffoldVault.addEventListener('click', async () => {
    const preset = scaffoldPreset.value;
    btnScaffoldVault.disabled = true;
    btnScaffoldVault.textContent = 'Building...';
    addLog(`Scaffolding vault with ${preset} structure...`, 'system');
    
    try {
      const response = await chrome.runtime.sendMessage({ action: 'SCAFFOLD_VAULT', preset });
      if (response && response.status === 'success') {
        const folders = response.results.map(r => r.path).join(', ');
        addLog(`Vault scaffolded successfully: ${folders}`, 'success');
      } else if (response) {
        addLog(`Scaffolding failed: ${response.message}`, 'error');
      }
    } catch (e) {
      addLog(`Scaffolding error: ${e.message}`, 'error');
    } finally {
      btnScaffoldVault.disabled = false;
      btnScaffoldVault.textContent = 'Build Structure';
    }
  });
}

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
        
        // Auto-activate Review tab UI with existing data
        if (currentBookmarks.length > 0) {
          if (statusFiltersContainer) statusFiltersContainer.style.display = 'block';
          if (bulkActions) bulkActions.style.display = 'flex';
          if (reviewCleanupActions) reviewCleanupActions.style.display = 'block';
          renderList(currentBookmarks);
          if (!isManual) addLog(`Restored ${currentBookmarks.length} bookmarks from previous session.`, 'info');
        }
      }

      // Proactively handle busy state
      if (response.isBusy || response.isScanning) {
        setGlobalBusy(true, response.isScanning ? 'Scanning...' : 'Background Busy...');
      } else {
        setGlobalBusy(false);
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
  setGlobalBusy(true, 'Scanning...');
  addLog(`Starting ${rootId ? 'folder' : 'full'} bookmark scan...`, 'system');
  
  try {
    const response = await chrome.runtime.sendMessage({ 
      action: 'SCAN_BOOKMARKS',
      rootId: rootId
    });
    if (response.status === 'success') {
      const checkedMsg = response.alreadyChecked > 0 
        ? ` (${response.alreadyChecked} previously checked — results preserved)` 
        : '';
      addLog(`Scan complete: found ${response.total} bookmarks.${checkedMsg}`, 'success');
      
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
      selectedIds.clear(); // Reset on new scan
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
      if (viewDeleteCandidatesBtn) viewDeleteCandidatesBtn.disabled = false;
      
      // Populate folder filter
      populateFolderFilter(currentBookmarks);
      
      // Bulk extract/capture are handled by updateBulkActionButtons based on selection
    } else {
      addLog(`Scan failed: ${response.message}`, 'error');
    }
  } catch (error) {
    addLog(`Scan error: ${error.message}`, 'error');
  } finally {
    setGlobalBusy(false);
  }
});

function renderList(bookmarks) {
  bookmarkListContainer.style.display = 'block';
  bookmarkListContainer.innerHTML = '';
  
  const selectedFilter = filterStatus.value;
  const selectedFolder = filterFolder.value;
  const searchTerm = inputSearch.value.toLowerCase();
  
  let filtered = bookmarks.filter(b => {
    // Status Filter
    let statusMatch = true;
    if (selectedFilter === 'delete-candidate') {
      const days = b.firstChecked ? (Date.now() - new Date(b.firstChecked).getTime()) / (24*60*60*1000) : 0;
      statusMatch = (b.status === 'hard-broken' && (b.attempts || 0) >= 3 && days >= 21);
    } else if (selectedFilter === 'file') {
      statusMatch = (b.extractionStatus === 'file' || b.isFile === true);
    } else if (selectedFilter === 'extracted') {
      statusMatch = (b.extractionStatus === 'success');
    } else if (selectedFilter === 'captured') {
      statusMatch = !!(b.captureStatus && (b.captureStatus === 'created' || b.captureStatus === 'updated'));
    } else if (selectedFilter === 'junk') {
      statusMatch = (b.extractionStatus === 'junk');
    } else if (selectedFilter === 'uncaptured') {
      statusMatch = (b.extractionStatus === 'success' && !b.captureStatus);
    } else if (selectedFilter !== 'all') {
      statusMatch = (b.status === selectedFilter);
    }

    // Search Filter
    const searchMatch = !searchTerm || 
                        b.title.toLowerCase().includes(searchTerm) || 
                        b.url.toLowerCase().includes(searchTerm);

    // Folder Filter
    const folderMatch = (selectedFolder === 'all' || b.folderPath === selectedFolder);

    return statusMatch && searchMatch && folderMatch;
  });
  
  // Update result count info
  if (searchResultsInfo) {
    if (searchTerm || selectedFilter !== 'all' || selectedFolder !== 'all') {
      searchResultsInfo.textContent = `Showing ${Math.min(filtered.length, 100)} of ${filtered.length} matches`;
      searchResultsInfo.style.display = 'block';
    } else {
      searchResultsInfo.style.display = 'none';
    }
  }

  // Update Select All row
  if (selectAllRow) {
    if (filtered.length > 0) {
      selectAllRow.style.display = 'block';
      if (selectAllCount) selectAllCount.textContent = Math.min(filtered.length, 100);
      if (checkboxSelectAll) checkboxSelectAll.checked = false;
    } else {
      selectAllRow.style.display = 'none';
    }
  }
  
  // Handle "Duplicate" auto-selection
  if (selectedFilter === 'duplicate') {
    bookmarks.forEach(b => {
      if (b.status === 'duplicate') selectedIds.add(b.id);
    });
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
      if (b.error) detailsHtml += `<div><strong>Link Reason:</strong> ${b.error} (retries: ${b.attempts ? b.attempts - 1 : 0})</div>`;
      if (b.captureError) detailsHtml += `<div style="color: #c92a2a;"><strong>Capture Error:</strong> ${b.captureError}</div>`;
      if (b.extractedData) {
        // Compute word count from plainText, fallback to markdown if missing
        const textToCount = b.extractedData.plainText || b.extractedData.markdown || "";
        const wordCount = textToCount.trim() ? textToCount.split(/\s+/).length : 0;
        const eStatus = b.extractionStatus || 'success';
        const color = eStatus === 'success' ? '#0a7a3b' : (eStatus === 'partial' ? '#b07f00' : '#c92a2a');
        detailsHtml += `<div style="color: ${color}; font-weight: bold; margin-top: 2px;">Extracted: ${eStatus} (${wordCount} words)</div>`;
      }
      detailsHtml += `</div>`;
    }

    const canExtract = b.status === 'healthy' || b.status === 'redirected';
    const hasExtraction = !!b.extractedData;
    const captureColor = { created: '#0a7a3b', updated: '#1a73e8', skipped: '#888', failed: '#c92a2a' };

    const isSelected = selectedIds.has(b.id) || (selectedFilter === 'duplicate' && b.status === 'duplicate');

    div.innerHTML = `
      <div style="display:flex; align-items:flex-start;">
        <input type="checkbox" class="bookmark-select" data-id="${b.id}" style="margin-right:8px;" ${isSelected ? 'checked' : ''}>
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
            ${(canExtract && !b.isFile) ? `
              <button class="btn-row-retry-jina" data-id="${b.id}" title="Retry with Jina Reader" style="font-size: 10px; padding: 2px 6px; background-color: #fff9db; border: 1px solid #f08c00; border-radius: 4px; color: #f08c00;">Jina</button>
              <button class="btn-row-retry-firecrawl" data-id="${b.id}" title="Retry with Firecrawl" style="font-size: 10px; padding: 2px 6px; background-color: #fff0f6; border: 1px solid #d6336c; border-radius: 4px; color: #d6336c;">Firecrawl</button>
            ` : ''}
            <button class="btn-row-capture" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #e6fcf5; border: 1px solid #0a7a3b; border-radius: 4px; color: #0a7a3b;" ${(hasExtraction || b.isFile) ? '' : 'disabled'}>Capture</button>
            ${b.isFile ? `
              <button class="btn-row-push-file" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #fff9db; border: 1px solid #f08c00; border-radius: 4px; color: #f08c00;">Push Binary to Obsidian</button>
              <button class="btn-row-download" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;">Download</button>
            ` : ''}
            ${hasExtraction ? `<button class="btn-row-preview" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #f0f0f0; border: 1px solid #ccc; border-radius: 4px;">View Preview</button>` : ''}
            <button class="btn-row-note-preview" data-id="${b.id}" style="font-size: 10px; padding: 2px 6px; background-color: #e8f0fe; border: 1px solid #1a73e8; border-radius: 4px; color: #1a73e8;">Preview Note</button>
          </div>
        </div>
      </div>
    `;
    bookmarkListContainer.appendChild(div);
  });

  // Attach Checkbox Listeners for Bulk Actions
  document.querySelectorAll('.bookmark-select').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      if (e.target.checked) selectedIds.add(id);
      else selectedIds.delete(id);
      updateBulkActionButtons();
    });
  });
  
  if (filtered.length > 100) {
    const msg = document.createElement('div');
    msg.style.padding = '10px';
    msg.style.textAlign = 'center';
    msg.style.fontStyle = 'italic';
    msg.textContent = `...and ${filtered.length - 100} more not shown to preserve UI performance.`;
    bookmarkListContainer.appendChild(msg);
  }

  // Finalize interactive elements
  attachRowListeners();
}

function populateFolderFilter(bookmarks) {
  if (!filterFolder) return;
  
  const currentVal = filterFolder.value;
  const folders = [...new Set(bookmarks.map(b => b.folderPath))].sort();
  
  filterFolder.innerHTML = '<option value="all">All Folders</option>';
  folders.forEach(folder => {
    const option = document.createElement('option');
    option.value = folder;
    option.textContent = folder;
    filterFolder.appendChild(option);
  });
  
  // Restore value if it still exists
  if (folders.includes(currentVal)) {
    filterFolder.value = currentVal;
  }
}

async function pushFileToObsidian(id, btn) {
  const bookmark = currentBookmarks.find(b => b.id === id);
  if (!bookmark) return;

  btn.disabled = true;
  btn.textContent = 'Pushing...';
  
  try {
    const settings = saveObsidianSettings();
    const url = bookmark.finalUrl || bookmark.url;
    let filename = url.split('/').pop().split('?')[0] || 'file.dat';
    // Ensure filename isn't too long or weird
    if (filename.length > 100) filename = filename.substring(0, 95) + '...';
    
    const path = `${settings.destinationFolder}${filename}`;

    addLog(`Downloading binary: ${filename}...`, 'system');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();

    addLog(`Pushing ${filename} to Obsidian...`, 'system');
    await uploadFile(settings.baseUrl, settings.apiKey, path, blob);
    addLog(`Successfully pushed ${filename} to Obsidian.`, 'success');

    bookmark.captureStatus = 'created';
    bookmark.capturedAt = new Date().toISOString();
    bookmark.capturedNotePath = path;

    await chrome.runtime.sendMessage({ action: 'SAVE_BOOKMARKS', bookmarks: currentBookmarks });
    renderList(currentBookmarks);
  } catch (err) {
    addLog(`Push failed: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Push Binary to Obsidian';
  }
}

async function retryExtractionWithOverride(id, engine, btn) {
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '...';
  
  try {
    addLog(`Manual retry for bookmark using ${engine}...`, 'info');
    // Get latest settings but override method
    const result = await chrome.storage.local.get('scraperSettings');
    const settings = result.scraperSettings || {};
    const overrideSettings = { ...settings, method: engine, autoSwitch: false };
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'EXTRACT_SINGLE', 
      id: id,
      scraperSettings: overrideSettings
    });
    
    if (response && response.status === 'success') {
      addLog(`Manual retry with ${engine} successful!`, 'success');
      // Update local state
      const bIdx = currentBookmarks.findIndex(bk => bk.id === id);
      if (bIdx !== -1) {
        currentBookmarks[bIdx] = response.bookmark;
        renderList(currentBookmarks);
      }
    } else {
      addLog(`Manual retry failed: ${response?.message}`, 'error');
    }
  } catch (err) {
    addLog(`Manual retry error: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function attachRowListeners() {
  // Attach Download Listeners (Local)
  document.querySelectorAll('.btn-row-download').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const b = currentBookmarks.find(bk => bk.id === id);
      if (b) {
        addLog(`Opening download for: ${b.title}`, 'system');
        window.open(b.finalUrl || b.url, '_blank');
      }
    });
  });

  // Attach Push File Listeners
  document.querySelectorAll('.btn-row-push-file').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      pushFileToObsidian(id, e.target);
    });
  });

  // Attach Recheck Listeners
  document.querySelectorAll('.btn-row-recheck').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      e.target.disabled = true;
      e.target.textContent = '...';
      try {
        const response = await chrome.runtime.sendMessage({ action: 'CHECK_SINGLE_LINK', id });
        if (response && response.status === 'success') {
          currentBookmarks = response.allBookmarks;
          renderList(currentBookmarks);
        } else if (response) {
          addLog(`Recheck failed: ${response.message}`, 'error');
          e.target.disabled = false;
          e.target.textContent = 'Recheck';
        }
      } catch (err) {
        addLog(`Recheck error: ${err.message}`, 'error');
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
      try {
        const response = await chrome.runtime.sendMessage({ action: 'EXTRACT_BATCH', ids: [id] });
        if (response && response.status === 'success') {
          currentBookmarks = response.allBookmarks;
          addLog(`Successfully extracted content for bookmark ${id}.`, 'success');
          renderList(currentBookmarks);
        } else if (response) {
          addLog(`Extraction failed: ${response.message}`, 'error');
          e.target.disabled = false;
          e.target.textContent = 'Extract Content';
        }
      } catch (err) {
        addLog(`Extraction error: ${err.message}`, 'error');
        e.target.disabled = false;
        e.target.textContent = 'Extract Content';
      }
    });
  });

  // Attach Retry Listeners
  document.querySelectorAll('.btn-row-retry-jina').forEach(btn => {
    btn.addEventListener('click', (e) => {
      retryExtractionWithOverride(e.target.getAttribute('data-id'), 'jina', e.target);
    });
  });

  document.querySelectorAll('.btn-row-retry-firecrawl').forEach(btn => {
    btn.addEventListener('click', (e) => {
      retryExtractionWithOverride(e.target.getAttribute('data-id'), 'firecrawl', e.target);
    });
  });

  // Attach Capture Listeners
  document.querySelectorAll('.btn-row-capture').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const bookmark = currentBookmarks.find(b => b.id === id);
      if (!bookmark) return;
      
      e.target.disabled = true;
      e.target.textContent = 'Capturing...';
      addLog(`Capturing ${bookmark.title} to Obsidian (UI context)...`, 'system');
      
      try {
        const settings = saveObsidianSettings();
        
        let relatedNotes = [];
        if (settings.enableVaultAwareLinking) {
          const query = (bookmark.title || '').split(' ').filter(w => w.length > 3).slice(0, 3).join(' ');
          if (query) {
            try {
              relatedNotes = await searchNotes(settings.baseUrl, settings.apiKey, query);
              relatedNotes = (relatedNotes || []).slice(0, 3);
            } catch (e) {
              console.warn('[SidePanel] Related notes search failed:', e);
            }
          }
        }

        const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings, relatedNotes);
        
        // Handle binary upload if it's a file
        if (bookmark.isFile) {
          const attachmentPath = generateAttachmentPath(bookmark, settings);
          const response = await fetch(bookmark.finalUrl || bookmark.url);
          if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
          const blob = await response.blob();
          await uploadFile(settings.baseUrl, settings.apiKey, attachmentPath, blob);
        }

        let action;
        const exists = await noteExists(settings.baseUrl, settings.apiKey, notePath);
        if (exists) {
          await updateNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
          action = 'updated';
        } else {
          await createNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
          action = 'created';
        }

        // Update local state
        bookmark.captureStatus = action;
        bookmark.capturedAt = capturedAt;
        bookmark.capturedNotePath = notePath;
        bookmark.capturedContentHash = contentHash;
        bookmark.captureError = null;

        addLog(`Successfully ${action} note for: ${bookmark.title}`, 'success');
        
        // Push state update to background storage
        await chrome.runtime.sendMessage({ action: 'SAVE_BOOKMARKS', bookmarks: currentBookmarks });
        
        renderList(currentBookmarks);
      } catch (err) {
        addLog(`Capture failed: ${err.message}`, 'error');
        e.target.disabled = false;
        e.target.textContent = 'Capture';
        
        // Log to background too for debugging
        console.error('[SidePanel] Capture error:', err);
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
      
      try {
        const response = await chrome.runtime.sendMessage({ action: 'PREVIEW_NOTE', id });
        if (response && response.status === 'success') {
          notePreviewCurrentId = id;
          notePreviewHeading.textContent = 'Note Preview';
          notePreviewPath.textContent = `📁 Path: ${response.notePath}`;
          notePreviewAction.textContent = response.willUpdate ? '⚡ Action: UPDATE existing note' : '✨ Action: CREATE new note';
          notePreviewAction.style.color = response.willUpdate ? '#1a73e8' : '#0a7a3b';
          notePreviewBody.textContent = response.noteContent;
          notePreviewModal.showModal();
        } else if (response) {
          addLog(`Note preview failed: ${response.message}`, 'error');
        }
      } catch (err) {
        addLog(`Note preview error: ${err.message}`, 'error');
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
    
    const bookmark = currentBookmarks.find(b => b.id === notePreviewCurrentId);
    if (!bookmark) return;

    btnCaptureFromPreview.disabled = true;
    btnCaptureFromPreview.textContent = 'Writing...';
    addLog(`Capturing ${bookmark.title} from preview...`, 'system');
    
    try {
      const settings = saveObsidianSettings();
      
      let relatedNotes = [];
      if (settings.enableVaultAwareLinking) {
        const query = (bookmark.title || '').split(' ').filter(w => w.length > 3).slice(0, 3).join(' ');
        if (query) {
          try {
            relatedNotes = await searchNotes(settings.baseUrl, settings.apiKey, query);
            relatedNotes = (relatedNotes || []).slice(0, 3);
          } catch (e) {
            console.warn('[SidePanel] Related notes search failed:', e);
          }
        }
      }

      const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings, relatedNotes);
      
      // Handle binary upload if it's a file
      if (bookmark.isFile) {
        const attachmentPath = generateAttachmentPath(bookmark, settings);
        const response = await fetch(bookmark.finalUrl || bookmark.url);
        if (!response.ok) throw new Error(`Failed to download asset: ${response.statusText}`);
        const blob = await response.blob();
        await uploadFile(settings.baseUrl, settings.apiKey, attachmentPath, blob);
      }

      let action;
      const exists = await noteExists(settings.baseUrl, settings.apiKey, notePath);
      if (exists) {
        await updateNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
        action = 'updated';
      } else {
        await createNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
        action = 'created';
      }

      // Update local state
      bookmark.captureStatus = action;
      bookmark.capturedAt = capturedAt;
      bookmark.capturedNotePath = notePath;
      bookmark.capturedContentHash = contentHash;
      bookmark.captureError = null;

      addLog(`Successfully ${action} note from preview: ${bookmark.title}`, 'success');
      
      // Push state update to background storage
      await chrome.runtime.sendMessage({ action: 'SAVE_BOOKMARKS', bookmarks: currentBookmarks });
      
      renderList(currentBookmarks);
      notePreviewModal.close();
    } catch (err) {
      addLog(`Capture failed: ${err.message}`, 'error');
      btnCaptureFromPreview.disabled = false;
      btnCaptureFromPreview.textContent = 'Write to Obsidian';
    }
  });
}

// Bulk Extract logic
if (extractSelectedBtn) {
  extractSelectedBtn.addEventListener('click', async () => {
  const selected = document.querySelectorAll('.bookmark-select:checked');
  const ids = Array.from(selected).map(cb => cb.getAttribute('data-id'));
  if (ids.length === 0) return;
  
  setGlobalBusy(true, 'Extracting...');
  addLog(`Sending ${ids.length} bookmarks for batch extraction...`, 'info');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'EXTRACT_BATCH', ids });
    if (response && response.status === 'success') {
      currentBookmarks = response.allBookmarks;
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
      addLog('Batch extraction completed.', 'success');
    } else if (response) {
      addLog(`Batch extraction error: ${response.message}`, 'error');
    }
  } catch (err) {
    addLog(`Batch extraction error: ${err.message}`, 'error');
  } finally {
    setGlobalBusy(false);
  }
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
  
  setGlobalBusy(true, 'Capturing...');
  addLog(`Capturing ${ids.length} bookmarks to Obsidian...`, 'info');
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CAPTURE_BATCH', ids });
    if (response && response.status === 'success') {
      currentBookmarks = response.allBookmarks;
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
      
      if (response.results && response.results.length > 0) {
        const created = response.results.filter(r => r.action === 'created');
        const updated = response.results.filter(r => r.action === 'updated');
        const skipped = response.results.filter(r => r.action === 'skipped');
        const failed = response.results.filter(r => r.action === 'failed');
        
        addLog(`Capture complete: ${created.length} created, ${updated.length} updated, ${skipped.length} skipped, ${failed.length} failed.`, 'success');
        
        // Show the first couple of paths to help the user find them
        const successful = [...created, ...updated];
        if (successful.length > 0) {
          const samplePaths = successful.slice(0, 3).map(r => `• ${r.notePath}`).join('<br>');
          addLog(`Sample locations:<br>${samplePaths}${successful.length > 3 ? '<br>• ...and more' : ''}`, 'info');
        }
      } else {
        addLog('Capture complete. No notes were processed.', 'info');
      }
    } else if (response) {
      addLog(`Capture error: ${response.message}`, 'error');
    }
  } catch (err) {
    addLog(`Capture error: ${err.message}`, 'error');
  } finally {
    setGlobalBusy(false);
  }
});
}

// Select All checkbox logic
if (checkboxSelectAll) {
  checkboxSelectAll.addEventListener('change', () => {
    const isChecked = checkboxSelectAll.checked;
    const checkboxes = document.querySelectorAll('.bookmark-select');
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const id = cb.getAttribute('data-id');
      if (isChecked) selectedIds.add(id);
      else selectedIds.delete(id);
    });
    updateBulkActionButtons();
  });
}

function updateBulkActionButtons() {
  const selectedBookmarks = Array.from(selectedIds).map(id => currentBookmarks.find(b => b.id === id)).filter(Boolean);

  const canExtractCount = selectedBookmarks.filter(b => (b.status === 'healthy' || b.status === 'redirected') && !b.isFile).length;
  const canCaptureCount = selectedBookmarks.filter(b => !!b.extractedData || b.isFile).length; // Only if extracted or is a file

  const canCheckCount = selectedBookmarks.length; // Can re-check anything selected
  const canDeleteCount = selectedBookmarks.length;

  if (extractSelectedBtn) {
    extractSelectedBtn.disabled = canExtractCount === 0;
    extractSelectedBtn.innerHTML = `Extract Selected ${canExtractCount > 0 ? `(${canExtractCount})` : ''}`;
  }
  if (captureSelectedBtn) {
    captureSelectedBtn.disabled = canCaptureCount === 0;
    captureSelectedBtn.innerHTML = `Capture to Obsidian ${canCaptureCount > 0 ? `(${canCaptureCount})` : ''}`;
  }
  if (btnDeleteSelected) {
    btnDeleteSelected.disabled = canDeleteCount === 0;
    btnDeleteSelected.innerHTML = `Delete Selected ${canDeleteCount > 0 ? `(${canDeleteCount})` : ''}`;
  }
  if (moveDupesBtn) {
    moveDupesBtn.disabled = canDeleteCount === 0;
    moveDupesBtn.innerHTML = `2. Move Selected to Staging ${canDeleteCount > 0 ? `(${canDeleteCount})` : ''}`;
  }
}

// Delete Selected button logic
if (btnDeleteSelected) {
  btnDeleteSelected.addEventListener('click', () => {
    const checked = document.querySelectorAll('.bookmark-select:checked');
    if (checked.length === 0) {
      addLog('No bookmarks selected. Use checkboxes to select items first.', 'info');
      return;
    }

    const selectedIds = Array.from(checked).map(cb => cb.getAttribute('data-id'));
    const selectedBookmarks = selectedIds.map(id => currentBookmarks.find(b => b.id === id)).filter(Boolean);

    // Populate the confirmation modal
    pendingDeleteIds = selectedIds;
    manualDeleteAction = 'DELETE_BOOKMARKS_MANUAL';
    if (deleteConfirmCount) deleteConfirmCount.textContent = `${selectedBookmarks.length} bookmark(s) selected for deletion:`;
    if (deleteConfirmList) {
      deleteConfirmList.innerHTML = selectedBookmarks.map(c =>
        `<div style="margin-bottom: 4px;"><strong>${c.title}</strong><br><span style="color: #666; word-break: break-all;">${c.url}</span> <span class="badge badge-${c.status}">${c.status}</span></div>`
      ).join('');
    }
    if (deleteConfirmModal) deleteConfirmModal.showModal();
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

  // Update Review tab status strip
  const total = bookmarks.length;
  const checked = total - (counts.pending || 0);
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  if (reviewStatusStrip) reviewStatusStrip.style.display = total > 0 ? 'block' : 'none';
  if (reviewStatusTotal) reviewStatusTotal.textContent = `${total} bookmarks`;
  if (reviewCheckedBar) reviewCheckedBar.style.width = `${pct}%`;
  if (reviewCheckedLabel) reviewCheckedLabel.textContent = `${pct}% checked (${checked} of ${total})`;
  if (reviewStatusBadges) {
    const badgeData = [
      { key: 'healthy', label: '✅ Healthy', count: counts.healthy },
      { key: 'redirected', label: '↗️ Redirected', count: counts.redirected },
      { key: 'soft-broken', label: '⚠️ Soft-Broken', count: counts['soft-broken'] },
      { key: 'hard-broken', label: '❌ Hard-Broken', count: counts['hard-broken'] },
      { key: 'duplicate', label: '📋 Duplicates', count: counts.duplicate },
      { key: 'pending', label: '⏳ Pending', count: counts.pending || 0 }
    ];
    reviewStatusBadges.innerHTML = badgeData
      .filter(d => d.count > 0)
      .map(d => `<span class="badge badge-${d.key}">${d.label}: ${d.count}</span>`)
      .join('');
  }

  if (reviewRecommendation) {
    let rec = '';
    if (counts.pending > 0) {
      rec = '💡 <strong>Next Step:</strong> Click <strong>"Check Links"</strong> to verify which bookmarks are still active.';
    } else if (counts.healthy > 0 || counts.redirected > 0) {
      const healthyTotal = counts.healthy + counts.redirected;
      const extracted = bookmarks.filter(b => (b.status === 'healthy' || b.status === 'redirected') && b.extractedData).length;
      if (extracted < healthyTotal) {
        rec = `💡 <strong>Next Step:</strong> Select healthy links and click <strong>"Extract Content"</strong> to prepare notes.`;
      } else {
        rec = `💡 <strong>Next Step:</strong> Select items and click <strong>"Capture to Obsidian"</strong> to sync with your vault.`;
      }
    } else if (counts['hard-broken'] > 0 || counts.duplicate > 0) {
      rec = `💡 <strong>Next Step:</strong> Review broken links or duplicates and use <strong>"Delete Selected"</strong> to clean up.`;
    } else {
      rec = `✨ All caught up! Your bookmarks are clean and synced.`;
    }
    reviewRecommendation.innerHTML = rec;
  }
  
  // Update buttons based on current state
  updateBulkActionButtons();
}

// Filter status dropdown triggers a re-render
if (filterStatus) filterStatus.addEventListener('change', () => renderList(currentBookmarks));
if (filterFolder) filterFolder.addEventListener('change', () => renderList(currentBookmarks));
if (inputSearch) inputSearch.addEventListener('input', () => renderList(currentBookmarks));

if (btnGoToScan) btnGoToScan.addEventListener('click', () => {
  switchTab('scan');
});

// Deduplication Logic
if (dedupeBtn) dedupeBtn.addEventListener('click', async () => {
  try {
    addLog('Finding duplicates...', 'system');
    const response = await chrome.runtime.sendMessage({ action: 'DEDUPE_BOOKMARKS' });
    if (response && response.status === 'success') {
      addLog(`Found ${response.duplicateCount} duplicates.`, 'success');
      currentBookmarks = response.bookmarks;
      renderList(currentBookmarks);
      if (response.duplicateCount > 0 && moveDupesBtn) {
        moveDupesBtn.disabled = false;
      }
    } else if (response) {
      addLog(`Dedupe failed: ${response.message}`, 'error');
    }
  } catch (e) {
    addLog(`Dedupe error: ${e.message}`, 'error');
  }
});

// Setup Folders Logic
if (setupFoldersBtn) setupFoldersBtn.addEventListener('click', async () => {
  try {
    addLog('Setting up review folders...', 'system');
    const response = await chrome.runtime.sendMessage({ action: 'SETUP_FOLDERS' });
    if (response && response.status === 'success') {
      addLog('Review folders created/verified successfully.', 'success');
    } else if (response) {
      addLog(`Setup failed: ${response.message}`, 'error');
    }
  } catch (e) {
    addLog(`Setup error: ${e.message}`, 'error');
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
  
  try {
    addLog(`Moving ${idsToMove.length} items to _Review Duplicates...`, 'system');
    const response = await chrome.runtime.sendMessage({ 
      action: 'MOVE_BOOKMARKS', 
      bookmarkIds: idsToMove, 
      folderName: '_Review Duplicates' 
    });
    
    if (response && response.status === 'success') {
      addLog(`Successfully moved ${response.count} items.`, 'success');
      currentBookmarks = currentBookmarks.filter(b => !idsToMove.includes(b.id));
      renderList(currentBookmarks);
    } else if (response) {
      addLog(`Move failed: ${response.message}`, 'error');
    }
  } catch (e) {
    addLog(`Move error: ${e.message}`, 'error');
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
  
  try {
    addLog(`Starting link check (limit: ${limit || 'All'})...`, 'system');
    setGlobalBusy(true, 'Checking...');
    startQueuePolling();
    
    const response = await chrome.runtime.sendMessage({ 
      action: 'CHECK_LINKS',
      limit: limit
    });
    
    stopQueuePolling();
    setGlobalBusy(false);

    if (response && response.status === 'success') {
      addLog('Finished checking links.', 'success');
      currentBookmarks = response.bookmarks;
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
    } else if (response) {
      addLog(`Link check failed: ${response.message}`, 'error');
    }
  } catch (e) {
    stopQueuePolling();
    setGlobalBusy(false);
    addLog(`Link check error: ${e.message}`, 'error');
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
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'RECHECK_BROKEN' });
    if (response && response.status === 'success') {
      addLog('Finished rechecking broken links.', 'success');
      currentBookmarks = response.bookmarks;
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
    } else if (response) {
      addLog(`Recheck failed: ${response.message}`, 'error');
    }
  } catch (e) {
    addLog(`Recheck error: ${e.message}`, 'error');
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
    try {
      const data = await response.json();
      const vaultName = data.vault;
      if (vaultName) {
        addResult('Authentication', 'pass', `Connected to vault: "<strong>${vaultName}</strong>"`);
      } else if (data.service) {
        const versionStr = data.version ? ` (v${data.version})` : '';
        addResult('Authentication', 'pass', `Connected to <strong>${data.service}</strong>${versionStr}`);
      } else {
        addResult('Authentication', 'pass', 'Authenticated successfully.');
      }
    } catch (e) {
      addResult('Authentication', 'pass', 'API Key accepted successfully.');
    }
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
    
    obsSampleBtn.disabled = true;
    obsSampleBtn.textContent = 'Creating...';
    addLog(`Creating sample note for: ${bookmark.title}...`, 'system');
    
    try {
      const settings = saveObsidianSettings();
      const { noteContent, notePath, contentHash, capturedAt } = await buildMarkdownNote(bookmark, settings);
      
      let action;
      const exists = await noteExists(settings.baseUrl, settings.apiKey, notePath);
      if (exists) {
        await updateNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
        action = 'updated';
      } else {
        await createNote(settings.baseUrl, settings.apiKey, notePath, noteContent);
        action = 'created';
      }

      // Update local state
      bookmark.captureStatus = action;
      bookmark.capturedAt = capturedAt;
      bookmark.capturedNotePath = notePath;
      bookmark.capturedContentHash = contentHash;
      bookmark.captureError = null;

      addLog(`Success! ${action === 'created' ? 'Created' : 'Updated'} note: ${notePath}`, 'success');
      
      obsSampleBtn.disabled = false;
      obsSampleBtn.textContent = 'Create Sample Note';

      // Push state update to background storage
      await chrome.runtime.sendMessage({ action: 'SAVE_BOOKMARKS', bookmarks: currentBookmarks });
      
      renderList(currentBookmarks);
    } catch (error) {
      obsSampleBtn.disabled = false;
      obsSampleBtn.textContent = 'Create Sample Note';
      addLog(`Sample note creation failed: ${error.message}`, 'error');
      console.error('[SidePanel] Sample note error:', error);
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

function setGlobalBusy(isBusy, text) {
  if (scanBtn) {
    scanBtn.disabled = isBusy;
    if (isBusy && text) scanBtn.textContent = text;
    else if (!isBusy) scanBtn.textContent = 'Start Scan';
  }
  if (checkLinksBtn) {
    checkLinksBtn.disabled = isBusy;
    checkLinksBtn.textContent = isBusy ? 'Busy...' : 'Check Links';
  }
  if (recheckBrokenBtn) recheckBrokenBtn.disabled = isBusy;
  if (extractSelectedBtn) extractSelectedBtn.disabled = isBusy;
  if (captureSelectedBtn) captureSelectedBtn.disabled = isBusy;
  if (moveDupesBtn) moveDupesBtn.disabled = isBusy;
  if (btnDeleteSelected) btnDeleteSelected.disabled = isBusy;

  // If we are un-busying, we should re-run our intelligent button update 
  // to ensure bulk buttons are enabled only if items are selected.
  if (!isBusy) {
    updateBulkActionButtons();
  }
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
  if (queueBar) queueBar.style.width = `${pct}%`;
  if (queuePercentEl) queuePercentEl.textContent = `${pct}%`;
  queueStats.textContent = `Done: ${p.done} | Failed: ${p.failed} | Remaining: ${p.remaining} | ${p.paused ? '⏸ Paused' : '▶ Running'}`;
  pauseQueueBtn.disabled = p.paused;
  resumeQueueBtn.disabled = !p.paused;
}

if (pauseQueueBtn) {
  pauseQueueBtn.addEventListener('click', async () => {
    try {
      const r = await chrome.runtime.sendMessage({ action: 'PAUSE_QUEUE' });
      if (r && r.status === 'success') {
        updateQueueUI(r.progress);
        addLog('Queue paused.', 'system');
      } else if (r) {
        addLog(`Pause failed: ${r.message}`, 'error');
      }
    } catch (e) {
      addLog(`Pause error: ${e.message}`, 'error');
    }
  });
}

if (resumeQueueBtn) {
  resumeQueueBtn.addEventListener('click', async () => {
    try {
      addLog('Resuming queue...', 'system');
      startQueuePolling();
      const r = await chrome.runtime.sendMessage({ action: 'RESUME_QUEUE' });
      stopQueuePolling();
      
      if (r && r.status === 'success') {
        if (r.bookmarks) {
          currentBookmarks = r.bookmarks;
          updateSummaryCounts(currentBookmarks);
          renderList(currentBookmarks);
        }
        addLog('Queue operation completed.', 'success');
      } else if (r) {
        addLog(`Resume failed: ${r.message}`, 'error');
      }
    } catch (e) {
      stopQueuePolling();
      addLog(`Resume error: ${e.message}`, 'error');
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
    manualDeleteAction = null; // Use policy-gated DELETE_BOOKMARKS
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
  if (pendingDeleteIds.length === 0) {
    addLog('No pending IDs for deletion.', 'info');
    return;
  }
  btnConfirmDelete.disabled = true;
  btnConfirmDelete.textContent = 'Deleting...';

  // Use manual action if triggered from "Delete Selected", otherwise use policy-gated action
  const action = manualDeleteAction || 'DELETE_BOOKMARKS';
  addLog(`Sending ${action} for ${pendingDeleteIds.length} bookmarks...`, 'system');

  try {
    const r = await chrome.runtime.sendMessage({ action, ids: pendingDeleteIds, confirmed: true });
    if (!r) {
      addLog('No response from service worker. Try reloading the extension.', 'error');
    } else if (r.status === 'success') {
      const deleted = (r.results || []).filter(x => x.action === 'deleted').length;
      const failed = (r.results || []).filter(x => x.action === 'failed').length;
      addLog(`Deleted: ${deleted}, Failed: ${failed}`, deleted > 0 ? 'success' : 'error');

      // Log backup info if available (for recovery)
      if (r.backup && r.backup.length > 0) {
        addLog(`Backup saved to console (${r.backup.length} items). Open DevTools > Console to copy if needed.`, 'info');
      }

      // Prune selectedIds
      const deletedIds = (r.results || []).filter(x => x.action === 'deleted').map(x => x.id);
      deletedIds.forEach(id => selectedIds.delete(id));

      if (r.allBookmarks) {
        currentBookmarks = r.allBookmarks;
      } else {
        // Fallback: remove deleted IDs from local list
        const removedSet = new Set((r.results || []).filter(x => x.action === 'deleted').map(x => x.id));
        currentBookmarks = currentBookmarks.filter(b => !removedSet.has(b.id));
      }
      updateSummaryCounts(currentBookmarks);
      renderList(currentBookmarks);
    } else {
      addLog(`Deletion failed: ${r.message}`, 'error');
    }
  } catch (err) {
    addLog(`Deletion error: ${err.message}`, 'error');
  }

  pendingDeleteIds = [];
  manualDeleteAction = null;
  btnConfirmDelete.disabled = false;
  btnConfirmDelete.textContent = 'Permanently Delete';
  if (deleteConfirmModal) deleteConfirmModal.close();
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
        populateFolderFilter(currentBookmarks);
        selectedIds.clear(); // Reset on hydration
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
