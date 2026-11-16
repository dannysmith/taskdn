# Task 5: Persona vault skill

A repo skill that has Claude build a realistic test vault for an invented person, with a playbook of things to try in the desktop app, CLI, Obsidian plugin and Claude Code skill. Closes #26.

## Background

- Task 5 built the vault toolkit (`bun run vault`, `scripts/vaults/`) and the `demo` and `edge-cases` templates. See `docs/tasks-done/task-2026-11-16-test-vaults.md`, and `demo-vault-templates/demo/README.md` for the date layer a good vault covers.
- #26 proposed a base-vault repo and a `create-test-vault` script. The toolkit replaces both: `bun run vault new <name>` makes an empty vault in `demo-vaults/` with Obsidian, the plugin and `.taskdn.json` set up, and `scripts/vaults/lib/writers.ts` writes valid entity files.
- `vault generate` already covers volume. Persona vaults are for realism: what a particular kind of person's tasks actually look like.

## The skill

`.claude/skills/generate-persona-vault/SKILL.md`, invoked as `/generate-persona-vault`.

**Inputs**, both optional:

- **Persona:** a description of the person and how they work. Without one, Claude invents someone.
- **Size:** tiny, small, medium, large or huge. Defaults to small. Sets rough counts of areas, projects and tasks.

**Knobs** Claude picks from, so vaults vary (from #26):

| Knob                     | Range                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| Tech-savviness           | Grandma to nerdy programmer: shapes task types and which tools they use |
| Preferred tool           | CLI, desktop app, Obsidian or Claude Code                           |
| Number of areas          | Low, medium, high                                                   |
| Active projects          | Low, medium, high, extreme (20+ active, more in planning)           |
| Length of use            | New user (no history) to years (big archive, dropped and paused projects, archived areas) |
| Task granularity         | Tiny GTD-style tasks, or big tasks with checklists in the body      |

**Fixed traits:** a short list that rules out people who'd never use a file-based task system.

**Steps:**

1. Write the persona: name, job, where they live, a description of them, how they manage tasks and what their day looks like, a short summary, and hard constraints from the knobs (e.g. "no more than 5 active projects").
2. `bun run vault new <name>`, with the name based on the persona.
3. Write `persona.md`, then `vault-plan.md` with the areas and projects and the reasoning behind them.
4. Create areas and projects, then tasks, through a small script that calls the writers (dates relative to the vault's reference date). Large vaults use a subagent for tasks.
5. A subagent reviews everything critically for realism and consistency and fixes what it finds.
6. Write `playbook.md`: scenarios to try in each tool, e.g. "Do a weekly review in the desktop app: are the right tasks surfaced?"
7. Check with `bun run vault report` and `tdn doctor`; fix any problems.
8. Tell the user how to open it in each tool.

## Phases

- [ ] Write the skill.
- [ ] Generate one persona vault end to end and review it together. A library of personas isn't needed yet.
- [ ] Document it in `AGENTS.md`'s test vaults section, and close #26.

## Gotchas

- **Dates must be relative.** Write every date from the vault's reference date, using the date layer in the demo README as a checklist, so the vault can be shifted later. Avoid weekdays, months and years in titles and prose.
- **Persona notes aren't entities.** `persona.md`, `vault-plan.md` and `playbook.md` go in the vault root, outside the entity folders, so tools ignore them.
- **Writing the skill needs permission.** The sandbox blocks writes to `.claude/skills/`, so creating the skill file will prompt.
- **Keepers can become templates.** A vault worth keeping can be committed to `demo-vault-templates/` with a `.vault.json` reference date.

## Done when

- `/generate-persona-vault` with no arguments produces a believable vault, with a persona, plan and playbook, that passes `vault report` and `tdn doctor`.
- One generated vault has been reviewed and #26 is closed.
