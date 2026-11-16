# Task 8: Spec 1.1

**Product:** `tdn-specs/`, plus the website's spec pages. **Branch:** `spec-1-1`. **Must finish before:** roadmap items 9–13, which build on Spec 1.1.

S1 1.0 is small and mostly sound, but tools disagree in the places where it's silent: what a wikilink points at, how YAML values are typed, whether `status` is an open set, which files count, and how timestamps are written. Files with an unknown status or an unquoted wikilink disappear from both the CLI and the desktop app. Spec 1.1 settles these, almost entirely as clarifications that don't break existing files.

This task changes the spec only. The CLI and desktop catch up through `tdn-core` (tasks 11–13).

Spec changes are serious (`AGENTS.md`, rule 5): every change to `tdn-specs/` is confirmed with Danny one at a time, one commit per change.

## Picking this up

- **Where we are:** phases 1 and 2 are done. S1 has been redrafted and reviewed once, cold. **Next is phase 3:** go through `s1-review-pass-1.md` with Danny. It has fixes to make (A), changes that need his nod (B) and six questions (C).
- **See the spec changes so far:**
  - `git diff main...spec-1-1 -- tdn-specs/` shows the whole change.
  - `git log --oneline main..spec-1-1 -- tdn-specs/` lists one commit per change, so `git show <sha>` shows any single change.
- **Read `tdn-specs/CHANGELOG.md` first** for a summary of S1 1.1 as it stands.
- **Supporting files** are in `task-8-spec-1-1/`:
  - `change-log-detailed.md`: every change, commit by commit, with the problem it solves. Later commits supersede some earlier details (e.g. `created-at` became a rule for all entities in the projects commit).
  - `review-checklist.md`: what to look for in review passes, built from Danny's feedback on wording and scope.
  - `s1-review-pass-1.md`: the first S1 review, still to be worked through.
  - `spec-review-2026-11.md`: the original cold review of 1.0 and where we landed, copied from `temporary/`.
- **Other background:** `docs/tasks-todo/temporary/view-state-identity-and-core.md` (status aliases, identity), and `demo-vault-templates/edge-cases/README.md`, which lists every awkward case, what S1 1.0 says and what CLI 1.0.2 does.

## Principles

These came out of the decisions and Danny's review feedback, and apply to every remaining phase.

- **S1 constrains only what tools must agree on for files to work across them, and what protects users' data** (S1 §2.1). UI, reporting and configuration go in S2. A test for each rule: if two tools handle this differently, does a file mean something different, or does data get lost? If not, the rule goes to S2 or goes.
- **Meaning comes from what's written in the file.** Readers don't derive state the file doesn't record. Writers may do helpful things for the user (change several fields at once, set `blocked` when a blocker is added), as long as the result is written to the file.
- **Read leniently, write strictly.** Readers tolerate common mistakes so files don't disappear. Writers produce conforming files.
- **Don't imply permission we don't intend,** e.g. that users can invent statuses.
- **Write like a spec:** short, declarative rules in the register of S1 1.0, with no conversational explanation and no claims we can't back up. See `review-checklist.md`.

## Decisions

Settled with Danny in phase 1, with adjustments made while drafting. The spec is the source of truth for exact wording.

1. **References resolve however they were written.**
   - References exist only in the reference fields: a task's `area` and `projects`, and a project's `area` and `blocked-by`. The field decides the target type. The spec says nothing about links in bodies.
   - Readers accept any common form: wikilinks (with display text, a heading, a path, `.md`), Markdown links, paths, filenames and bare titles, quoted or as an unquoted wikilink. That makes references independent of Obsidian's link settings and of which tool wrote them.
   - A reference's name is what remains without link syntax, display text, headings, percent-encoding, folders and `.md`. It refers to the entity whose filename matches that name, or failing that whose `title` matches, ignoring case after NFC normalisation. Folder paths never matter: there's no vault or shared root.
   - Ambiguous references: readers SHOULD NOT assume which entity is meant, and MAY show the matches or ask. Dangling references are valid.
2. **Writer guidance is split between S1 and S2.** S1 was written from the reader's side and never said what writers produce, so each tool invented its own conventions.
   - S1 holds the writer MUSTs: conform, never overwrite, leave unrelated fields as written, quote wikilinks.
   - S2 gets a section on creating and changing files, with defaults and the choices tools SHOULD let users configure. The two choices are:
     - **Reference style:** default a quoted wikilink by filename.
     - **Filename for new projects and areas:** default the title, with unsafe characters replaced.
   - Renaming is left to each tool. The exact options our tools offer are decided in tasks 11–13 (shared `~/.taskdn/config.json`).
3. **Projects:**
   - **`dropped` status.** A project's status never changes its tasks' statuses.
   - **`end-date` is the planned date,** and actual completion goes in a new optional `completed-at`.
   - **Optional timestamps on projects and areas.**
   - **`status` alone says whether a project is blocked.** Readers never infer it from `blocked-by`. Writers MAY set `blocked` as part of a user's change.
4. **Area `type` is kept and defined:** a free-text label for the kind of area (personal, work, client) that tools can group or style by. Danny wants this. It has no fixed values and is compared ignoring case. The name `type` stays, though it clashes with some vaults' use of `type` for note kinds; the clash is harmless.
5. **Status is a fixed set per type, read leniently.**
   - An entity's status MUST be one of its type's values. Readers match ignoring case, treating `_` and spaces as `-`.
   - A status that matches none of the values is unknown and doesn't conform. Readers still treat the file as an entity with an unknown status, and it counts as active. Writers write lowercase values.
   - This is not a way to add statuses. Status aliases come later, and go into the spec when they're built.
