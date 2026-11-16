# What changed in Spec 1.1

Detailed notes on every Spec 1.1 change, written commit by commit, with the reasoning. `tdn-specs/CHANGELOG.md` is the condensed version describing the final state. Written for people and agents who implement the spec: each entry says what changed, what an implementation now has to do differently, and whether existing files are affected. Wording gets tidied at the end.

Almost every change is a clarification. Files that were valid under 1.0 stay valid under 1.1.

## S1

### Conformance: files, readers and writers

S1 now says who each rule applies to. **Files** follow the format. **Readers** are lenient and accept everything the spec allows. **Writers** are strict, and what they write conforms. An implementation conforms if it meets the rules for each role it plays. A short design principle explains what the spec does and doesn't constrain: only what tools must agree on and what protects users' data. Meaning comes from what's written in the file.

General rules are now grouped under Files (§3.1), Readers (§3.2) and Writers (§3.3). Sections 3–6 are renumbered 4–7.

What changes for implementations:

- **Empty means absent is now a MUST** (was SHOULD), and is defined: null, an empty string, an empty list, or a key with no value.
- **New writer rules:**
  - Files a writer creates MUST conform, and a writer MUST NOT make a conforming file non-conforming.
  - A writer MUST NOT overwrite an existing file when creating one. If the name is taken, choose another.
  - When changing a file, fields that aren't part of the change MUST keep their values exactly as written. One change can still set several related fields (marking a task done sets `status` and `completed-at`), but writers MUST NOT normalise, reformat or rewrite unrelated fields along the way. For example, updating `due` leaves `status: Ready` and an `area` reference as they were.
- **Directory configuration has moved to S2.** S1 1.0 rule 11 required implementations to offer configuration for the three directories. That's a product concern, so it's now a SHOULD in S2 §1.3. S1 keeps the part that matters for the format: the three directories are independent, need not be co-located, and share no common root.
- **Filenames:** the old "SHOULD NOT impose filename conventions" is split in two:
  - readers MUST NOT depend on any filename convention
  - writers choose names only for files they create, and any valid filename conforms (S2 will recommend a convention for new files)

Existing files: unaffected.

### Frontmatter data model

S1 1.0 named YAML 1.2, but common parsers behave like YAML 1.1 (js-yaml via gray-matter, PyYAML), so tools disagreed about what a value is. A task with an unquoted `area: [[Work]]` disappeared from both our CLI and desktop app.

What changes for implementations:

- **Readers MUST use the YAML 1.2 core schema.** Date-like values are strings. Read dates and datetimes from their text, never from a date object a YAML library produced. Libraries that default to 1.1 behaviour turn unquoted dates into date objects and can shift datetimes to UTC, so configure them.
- **Readers MUST accept any scalar where a string is expected**, read as text. `title: 1984` is the title "1984".
- **Readers MUST read an unquoted wikilink as a wikilink.** YAML parses `area: [[Work]]` as a list containing a list containing `Work`. Readers treat that as `[[Work]]`, both as a field value and as an item in a list such as `projects`.
- **Readers MUST accept a UTF-8 byte order mark and CRLF line endings.**
- **Writers MUST quote strings YAML would read as something else:** wikilinks (`"[[Work]]"`), and strings that look like numbers, booleans or null (`title: "1984"`).
- **Frontmatter's top level MUST be a mapping.**
- **The closing `---` may be followed by a newline or the end of the file.** 1.0 required a newline, which made a file ending in `---` without a trailing newline invalid.

Existing files: unaffected. Files with unquoted wikilinks or a byte order mark are now read correctly. A writer quotes an unquoted wikilink only when that field is part of a change; otherwise it's left as written.

### Entities: which files count, and what makes one a task, project or area

S1 1.0 used "has every required field" as the test for whether a file is a task. So one bad or missing field made a task disappear without a word, and our CLI hid 18 of the 55 files in the edge-cases vault. 1.0 also said projects and areas only SHOULD live in their directories, and gave no rule about file extensions.

A new §4 separates **recognising** a file from **validating** its fields.

