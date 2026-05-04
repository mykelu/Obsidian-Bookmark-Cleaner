# Obsidian Bookmark Cleaner (v1.3.1 Stable)

**Obsidian Bookmark Cleaner** is a sophisticated Chrome Extension (Manifest V3) designed for knowledge workers, researchers, and anyone who wants to turn their massive bookmark collection into an organized, actionable knowledge base.

It doesn't just delete dead links—it **ingests and preserves** the knowledge within them, ensuring your research survives even if the original website disappears.

---

## 🚀 Key Features

- **Intelligent Extraction Orchestrator (v1.3.1):** 
    - Automatically heals extraction failures. If a standard capture yields "thin" content, the system escalates to **Jina Reader** or **Firecrawl** (Premium) to ensure high-quality Markdown capture.
- **Automated Junk Filter:** Automatically identifies and flags "noise" (parked domains, generic tool homepages like Notion/Slack) to keep your Obsidian vault pristine.
- **Deep Bookmark Scanning:** Recursively analyzes your entire Chrome bookmark tree.
- **Deduplication:** Identifies duplicates based on normalized URLs and SHA-256 hashing.
- **Obsidian Sync Engine:** 
    - Idempotent capture: Skips writing if content hasn't changed.
    - Full binary support: Automatically downloads and uploads PDFs/Images alongside your notes.
    - Rich metadata: Rich YAML frontmatter for PARA/GTD organization.
- **Safe Review Workflow:** Non-destructive "Move to Review" folders for safe auditing before deletion.
- **Batch Processing:** checkpointed, resumable task queue that survives browser restarts.

---

## 📖 Comprehensive Documentation

For detailed technical and project specifications, see:
- [**Product Requirements Document (PRD)**](PRD.md)
- [**Project Retrospective**](RETROSPECTIVE.md)
- [**Future Roadmap**](ROADMAP.md)
- [**Changelog**](CHANGELOG.md)

---

## 🛠 Why Use This?

Most bookmark cleaners only focus on deleting dead links. This tool is built for **preservation and knowledge capture**. It encourages you to review your links and capture the valuable information into your long-term notes (Obsidian) before they disappear from the web.

---

## Development Journey (Phases)

### Phase 1-5: The Auditor (Completed)
- Set up Manifest V3 shell, deep scanner, and link status classification (HEAD + GET).
- Built the duplicate detection and safe review folder workflow.
- Established the Obsidian Local REST API bridge with diagnostic tools.

### Phase 6-8: The Pipeline (Completed)
- Implemented **Offscreen Document** parsing for safe, high-performance content extraction.
- Developed a resumable task queue and storage-persistent state engine.
- Added support for binary asset (PDF) capture and upload.

### Phase 9-11+: The Orchestrator (Current - v1.3.1)
- Integrated **Jina Reader** and **Firecrawl** for premium scraping.
- Implemented **Intelligent Auto-Switching** for self-healing extraction.
- Added **Automated Junk Filtering** to suppress generic homepages and parked domains.

---

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

### Certificate Trust Steps
Because the API runs locally over HTTPS, it generates a self-signed certificate. By default, Chrome blocks these requests silently.
1. Open a new Chrome tab and navigate to your Base URL (e.g., `https://127.0.0.1:27124`).
2. You will see a "Your connection is not private" warning.
3. Click **Advanced**, then click **Proceed to 127.0.0.1 (unsafe)**.

---

## Support & Privacy

- **Local-First:** All processing happens in your browser. No data leaves your machine unless sent to your vault or your configured scraping APIs.
- **Privacy:** No analytics, no tracking, no third-party servers.

Copyright (c) 2026 Michael Lu. Licensed under the Apache License, Version 2.0.

