# Edge-Cases Vault

Small files that each test one awkward case: broken YAML, unknown statuses, every kind of link, odd titles and dates, and files in unexpected places. Use it to check how a tool copes with real-world mess, as a baseline for Spec 1.1, and as conformance fixtures for `tdn-core`. The [demo vault](../demo/README.md) is the realistic one.

```bash
bun run vault render edge-cases --date 2026-01-15   # demo-vaults/edge-cases, dates as written
cd demo-vaults/edge-cases && tdn doctor
```

Entity folders are in unusual places, set in `.vault.json`: tasks in `work/tasks/`, projects in `Projects & Plans/` (spaces and an ampersand) and areas in `areas/`. Rendering writes a `.taskdn.json` that matches. The reference date is 2026-01-15, as in the demo vault, and the same date rules apply.

Each file's body says what it tests. The tables below say what [S1](../../tdn-specs/S1-core.md) expects and what CLI 1.0.2 does: "hidden" means `tdn list` leaves the file out without saying so, even with every `--include-*` flag. ✗ marks where the CLI disagrees with the spec.

## Mismatches

The cases most worth fixing, in Spec 1.1 or `tdn-core`:

- **Files disappear.** 18 of the 55 Markdown files in `work/tasks/` and its archive are missing from `tdn list`. Most are broken, but some the spec says must be kept or are simply valid: unknown statuses, a byte order mark, a numeric title. Projects with unknown statuses go the same way, and `doctor` calls area statuses other than `active` or `archived` parse errors.
- **Valid datetimes are flagged.** `doctor` rejects datetimes in `due`, which the spec allows.
- **Links only resolve by exact title.** Filenames, plain filenames, relative paths and heading links all count as broken, though Obsidian and the spec accept them.
- **`doctor` and `list` disagree.** `list` reads the CRLF file but `doctor` says it has no frontmatter. `list --project Garden` matches link text, so it returns tasks whose links `doctor` calls broken.
- **Silent problems.** Nothing warns about missing timestamps, two projects, duplicate titles, ambiguous links or blocked-by cycles.

## Tasks

`work/tasks/`, with all fields valid except the one being tested.

### Frontmatter

| File                      | Case                                 | Spec                              | CLI 1.0.2                              |
| ------------------------- | ------------------------------------ | --------------------------------- | -------------------------------------- |
| `bad-yaml.md`             | Unclosed quote                       | Invalid                           | Hidden; `doctor` reports it            |
| `duplicate-keys.md`       | `status` twice                       | Invalid YAML 1.2                  | Hidden; `doctor` reports it            |
| `unclosed-frontmatter.md` | No closing `---`                     | Invalid                           | Hidden; `doctor` reports it            |
| `leading-blank-line.md`   | Blank line before `---`              | Not frontmatter                   | Hidden; `doctor` reports it            |
| `no-frontmatter.md`       | Plain note                           | Not a task                        | Hidden; `doctor` reports it            |
| `empty-frontmatter.md`    | `---` then `---`                     | Not a task (no required fields)   | Hidden; `doctor` reports it            |
| `empty-file.md`           | Zero bytes                           | Not a task                        | Hidden; `doctor` reports it            |
| `crlf-line-endings.md`    | Windows line endings                 | Valid                             | ✗ Listed, but `doctor` says no frontmatter |
| `byte-order-mark.md`      | Starts with a UTF-8 BOM              | Valid                             | ✗ Hidden; `doctor` says no frontmatter |

### Required fields and statuses

| File                    | Case                              | Spec                                   | CLI 1.0.2                         |
| ----------------------- | --------------------------------- | -------------------------------------- | --------------------------------- |
| `missing-title.md`      | No `title`                        | Invalid                                | Hidden; `doctor` reports it       |
| `missing-status.md`     | No `status`                       | Invalid                                | Hidden; `doctor` reports it       |
| `missing-timestamps.md` | No `created-at` or `updated-at`   | Invalid                                | ✗ Listed; `doctor` says nothing   |
| `unknown-status.md`     | `status: waiting`                 | Must be kept, not rejected             | ✗ Hidden; `doctor` parse error    |
| `capitalised-status.md` | `status: Ready`                   | Case-sensitive, so an unknown status   | ✗ Hidden; `doctor` parse error    |
| `quoted-status.md`      | `status: "in-progress"`           | Valid                                  | Listed                            |
| `empty-status.md`       | `status:` with no value           | Treated as absent, so missing          | Hidden; `doctor` parse error      |

