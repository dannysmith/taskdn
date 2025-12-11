# Taskdn

A task-management system for **individuals** that feels as slick as [Things](https://culturedcode.com/things/) while storing data as markdown files (with YAML frontmatter) on disk. Tasks can be read and manipulated via text editors (Obsidian, VSCode), command line tools, and AI coding assistants.

**The core idea:** provide the right user interface in the right context.

## Documentation

- [Philosophy & Core Principles](docs/user-guide/1-philosophy.md) – Why this project exists and design decisions
- [The Specification](docs/user-guide/2-the-specification.md) – Formal spec for task/project/area file formats

## The Suite of Tools

| Tool | Description | Directory |
|------|-------------|-----------|
| **Specification** | File format spec with JSON schemas for validation | `docs/` |
| **Rust SDK** | Core library for parsing and manipulating tasks | `taskdn-rust/` |
| **TypeScript SDK** | Node.js bindings to the Rust SDK | `taskdn-ts/` |
| **CLI** | Command-line interface for humans and AI agents | `taskdn-cli/` |
| **Desktop App** | Cross-platform Tauri app for day-to-day use | `taskdn-desktop/` |
| **Obsidian Plugin** | Lightweight task integration for Obsidian | `taskdn-obsidian-plugin/` |
| **Claude Code Skill** | AI-assisted task management | `taskdn-claude-code-skill/` |
| **Website** | Marketing and documentation site | `taskdn-website/` |

## Project Structure

This is a **monorepo**. Each `taskdn-*` directory is a self-contained project with its own documentation, tests, and build configuration.

```
taskdn/
├── .github/                      # CI/CD workflows
├── demo-vault/                   # Reference Obsidian vault for testing
├── docs/
│   ├── user-guide/               # Specification and philosophy docs
│   ├── schemas/                  # JSON Schema files
│   ├── tasks-todo/               # Project-wide task tracking
│   └── tasks-done/               # Completed tasks
├── taskdn-rust/                  # Rust SDK
├── taskdn-ts/                    # TypeScript SDK
├── taskdn-cli/                   # CLI tool
├── taskdn-desktop/               # Tauri desktop app
├── taskdn-obsidian-plugin/       # Obsidian plugin
├── taskdn-claude-code-skill/     # Claude Code skill
└── taskdn-website/               # Marketing website
```

## Development

Most work happens in individual sub-projects. Each has its own README with setup instructions.

**Working on a specific tool:**
```bash
cd taskdn-rust    # or taskdn-cli, taskdn-desktop, etc.
# Follow that project's README
```

**Top-level tasks** (cross-project coordination, spec changes) are tracked in `docs/tasks-todo/`.
