# Task 12: CLI 2.0 build

**Product:** `tdn-cli/`. **Related:** #6 (dynamic shell completions). **Depends on:** the interface doc (task 10), `tdn-core` (task 11), the eval harness and baseline (task 9).

Build CLI 2.0 on `tdn-core` to the approved interface doc, show with evals that it beats 1.x, and release it. The phases depend on task 10's decisions, Rust or TypeScript especially, so expect to fill in more detail then.

## Phases

### Phase 1: Foundation

- [ ] Set up the CLI in the chosen language on top of `tdn-core`, with the shared config and `TASKDN_HOME`.
- [ ] The output contract: text by default, `--json`, colour only on a TTY, errors that say what to try next.
- [ ] Keep the `TASKDN_*_DIR` overrides working (or whatever task 10 replaced them with), so agents in this repo can't reach Danny's vault, and update `.claude/settings.json` and `bun run vault tdn` if that changes.

### Phase 2: Commands

- [ ] Reads, writes, query filters and batch writes from stdin, as the interface doc defines them, with every write validated against the vault.
- [ ] `tdn help` good enough to replace most of the skill.
- [ ] Dynamic shell completions of handles (#6).
- [ ] `tdn config` names the file actually in use: today it names the local `.taskdn.json` even when `TASKDN_*_DIR` override it.
- [ ] Snapshot tests of output against the rendered test vaults.

### Phase 3: Evals

- [ ] Run the task 9 suite against 2.0 and compare with the 1.0.2 baseline. Fix what it shows before releasing.

### Phase 4: Consumers

- [ ] `obsidian-inbox-assistant`: move it to 2.0 and drop its ANSI stripping.
- [ ] The tdn plugin skill: enough to work with 2.0. The full rewrite is task 14.
- [ ] Website CLI pages: correct for 2.0. The full rewrite is task 17.
- [ ] The root `AGENTS.md` test vault instructions, and anything else in the repo that runs `tdn`.

### Phase 5: Release

- [ ] Packaging for npm and Homebrew. If the CLI is now a plain Rust binary, the NAPI build and per-platform packages go.
- [ ] Release 2.0 through the release workflow and check the same things as 1.0.2 did (not "Latest", npm, Homebrew tap PR, release post).

## Done when

2.0 is released, beats the 1.0.2 baseline, and Danny, the plugin and the inbox assistant all use it.
