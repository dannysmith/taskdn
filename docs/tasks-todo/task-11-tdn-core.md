# Task 11: `tdn-core` crate

**Product:** new `tdn-core/`. **Background:** `docs/tasks-todo/temporary/view-state-identity-and-core.md` ("Shared core"), `docs/tasks-done/2025-12-27-task-6-rust-prep-review.md`.

S1 is implemented twice in Rust today: the CLI's `tdn-cli/crates/core` (gray_matter 0.3) and the desktop's `tdn-desktop/src-tauri/src/vault/` (gray_matter 0.2), plus reference resolution a third time in the desktop's TypeScript (`src/lib/wikilink.ts`). They've drifted since January. Replace them with one crate that implements Spec 1.1 and that the desktop app and CLI 2.0 both link. That's allowed under rule 4 in `AGENTS.md`: a shared library, not a runtime dependency between products.

## Shape

- **Pure functions over strings** for parsing, validation, round-trip serialisation, reference resolution, status semantics and the date meanings (active, deferred, today). These never touch the filesystem, so a WASM or NAPI build stays cheap later.
- **A thin IO layer on top** for scanning a vault, reading files and writing them atomically.
- **Writes change only what they mean to.** Unknown fields, key order, body and formatting survive a round trip.
- File watching stays in the desktop app.

## Phases

### Phase 1: Set up

- [ ] Create `tdn-core/` as a product directory with its own `README.md`, `AGENTS.md` and `docs/`, and add it to `docs/products.md`, `docs/monorepo-architecture.md` and the root `AGENTS.md` table.
- [ ] CI on PRs: fmt, clippy, tests.
- [ ] Pick the YAML parser. It needs the YAML 1.2 core schema (date-like values stay strings) and must allow minimal-edit writes. Search before choosing; `serde_yaml` is unmaintained.

### Phase 2: Port

- [ ] Compare the two Rust implementations area by area and take the better of each. The CLI's has the vault session and index; the desktop's is built around long-lived state.
- [ ] Implement what Spec 1.1 changes: reference resolution, open statuses, lenient reads, timestamps with offsets, `uid` preserved.

### Phase 3: Conformance tests

- [ ] Render the `edge-cases` and `demo` templates in tests and check that every case does what the spec says. The `edge-cases` README is the checklist.
- [ ] Round-trip tests: read and write every template file without changing it.
- [ ] A performance check on a large generated vault (`bun run vault generate big --size large`).

### Phase 4: Shared config

- [ ] `~/.taskdn/config.json` holds the vault dirs and is read by the CLI and desktop. `TASKDN_HOME` points config and state somewhere else, which also gives agents one switch for isolation. Decide how it relates to the `TASKDN_*_DIR` variables and the per-vault `.taskdn.json`, and how to migrate from the CLI's `~/.taskdn.json`.
- [ ] Document the config in `tdn-core/docs/`.

## Done when

`tdn-core` implements Spec 1.1, passes conformance tests against both test vault templates, and reads the shared config. Nothing uses it yet; tasks 12 and 13 switch the CLI and desktop over.
