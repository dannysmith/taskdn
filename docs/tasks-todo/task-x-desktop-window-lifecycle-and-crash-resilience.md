# Desktop: Fix macOS Window Lifecycle & Crash Resilience

**Product:** `tdn-desktop/`
**GitHub Issue:** #48

## Background

Closing the Desktop app's main window kills the entire process, making it impossible to reopen via the dock icon or use the quick pane shortcut. Additionally, the app crashes when macOS Screen Time blocks it, during overnight App Nap suspension, or when the user dismisses Screen Time restrictions ("Ignore for today"). These are likely related — the window lifecycle is wrong, and the file watcher has no resilience to process suspension.

## Phased Approach

### Phase 1: Fix macOS window close behavior (Issue #48) — DONE

**Goal:** Closing the main window hides it instead of quitting. Dock icon click reopens it. Quick pane works independently. Cmd+Q and Quit menu item still quit properly.

**What was implemented in `src-tauri/src/lib.rs`:**

1. **Intercept `CloseRequested` for the main window on macOS:**
   - Call `api.prevent_close()` so the window isn't destroyed
   - Call `window.hide()` on the main window (NOT `app_handle.hide()` — see below)
   - Call `save_window_state()` to persist position/size before hiding

2. **Hide the window, not the app:**
   - We use `window.hide()` (hides only the main window) rather than `app_handle.hide()` (which calls `NSApplication.hide()` and sets the system-level hidden state)
   - This is critical because showing an NSPanel while the app is in the system "hidden" state causes macOS to unhide the entire app, including the main window
   - With `window.hide()`, the app is still "running" but not "hidden" — the quick pane can be shown independently without the main window reappearing
   - Cmd+H still works normally (it calls `NSApplication.hide()` at the system level, and interacting with the app after Cmd+H naturally brings everything back — standard macOS behavior)

3. **Add `RunEvent::Reopen` handler:**
   - When the dock icon is clicked and there are no visible windows, show the main window
   - Explicitly call `window.restore_state(StateFlags::all())` after showing — the `tauri-plugin-window-state` plugin only auto-restores on app startup, not after a hide/show cycle. Without this, the window could appear at stale/off-screen coordinates and jump when dragged.
   - Focus the window after restoring

4. **Move cleanup to `RunEvent::Exit`:**
   - `hide_quick_pane()` and `unregister_global_shortcuts()` now run in `RunEvent::Exit` instead of on window close
   - This ensures cleanup happens on actual quit (Cmd+Q, menu Quit) regardless of how the quit was initiated
   - These cleanup functions exist to prevent known crashes during app teardown — removing them causes crashes on quit
   - `RunEvent::Exit` fires reliably before the process exits, unlike `RunEvent::ExitRequested` which doesn't fire for Cmd+Q on macOS (tauri-apps/tauri#9198)
   - We do NOT use `prevent_exit()` anywhere, which avoids the infinite `windowDidMove` loop issue with `tauri_plugin_window_state` (tauri-apps/tauri discussions#11489)

5. **Non-macOS behavior unchanged:** On other platforms, closing the main window still quits the app after running cleanup.

**Key references:**
- tauri-apps/tauri#3084 — `RunEvent::Reopen` feature
- tauri-apps/tauri PR#4865 — implementation
- tauri-apps/tauri#9198 — `ExitRequested` unreliable on macOS
- tauri-apps/tauri#13511 — `prevent_exit()` blocks normal termination
- tauri-apps/tauri discussions#11489 — `window-state` + `prevent_exit()` infinite loop
- plugins-workspace#1546 — quick-pane NSPanel denylisted from window-state plugin

**Behavior summary:**

| Action | Result |
|--------|--------|
| Red X (close button) | Main window hides. App stays running. Quick pane shortcut works. |
| Dock icon click (window hidden) | Main window shows at saved position. |
| Quick pane shortcut (window hidden) | Only the quick pane appears. Main window stays hidden. |
| Cmd+H | macOS hides entire app (system-level). Standard behavior. |
| Dock icon click (after Cmd+H) | macOS unhides the app. Main window reappears. |
| Quick pane shortcut (after Cmd+H) | macOS unhides entire app. Both main window and quick pane appear. |
| Cmd+Q / menu Quit | Cleanup runs via `RunEvent::Exit`, then app exits. |

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
