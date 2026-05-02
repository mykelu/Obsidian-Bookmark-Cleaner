# Obsidian Bookmark Cleaner (v1.0.0)

**Obsidian Bookmark Cleaner** is a powerful Chrome Extension (Manifest V3) designed for knowledge workers, researchers, and anyone who wants to turn their massive bookmark collection into an organized, actionable knowledge base.

It helps you scan your bookmarks, identify broken or duplicate links, and seamlessly sync your curated content directly into **Obsidian** using the Obsidian Local REST API.

---

## 🚀 Key Features

- **Deep Bookmark Scanning:** Recursively analyzes your entire Chrome bookmark tree.
- **Intelligent Link Checking:** Detects healthy, redirected, soft-broken, and hard-broken links with high accuracy (HEAD with GET fallback).
- **Duplicate Detection:** Identifies duplicate bookmarks based on normalized URLs and SHA-256 hashing.
- **Safe Review Workflow:** Move potential delete candidates to a dedicated `_Obsidian Cleaner` folder for safe review before removal.
- **Content Extraction:** Uses a secure offscreen document and a custom Readability adapter to extract clean page content (titles, descriptions, body text).
- **Obsidian Sync:** Captures bookmarked pages directly into your Obsidian vault as Markdown notes with YAML frontmatter.
- **Local-First & Private:** All processing happens in your browser. No external tracking, no third-party servers.

## 🛠 Why Use This?

Most bookmark cleaners only focus on deleting dead links. This tool is built for **preservation and knowledge capture**. It encourages you to review your links and capture the valuable information into your long-term notes (Obsidian) before they disappear from the web.

---

## Development Journey (Phases)

See [CHANGELOG.md](CHANGELOG.md) for full version history.

## Phases

### Phase 1: Extension Shell (Completed)
- Set up Manifest V3 structure.
- Implemented Service Worker as the primary background logic.
- Created Side Panel as persistent UI.
- Wired action icon to open the side panel.
- Established basic message passing between UI and Service Worker.

### Phase 2: Bookmark Scanner (Completed)
- Created modular `src/lib/bookmark-scanner.js`.
- Implemented pure functions for URL normalization and fast SHA-256 hashing.
- Recursively flattened the Chrome bookmark tree.
- Plumbed data through the service worker to the side panel UI.
- Added summary statistics (counts by folder) and list UI with safe pagination.

### Phase 3: Review Folders and Safe Actions (Completed)
- Implemented bulk selection UI for bookmarks.
- Added duplicate detection logic grouping by normalized URLs.
- Created `exporter.js` to safely export data to JSON and CSV locally.
- Added `bookmark-actions.js` to create the safe `_Obsidian Cleaner` folder structure.
- Successfully implemented safe moving of duplicate bookmarks without permanent deletion.

### Phase 4: Obsidian Integration (Completed)
- Created `obsidian-api.js` adapter for the Local REST API.
- Built a settings interface inside the side panel to persist configuration.
- Added robust connection testing with diagnostic error messages.
- Implemented idempotent Sample Note creation (using `createNote` or `updateNote` conditionally).

### Phase 5: Broken-Link Classification (Completed)
- Built `link-checker.js` using independent pure logic for URL inspection (HEAD with GET fallback).
- Supports advanced status classifications to prevent false-positives:
  - **Healthy:** Link reached securely with an OK response.
  - **Redirected:** Link reached successfully, but the final canonical URL changed.
  - **Soft-Broken:** Transient failures like 403 Forbidden, 429 Rate Limits, Timeouts, or Login Walls. *Note: A soft-broken status is NOT a recommendation to delete. The extension provides a "Recheck" mechanism to test these later.*
  - **Hard-Broken:** Malformed URLs, unsupported schemes (e.g., `javascript:`), and repeated 404/DNS network failures.
- Added detailed UI chips that surface the HTTP status code, the final URL, and exact error reasons directly in the bookmark view.
  - Added row-level and bulk background `Recheck` actions.

### Phase 6: Content Extraction (Completed)
- Integrated the `chrome.offscreen` API to securely parse DOM payloads in Manifest V3 without running risky `innerHTML` logic in the main background worker.
- Built a custom, pure-logic Readability adapter (`readability.js`) that:
  - Strips boilerplate (scripts, nav, ads, headers, footers).
  - Retrieves meta title, canonical URL, and descriptions.
  - Converts standard HTML elements into pristine, unified Markdown text preserving headers, links, and formatting.
