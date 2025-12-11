# Taskdn

## Goal

This project aims to provide a task-management system for **individuals** which feels as slick as [Things](https://culturedcode.com/things/) while storing its data as markdown files (with YAML frontmatter) on disk, so they can **also** be read and manipulated via text editors (eg. Obsidian, VSCode), command line tools and AI coding tools.

It also aims to provide simple Developer SDKs and a CLI tool for efficiently interacting with tasks, along with other helpful tools like a Claude Code Skill and a minimal Obsidian plugin.

Ultimately, this is all about **providing the right user interface in the right context**

## The Suite of Tools

- **Specification** – As simple, unambiguous specification for what task files should look like so other tools can consume them.
- **Rust SDK** - A rust library package for querying and interacting with tasks efficiently and safely.
- **Typescript SDK** - A typescrpt wrapper around the Rust package.
- **CLI** - A CLI designed for both humans and AI agents to interact with tasks via the command line.
- **Desktop App** - A cross-platform desktop app for working with tasks day-to-day.
- **Obsidian Plugin** - A lightweight obsidian plugin that renders links to task docs as "checkable" tasks, and makes it easy to create such links or convert a checklist item to a task.
- **Obsidian Bits** - Bases, Templates & Webclipper Templates designed to work with the specification.
- **Agent Skill** - A Claude Skill and commands designed to work with the system in Claude Code or other Agentic coding tools.

## Project Structure

This is structured as a monorepo. Each `taskdn-*` is a self-contained project which should contain its own `docs/` directory for developer documentation, task management etc. The top-level `docs/` directory should only be used to store the core documentation and high-level phased plan docs.

```
|- .github/                   # Github Actions, workflows etc
|- demo-vault/                # Reference obsidian vault for testing
|- docs/user-guide/           # Overarching user documentation for the project, including specification
|- docs/schemas/              # JSON Schema files for validation
|- docs/tasks-todo/           # High-level plan, as seperate tasks
|- docs/tasks-done/           # Completed Phases
|- taskdn-rust/               # Rust Library
|- taskdn-ts/                 # Typescript Library
|- taskdn-cli/                # CLI Application
|- taskdn-obsidian-plugin/    # Obsidian Plugin
|- taskdn-desktop/            # Tauri Desktop app
|- taskdn-claude-code-skill/  # Claude code Skill
|- taskdn-website/            # Marketing website
```
