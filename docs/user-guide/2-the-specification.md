# The Taskdn Specification

**Version:** 1.0.0-draft
**Last Updated:** 2025-12-11

This specification defines a file format for storing tasks, projects, and areas as Markdown files with YAML frontmatter. It is deliberately simple and opinionated.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 1. Terminology

### Markdown

A lightweight markup language. This specification uses [CommonMark](https://spec.commonmark.org/) as the authoritative Markdown specification.

### YAML

A human-readable data serialization language. This specification uses [YAML 1.2](https://yaml.org/spec/1.2.2/) as the authoritative YAML specification.

### Frontmatter

A block of YAML metadata at the beginning of a Markdown file, delimited by `---` lines.

### WikiLink

A link format originating from wiki software, used by tools like [Obsidian](https://help.obsidian.md/links). The format is:

- Basic: `[[Page Name]]`
- With display text: `[[Page Name|Display Text]]`
- With heading: `[[Page Name#Heading]]`

### ISO 8601

An international standard for date and time representation. This specification uses:

- **Date:** `YYYY-MM-DD` (e.g., `2025-01-15`)
- **DateTime:** `YYYY-MM-DDTHH:MM` or `YYYY-MM-DDTHH:MM:SS` (e.g., `2025-01-15T14:30` or `2025-01-15T14:30:00`). The space-separated form `YYYY-MM-DD HH:MM` or `YYYY-MM-DD HH:MM:SS` is also valid.

Datetime values SHOULD be interpreted as local time. Timezone suffixes (`Z`, `+HH:MM`, `-HH:MM`) MAY be present and SHOULD be preserved by implementations, but implementations MAY ignore timezone information when displaying or processing dates.

### File Reference

A reference to another file, expressed as one of:

- A WikiLink: `[[Project Name]]`
- A relative path: `./projects/my-project.md`
- A filename: `my-project.md`

---

## 2. General Rules

1. All files MUST contain valid UTF-8 encoded Markdown, optionally with YAML frontmatter.
2. If frontmatter is present:
   1. It MUST be valid YAML 1.2.
   2. The file MUST begin with a line containing exactly `---`.
   3. The YAML block MUST be terminated with a line containing exactly `---`, followed by a newline.
3. Frontmatter fields MAY appear in any order.
4. The Markdown body MAY be empty.
5. Implementations MUST ignore unknown frontmatter fields. This allows users to add custom metadata without breaking compatibility.
6. All date and datetime values MUST use ISO 8601 format.
7. All enum values (such as `status`) are case-sensitive and MUST be lowercase.
8. Empty or null field values SHOULD be treated as if the field were absent.

---

## 3. Task Files

A Task represents a single actionable item.

### 3.1 File Location

- Task files MUST be stored in a designated tasks directory.
- Task files in subdirectories SHALL NOT be read during normal operation.
- Implementations SHOULD move completed or dropped tasks to a `tasks/archive` subdirectory.
- Implementations MAY provide separate functionality to query archived tasks.

The location of the tasks directory is implementation-defined. Implementations MUST provide configuration options for `tasks_dir`, `projects_dir`, and `areas_dir` to allow users to specify these paths.

### 3.2 Filename

Any valid filename. Implementations SHOULD NOT impose filename conventions.

### 3.3 Required Frontmatter Fields

| Field        | Type             | Description                                                                      |
| ------------ | ---------------- | -------------------------------------------------------------------------------- |
| `title`      | string           | The title of the task.                                                           |
| `status`     | enum             | One of: `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`. |
| `created-at` | date or datetime | When the task was created.                                                       |
| `updated-at` | date or datetime | When the task was last modified.                                                 |

### 3.4 Optional Frontmatter Fields

| Field          | Type                     | Description                                                                                         |
| -------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `completed-at` | date or datetime         | When the task was completed or dropped. SHOULD be set when `status` changes to `done` or `dropped`. |
| `area`         | file reference           | Reference to an Area file.                                                                          |
| `projects`     | array of file references | Reference to a Project file. MUST be an array with exactly one element. Array format is used for compatibility with other systems. |
| `due`          | date or datetime         | Hard deadline for the task.                                                                         |
| `scheduled`    | date                     | The date the task is planned to be worked on. Used for calendar-based planning.                     |
| `defer-until`  | date                     | Hide the task until this date. The task will not appear in active views until this date.            |

### 3.5 Status Values

| Status        | Description                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------- |
| `inbox`       | Newly captured, not yet processed.                                                          |
| `icebox`      | Intentionally deferred indefinitely. Not actionable now, but kept for future consideration. |
| `ready`       | Processed and ready to be worked on.                                                        |
| `in-progress` | Currently being worked on.                                                                  |
| `blocked`     | Cannot proceed due to external dependency.                                                  |
| `dropped`     | Abandoned. Will not be completed.                                                           |
| `done`        | Completed successfully.                                                                     |

### 3.6 Example

```yaml
---
title: Review quarterly report
status: in-progress
created-at: 2025-01-10
updated-at: 2025-01-14
due: 2025-01-15
scheduled: 2025-01-14
projects:
  - "[[Q1 Planning]]"
---

## Notes

Key points to review:
- Revenue projections
- Budget allocations

## Meeting Notes

Discussion with finance team on 2025-01-10...
```

---

## 4. Project Files

A Project represents a collection of related tasks with a defined end goal. Projects are "finishable"—they have a clear completion state.

### 4.1 File Location

Project files SHOULD be stored in a designated `projects` directory, but this is not required.

### 4.2 Filename

Any valid filename.

### 4.3 Required Frontmatter Fields

| Field   | Type   | Description               |
| ------- | ------ | ------------------------- |
| `title` | string | The title of the project. |

### 4.4 Optional Frontmatter Fields

| Field         | Type                     | Description                                                                                                                                       |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unique-id`   | string                   | A unique identifier for the project.                                                                                                              |
| `area`        | file reference           | Reference to an Area file.                                                                                                                        |
| `status`      | enum                     | One of: `planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`.                                                                          |
| `description` | string                   | A short description, SHOULD be under 500 characters.                                                                                              |
| `start-date`  | date                     | When work on the project began or will begin.                                                                                                     |
| `end-date`    | date                     | When the project was completed or is expected to complete.                                                                                        |
| `blocked-by`  | array of file references | Projects that must be completed before this one can start.                                                                                        |
| `taskdn-type` | literal `project`        | See note below on mixed-content directories. |

**Note on `taskdn-type`:** This field enables explicit opt-in for directories where Taskdn project files coexist with unrelated Markdown files. If ANY project file in a directory contains `taskdn-type: project`, implementations SHOULD ignore all files in that directory that lack this field. Use with caution: adding this field to a single file will cause all other files without it to be excluded.

### 4.5 Status Values

| Status        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `planning`    | Still being scoped or planned.                       |
| `ready`       | Planned and ready to begin.                          |
| `blocked`     | Cannot proceed due to dependency on another project. |
| `in-progress` | Active work is happening.                            |
| `paused`      | Temporarily on hold.                                 |
| `done`        | Completed.                                           |

If `status` is absent, implementations SHOULD treat the project as having no defined workflow state and MAY display it in all project views.

### 4.6 Example

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

## 5. Area Files

An Area represents an ongoing area of responsibility. Unlike projects, areas are never "finished"—they represent continuous commitments (e.g., "Health", "Finances", "Client: Acme Corp").

### 5.1 File Location

Area files SHOULD be stored in a designated `areas` directory, but this is not required.

### 5.2 Filename

Any valid filename.

### 5.3 Required Frontmatter Fields

| Field   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `title` | string | The title of the area. |

### 5.4 Optional Frontmatter Fields

| Field         | Type           | Description                                                                                                                                    |
| ------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `status`      | enum           | Recommended values: `active` or `archived`. See note below.                                                                                    |
| `type`        | string         | Allows differentiation between area types (e.g., "client", "life-area").                                                                       |
| `description` | string         | A short description, SHOULD be under 500 characters.                                                                                           |
| `taskdn-type` | literal `area` | See note below on mixed-content directories. |

**Note on `taskdn-type`:** This field enables explicit opt-in for directories where Taskdn area files coexist with unrelated Markdown files. If ANY area file in a directory contains `taskdn-type: area`, implementations SHOULD ignore all files in that directory that lack this field. Use with caution: adding this field to a single file will cause all other files without it to be excluded.

### 5.5 Note on Area Status

Unlike tasks and projects, areas do not have a workflow-based status. The `status` field exists solely to allow users to hide old or inactive areas without deleting them.

When displaying areas, implementations SHOULD:
- Display areas with `status: active` or with no `status` field.
- Hide areas with any other `status` value (e.g., `archived`).

### 5.6 Example

```yaml
---
title: Acme Corp
type: client
status: active
description: Ongoing client relationship with Acme Corporation.
---
## Context

Key contacts, agreements, and background information...
```

---

## 6. Implementation Requirements

This section defines requirements for software implementing this specification.

### 6.1 Conformance Levels

Implementations MUST support:

- Reading and parsing task files according to Section 3.
- All required frontmatter fields for tasks.
- The task status enum values defined in Section 3.5.

Implementations SHOULD support:

- Project and area files (Sections 4 and 5).
- All optional frontmatter fields.
- Moving completed tasks to an archive directory.

Implementations MAY support:

- Additional custom frontmatter fields.
- Alternative file reference formats beyond WikiLinks.

### 6.2 Error Handling

- If a file cannot be parsed as valid YAML, implementations SHOULD skip the file and MAY emit a warning.
- If a required field is missing, implementations SHOULD treat the file as invalid and MAY emit a warning.
- If a status value is not recognized, implementations SHOULD treat it as invalid.
- Implementations MUST NOT modify files that fail validation without explicit user consent.

### 6.3 Timestamps

- Implementations SHOULD automatically set `created-at` when a task is created.
- Implementations SHOULD automatically update `updated-at` when a task is modified.
- Implementations SHOULD automatically set `completed-at` when `status` changes to `done` or `dropped`.

### 6.4 Interoperability

- Implementations MUST preserve unknown frontmatter fields when modifying files.
- Implementations MUST preserve the Markdown body when modifying frontmatter.
- Implementations SHOULD preserve YAML formatting (comments, ordering) where possible.

---

## 7. Appendix

### 7.1 Design Rationale

**Why one file per task?**
Individual files allow tasks to be edited with any text editor, processed by command-line tools, and managed by AI coding assistants. They also enable rich note-taking within each task.

**Why require a `tasks` directory?**
A dedicated directory simplifies discovery and prevents implementations from scanning entire file systems. It also clearly separates actionable items from other content.

**Why YAML frontmatter?**
YAML frontmatter is widely supported by note-taking apps (Obsidian, Logseq), and developer tools. It balances human readability with machine parseability.

**Why these specific status values?**
The status values are designed to support common task management workflows (GTD-inspired inbox processing, blocking dependencies, intentional deferral) while remaining simple enough for quick triage.

### 7.2 Compatibility Notes

This specification is designed to be broadly compatible with:

- [TaskNotes](https://tasknotes.dev/) for Obsidian
- [Obsidian](https://obsidian.md/) properties and WikiLinks

### 7.3 JSON Schemas

Machine-readable JSON Schema files are available for validation:

- [task.schema.json](../schemas/task.schema.json) - Task frontmatter validation
- [project.schema.json](../schemas/project.schema.json) - Project frontmatter validation
- [area.schema.json](../schemas/area.schema.json) - Area frontmatter validation

These schemas can be used by editors (e.g., VS Code) for autocomplete and inline validation, or by implementations for programmatic validation.

### 7.4 Future Considerations

The following features are intentionally omitted from v1.0 but may be considered for future versions:

- Priority levels
- Recurring tasks
- Subtasks as separate files
- Tags beyond `task`