- Added synchronous bulk-extraction capabilities to the service worker to manage memory.
- Implemented a "Preview Markdown" modal in the UI to visualize extraction output, including diagnostic warnings (e.g., truncated text or partial extractions due to login walls).
- **Limitations:** Pages requiring strict authentication or intense anti-bot protections may extract as partial logic (login forms) or be fully blocked. Extremely massive pages will have their markdown truncated to avoid IPC message payload limits.

### Phase 7: Obsidian Capture Workflow (Completed)
- Implemented full **create-or-update** note writing to Obsidian using the Local REST API.
- Created `note-builder.js` with pure helper functions:
  - `sanitizeFilename()` — removes OS/Obsidian-illegal characters, collapses dashes, enforces length limits.
  - `buildFrontmatter()` — generates YAML with `type`, `title`, `source_url`, `canonical_url`, `domain`, `captured_at`, `bookmark_folder`, `status`, `tags`, `para_area`, `review_needed`, `hash_url`, `hash_content`.
  - `buildNoteBody()` — assembles H1 title, Summary, Key Points (from extracted headings), Extracted Content (markdown body), and Metadata footer.
  - `generateNotePath()` — deterministic path from settings + sanitized title, with hash-based fallback.
  - `computeContentHash()` — SHA-256 of note body for idempotency.
- **Idempotent capture behavior:**
  - Notes are identified by their deterministic file path (sanitized title + destination folder).
  - Before writing, the extension checks if the note already exists.
  - If the note exists and the content hash matches the last capture, the write is **skipped** (no-op).
  - If the note exists but content has changed, the note is **updated** (PUT overwrite).
  - If the note does not exist, it is **created** (POST).
- **Partial or missing extraction handling:**
  - Bookmarks *without* extraction data still produce a useful "shell note" containing all metadata, with placeholder text in the Summary and Extracted Content sections.
  - Bookmarks with `partial` extraction (e.g., login walls, CSR) generate notes with extraction warnings embedded as Obsidian callout blocks (`> [!warning]`).
- Added **"Capture to Obsidian"** bulk action and per-row **"Preview Note"** button.
- The Preview Note modal shows the full rendered Markdown, the target vault path, and whether the action will be CREATE or UPDATE, with a "Write to Obsidian" button to confirm.
- Capture results are displayed as color-coded badges per bookmark: `created` (green), `updated` (blue), `skipped` (gray), `failed` (red).

### Phase 8: Queue, Recheck, and Safety (Completed)
- Created `state-store.js` for persistent bookmark state via `chrome.storage.local` with debounced writes.
- Created `task-queue.js` for resumable queue with pause/resume/checkpoint support.
- Created `recheck-policy.js` with pure helpers for cooldown calculation and delete-candidate promotion.
- Added `chrome.alarms` integration for scheduled rechecks of broken links.
- Queue progress UI with real-time progress bar and pause/resume controls.
- Delete-candidate workflow: hard-broken bookmarks with ≥3 checks over ≥21 days become eligible.
- Two-step deletion confirmation dialog with title listing before permanent removal.
- State hydration on service worker restart — bookmarks and queue state survive extension reload.
- Busy lock prevents concurrent batch operations and alarm conflicts.

#### Queue Persistence
Bookmark metadata (status, attempts, timestamps, content hashes) is saved to `chrome.storage.local` after every batch operation. Extraction body text is NOT persisted (too large for the 10 MB quota) — only `extractionStatus` and metadata survive restarts. Queue cursor position is checkpointed every 5-10 items.

#### Alarm-Based Rechecks
A named alarm (`recheck-soft-broken`) can be scheduled from the Obsidian settings tab. When it fires, the service worker loads bookmarks from storage, filters to items whose cooldown has expired (7 days after first failure, 14 after second, 30 after third), and rechecks only those. The alarm skips execution if another batch operation is in progress.

#### Delete-Candidate Policy
- Soft-broken bookmarks are never auto-deleted; they default to recheck.
- Hard-broken bookmarks become delete candidates only after ≥3 link checks spanning ≥21 days.
- Redirected bookmarks suggest URL update, not deletion.
- The "View Delete Candidates" button opens a confirmation dialog showing each candidate's title and URL.
- Actual deletion requires clicking "Yes, Delete Permanently" — no background auto-deletion ever occurs.

