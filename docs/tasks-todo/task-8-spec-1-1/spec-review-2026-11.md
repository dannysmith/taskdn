# Spec review

Companion to `taskdn-review.md`, point 1. Three inputs:

1. **A cold review** by an agent that read only S1, S2, the JSON schemas and the philosophy page, with no access to any implementation. You asked for a read in isolation from the code, and this is it. Summarised below; I agree with almost all of it.
2. **What the implementations actually do**, from running the CLI against edge-case files and reading the desktop parser. This is what turned several of the review's "two implementers might differ" points into "they already do".
3. **External research** on comparable standards and on atproto spaces and lexicons.

## Overall

The spec is small, readable and mostly sound, and its size is worth protecting. The problems are concentrated in four places: what a reference points at, how YAML values are typed, whether `status` is an open or closed set, and which files count as entities. Fixing them is mostly clarification. None needs a redesign, and almost all of it is non-breaking for existing files.

## What the implementations do today

I made a scratch vault with five edge-case tasks and ran the CLI (`tdn list --ai`, then `tdn doctor --ai`), then read the desktop's parser:

| Task file contains                     | CLI `list`                            | Spec says                                 |
| -------------------------------------- | ------------------------------------- | ----------------------------------------- |
| `area: "[[Work]]"`                     | Shown                                 | Fine                                      |
| `area: [[Work]]` (unquoted)            | **Silently missing** (doctor: type error) | Unspecified; it's a nested YAML list  |
| `status: Done`                         | **Silently missing** (doctor: unknown variant) | MUST NOT reject unknown statuses |
| `project: "[[X]]"` (singular key)      | Shown, project ignored                | Unspecified; S2 says "accept `project`"   |
| no `created-at` / `updated-at`         | Shown, "(missing)"                    | S2 says treat as invalid                  |

The desktop app's Rust parser uses the same closed enums: `TaskStatus` and `AreaStatus` (the latter only `active`/`archived`, although S1 makes area status a free string). So neither implementation follows S1 §2.9, and a hand- or agent-written file with an unquoted wikilink or a capitalised status simply disappears from both tools.

Also verified elsewhere (see `taskdn-review.md`):

- **The tools disagree on what a reference points at.** The CLI (Rust index) and desktop (`src/lib/wikilink.ts`) match `[[X]]` against `title`. The Obsidian plugin uses Obsidian's own resolver (`getFirstLinkpathDest`), which matches the filename, and it inserts `[[basename]]` links. Both writers slugify filenames (`q1-planning.md`). So in the demo vault every project and area link is unresolved inside Obsidian, and links the Obsidian plugin writes are unresolved in the CLI and desktop. The starter vault avoids this by naming project and area files after their titles.
- **Timestamps:** the Rust writers emit UTC with `Z`; the CLI's `set status` emits UTC without a zone (read as local by the spec); `append-body` uses the UTC date.

## The cold review, condensed

Ranked by impact on interoperability. "Fix" is the reviewer's proposal; my notes are in italics where I differ or want to add something.

