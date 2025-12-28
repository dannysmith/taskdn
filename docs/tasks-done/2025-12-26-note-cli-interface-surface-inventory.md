# CLI Interface Surface Inventory

**Purpose:** Complete inventory of all implemented CLI commands, flags, and output formats to assess interface design and identify opportunities for simplification or rationalization.

**Source:** Actual implementation in `tdn-cli/` (not requirements docs)

**Date:** 2025-12-26

---

## Table of Contents

1. [Global Flags & Output Modes](#global-flags--output-modes)
2. [Generic Error Conditions](#generic-error-conditions)
3. [Task Operations](#task-operations)
4. [Project Operations](#project-operations)
5. [Area Operations](#area-operations)
6. [Utility Commands](#utility-commands)
7. [Context Commands](#context-commands)
8. [Output Format Comparison](#output-format-comparison)
9. [Interactive Features](#interactive-features)
10. [Summary Statistics](#summary-statistics)

---

## Global Flags & Output Modes

These flags are available on **all commands**:

| Flag          | Effect           | Output Format                                              |
| ------------- | ---------------- | ---------------------------------------------------------- |
| (none)        | Human mode       | Pretty terminal output with colors, boxes, tables          |
| `--ai`        | AI mode          | Structured Markdown (never prompts, always includes paths) |
| `--json`      | JSON mode        | JSON output (never prompts, always includes paths)         |
| `--ai --json` | AI-JSON envelope | JSON with `content` (Markdown) and `references` fields     |

**Key behavioral differences:**

- **Human mode**: Interactive prompts for ambiguity, relative dates ("2 days ago"), emojis, colors
- **AI mode**: Never prompts (fails with error), absolute paths always included, ISO dates
- **JSON mode**: Never prompts, machine-parseable structure with `summary` field
- **AI-JSON mode**: Combines AI's Markdown structure with JSON's parseability

---

## Generic Error Conditions

These errors can occur with **any command**:

### Permission & File System Errors

- **File not found**: When specified path doesn't exist
- **Permission denied**: When file/directory is not readable/writable
- **Invalid path**: When path is outside configured directories

### Configuration Errors

- **Config not found**: No `.taskdn.json` in current/home directory
- **Config invalid**: Malformed JSON in config file
- **Directory not found**: Configured tasks/projects/areas directory doesn't exist

### Parse Errors

- **YAML frontmatter error**: Malformed frontmatter in file
- **Missing required field**: File missing `title` or `status`
- **Invalid status value**: Status not in allowed list for entity type
- **Invalid date format**: Date field not parseable

### Mode-Specific Errors

- **Interactive command in AI/JSON mode**: Commands like `edit` fail in non-human modes
- **Ambiguous match in AI mode**: Fuzzy search returns multiple results (human mode prompts)

---

## Task Operations

### 1. `add [title]`

Create a new task.

**Arguments:**

- `[title]` - Task title (optional - triggers interactive mode if omitted in human mode)

**Flags:**

- `--project <name>` - Assign to project
- `--area <name>` - Assign to area
- `--status <status>` - Initial status (default: inbox)
- `--due <date>` - Due date (accepts natural language)
- `--scheduled <date>` - Scheduled date
- `--defer-until <date>` - Defer until date
- `--dry-run` - Preview without creating

**Valid statuses:** inbox, icebox, ready, in-progress, blocked, done, dropped

**Interactive mode (human only, no args):**

- Prompts for title (required)
- Prompts for status selection
- Prompts for due date (optional)
- Prompts for scheduled date (optional)
- Prompts for defer-until date (optional)
- Prompts for project selection (optional, from existing projects)
- Prompts for area selection (optional, from existing areas)

**Errors specific to this command:**

- Title required (when not interactive)
- Invalid status value
- Invalid date format
- Referenced project/area doesn't exist

**Example outputs:**

```bash
# Human mode
$ taskdn add "Review quarterly report"
✓ Task created: Review quarterly report
  ~/tasks/review-quarterly-report.md
```

```markdown
# AI mode

$ taskdn add "Review report" --project "Q1" --due tomorrow --ai

## Task Created

### Review report

- **path:** ~/tasks/review-report.md
- **status:** inbox
- **created-at:** 2025-12-26T00:41:23
- **due:** 2025-12-27
- **project:** [[Q1]]
```

```json
// JSON mode
$ taskdn add "Review report" --json
{
  "summary": "Task created",
  "task": {
    "path": "~/tasks/review-report.md",
    "title": "Review report",
    "status": "inbox",
    "createdAt": "2025-12-26T00:41:23"
  }
}
```

---

### 2. `list [tasks]`

List tasks with optional filters and sorting.

**Arguments:**

- `[tasks]` - Entity type (default: tasks) - can be omitted

**Filtering flags:**

- `--status <status>[,<status>...]` - Filter by status (OR logic for multiple)
- `--project <name>` - Filter by project name (fuzzy match)
- `--area <name>` - Filter by area name (fuzzy match)
- `--due <when>` - Due date filter (today, tomorrow, this-week)
- `--overdue` - Show overdue tasks only
- `--scheduled <when>` - Scheduled date filter (only accepts: today)
- `--query <text>` - Full-text search in title and body

**Inclusion flags (default excludes these):**

- `--include-done` - Include completed tasks
- `--include-dropped` - Include dropped tasks
- `--include-closed` - Include both done and dropped
- `--include-icebox` - Include icebox tasks
- `--include-deferred` - Include deferred tasks (defer-until in future)
- `--include-archived` - Include tasks from archive/ directory
- `--only-archived` - Show **only** archived tasks (exclusive with --include-archived)

**Completion date filters (require --include-done or --include-closed):**

- `--completed-after <date>` - Tasks completed after date
- `--completed-before <date>` - Tasks completed before date
- `--completed-today` - Tasks completed today
- `--completed-this-week` - Tasks completed this week

**Sorting flags:**

- `--sort <field>` - Sort by field (due, created, updated, title)
- `--desc` - Sort descending (default: ascending)

**Other flags:**

- `--limit <n>` - Limit results to N tasks

**Default behavior:**

- Shows "active" tasks only (excludes done, dropped, icebox, deferred, archived)
- Sorted by created date (newest first)
- No limit

**Errors specific to this command:**

- Invalid status value
- Invalid date in filter
- Invalid sort field
- Conflicting flags (--include-archived and --only-archived)

**Example outputs:**

```bash
# Human mode - default
$ taskdn list
Tasks (3)

  ready
    [ ] Minimal Task
    [ ] Task With Body  [[Personal]]
    [ ] Task Scheduled Fixed Date
```

```markdown
# AI mode - with filters

$ taskdn list --status in-progress --ai

## Tasks (4)

### Test Project Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/in-test-project.md
- **status:** in-progress
- **due:** 2025-01-25
- **project:** [[Test Project]]

### Duplicate Title Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/duplicate-title-b.md
- **status:** in-progress

### In Progress Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/status-in-progress.md
- **status:** in-progress

### Full Metadata Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/full-metadata.md
- **status:** in-progress
- **due:** 2025-01-20
- **project:** [[Test Project]]
```

```json
// JSON mode
$ taskdn list --limit 2 --json
{
  "summary": "Found 2 tasks",
  "tasks": [
    {
      "path": "/Users/danny/.../tasks/minimal.md",
      "title": "Minimal Task",
      "status": "ready",
      "createdAt": "2025-01-10",
      "updatedAt": "2025-01-10"
    },
    {
      "path": "/Users/danny/.../tasks/with-body.md",
      "title": "Task With Body",
      "status": "ready",
      "area": "[[Personal]]",
      "createdAt": "2025-01-10",
      "updatedAt": "2025-01-10"
    }
  ]
}
```

**Field inclusion by mode:**

| Field   | Human           | AI             | JSON       |
| ------- | --------------- | -------------- | ---------- |
| Path    | ✓ (below title) | ✓ (always)     | ✓ (always) |
| Title   | ✓               | ✓ (in heading) | ✓          |
| Status  | ✓ (grouped)     | ✓              | ✓          |
| Due     | ✓ (if set)      | ✓ (if set)     | ✓ (if set) |
| Project | ✓ (if set)      | ✓ (if set)     | ✓ (if set) |
| Area    | ✓ (if set)      | ✓ (if set)     | ✓ (if set) |
| Created | ✗               | ✗              | ✓          |
| Updated | ✗               | ✗              | ✓          |
| Body    | ✗               | ✗              | ✗          |

**Note:** The `list` command shows a compact summary. The `show` command displays all fields including scheduled, defer-until, completed-at, and full body content.

---

### 3. `show <path>`

Show full details of a single task.

**Arguments:**

- `<path>` - Path to task file (required)

**Flags:** None (besides global --ai/--json)

**Errors specific to this command:**

- File not found
- File is not a task (wrong entity type)

**Example outputs:**

```markdown
# AI mode

$ taskdn show tasks/minimal.md --ai

## Minimal Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/minimal.md
- **status:** ready
- **created-at:** 2025-01-10
- **updated-at:** 2025-01-10
```

**Field inclusion:**

- **All modes**: Shows all frontmatter fields + full body content (no truncation)

---

### 4. `today`

Show today's actionable tasks.

**Arguments:** None

**Flags:** None (besides global --ai/--json)

**Included tasks:**

- Due today
- Scheduled for today
- Overdue (due date in past)
- Newly actionable (defer-until = today)
- In-progress (always shown)

**Excluded tasks:**

- Done, dropped, icebox
- Deferred (defer-until in future)
- Archived

**Errors:** None specific to this command

**Example output:**

```markdown
# AI mode

$ taskdn today --ai

## Tasks (9)

### Test Project Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/in-test-project.md
- **status:** in-progress
- **due:** 2025-01-25
- **project:** [[Test Project]]

### Task Due This Week

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/due-this-week.md
- **status:** ready
- **due:** 2025-06-18

[... more tasks ...]
```

---

### 5. `inbox`

Show all inbox tasks.

**Arguments:** None

**Flags:** None (besides global --ai/--json)

**Errors:** None specific to this command

**Example output:**

```markdown
# AI mode

$ taskdn inbox --ai

## Tasks (2)

### Test task from CLI

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/test-task-from-cli.md
- **status:** inbox

### Inbox Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/status-inbox.md
- **status:** inbox
```

---

### 6. `complete <paths...>`

Mark task(s) as done.

**Arguments:**

- `<paths...>` - One or more task file paths (required)

**Flags:**

- `--dry-run` - Preview changes without modifying files

**Changes made:**

- Sets `status: done`
- Sets `completed-at: <timestamp>`

**Supports batch operations:** Yes (multiple paths)

**Batch behavior:**

- Processes all files even if some fail
- Returns success + failure counts
- Exit code 1 if ANY failed, 0 if all succeeded

**Errors specific to this command:**

- File not found
- File is not a task

**Example outputs:**

```markdown
# AI mode - single task

$ taskdn complete tasks/foo.md --ai

## Task Completed

### Fix login bug

- **path:** ~/tasks/foo.md
- **status:** done
- **completed-at:** 2025-12-26T00:45:00
```

```markdown
# AI mode - dry run

$ taskdn complete tasks/minimal.md --dry-run --ai

## Dry Run: Task Would Be Completed

### Minimal Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/minimal.md

### Changes

- **status:** ready → done
- **completed-at:** (unset) → 2025-12-26T00:41:15
```

```markdown
# AI mode - batch with partial failure

$ taskdn complete tasks/a.md tasks/b.md tasks/c.md --ai

## Completed (2)

### ~/tasks/a.md

- **title:** Fix login bug
- **status:** done
- **completed-at:** 2025-12-18T14:30:00

### ~/tasks/c.md

- **title:** Write tests
- **status:** done
- **completed-at:** 2025-12-18T14:30:01

## Errors (1)

### ~/tasks/b.md

- **code:** NOT_FOUND
- **message:** Task file does not exist
```

---

### 7. `drop <paths...>`

Mark task(s) as dropped.

**Arguments:**

- `<paths...>` - One or more task file paths (required)

**Flags:**

- `--dry-run` - Preview changes without modifying files

**Changes made:**

- Sets `status: dropped`
- Sets `completed-at: <timestamp>`

**Supports batch operations:** Yes (identical to complete)

**Errors specific to this command:**

- File not found
- File is not a task

**Output format:** Identical to `complete` command (replaces "Completed" with "Dropped")

---

### 8. `status <paths...> <status>`

Change status of task(s).

**Arguments:**

- `<paths...>` - One or more task file paths
- `<status>` - New status value (last argument)

**Valid statuses:** inbox, icebox, ready, in-progress, blocked, done, dropped

**Flags:**

- `--dry-run` - Preview changes without modifying files

**Changes made:**

- Sets `status: <new-status>`
- If transitioning TO done/dropped: Sets `completed-at`
- If transitioning FROM done/dropped: Clears `completed-at`

**Supports batch operations:** Yes

**Errors specific to this command:**

- Invalid status value
- File not found
- File is not a task

**Example output:**

```markdown
# AI mode

$ taskdn status tasks/foo.md ready --ai

## Task Status Changed

### Fix login bug

- **path:** ~/tasks/foo.md
- **status:** in-progress → ready
```

---

### 9. `update <path> [--set|--unset]...`

Programmatically update task fields.

**Arguments:**

- `<path>` - Task file path (required)

**Flags:**

- `--set <field>=<value>` - Set field to value (repeatable)
- `--unset <field>` - Remove field (repeatable)
- `--dry-run` - Preview changes without modifying files

**Updatable fields:**

- `title` - Task title
- `status` - Task status
- `due` - Due date
- `scheduled` - Scheduled date
- `defer-until` - Defer until date
- `project` - Project reference
- `area` - Area reference
- `created-at` - Created timestamp (rarely modified)
- `updated-at` - Updated timestamp (auto-updated)
- `completed-at` - Completed timestamp

**Field value formats:**

- Dates: ISO 8601 (YYYY-MM-DD) or natural language
- References: `[[Name]]` or just `Name` (brackets added automatically)
- Status: Must be valid status value

**Errors specific to this command:**

- Invalid field name
- Invalid field value for type
- Field not allowed for entity type

**Example outputs:**

```markdown
# AI mode - single field

$ taskdn update tasks/foo.md --set status=ready --ai

## Task Updated

### Fix login bug

- **path:** ~/tasks/foo.md

### Changes

- **status:** in-progress → ready
```

```markdown
# AI mode - multiple fields

$ taskdn update tasks/foo.md --set title="New Title" --set due=2025-12-20 --ai

## Task Updated

### Fix login bug

- **path:** ~/tasks/foo.md

### Changes

- **title:** Fix login bug → New Title
- **due:** (unset) → 2025-12-20
```

```markdown
# AI mode - unset field

$ taskdn update tasks/foo.md --unset project --ai

## Task Updated

### Fix login bug

- **path:** ~/tasks/foo.md

### Changes

- **project:** [[Q1 Planning]] → (unset)
```

```markdown
# AI mode - dry run

$ taskdn update tasks/minimal.md --set status=in-progress --dry-run --ai

## Dry Run: Task Would Be Updated

### Minimal Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/minimal.md

### Changes

- **status:** ready → in-progress
```

---

### 10. `append-body <path> <text>`

Append text to task body with date stamp.

**Arguments:**

- `<path>` - Task file path (required)
- `<text>` - Text to append (required, can be multi-line)

**Flags:**

- `--dry-run` - Preview changes without modifying files

**Behavior:**

- Adds blank line before new content (if body exists)
- Appends text followed by `[YYYY-MM-DD]` date stamp
- Preserves existing body content

**Errors specific to this command:**

- File not found
- File is not a task

**Example outputs:**

```markdown
# AI mode

$ taskdn append-body tasks/foo.md "Made progress on auth flow" --ai

## Task Body Appended

### Fix login bug

- **path:** ~/tasks/foo.md
- **appended:** Made progress on auth flow [2025-12-26]
```

```markdown
# AI mode - dry run

$ taskdn append-body tasks/minimal.md "Test note" --dry-run --ai

## Dry Run: Task Would Be Appended

### Minimal Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/minimal.md

### Text to Append

Test note [2025-12-26]
```

---

### 11. `archive <paths...>`

Move task(s) to archive directory.

**Arguments:**

- `<paths...>` - One or more task file paths (required)

**Flags:**

- `--dry-run` - Preview changes without modifying files

**Behavior:**

- Moves file from `tasks/` to `tasks/archive/`
- Creates `archive/` directory if it doesn't exist
- Handles filename conflicts with numeric suffixes (e.g., `foo-2.md`)

**Supports batch operations:** Yes

**Errors specific to this command:**

- File not found
- File is not a task
- File already in archive

**Example outputs:**

```markdown
# AI mode - single file

$ taskdn archive tasks/foo.md --ai

## Task Archived

### Fix login bug

- **path:** ~/tasks/foo.md
- **to:** ~/tasks/archive/foo.md
```

```markdown
# AI mode - dry run

$ taskdn archive tasks/minimal.md --dry-run --ai

## Dry Run: Task Would Be Archived

### Minimal Task

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/minimal.md
- **to:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/tasks/archive/minimal.md
```

**Batch output:** Same structure as `complete` (Archived + Errors sections)

---

### 12. `edit <path>`

Open task in $EDITOR.

**Arguments:**

- `<path>` - Task file path (required)

**Flags:** None

**Behavior:**

- Opens file in `$VISUAL` or `$EDITOR` environment variable
- Falls back to `vim` if neither set
- Blocks until editor closes
- **Human mode only** - errors in AI/JSON modes

**Errors specific to this command:**

- File not found
- File is not a task
- Command used in AI/JSON mode
- No editor available

**Example:**

```bash
# Human mode
$ taskdn edit tasks/foo.md
# Opens editor, blocks until closed
```

```markdown
# AI mode - ERROR

$ taskdn edit tasks/foo.md --ai

## Error: NOT_SUPPORTED

- **message:** Edit command is not supported in AI mode
- **suggestion:** Use the update command for programmatic changes
```

---

## Project Operations

### 13. `add project <title>`

Create a new project.

**Arguments:**

- `project` - Entity type keyword (required)
- `<title>` - Project title (optional - triggers interactive mode if omitted)

**Flags:**

- `--area <name>` - Assign to area
- `--status <status>` - Initial status (default: no status)
- `--dry-run` - Preview without creating

**Valid statuses:** planning, ready, in-progress, paused, blocked, done

**Note:** Interactive mode prompts for start-date and end-date, but these are not available as command-line flags.

**Interactive mode (human only, no title):**

- Prompts for title (required)
- Prompts for status selection (optional)
- Prompts for area selection (optional)
- Prompts for start date (optional)
- Prompts for end date (optional)

**Errors specific to this command:**

- Title required (when not interactive)
- Invalid status value
- Invalid date format
- Referenced area doesn't exist

**Example outputs:**

```markdown
# AI mode

$ taskdn add project "Q1 Planning" --area "Work" --status planning --ai

## Project Created

### Q1 Planning

- **path:** ~/projects/q1-planning.md
- **status:** planning
- **area:** [[Work]]
- **created-at:** 2025-12-26T00:50:00
```

---

### 14. `list projects`

List projects.

**Arguments:**

- `projects` - Entity type keyword (required)

**Flags:** None (besides global --ai/--json)

**Default behavior:**

- Shows "active" projects only (status not 'done')
- Projects without status are included (considered active)
- No filtering, sorting, or limiting capabilities

**Note:** Unlike `list tasks`, the `list projects` command does not support filtering, sorting, or limit flags.

**Example outputs:**

```bash
# Human mode
$ taskdn list projects
Projects (5)

  in-progress
    Minimal Project
    Test Project  [[Work]]
    Full Metadata Project  [[Work]]

  planning
    Project With Body

  (no status)
    Project Without Status  [[Work]]
```

```markdown
# AI mode

$ taskdn list projects --ai

## Projects (5)

### Minimal Project

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/projects/minimal.md
- **status:** in-progress

### Project With Body

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/projects/with-body.md
- **status:** planning

### Test Project

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/projects/test-project.md
- **status:** in-progress
- **area:** [[Work]]

### Project Without Status

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/projects/no-status.md
- **area:** [[Work]]

### Full Metadata Project

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/projects/full-metadata.md
- **status:** in-progress
- **area:** [[Work]]
```

**Field inclusion:**

| Field       | Human       | AI          | JSON       |
| ----------- | ----------- | ----------- | ---------- |
| Path        | ✓           | ✓           | ✓          |
| Title       | ✓           | ✓ (heading) | ✓          |
| Status      | ✓ (grouped) | ✓ (if set)  | ✓ (if set) |
| Area        | ✓ (if set)  | ✓ (if set)  | ✓ (if set) |
| Description | ✗           | ✗           | ✗          |
| Body        | ✗           | ✗           | ✗          |

---

### 15. `show <path>` (project)

Show full details of a single project.

**Same as task show** - auto-detects entity type from path

**Field inclusion:**

- **All modes**: Shows all frontmatter fields + full body content

---

### 16. `update <path> [--set|--unset]...` (project)

Update project fields.

**Updatable fields:**

- `title` - Project title
- `status` - Project status
- `area` - Area reference
- `start-date` - Start date
- `end-date` - End date
- `description` - Description field
- `unique-id` - Unique identifier
- `created-at`, `updated-at` - Timestamps

**Same flags and behavior as task update**

---

## Area Operations

### 17. `add area <title>`

Create a new area.

**Arguments:**

- `area` - Entity type keyword (required)
- `<title>` - Area title (optional - triggers interactive mode if omitted)

**Flags:**

- `--type <type>` - Area type (e.g., work, personal, client)
- `--status <status>` - Initial status (default: active)
- `--dry-run` - Preview without creating

**Valid statuses:** active, archived

**Interactive mode (human only, no title):**

- Prompts for title (required)
- Prompts for type (optional)
- Prompts for status selection (optional)

**Errors specific to this command:**

- Title required (when not interactive)
- Invalid status value

**Example output:**

```markdown
# AI mode

$ taskdn add area "Acme Corp" --type client --ai

## Area Created

### Acme Corp

- **path:** ~/areas/acme-corp.md
- **status:** active
- **type:** client
- **created-at:** 2025-12-26T00:55:00
```

---

### 18. `list areas`

List areas.

**Arguments:**

- `areas` - Entity type keyword (required)

**Flags:** None (besides global --ai/--json)

**Default behavior:**

- Shows "active" areas only (status = active or unset)
- No filtering, sorting, or limiting capabilities

**Note:** Like `list projects`, the `list areas` command does not support filtering, sorting, or limit flags.

**Example outputs:**

```bash
# Human mode
$ taskdn list areas
Areas (4)

  active
    Area With Body  personal
    Work  work
    Full Metadata Area  work

  (no status)
    Minimal Area
```

```markdown
# AI mode

$ taskdn list areas --ai

## Areas (4)

### Minimal Area

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/areas/minimal.md

### Area With Body

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/areas/with-body.md
- **status:** active
- **type:** personal

### Work

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/areas/work.md
- **status:** active
- **type:** work

### Full Metadata Area

- **path:** /Users/danny/dev/taskdn/tdn-cli/tests/fixtures/vault/areas/full-metadata.md
- **status:** active
- **type:** work
```

**Field inclusion:**

| Field       | Human       | AI          | JSON       |
| ----------- | ----------- | ----------- | ---------- |
| Path        | ✓           | ✓           | ✓          |
| Title       | ✓           | ✓ (heading) | ✓          |
| Status      | ✓ (grouped) | ✓ (if set)  | ✓ (if set) |
| Type        | ✓ (if set)  | ✓ (if set)  | ✓ (if set) |
| Description | ✗           | ✗           | ✗          |
| Body        | ✗           | ✗           | ✗          |

---

### 19. `show <path>` (area)

Show full details of a single area.

**Same as task/project show** - auto-detects entity type from path

---

### 20. `update <path> [--set|--unset]...` (area)

Update area fields.

**Updatable fields:**

- `title` - Area title
- `status` - Area status
- `type` - Area type
- `description` - Description field
- `created-at`, `updated-at` - Timestamps

**Same flags and behavior as task update**

---

### 21. `append-body <path> <text>` (area)

Append text to area body.

**Same behavior as task append-body** - works with any entity type

---

## Utility Commands

### 22. `context [entity-type] [target]`

Get expanded entity context or vault overview.

**See dedicated section below:** [Context Commands](#context-commands)

---

## Context Commands

The `context` command is the most complex, with different behaviors based on arguments and mode.

### Vault Overview: `context --ai`

**Arguments:** None

**Mode requirement:** AI or JSON mode only (human mode errors)

**Returns:**

- Complete vault snapshot
- All areas with project/task counts
- All projects grouped by area or standalone
- All tasks grouped by project/area/standalone
- Timeline (overdue, due today, scheduled today, newly actionable, blocked)
- In-progress task excerpts
- Reference table

**Example output (truncated):**

```markdown
$ taskdn context --ai

# Overview

**Stats:** 4 areas · 5 active projects · 19 active tasks · ⚠️ 7 overdue · ▶️ 4 in-progress
_Excludes: done/dropped/icebox tasks, done projects, archived areas_

---

## Structure

### 📁 Work

Tasks: 4 total (1 direct, 3 via projects)
├── 🔵 Test Project [in-progress] — 3 tasks (2▶️ 1📥)
│ ├── ▶️ Test Project Task
│ └── ▶️ Full Metadata Task
├── Project Without Status — 0 tasks
├── 🔵 Full Metadata Project [in-progress] — 0 tasks
└── 📋 Direct: 1 task (1🟢)

### Projects with no Area

├── 🔵 Minimal Project [in-progress] — 0 tasks
└── 🟡 Project With Body [planning] — 0 tasks

### Tasks with no Project or Area

Tasks: 15 total (2▶️ 10🟢 2📥 1🚫)
├── 🟢 Minimal Task
├── 🟢 Task With Body
[... more tasks ...]

---

## Timeline

### Overdue (7)

- **Test Project Task** — due 2025-01-25 — Test Project → Work
- **Task Due This Week** — due 2025-06-18 — (no project or area)
  [... more tasks ...]

### Blocked (1)

- **Blocked Task** — (no project or area)

---

## In-Progress Tasks (4)

### Test Project Task

Test Project → Work · due 2025-01-25

Another task in Test Project.

[... more tasks with body excerpts ...]

---

## Reference

| Entity       | Type    | Path                                |
| ------------ | ------- | ----------------------------------- |
| Work         | area    | /Users/.../areas/work.md            |
| Test Project | project | /Users/.../projects/test-project.md |

[... all mentioned entities ...]
```

---

### Task Context: `context task <target>`

**Arguments:**

- `task` - Entity type keyword (required)
- `<target>` - Task name (fuzzy match) or path (required)

**Returns:**

- Full task details (all frontmatter + body)
- Parent project (if any) with excerpt
- Parent area (if any) with excerpt
- Reference table

**Example output:**

```markdown
$ taskdn context task "Test Project Task" --ai

# Task: Test Project Task

⚠️ OVERDUE — due 2025-01-25

---

## Task Details

| Field   | Value                               |
| ------- | ----------------------------------- |
| status  | in-progress                         |
| due     | 2025-01-25                          |
| project | [[Test Project]]                    |
| path    | /Users/.../tasks/in-test-project.md |

### Body

Another task in Test Project.

---

## Parent Project: Test Project

| Field  | Value                               |
| ------ | ----------------------------------- |
| status | in-progress                         |
| area   | [[Work]]                            |
| path   | /Users/.../projects/test-project.md |

> A test project in the Work area.

---

## Parent Area: Work

_Via project Test Project_

| Field  | Value                    |
| ------ | ------------------------ |
| status | active                   |
| type   | work                     |
| path   | /Users/.../areas/work.md |

> Work-related tasks and projects.

---

## Reference

| Entity            | Type    | Path                         |
| ----------------- | ------- | ---------------------------- |
| Work              | area    | .../areas/work.md            |
| Test Project      | project | .../projects/test-project.md |
| Test Project Task | task    | .../tasks/in-test-project.md |
```

---

### Project Context: `context project <target>`

**Arguments:**

- `project` - Entity type keyword (required)
- `<target>` - Project name (fuzzy match) or path (required)

**Returns:**

- Full project details (all frontmatter + body)
- Parent area (if any) with excerpt
- Timeline scoped to project (overdue, due today, scheduled today, blocked, newly actionable)
- All tasks in project, grouped by status
- In-progress tasks with body excerpts
- Reference table

**Example output (truncated):**

```markdown
$ taskdn context project "Test Project" --ai

# Project: Test Project

**Stats:** 2 active tasks · ⚠️ 2 overdue · ▶️ 2 in-progress

---

## Project Details

| Field  | Value                               |
| ------ | ----------------------------------- |
| status | in-progress                         |
| area   | [[Work]]                            |
| path   | /Users/.../projects/test-project.md |

### Body

A test project in the Work area.

---

## Parent Area: Work

| Field  | Value                    |
| ------ | ------------------------ |
| status | active                   |
| type   | work                     |
| path   | /Users/.../areas/work.md |

> Work-related tasks and projects.

---

## Timeline

_Scoped to tasks in Test Project_

### Overdue (2)

- **Test Project Task** — due 2025-01-25
- **Full Metadata Task** — due 2025-01-20

### Due Today (0)

_None_

[... other timeline sections ...]

---

## Tasks by Status

### In-Progress (2)

#### Test Project Task

due 2025-01-25

Another task in Test Project.

#### Full Metadata Task

due 2025-01-20

[... body excerpt ...]

### Ready (0)

_None_

[... other status sections ...]

---

## Reference

| Entity             | Type    | Path                         |
| ------------------ | ------- | ---------------------------- |
| Work               | area    | .../areas/work.md            |
| Test Project       | project | .../projects/test-project.md |
| Test Project Task  | task    | .../tasks/in-test-project.md |
| Full Metadata Task | task    | .../tasks/full-metadata.md   |
```

---

### Area Context: `context area <target>`

**Arguments:**

- `area` - Entity type keyword (required)
- `<target>` - Area name (fuzzy match) or path (required)

**Returns:**

- Full area details (all frontmatter + body)
- All projects in area, grouped by status with task counts
- Timeline scoped to area (overdue, due today, scheduled today, blocked, newly actionable)
- In-progress tasks with body excerpts
- Reference table

**Example output (truncated):**

```markdown
$ taskdn context area "Work" --ai

# Area: Work

**Stats:** 3 projects · 3 active tasks · ⚠️ 3 overdue · ▶️ 2 in-progress

---

## Area Details

| Field  | Value                    |
| ------ | ------------------------ |
| status | active                   |
| type   | work                     |
| path   | /Users/.../areas/work.md |

### Body

Work-related tasks and projects.

---

## Projects in Work (4)

### In-Progress (2)

🔵 Test Project [in-progress] — 2 tasks (2▶️)
├── ▶️ Full Metadata Task
└── ▶️ Test Project Task
🔵 Full Metadata Project [in-progress] — 0 tasks

### Planning (1)

Project Without Status — 0 tasks

### Done (1)

✅ Done Project [done] — completed 2025-01-15

---

## Timeline

_Scoped to tasks in Work area_

### Overdue (3)

- **Direct Work Task** — due 2025-02-01 — (direct)
- **Full Metadata Task** — due 2025-01-20 — Test Project
- **Test Project Task** — due 2025-01-25 — Test Project

[... other timeline sections ...]

---

## In-Progress Tasks (2)

### Full Metadata Task

Test Project · due 2025-01-20

[... body excerpt ...]

### Test Project Task

Test Project · due 2025-01-25

Another task in Test Project.

---

## Reference

| Entity       | Type    | Path                         |
| ------------ | ------- | ---------------------------- |
| Work         | area    | .../areas/work.md            |
| Test Project | project | .../projects/test-project.md |

[... all related entities ...]
```

---

## Output Format Comparison

### Task List Output Comparison

**Command:** `taskdn list --limit 2`

#### Human Mode

```
Tasks (2)

  ready
    [ ] Minimal Task
    [ ] Task With Body  [[Personal]]
```

**Characteristics:**

- Grouped by status
- Checkbox indicators
- Inline metadata (area shown if present)
- Compact, scannable

---

#### AI Mode

```markdown
## Tasks (2)

### Minimal Task

- **path:** /Users/.../tasks/minimal.md
- **status:** ready

### Task With Body

- **path:** /Users/.../tasks/with-body.md
- **status:** ready
- **area:** [[Personal]]
```

**Characteristics:**

- Markdown headings for each task
- All paths included
- Bullet list for metadata
- Exact field names (kebab-case)
- Only shows set fields

---

#### JSON Mode

```json
{
  "summary": "Found 2 tasks",
  "tasks": [
    {
      "path": "/Users/.../tasks/minimal.md",
      "title": "Minimal Task",
      "status": "ready",
      "createdAt": "2025-01-10",
      "updatedAt": "2025-01-10"
    },
    {
      "path": "/Users/.../tasks/with-body.md",
      "title": "Task With Body",
      "status": "ready",
      "area": "[[Personal]]",
      "createdAt": "2025-01-10",
      "updatedAt": "2025-01-10"
    }
  ]
}
```

**Characteristics:**

- Structured JSON object
- `summary` field describing result
- `tasks` array with all entities
- CamelCase field names
- Includes timestamps (created, updated)
- Machine-parseable

---

#### AI-JSON Mode

```json
{
  "content": "## Tasks (2)\n\n### Minimal Task\n\n- **path:**...",
  "references": [
    {
      "entity": "Minimal Task",
      "type": "task",
      "path": "/Users/.../tasks/minimal.md"
    },
    {
      "entity": "Task With Body",
      "type": "task",
      "path": "/Users/.../tasks/with-body.md"
    }
  ]
}
```

**Characteristics:**

- JSON envelope with two fields
- `content`: Full AI-mode Markdown
- `references`: Structured reference data
- Best for AI agents needing both formats

---

## Interactive Features

### Interactive Add (Human Mode)

**Triggered when:** `taskdn add` with no title argument in human mode

**Task creation flow:**

1. Title input (required, validated for non-empty)
2. Status selection (inbox, ready, in-progress, etc.)
3. Due date input (optional, natural language accepted)
4. Scheduled date input (optional, natural language accepted)
5. Defer-until date input (optional, natural language accepted)
6. Project selection (optional, from existing projects)
7. Area selection (optional, from existing areas)

**Project creation flow:**

1. Title input (required)
2. Status selection (optional: planning, in-progress, paused, blocked, done)
3. Area selection (optional, from existing areas)
4. Start date input (optional)
5. End date input (optional)

**Area creation flow:**

1. Title input (required)
2. Type input (optional: work, personal, client, etc.)
3. Status selection (optional: active, archived)

**UI library:** `@clack/prompts`

**Features:**

- Ctrl-C cancels safely (no partial operations)
- Sensible defaults shown
- Validation on each input
- Clear error messages

**Not available in:** AI mode, JSON mode (errors with NOT_SUPPORTED)

---

### Fuzzy Matching (Human Mode)

**Used in:** Commands that accept entity names (show, context, complete, etc.)

**Behavior:**

- Case-insensitive substring matching
- Searches in title field
- No typo tolerance (exact substring required)

**Multiple matches:**

- Human mode: Interactive prompt to select from list
- AI mode: Returns AMBIGUOUS error with all matches

**Example (human mode):**

```bash
$ taskdn show "login"
# If multiple tasks have "login" in title:
? Multiple matches found. Select one:
  › Fix login bug (~/tasks/fix-login-bug.md)
    Login page redesign (~/tasks/login-redesign.md)
    Write login tests (~/tasks/login-tests.md)
```

**Example (AI mode):**

```markdown
$ taskdn show "login" --ai

## Error: AMBIGUOUS

- **message:** Multiple tasks match "login"
- **matches:**
  - ~/tasks/fix-login-bug.md — "Fix login bug"
  - ~/tasks/login-redesign.md — "Login page redesign"
  - ~/tasks/login-tests.md — "Write login tests"
```

---

## Summary Statistics

### Commands

| Category           | Count  | Commands                                                                                  |
| ------------------ | ------ | ----------------------------------------------------------------------------------------- |
| Task operations    | 11     | add, list, show, today, inbox, complete, drop, status, update, append-body, archive, edit |
| Project operations | 4      | add project, list projects, show, update                                                  |
| Area operations    | 4      | add area, list areas, show, update                                                        |
| Context/utility    | 1      | context (4 variants)                                                                      |
| **TOTAL**          | **13** | Unique command verbs                                                                      |

---

### Flags

| Category            | Count  | Examples                                                                                                         |
| ------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Global              | 2      | --ai, --json                                                                                                     |
| Filtering           | 15     | --status, --project, --area, --due, --overdue, --scheduled, --query, --include-_, --only-archived, --completed-_ |
| Sorting             | 2      | --sort, --desc                                                                                                   |
| Entity creation     | 7      | --project, --area, --status, --due, --scheduled, --defer-until, --type                                           |
| Entity modification | 3      | --set, --unset, --dry-run                                                                                        |
| Output control      | 1      | --limit                                                                                                          |
| **TOTAL**           | **30** | Distinct flag names                                                                                              |

---

### Output Modes

| Mode        | Trigger     | Use Case                   |
| ----------- | ----------- | -------------------------- |
| Human       | (default)   | Interactive terminal use   |
| AI Markdown | --ai        | AI agents, token-efficient |
| JSON        | --json      | Scripts, piping to jq      |
| AI-JSON     | --ai --json | AI agents needing JSON     |

---

### Entity Types

| Type    | Create | List | Show | Update | Archive |
| ------- | ------ | ---- | ---- | ------ | ------- |
| Task    | ✓      | ✓    | ✓    | ✓      | ✓       |
| Project | ✓      | ✓    | ✓    | ✓      | ✗       |
| Area    | ✓      | ✓    | ✓    | ✓      | ✗       |

---

### Interactive vs Programmatic

| Feature                 | Human Mode  | AI Mode            | JSON Mode          |
| ----------------------- | ----------- | ------------------ | ------------------ |
| Interactive prompts     | ✓           | ✗ (errors)         | ✗ (errors)         |
| Fuzzy matching (reads)  | ✓ (prompts) | ✓ (errors)         | ✓ (errors)         |
| Fuzzy matching (writes) | ✓ (prompts) | ✗ (requires paths) | ✗ (requires paths) |
| Natural language dates  | ✓           | ✓                  | ✓                  |
| Relative date display   | ✓           | ✗ (ISO only)       | ✗ (ISO only)       |
| Colors/emojis           | ✓           | ✗                  | ✗                  |
| File paths in output    | Sometimes   | Always             | Always             |

---

## Key Design Patterns

1. **Verb-first grammar**: `taskdn list` (tasks implied), `taskdn list projects` (explicit)
2. **Global output modes**: `--ai` and `--json` work on all commands
3. **Batch operations**: complete, drop, status, archive support multiple paths
4. **Dry-run preview**: All modification commands support `--dry-run`
5. **Fuzzy vs exact**: Reads accept fuzzy, AI-mode writes require exact paths
6. **Field change tracking**: Update/status/complete show before→after values
7. **Progressive disclosure**: Context commands show full primary entity, excerpts for related
8. **Reference tables**: AI mode includes path lookup tables for entity references
9. **Date flexibility**: Accept natural language, output ISO 8601
10. **Entity detection**: `show`, `update`, `append-body` auto-detect task/project/area from path

---

## Notes on Implementation Completeness

### Fully Implemented

✓ All 13 commands functional
✓ All output modes working (human, AI, JSON, AI-JSON)
✓ Interactive prompts for all entity creation
✓ Batch operations with error handling
✓ Dry-run preview for modifications
✓ Natural language date parsing
✓ Fuzzy matching with disambiguation
✓ Context commands with full relationship resolution
✓ Comprehensive filtering and sorting for tasks
✓ Field validation and error codes

### Edge Cases & Limitations

- **List projects/areas**: No filtering, sorting, or limit capabilities (only shows active entities)
- **Scheduled filter**: Only accepts "today" (not "tomorrow" or "this-week")
- **Archive command**: Only works with tasks (not projects/areas)
- **Edit command**: Blocks in human mode, errors in AI/JSON modes
- **Fuzzy matching**: No typo tolerance (exact substring only)
- **Multi-project tasks**: Files with multiple projects use first, warn in doctor (not implemented)
- **Completion date filters**: Require explicit --include-done/--include-closed flag
- **Empty results**: Always explicit, never silent

---

## Summary

**Total surface area:**

- 13 commands
- 30 distinct flags
- 4 output modes
- 3 entity types
- ~50 command+flag combinations with distinct behavior

This represents the complete interface as implemented in tdn-cli.
