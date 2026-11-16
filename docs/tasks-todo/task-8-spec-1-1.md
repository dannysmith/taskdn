# Task 8: Spec 1.1

**Product:** `tdn-specs/`, plus the website's spec pages. **Background:** `docs/tasks-todo/temporary/spec-review.md` (the cold review and where we landed), `view-state-identity-and-core.md` (the `uid` field) and the `edge-cases` test vault template, whose README records where S1 1.0 is silent and what CLI 1.0.2 does.

S1 1.0 is small and mostly sound, but tools already disagree in the places where it's silent: what a wikilink points at, how YAML values are typed, whether `status` is an open set, and how timestamps are written. Spec 1.1 settles these. Almost all of it is clarification and nothing should break existing files.

This task changes the spec only. The CLI and desktop catch up through `tdn-core` (tasks 11–13), so until then files with an unknown status or an unquoted wikilink still disappear from both.

Every edit to `tdn-specs/` needs Danny's explicit confirmation (`AGENTS.md`, rule 5), so phase 1 settles the decisions before anything is written.

## Phases

### Phase 1: Decisions

Go through these with Danny and record the answers here.

- [ ] **Reference resolution.** The proposal: strip `|alias` and `#heading`; match the basename case-insensitively in the target type's directory (as Obsidian does); fall back to `title`; report ambiguity when several match; relative paths resolve from the referencing file; dangling references are valid and kept. What happens to the `./projects/my-project.md` example, which breaks under both readings?
- [ ] **Links that resolve in Obsidian.** The CLI names files `japan-trip.md` but writes `[[Japan Trip]]`, and Obsidian matches links to filenames. Either writers name project and area files after their titles (as the starter and demo vaults now do), or writers write links by filename. Pick one.
- [ ] **Project `dropped` status.** An abandoned project can only be left "active" or wrongly marked `done`. The review recommends adding `dropped`. While here: does `end-date` mean "finished on" or "expected by", and does `status: blocked` or `blocked-by` win?
- [ ] **Area `type`.** It has no defined meaning. Drop it from S1 (it's kept as an unknown field), define it, or leave it.
- [ ] **Status matching.** Case-insensitive on read, lowercase on write? Unknown values count as not done, are kept and shown as written.
- [ ] **`uid`.** Reserve an optional field that tools must preserve, never change once set, and never use in references.

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
- [ ] A short note recording the status alias design (see `view-state-identity-and-core.md`), for later.
- [ ] Bump to 1.1.0 with a changelog entry.

### Phase 3: S2

- [ ] Trim S2 to reading and writing files safely. Error codes, filter logic and agent output move into the CLI's developer docs (or are dropped, since CLI 2.0 replaces them).
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