### Links

| File                             | Case                                      | Spec                                    | CLI 1.0.2                                    |
| -------------------------------- | ----------------------------------------- | --------------------------------------- | -------------------------------------------- |
| `unquoted-area-link.md`          | `area: [[Health]]`, a nested list in YAML | Not a string (quoting guidance: 1.1)    | Hidden; `doctor` parse error                 |
| `unquoted-project-link.md`       | `- [[Garden]]` unquoted                   | Not a string                            | Hidden; `doctor` parse error                 |
| `projects-as-string.md`          | `projects: "[[Garden]]"`                  | Must be an array                        | Hidden; `doctor` parse error                 |
| `two-projects.md`                | Two entries in `projects`                 | Must have exactly one                   | ✗ Uses the first; `doctor` says nothing      |
| `singular-project-field.md`      | `project:` instead of `projects:`         | Unknown field, ignored                  | Listed with no project; `doctor` says nothing |
| `broken-project-link.md`         | `[[No Such Project]]`                     | Broken                                  | Listed; `doctor` reports it                  |
| `ambiguous-project-link.md`      | `[[Website]]`: two projects have that title | Not specified (1.1: deterministic resolution) | No warning                           |
| `same-title-area-and-project.md` | Area and project both titled "Garden"     | Each field finds its own kind           | No warning                                   |
| `link-by-filename.md`            | `[[garden-plan]]`                         | Not specified; Obsidian resolves it     | ✗ `doctor` says it doesn't exist             |
| `link-as-plain-filename.md`      | `garden-plan.md`                          | Allowed                                 | ✗ `doctor` says it doesn't exist             |
| `link-as-relative-path.md`       | `../../Projects & Plans/garden-plan.md`   | Allowed, but relative to what?          | ✗ `doctor` says it doesn't exist             |
| `link-as-markdown.md`            | `[Garden](garden-plan.md)`                | Not allowed                             | `doctor` says it doesn't exist               |
| `link-with-alias-and-heading.md` | `[[Garden\|my garden]]`, `[[Garden#Notes]]` | Valid wikilinks                       | ✗ `doctor` says the heading link doesn't exist |
| `link-case-mismatch.md`          | `[[health]]` for "Health"                 | Not specified                           | `doctor` doesn't check task area links       |

### Titles and filenames

| File                          | Case                                       | Spec                       | CLI 1.0.2                        |
| ----------------------------- | ------------------------------------------ | -------------------------- | -------------------------------- |
| `x.md`                        | Filename unrelated to the title            | Any filename is valid      | Listed                           |
| `Café crème ☕.md`            | Accents and emoji                          | Valid                      | Listed                           |
| `日本語のタスク.md`           | Japanese title and filename                | Valid                      | Listed                           |
| `numeric-title.md`            | `title: 1984`, a number in YAML            | Title must be a string     | ✗ Hidden; `doctor` parse error   |
| `boolean-like-title.md`       | `title: No`, `false` in YAML 1.1           | A string in YAML 1.2       | Listed as "No"                   |
| `special-characters-title.md` | Colon, quotes and `#`                      | Valid when quoted          | Listed                           |
| `long-title.md`               | Over 200 characters                        | Valid                      | Listed                           |
| `multiline-title.md`          | Block scalar over two lines                | Valid YAML string          | Listed, title contains a newline |
| `same-title-1.md`, `-2.md`    | Two tasks titled "Call the bank"           | Not specified              | Both listed; no warning          |

### Dates

