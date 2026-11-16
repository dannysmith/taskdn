# S1 1.1 review pass 1

Combines my own read of S1 with a cold review by an agent that read only S1, the 1.0 diff, S2, the philosophy docs and the edge-cases README (not the task doc). Grouped by what Danny needs to do with each: **A** I'll just fix, **B** recommended changes that need a nod, **C** questions.

## Stepping back

S1 has grown from about 275 lines to about 450. Most of that growth is earning its place: references, which files count, and date meanings are exactly where tools disagreed. But two things have crept in:

- **Rules about tool behaviour rather than file meaning.** Display rules, "MAY" permissions for things nobody forbade, and reporting. §2 says these belong in S2, and S1 still has several.
- **Rules that are hard to follow without the reasoning we had in the room.** Some read as forbidding sensible things (showing custom fields, renaming a file, unlinking a sync ID).

The test I've applied to each rule: does a file mean something different, or does data get lost, if two tools handle this differently? If not, it goes to S2 or goes away. One more thing worth protecting: an agent writing a task by hand should be able to read §5 alone and get it right.

A second thing the review showed: S1 never says which of the forms readers tolerate are themselves conforming. That matters for validators like `doctor` and for §3.3.1 ("MUST NOT make a conforming file non-conforming").

## A. Fixes I'll make (wording, roles, contradictions with what we decided)

1. **§3.3.4 forbids renaming.** "Writers choose filenames only for the files they create" contradicts decision 2 (renaming is up to each tool). Reword to: any valid filename conforms; S2 recommends a convention for new files.
2. **Wrong role:**
   - §4.3.2 says "readers MUST preserve"; preserving is a writer duty, already covered by §3.3.
   - §4.3.4 "readers … preserve the rest": same problem.
3. **§4.2.2 "readers MUST ignore"** non-entity files contradicts S2 §5.3 (list ignored files). Reword: such a file "is not an entity".
4. **§3.2.1 "readers MUST ignore unknown fields"** reads as forbidding showing or filtering custom fields. Reword: readers MUST NOT reject a file or fail because of unknown fields.
5. **§3.1.6 "they share no common root"** is stated as fact, but for most users they do. Reword: implementations MUST NOT assume a common root.
6. **§3.1.1 "All files MUST contain valid UTF-8 Markdown"** contradicts allowing other files in entity directories. Make it "entity files".
7. **§2 "Readers … accept everything this specification allows"** understates. Readers also tolerate some non-conforming forms. Reword to say so.
8. **§3.2.7 unquoted wikilinks** should apply to reference fields only. Otherwise `title: [[Foo]]` has two readings.
9. **§3.2.6 "read it as text"** should say "its text as written", so `title: 1.0` stays "1.0", not "1".
10. **§4.2.1 required fields** should say "non-empty string (or any scalar, §3.2)", so `status: [ready]` doesn't count.
11. **"Today"** is defined in §4.8.2 but used in §5.6 and §6.6.2. Move it to §4.7.
12. **§4.1.2 wording:** files in `archive/` "are archived tasks" should say they're task entity files, and the tasks among them are archived. §5.3 "a file in the tasks directory" should cover the archive too.
13. **§4.6 counts four reference fields,** but `project` (read as `projects`) is a fifth. Mention it.
14. **Examples should show what a conforming writer produces.** The task example should use timestamps with offsets. The project and area examples should have `created-at`.
15. **Small precision fixes that settle real edge cases:**
    - Duplicate keys make frontmatter invalid YAML, so the file isn't an entity (`duplicate-keys.md`).
    - Readers trim surrounding whitespace before matching statuses and reference names. A whitespace-only value is empty.
    - Dates and datetimes must be valid calendar dates and times (`2026-02-30` is invalid).
    - "Ignoring case" means Unicode case folding.
    - §4.6.2 gives the stripping order (link syntax, `|`, `#`, folder, `.md`), and percent-decodes only Markdown link destinations. Titles containing `#`, `|` or `/` can only be referenced by filename (Obsidian forbids those characters in links too).
16. **Tone,** per `review-checklist.md`: tighten §2.1, §3.2.5 (cut the YAML library explanation to a bracket), §4.3, §4.6, §4.7, §6.6.3. Fix "guaruntee".

## B. Recommended changes (need a nod)

**Remove** (UI, repetition, or permission nobody needed):

