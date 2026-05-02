# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-05-05
### Added
- Link checking batching: Users can now process large bookmark collections in smaller chunks (50, 100, or 500 items) to improve performance and stability.
### Fixed
- Side panel stability: Hardened UI with defensive null-checks for all event listeners to prevent runtime crashes.
- Background worker: Fixed a TypeError in the health check logic when calculating pending jobs.
- Improved version tracking: Corrected version display in Side Panel and Help sections.

## [1.0.1] - 2026-05-05

## [1.0.0] - 2026-05-02
### Added
- Professional extension branding (Icons/Logo).
- Final Documentation pass (AUTHORS.md, NOTICE, Support, Privacy).
- v1.0.0 release checklist.
### Fixed
- Fixed critical manifest blockers (Missing icons).
- Hardened attribution and disclosure wording.

## [0.9.0] - 2026-05-02
### Added
- Search bar with real-time title/URL filtering in the Scan tab.
- Dashboard "Quick Start" navigation for better onboarding.
- Dynamic UI section visibility (Bulk Actions/Cleanup only show when data exists).
### Changed
- UI Polish: Modernized CSS with Google-style color palette and refined typography.
- Status Polish: Better badge colors and improved section spacing.
- Logging Polish: High-resolution `[HH:mm:ss]` timestamps and reduced log noise.
- Documentation: Finalized README with setup, troubleshooting, and limitations.

## [0.8.0] - 2026-05-02
### Added
- Resumable task queue for `CHECK_LINKS`, `EXTRACT_BATCH`, and `CAPTURE_BATCH`.
- Persistent state using `chrome.storage.local` with debounced writes.
- Alarm-driven background rechecks for broken links via `chrome.alarms`.
- Delete-candidate review workflow with safety gates (≥21 days + ≥3 checks).
- Version management and sidepanel version display.

## [0.7.0] - 2026-05-01
### Added
- Full Obsidian capture workflow with idempotency hashing.
- `note-builder.js` for structured Markdown and YAML frontmatter.
- Support for create-or-update semantics via Obsidian Local REST API.

## [0.6.0] - 2026-04-28
### Added
- Content extraction using `chrome.offscreen`.
- Readability integration for cleaning page content.
- DOM-based metadata extraction (title, description, headings).

## [0.5.0] - 2026-04-20
### Added
- Link classification logic (healthy, redirected, soft-broken, hard-broken).
- HTTP HEAD/GET retry fallback system.

## [0.4.0] - 2026-04-10
### Added
- Obsidian settings panel and Local REST API adapter.
- Diagnostic tools for connectivity and TLS trust.

## [0.3.0] - 2026-03-25
### Added
- Review folders (`_Obsidian Cleaner`) and safe bookmark move actions.
- CSV/JSON export functionality.

## [0.2.0] - 2026-03-15
### Added
- Deep bookmark tree scanner.
- URL normalization and SHA-256 hashing.
- Basic summary statistics UI.

## [0.1.0] - 2026-03-01
### Added
- Initial extension shell (Manifest V3).
- Service worker and Side Panel infrastructure.

[0.9.0]: https://github.com/mykelu/Chrome-extension/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/mykelu/Chrome-extension/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/mykelu/Chrome-extension/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/mykelu/Chrome-extension/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/mykelu/Chrome-extension/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/mykelu/Chrome-extension/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/mykelu/Chrome-extension/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mykelu/Chrome-extension/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mykelu/Chrome-extension/releases/tag/v0.1.0
