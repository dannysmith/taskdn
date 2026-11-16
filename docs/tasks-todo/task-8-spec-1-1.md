# Task 8: Spec 1.1

**Product:** `tdn-specs/`, plus the website's spec pages. **Background:** `docs/tasks-todo/temporary/spec-review.md` (the cold review and where we landed), `view-state-identity-and-core.md` (the `uid` field) and the `edge-cases` test vault template, whose README records where S1 1.0 is silent and what CLI 1.0.2 does.

S1 1.0 is small and mostly sound, but tools already disagree in the places where it's silent: what a wikilink points at, how YAML values are typed, whether `status` is an open set, and how timestamps are written. Spec 1.1 settles these. Almost all of it is clarification and nothing should break existing files.

This task changes the spec only. The CLI and desktop catch up through `tdn-core` (tasks 11–13), so until then files with an unknown status or an unquoted wikilink still disappear from both.

Every edit to `tdn-specs/` needs Danny's explicit confirmation (`AGENTS.md`, rule 5), so phase 1 settles the decisions before anything is written.

## Phases

### Phase 1: Decisions

Go through these with Danny and record the answers here.

**Guiding principle for the edits:** the spec restricts implementations only where a behaviour would make files incompatible with other tools or change data in ways a user wouldn't expect. Everything else is left to implementations. Meaning comes from what's in the file: readers don't derive state that isn't written down, and writers may do helpful things as long as the result is written to the file.

