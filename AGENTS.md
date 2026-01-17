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
- **Taskdn tasks** – The task format we're building the app to handle. These follow `tdn-specs/S1-core.md` and go in `demo-vault/` for testing.

**When the user asks you to "create a task":**

- If at top level → create in `docs/tasks-todo/` following the format there
- If in a sub-project → create in that project's `docs/tasks-todo/` folder per its local `CLAUDE.md`
- Never apply the Taskdn specification to development tasks

## Development Rules

1. **Read before editing** – Understand existing code and patterns before making changes.
2. **Follow the specs** – All task/project/area file handling must conform to `tdn-specs/S1-core.md`, and where appropriate to `tdn-specs/S2-interface-design.md` and `tdn-specs/S3-data-read-write.md`.
3. **Use `bun`** – Prefer `bun` over `pnpm` or `npm` for JavaScript/TypeScript projects.
4. **Sub-project autonomy** – Each `tdn-*` directory is self-contained. Don't create cross-project dependencies without good reason, and always ask the user first.
5. **Spec changes are serious** – Changes to the specification docs affect all implementations. Always clearly confirm with the user before making any changes to files in `tdn-specs/`.

## Demo Vault

Two vaults exist for testing:

| Vault               | Purpose                     | In Git?         |
| ------------------- | --------------------------- | --------------- |
| `demo-vault/`       | Canonical "golden" copy     | Yes             |
| `dummy-demo-vault/` | Disposable copy for testing | No (gitignored) |

**Always test against `dummy-demo-vault/`** so you don't corrupt the canonical version.

Reset the dummy vault with:

```bash
./scripts/reset-dummy-vault.sh
```

Structure (same in both):
| Path | Contents |
|------|----------|
| `*/tasks/` | Active task files (18 files covering all 7 statuses) |
| `*/tasks/archive/` | Archived completed tasks |
| `*/projects/` | Project files (9 files covering all 6 statuses) |
| `*/areas/` | Area files (7 files, including one archived) |

See `demo-vault/README.md` for full details on spec coverage.