1. **Reference resolution is undefined.** S1 lists three reference forms and never says how any resolves. Title vs filename, which directory is searched, case, duplicates, `#heading` and `|alias`, dangling links (S2's `REFERENCE_ERROR` implies an error; Obsidian treats them as normal). The `./projects/my-project.md` example breaks under both obvious readings (relative to the task file it points into `tasks/projects/`; relative to a vault root, there isn't one). **Fix:** strip `|…` and `#…`; match the basename case-insensitively in the target type's directory (Obsidian semantics); fall back to `title`; report ambiguity on multiple matches; relative paths resolve from the referencing file; dangling references are valid and preserved; writers write `[[basename]]`. *Agree. The title fallback keeps every existing vault working. I'd add that writers creating projects and areas SHOULD name the file after the title, as the starter vault does, so `[[Title]]` and `[[basename]]` coincide and links read naturally.*
2. **YAML typing.** S1 names YAML 1.2, but common parsers behave like 1.1: js-yaml (via gray-matter) and PyYAML turn unquoted dates into native dates, and js-yaml reads `2025-01-15T14:30:00` as UTC. Unquoted `area: [[Work]]` is a nested list. **Fix:** frontmatter is read with the YAML 1.2 core schema (date-like values are strings); writers MUST quote wikilinks; readers SHOULD accept `[["Work"]]` as `[[Work]]`. *Agree, and confirmed: the unquoted form makes the task vanish today.*
3. **`status` reads as closed but must behave as open.** "One of", case-sensitive, MUST NOT reject unknowns, and a closed `enum` in the schema. Unknown statuses fall into "active" by accident of S2's definition, so `cancelled` shows up in Today. **Fix:** `status` is a string with known values; readers match case-insensitively, writers write lowercase; unknown values count as not done, are preserved and shown verbatim; loosen the schema. That's exactly lexicon `knownValues`. *Agree. This is also the precondition for your status mapping idea; see below.*
4. **Which files are entities.** No extension rule; projects and areas only SHOULD live in their directories, yet all three must be configured; subdirectory rules exist for tasks only. **Fix:** an entity is a non-dot `*.md` file directly inside its configured directory, and its type comes from the directory. `tasks/archive/` means only "skip by default"; status stays authoritative.
5. **Time semantics.** "ISO 8601" is far broader than intended; "SHOULD be interpreted as local" plus "MAY ignore timezone" lets two tools read `…Z` as different instants; fractional seconds (what `toISOString()` emits) aren't covered and the schema rejects them; a datetime in a date-only field is undefined; whether a task shows *on* its `defer-until` date is settled only in non-normative S2; `scheduled` has no stated effect on visibility (Things hides future-dated tasks, so implementers will differ). **Fix:** no offset = local wall-clock time, offset = that instant; accept fractional seconds; a datetime in a date field uses its date part; `defer-until` is inclusive; `scheduled` never hides a task.
6. **`projects` contradicts itself.** S1: MUST be an array of exactly one. S2: if there are several, use the first. Neither covers a scalar or a `project:` key, and agents will write `project:` because S2 tells tools to display it that way. **Fix in S1:** writers write a one-element array; readers accept a scalar, use the first element, preserve the rest. *I'd also accept a `project:` key on read, since that's what agents and humans actually type.*
7. **Required timestamps hide files.** Tasks require `created-at`/`updated-at` (projects and areas have neither), and S2 says to skip files missing required fields, so a task written by hand or by an agent without them silently disappears. `updated-at` also goes stale whenever a plain editor touches the file. **Fix:** writers SHOULD set them; readers MUST accept their absence (fall back to mtime if needed); allow both on projects and areas.
8. **Gaps in project semantics.** No dropped/cancelled status, so an abandoned project is "active" forever or falsely `done`. `end-date` means both "completed on" and "expected by". The `blocked` status and `blocked-by` field are two sources of truth.
9. **Smaller issues.** Closing `---` must be "followed by a newline"; empty = absent conflicts with `minItems` and string types in the schemas; schema `maxLength: 500` hard-enforces a SHOULD; schemas declare draft-07 but use `$defs`; area `type` has no defined meaning; area visibility is case-sensitive; no conformance section separating requirements on files, readers and writers; rule 11 (tools must offer configuration) isn't a file-format rule; S2 mixes interop rules with CLI concerns (error codes, agent output). *I'd add: the schemas' `$id`s point at `taskdn.dev`, not `tdn.danny.is`.*

The reviewer's recommended changes, in priority order:

| # | Change                                                                       | Kind                   | Breaking?                     |
| - | ---------------------------------------------------------------------------- | ---------------------- | ----------------------------- |
| 1 | Define reference resolution                                                  | Clarification          | Only the `./projects/` form   |
| 2 | Status as an open string with known values                                   | Clarification          | No                            |
| 3 | Frontmatter data model (YAML 1.2 core, quoted wikilinks)                     | Clarification          | No                            |
| 4 | Entity files are `*.md` directly in their directory                          | Clarification          | Only for misplaced projects/areas |
| 5 | Datetime semantics; writers put offsets on the three timestamps              | Clarification          | No                            |
| 6 | Separate reader/writer rules; lenient reading of timestamps and `projects`   | Simplification         | No                            |
| 7 | Projects: add `dropped`, settle `end-date`, status beats `blocked-by`        | Addition/clarification | No                            |
| 8 | Optional timestamps on all three types; drop area `type` from S1             | Generalisation         | No                            |

## Where I land

**Do now (S1 1.1, all non-breaking):** items 1–6 above. They make the spec say what every tool needs to agree on, and every one of them fixes something that is already broken or inconsistent in the current implementations. Move S2's "active" definition and the `defer-until`/`scheduled` visibility rules into S1, because they *are* the meanings the desktop app relies on. Trim S2 to reading and writing files safely, and move error codes, filter logic and agent output into the CLI's own docs. That makes S2 shorter and S1 slightly longer, and leaves both describing the format rather than one product.

