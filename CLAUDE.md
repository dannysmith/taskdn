# Claude Instructions for Taskdn

## Monorepo Context

This is a **monorepo root**. After initial work on a new product, most work sessions should happen in a specific product sub-directory (e.g., `tdn-desktop/`, `tdn-cli/`). Each product has its own `CLAUDE.md` with product-specific instructions.

## Documentation

All top level documentation lives in `docs/`.

- `docs/overview.md` - General Overview of the Project, Goals, Products, Principles etc.
- `docs/roadmap-and-approach.md` - Approach to development & Eng principles, high-level roadmap.
- `docs/tasks-todo` - See @docs/tasks.md.
- `docs/developer` - Technical documentation common to all products.

  `docs/tasks-done` - Completed tasks. Old documents which may be useful to reference. Do not reference these without asking the user as they'll be out of date.

- `docs/archive` - Old documents which may be useful to reference. Do not reference these without asking the user as they'll be out of date.

### Product Overview Docs

`docs/product-overviews/` Contains one folder for each of the products in development. This is for storing the important high level evergreen documents for each product. These are stored in the top level docs because it will often be necessary for other projects to reference these.

- Each **must** contain a `<name>-requirements.md` for non-technical product requirements and `<name>-tech.md` for overview of technical architecture, approach, external interface and any major decisions etc.
- Each may contain other relevant evergreen documents.
- As a general rule, these documents should not contain information on **internal** implementation details.

### Detailed Developer Docs

Most of the product sub-directories will have their own `tdn-<name>/docs/` with their own `developer/`, `tasks-todo` etc. Developer-facing documentation about **internal** design patterns, implementation details etc should generally go there. If in dount ask the user.

## Product Sub-directories

| Directory         | What it is  | Language/Stack   | High-level docs                  |
| ----------------- | ----------- | ---------------- | -------------------------------- |
| `taskdn-sdk/`     | Core SDKs   | TBD              | `docs/product-overviews/sdk      |
| `taskdn-cli/`     | CLI tool    | TBD              | `docs/product-overviews/cli`     |
| `taskdn-desktop/` | Desktop app | Tauri v2 & React | `docs/product-overviews/desktop` |

## Archived Projects

`archived-projects` contains code which was developed during a research spike. never look in this directory unless the user expressly asks you to.

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
