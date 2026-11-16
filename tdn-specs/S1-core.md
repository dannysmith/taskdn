# Specification S1: Core (Data Storage)

**Version:** 1.0.0

This specification defines a file format for storing tasks, projects, and areas as Markdown files with YAML frontmatter. It is deliberately simple and opinionated. All software which implements this standard will be mutually compatible when reading/writing task files on disk.

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

## 2. Conformance

This specification sets requirements for files and for the software that reads and writes them:

- **Files** conform when they follow the format rules in this document.
- **Readers** are software that reads files. Readers are lenient: they accept everything this specification allows.
- **Writers** are software that creates or changes files. Writers are strict: what they write conforms.

Most implementations are both readers and writers. An implementation conforms when it meets the requirements for each role it plays. Rules that apply to only one role say so.

User interfaces, commands and configuration are outside this specification. [S2](./S2-implementation-guidance.md) gives guidance on those, and on creating and changing files well.

### 2.1 Design Principle

This specification only constrains what tools must agree on for files to work across them, and what protects users' data. Everything else is left to implementations.

The meaning of an entity comes from what is written in its file. Readers don't treat an entity as being in a state its file doesn't record. Writers that change something on a user's behalf write the result to the file, so every tool sees the same thing.

---

## 3. General Rules

### 3.1 Files

1. All files MUST contain valid UTF-8 encoded Markdown, optionally with YAML frontmatter.
2. If frontmatter is present:
   1. It MUST be valid YAML 1.2.
   2. The file MUST begin with a line containing exactly `---`.
   3. The YAML block MUST be terminated with a line containing exactly `---`, followed by a newline.
3. Frontmatter fields MAY appear in any order.
4. The Markdown body MAY be empty.
5. All date and datetime values MUST use ISO 8601 format.
6. All enum values (such as `status`) are case-sensitive and MUST be lowercase.
7. Tasks, projects and areas are each stored in their own directory. The three directories are independent: they need not be co-located, and they share no common root.

### 3.2 Readers

1. Readers MUST ignore unknown frontmatter fields. This allows users to add custom metadata without breaking compatibility.
2. Readers MUST treat a field whose value is null, an empty string or an empty list as if the field were absent. A key with no value is null.
3. Readers MUST NOT reject files with unrecognized status values. Unknown statuses SHOULD be preserved and MAY be displayed or filtered as the implementation sees fit.
4. Readers MUST NOT depend on any filename convention. Users may name and rename files freely.

### 3.3 Writers

1. Every file a writer creates MUST conform to this specification, and a writer MUST NOT make a conforming file non-conforming.
2. When creating a file, writers MUST NOT overwrite an existing file. If the chosen filename is taken, writers MUST choose another, for example by appending a number.
3. When changing a file, writers MUST preserve everything they don't explicitly change:
   - Unknown frontmatter fields MUST be preserved.
   - Fields that aren't part of the change MUST keep their values exactly as written. One change may set several fields (marking a task done sets `status` and `completed-at`), but writers MUST NOT normalise, reformat or rewrite unrelated fields along the way. For example, a writer that changes `due` leaves `status: Ready` and an `area` reference as they were.
   - The Markdown body MUST be preserved.
   - YAML formatting (comments, field ordering) SHOULD be preserved where possible.
4. Writers choose filenames only for the files they create. Any valid filename conforms; S2 recommends a convention for new files.

---

## 4. Task Files

A Task represents a single actionable item.

### 4.1 File Location

- Task files MUST be stored in a designated tasks directory.
- Task files in subdirectories SHALL NOT be read during normal operation.
- Implementations MAY move completed or dropped tasks to a `tasks/archive` subdirectory.
- Implementations MAY provide separate functionality to query archived tasks.

### 4.2 Filename

Any valid filename.

### 4.3 Required Frontmatter Fields

| Field        | Type             | Description                                                                      |
| ------------ | ---------------- | -------------------------------------------------------------------------------- |
| `title`      | string           | The title of the task.                                                           |
| `status`     | enum             | One of: `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`. |
| `created-at` | date or datetime | When the task was created.                                                       |
| `updated-at` | date or datetime | When the task was last modified.                                                 |

### 4.4 Optional Frontmatter Fields

