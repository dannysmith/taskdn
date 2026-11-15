# Task 4: CLI 1.0.2

Fix the CLI's data bugs that affect daily use now. The CLI gets a full redesign later (2.0), so this is fixes only: no refactoring, no new features. Danny and `obsidian-inbox-assistant` use 1.0.1 every day.

Evidence for each bug is in `docs/tasks-todo/temporary/cli-evidence/`.

## Fixes

- [ ] **`--json` output can't be parsed.** `formatOutput` in `tdn-cli/src/output/index.ts` prefixes every output mode with an ANSI reset (`reset.open`), so `tdn list --json | jq` fails. Only human output to a TTY should get colour codes. `obsidian-inbox-assistant` strips them today (`src/assess/context.ts:77`); that can stay as it is.
- [ ] **`new --dry-run` writes the file.** The option is declared in `tdn-cli/src/commands/new.ts` and never read. Make it preview without writing, as `update` and `set` do.
- [ ] **Timestamps are written three different ways.**
  - `tdn-cli/crates/core/src/writer.rs` writes UTC with `Z`.
  - `tdn-cli/src/commands/set.ts` writes `new Date().toISOString().slice(0, 19)`: UTC with no zone, which S1 says to read as local time. So `completed-at` is wrong whenever local time isn't UTC.
  - `tdn-cli/src/commands/append-body.ts` stamps the UTC date, which is wrong near midnight.

  Make all three write local time with its offset (`2026-11-15T14:30:00+00:00`), and the local date where only a date is written. Check that S1's wording allows offsets; Spec 1.1 (task 8) will pin it down.
- [ ] **The skill and website teach a command that fails.** `tdn show "Title"` treats the title as a path. It appears in `tdn-claude-plugin/skills/task-management/` (`SKILL.md`, `examples.md`, `command-reference.md`, `decision-guide.md`) and in `website/src/content/docs/cli/` (`read-commands.mdx`, `working-with-ai.mdx`). Replace each with a command that works, checked against a test vault. The skill is rewritten in task 14, so keep the change minimal.

Each fix gets a focused test.

## Not in this release

- Files with an unknown status or an unquoted wikilink are silently dropped. That's a spec question (task 8) and gets fixed in `tdn-core`. Include a small fix here only if Danny has hit it in real use.
- Lookup inconsistencies, unvalidated references and the duplicate formatters are all for the 2.0 redesign.

## Release

- [ ] `cd tdn-cli && bun run release:prepare 1.0.2`.
- [ ] This is the first release through task 2's workflow. Check that:
  - the GitHub release is not marked "Latest"
  - `desktop-v0.1.7` still is, and `releases/latest/download/latest.json` still resolves
  - npm has 1.0.2
  - the Homebrew tap PR was opened
  - a release post appears on the website
- [ ] Update the locally installed `tdn` and confirm `tdn list --json | jq .` works.

## Done when

1.0.2 is released with the fixes above, and desktop auto-update is unaffected.