- [x] **Reference resolution.** The proposal: strip `|alias` and `#heading`; match the basename case-insensitively in the target type's directory (as Obsidian does); fall back to `title`; report ambiguity when several match; relative paths resolve from the referencing file; dangling references are valid and kept. What happens to the `./projects/my-project.md` example, which breaks under both readings?
  - **Decided:** the spec should make references work however they were written (any Obsidian link setting, hand edits, other people's tools), not prescribe one form.
  - **Scope:** references exist only in the four reference fields (task `area` and `projects`, project `area` and `blocked-by`). The field decides the target type. The spec says nothing about links in bodies or anywhere else, and only defines WikiLinks for these fields.
  - **Readers accept any ordinary way of naming a file or title:** a wikilink (with alias, heading, any path style, with or without `.md`), a markdown link (URL-encoded or in angle brackets), a relative or absolute path, a filename, a bare title, and the unquoted `[[X]]` that YAML reads as a nested list.
  - **Only the name resolves.** Reduce the reference to a name (strip link syntax, `|alias`, `#heading`, URL-encoding, folder parts and `.md`), then look it up in the target type's directory: filename first, then `title`, ignoring case and Unicode normalisation.
    - Folder parts are ignored because the spec has no vault or shared root (the three directories are configured independently and needn't be co-located), and only files directly in an entity directory are entities. So `"[[projects/Garden]]"` in `area` finds `areas/Garden.md`; the spec says so explicitly.
    - This answers the `./projects/my-project.md` question: it finds `my-project.md` in the projects dir. The example becomes a wikilink.
  - **Several files match:** the reference is unresolved, and readers SHOULD warn. Tools never pick one, because that depends on directory listing order.
  - **Nothing matches:** the reference dangles but is valid and kept. S2's `REFERENCE_ERROR` moves out of the spec.
  - **Writers** may use any accepted form; the spec recommends one (next decision). When editing a file, writers MUST leave references they aren't changing exactly as written.
  - **Known gap:** a slugged filename reached through the title fallback can resolve differently in Obsidian, which searches the whole vault by filename.
- [x] **Links that resolve in Obsidian.** The CLI names files `japan-trip.md` but writes `[[Japan Trip]]`, and Obsidian matches links to filenames. Either writers name project and area files after their titles (as the starter and demo vaults now do), or writers write links by filename. Pick one.
  - **Decided:** this turned out to be one symptom of a bigger gap. S1 was written from the reader's side, and never said what writers should produce, so each tool invented its own conventions. Spec 1.1 adds writer guidance, split by how binding it is.
  - **S1: what every tool must agree on.** What files mean (reader rules), plus the few things a writer MUST do so other tools can read what it writes:
    - write valid YAML, with wikilinks quoted
    - never overwrite an existing file when creating one: if the name is taken, pick a unique one (e.g. `Japan Trip 2.md`)
    - leave references and fields it isn't changing exactly as written (alongside the existing preserve-unknown-fields and preserve-body rules)
  - **S2: how to write well.** A section on creating and changing files: the conventions a good writer follows, their defaults, and which ones tools SHOULD let users configure. S2 recommends configuration but never requires it (the same reasoning that moves rule 11 out of S1). It also collects writer rules decided elsewhere in this task: timestamps with offsets, lowercase statuses, a one-element `projects` array, and not writing empty fields. So S2 becomes "reading and writing files well" rather than shrinking as far as phase 3 first assumed.
  - **Two configurable writer choices**, with these defaults:
    - **Reference style:** a quoted wikilink by filename, e.g. `"[[Japan Trip]]"`.
    - **Filename for new projects and areas:** the title, with characters unsafe in filenames or links (`/ \ : * ? " < > | # ^ [ ]`) replaced, e.g. `Japan Trip.md`.
    - With both defaults the visible link is the title and always resolves by filename, in Taskdn and in Obsidian. Since readers accept every form (decision 1), no setting can break another tool.
  - **§2.12 is reworded:** readers never depend on filenames; writers only choose names for files they create; users can rename files freely. Task filenames stay up to each tool, since nothing in the spec references a task.
  - **Renaming:** changing a title doesn't rename its file. Rename behaviour is left to each tool.
  - **Not decided here:** the exact options our tools offer (slug or title filenames, wikilinks, plain names, markdown links). Tasks 11–13 decide those, with the settings in the shared `~/.taskdn/config.json` so the CLI and desktop write the same way.
  - Existing vaults with slug filenames and title links keep working through the title fallback. Nothing needs migrating.
- [x] **Project `dropped` status.** An abandoned project can only be left "active" or wrongly marked `done`. The review recommends adding `dropped`. While here: does `end-date` mean "finished on" or "expected by", and does `status: blocked` or `blocked-by` win?
  - **`dropped` is added to project statuses.** It reuses the task word rather than adding `cancelled`, and is non-breaking since unknown statuses are already kept. An active project is one with no status, or a status other than `done` and `dropped`.
  - **A project's status never changes or hides its tasks.** Dropping or finishing a project leaves its tasks' statuses alone. Tools may choose to hide them, but the spec doesn't cascade.
  - **`end-date` is the planned end date.** `start-date` and `end-date` are the user's plan: floating dates that tools SHOULD NOT change when the status changes. An overdue project is one whose `end-date` is past and whose status isn't `done` or `dropped`.
  - **Projects get an optional `completed-at`** with the same rules as tasks: set when the status becomes `done` or `dropped`, removed when it's reopened.
  - **Optional timestamps on projects and areas:** `created-at` and `updated-at` are allowed on both, and `completed-at` on projects, all with the same meaning and writer rules as on tasks. Required-ness on tasks is settled separately in phase 2: readers accept their absence.
  - **Status is the only source of truth for blocked.** Readers MUST take a project's state from `status` alone and MUST NOT infer `blocked` from `blocked-by` (or anything else from it). A project can be `blocked` with no `blocked-by` (blocked by something outside Taskdn), or `in-progress` with an unfinished blocker.
  - **Writers MAY change the status as part of a user action**, e.g. set `status: blocked` when the user adds a `blocked-by`, or offer to unblock once every blocker is done. That's fine because the result is written to the file, so every tool sees the same state.
- [x] **Area `type`.** It has no defined meaning. Drop it from S1 (it's kept as an unknown field), define it, or leave it.
  - **Decided: keep it and define it.** Danny will want to tell areas apart (e.g. personal, work, client), and our own tools are likely to group, colour or give icons to areas by kind, so the spec names the field.
  - **Definition:** `type` is a free-text label for the kind of area. Tools MAY group, filter, colour or give icons to areas by it. Grouping ignores case.
  - **No known values.** Nothing depends on particular values, and every user's will differ.
  - **The name stays `type`.** Renaming it (e.g. `area-type`) would avoid clashing with vaults that use `type:` for note kinds, but would break existing files. The clash is harmless: areas that all say `type: area` just form one group.
  - **Areas only** for now; projects can get the same field later if needed.
- [x] **Status matching.** Case-insensitive on read, lowercase on write? Unknown values count as not done, are kept and shown as written.
  - **`status` is a string with known values.** Tasks, projects (now with `dropped`) and areas each have their own list; other values are valid.
  - **Readers match known values ignoring case, and treat `_` and space as `-`.** `Ready`, `in_progress` and `In Progress` all match. This only normalises formatting and never maps one word to another (that's the later status-aliases idea).
  - **Writers write the lowercase known value when they set a status** and leave a status they aren't changing exactly as written (as in decision 2).
  - **Unknown task and project statuses count as open** (not done, not dropped). They appear in default views, shown exactly as written, so the user can see and fix them; tools MAY style them differently. A side effect is that e.g. `cancelled` shows in a Today view until fixed or until status aliases arrive. Visible and fixable beats invisible.
  - **Areas keep their rule, ignoring case:** no status or `active` is shown, anything else is hidden. So `Active` is now shown.
  - **Missing or empty task status:** the file isn't a task at all; see "What counts as an entity" below. (Provisionally we'd said "treat it as unknown", but that would turn every titled note in a mixed folder into a task.)
- [x] **`uid`.** Reserve an optional field that tools must preserve, never change once set, and never use in references.
  - **Purpose: only for sync tools.** Two-way sync needs a key that survives renames, archive moves and title changes. The spec names one so sync tools don't invent different ones. It's not part of the core data model.
  - **Fully optional for conformance.** Most files will never have one, and a vault where some files have it and others don't is normal. A sync tool will most likely add it only to the files it syncs, when it syncs them.
  - **Only sync tools add or use it.** Other implementations MUST NOT add it and MUST NOT use it to identify entities (e.g. the desktop's view state keys on paths, not on this). Every implementation MUST preserve it. (Tightened from SHOULD NOT while drafting: Danny's concern is that agents and implementers will treat it as a primary key, and anything built that way breaks on entities without one.)
  - **Name:** `tdn-uid` (namespaced, so it signals Taskdn sync and won't clash with users' `id` or `uid` fields, e.g. TaskNotes v5 writes `id`; kebab-case to match the other fields).
  - **Value:** an opaque string; tools generating one SHOULD use a UUID. Readers never parse it.
  - **Once set, it MUST NOT change,** through renames, archive moves and edits.
  - **Never used in references.** References stay human (decision 1).
  - **Duplicates:** copying a file copies its uid. Readers MUST NOT assume uids are unique. A tool that finds two files with the same uid MAY give one a new uid (the one exception to "never change"). A writer that deliberately duplicates an entity MUST NOT copy the uid.
- [x] **What counts as an entity.** S1 was written before any implementation, as a definition of what must be true for a file to be a task, so its "required fields" double as "how to recognise a task". That was partly deliberate: people may keep tasks in a folder alongside other notes, and tools can show only the valid ones and ignore the rest. The cost is that a task with one bad field silently disappears. Danny's notes:
  - Intuitively, a file is a Taskdn task if it has a `title` and a `status` that match what Taskdn expects. With those two, it's reasonable to treat it as a task.
  - One idea is three tiers: fields that make a file an entity, fields that tools can expect and writers must always write, and optional fields. That may be more complicated than needed.
  - Another: recognise a task only when it has the identifying fields, but show an unset or unusual status as something like "unknown".
  - Needs careful thought. Covers missing `title`, missing or empty `status` (see "Status matching"), no frontmatter, YAML that won't parse, and missing timestamps, and how all of this fits the phase 2 lenient-reading rules.
  - **Decided: separate recognising a file from validating its fields.** Readers have two tiers (fields that recognise a file, and everything else); writers have their own obligations.
  - **Recognition.** A file is an entity if it's directly in its configured directory and its frontmatter parses to a mapping with these fields present and non-empty:
    - **Task:** `title` and `status`. Any status value counts, so `waiting` and `Done` are recognised (unknown statuses are shown, per "Status matching").
    - **Project and area:** `title`.
    - Anything else in the directory is a note, and tools ignore it. That keeps mixed folders working.
  - **Once recognised, no other field can hide it.** Readers treat every other field leniently, and a bad field gives at most a warning:
    - missing `created-at` or `updated-at` is fine (tools may fall back to the file's modified time)
    - an invalid value (e.g. `due: next tuesday`) is treated as absent, kept in the file, and MAY be flagged
    - a wrong shape is accepted (a scalar `projects`, a `project:` key, `title: 1984` read as text)
  - **Writers' obligations** (Danny's second tier, as a writer rule rather than something readers rely on): on creation, writers MUST write `title`, `status` (tasks) and `created-at`, and SHOULD keep `updated-at` current. Readers can't rely on `updated-at` anyway, since editing in Obsidian doesn't touch it.
  - **Ignored isn't invisible.** Tools that offer validation (e.g. `tdn doctor`) SHOULD list every file in an entity directory they didn't recognise, with the reason ("no `status`", "YAML doesn't parse", "no frontmatter"). Views stay clean, but nothing is hidden from someone looking. Files whose YAML doesn't parse are never modified.
  - **Accepted tradeoffs:**
    - A note in a mixed folder with a `title` and e.g. `status: draft` shows up as a task with an unknown status. It's visible, and status aliases can map it later. Recognising only known statuses would bring back disappearing tasks.
    - A task written without a `title` is ignored (and listed by validators). Falling back to the filename would make any note with a `status` a task.
    - Projects and areas still need a `title`, so a projects folder of Obsidian notes without `title` shows nothing until titles are added. Same as today.

### Phase 2: S1 edits

- [ ] Deterministic reference resolution, as decided.
- [ ] `status` is an open string with known values.
- [ ] Frontmatter data model: YAML 1.2 core schema, so date-like values are strings. Writers must quote wikilinks; readers should accept the nested-list form `[[Work]]` as a link.
- [ ] Entity files: a non-dot `*.md` file directly inside its configured directory, with its type taken from the directory. `tasks/archive/` only means "skip by default"; status stays authoritative.
- [ ] Datetimes: no offset means local wall-clock time, an offset means that instant; fractional seconds are accepted; a datetime in a date-only field uses its date part. Writers put the local offset on `created-at`, `updated-at` and `completed-at`. User dates (`due`, `scheduled`, `defer-until`, `start-date`, `end-date`) stay floating local dates.
- [ ] Separate rules for readers and writers. Read leniently: missing `created-at`/`updated-at` (fall back to mtime), a scalar `projects`, a `project:` key. Write strictly: a one-element `projects` array.
- [ ] Move the meanings out of S2 into S1: what counts as active, `defer-until` is inclusive, `scheduled` never hides a task.
- [ ] The decisions from phase 1 (`dropped`, `end-date`, area `type`, `uid`).
- [ ] The smaller fixes from `spec-review.md` item 9: closing `---` followed by a newline, empty means absent, a conformance section, rule 11 (tools must offer configuration) moved out of the file format.
- [x] ~~A short note recording the status alias design (see `view-state-identity-and-core.md`), for later.~~ Dropped: aliases go into the spec when they're actually built.
- [ ] Bump to 1.1.0 with a changelog entry.

### Phase 3: S2

- [ ] Trim S2 to reading and writing files safely. Error codes, filter logic and agent output move into the CLI's developer docs (or are dropped, since CLI 2.0 replaces them).
- [ ] Add a section on creating and changing files, as in decision 2: writer conventions, their defaults, and which ones tools should let users configure.
- [ ] Fix the S2 filename in `docs/developer/releases-and-versioning.md` (it says `S2-implementation-requirements.md`).

### Phase 4: JSON schemas

- [ ] Open `status` (no closed `enum`), fractional seconds, offsets, no `maxLength` enforcing a SHOULD, no `minItems` that contradicts "empty means absent".
- [ ] Use the draft that matches `$defs` (or stop using `$defs`), and point `$id` at `tdn.danny.is`.
- [ ] Validate the `demo` and `edge-cases` templates against the new schemas, and check every case lands where the spec says it should.

### Phase 5: Everything that quotes the spec

- [ ] Website spec pages (`website/src/content/docs/specification/`).
- [ ] The "Spec" column in the `edge-cases` README, which currently says "Not specified" or "1.1" in many rows.
- [ ] Any other docs that summarise S1 (`docs/overview.md`, the plugin skill's spec reference). Keep these changes small; the skill is rewritten in task 14 and the website in task 17.

## Done when

S1 1.1.0 and the trimmed S2 are published on the website, the schemas match, and every case in the `edge-cases` template has a defined answer.
