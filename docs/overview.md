# Overview

## Background

Many people use separate systems for notes and tasks. Tools like Notion combine both—every database record is a document with rich metadata. This enables powerful filtered views, cross-linking, and keeping project notes alongside their tasks.

The downside: your data lives in a proprietary format, you're locked to their apps, and programmatic access (especially for AI tools) is limited.

File-based tools like Obsidian solve the ownership problem, but task management UX suffers. The ideal interface for managing tasks is very different from managing documents. And AI agents working with raw markdown files struggle with queries like "get all uncompleted tasks in my Side Projects area."

## Goal

**Tasks as markdown-on-disk, with tools specifically designed to work with them brilliantly in each context.**

This means multiple products: a desktop app for humans doing focused work, a CLI for AI agents and automation, plugins for integration with existing tools.

## Core Concepts

Drawing from GTD and PARA methodologies:

- **Tasks** — Actionable items. Small, concrete, completable.
- **Projects** — Collections of tasks with a clear end state. Finishable.
- **Areas** — Ongoing responsibilities. Never "done" (Health, Finance, Work).

All stored as markdown files with YAML frontmatter.

## File Format (Summary)

The full specification is in `tdn-specs/S1-core.md`. Here's the essential structure:

### Tasks

```yaml
---
title: Review quarterly report
status: in-progress
due: 2025-01-15
scheduled: 2025-01-14
projects:
  - "[[Q1 Planning]]"
---

Notes and context go in the body...
```

**Key fields:** `title`, `status` (inbox/ready/in-progress/blocked/done/dropped/icebox), `due`, `scheduled`, `defer-until`, `projects` (array with one wikilink), `area` (wikilink).

### Projects

```yaml
---
title: Q1 Planning
status: in-progress
area: "[[Work]]"
start-date: 2025-01-01
end-date: 2025-03-31
---

Project notes, plans, context...
```

**Key fields:** `title`, `status` (planning/ready/in-progress/paused/blocked/done), `area` (wikilink), `start-date`, `end-date`.

### Areas

```yaml
---
title: Work
type: professional
status: active
---

Background, key contacts, ongoing notes...
```

**Key fields:** `title`, `status` (active/archived), `type` (user-defined category).

### File Organization

```
vault/
├── tasks/
│   ├── call-dentist.md
│   ├── review-report.md
│   └── archive/           # Archived tasks
├── projects/
│   └── q1-planning.md
└── areas/
    ├── work.md
    └── health.md
```

Filenames are kebab-case. Wikilinks reference by title (e.g., `[[Q1 Planning]]`), not filename.

## Key Constraints

- **Files are the source of truth** — All products are interfaces to files on disk
- **For individuals only** — No team features, no sync, no cloud
- **Zero vendor lock-in** — Works with any tool that reads markdown + YAML frontmatter
- **Opinionated about tasks, agnostic about everything else** — We control task structure; users control where files live, what else is in their vault, etc.

## Read these now

This document provides context on the Taskdn project. For a complete picture, also read:

- @products.md — Index of all products
- @monorepo-architecture.md — How the codebase is organized
- @README.md - Index of top-level documentation

---

## Further Documentation

| Document | Purpose |
|----------|---------|
| [S1 Specification](../tdn-specs/S1-core.md) | Complete file format specification |
| [S2 Specification](../tdn-specs/S2-implementation-guidance.md) | Implementation guidance for |

You can find the canonical user-facing documentation about all the products in `website/src/content/docs` and it's subfolders.