1. §7.5 "When displaying areas, implementations SHOULD…". §4.8.6 already defines active areas.
2. §6.5 "If `status` is absent, implementations SHOULD treat the project as having no defined workflow state and MAY display it in all project views."
3. §6.5 "A project's status doesn't change its tasks' statuses…", which repeats §4.8.4.
4. §5.1 "Readers MAY leave archived tasks out unless asked". §4.8 already makes archived tasks inactive.
5. §4.3.3 "A missing `created-at` or `updated-at` is not an error". Follows from the fields being optional. The modification-time fallback moves to S2.
6. §5.2, §6.2 and §7.2 "Any valid filename". They repeat §3. Sections renumber.
7. `description` "SHOULD be under 500 characters". No tool depends on it.
8. §7.6 area `type`: keep the definition (free text, kind of area, compared ignoring case), but drop "MAY group, filter, colour or give icons".
9. §4.9 `tdn-uid` rule 5 ("References MUST NOT use it"). §4.6 already says how references resolve, so a uid in a reference just dangles. Keep the rest.

**Change:**

10. **Status values: mark which tolerated forms don't conform.** Each tolerance rule says whether the form conforms. My proposal:
    - **Conforms:** `status: Ready` (matches a value), unquoted `title: 1984`.
    - **Doesn't conform (tolerated):** unknown statuses, unquoted wikilinks, a scalar `projects`, a `project` key, a datetime in a date-only field, invalid values.
11. **Writers MUST write references that resolve to the entity they mean.** This is the important gap the review found. Filenames match first, so a picker that writes `[[Website]]` for `website-2024.md` (also titled "Website") actually points at `Website.md`. In practice it means writing the filename form whenever the title is ambiguous.
12. **Generalise reference leniency.** Single-reference fields (`area`) accept a one-element list, and list fields (`blocked-by`) accept a single value, as `projects` already does. Obsidian writes `area: ["[[Work]]"]` when the property type is set to "list".
13. **§3.3.3 "values exactly as written".** Make the parsed value a MUST and the text a SHOULD, plus one rule: an unquoted wikilink a writer can't keep as written is written quoted. Otherwise a YAML library can turn `[[Work]]` into `- - Work` and Obsidian stops seeing a link.
14. **Writers MUST NOT modify a file they can't parse.** This widens §4.2.3 to cover invalid UTF-8 and unclosed frontmatter.
15. **No-overwrite also covers moves** (e.g. archiving onto an existing name). A name counts as taken if it matches ignoring case, so `foo.md` next to `Foo.md` can't make references ambiguous.
16. **Archive in and out.** Writers MAY move any task into `archive/` and back. Writers that reopen an archived task SHOULD move it back, otherwise it drops out of every default view.
17. **Changing a task's project replaces the whole `projects` list** (and any `project` key). Say so explicitly, so dropping extra entries is clearly part of the user's change.
18. **`completed-at` only counts while the status is `done` or `dropped`.** Writers SHOULD remove it when reopening (S2 already says this). This settles `completed-but-open.md`.
19. **§4.9 wording:**
    - "MUST NOT use it for any purpose other than sync" also forbids displaying it. Make it "MUST NOT rely on it to identify entities except for sync".
    - "MUST NOT change or remove" forbids a sync tool unlinking. Make it "only sync tools change or remove it".
20. **§6.6.3** should say tools may still show dependencies; they just don't infer status from them. Fold §6.6.4 into it as a short clause, rather than a separate MAY.

## C. Questions

1. **`created-at` on creation: MUST or SHOULD?** Nothing breaks across tools without it, and readers already can't rely on it. §2.1 says that makes it a SHOULD. Recommend SHOULD.
2. **Area status is now a fixed set,** so area statuses that were valid free text in 1.0 (e.g. `paused`) no longer conform. They still hide the area, so behaviour doesn't change. Recommend: keep the fixed set and list it as a second breaking change. The alternative is to keep area status as free text, where anything but `active` hides.
3. **Project and area archives.** Moving finished projects into `Projects/Archive/` is a common Obsidian habit, and under 1.1 those projects stop being read, so references to them dangle. Recommend: any entity directory may have an `archive/`. Archived entities aren't active, but references still resolve to them. It's symmetric with tasks, and it shrinks the one breaking change.
4. **Active and overdue in S1 or S2?** The review argues they're reporting definitions, not file meaning. Recommend keeping them in S1, because tools disagreeing on what "today" shows is exactly the problem, and broadening §2.1 to "what files mean and what tools must agree on".
5. **Are `paused` projects active?** They are today (S2 1.0 only excluded `done`), while `icebox` tasks aren't. Recommend leaving them active.
6. **Must the three directories be different?** If projects and areas share a folder, every file with a `title` is both. Recommend a one-line rule: each type's directory MUST be different.

## Not now

- The JSON schemas contradict 1.1. That's phase 4.
- S1 points at S2 text that doesn't exist yet: the filename convention and the reference form. That's phase 3.
- Whether S2 standardises how tools find the three directories (`.taskdn.json`). Raise it in phase 3, alongside `~/.taskdn/config.json` from task 11.
- A task's area versus its project's area (no inheritance in S1): leave to tools.
