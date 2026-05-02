# v1.0.0 Release Checklist

Use this checklist to perform final verification before packaging the extension for distribution.

## 1. Documentation & Attribution
- [ ] `manifest.json` version is set to `1.0.0`
- [ ] `manifest.json` contains the `icons` and `action.default_icon` definitions
- [ ] `assets/icons/` contains the actual `icon16.png`, `icon48.png`, and `icon128.png` files
- [ ] `README.md` version header is updated
- [ ] `AUTHORS.md` correctly identifies roles
- [ ] `LICENSE` (Apache-2.0) is present
- [ ] `NOTICE` contains final copyright wording
- [ ] Privacy section is present in `README.md` and Side Panel Help

## 2. Functional Verification
- [ ] **Dashboard:** Health check shows "Responsive" on load
- [ ] **Scan:** Recursively detects bookmarks and calculates folders
- [ ] **Review:** Correctly identifies duplicates and health status
- [ ] **Settings:** Preferences persist across side panel restarts
- [ ] **Obsidian:** "Test Connection" works with valid settings
- [ ] **Capture:** Content is extracted and written correctly to Obsidian

## 3. Resilience & Hardening
- [ ] **Service Worker:** Gracefully handles dormant states and wake-up
- [ ] **Error Handling:** Soft-broken links do not crash the scanner
- [ ] **Permissions:** Minimal required permissions are listed in `manifest.json`
- [ ] **UI Visibility:** Settings toggles correctly show/hide advanced features

## 4. Packaging
- [ ] Remove any temporary log files or scratch scripts
- [ ] Clean up `src/` of any unused assets or components
- [ ] Create a ZIP archive of the root directory (excluding `.git` and `.gemini`)

## 5. Sharing
- [ ] Ensure all attribution wording matches the final approved state
- [ ] Verify the Support contact information is clear in the Help tab
