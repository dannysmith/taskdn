# Claude Instructions for Taskdn

## Monorepo Context

This is a **monorepo root**. Most work sessions should happen in a specific sub-project directory (e.g., `taskdn-rust/`, `taskdn-cli/`). Each sub-project has its own `CLAUDE.md` with project-specific instructions.

**If you're working on a specific tool**, `cd` into that directory and follow its local `CLAUDE.md`.

**This top-level context is for:**

- Cross-project coordination
- Specification changes (`docs/user-guide/`)
- High-level planning (`docs/tasks-todo/`)
- Changes that affect multiple sub-projects

## Key Documentation

- `docs/user-guide/1-philosophy.md` – Core principles and design decisions
- `docs/user-guide/2-the-specification.md` – **The authoritative spec** for task/project/area file formats
- `docs/schemas/` – JSON Schema files for validation
- `docs/tasks-todo/` – Project-wide task tracking (phases)
- `docs/tasks.md` – How task management works in this repo

## Sub-Projects

| Directory                   | What it is          | Language/Stack    |
| --------------------------- | ------------------- | ----------------- |
| `taskdn-rust/`              | Core SDK            | Rust              |
| `taskdn-ts/`                | TypeScript bindings | TypeScript, NAPI  |
| `taskdn-cli/`               | CLI tool            | TBD               |
| `taskdn-desktop/`           | Desktop app         | Tauri, TypeScript |
| `taskdn-obsidian-plugin/`   | Obsidian plugin     | TypeScript        |
| `taskdn-claude-code-skill/` | Claude Code skill   | Markdown          |
| `taskdn-website/`           | Marketing site      | TBD               |

## Important: "Tasks" in This Project

This project builds a task management system, but we also use tasks to track development work. **Don't confuse them:**

- **Development tasks** – What you create when the user says "create a task" during a coding session. These are simple markdown files for tracking work (e.g., `task-1-implement-parser.md`). They do NOT follow the Taskdn specification.
- **Taskdn tasks** – The task format we're building the app to handle. These follow `docs/user-guide/2-the-specification.md` and go in `demo-vault/` for testing.

**When the user asks you to "create a task":**

- If at top level → create in `docs/tasks-todo/` following the format there
- If in a sub-project → create in that project's `docs/tasks-todo/` folder per its local `CLAUDE.md`
- Never apply the Taskdn specification to development tasks

## Development Rules

1. **Read before editing** – Understand existing code and patterns before making changes.
2. **Follow the spec** – All task/project/area file handling must conform to `docs/user-guide/2-the-specification.md`.
3. **Use `bun`** – Prefer `bun` over `pnpm` or `npm` for JavaScript/TypeScript projects.
4. **Sub-project autonomy** – Each `taskdn-*` directory is self-contained. Don't create cross-project dependencies without good reason.
5. **Spec changes are serious** – Changes to the specification affect all implementations. Think carefully and update all relevant sub-projects.

## When Working at Top Level

If you're making changes here (not in a sub-project):

- **Spec changes**: Update `docs/user-guide/2-the-specification.md` and the JSON schemas in `docs/schemas/`
- **Philosophy/docs**: Update `docs/user-guide/` files
- **Cross-project tasks**: Use `docs/tasks-todo/` for tracking
- **Demo vault**: `demo-vault/` is for testing – add example task/project/area files there
