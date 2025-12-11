# Philosophy & Core Principles

The advent of AI coding tools like Claude Code has caused many people to migrate their notes from web-based platforms like Notion to local file-based systems. By storing notes as markdown files on disk we can use AI Agents and command line tools to interact with them, and can manually interact with them through editors like Obsidian.

These tools are designed to work with written knowledge, not **tasks**. Yet task management is an integral part of knowledge management.

## Goal

This project aims to provide a task-management system for **individuals** which feels as slick as [Things](https://culturedcode.com/things/) while storing its data as markdown files (with YAML frontmatter) on disk, so they can **also** be read and manipulated via text editors (eg. Obsidian, VSCode), command line tools and AI coding tools.

It also aims to provide simple Developer SDKs and a CLI tool for efficiently interacting with tasks, along with other helpful tools like a Claude Code Skill and a minimal Obsidian plugin.

Ultimately, this is all about **providing the right user interface in the right context**

## Core Principles

### Areas -> Projects -> Tasks

We draw on GTD and PARA methods when it comes to hierachy.

- **Tasks** are actionable and small. The system should only contain _actually actionable_ tasks. Vague planning checklists should probably belong somewhere else.
- **Projects** are collections of tasks, and should be "finishable".
- **Areas** are ongoing areas of responsibility.

We care mainly about tasks.

### Tasks as local markdown files

Each task is a single markdown file with YAML frontmatter. Notes, comments, subtasks and the like can be included in the body of the document as with any markdown file.

The tools in this project are all **interfaces** for interacting with these files.

### Opinionated about tasks, agnostinc about the rest

We are intentionall opinionated about how tasks are managed, and users do not have much scope for configuration or customisation. We are totally unopinionated about everything else. Users are free to keep their task docs wherever they want on disk, format their project and Area docs however they wish, add additional frontmatter to task docs etc.

### Low-friction UI, optimised for the context

The whole point of this project is to an interface which is **appropriate** for task management in a given context. The frictions felt by users depends on context: if we're working on something else, capturing a task must be fast and require few clicks. If we're in "doing mode" our task list should only show us tasks which are up next. If we're in "planning mode" we probably need more contextual information available.

This applies to the CLI too – human users should see well-formatted output and perhaps interactive UIs; robot users should see output optimised for their needs. Likewise, the developer libraries should expose sensible, predictable, typesafe APIs etc.

### Minimal by Default

## The Suite of Tools

- **Specification** – As simple, unambiguous specification for what task files should look like so other tools can consume them.
- **Rust SDK** - A rust library package for querying and interacting with tasks efficiently and safely.
- **Typescript SDK** - A typescrpt wrapper around the Rust package.
- **CLI** - A CLI designed for both humans and AI agents to interact with tasks via the command line.
- **Desktop App** - A cross-platform desktop app for working with tasks day-to-day.
- **Obsidian Plugin** - A lightweight obsidian plugin that renders links to task docs as "checkable" tasks, and makes it easy to create such links or convert a checklist item to a task.
- **Obsidian Bits** - Bases, Templates & Webclipper Templates designed to work with the specification.
- **Agent Skill** - A Claude Skill and commands designed to work with the system in Claude Code or other Agentic coding tools.

## Non-Goals

- Anything beyond task & project management.
- Any team collaborationfeatures - this is for individuals.
- Anything online (for now).
