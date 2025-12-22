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
| **SDK**         | Core libraries for parsing and manipulating tasks | `tdn-sdk/`     |
| **CLI**         | Command-line interface for humans and AI agents   | `tdn-cli/`     |
| **Desktop App** | Cross-platform Tauri app for day-to-day use       | `tdn-desktop/` |

## Project Structure

This is a **monorepo**. Each `tdn-*` directory is a self-contained project with its own documentation, tests, build configuration etc.

[File tree here]

## Development

Work which cuts accross multiple products can happen in the top-level directory - this will usually be the case for early work new products. Work which is tightly scoped to an individual product should happen in the project's own sub-directory. Each of these is set up to be an entirely independent project and each has its own README with setup instructions.
