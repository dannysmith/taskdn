# Desktop: Fix macOS Window Lifecycle & Crash Resilience

**Product:** `tdn-desktop/`
**GitHub Issue:** #48

## Background

Closing the Desktop app's main window kills the entire process, making it impossible to reopen via the dock icon or use the quick pane shortcut. Additionally, the app crashes when macOS Screen Time blocks it, during overnight App Nap suspension, or when the user dismisses Screen Time restrictions ("Ignore for today"). These are likely related — the window lifecycle is wrong, and the file watcher has no resilience to process suspension.

## Phased Approach

### Phase 1: Fix macOS window close behavior (Issue #48)

**Goal:** Closing the main window hides the app instead of quitting. Dock icon click reopens it. Cmd+Q and Quit menu item still quit properly.

**Changes in `src-tauri/src/lib.rs`:**

- In `on_window_event` / `handle_run_event`: intercept `CloseRequested` for the main window, call `api.prevent_close()`, then `app_handle.hide()` (uses `NSApplication.hide()` which integrates with dock reshow)
- Add `RunEvent::Reopen` handler: show and focus the main window when `has_visible_windows` is false
- **Do NOT call `unregister_global_shortcuts()` on window close** — only on actual app quit. Quick pane shortcut must keep working while the app is hidden
- Move cleanup logic (save window state, hide quick pane, unregister shortcuts) to actual quit path
- Ensure Cmd+Q and the Quit menu item call `app_handle.exit(0)` so the app actually terminates (workaround for `ExitRequested` not firing reliably on macOS — see tauri-apps/tauri#9198)

**Watch out for:**
- `tauri_plugin_window_state` + `prevent_exit()` can cause infinite `windowDidMove` loop (tauri-apps/tauri discussions#11489) — test this carefully
- The quick-pane NSPanel is already denylisted from window-state plugin due to `is_maximized()` crash (plugins-workspace#1546)

**Key references:**
- tauri-apps/tauri#3084 — `RunEvent::Reopen` feature
- tauri-apps/tauri PR#4865 — implementation
- tauri-apps/tauri#9198 — `ExitRequested` unreliable on macOS
- tauri-apps/tauri#13511 — `prevent_exit()` blocks normal termination

### Phase 2: File watcher error recovery & periodic rescan

**Goal:** The vault file watcher recovers from crashes and a periodic rescan catches missed changes.

**Changes in `src-tauri/src/vault/manager.rs`:**

- Add error handling in the debouncer callback — detect when the watcher has died and trigger a rebuild (drop old watcher, full rescan, create new watcher)
- Add a periodic vault rescan timer (e.g. every 5 minutes) as a safety net. This is the Syncthing pattern and what Apple recommends for mission-critical apps. It should be lightweight — compare file mtimes against the in-memory index
- Handle the `Rescan` event kind from notify (maps to `kFSEventStreamEventFlagMustScanSubDirs`) — trigger a full directory scan when this fires, as it means events were coalesced or dropped

**Why this matters:** When Screen Time SIGSTOPs the process or App Nap suspends it, FSEvents queue up in `fseventsd`. On resume they arrive all at once, possibly coalesced. The debouncer may not handle this burst, and if the watcher thread panics the app has no recovery path today.

### Phase 3: Upgrade notify dependencies

**Goal:** Pick up recent FSEvents crash fixes.

- Upgrade `notify` and `notify-debouncer-full` to latest versions
- notify 9.0.0-rc.1/rc.2 include: preventing panics in the FSEvents callback, fixing stream start errors, fixing empty path crashes, making StreamContextInfo Send
- Test thoroughly after upgrade — the rc versions may have breaking API changes

**References:**
- notify-rs/notify CHANGELOG
- notify-rs/notify#283 (watcher panic on suspend/resume)

### Phase 4: App Nap and sleep/wake handling (optional)

**Goal:** Prevent aggressive App Nap suspension and rebuild the watcher after system sleep.

This phase may not be necessary if Phases 1-3 resolve the overnight crashes. Evaluate after those are done.

- **App Nap prevention:** Use `NSProcessInfo.beginActivityWithOptions:reason:` with `NSActivityUserInitiated` to prevent macOS from aggressively suspending the app while the file watcher is active
- **Sleep/wake detection:** Listen for `NSWorkspaceDidWakeNotification` and rebuild the file watcher on wake
- Both require `objc2` crate calls from Rust

**References:**
- Apple QA1340: Sleep/Wake Notifications
- Electron issue electron/electron#973 (App Nap)
