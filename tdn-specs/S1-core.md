# Specification S1: Core (Data Storage)

**Version:** 1.0.0

This specification defines a file format for storing tasks, projects, and areas as Markdown files with YAML frontmatter. It is deliberately simple and opinionated. All software which implements this standard will be mutually compatible when reading/writing task files on disk.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 1. Terminology

### Markdown

A lightweight markup language. This specification uses [CommonMark](https://spec.commonmark.org/) as the authoritative Markdown specification.

### YAML

A human-readable data serialization language. This specification uses [YAML 1.2](https://yaml.org/spec/1.2.2/) as the authoritative YAML specification, with its [core schema](https://yaml.org/spec/1.2.2/#103-core-schema).

### Frontmatter

A block of YAML metadata at the beginning of a Markdown file, delimited by `---` lines.

### WikiLink

A link format originating from wiki software, used by tools like [Obsidian](https://help.obsidian.md/links). The format is:

- Basic: `[[Page Name]]`
- With display text: `[[Page Name|Display Text]]`
- With heading: `[[Page Name#Heading]]`

This specification only gives wikilinks a meaning in reference fields (§4.6).

### ISO 8601

An international standard for date and time representation. This specification uses these forms of it:

- **Date:** `YYYY-MM-DD` (e.g., `2025-01-15`).
- **Datetime:** a date, then `T` or a space, then `HH:MM`, optionally followed by seconds (`:SS`), a fraction of a second (`.` and one or more digits), and an offset (`Z`, `+HH:MM` or `-HH:MM`), in that order. For example: `2025-01-15T14:30`, `2025-01-15 14:30:00`, `2025-01-15T14:30:00.123Z` or `2025-01-15T14:30:00+01:00`.

§4.7 defines what dates and datetimes mean.

### File Reference

A value in a reference field that names another entity, such as `"[[Japan Trip]]"`. §4.6 defines the forms a reference can take and how it resolves.

---

## 2. Conformance

This specification sets requirements for files and for the software that reads and writes them:

- **Files** conform if they follow the format rules in this document.
- **Readers** are software that reads files. Readers are lenient: they accept everything this specification allows.
- **Writers** are software that creates or changes files. Writers are strict: what they write conforms.

Most implementations are both readers and writers. An implementation conforms if it meets the requirements for each role it plays. Rules that apply to only one role say so.

User interfaces, commands and configuration are outside this specification. [S2](./S2-implementation-guidance.md) gives guidance on those, and on creating and changing files well.

### 2.1 Design Principle

This specification only constrains what tools must agree on for files to work across them, and what protects users' data. Everything else is left to implementations.

The meaning of an entity comes from what is written in its file. Readers don't treat an entity as being in a state its file doesn't record. Writers that change something on a user's behalf write the result to the file, so every tool sees the same thing.

---

## 3. General Rules

### 3.1 Files

1. All files MUST contain valid UTF-8 encoded Markdown, optionally with YAML frontmatter.
2. If frontmatter is present:
   1. It MUST be valid YAML 1.2, and its top level MUST be a mapping of field names to values.
   2. The file MUST begin with a line containing exactly `---`.
   3. The YAML block MUST be terminated with a line containing exactly `---`, followed by a newline or the end of the file.
3. Frontmatter fields MAY appear in any order.
4. The Markdown body MAY be empty.
5. Date and datetime values MUST use the ISO 8601 forms defined in §1.
6. Tasks, projects and areas are each stored in their own directory. The three directories are independent: they need not be co-located, and they share no common root.

### 3.2 Readers

1. Readers MUST ignore unknown frontmatter fields. This allows users to add custom metadata without breaking compatibility.
2. Readers MUST treat a field whose value is null, an empty string or an empty list as if the field were absent. A key with no value is null.
3. Readers MUST NOT depend on any filename convention. Users may name and rename files freely.
4. Readers MUST accept a UTF-8 byte order mark at the start of a file, and CRLF line endings.
5. Readers MUST interpret frontmatter with the YAML 1.2 core schema. Date-like values such as `2025-01-15` are strings, and readers MUST read dates and datetimes from their text, never from a date type a YAML library produces. Many YAML libraries default to YAML 1.1 behaviour, which turns unquoted dates into date objects and can shift datetimes to UTC, so they need configuring.
6. Where this specification expects a string, readers MUST accept any scalar and read it as text. For example, `title: 1984` is the title "1984".
7. Readers MUST read an unquoted wikilink as that wikilink. YAML parses `area: [[Work]]` as a list containing a list containing the string `Work`, and readers treat that value as `[[Work]]`, both as a field value and as an item in a list.

### 3.3 Writers

1. Every file a writer creates MUST conform to this specification, and a writer MUST NOT make a conforming file non-conforming.
2. When creating a file, writers MUST NOT overwrite an existing file. If the chosen filename is taken, writers MUST choose another, for example by appending a number.
3. When changing a file, writers MUST preserve everything they don't explicitly change:
   - Unknown frontmatter fields MUST be preserved.
   - Fields that aren't part of the change MUST keep their values exactly as written. One change may set several fields (marking a task done sets `status` and `completed-at`), but writers MUST NOT normalise, reformat or rewrite unrelated fields along the way. For example, a writer that changes `due` leaves `status: Ready` and an `area` reference as they were.
   - The Markdown body MUST be preserved.
   - YAML formatting (comments, field ordering) SHOULD be preserved where possible.
4. Writers choose filenames only for the files they create. Any valid filename conforms; S2 recommends a convention for new files.
5. Writers MUST quote string values that YAML would otherwise read as something else. This includes wikilinks (`area: "[[Work]]"`, never `area: [[Work]]`) and strings that look like numbers, booleans or null (`title: "1984"`).

---

## 4. Entities

Tasks, projects and areas are entities. Each entity is one Markdown file in the directory for its type.

### 4.1 Entity Files

1. An entity file is a file directly inside the tasks, projects or areas directory whose name ends in `.md` (in any case) and doesn't start with `.`. Its type comes from the directory it is in.
2. Files in subdirectories are not entity files, with one exception: files directly inside the `archive` subdirectory of the tasks directory are archived tasks (§5.1).

### 4.2 Recognising Entities

1. An entity file is an entity if its frontmatter is a mapping that contains the required fields for its type (§5.3, §6.3, §7.3), each with a non-empty value.
2. Any other file in an entity directory is not an entity, and readers MUST ignore it. This lets users keep other notes alongside their tasks, projects and areas.
3. Writers MUST NOT modify a file whose frontmatter is not valid YAML.

### 4.3 Reading Entity Fields

Only the required fields decide whether a file is an entity. For every entity:

1. Readers MUST NOT ignore an entity because another field is missing, invalid or in an unexpected form.
2. A field with an invalid value (for example `due: next tuesday`) is treated as absent, and readers MUST preserve it.
3. A missing `created-at` or `updated-at` is not an error. Readers MAY use the file's modification time in its place, for example for sorting.
4. Readers read a task's `projects` field leniently:
   - A single value instead of a list is read as a list with that one element.
   - If the list has more than one element, readers use the first and preserve the rest.
   - If `projects` is absent, a `project` field is read as `projects`.

### 4.4 Writing Entities

1. When creating an entity, writers MUST write its required fields. When creating a task, writers MUST also write `created-at`.
2. Writers SHOULD set `updated-at` whenever they change a task.
3. Writers MUST write a task's `projects` as a list with exactly one element. A writer that changes the project of a task that has a `project` field writes `projects` and removes `project`.

### 4.5 Status

1. Each entity type has a fixed set of status values (§5.5, §6.5, §7.5), and an entity's `status` MUST be one of them.
2. Readers MUST match a status against these values ignoring case, and treating `_` and spaces as `-`. For example, `Ready` matches `ready`, and `IN_PROGRESS` and `In Progress` match `in-progress`.
3. A status that matches none of the values is unknown, and the file doesn't conform. Readers MUST still treat the file as an entity with an unknown status, and SHOULD NOT treat that status as any of the defined values.
4. Writers that set a status MUST write one of the values for its type, in lowercase.

### 4.6 References

Four fields refer to other entities: a task's `area` and `projects`, and a project's `area` and `blocked-by`. The field decides the type of entity referred to: `area` refers to an area, and `projects` and `blocked-by` refer to projects. This specification says nothing about links anywhere else, including in the Markdown body.

1. Readers MUST accept a reference in any of these forms. Each of these refers to the same project:

   ```yaml
   "[[Japan Trip]]"                              # wikilink
   "[[Japan Trip|the trip]]"                     # wikilink with display text
   "[[Japan Trip#Bookings]]"                     # wikilink with a heading
   "[[projects/Japan Trip]]"                     # wikilink with a path
   "[[../projects/Japan Trip.md]]"               # wikilink with a relative path and extension
   "[Japan Trip](../projects/Japan%20Trip.md)"   # Markdown link
   "[Japan Trip](<../projects/Japan Trip.md>)"   # Markdown link in angle brackets
   "../projects/Japan Trip.md"                   # path
   "Japan Trip.md"                               # filename
   "Japan Trip"                                  # name or title
   ```

   Readers also accept an unquoted wikilink (§3.2).

2. A reference's name is what remains without its link syntax: the `[[ ]]` or Markdown link syntax, display text after `|`, a heading after `#`, percent-encoding (`%20` is a space), any folder path (up to the last `/` or `\`), and a trailing `.md` in any case. A Markdown link's name comes from its destination, not its link text.
3. A reference refers to the entity of the referenced type whose filename, without `.md`, matches its name. If no filename matches, it refers to the entity whose `title` matches. Names match ignoring case, after Unicode normalisation (NFC). Folder paths play no part, because the field decides the directory and the directories share no common root (§3.1): `area: "[[projects/Garden]]"` refers to the area `Garden.md`.
4. A reference that matches more than one entity at the same step is ambiguous. Readers SHOULD NOT assume which entity it refers to. They MAY instead show the matches, or ask the user to choose.
5. A reference that matches no entity is dangling. Dangling references are valid.
6. Writers MAY write a reference in any of the forms above, quoted (§3.3). S2 recommends one.

### 4.7 Dates and Times

Date fields hold one of two kinds of value. **Timestamps** (`created-at`, `updated-at` and `completed-at`) record when something happened. **User dates** (`due`, `scheduled`, `defer-until`, `start-date` and `end-date`) are the user's plan.

1. A date is a calendar date with no time zone: `due: 2026-01-16` means 16 January wherever the user is.
2. A datetime without an offset is a local wall-clock time: `due: 2026-01-16T15:00` means 3pm wherever the user is. Readers MUST NOT read it as UTC.
3. A datetime with an offset is that exact instant. `Z` means UTC.
4. In a field whose type is "date", readers MUST accept a datetime and use its date part as written: `scheduled: 2026-01-16T09:00` means 16 January.
5. Writers SHOULD write timestamps as datetimes to the second, with the local offset: `2026-01-15T14:30:00+01:00`.
6. Writers SHOULD NOT add an offset to user dates.

### 4.8 Active Entities

These definitions make "active" mean the same in every tool. What a tool shows, and whether it shows only active entities by default, is up to the tool.

1. A task is active if all of these are true:
   - its status is not `done`, `dropped` or `icebox` (so a task with an unknown status is active)
   - it isn't archived (§5.1)
   - its `defer-until` is absent, or is today or earlier
2. `defer-until` is inclusive: a task with `defer-until: 2026-01-16` is active on 16 January. "Today" is the user's local date.
3. `scheduled` never affects whether a task is active. A task scheduled for a future date is active.
4. Whether a task is active depends only on its own file. Its project's status doesn't change it.
5. A project is active if it has no status, or its status is not `done`.
6. An area is active if it has no status, or its status matches `active` (§7.5).

---

## 5. Task Files

A Task represents a single actionable item.

### 5.1 File Location

Task files are stored directly in the tasks directory (§4.1).

Writers MAY move tasks whose status is `done` or `dropped` into an `archive` subdirectory of the tasks directory. Files directly inside it are archived tasks. Readers MAY leave archived tasks out unless asked for them. Archiving doesn't change a task's status: an open task in the archive is still open.

### 5.2 Filename

Any valid filename.

### 5.3 Required Frontmatter Fields

A file in the tasks directory is a task if it has both of these fields (§4.2).

| Field    | Type   | Description                                                                      |
| -------- | ------ | -------------------------------------------------------------------------------- |
| `title`  | string | The title of the task.                                                           |
| `status` | string | One of the task status values in §5.5.                                           |

### 5.4 Optional Frontmatter Fields

| Field          | Type                     | Description                                                                                                                        |
| -------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `created-at`   | date or datetime         | When the task was created. Writers MUST set it when creating a task (§4.4).                                                        |
| `updated-at`   | date or datetime         | When the task was last changed. Writers SHOULD keep it current (§4.4).                                                             |
| `completed-at` | date or datetime         | When the task was completed or dropped. SHOULD be set when `status` changes to `done` or `dropped`.                                |
| `area`         | file reference           | Reference to an Area file.                                                                                                         |
| `projects`     | array of file references | Reference to a Project file, as a list with one element (§4.3, §4.4). The list form is for compatibility with other systems.       |
| `due`          | date or datetime         | Hard deadline for the task.                                                                                                        |
| `scheduled`    | date                     | The date the task is planned to be worked on. It doesn't affect whether the task is active (§4.8).                                 |
| `defer-until`  | date                     | The date the task becomes relevant. The task isn't active before this date (§4.8).                                                 |

### 5.5 Status Values

A task's `status` is one of these values (§4.5):

| Status        | Description                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------- |
| `inbox`       | Newly captured, not yet processed.                                                          |
| `icebox`      | Intentionally deferred indefinitely. Not actionable now, but kept for future consideration. |
| `ready`       | Processed and ready to be worked on.                                                        |
| `in-progress` | Currently being worked on.                                                                  |
| `blocked`     | Cannot proceed due to external dependency.                                                  |
| `dropped`     | Abandoned. Will not be completed.                                                           |
| `done`        | Completed successfully.                                                                     |

### 5.6 Example

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

## 6. Project Files

A Project represents a collection of related tasks with a defined end goal.

### 6.1 File Location

Project files are stored directly in the projects directory (§4.1).

### 6.2 Filename

Any valid filename.

### 6.3 Required Frontmatter Fields

A file in the projects directory is a project if it has this field (§4.2).

| Field   | Type   | Description               |
| ------- | ------ | ------------------------- |
| `title` | string | The title of the project. |

### 6.4 Optional Frontmatter Fields

| Field         | Type                     | Description                                                              |
| ------------- | ------------------------ | ------------------------------------------------------------------------ |
| `area`        | file reference           | Reference to an Area file.                                               |
| `status`      | string                   | One of the project status values in §6.5.                                |
| `description` | string                   | A short description, SHOULD be under 500 characters.                     |
| `start-date`  | date                     | When work on the project began or will begin.                            |
| `end-date`    | date                     | When the project was completed or is expected to complete.               |
| `blocked-by`  | array of file references | Projects that must be completed before this one can start.               |

### 6.5 Status Values

A project's `status` is one of these values (§4.5):

| Status        | Description                                          |
| ------------- | ---------------------------------------------------- |
| `planning`    | Still being scoped or planned.                       |
| `ready`       | Planned and ready to begin.                          |
| `blocked`     | Cannot proceed due to dependency on another project. |
| `in-progress` | Active work is happening.                            |
| `paused`      | Temporarily on hold.                                 |
| `done`        | Completed.                                           |

If `status` is absent, implementations SHOULD treat the project as having no defined workflow state and MAY display it in all project views.

### 6.6 Example

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

## 7. Area Files

An Area represents an ongoing area of responsibility (e.g., "Health", "Finances", "Client: Acme Corp").

### 7.1 File Location

Area files are stored directly in the areas directory (§4.1).

### 7.2 Filename

Any valid filename.

### 7.3 Required Frontmatter Fields

A file in the areas directory is an area if it has this field (§4.2).

| Field   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `title` | string | The title of the area. |

### 7.4 Optional Frontmatter Fields

| Field         | Type   | Description                                                              |
| ------------- | ------ | ------------------------------------------------------------------------ |
| `status`      | string | One of the area status values in §7.5.                                   |
| `type`        | string | Allows differentiation between area types (e.g., "client", "life-area"). |
| `description` | string | A short description, SHOULD be under 500 characters.                     |

### 7.5 Status Values

Unlike tasks and projects, areas do not have a workflow-based status. The `status` field exists solely to allow users to hide old or inactive areas without deleting or moving them. An area's `status` is one of these values (§4.5):

| Status     | Description       |
| ---------- | ----------------- |
| `active`   | In use.           |
| `archived` | No longer in use. |

When displaying areas, implementations SHOULD:

- Display areas with no `status`, or with a status that matches `active` (§4.5).
- Hide areas with any other status, including `archived` and unknown values such as `paused`.

### 7.6 Example

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

## 8. Appendix

### 8.1 JSON Schemas

Machine-readable JSON Schema files are available to assist with validation:

- [task.schema.json](./json-schemas/task.schema.json) - Task frontmatter validation
- [project.schema.json](./json-schemas/project.schema.json) - Project frontmatter validation
- [area.schema.json](./json-schemas/area.schema.json) - Area frontmatter validation

These schemas can be used by editors for autocomplete and inline validation, or by implementations for programmatic validation. **Conformance with these schemas does not guaruntee complete conformance with this specification** – some requirements cannot be encoded as JSON schemas.

### 8.2 Guidance for Implementations

[S2: Implementation Guidance](./S2-implementation-guidance.md) contains additional guidance for implementations.
