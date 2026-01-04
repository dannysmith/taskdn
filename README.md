# Taskdn

**[Documentation & Getting Started](https://tdn.danny.is)**

A task-management system for **individuals** that feels as slick as [Things](https://culturedcode.com/things/) while storing data as markdown files (with YAML frontmatter) on disk. Tasks can be read and manipulated via text editors (Obsidian, VSCode), command line tools, and AI coding assistants.

**The core idea:** provide the right user interface in the right context.

| Tool                | Description                                        | Directory                                                                        | Status         |
| ------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- | -------------- |
| **Specs**           | Formal specifications for the protocol             | `tdn-specs/`                                                                     | ✅ Stable      |
| **CLI**             | Command-line interface for humans and AI agents    | `tdn-cli/`                                                                       | ✅ Stable      |
| **Claude Plugin**   | Claude Code plugin for AI-assisted task management | `tdn-claude-plugin/`                                                             | ✅ Stable      |
| **Desktop App**     | Cross-platform Tauri app for day-to-day use        | `tdn-desktop/`                                                                   | ⌛ In Progress |
| **Obsidian Plugin** | Render task wikilinks as interactive widgets       | [obsidian-taskdn](https://github.com/dannysmith/obsidian-taskdn)                 | ✅ Stable      |
| **Starter Vault**   | Pre-configured Obsidian vault with templates/bases | [tdn-obsidian-starter-vault](https://github.com/dannysmith/tdn-obsidian-starter-vault) | ✅ Stable      |
| **Website**         | Documentation and marketing site                   | `website/`                                                                       | ✅ Stable      |

## Documentation

- [Project Overview & Philosophy](docs/overview.md) – Why this project exists, design decisions. Read first.
- [The Core Specification](tdn-specs/S1-core.md) – Formal spec for task/project/area file formats.

## Installation

### CLI Installation

```bash
brew tap dannysmith/taproom
brew install tdn
```

See [tdn-cli/README.md](tdn-cli/README.md) for more options and usage.

### Claude Plugin Installation

The [Claude Code plugin](tdn-claude-plugin/README.md) teaches Claude to work as a productivity assistant, using the `tdn` CLI to help manage tasks.

**Install from marketplace:**

```
/plugin marketplace add dannysmith/taskdn
/plugin install tdn@tdn-marketplace
```

**Or load locally during development:**

```bash
claude --plugin-dir ./tdn-claude-plugin
```

### Obsidian Plugin Installation

The [Obsidian plugin](https://github.com/dannysmith/obsidian-taskdn) renders wikilinks to task files as interactive checklist widgets. Click to toggle status, open files, or navigate to projects/areas.

See [tdn-obsidian-plugin/README.md](https://github.com/dannysmith/obsidian-taskdn/README.md) for installation instructions.

## Project Structure

This is a **monorepo**. Each `tdn-*` directory is a self-contained project with its own documentation, tests, build configuration etc.

```
taskdn/
├── demo-vault/          # Sample vault for testing
├── docs/                # Project-wide documentation
│   ├── archive/         # Old docs for reference
│   ├── product-overviews/
│   │   ├── cli/         # CLI requirements & tech docs
│   │   └── desktop/     # Desktop app requirements & tech docs
│   ├── tasks-done/      # Completed development tasks
│   └── tasks-todo/      # Active development tasks
├── tdn-cli/             # CLI tool (TypeScript/Bun + Rust)
├── tdn-claude-plugin/   # Claude Code plugin
├── tdn-desktop/         # Desktop app (Tauri v2)
├── tdn-obsidian-plugin/ # Stub with README.md pointing at obsidian-taskdn repo
├── tdn-specs/           # Protocol specifications
└── website/             # Documentation & marketing site (Astro/Starlight)
```

## Development

Work which cuts across multiple products can happen in the top-level directory - this will usually be the case for early work on new products. Work which is tightly scoped to an individual product should happen in the project's own sub-directory. Each of these is set up to be an entirely independent project and each has its own README with setup instructions.

### Monorepo Scripts

Run these from the repository root with `bun <script>`:

| Script | Description |
|--------|-------------|
| `versions` | Show local vs published versions for all products |
| `monorepo:check` | Run lint, typecheck, and tests across all products |
| `cli:install-local` | Install the CLI locally via symlink (for development) |
| `demo:reset` | Reset the dummy test vault to a clean state |
| `demo:import-to-things` | Import demo vault tasks into Things.app |
| `task:complete` | Move a completed dev task to tasks-done |
| `task:rename-done` | Add dates to existing completed task files |

See [docs/developer/releases-and-versioning.md](docs/developer/releases-and-versioning.md) for release processes.
