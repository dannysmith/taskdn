# Claude Code / AI Agent Instructions for Taskdn Repo

## Monorepo Context

This is a **monorepo root**. After initial work on a new product, most work sessions should happen in a specific product sub-directory (e.g., `tdn-desktop/`, `tdn-cli/`). Each product has its own `CLAUDE.md` with product-specific instructions.

## Documentation

All top-level documentation lives in `docs/`. See @docs/README.md for a complete index.

### When Starting a Session

- `docs/overview.md` — Project background, goals, and file format summary
- `docs/products.md` — Index of all products with tech stacks and links

### When Making Product Decisions

- `docs/product-principles.md` — Core principles guiding product design

### When Doing Visual/Design Work

- `docs/developer/semantics-and-visual-design.md` — Entity styling, colors, icons, status treatments
- `docs/developer/brand.md` — Brand aesthetic and visual identity

### When Working on Releases

- `docs/developer/releases-and-versioning.md` — Versioning strategy

### For Monorepo Structure

- `docs/monorepo-architecture.md` — How the codebase is organized

### For Development Task Tracking

- @docs/tasks.md — How dev tasks work (NOT Taskdn tasks)
- `docs/tasks-todo/` — Active tasks
- `docs/tasks-done/` — Completed tasks (may be out of date)

### User-Facing Documentation

The canonical user-facing documentation for all products lives in `website/src/content/docs/`. This is often the best place to understand how features work from a user's perspective.

### Product-Specific Developer Docs

Most product sub-directories have their own `tdn-<name>/docs/` with `developer/`, `tasks-todo/` etc. Internal design patterns and implementation details go there. If in doubt, ask the user.

## Product Sub-directories

See `docs/products.md` for detailed descriptions of each product.

| Directory              | What it is                        | Language/Stack        | Documentation                                                                        |
| ---------------------- | --------------------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `tdn-cli/`             | CLI tool                          | TypeScript/Bun + Rust | [tdn-cli/README.md](tdn-cli/README.md), [Website: CLI](https://tdn.danny.is/cli)     |
| `tdn-desktop/`         | Desktop app                       | Tauri v2 & React      | [tdn-desktop/README.md](tdn-desktop/README.md), [Website: Desktop](https://tdn.danny.is/desktop) |
| `tdn-claude-plugin/`   | Claude Code plugin                | Markdown (skills)     | [tdn-claude-plugin/README.md](tdn-claude-plugin/README.md)                           |
| `tdn-obsidian-plugin/` | Obsidian plugin (external repo)   | —                     | [obsidian-taskdn](https://github.com/dannysmith/obsidian-taskdn)                     |
| `tdn-specs/`           | Protocol specifications           | Markdown              | [tdn-specs/S1-core.md](tdn-specs/S1-core.md)                                         |
| `website/`             | Docs & marketing site             | Astro/Starlight       | [https://tdn.danny.is](https://tdn.danny.is)                                         |

**Note:** The CLI contains an embedded Rust core library (via NAPI-RS). See `tdn-cli/docs/developer/architecture-guide.md` for details.

## Important: "Tasks" in This Project

This project builds a task management system, but we also use tasks to track development work. **Don't confuse them:**

- **Development tasks** – What you create when the user says "create a task" during a coding session. These are simple markdown files for tracking work (e.g., `task-1-implement-parser.md`). They do NOT follow the Taskdn specification.
- **Taskdn tasks** – The task format we're building the app to handle. These follow `tdn-specs/S1-core.md`. Test against the vaults in `demo-vaults/` (see below).

**When the user asks you to "create a task":**

- If at top level → create in `docs/tasks-todo/` following the format there
- If in a sub-project → create in that project's `docs/tasks-todo/` folder per its local `CLAUDE.md`
- Never apply the Taskdn specification to development tasks

## Development Rules

1. **Read before editing** – Understand existing code and patterns before making changes.
2. **Follow the specs** – All task/project/area file handling must conform to `tdn-specs/S1-core.md`, and where appropriate to `tdn-specs/S2-implementation-guidance.md`.
3. **Use `bun`** – Prefer `bun` over `pnpm` or `npm` for JavaScript/TypeScript projects.
4. **Sub-project autonomy** – No product may depend on another at runtime: each must install and work without the others present. Shared libraries built into more than one product are fine (e.g. a Rust crate used by both the CLI and the desktop app). Ask the user before introducing a new shared library or any other dependency between products.
5. **Spec changes are serious** – Changes to the specification docs affect all implementations. Always clearly confirm with the user before making any changes to files in `tdn-specs/`.

## Test Vaults

Templates are committed in `demo-vault-templates/`. Never point `tdn`, the desktop app or the Obsidian plugin at them: render a disposable copy into the gitignored `demo-vaults/`, where every date is moved so the template's reference date lands on today.

| Template     | What it is                                                                         |
| ------------ | ---------------------------------------------------------------------------------- |
| `demo`       | A realistic vault covering every status and date case. Use this one by default     |
| `edge-cases` | Small files that each test one awkward case, with notes on what the CLI does today |

```bash
bun run vault render demo                   # demo-vaults/demo, dated to today
cd demo-vaults/demo && tdn today --ai       # rendered vaults include a .taskdn.json
bun run vault generate big --size large     # 5,000 generated tasks in demo-vaults/big
bun run vault                               # all commands: list, new, shift, report...
```

Re-render whenever you want a clean copy. Each template's README lists what it covers. Rendered vaults open in Obsidian with the plugin linked from `~/dev/obsidian-taskdn`, and the desktop app's "Use Demo Vault" button (debug builds) points at `demo-vaults/demo`. The toolkit lives in `scripts/vaults/`.
