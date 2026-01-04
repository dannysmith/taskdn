# AI Assistant Instructions

This is a Taskdn vault for personal task and project management.

## Structure

- `tasks/` - Task files (one per task)
- `projects/` - Project files (collections of tasks)
- `areas/` - Life area files (ongoing responsibilities)
- `templates/` - Obsidian templates and bases
- `Overview.md` files - Auto-generated views, don't edit directly

## Task Management

For task operations, use the `tdn` CLI if available:

```bash
tdn list              # List tasks
tdn show <task>       # Show task details
tdn new "Task title"  # Create new task
tdn context           # Overview of everything
```

Or edit task files directly. Tasks are markdown files with YAML frontmatter:

```yaml
---
title: Task name
status: ready          # inbox, ready, in-progress, blocked, icebox, done, dropped
created-at: 2025-01-01
updated-at: 2025-01-01
due: 2025-01-15        # optional
scheduled: 2025-01-10  # optional
defer-until: 2025-01-05 # optional
projects:
  - "[[Project Name]]" # optional, array format
area: "[[Area Name]]"  # optional
---

Task notes and details go here...
```

## Key Rules

- Tasks must have: title, status, created-at, updated-at
- Projects array uses wikilink format: `- "[[Project Name]]"`
- Area uses wikilink format: `area: "[[Area Name]]"`
- Don't modify `Overview.md` files (they contain embedded bases)
- Completed tasks can be moved to `tasks/archive/`

## Documentation

- Specification: https://tdn.danny.is/reference/specification
- Full docs: https://tdn.danny.is