- **Entity files (§4.1).** An entity file is a `.md` file (extension in any case, no dotfiles) directly inside the tasks, projects or areas directory. Its type comes from the directory. Subdirectories aren't read, except the tasks directory's `archive/`.
- **Recognition (§4.2).** An entity file is an entity if its frontmatter is a mapping with its type's required fields present and non-empty:
  - tasks need `title` and `status` (any value, including unknown ones)
  - projects and areas need `title`

  Everything else in the directory is a note, and readers MUST ignore it, so users can keep other notes alongside tasks. Writers MUST NOT modify a file whose frontmatter isn't valid YAML.
- **Lenient field reading (§4.3).** Only the required fields decide whether a file is an entity, so no other field can hide one:
  - an invalid value (e.g. `due: next tuesday`) is treated as absent and preserved
  - a missing `created-at` or `updated-at` is not an error, and readers MAY fall back to the file's modification time
  - for `projects`: a single value is read as a one-element list; with several elements, readers use the first and preserve the rest; a `project` key is read as `projects` when `projects` is absent
- **Writer rules (§4.4):**
  - creating an entity writes its required fields, plus `created-at` for tasks
  - writers SHOULD set `updated-at` whenever they change a task
  - `projects` is written as a one-element list, and changing the project of a task with a `project` key replaces it with `projects`
- **S2 §5.3 (new):** implementations that report problems with files SHOULD list the files they ignored, with the reason, so that they can be found.
- **`created-at` and `updated-at` are no longer required on tasks.** They move to the optional table, with the writer rules above.
- **Archive (§5.1):**
  - writers MAY move `done` or `dropped` tasks into `archive/`
  - readers MAY leave archived tasks out unless asked
  - archiving never changes a task's status, so an open task in the archive is still open

Existing files: tasks missing timestamps, or with a scalar `projects` or a `project` key, are now valid entities where 1.0 treated them as invalid. **One case could break:** a project or area file stored outside its configured directory was allowed under 1.0 (SHOULD) and is no longer read.

### Status: a fixed set of values, read leniently

S1 1.0 contradicted itself. It said `status` is "one of" a list, case-sensitive and lowercase, but also that readers MUST NOT reject unknown values, and the JSON schema used a closed `enum`. In practice our CLI and desktop app dropped any task whose status they didn't recognise, so `status: Ready` or `status: waiting` made a task disappear.

The status values are still fixed: this is not a way to add your own. What changes is how readers cope with files that don't follow the rules. A new §4.5 covers status for all three types:

- **An entity's `status` MUST be one of its type's values** (§5.5, §6.5, §7.5). The field tables now say "string" instead of "enum".
- **Readers match the values ignoring case, and treat `_` and spaces as `-`.** `Ready`, `IN_PROGRESS` and `In Progress` all match. This only normalises formatting; it never maps one word to another.
- **A status that matches none of the values is unknown, and the file doesn't conform.** Readers MUST still treat the file as an entity with an unknown status, and SHOULD NOT treat that status as any of the defined values.
- **Writers that set a status MUST write one of the values for its type, in lowercase.** A status the writer isn't changing stays as written (§3.3).
- **Areas:** `active` and `archived` are now listed as the area status values. Visibility uses the same matching, so `Active` is shown (under 1.0 it was hidden). Any other status, including unknown values, hides the area.
- **Removed:** the general rule that "all enum values are case-sensitive and MUST be lowercase", and the reader rule about unrecognised statuses, which §4.5 replaces.
- **S2 §5.1:** readers SHOULD display an unknown status exactly as written, so the user can see and fix it, and MAY style it distinctively.

Existing files: files with capitalised or `_`/space-separated statuses are valid and now read. Files with unknown statuses are now read too, though they don't conform. An area with `status: Active` is now shown.

### References: every form accepted, resolved by name

S1 1.0 listed three ways to write a reference (a wikilink, a relative path, a filename) but never said how any of them finds its file. Tools disagreed. Our CLI and desktop matched `[[X]]` against `title`. Obsidian and our Obsidian plugin match the filename. The 1.0 example `./projects/my-project.md` couldn't resolve under either reading, because the three directories needn't share a root.

