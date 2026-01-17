# Taskdn Products

Index of all products in the Taskdn suite. For design philosophy, see [Product Principles](./product-principles.md).

---

## 1. Taskdn CLI

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn CLI |
| **Shortname** | `tdn` |
| **Emoji** | ⌨️ |
| **Monorepo Path** | `tdn-cli/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-cli/README.md |
| **Website Docs Path** | `website/src/content/docs/cli/` |
| **Live Docs** | https://tdn.danny.is/cli/overview/ |
| **Core Tech** | TypeScript (Bun) + Rust (NAPI-RS) |

The primary programmatic interface. TypeScript handles CLI interface and output formatting; Rust handles parsing, search, and file I/O.

Three output modes: human (coloured terminal with prompts), AI (structured Markdown for LLMs), and JSON (scripting). Features natural language dates, fuzzy entity lookup, and advanced filtering.

---

## 2. Taskdn Desktop

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Desktop |
| **Shortname** | Desktop |
| **Emoji** | 🖥️ |
| **Monorepo Path** | `tdn-desktop/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-desktop/README.md |
| **Website Docs Path** | `website/src/content/docs/desktop/` |
| **Live Docs** | https://tdn.danny.is/desktop/overview/ |
| **Core Tech** | Tauri v2, React 19, Rust |

Native task management app for macOS, Windows, and Linux. Makes working with task files feel like a proper task app.

Features: quick capture (global shortcut), multiple views (Today, Week, Calendar, Kanban), command palette, fuzzy search, URL scheme deep linking. Keyboard-first, data stays on disk.

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
| **Website Docs Path** | `website/src/content/docs/obsidian/` |
| **Live Docs** | https://tdn.danny.is/obsidian/plugin/ |
| **Core Tech** | TypeScript, Obsidian Plugin API |

Transforms wikilinks to task files into interactive inline widgets showing status, project, area, and dates. Checkbox toggles completion; coloured border indicates status. Right-click any checklist item to convert it to a full task file.

Lives in a separate repository for Obsidian community plugins publishing.

---

## 4. Claude Code Plugin

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Claude Code Plugin |
| **Shortname** | `tdn-claude-plugin` |
| **Emoji** | 🤖 |
| **Monorepo Path** | `tdn-claude-plugin/` |
| **GitHub README** | https://github.com/dannysmith/taskdn/blob/main/tdn-claude-plugin/README.md |
| **Website Docs Path** | `website/src/content/docs/claude-code/` |
| **Live Docs** | https://tdn.danny.is/claude-code/overview/ |
| **Core Tech** | Claude Code plugin system, Markdown skills |

Teaches Claude to work as a productivity assistant. The skill covers the tdn system, CLI commands, and a GTD-focused mindset. Slash commands: `/tdn:today` shows what needs attention, `/tdn:prime` loads context.

---

## 5. Protocol Specifications

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Protocol Specifications |
| **Shortname** | `tdn-specs` |
| **Emoji** | 📋 |
| **Monorepo Path** | `tdn-specs/` |
| **GitHub Folder** | https://github.com/dannysmith/taskdn/tree/main/tdn-specs |
| **Website Docs Path** | `website/src/content/docs/specification/` |
| **Live Docs** | https://tdn.danny.is/specification/overview/ |

Formal definitions ensuring interoperability between tools.

**S1 (Core)**: File format—tasks, projects, areas as Markdown with YAML frontmatter. Fields, values, file organisation.

**S2 (Implementation)**: Behavioral guidance for reading, writing, and presenting S1 data consistently.

---

## 6. Obsidian Starter Vault

| Field | Value |
|-------|-------|
| **Human Name** | Taskdn Obsidian Starter Vault |
| **Shortname** | Starter Vault |
| **Emoji** | 🗄️ |
| **Separate Repo** | `~/dev/tdn-obsidian-starter-vault` |
| **GitHub README** | https://github.com/dannysmith/tdn-obsidian-starter-vault/blob/main/README.md |
| **Website Docs Path** | `website/src/content/docs/obsidian/starter-vault.mdx` |
| **Live Docs** | https://tdn.danny.is/obsidian/starter-vault/ |

Pre-configured Obsidian vault with templates, Bases, and example content. Clone and open for a working Taskdn setup immediately.

Includes: templates with correct frontmatter, pre-configured Bases views, example tasks/projects/areas, CLAUDE.md for AI assistants, web clipper template.

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

Public documentation hub. Homepage, product guides, specifications, developer resources. Statically generated, deployed via GitHub Actions. Generates `llms.txt` for AI consumption.
