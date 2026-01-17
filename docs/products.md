# Taskdn Products

This document provides a reference overview of each product in the Taskdn suite. It's intended for both human developers and AI agents to quickly understand what products exist and where to find information about them.

---

## 1. Taskdn CLI

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn CLI |
| **Shortname** | `tdn` |
| **Emoji** | ⌨️ |
| **Monorepo Path** | `tdn-cli/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-cli/README.md |
| **Website Docs** | `website/src/content/docs/cli/` |
| **Live Docs** | https://tdn.danny.is/cli/overview/ |
| **Core Tech** | TypeScript (Bun), Rust (NAPI-RS) |

### Description

The CLI is the primary programmatic interface for working with Taskdn data. It's a hybrid TypeScript + Rust application where TypeScript handles the CLI interface, prompts, and output formatting, while Rust (via NAPI-RS bindings) handles performance-critical operations like parsing, search, and file I/O.

The CLI supports three output modes: human mode (coloured terminal output with interactive prompts), AI mode (structured Markdown optimised for LLM consumption), and JSON mode (machine-readable for scripting). Key features include natural language date parsing (`tomorrow`, `next monday`, `+3d`), fuzzy entity lookup by title or path, advanced filtering by status/dates/relationships, and the VaultSession pattern for fast multi-query operations.

---

## 2. Taskdn Desktop

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Desktop |
| **Shortname** | Desktop |
| **Emoji** | 🖥️ |
| **Monorepo Path** | `tdn-desktop/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-desktop/README.md |
| **Website Docs** | `website/src/content/docs/desktop/` |
| **Live Docs** | https://tdn.danny.is/desktop/overview/ |
| **Core Tech** | React 19, Tauri v2, Rust, Vite 7, shadcn/ui v4, Tailwind CSS v4, Zustand v5, TanStack Query v5 |

### Description

The desktop app provides a native task management experience on macOS, Windows, and Linux. Built with Tauri v2 for the backend (Rust) and React 19 for the frontend, it makes working with task files feel like using a proper task app rather than editing markdown.

Key features include quick capture (global keyboard shortcut to add tasks from anywhere), multiple views (Today, This Week, Calendar, Kanban boards), a task detail sidebar for editing all fields, command palette for quick actions, fuzzy search across all entities, and URL scheme deep linking for integration with other apps and scripts. The app is keyboard-first but works well with mouse too. Data stays as files on disk—the app is purely an interface layer.

---

## 3. Obsidian Plugin

| Field | Value |
|-------|-------|
| **Human Name** | Obsidian Taskdn Plugin |
| **Shortname** | `obsidian-taskdn` |
| **Emoji** | 💎 |
| **Monorepo Path** | `tdn-obsidian-plugin/` (stub only) |
| **Separate Repo** | `~/dev/obsidian-taskdn` |
| **GitHub README** | https://github.com/dannysmith/obsidian-taskdn/blob/main/README.md |
| **Website Docs** | `website/src/content/docs/obsidian/` |
| **Live Docs** | https://tdn.danny.is/obsidian/plugin/ |
| **Core Tech** | TypeScript, Obsidian Plugin API |

### Description

The Obsidian plugin bridges Taskdn with Obsidian vaults. It transforms wikilinks to task files (e.g., `[[call-dentist]]`) into interactive inline widgets that display the task's status, project, area, and due/defer dates without opening the file.

Widgets include a checkbox for toggling completion (switches between `ready` and `done`), a coloured left border indicating status (blue for inbox, yellow for in-progress, red for blocked, etc.), and clickable titles that open the task file. When task links appear in bullet lists, they behave like native Obsidian checklists with strikethrough styling on completion. The plugin also provides a right-click context menu to convert any checklist item into a full Taskdn task file.

The plugin lives in a separate repository to facilitate publishing to the Obsidian community plugins directory.

---

