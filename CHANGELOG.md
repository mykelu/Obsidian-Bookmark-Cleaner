# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-05-04
### Fixed
- **CSP Violations**: Fixed an issue where scraping certain websites would trigger Content Security Policy errors in the background. Added HTML sanitization to strip script and link tags before parsing.

## [1.2.0] - 2026-05-04
### Added
- **Advanced Scraping Engines**: You can now choose between "Standard" (local) and "Jina Reader" (external) extraction. Jina Reader handles complex JavaScript sites and provides superior Markdown.
- **Site Context Discovery**: New option to automatically extract metadata from the root domain (homepage). This helps you understand the source of a bookmark for better planning and categorization.
- **Scraper Settings**: Dedicated configuration area in the Settings tab for extraction preferences.

## [1.1.19] - 2026-05-04
### Added
- **Persistent Selection**: Bookmark selections now stay checked after bulk extraction, so you can immediately "Capture to Obsidian" without re-selecting everything.
- **Workflow Filters**: Added new status filters: "Extracted", "Captured to Obsidian", and "Extracted but Not Captured" to help track your progress.
- **Improved Bulk Actions**: Refactored selection logic to be more robust across different views and filters.

## [1.1.18] - 2026-05-04
### Fixed
- **Syntax Error**: Fixed a critical `Unexpected token '}'` error in `sidepanel.js`.
- **Refactoring**: Extracted row-level listeners into a standalone function for better performance and maintainability.

## [1.1.17] - 2026-05-04
### Added
- **Folder Filtering**: Added a new "Folder" dropdown in the Review tab. You can now filter your bookmarks by their original Chrome folder path.
- **Combined Filters**: Status, Search, and Folder filters now work together to help you find exactly what you're looking for in large collections.

## [1.1.16] - 2026-05-04
### Fixed
- **Sync Reliability**: Added `SAVE_BOOKMARKS` listener to fix the "message channel closed" error during captures.
- **Preview Capture**: Refactored the "Write to Obsidian" button in the preview modal to use the UI-direct method for better SSL reliability.

## [1.1.15] - 2026-05-03
### Changed
- **Capture Reliability**: Individual "Capture" and "Create Sample Note" buttons now run in the UI context. This fixes the "Failed to fetch" error caused by Chrome blocking background connections to self-signed Obsidian certificates.

## [1.1.14] - 2026-05-03
### Fixed
- **Sample Note Button**: Fixed the "Create Sample Note" button in settings which was failing silently. It now correctly disables during creation and provides log feedback.

## [1.1.13] - 2026-05-03
### Added
- **Row-Level Capture**: Added a "Capture" button to each bookmark card in the Review tab. You can now push individual bookmarks to Obsidian without doing a bulk sync.
### Fixed
- **API Resilience**: Improved handling of edge cases in the Obsidian Local REST API where a note might be created but the connection is interrupted.

## [1.1.12] - 2026-05-03
### Fixed
- **Content Persistence**: Enabled `unlimitedStorage` and disabled content-stripping to ensure extracted text is preserved across restarts. This fixes the "0 words" bug.
- **Capture Diagnostics**: The UI now shows the exact error message if a capture to Obsidian fails.
- **Word Count Fallback**: Improved word count calculation to work even if only Markdown content is available.

## [1.1.11] - 2026-05-03
### Fixed
- **Path Normalization**: The extension now automatically converts `\` to `/` in destination paths, fixing capture failures on Windows-style inputs.
- **Path Resilience**: Improved handling of leading/trailing slashes in folder names.
- **Diagnostic Fixes**: Correctly display the Obsidian Local REST API version in the connection tester.

## [1.1.10] - 2026-05-03
### Fixed
- **Syntax Error**: Removed a misplaced closing brace in the service worker that was preventing the script from registering.

## [1.1.9] - 2026-05-03
### Fixed
- **Double-Click Fix**: Actions (Extract, Delete, Capture) now work on the first click even if the service worker was idle.
- **Obsidian Pathing**: Fixed a bug where nested folders (like `a/b/c`) were not correctly encoded or created, causing capture failures.
- **Recursive Folders**: The extension now automatically creates missing parent directories in Obsidian.
- **Improved Diagnostics**: Better feedback in the connection tester.

## [1.1.8] - 2026-05-03
### Fixed
- **State Persistence**: Fixed a bug where the side panel could lose track of bookmark statuses when the background script restarted. This prevents the "everything is back to pending" issue.
- **Race Condition Protection**: Added a hydration check to ensure the extension is fully ready before processing new link checks or captures.

## [1.1.0] - 2026-05-03
### Added
- **Workflow Recommendation Tip**: Context-aware guidance in the Review tab that suggests the next logical step (Scan -> Check -> Extract -> Capture).
- **Intelligent Bulk Actions**: Extract, Capture, and Delete buttons now show eligible counts and only enable when relevant items are selected.
- **Review Status Strip**: Added a persistent progress bar and status badge summary for quick data oversight.
- **Safe Staging (Chrome Folders)**: Grouped and clarified folder-based tools as a "Safe Staging" workflow to differentiate from permanent deletion.
- **Delete Selected**: New button in the Review tab to delete user-reviewed bookmarks with a confirmation modal.
- **Select All (Filtered)**: Checkbox above the bookmark list that selects/deselects all visible items after filtering.
- **Backup on Delete**: Every manual deletion logs a JSON backup to the browser console for recovery if needed.
### Fixed
- **Scan Merging**: Improved full scans to merge with existing data, preserving enrichment results (links/extraction) and preventing redundant work.
- **Startup Restore**: The extension now automatically restores the previous session state and Review UI on launch.
- Icons converted to actual PNG format.
- Queue progress percentage now updates in real-time.
- Health check button no longer stays stuck on "Checking..." after completion.

## [1.0.0] - 2026-05-02
### Added
- Professional extension branding (Icons/Logo).
- Final Documentation pass.
- v1.0.0 release checklist.
