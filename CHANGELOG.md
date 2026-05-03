# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