| Field          | Type                     | Description                                                                                                                        |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `completed-at` | date or datetime         | When the task was completed or dropped. SHOULD be set when `status` changes to `done` or `dropped`.                                |
| `area`         | file reference           | Reference to an Area file.                                                                                                         |
| `projects`     | array of file references | Reference to a Project file. MUST be an array with exactly one element. Array format is used for compatibility with other systems. |
| `due`          | date or datetime         | Hard deadline for the task.                                                                                                        |
| `scheduled`    | date                     | The date the task is planned to be worked on. Used for calendar-based planning.                                                    |
| `defer-until`  | date                     | Hide the task until this date. The task will not appear in active views until this date.                                           |

### 4.5 Status Values

| Status        | Description                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------- |
| `inbox`       | Newly captured, not yet processed.                                                          |
| `icebox`      | Intentionally deferred indefinitely. Not actionable now, but kept for future consideration. |
| `ready`       | Processed and ready to be worked on.                                                        |
| `in-progress` | Currently being worked on.                                                                  |
| `blocked`     | Cannot proceed due to external dependency.                                                  |
| `dropped`     | Abandoned. Will not be completed.                                                           |
| `done`        | Completed successfully.                                                                     |

### 4.6 Example

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

## 5. Project Files

A Project represents a collection of related tasks with a defined end goal.

### 5.1 File Location

Project files SHOULD be stored in a designated `projects` directory, but this is not required.

### 5.2 Filename

Any valid filename.

### 5.3 Required Frontmatter Fields

| Field   | Type   | Description               |
| ------- | ------ | ------------------------- |
| `title` | string | The title of the project. |

### 5.4 Optional Frontmatter Fields

| Field         | Type                     | Description                                                              |
| ------------- | ------------------------ | ------------------------------------------------------------------------ |
| `area`        | file reference           | Reference to an Area file.                                               |
| `status`      | enum                     | One of: `planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`. |
| `description` | string                   | A short description, SHOULD be under 500 characters.                     |
| `start-date`  | date                     | When work on the project began or will begin.                            |
| `end-date`    | date                     | When the project was completed or is expected to complete.               |
| `blocked-by`  | array of file references | Projects that must be completed before this one can start.               |

### 5.5 Status Values

| Status        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `planning`    | Still being scoped or planned.                       |
| `ready`       | Planned and ready to begin.                          |
| `blocked`     | Cannot proceed due to dependency on another project. |
| `in-progress` | Active work is happening.                            |
| `paused`      | Temporarily on hold.                                 |
| `done`        | Completed.                                           |

If `status` is absent, implementations SHOULD treat the project as having no defined workflow state and MAY display it in all project views.

### 5.6 Example

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

## 6. Area Files

An Area represents an ongoing area of responsibility (e.g., "Health", "Finances", "Client: Acme Corp").

### 6.1 File Location

Area files SHOULD be stored in a designated `areas` directory, but this is not required.

### 6.2 Filename

Any valid filename.

### 6.3 Required Frontmatter Fields

| Field   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `title` | string | The title of the area. |

### 6.4 Optional Frontmatter Fields

| Field         | Type   | Description                                                              |
| ------------- | ------ | ------------------------------------------------------------------------ |
| `status`      | string | Recommended values: `active` or `archived`. See note below.              |
| `type`        | string | Allows differentiation between area types (e.g., "client", "life-area"). |
| `description` | string | A short description, SHOULD be under 500 characters.                     |

### 6.5 Note on Area Status

Unlike tasks and projects, areas do not have a workflow-based status. The `status` field exists solely to allow users to hide old or inactive areas without deleting or moving them.

When displaying areas, implementations SHOULD:

- Display areas with `status: active` or with no `status` field.
- Hide areas with any other `status` value (e.g., `archived`).

### 6.6 Example

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

## 7. Appendix

### 7.1 JSON Schemas

Machine-readable JSON Schema files are available to assist with validation:

- [task.schema.json](./json-schemas/task.schema.json) - Task frontmatter validation
- [project.schema.json](./json-schemas/project.schema.json) - Project frontmatter validation
- [area.schema.json](./json-schemas/area.schema.json) - Area frontmatter validation

These schemas can be used by editors for autocomplete and inline validation, or by implementations for programmatic validation. **Conformance with these schemas does not guaruntee complete conformance with this specification** – some requirements cannot be encoded as JSON schemas.

### 7.2 Guidance for Implementations

[S2: Implementation Guidance](./S2-implementation-guidance.md) contains additional guidance for implementations.
