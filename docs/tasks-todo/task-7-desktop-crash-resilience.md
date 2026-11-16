# Task 7: Desktop crash resilience

**Product:** `tdn-desktop/`. **Related:** #48 (window lifecycle, done).

When Screen Time downtime starts at 1am, other apps lock properly, but Taskdn Desktop crashes with the macOS "Taskdn quit unexpectedly" dialog. Earlier notes also mention crashes after overnight App Nap suspension and after "Ignore for today". Find the cause and fix it, and make sure any future crash leaves a trace. This matters more once the app is meant to be always on (task 15).

Depends on task 6: release logging (phase 2) so there's something to read, and the dev identity (phase 1) so test builds don't disturb the installed app.

## Already done

**Phase 1: window lifecycle (#48).** On macOS, closing the main window hides it instead of quitting. The dock icon reopens it (`RunEvent::Reopen`, with an explicit window-state restore), and the quick pane works while the main window is hidden. Cleanup (`hide_quick_pane()`, `unregister_global_shortcuts()`) runs in `RunEvent::Exit`, because removing it causes crashes on quit; `ExitRequested` doesn't fire for Cmd+Q on macOS. `prevent_exit()` is not used anywhere, because it loops with the window-state plugin. Details are in this file's git history, and the references are tauri-apps/tauri#3084, #9198, #13511, discussions#11489 and plugins-workspace#1546.

**Part of phase 2.** Watcher errors trigger a refresh (`src-tauri/src/vault/manager.rs`), and a 5-minute periodic rescan exists (`start_periodic_rescan` in `src-tauri/src/lib.rs`).

## Work

### Find the cause

- [ ] Look for existing evidence. Search `~/Library/Logs/DiagnosticReports/` for crash reports under every name the binary might use (the product name, `taskdn-desktop`, `tdn-desktop`); the review found none under "Taskdn". Also check the unified log around 01:00 on a night it crashed (`log show --start … --end …`), filtering for the app's process and for Screen Time.
- [ ] Install a panic hook that logs the panic message and backtrace to the log file before the process dies, so a Rust panic leaves a trace.
- [ ] Reproduce. Set a Downtime window a few minutes ahead with the app open, and try:
  - main window visible
  - main window hidden
  - quick pane open
  - the "Ignore for today" path

  Do this with a bundled build, since a bare dev binary may not be treated as an app by Screen Time: `tauri build --debug` with the dev identity, or a signed test build if that isn't enough. Test builds were deferred from task 2; port them from Astro Editor's `release.yml` and `scripts/test-build.js` if needed.
- [ ] Read the crash report: the crashed thread and exception type will say whether it's the file watcher, the quick pane NSPanel, the webview process, global shortcuts or something else.

### Fix

- [ ] Fix whatever the crash report points at, with a regression check where one is feasible.
- [ ] Upgrade `notify` and `notify-debouncer-full` (currently `notify-debouncer-full` 0.7 on `notify` 8.2). Later `notify` versions fix several FSEvents crashes: panics in the FSEvents callback, stream start errors, empty-path crashes. Check the changelog for API changes. See also notify-rs/notify#283 (watcher panic on suspend/resume).
- [ ] Rebuild the watcher when it dies or reports `Rescan` (events were dropped or coalesced): drop it, rescan in full and create a new one. When Screen Time stops the process or App Nap suspends it, FSEvents queue up and arrive all at once on resume.
- [ ] Make the periodic rescan emit `vault-changed` only when something actually changed. Today it emits every 5 minutes, so the frontend refetches everything even when nothing changed.
- [ ] Only if still needed after the above: App Nap prevention (`NSProcessInfo.beginActivityWithOptions:reason:`) and rebuilding the watcher on `NSWorkspaceDidWakeNotification` (Apple QA1340). Both need `objc2` calls.

## Done when

The app survives a Screen Time downtime cycle, including "Ignore for today", and a night of App Nap and sleep without crashing. Any panic is written to the release log.