**Discuss:** item 7 (project `dropped` is a real gap; I'd add it) and item 8 (dropping area `type` is tidy but you may be using it).

**Defer, with the door left open:** status mapping and anything atproto-specific. Reasons below.

### Status labels mapped to the 7 meanings

Your idea has good precedent. Linear and Jira do exactly this: custom state names, each tied to a fixed category that the software keys on. Org-mode does a weaker version (`#+TODO: TODO NEXT WAIT | DONE CANCELLED`, which only tells tools open vs done). But Linear and Jira keep the mapping in one shared server. Here every tool reads the files independently, so the mapping has to live with the data: per-tool config drifts, and agents editing files can't see it. The only place every tool already knows is the tasks directory itself, e.g. `<tasks_dir>/.taskdn.yaml`:

```yaml
statuses:
  ready: [todo, open]
  blocked: [waiting]
  dropped: [cancelled]
```

Canonical values always work; labels map many-to-one; an unlisted label is unknown; a tool that changes a status writes the first label listed for that meaning. Tools that ignore the file fall back to unknown-status behaviour, so it's non-breaking.

Why I'd still defer it:

- It would be the spec's first shared config file, and that tends to attract more (field-name mapping, paths).
- A file's meaning would then depend on another file next to it, which is a real cost for agents and plain editors.
- On its own it doesn't buy interop with the obvious candidate, TaskNotes, which differs in field names too (see research below).
- It can't work until implementations stop rejecting unknown statuses, which neither does today. Making `status` an open string with known values (item 2) is the prerequisite, and gets most of the benefit.

So: do item 2 now, write the mapping design down in the spec as a note, and add it when a concrete second system needs it. If you do add it, cover project statuses too: same code, different directory.

### atproto

My view is that atproto shouldn't shape the file format, and from the reviewer's analysis it doesn't need to. The things that make a lexicon mapping clean are the same things worth fixing for files anyway:

- **Status as an open string** maps straight to `knownValues`.
- **Deterministic reference resolution** is what turns `[[X]]` into an `at://` URI. Dangling links need a `{uri?, text}` shape in the lexicon, which is easy once the spec says they're valid.
- **Offsets on the three system timestamps** map straight to lexicon `datetime` (RFC 3339, offset required). User dates (`due`, `scheduled`, `defer-until`, `start-date`, `end-date`) should stay floating local dates; in a lexicon they become plain strings, which is semantically right. Requiring offsets on those would be wrong.
- **Entity type from directory** maps to a collection NSID; status being authoritative means "archived by location" has no atproto equivalent to worry about.

What only atproto needs, and so shouldn't go in S1 now: camelCase names, a required ID field, offsets on user dates, `$type` in files. Identity is the one real gap: records need stable keys that survive renames, and neither path nor title does. A mapper can keep its own key in an unknown frontmatter field today (S1 already preserves those), so no spec change is needed. If one is ever standardised, call it `uid` (as iCalendar and JSCalendar do), keep it optional, and never use it in references.

The bigger question isn't the format, it's what you want atproto to *do*: a one-way mirror so other devices and apps can read your tasks, or two-way sync. Two-way sync between a folder and a remote store means conflict handling, deletes and renames, and it crosses the "no sync, no cloud" line in `docs/overview.md`. Worth deciding that first.

## External landscape (researched 2026-11-14)

Sourced by a research agent, mostly via page summaries, so check exact wording before quoting any of it.

### atproto Spaces

- **Timing:** the alpha went live on 20 Aug 2026. On 13 Nov the team announced **public beta on 1 Dec 2026**: the reference PDS ships Spaces that day and Bluesky updates its PDS fleet at the same time. Promoting Spaces apps to end users is planned for early 2027, with no stable date. Alpha data won't migrate and the hosted alpha PDS goes away. ([announcement](https://atproto.com/blog/getting-ready-for-the-spaces-public-beta), [alpha](https://atproto.com/blog/atproto-spaces-alpha))
- **Mechanics** match what your `atproto-experiment` found: space = (authority DID, space type NSID, skey); records at `at://{space}/space/{type}/{skey}/{author}/{collection}/{rkey}`; `space:` OAuth scopes; a single-member "personal space" is the recommended shape for settings, drafts and notes. Still "access control, not confidentiality". ([proposal 0016](https://github.com/bluesky-social/proposals/tree/main/0016-permissioned-data), [devex goals](https://atproto.com/blog/devex-goals-for-spaces))
- **Sync** is still a prototype (Jetstream `spaces` mode, `listRepoOps` with `since`); offline isn't addressed. ([space sync](https://atproto.com/blog/space-sync))

### Existing task lexicons

There is **no shared or community task lexicon**. Lexicon Community (now on [Tangled](https://tangled.org/lexicon.community/lexicons)) has calendar, location, bookmarks and so on, but nothing for tasks. [Lexicon Garden](https://lexicon.garden) lists several app-specific ones, mostly in Spaces:

| App                         | Status model                                              | Due date                     | Relations                    |
| --------------------------- | --------------------------------------------------------- | ---------------------------- | ---------------------------- |
| TaskedAT (`at.tasked.task`) | `completed` boolean                                       | `dueAt` datetime             | at-uri to list, `position`   |
| Skytick (`dev.skytick.todo`)| `done` boolean                                            | `dueOn` plain `YYYY-MM-DD`   | rkey strings                 |
| chalky.town                 | `completed` boolean                                       | `day` date string            | embedded subtasks            |
| Exosphere kanban            | `status` (user slug) + `statusType` (canonical knownValues) | none                       | separate records             |
| welistskyblue               | closed enum `ongoing\|done`                               | none                         | none                         |

Two things worth noticing. Most of these are far simpler than Taskdn (a boolean), so Taskdn's seven statuses would be the richest model around. And Exosphere's `status` + `statusType` pair is your status-mapping idea expressed per record: the user's label and its canonical meaning travel together, with no shared config file. That's the natural design for a Taskdn lexicon if you ever write one, and it shows the files don't need a mapping layer for atproto's sake.

Since nobody has claimed it, a Taskdn-derived task lexicon could be a reasonable thing to propose to Lexicon Community one day. Not now.

### Lexicon rules that matter for a mapping

- `knownValues` (open) is preferred; the style guide says closed `enum`s "should almost always be avoided".
- `datetime` needs a timezone, an uppercase `T` and whole seconds (`Z` preferred). **No date-only format exists**, so `due`/`scheduled`/`defer-until` become plain strings.
- Record keys: 1–512 characters from `A-Za-z0-9.-_:~`. Slugged filenames qualify; `Japan Trip 2025` doesn't.
- References: `strongRef` (uri + cid) for versioned links, plain `at-uri` otherwise.
- Unexpected fields "should be ignored", which fits Taskdn's preserve-unknown rule.
- Records are best kept to a few dozen KB; ~1 MiB is the guideline ceiling.
- Evolution: new fields optional, no renames, no type changes; anything bigger is a new NSID.

([lexicon spec](https://atproto.com/specs/lexicon), [style guide](https://atproto.com/guides/lexicon-style-guide), [record keys](https://atproto.com/specs/record-key))

### TaskNotes, mdbase and other file formats

- **TaskNotes** now has a standalone spec ([tasknotes-spec 0.3.0-rc](https://tasknotes.dev/developers/specification/)) built on "semantic roles are canonical, storage key names are configurable". Statuses are fully user-defined, each with a "Completed" flag. `projects` is a list of wikilinks, as in Taskdn. v5 (beta) adds a UUID `id` to every task. Because TaskNotes is the side with the mapping layer, a TaskNotes user could in principle point it at Taskdn's field names and statuses. That's another reason Taskdn itself doesn't need one.
- **mdbase** ([v0.3.0](https://mdbase.dev/spec/)) is a generic spec for a folder of Markdown records: `mdbase.yaml` at the collection root, types in `_types/` wrapping JSON Schema 2020-12, and datetimes that MUST carry `Z` or an offset. Its only adopters are TaskNotes v5 and the TaskNotes app. Worth watching: if it catches on, publishing Taskdn's three types as mdbase types would be a cheap interop win, and its root-config convention answers the "where would a mapping file live" question.
- **JSCalendar 2.0** (draft in IESG evaluation) keeps Task `progress` as needs-action / in-process / completed / failed / cancelled, extensible, with `due` as a floating LocalDateTime, which is the same treatment I'm suggesting for Taskdn's user dates. JMAP Tasks has stalled until 2027.
- **Agent-oriented trackers:** [Beads](https://github.com/gastownhall/beads) (`bd`, ~28.7k stars, Thoughtworks Radar "Trial" in Nov 2026) and [Backlog.md](https://github.com/MrLesk/Backlog.md) (one Markdown file per task). Neither is a format to adopt, but **both CLIs are prior art worth studying before the Taskdn CLI redesign**, since they were designed for agents from the start. Beads' status set (open, in_progress, deferred, closed, with "blocked" derived) is a useful contrast with Taskdn's.
- No de facto Obsidian Bases task convention has emerged.
