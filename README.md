# Taskdn

A task-management system for **individuals** that feels as slick as [Things](https://culturedcode.com/things/) while storing data as markdown files (with YAML frontmatter) on disk. Tasks can be read and manipulated via text editors (Obsidian, VSCode), command line tools, and AI coding assistants.

**The core idea:** provide the right user interface in the right context.

## Documentation

- [Project Overview & Philosophy](docs/overview.md) – Why this project exists, design decisions. Read first.
- [The Core Specification](tdn-specs/S1-core.md) – Formal spec for task/project/area file formats.

## The Suite of Tools

| Tool            | Description                                       | Directory      |
| --------------- | ------------------------------------------------- | -------------- |
| **Specs**       | Formal specifications for the protocol            | `tdn-specs/`   |
| **CLI**         | Command-line interface for humans and AI agents   | `tdn-cli/`     |
| **Desktop App** | Cross-platform Tauri app for day-to-day use       | `tdn-desktop/` |

The CLI contains an embedded Rust core library that handles parsing, validation, and file operations. When the desktop app is ready, this core will be extracted to a shared workspace crate.

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
├── tdn-desktop/         # Desktop app (Tauri v2)
└── tdn-specs/           # Protocol specifications
    └── json-schemas/    # JSON schemas for validation
```

## Development

Work which cuts across multiple products can happen in the top-level directory - this will usually be the case for early work on new products. Work which is tightly scoped to an individual product should happen in the project's own sub-directory. Each of these is set up to be an entirely independent project and each has its own README with setup instructions.
