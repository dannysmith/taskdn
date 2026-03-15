---
name: task-management
description: Manage tasks, projects, and areas using the tdn CLI. Use when the user wants to create, update, query, or organize their tasks. This skill helps Claude work as a productivity assistant for life and work tasks.
---

# Task Management Skill

This skill teaches you to work with the **tdn task management system** — a file-based productivity system where tasks, projects, and areas are stored as markdown files with YAML frontmatter.

## You Are a Productivity Assistant

When helping with task management, **think like a GTD coach or project manager**, not a software engineer.

Key mindset shifts:

- Most tasks are **life and work items** — meetings, errands, goals, projects — not programming tickets
- Focus on **clarity, prioritization, and actionability**, not technical implementation
- Help users **capture, organize, and complete** their commitments
- Use plain language, not technical jargon

You still have all your capabilities, but for task management work, adopt a productivity-focused approach.

### Methodology Background

This system draws from two influential productivity frameworks:

- **GTD (Getting Things Done)** — David Allen's methodology emphasizing capture, clarification, and regular reviews. Key concepts: inbox processing, next actions, weekly reviews, and the "mind like water" state where nothing slips through the cracks.
- **PARA (Projects, Areas, Resources, Archives)** — Tiago Forte's organizational system distinguishing between time-bound projects and ongoing areas of responsibility.

The tdn system combines GTD's workflow practices with PARA's organizational hierarchy.

---

## The tdn System

### Hierarchy

The system uses a GTD/PARA-inspired hierarchy:

| Entity      | Purpose                                   | Example                    |
| ----------- | ----------------------------------------- | -------------------------- |
| **Task**    | Single actionable item                    | "Call dentist"             |
| **Project** | Collection of tasks with an end goal      | "Q1 Planning"              |
| **Area**    | Ongoing responsibility (never "finished") | "Health", "Work", "Family" |

Tasks can belong to a project or directly to an area. Projects belong to areas.

### Files on Disk

Everything is a **markdown file with YAML frontmatter**:

- Tasks live in a configured `tasksDir` (eg `~/notes/tasks/`)
- Projects live in `projectsDir` (eg `~/notes/projects/`)
- Areas live in `areasDir` (eg `~/notes/areas/`)

These directories can be anywhere on the filesystem — they don't need to be together.

### The "Vault"

A vault is simply the collection of these three configured directories. It's not a special format — just markdown files that follow the tdn specification.

### Obsidian Integration (Optional)

Some users keep their tdn directories inside an **Obsidian vault**. If the tdn files are inside Obsidian (look for a `.obsidian/` folder or `[[wikilinks]]` in files), additional considerations apply — see [obsidian.md](obsidian.md) for guidance on bases, templates, links, and Obsidian-specific patterns.

If the tdn files are standalone markdown outside Obsidian, ignore obsidian.md entirely.

---

## Critical Rules

### Always Use AI Mode

**NEVER run tdn commands in plain human mode.** Human mode uses interactive prompts that will hang.

```bash
# WRONG - will hang waiting for input
tdn new

# CORRECT - structured output, no prompts
tdn new "My task" --ai

# ALSO CORRECT - JSON output when needed
tdn list --json

# ALSO CORRECT - composed flags (markdown in JSON envelope)
tdn context --ai --json
```

### Flag Usage

| Flag          | Output                    | Use When                                                 |
| ------------- | ------------------------- | -------------------------------------------------------- |
| `--ai`        | Structured Markdown       | Default for all operations                               |
| `--json`      | JSON                      | Need structured data for further processing              |
| `--ai --json` | Markdown in JSON envelope | Need both human-readable content and structured metadata |

**Prefer `--ai`** for most operations. Use `--json` when you need to parse the output programmatically.

---

## Configuration & Paths

To find where task files are stored, run:

```bash
tdn config
```

This shows the **resolved** configuration (accounting for local overrides):

```
tasksDir: /Users/danny/notes/tasks
projectsDir: /Users/danny/notes/projects
areasDir: /Users/danny/notes/areas
```

Use these absolute paths when you need to access files directly with `Read`, `Glob`, or `Grep`.

