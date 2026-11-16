# Spec 1.1 final review: what to look for

Notes for the consistency and wording pass over S1 and S2 once all the edits are in, based on Danny's feedback while drafting.

## Wording

- **Write like a spec.** Short, declarative rules in the register of S1 1.0, with RFC 2119 keywords. One rule says one thing. No conversational explanation ("What's ruled out is…"), no narrating, no "so that it stays visible and can be fixed" style justifications. §4.9 (`tdn-uid`) is the standard to match.
- **Rationale only where it prevents misuse,** and then briefly, ideally as an example in brackets (e.g. "for example as a primary key, which fails for entities without one").
- **Definitions are conditions, not events.** "An entity file is an entity if…", not "when…" or "once a file is an entity…". Files don't move between states.
- **No claims we can't back up, and no predictions.** E.g. "other editors don't update it", "tools commonly show…", "most entities won't have one", "common in vaults where…".
- **Don't imply permission we don't mean.** "Other values are allowed" for status read as "choose your own statuses". Lenient reading is not permission to write.

## What the spec constrains

- **Only constrain what affects compatibility or users' data** (§2.1). Tool features, UI and reporting go in S2 (e.g. listing ignored files, reporting ambiguous references, displaying unknown statuses).
- **Drop MAYs that only permit what's already allowed** (e.g. "and MAY warn about it").
- **Don't forbid helpful writer behaviour.** One change may set several related fields. Writers may change a status as part of a user's action (setting `blocked` when a blocker is added). Tools may show ambiguous matches or ask the user. Only forbid what breaks other tools or surprises the user.
- **Pick MUST vs SHOULD by interop impact.** E.g. "SHOULD NOT treat an unknown status as a defined value", "SHOULD NOT assume which entity an ambiguous reference means". `tdn-uid` restrictions are MUST NOT because misuse breaks implementations.

## Sections to recheck for tone

- §2.1 Design Principle
- §3.2.5 (the YAML library note)
- §4.3 Reading Entity Fields
- §4.6 References (the forms list intro and rule 2)
- §4.7 Dates and Times (the intro and examples)
- §4.8 Active Entities (intro)
- §6.6 Dates and Dependencies (rule 3 is long)

## Consistency checks

- Cross-references and section numbers after all the renumbering.
- "S2 recommends…" forward references in S1 (§3.3.4 filenames, §4.6 reference style) must point at real S2 text after phase 3.
- S2 leftovers: §5.1 calls files missing a required field "invalid"; §6.1 timestamp table says "Task" where it now applies to every entity; Appendix A `REFERENCE_ERROR`.
- "Implementations" vs "readers"/"writers": use the role names wherever a rule applies to one role.
- Terms used consistently: "reference" vs "file reference", "user dates" and "timestamps", "status values".
- §6.5's "If `status` is absent, implementations SHOULD treat the project as having no defined workflow state and MAY display it in all project views": still needed after §4.8?
- "e.g.," vs "for example" style; table padding.
- Typo in §8.1: "guaruntee".
- The task doc's decision record matches what the spec ended up saying.
