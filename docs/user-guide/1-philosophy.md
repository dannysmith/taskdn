# Philosophy & Core Principles

The advent of AI coding tools like Claude Code has caused many people to migrate their notes from web-based platforms like Notion to local file-based systems. By storing notes as markdown files on disk we can use AI Agents and command line tools to interact with them, and can manually interact with them through editors like Obsidian.

These tools are designed to work with written knowledge, not **tasks**. Yet task management is an integral part of knowledge management.

## Goal

This project aims to provide a task-management system for **individuals** which feels as slick as [Things](https://culturedcode.com/things/) while storing its data as markdown files (with YAML frontmatter) on disk, so they can **also** be read and manipulated via text editors (eg. Obsidian, VSCode), command line tools and AI coding tools.

It also aims to provide simple Developer SDKs and a CLI tool for efficiently interacting with tasks, along with other helpful tools like a Claude Code Skill and a minimal Obsidian plugin.

Ultimately, this is all about **providing the right user interface in the right context**.

## Core Principles

### Areas -> Projects -> Tasks

We draw on GTD and PARA methods when it comes to hierarchy.

- **Tasks** are actionable and small. The system should only contain _actually actionable_ tasks. Vague planning checklists should probably belong somewhere else.
- **Projects** are collections of tasks, and should be "finishable".
- **Areas** are ongoing areas of responsibility.

We care mainly about tasks.

### Tasks as local markdown files

Each task is a single markdown file with YAML frontmatter. Notes, comments, subtasks and the like can be included in the body of the document as with any markdown file.

The tools in this project are all **interfaces** for interacting with these files.

### Opinionated about tasks, agnostic about the rest

We are intentionally opinionated about how tasks are managed, and users do not have much scope for configuration or customisation. We are totally unopinionated about everything else. Users are free to keep their task docs wherever they want on disk, format their project and Area docs however they wish, add additional frontmatter to task docs etc.

### Low-friction UI, optimised for the context

The whole point of this project is to provide an interface which is **appropriate** for task management in a given context. The frictions felt by users depends on context: if we're working on something else, capturing a task must be fast and require few clicks. If we're in "doing mode" our task list should only show us tasks which are up next. If we're in "planning mode" we probably need more contextual information available.

This applies to the CLI too – human users should see well-formatted output and perhaps interactive UIs; robot users should see output optimised for their needs. Likewise, the developer libraries should expose sensible, predictable, typesafe APIs etc.

### Minimal by Default

We start with the simplest possible implementation and only add complexity when it provides clear value. This applies to both the file format (few required fields, sensible defaults) and the user interfaces (no bells and whistles unless they're actually necessary). Features earn their place by solving real problems, not by looking impressive.

## The Suite of Tools

Each tool serves a specific context where task management happens:

- **Specification** – A simple, unambiguous specification for task files. This enables interoperability: any tool that reads the spec can work with your tasks.
- **Rust SDK** – A performant, type-safe library for querying and manipulating tasks. The foundation that other tools build on.
- **TypeScript SDK** – Bindings to the Rust SDK for Node.js environments. Makes it easy to build custom integrations.
- **CLI** – Command-line interface for both humans and AI agents. Human-friendly output by default, machine-readable JSON when needed.
- **Desktop App** – A cross-platform Tauri app for day-to-day task management. The primary interface when you're in "task mode".
- **Obsidian Plugin** – Lightweight integration for when you're in "note-taking mode". Renders task links as checkable items without leaving your vault.
- **Obsidian Bits** – Templates and Dataview bases for users who want deeper Obsidian integration.
- **Agent Skill** – Claude Code skill and commands for AI-assisted task management. Lets AI agents understand and work with your tasks.

## Non-Goals

- Anything beyond task & project management.
- Any team collaboration features – this is for individuals.
- Syncing or cloud storage – files live on your local filesystem.
- Anything online (for now).