6. **`tdn-uid` is reserved for sync tools only.**
   - It is optional, and not an entity identifier.
   - Implementations MUST NOT use it except for sync, and only sync tools add it. This was tightened from SHOULD NOT, because tools that use it as a primary key break on entities without one.
   - It is never changed or removed, never used in references, and not guaranteed unique.
7. **What counts as an entity: recognising a file is separate from validating its fields.**
   - An entity file is a `.md` file directly in its type's directory (plus the tasks `archive/`).
   - It's an entity if it has its type's required fields, non-empty: `title` and `status` for tasks, `title` for projects and areas. Other files are notes, which keeps mixed folders working.
   - No other field can hide an entity: invalid values are treated as absent, and timestamps are optional.
   - Tools that report problems SHOULD list ignored files (S2).

Also from phase 1: **status aliases** were dropped from 1.1; they go into the spec when built.

## Phases

### Phase 1: Decisions ✅

The decisions are above.

### Phase 2: S1 edits ✅

One commit each:

- [x] Conformance roles (files, readers, writers), the design principle, and general rules split by role
- [x] Frontmatter data model: YAML 1.2 core schema, scalars as text, unquoted wikilinks, BOM and CRLF, writers quote
- [x] Entities: entity files, recognition, lenient field reading, writer rules, archive
- [x] Status: a fixed set per type, lenient matching, unknown statuses
- [x] References: forms, resolution, ambiguous and dangling references
- [x] Dates and times: exact ISO 8601 forms, meanings, timestamp offsets
- [x] Active entities moved from S2 into S1
- [x] Projects and areas: `dropped`, `completed-at`, `blocked-by`, optional timestamps, area `type`, overdue tasks and projects
- [x] `tdn-uid`
- [x] `tdn-specs/CHANGELOG.md`

### Phase 3: S1 review pass

Work through `task-8-spec-1-1/s1-review-pass-1.md` with Danny, then apply it as one commit.

- [ ] Answer the six questions (C):
  1. `created-at` on creation: MUST or SHOULD?
  2. The area status fixed set as a second breaking change
  3. `archive/` for projects and areas
  4. Whether active and overdue stay in S1
  5. Whether `paused` projects are active
  6. Whether the three directories must be different
- [ ] Agree the recommended changes (B): the removals, plus the additions (writers write references that resolve to the intended entity; which tolerated forms conform; the same leniency for `area` and `blocked-by`; and the others listed there).
- [ ] Apply the fixes (A) together with B and C.
- [ ] Update `CHANGELOG.md` and `change-log-detailed.md`.

### Phase 4: S2

- [ ] Trim S2 to reading and writing files. Error codes, filter logic and agent output move into the CLI's developer docs, or are dropped since CLI 2.0 replaces them.
- [ ] Add the section on creating and changing files (decision 2): writer conventions, defaults, and what to make configurable. That makes the "S2 recommends…" references in S1 §3.3 and §4.6 true.
- [ ] Fix the leftovers:
  - §5.1 still calls files missing a required field "invalid"
  - §6.1's timestamp table says "Task" where it means every entity
  - Appendix A has `REFERENCE_ERROR`
- [ ] Decide whether S2 standardises how tools find the three directories (`.taskdn.json`). Coordinate with the shared config in task 11.
- [ ] Fix the S2 filename in `docs/developer/releases-and-versioning.md` (it says `S2-implementation-requirements.md`).

### Phase 5: JSON schemas

- [ ] Status values as `enum`s that accept any case? Or no `enum` at all, since unknown statuses don't conform but must be read? Decide with Danny.
- [ ] Datetimes: fractional seconds, offsets, and datetimes in date-only fields. Timestamps optional. No `maxLength` or `minItems`. Add `tdn-uid`, project `dropped`, `completed-at` and the new timestamps.
- [ ] Use the draft that matches `$defs` (or stop using `$defs`), and point `$id` at `tdn.danny.is`.
- [ ] Validate the `demo` and `edge-cases` templates against the new schemas, and check that every case lands where the spec says it should.

### Phase 6: Full review and version bump

- [ ] A cold review of S1, S2, the schemas and the changelog together (a fresh agent with no task context), plus a wording pass against `review-checklist.md`.
- [ ] Bump S1 and S2 to 1.1.0, and finalise `CHANGELOG.md`.

### Phase 7: Everything that quotes the spec

- [ ] Website spec pages (`website/src/content/docs/specification/`).
- [ ] The "Spec" column in the `edge-cases` README. Many rows change; for example, unknown statuses are now non-conforming but still read.
- [ ] Other docs that summarise S1 (`docs/overview.md`, the plugin skill's spec reference). Keep these changes small: the skill is rewritten in task 14 and the website in task 17.
- [ ] Fix references elsewhere to `uid` (now `tdn-uid`) and "open statuses", e.g. in `task-11-tdn-core.md` and the roadmap.

## Done when

S1 1.1.0 and the trimmed S2 are published on the website, the schemas match, and every case in the `edge-cases` template has a defined answer. When completing the task, move `task-8-spec-1-1/` to `tasks-done/` alongside the task file.
