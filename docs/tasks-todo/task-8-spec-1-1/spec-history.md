# How the spec got to 1.0, and what 1.1 changes about that

Written 2026-11-16, while Spec 1.1 was paused after phase 2. It asks whether 1.1 undoes the simplification work that produced 1.0.

## The history

Read with `git log --follow -- tdn-specs/S1-core.md`. Before 2025-12-22 the spec lived at `docs/user-guide/2-the-specification.md`.

| Date       | Commit    | What happened                                                                                                                                                         |
| ---------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2025-12-11 | `cf5074a` | Danny's hand-written spec (126 lines) rewritten into a formal spec                                                                                                    |
| 2025-12-22 | `1e2551c` | Moved to `tdn-specs/`. S1 is 346 lines, with conformance levels, error handling, timestamps, interoperability, design rationale, compatibility notes and future scope |
| 2025-12-22 | `54087cd` | Split into three specs (task: `docs/tasks-done/2025-12-22-task-specs.md`). S1 stays "purely about files on disk". S2 Interface Design (511 lines) covers output modes, identification, query patterns, errors and search. S3 Data Read/Write (209 lines) covers parse errors, timestamps, preservation, atomic writes and YAML formatting |
| 2025-12-27 | `8a74a90` | "Simplify Specs": S3 deleted, and S2 cut to 251 lines as "Implementation Requirements" (interface modes, output formats, identification and search removed)            |
| 2025-12-30 | `ab5c6e1` | By hand. Removed project `unique-id` and the `taskdn-type` opt-in field. Added "MUST NOT reject unknown statuses" and the preserve-on-modify rules to S1 general rules |
| 2026-01-03 | `bd363b0` | By hand. S1 cut from 327 to 274 lines: conformance levels, design rationale, compatibility notes and future scope removed. Config and filename rules moved into the general rules, and archiving relaxed from SHOULD to MAY. S2 renamed "Implementation Guidance", and it uses only SHOULD and MAY |

Danny's original hand-written spec (`git show cf5074a^:docs/user-guide/2-the-specification.md`) also had a required `tags: [task]` and a `ticker-date` field, both dropped early.

## The thinking behind 1.0

None of the hand edits on 2025-12-30 and 2026-01-03 has a recorded reason. Their direction is consistent, though:

1. **S1 is the file format and nothing else.** The split task says so ("ensure S1 is purely about files on disk"), and later edits kept moving behaviour out.
2. **Behaviour is guidance, not requirement.** S3 was folded into S2, S2 went from "Requirements" to "Guidance", and its keywords became SHOULD and MAY only.
3. **Meanings that are about what users see belong in S2.** The split analysis asked where "active" belongs and answered: "The concept of 'active' is an interface concern—it's about what users see by default. S1 just defines the fields; S2 defines how to interpret them for display."
4. **No speculative fields.** Removed: `unique-id`, `taskdn-type`, `tags: [task]`, project `type`, `ticker-date`.
5. **No rationale, conformance taxonomy or roadmap in the spec itself.** The rationale moved to the website's philosophy page.
6. **Leniency where it matters for data.** Danny himself turned "unknown statuses are invalid" into "MUST NOT reject unknown statuses", and added the preserve-on-modify rules.

The result was a spec an implementer, or an agent writing a task by hand, could read in a few minutes and follow.

## What 1.1 does relative to that

**Continues the 1.0 direction:**

- Leniency for unknown statuses, with "don't lose files" made concrete (§4.2, §4.3, §4.5). 1.0 started this.
- Archiving stays optional, and status stays authoritative.
- Preserving data, extended to "don't rewrite unrelated fields".

**New ground 1.0 didn't cover.** Each of these fixes something that is broken today:

- References and how they resolve (§4.6). The tools disagree and links don't work in Obsidian.
- YAML typing, and unquoted wikilinks (§3.2). Tasks disappear.
- Which files are entities, and recognition by required fields (§4.1, §4.2).
- What dates and datetimes mean (§4.7). The tools write timestamps three different ways.

**Reverses or re-adds things 1.0 deliberately removed:**

| 1.1 change                                             | What 1.0 did                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Active entities and overdue defined in S1 (§4.8, §5.6, §6.6) | Explicitly put "active" in S2 as an interface concern                                                |
| Conformance section and design principle in S1 (§2, §2.1) | Removed the "Conformance Levels" section and the design rationale                                      |
| `tdn-uid` (§4.9)                                       | Removed project `unique-id` on 2025-12-30                                                                 |
| YAML quoting rules as S1 MUSTs (§3.3.5), BOM and CRLF (§3.2.4) | Had quoting and encoding guidance in S3, then cut most of it                                     |
| Directory configuration moved out of S1 into S2        | Moved it *into* S1's general rules on 2026-01-03                                                          |
| Recognition by required fields replaces any marker     | Removed `taskdn-type`, the opt-in marker for directories with mixed content                               |

**Size:** S1 is 274 lines in 1.0 and about 450 in the 1.1 draft. Most of the growth is references, entities and dates. The review pass (`s1-review-pass-1.md`) would remove some.

## Things to consider when picking this up

1. **Should active and overdue go back to S2?** That was the original decision, and the cold review argued the same thing independently. What S1 genuinely needs could be stated in the field definitions: `defer-until` is inclusive, `scheduled` doesn't hide a task, and a project's status doesn't change its tasks. The combined "active" and "overdue" definitions are then display guidance. The case for keeping them in S1 is that tools showing different "today" lists is the inconsistency we're trying to fix.
2. **`tdn-uid` vs the removed `unique-id`.** If `unique-id` was removed because nothing needed it, the same is true of `tdn-uid` today: no sync tool exists. The alternative is to say nothing until a sync tool is built. Sync tools can keep their own key in an unknown field in the meantime, which S1 already preserves (the original spec review suggested exactly this).
3. **Mixed-content directories.** `taskdn-type` existed because people keep other notes in their projects and areas folders. 1.1 recognises a project or area by `title` alone, so in a mixed folder every note with a `title` becomes a project or area. Was `taskdn-type` dropped because the case doesn't matter, or because the marker was too awkward ("adding it to one file excludes all others")?
4. **Directory configuration.** Danny moved it into S1 on 2026-01-03, and 1.1 moved it out again on the grounds that it's a product concern. Decide deliberately.
5. **Keep S1 short to read.** One way to keep the 1.0 feel and still cover the reader rules: put what a writer needs first (format, the three entity types, their fields), and gather the tolerance and resolution rules a tool builder needs into one "Reading files" section. An agent writing a task by hand would then only need the first half.
6. **Rationale in the spec.** 1.0 removed it and 1.1 added §2.1. The principle is useful for implementers, but it could be a sentence or two, or live in S2 or on the website.