## 4. Claude Code Plugin

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Claude Code Plugin |
| **Shortname** | `tdn-claude-plugin` |
| **Emoji** | 🤖 |
| **Monorepo Path** | `tdn-claude-plugin/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-claude-plugin/README.md |
| **Website Docs** | `website/src/content/docs/claude-code/` |
| **Live Docs** | https://tdn.danny.is/claude-code/overview/ |
| **Core Tech** | Claude Code plugin system, Markdown skill definitions |

### Description

The Claude Code plugin teaches Claude to work as a productivity assistant for task management. Rather than Claude needing to figure out the file format and CLI commands from scratch each session, the plugin provides comprehensive knowledge upfront.

The plugin includes a skill that covers the tdn system (tasks, projects, areas hierarchy), all CLI commands with appropriate flags, when to use CLI vs direct file access, and a productivity-focused mindset (thinking like a GTD coach). It also provides slash commands: `/tdn:today` shows what needs attention, and `/tdn:prime` loads context about the user's current tasks and projects. Once installed, users can make natural requests like "What's overdue?" or "Create a task to call the dentist, due Friday" and Claude handles the details.

---

## 5. Protocol Specifications

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Protocol Specifications |
| **Shortname** | Specs / `tdn-specs` |
| **Emoji** | 📋 |
| **Monorepo Path** | `tdn-specs/` |
| **GitHub Folder** | https://github.com/dannysmith/taskdn/tree/main/tdn-specs |
| **Website Docs** | `website/src/content/docs/specification/` |
| **Live Docs** | https://tdn.danny.is/specification/overview/ |
| **Core Tech** | Markdown documentation |

### Description

The specifications formally define the Taskdn protocol, ensuring any tool that implements them can interoperate with others. This is what makes Taskdn a file format as much as a set of apps—your tasks aren't trapped in one application.

**S1 (Core Data Storage)** defines the file format: tasks, projects, and areas as Markdown files with YAML frontmatter. It specifies what fields exist, what values are valid, and how files should be organised. Conformance means your files work with any S1-compliant tool.

**S2 (Implementation Guidance)** provides recommendations for how implementations should behave when reading, writing, and presenting S1-compliant data. Conformance means your tool behaves consistently and predictably alongside other implementations.

---

## 6. Obsidian Starter Vault

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Obsidian Starter Vault |
| **Shortname** | Starter Vault |
| **Emoji** | 🗄️ |
| **Separate Repo** | `~/dev/tdn-obsidian-starter-vault` |
| **GitHub README** | https://github.com/dannysmith/tdn-obsidian-starter-vault/blob/main/README.md |
| **Website Docs Page** | `website/src/content/docs/obsidian/starter-vault.mdx` |
| **Live Docs** | https://tdn.danny.is/obsidian/starter-vault/ |
| **Core Tech** | Markdown files, Obsidian Bases, Obsidian Templates |

### Description

The starter vault is a pre-configured Obsidian vault that provides a working Taskdn setup out of the box. Clone it, open it in Obsidian, and you have a complete task management system with example content to learn from.

It includes templates for creating tasks, projects, and areas (with the correct frontmatter fields pre-filled), pre-configured Obsidian Bases with filtered views (All Tasks, Active, Inbox, Ready, In Progress, Blocked, Overdue, etc.), Overview pages in each directory with embedded bases, and example tasks, projects, and areas demonstrating the file format. The vault also includes a CLAUDE.md file so AI assistants understand the structure, and a web clipper template for saving web pages directly as inbox tasks.

---

## 7. Taskdn Website

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Website |
| **Shortname** | Website |
| **Emoji** | 🌐 |
| **Monorepo Path** | `website/` |
| **GitHub Folder** | https://github.com/dannysmith/taskdn/tree/main/website |
| **Live Site** | https://tdn.danny.is |
| **Core Tech** | Astro, Starlight, Flexoki theme |

### Description

The public-facing website serves as the central documentation hub for all Taskdn products. It provides a homepage introducing the project, comprehensive documentation for each product, and developer resources for contributors.

The site is built with Astro and uses Starlight (a documentation framework) with the Flexoki colour theme. Content is authored as MDX files with access to custom components for demos, code blocks, tabs, and other interactive elements. The site is statically generated and deployed to GitHub Pages via GitHub Actions. It also generates an `llms.txt` file for AI consumption via the starlight-llms-txt plugin.

Documentation is organised into: Start Here (getting started, philosophy, setup), product-specific guides (Desktop, CLI, Obsidian, Claude Code), Specification (S1 and S2), Reference (CLI reference, keyboard shortcuts, URL schemes), and Developer docs (contributing, roadmap).
