# Task 10: CLI 2.0 design

**Product:** `tdn-cli/`. **Background:** `docs/tasks-todo/temporary/taskdn-review.md` (point 4, "The CLI"), the task 9 baseline, and the "2.0 redesign" notes in `docs/tasks-done/task-2026-11-15-cli-1-0-2.md`.

Design CLI 2.0 for agents first, with a little sugar for humans. It's a clean break: no compatibility with 1.x. The only consumers are Danny, the tdn plugin and `obsidian-inbox-assistant`. The output is an interface doc that task 12 builds to.

## Principles to start from

These come from the review and are proposals, not decisions:

- **One way to name things.** Every entity has one short handle, shown in all output and accepted by every command. The filename stem is the obvious candidate, since under Spec 1.1 it's what a wikilink resolves to. Commands also accept an exact title or a path. Fuzzy matching only happens in search, never in a write.
- **One output contract.** Compact text for agents by default, `--json` for the same data as JSON, colour only on a TTY, no prompts unless a command is explicitly interactive. That removes `--ai`.
- **Every write is validated** against the vault: statuses, references (with "did you mean"), dates. A write that would leave a broken reference fails.
- **Output carries the context an agent lacks:** today's date at the top, dates like `2026-11-16 (Mon, in 2 days)`, why each task is in `today`, and the vault root once instead of a table of absolute paths.
- **Filters as a query string** (`status:ready,in-progress project:acme due:<+7d`), not 22 flags.
- **Batch writes from stdin** as JSON lines, for inbox processing and the inbox assistant.
- **`tdn help` is the skill.** If help and errors are good enough, the skill shrinks to "use `tdn`; run `tdn help`".

## Phases

### Phase 1: Prior art

- [ ] Beads (`bd`) and Backlog.md: how they name things, shape output, filter, validate and teach agents. Note what to take and what to avoid.

### Phase 2: What agents try

- [ ] Guessability study: give a cold agent (no skill, `tdn` on the path, a test vault) real questions using the task 9 harness, and record the commands it guesses before reading any help. The interface agents guess needs the least teaching.
- [ ] "What do you want" interview: a fresh session asked what it would want from the tool. Weigh it below the guessability results, since models asked to design a tool tend to ask for a lot.
- [ ] Ask Danny whether to mine his Claude Code transcripts for real `tdn` calls and the errors they hit. Only with a yes.

### Phase 3: Decisions

- [ ] Rust or TypeScript. Rust links `tdn-core` directly: one small binary, no NAPI or per-platform `.node` files, snapshot tests of output. TypeScript on Bun iterates faster on formatting but needs `tdn-core` through NAPI or WASM. Also consider what changes for npm and Homebrew distribution.
- [ ] Configuration: the shared `~/.taskdn/config.json` and `TASKDN_HOME` from task 11, and how they sit with the `TASKDN_*_DIR` variables this repo relies on to keep agents in test vaults.
- [ ] What happens to `context`, `doctor`, `init` and the other 1.x commands.

### Phase 4: Interface doc

- [ ] Write it in `tdn-cli/docs/developer/`, replacing `cli-interface-guide.md` and `output-format-spec.md`: commands, handles, output contract, query syntax, errors, config. Include sample output for the common commands.
- [ ] Review it with Danny.

## Done when

Danny has approved an interface doc for 2.0 and the Rust-or-TypeScript decision is made.
