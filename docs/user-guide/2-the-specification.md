# The Specification

This specification is deliberatly simple and opinionated. Files which conform to this standard will be compatable with software which implements it.

## General

1. All files must contain valid, UTF-encoded markdown with optional YAML frontmatter.
2. If frontmatter is present:
   1. It must be valid YAML
   2. The first line of the file must be `---`
   3. The YAML block must be terminated with `---` followed by a newline
3. Frontmatter fields may appear in anny order.
4. The body may be empty.

## Area Files

Represent an ongoing area of responsibility.

### Filename

Any valid filename.

### File Location

Area files should usually be kept in specific `areas` directory, but this is not a requirement of the specification.

### Required Frontmatter Fields

- `title` - Title of the Project

### Optional Frontmatter Fields

- `status (active || <any>)` – Status of the area. If present in any area file, files without `status: active` will be ignored. Recommended values: `active` or `archived` only.
- `type: <enum of strings>` - Allows users to differentiate between different types of Area (eg "Client" or "Life Area").
- `description <string>` - A short description of the area, < 500 characters.
- `taskdn-type: area` - if present in any area file, other files will be ignored. This can be useful for implementations where area files are in a directory of mixed content.

## Project

Represent a project.

### Filename

Any valid filename.

### File Location

Project files should usually be kept in specific `projects` directory, but this is not a requirement of the specification.

### Required Frontmatter Fields

- `title` - Title of the Project

### Optional Frontmatter Fields

- `unique-id` - An optional unique ID for the project.
- `area` - Reference to one Area file as either a WikiLink, relative path or filename.
- `status (planning || ready || blocked || active || paused || done)` – Status of the project.
- `type: <enum of strings>` - Allows users to differentiate between different types of Project.
- `description <string>` - A short description of the project, < 500 characters.
- `taskdn-type: project` - if present in any project file, other files will be ignored. This can be useful for implementations where project files are in a directory of mixed content.
- `start-date` -
- `end-date` -
- `blocked-by` - An array of projects which are blocking this one and must be completed before it can be started, as either a WikiLink, relative path or filename.

## Task

Represent a single actionable task. Designed to be somewhat compatible with the [TaskNotes](https://tasknotes.dev/core-concepts/) obsidian plugin.

### Filename

Any valid filename.

### File Location

- Task files **must** be kept in a specific `tasks` directory.
- Archived tasks may be left in place or moved to a `tasks/archive` directory.
- Task files in subdirectories will not be read.

### Required Frontmatter Fields

- `title` - Title of the Project
- `status (inbox || icebox || ready || in-progress || blocked || dropped || done)` – Status of the task.
- `tags: [task]` - Must be included.
- `createdat` -
- `updatedat` -
- `Completedat` - datetime at which the status was last set to dropped or done

### Optional Frontmatter Fields

- `area` - Reference to one Area file as either a WikiLink, relative path or filename.
- `projects` - Array. Rreference to one Project file as either a WikiLink, relative path or filename. Included as an array for compatibility with other systems.
- `due <date or datetime>` - HArd deadline for the project.
- `ticker-date` (hides until that date, reminds me on it - delegate tasks to future self)
- `scheduled` - Date the task is scheduled for.

### Example

```
---
tags:
  - task
title: Review quarterly report
status: in-progress
due: 2025-01-15
scheduled: 2025-01-14
createdat:
updatedat:
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

## Implementations

Software implementing this standard must...