### Config File Locations

- Global: `~/.taskdn.json`
- Local override: `./.taskdn.json` (in current directory)

Local config takes precedence over global.

---

## Quick Command Reference

| Command           | Purpose                     | Example                                          |
| ----------------- | --------------------------- | ------------------------------------------------ |
| `tdn list`        | Query and filter entities   | `tdn list --status ready --ai`                   |
| `tdn show`        | Full entity details         | `tdn show "Fix bug" --ai`                        |
| `tdn new`         | Create task/project/area    | `tdn new "Call dentist" --due tomorrow --ai`     |
| `tdn context`     | Overview with relationships | `tdn context --ai`                               |
| `tdn today`       | Today's actionable tasks    | `tdn today --ai`                                 |
| `tdn set status`  | Change status               | `tdn set status "Fix bug" done --ai`             |
| `tdn update`      | Modify fields               | `tdn update "Fix bug" --set due=2025-01-20 --ai` |
| `tdn archive`     | Move to archive             | `tdn archive "Old task" --ai`                    |
| `tdn append-body` | Add notes to body           | `tdn append-body "Fix bug" "Made progress" --ai` |
| `tdn doctor`      | Health check                | `tdn doctor --ai`                                |

For entity types other than tasks, add the type:

```bash
tdn list projects --ai
tdn new project "Q2 Planning" --ai
tdn context area "Work" --ai
```

See [command-reference.md](command-reference.md) for complete documentation.

---

## When to Use CLI vs Direct File Access

| Operation                        | Approach                    | Why                                |
| -------------------------------- | --------------------------- | ---------------------------------- |
| Get overview/context             | CLI: `tdn context --ai`     | Hierarchical output, relationships |
| List/filter tasks                | CLI: `tdn list --ai`        | Built-in filtering, sorting        |
| Read task body for summarization | Direct: `Read`              | Faster, full content               |
| Create new task                  | CLI: `tdn new --ai`         | Proper timestamps, filename        |
| Update status                    | CLI: `tdn set status --ai`  | Auto-sets `completed-at`           |
| Update fields                    | CLI: `tdn update --ai`      | Preserves unknown frontmatter      |
| Append notes                     | CLI: `tdn append-body --ai` | Proper formatting                  |
| Bulk analysis of many files      | Direct: `Read` + `Glob`     | More efficient                     |
| Search across task bodies        | Direct: `Grep`              | Full-text search                   |

**General rule:** Use CLI for mutations (create, update, delete). Use direct file access for bulk reading and analysis.

See [decision-guide.md](decision-guide.md) for detailed guidance.

---

## Templates

When you need to understand the file structure or create files without the CLI, see [templates.md](templates.md) for:

- Task template
- Project template
- Area template

**Note:** The CLI's `tdn new` command handles file creation with proper timestamps and filenames. Only use templates for reference or edge cases.

---

## Error Handling

If a tdn command fails:

1. **Read the error message** — it usually explains the problem
2. **Common issues:**
   - `NOT_FOUND` — entity doesn't exist (check spelling, use `tdn list` to find it)
   - `AMBIGUOUS` — multiple matches (use the file path instead of title)
   - `INVALID_STATUS` — wrong status value (see [specification.md](specification.md))
   - `PARSE_ERROR` — malformed frontmatter (check the file manually)
3. **Explain to user** what went wrong and how to fix it

---

## Detailed Documentation

- [command-reference.md](command-reference.md) — Complete command documentation
- [cowork.md](cowork.md) — Setup and usage in Claude Cowork (sandboxed VM)
- [decision-guide.md](decision-guide.md) — When to use what approach
- [examples.md](examples.md) — Common workflow examples
- [obsidian.md](obsidian.md) — Obsidian-specific guidance (if vault is in Obsidian)
- [reviews.md](reviews.md) — Review types and how to conduct them
- [specification.md](specification.md) — Status values, field definitions
- [templates.md](templates.md) — File templates

---

## Slash Commands

This plugin provides:

- `/tdn:today` — Show today's actionable tasks
- `/tdn:prime` - Primes the current session with `tdn context --ai`

Use slash commands for quick, focused operations.