A new §4.6 defines references:

- **Scope.** References exist only in four fields: a task's `area` and `projects`, and a project's `area` and `blocked-by`. The field decides the type referred to. The spec says nothing about links anywhere else, including the body.
- **Forms.** Readers MUST accept any of: a wikilink (with display text, a heading, a path, or `.md`), a Markdown link (percent-encoded or in angle brackets), a path, a filename, or a bare name or title. They also accept an unquoted wikilink (§3.2). The aim is that a reference works however it was written, whatever a user's Obsidian link settings or tools.
- **Resolution.**
  - A reference's name is what remains without its link syntax: wikilink or Markdown link syntax, `|display text`, `#heading`, percent-encoding, folder paths and `.md`.
  - It refers to the entity of the referenced type whose filename matches that name, or, if no filename matches, whose `title` does. Matching ignores case, after Unicode NFC normalisation.
  - Filename first agrees with Obsidian. The title fallback keeps existing vaults working, where files have slug names and links use titles.
- **Folder paths never affect resolution.** There's no shared root for them to be relative to. `area: "[[projects/Garden]]"` refers to the area `Garden.md`.
- **Ambiguous references** (several matches at the same step): readers SHOULD NOT assume which entity is meant, because silently picking one depends on directory order and tools would disagree. They MAY show the matches or ask the user to choose.
- **Dangling references** (no match) are valid, and are preserved.
- **Writers MAY use any of the forms, quoted.** S2 recommends one.
- **Terminology:** "File Reference" now points to §4.6, and the wikilink entry says wikilinks only have meaning in reference fields.
- **S2 §5.4 (new):** implementations that report problems SHOULD report ambiguous references, and MAY report dangling ones.

Existing files: unaffected. References that tools previously couldn't resolve (by filename, by path, with a heading) now resolve. A reference like `./projects/my-project.md` now finds `my-project.md` in the projects directory.

### Dates and times