| File                           | Case                                                 | Spec                           | CLI 1.0.2                          |
| ------------------------------ | ---------------------------------------------------- | ------------------------------ | ---------------------------------- |
| `datetime-forms.md`            | Space and `T` datetimes, with seconds, with offset   | All valid                      | ✗ `doctor` rejects the `due` datetime |
| `utc-timestamp.md`             | `due: 2026-01-16T08:00:00Z`                          | Valid; keep the suffix         | ✗ `doctor` rejects it              |
| `scheduled-datetime.md`        | `scheduled` with a time                              | `scheduled` is date-only       | `doctor` reports it                |
| `invalid-dates.md`             | `2026-02-30`, `next tuesday`, `15/01/2026`           | Invalid                        | Listed; `doctor` reports all three |
| `empty-dates.md`               | Empty, `""` and `null`                               | Treated as absent              | Listed                             |
| `deferred-past-due.md`         | `defer-until` after `due`                            | Not specified                  | No warning                         |
| `updated-before-created.md`    | `updated-at` before `created-at`                     | Not specified                  | No warning                         |
| `completed-but-open.md`        | `completed-at` on a `ready` task                     | Not specified                  | No warning                         |
| `done-without-completed-at.md` | `done` with no `completed-at`                        | Should be set                  | No warning                         |
| `future-created-at.md`         | Created after the reference date                     | Not specified                  | No warning                         |

Rendering on another date shifts every valid date and leaves the invalid ones alone.

### Other fields and locations

| File                                  | Case                                          | Spec                          | CLI 1.0.2                      |
| ------------------------------------- | --------------------------------------------- | ----------------------------- | ------------------------------ |
| `unknown-fields.md`                   | String, list, object and boolean fields       | Ignore, and keep on write     | Listed                         |
| `someday/nested-task.md`              | Subfolder other than the archive              | Not read                      | Not read                       |
| `archive/open-task-in-archive.md`     | `ready` task in the archive                   | Not specified                 | Listed with `--include-archived` |
| `archive/archived-done-task.md`       | A normal archived task, for comparison        | Valid                         | Listed with `--include-archived` |
| `.hidden-task.md`                     | Dotfile                                       | Not specified                 | Listed                         |
| `uppercase-extension.MD`              | `.MD` extension                               | Not specified                 | Not read                       |
| `notes.txt`                           | Not Markdown                                  | Not a task                    | Not read                       |

## Projects

`Projects & Plans/`

| File                     | Case                                                  | Spec                                | CLI 1.0.2                       |
| ------------------------ | ----------------------------------------------------- | ----------------------------------- | ------------------------------- |
| `garden-plan.md`         | Titled "Garden", like an area; has a `## Notes` heading | Valid                             | Listed                          |
| `Website.md`             | Titled "Website", and named `Website.md`              | Valid                               | Listed                          |
| `website-2024.md`        | Also titled "Website"                                 | Not specified                       | No warning                      |
| `dropped-project.md`     | `status: dropped`                                     | Must be kept, not rejected          | ✗ Hidden; `doctor` parse error  |
| `no-status-project.md`   | No `status`                                           | Valid; may show in every view       | Listed                          |
| `start-after-end.md`     | `start-date` after `end-date`                         | Not specified                       | No warning                      |
| `blocked-cycle-a.md`, `-b.md` | Blocked by each other                            | Not specified                       | No warning                      |
| `broken-area-link.md`    | `[[Nowhere]]`                                         | Broken                              | Listed; `doctor` reports it     |
| `untitled-project.md`    | No `title`                                            | Invalid                             | Hidden; `doctor` reports it     |

## Areas

`areas/`

| File                    | Case                         | Spec                                   | CLI 1.0.2                               |
| ----------------------- | ---------------------------- | -------------------------------------- | --------------------------------------- |
| `Garden.md`             | Titled like a project        | Valid                                  | Listed                                  |
| `Health.md`             | A plain area                 | Valid                                  | Listed                                  |
| `side-interests.md`     | No `status`                  | Shown                                  | Listed                                  |
| `paused-area.md`        | `status: paused`             | Free text; valid but hidden from views | Hidden, but ✗ `doctor` parse error      |
| `capitalised-status.md` | `status: Active`             | Not `active`, so hidden                | Hidden, but ✗ `doctor` parse error      |
