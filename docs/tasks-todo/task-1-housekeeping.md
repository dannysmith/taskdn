# Task 1: Housekeeping

Small fixes that clear the decks before the bigger work. Everything here can go straight to `main`.

## Stale docs and pointers

- [ ] Root `AGENTS.md` refers to `tdn-specs/S2-interface-design.md` and `tdn-specs/S3-data-read-write.md`, which don't exist. The real file is `S2-implementation-guidance.md`.
- [ ] `tdn-cli/docs/developer/cli-interface-guide.md` says config lives at `~/.config/taskdn/config.json`; the code reads `~/.taskdn.json` and `./.taskdn.json` (`tdn-cli/src/config/index.ts`). It also says `show` does fuzzy matching; it only accepts paths.
- [ ] Skim root `docs/` and each product's `README.md` for anything else that's plainly wrong. Fix it if it's a line or two; anything bigger waits for the task that rewrites it (the demo vault counts are fixed in task 5, the CLI docs in the CLI 2.0 work).

## AGENTS.md rule 4

- [ ] Reword "Sub-project autonomy" to say what Danny meant: products must not depend on each other at runtime, but shared libraries built into more than one product are fine (e.g. a future `tdn-core` crate).

## Task docs

- [ ] Complete `task-x-quick-entry-ai-processing.md` with `bun run task:complete quick-entry-ai-processing`. All its phases are done and it shipped in #50.

## GitHub

- [ ] Close the personal review issues #9 (init), #10 (weekly review), #11 (cleanup), #12 (process inbox) and #13 (area reflection) with a one-line comment: these workflows are personal and live outside this repo (#12 is covered by `obsidian-inbox-assistant`). Danny confirms before they're closed.
- [ ] Merge the Dependabot PRs #55 (`tar`), #56 (`serde_with`) and #57 (`quinn-proto`), all in `tdn-desktop/src-tauri`. There's no desktop CI yet, so first check them locally: `cargo check` and `cargo test` in `tdn-desktop/src-tauri` on each branch, or on all three merged together. They need to be merged or closed before task 3 rewrites history.

## Done when

The docs above are correct, the quick-entry task is in `docs/tasks-done/`, issues #9–#13 are closed and there are no open PRs.
