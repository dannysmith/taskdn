# Task 13: Desktop on `tdn-core`

**Product:** `tdn-desktop/`, plus a small CLI change. **Depends on:** `tdn-core` (task 11). **Background:** `docs/tasks-todo/temporary/view-state-identity-and-core.md` ("View state").

Replace the desktop app's own S1 code with `tdn-core`, read the shared config, and move ordering and Today headings out of localStorage so `tdn today` (and Claude) can show the day in Danny's order.

## Phases

### Phase 1: Vault code

- [ ] Replace parsing and writing in `src-tauri/src/vault/` with `tdn-core`. The manager, file watcher and periodic rescan stay in the app.
- [ ] Reference resolution comes from `tdn-core`. The frontend stops resolving wikilinks itself (`src/lib/wikilink.ts`).
- [ ] Unknown statuses are shown rather than dropped. They need a visual treatment; add it to `docs/developer/semantics-and-visual-design.md`.
- [ ] Check the app against the `demo` and `edge-cases` vaults with `bun run app`.

### Phase 2: Shared config

- [ ] Read vault dirs from `~/.taskdn/config.json`, and migrate the dirs from the app's preferences on first run. App-only preferences such as theme stay in the app.
- [ ] Dev builds use their own `TASKDN_HOME` so they never read or write Danny's real config or state, in line with the dev identity.

### Phase 3: View state

- [ ] Move what `src/store/display-order-store.ts` keeps in localStorage to `~/.taskdn/state/<hash-of-tasks-dir>.json`: Today order and headings, inbox order, sidebar order, per-project and per-area task order, kanban column order. References are paths relative to the entity's directory, not the app's path hashes.
- [ ] The desktop is the only writer, with atomic writes, and state flows one way. The dropped task (`tdn-desktop/docs/tasks-done/task-2026-01-12-DROPPED-x-order-persistance-proper.md`) broke because order and watcher updates synced both ways.
- [ ] Migrate existing localStorage state on first run.
- [ ] The state file's format lives in `tdn-core` (or its docs), since the CLI reads it too.

### Phase 4: `tdn today`

- [ ] `tdn today` shows Scheduled for Today in Danny's order, grouped under his headings, when a state file exists.

## Done when

The desktop app has no S1 code of its own, reads the shared config, keeps view state in `~/.taskdn/state/`, and `tdn today` shows the day as the app does.
