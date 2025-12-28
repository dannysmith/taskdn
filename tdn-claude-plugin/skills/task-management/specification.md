# Specification Reference

Extracted from the Taskdn S1: Core specification. This defines the file format for tasks, projects, and areas.

---

## General Rules

1. All files are UTF-8 encoded Markdown with YAML frontmatter
2. Frontmatter begins and ends with `---` lines
3. All date/datetime values use ISO 8601 format (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM`)
4. All enum values (status, etc.) are **case-sensitive and lowercase**
5. Empty or null field values are treated as if the field were absent
6. Unknown frontmatter fields are ignored (users can add custom metadata)

---

## Task Files

Tasks represent single actionable items.

### Location

- Tasks live in the configured `tasksDir`
- Completed/dropped tasks may be moved to `tasksDir/archive/`

### Required Fields

| Field        | Type          | Description                               |
| ------------ | ------------- | ----------------------------------------- |
| `title`      | string        | The task title                            |
| `status`     | enum          | One of the task status values (see below) |
| `created-at` | date/datetime | When created                              |
| `updated-at` | date/datetime | When last modified                        |

### Optional Fields

| Field          | Type           | Description                              |
| -------------- | -------------- | ---------------------------------------- |
| `completed-at` | date/datetime  | When completed or dropped                |
| `area`         | file reference | Link to an Area (WikiLink or path)       |
| `projects`     | array          | Array with exactly one project reference |
| `due`          | date/datetime  | Hard deadline                            |
| `scheduled`    | date           | Planned work date                        |
| `defer-until`  | date           | Hide until this date                     |

### Task Status Values

| Status        | Meaning                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `inbox`       | Newly captured, not yet processed                                         |
| `icebox`      | Intentionally deferred indefinitely — not actionable now, kept for future |
| `ready`       | Processed and ready to work on                                            |
| `in-progress` | Currently being worked on                                                 |
| `blocked`     | Cannot proceed due to external dependency                                 |
| `dropped`     | Abandoned, will not be completed                                          |
| `done`        | Completed successfully                                                    |

### Example Task

```yaml
---
title: Review quarterly report
status: in-progress
created-at: 2025-01-10
updated-at: 2025-01-14
due: 2025-01-15
scheduled: 2025-01-14
projects:
  - '[[Q1 Planning]]'
---
## Notes

Key points to review:
  - Revenue projections
  - Budget allocations
```

---

## Project Files

Projects are collections of tasks with a defined end goal. Projects are "finishable."

### Location

- Projects live in the configured `projectsDir`

### Required Fields

| Field   | Type   | Description       |
| ------- | ------ | ----------------- |
| `title` | string | The project title |

### Optional Fields

| Field         | Type           | Description                            |
| ------------- | -------------- | -------------------------------------- |
| `status`      | enum           | One of the project status values       |
| `area`        | file reference | Link to an Area                        |
| `description` | string         | Short description (under 500 chars)    |
| `start-date`  | date           | When work began or will begin          |
| `end-date`    | date           | Completion date or expected completion |
| `unique-id`   | string         | Unique identifier                      |
| `blocked-by`  | array          | Projects that must complete first      |

### Project Status Values

| Status        | Meaning                               |
| ------------- | ------------------------------------- |
| `planning`    | Still being scoped or planned         |
| `ready`       | Planned and ready to begin            |
| `blocked`     | Cannot proceed due to another project |
| `in-progress` | Active work is happening              |
| `paused`      | Temporarily on hold                   |
| `done`        | Completed                             |

If `status` is absent, the project has no defined workflow state.

### Example Project

```yaml
---
title: Q1 Planning
status: in-progress
area: '[[Work]]'
start-date: 2025-01-01
end-date: 2025-03-31
description: Quarterly planning and budget review for Q1 2025.
---
## Overview

This project covers all Q1 planning activities...
```

---

## Area Files

Areas represent ongoing responsibilities. Unlike projects, areas are never "finished."

### Location

- Areas live in the configured `areasDir`

### Required Fields

| Field   | Type   | Description    |
| ------- | ------ | -------------- |
| `title` | string | The area title |

### Optional Fields

| Field         | Type   | Description                             |
| ------------- | ------ | --------------------------------------- |
| `status`      | enum   | Typically `active` or `archived`        |
| `type`        | string | Area type (e.g., "client", "life-area") |
| `description` | string | Short description (under 500 chars)     |

### Area Status Values

Areas don't have workflow status — `status` only controls visibility:

| Status     | Meaning                              |
| ---------- | ------------------------------------ |
| `active`   | Currently active (default if absent) |
| `archived` | Hidden from normal views             |

### Example Area

```yaml
---
title: Work
type: professional
status: active
description: Primary professional focus area.
---
## Context

Key contacts, priorities, and background information...
```

---

## File References (WikiLinks)

References to other files can be expressed as:

- **WikiLink:** `[[Project Name]]` or `[[Project Name|Display Text]]`
- **Relative path:** `./projects/my-project.md`
- **Filename:** `my-project.md`

WikiLinks are the preferred format.

---

## Date Formats

### Input (when creating/updating)

The CLI accepts natural language:

- `today`, `tomorrow`
- `friday`, `next monday`
- `next week` (Monday of next week)
- `+3d`, `+1w`, `+2m` (relative)
- `2025-01-15` (ISO 8601)

### Storage (in files)

Always ISO 8601:

- **Date:** `YYYY-MM-DD` (e.g., `2025-01-15`)
- **DateTime:** `YYYY-MM-DDTHH:MM` (e.g., `2025-01-15T14:30`)

---

## Definition of "Active"

These definitions determine what appears in default views:

| Entity  | "Active" means                                                    |
| ------- | ----------------------------------------------------------------- |
| Task    | Status NOT IN (done, dropped, icebox), not deferred, not archived |
| Project | Status NOT IN (done)                                              |
| Area    | Status = active OR status absent                                  |

Use `--include-done`, `--include-archived`, etc. to see non-active items.