S1 1.0 said only "ISO 8601", which is far broader than intended. It said datetimes SHOULD be read as local time, but also that tools MAY ignore offsets, so two tools could read `…Z` as different instants. Fractional seconds (what JavaScript's `toISOString()` writes) weren't covered, and the schema rejected them. A datetime in a date-only field like `scheduled` was undefined. Our tools also disagreed in practice: some wrote UTC with `Z`, and one wrote UTC with no offset, which reads as local time.

What changes:

- **The ISO 8601 forms are defined exactly (§1).** A date is `YYYY-MM-DD`. A datetime is a date, `T` or a space, `HH:MM`, then optional seconds, fraction and offset (`Z`, `+HH:MM`, `-HH:MM`). Fractional seconds are now allowed.
- **A new §4.7 defines what they mean:**
  - **Timestamps** (`created-at`, `updated-at`, `completed-at`) record when something happened. **User dates** (`due`, `scheduled`, `defer-until`, `start-date`, `end-date`) are the user's plan.
  - A date is a calendar date with no time zone.
  - A datetime without an offset is local wall-clock time, and readers MUST NOT read it as UTC. A datetime with an offset is that exact instant.
  - In a date-only field, readers MUST accept a datetime and use its date part as written.
  - Writers SHOULD write timestamps to the second with the local offset (`2026-01-15T14:30:00+01:00`), and SHOULD NOT add an offset to user dates.
- **Removed:** the 1.0 note that implementations MAY ignore time zone information.
- **S2 §4.1:** the format table now shows timestamps with an offset, and lists `start-date` and `end-date` among the user dates.

Existing files: unaffected. Timestamps without an offset remain valid and are read as local time. A datetime in `scheduled` or `defer-until` is now read by its date part instead of being invalid.

### What "active" means, moved from S2 into S1

The desktop app, the CLI and any agent need to agree on which tasks are current. In 1.0 that was only in S2, which is non-normative. Whether a task shows on its `defer-until` date, and whether `scheduled` hides a task (Things hides future-scheduled tasks), weren't settled anywhere normative.

A new S1 §4.8 defines active entities. What a tool shows remains up to it, but "active" means the same everywhere:

- **A task is active** if its status isn't `done`, `dropped` or `icebox`, it isn't archived, and its `defer-until` is absent or today or earlier. An unknown status counts as active.
- **`defer-until` is inclusive:** a task deferred until 16 January is active on 16 January. "Today" is the user's local date.
- **`scheduled` never affects whether a task is active.** A task scheduled for the future is still active.
- **A task's project doesn't affect whether the task is active.** Only the task's own file does.
- **A project is active** if it has no status or its status isn't `done`. **An area is active** if it has no status or its status matches `active`.
- **Field tables:** the `scheduled` and `defer-until` descriptions now refer to §4.8.
- **S2 §7.1** now refers to S1 §4.8 instead of defining active itself.

Existing files: unaffected.

### Projects and areas

Several gaps in 1.0's project and area fields:
- Projects had no way to be abandoned, so they stayed "active" forever or were falsely marked `done`.
- `end-date` meant both "finished on" and "expected by".
- `status: blocked` and `blocked-by` were two sources of truth.
- Only tasks had timestamps.
- Area `type` had no defined meaning.

What changes:

- **Projects get a `dropped` status** ("Abandoned. Will not be completed."), matching tasks. Active projects (§4.8) now exclude `dropped` as well as `done`.
- **`blocked`** is now described as "Cannot proceed until something else happens", rather than only a dependency on another project.
- **A project's status doesn't change its tasks' statuses.** A task in a `done` or `dropped` project has whatever status its own file records.
- **New §6.6 Dates and Dependencies:**
  - `start-date` and `end-date` are the user's plan, and writers SHOULD NOT change them because the status changed. When a project actually finished goes in the new optional `completed-at`.
  - A project is overdue if its `end-date` is before today and it isn't `done` or `dropped`.
  - `blocked-by` is information only. Readers MUST take whether a project is blocked from `status` alone, and MUST NOT infer it from `blocked-by`. Writers MAY change the status as part of a user's change, e.g. setting `blocked` when the user adds a blocker.
- **Optional timestamps on projects and areas:** `created-at` and `updated-at` on both, and `completed-at` on projects, with the same meaning as on tasks.
- **Writer rules (§4.4)** now apply to every entity: write `created-at` on creation, and SHOULD set `updated-at` on every change. This is a new obligation for writers creating projects and areas.
- **Area `type` is defined (new §7.6).** It's a free-text label for the kind of area (e.g. `personal`, `work`, `client`), with no fixed values. Implementations MAY group, filter, colour or give icons to areas by it, and SHOULD compare values ignoring case.
- **Overdue tasks are defined (new §5.6):** a task is overdue if it isn't `done` or `dropped` and its `due` has passed. A date `due` has passed once it's before today, and a datetime `due` once that time has passed.
- The task, project and area examples are renumbered (§5.7, §6.7, §7.7).

Existing files: unaffected. Projects with `status: dropped` were previously an unknown status; they're now valid.

### `tdn-uid`: an optional identifier for sync tools

Two-way sync (for example with atproto) needs a key for each entity that survives renames, archiving and title changes. Neither the path nor the title does. S1 now reserves one name, so sync tools don't each invent their own.

A new §4.9 defines `tdn-uid`:

- **It is optional and is not an entity identifier.** Implementations MUST NOT use it for any purpose other than sync. Using it as a primary key, for example, fails for entities without one.
- **Only sync tools add it,** and they SHOULD add it only to the entities they sync.
- **The value is an opaque string.** Generated values SHOULD be UUIDs.
- **No implementation may change or remove an existing value,** except to fix a duplicate (below).
- **References MUST NOT use it.**
- **Duplicates.** Values aren't guaranteed to be unique, since copying a file copies its `tdn-uid`. A sync tool MAY replace a duplicated value. Writers that create an entity by duplicating another MUST NOT copy its `tdn-uid`.
- **Naming.** The `tdn-` prefix signals that the field belongs to Taskdn sync, and avoids clashing with users' own `id` or `uid` fields (TaskNotes v5, for one, writes `id`).

Existing files: unaffected. Any existing `tdn-uid` field is now reserved and must be preserved, which §3.3 already required of unknown fields.