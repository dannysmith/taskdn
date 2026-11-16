# Changelog

Changes to the Taskdn specifications, for people and agents who implement them.

## S1 1.1.0 (unreleased)

S1 1.1 settles the places where 1.0 was silent and tools had begun to disagree: what a reference points at, how YAML values are typed, whether unknown statuses hide a file, which files count, and how timestamps are written. Most changes are clarifications. Files that conformed to 1.0 still conform, with one exception: project and area files outside their directories.

### Breaking

- **Project and area files must be directly in their directory** (§4.1). Under 1.0 this was only a SHOULD. Files elsewhere are no longer read.

### Conformance

- **Rules now say who they apply to** (§2, §3). Files follow the format. Readers are lenient and accept everything the spec allows. Writers are strict. An implementation conforms if it meets the rules for each role it plays.
- **Design principle** (§2.1): the spec constrains only what tools must agree on and what protects users' data. Meaning comes from what is written in the file.
- **Empty means absent is now a MUST,** and covers null, an empty string, an empty list and a key with no value.
- **New writer rules** (§3.3):
  - files a writer creates MUST conform, and a writer MUST NOT make a conforming file non-conforming
  - a writer MUST NOT overwrite an existing file when creating one
  - fields outside a change MUST keep their values exactly as written, so writers don't normalise or reformat unrelated fields
- **Filenames:** readers MUST NOT depend on any filename convention. Writers choose names only for files they create.
- **Directory configuration moved to S2.** S1 keeps the format rule: the three directories are independent and share no common root.

### Frontmatter

- **Readers MUST use the YAML 1.2 core schema** (§3.2). Date-like values are strings. Readers MUST read dates from their text, never from a YAML library's date type.
- **Readers MUST accept:**
  - any scalar where a string is expected (`title: 1984`)
  - an unquoted wikilink, which YAML parses as a nested list
  - a UTF-8 byte order mark
  - CRLF line endings
- **Writers MUST quote** wikilinks and strings that YAML would read as another type.
- **Frontmatter MUST be a mapping.** The closing `---` may be followed by a newline or the end of the file.

### Entities

- **Entity files** (§4.1) are `.md` files (any case, not dotfiles) directly in the tasks, projects or areas directory, plus the tasks directory's `archive/`. The directory sets the type.
- **Recognition is separate from validation** (§4.2, §4.3).
  - A file is an entity if its frontmatter has its type's required fields with non-empty values: `title` and `status` for tasks, `title` for projects and areas. Readers MUST ignore other files, so notes can share a directory with tasks.
  - No other field can stop an entity being read. Invalid values are treated as absent and preserved. Missing timestamps are not an error.
  - Readers accept a single value for `projects`, use the first of several, and read a `project` key as `projects`.
- **Writers** (§4.4) MUST write the required fields and `created-at` when creating an entity, SHOULD set `updated-at` on every change, and MUST write `projects` as a one-element list.
- **`created-at` and `updated-at` are optional on tasks,** and are now allowed on projects and areas. Projects also get `completed-at`.
- **Archive** (§5.1): writers MAY archive `done` and `dropped` tasks. Archiving doesn't change a task's status.

### Status

- **Each type has a fixed set of status values** (§4.5), and an entity's `status` MUST be one of them. Readers match ignoring case, and treat `_` and spaces as `-`.
- **An unknown status makes the file non-conforming,** but readers MUST still treat it as an entity with an unknown status. Writers that set a status MUST write one of the values, in lowercase.
- **Projects get `dropped`.** Areas list `active` and `archived` as their values. `Active` now shows an area.

### References

- **References exist only in four fields** (§4.6): a task's `area` and `projects`, and a project's `area` and `blocked-by`. The field decides the type referred to.
- **Readers MUST accept every common form:** wikilinks with display text, headings, paths or `.md`; Markdown links; paths; filenames; and bare names.
- **Resolution:** a reference's name is what remains without link syntax, display text, headings, percent-encoding, folders and `.md`. It refers to the entity whose filename matches, or failing that whose `title` matches, ignoring case after NFC normalisation. Folder paths never affect resolution.
- **Ambiguous references:** readers SHOULD NOT assume which entity is meant. **Dangling references** are valid.

### Dates and times

- **The allowed ISO 8601 forms are defined exactly** (§1), including fractional seconds and offsets.
- **Meaning** (§4.7):
  - a date has no time zone
  - a datetime without an offset is local wall-clock time and MUST NOT be read as UTC
  - a datetime with an offset is that instant
  - a datetime in a date-only field is read by its date part
- **Writers SHOULD write timestamps** (`created-at`, `updated-at`, `completed-at`) to the second with the local offset, and SHOULD NOT add offsets to user dates.

### Meaning

- **Active entities are defined in S1** (§4.8), moved from S2.
  - A task is active if its status isn't `done`, `dropped` or `icebox`, it isn't archived, and its `defer-until` is absent or not after today.
  - `defer-until` is inclusive. `scheduled` never affects whether a task is active. A task's project doesn't affect it either.
  - A project is active unless it is `done` or `dropped`. An area is active if it has no status or its status is `active`.
- **Overdue tasks** (§5.6) and **overdue projects** (§6.6) are defined.
- **Projects** (§6.6): `start-date` and `end-date` are the user's plan, and actual completion goes in `completed-at`. Readers take whether a project is blocked from `status` alone, never from `blocked-by`. A project's status doesn't change its tasks' statuses.
- **Area `type`** (§7.6) is a free-text label for the kind of area, which tools MAY group, filter or style by.

### `tdn-uid`

- **An optional field reserved for sync tools** (§4.9). It is not an entity identifier: implementations MUST NOT use it for anything other than sync, and only sync tools add it. Once set, it MUST NOT be changed or removed. References never use it.

## S2 (in progress)

- §1.3: implementations SHOULD let users configure each directory separately.
- §4.1: timestamps are shown with an offset.
- §5.1: unknown statuses SHOULD be displayed exactly as written.
- §5.3: implementations that report problems SHOULD list the files they ignored.
- §5.4: implementations that report problems SHOULD report ambiguous references.
- §7.1: "active" now refers to S1 §4.8.