#### Recovering from Interrupted Scans
If the service worker terminates mid-operation (idle timeout, browser restart), the queue is automatically paused and persisted. On next panel open, the UI shows a "Paused queue detected" notice. Click "Resume" to continue from the last checkpoint.

## How to Install and Test

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked** and select this directory.
4. Open the Obsidian Bookmark Cleaner side panel.

## Setting up Obsidian Local REST API

This extension requires the **Local REST API** plugin installed in your Obsidian vault.

### Installation & API Key
1. **Install the plugin**: In Obsidian, go to Community Plugins > Browse > search for "Local REST API" and install/enable it.
2. **Find your API Key**: Open the Local REST API settings in Obsidian. Copy the "API Key".

### Troubleshooting & Diagnostics

If the extension cannot connect to Obsidian, verify the following using the built-in Diagnostics tool:

- **Certificate Trust Steps**: Because the API runs locally over HTTPS, it generates a self-signed certificate. By default, Chrome blocks these requests silently.
  1. Open a new Chrome tab and navigate to your Base URL (e.g., `https://127.0.0.1:27124`).
  2. You will see a "Your connection is not private" warning.
  3. Click **Advanced**, then click **Proceed to 127.0.0.1 (unsafe)**.
- **Localhost vs LAN IP**: If you are running the extension on the same machine as Obsidian, `127.0.0.1` or `localhost` is preferred. If Obsidian is on a different machine, use its LAN IP (e.g., `https://192.168.1.50:27124`), but note that Chrome restricts some permissions to non-localhost insecure contexts.
- **Common Connection Failures**:
  - `Connection refused`: Obsidian is closed, or the plugin is disabled.
  - `Failed to fetch` or TLS failure: Chrome is rejecting the self-signed certificate. Complete the Certificate Trust Steps above.
  - `401 Unauthorized`: Your API key is incorrect or empty. Check Obsidian settings and paste it again.

## Release Candidate Checklist (0.9.0)

- [x] **Load Unpacked:** Extension loads without manifest errors.
- [x] **Scan:** Successfully traverses deep bookmark trees.
- [x] **Search:** Real-time title/URL filtering works.
- [x] **Connection:** Diagnostics correctly identify API and TLS issues.
- [x] **Capture:** Idempotent note creation works in Obsidian.
- [x] **Queue:** Pause/Resume persists state through SW restarts.
- [x] **Alarms:** Background rechecks trigger correctly.
- [x] **Safety:** Delete confirmation list is accurate and guarded.
- [x] **Documentation:** README and CHANGELOG are complete.

## Support

This extension is designed to support bookmark review, cleanup, and knowledge capture workflows in a safe and review-first manner.

### Getting Help

For setup help, implementation questions, or workflow support, contact your administrator, implementation partner, or support contact.

If you are deploying this extension for a team or client environment, provide your internal support instructions here.

### Common Support Topics

Support requests usually fall into one of these areas:

- Chrome extension installation and load-unpacked setup
- Service worker status or side panel behavior
- Bookmark scan and review workflow
- Obsidian Local REST API connection setup
- Certificate trust issues for local HTTPS connections
- Content extraction limitations on login-protected or restricted pages

### Troubleshooting Tips

Before requesting support, check the following:

- The extension is loaded correctly in Chrome
- The Dashboard shows current worker status
- Obsidian settings are entered correctly
- The Obsidian API key is valid
- Local certificate trust has been configured if required
- The page you are trying to capture is accessible

### Operational Safety

Bookmarks should not be permanently deleted without confirmation.

Temporary errors do not always mean a bookmark is invalid. Recheck soft-broken links before deciding to archive or remove them.

Captured content is only sent to destinations that have been configured in Settings.

## Privacy

This extension is designed with a privacy-first architecture:

- **Local Processing:** All scanning, duplicate detection, and health checks occur locally in your browser.
- **No Tracking:** There are no external analytics, third-party data collection, or remote tracking services.
- **Direct Integration:** Data is only sent to your Obsidian instance via the Local REST API when explicitly triggered by you.
- **Minimal Permissions:** The extension only requests access to bookmarks, local storage, and the hosts required for extraction and integration.

## Authors and Attribution

Copyright (c) 2026 Michael Lu

Developed by Michael Lu with Antigravity-assisted implementation and refinement.
All AI-assisted outputs were reviewed, edited, and approved by the project author.

## License

Licensed under the Apache License, Version 2.0. You may obtain a copy of the License at [http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

