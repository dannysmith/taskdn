# Phase 4: CLI Tool

Command-line interface for humans and AI agents.

## Context & Dependencies

```
┌─────────────────────┐
│     Rust SDK        │
│   (taskdn-rust)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TypeScript SDK     │
│    (taskdn-ts)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│       CLI           │  ← This phase
│    (taskdn-cli)     │
└─────────────────────┘
```

**Depends on:** TypeScript SDK (Phase 3) must be complete first.

**Consumed by:**

- Human users (terminal)
- AI coding assistants (Claude Code, Cursor, etc.)
- Shell scripts and automation

---

## Two User Types, Two Modes

The CLI serves two fundamentally different users with different needs:

| Human User                               | AI Agent                            |
| ---------------------------------------- | ----------------------------------- |
| Wants quick, scannable output            | Wants structured, complete data     |
| Types short commands                     | Needs unambiguous identifiers       |
| Tolerates prompts and interaction        | Needs single-call efficiency        |
| Values aesthetics (colors, alignment)    | Values token efficiency             |
| Thinks in fuzzy terms ("the login task") | Needs exact references (file paths) |

Rather than compromise, we embrace this split with distinct modes.

---

## Output Modes & Flags

### The Flag System

| Flags    | Mode   | Format                  | Prompts? |
| -------- | ------ | ----------------------- | -------- |
| (none)   | Human  | Pretty (colors, tables) | Yes      |
| `--json` | Script | JSON                    | No       |
| `--ai`   | AI     | Markdown (structured)   | No       |

- **`--ai`** is a _mode_ that changes behavior: no prompts, always includes file paths, structured errors, token-efficient Markdown output
- **`--json`** is a _format_ override for programmatic parsing (scripts, piping to `jq`)

### AI Mode Behaviors

When `--ai` is set:

- Output is structured Markdown optimized for LLM consumption
- File paths are always included in output (for follow-up commands)
- Never prompts for input—either succeeds or fails with clear error
- Errors are structured and include actionable information
- Output degrades gracefully when truncated (e.g., via `head -100`)

### Why Markdown for AI Mode?

AI coding agents (Claude Code, Cursor, etc.) run CLI commands and receive stdout in their next turn. The output format should:

1. **Be token-efficient** — LLMs pay per token; verbose formats waste context
2. **Degrade gracefully** — Agents often pipe through `head -100`; partial output should still be useful
3. **Require no parsing** — LLMs can read Markdown directly without code execution
4. **Be familiar** — LLMs are trained heavily on Markdown (docs, READMEs, etc.)

JSON fails criteria 2 and 3: truncated JSON is invalid, and LLMs must mentally parse structure. YAML is better but still has structure that breaks mid-stream. Markdown is text that happens to be organized.

### Example Output Comparison

**Human mode (default):**

```
📋 Tasks (3)

  🔵 In Progress
  • Fix login bug                    due: today
    ~/tasks/fix-login-bug.md

  ⚪ Ready
  • Write documentation              project: Q1 Planning
```

**AI mode (`--ai`):**

```markdown
## Tasks (2)

### Fix login bug
- **Path:** ~/tasks/fix-login-bug.md
- **Status:** in-progress
- **Due:** 2025-12-15
- **Project:** Q1 Planning

### Write documentation
- **Path:** ~/tasks/write-docs.md
- **Status:** ready
- **Project:** Q1 Planning
```

**JSON mode (`--json`):**

```json
{
  "summary": "Found 2 tasks",
  "tasks": [
    {"path": "~/tasks/fix-login-bug.md", "title": "Fix login bug", "status": "in-progress", "due": "2025-12-15"},
    {"path": "~/tasks/write-docs.md", "title": "Write documentation", "status": "ready", "project": "Q1 Planning"}
  ]
}
```

### JSON Output Structure

JSON output always includes a `summary` field alongside the data:

```json
{
  "summary": "<one-sentence description of what was returned>",
  "<entity-type>": [...]
}
```

**Examples:**

```json
// Task list
{
  "summary": "Found 3 tasks",
  "tasks": [...]
}

// Empty result
{
  "summary": "No tasks match the specified criteria",
  "tasks": []
}

// Context command (multiple entity types)
{
  "summary": "Work area with 2 projects and 8 tasks",
  "area": {...},
  "projects": [...],
  "tasks": [...]
}

// Single entity (show command)
{
  "summary": "Task: Fix login bug",
  "task": {...}
}
```

This structure ensures:
- Results are self-documenting
- Empty results are explicit (not silent)
- Entity types are clear from the keys
- Scripts access data via `.tasks`, `.projects`, etc.

### Empty Results

Empty results are always explicit, never silent:

**Human mode:**
```
No tasks found matching your criteria.
```

**AI mode:**
```markdown
## Tasks (0)

No tasks match the specified criteria.
```

**JSON mode:**
```json
{
  "summary": "No tasks match the specified criteria",
  "tasks": []
}
```

### AI Mode Output Specification

This section details the exact format for `--ai` mode output.

#### Heading Structure

Output follows a logical heading hierarchy that is readable by both humans and LLMs:

- `##` for top-level sections (entity type + count)
- `###` for individual entities
- Nested contexts may go deeper as needed for logical structure

#### Fields by Command

**`list` command** — Scannable summary for decision-making:

| Category | Fields |
|----------|--------|
| Always shown | path, title (in heading), status |
| Shown if set | due, project (or area if no project) |
| Omitted | tags, scheduled, defer-until, created, updated, completed, body |

**`show` command** — Full detail for examination:

- All frontmatter fields (nothing omitted)
- Full body content

**`context` command** — Hierarchy with focused detail:

| Entity queried | Primary entity | Related entities |
|----------------|----------------|------------------|
| Area | Full frontmatter + body | Projects: title, path, status, task count<br>Tasks: title, path, status, due |
| Project | Full frontmatter + body | Parent area: title, path<br>Tasks: title, path, status, due |
| Task | Full frontmatter + body | Parent project: title, path, status<br>Parent area: title, path |

- **Primary entity:** Full frontmatter + body
- **Related entities:** Summary only (title, path, status; for tasks: also due)
- **With `--with-bodies`:** All entities include full frontmatter + body

#### Array Fields

Arrays (like tags) are represented as comma-separated inline values:

```markdown
- **Tags:** bug, urgent, frontend
```

#### Date Formats

| Field type | Format | Example |
|------------|--------|---------|
| Date fields (due, scheduled, defer-until) | `YYYY-MM-DD` | `2025-12-20` |
| Timestamp fields (created, updated, completed) | `YYYY-MM-DDTHH:MM:SS` | `2025-12-15T14:30:00` |

#### Body Inclusion Rules

| Command | Body behavior |
|---------|---------------|
| `list` | Never includes bodies |
| `show` | Always includes full body |
| `context` | Includes body of primary entity only |
| `context --with-bodies` | Includes bodies for all entities |

---

## Commands

### Command Grammar

Commands follow a verb-first pattern where tasks are the implied default:

```bash
taskdn list                    # List tasks (implied)
taskdn list projects           # List projects
taskdn list areas              # List areas
taskdn add "Task title"        # Add task (implied)
taskdn add project "Q1"        # Add project
taskdn add area "Work"         # Add area
```

Tasks are 90% of usage, so they get the shortest syntax. Projects and areas require explicit naming.

### Convenience Commands

These shortcuts exist for high-frequency daily operations:

```bash
taskdn today                   # Tasks due today + scheduled for today
taskdn inbox                   # Tasks with status: inbox
taskdn next                    # Smart prioritization (see below)
```

**`taskdn next`** returns the most actionable tasks, prioritized by:
- Overdue tasks (highest priority)
- Due today
- Due this week
- Currently in-progress
- Ready status
- Has a project (vs orphaned)

This is the "what should I work on?" command.

### Context Command

The key command for AI agents. Returns an entity plus its related context in a single call.

```bash
# Area context: area + its projects + all their tasks
taskdn context area "Work"
taskdn context area "Acme"           # Fuzzy matches "Acme Corp"

# Project context: project + its tasks + parent area
taskdn context project "Q1 Planning"

# Task context: task + parent project + parent area
taskdn context task ~/tasks/foo.md

# No args: vault overview
taskdn context --ai                   # AI: returns vault overview (see below)
taskdn context                        # Human: TBD (may be interactive)
```

**Vault overview (`taskdn context --ai` with no arguments):**

Returns a high-level overview of the vault's current state:

```markdown
## Vault Overview

### Areas (3)

#### Work
- **Path:** ~/areas/work.md
- **Projects:** 2 active
- **Tasks:** 15 active

#### Personal
- **Path:** ~/areas/personal.md
- **Projects:** 1 active
- **Tasks:** 8 active

### Summary

- **Total active tasks:** 47
- **Overdue:** 2
- **In progress:** 3

### This Week

#### Due (5)

- Fix login bug — ~/tasks/fix-login.md (due: 2025-12-18)
- Review report — ~/tasks/review-report.md (due: 2025-12-20)

#### Scheduled (3)

- Team standup prep — ~/tasks/standup-prep.md (scheduled: 2025-12-19)
```

**Human mode (no `--ai` flag, no arguments):** Returns an error prompting the user to either specify an entity or use `--ai` for vault overview. Human-mode vault overview may be added in a future version.

```
Error: Please specify an entity (area, project, or task) or use --ai for vault overview.

Examples:
  taskdn context area "Work"
  taskdn context project "Q1 Planning"
  taskdn context --ai
```

**What context returns for a specific entity (example: `taskdn context area "Work" --ai`):**

```markdown
## Area: Work

- **Path:** ~/areas/work.md
- **Status:** active

## Projects in Work (2)

### Q1 Planning
- **Path:** ~/projects/q1-planning.md
- **Status:** in-progress
- **Tasks:** 5

### Client Onboarding
- **Path:** ~/projects/client-onboarding.md
- **Status:** ready
- **Tasks:** 3

## Tasks in Work (8)

### Fix login bug
- **Path:** ~/tasks/fix-login-bug.md
- **Status:** in-progress
- **Project:** Q1 Planning
- **Due:** 2025-12-15

### Write documentation
- **Path:** ~/tasks/write-docs.md
- **Status:** ready
- **Project:** Q1 Planning
```

**Body inclusion:** Task/project/area bodies are NOT included by default. Use `--with-bodies` to include them.

### Show Command

View a single entity with its full content (body included). No expanded context.

```bash
taskdn show ~/tasks/fix-login-bug.md
taskdn show project "Q1 Planning"
taskdn show area "Work"
```

### List Command

List and filter entities. Supports text search via `--query`.

```bash
# Tasks (default)
taskdn list                              # All active tasks
taskdn list --status ready               # Filter by status
taskdn list --status ready,in-progress   # Multiple statuses
taskdn list --project "Q1 Planning"      # Filter by project
taskdn list --area "Work"                # Filter by area
taskdn list --due today                  # Due today
taskdn list --due tomorrow               # Due tomorrow
taskdn list --due this-week              # Due this week
taskdn list --overdue                    # Past due date
taskdn list --scheduled today            # Scheduled for today
taskdn list --query "login"              # Text search in title/body

# Projects
taskdn list projects                     # All active projects
taskdn list projects --area "Work"       # Filter by area
taskdn list projects --status planning   # Filter by status

# Areas
taskdn list areas                        # All active areas
```

#### Sorting

```bash
taskdn list --sort due                   # By due date (ascending)
taskdn list --sort created               # By creation date
taskdn list --sort updated               # By last update
taskdn list --sort title                 # Alphabetical
taskdn list --sort due --desc            # Descending order
```

**Default sort order:** `created` (newest first). Use `--sort` for custom ordering, or `taskdn next` for smart prioritization.

**Null handling:** Tasks without a value for the sort field (e.g., no due date) appear last.

#### Filter Combination Logic

Filters combine using boolean logic:

- **Same filter with comma-separated values = OR**
  ```bash
  taskdn list --status ready,in-progress
  # Returns tasks where status = ready OR status = in-progress
  ```

- **Different filter types = AND**
  ```bash
  taskdn list --project "Q1" --status ready
  # Returns tasks where project = "Q1" AND status = ready
  ```

- **Contradictory filters = empty result (no error)**
  ```bash
  taskdn list --due today --overdue
  # Logically contradictory, returns empty result
  # No error—this is mathematically correct (empty intersection)
  ```

This follows standard CLI conventions (similar to `find`, `grep`, etc.) and produces predictable, composable behavior.

#### Completed Task Queries

To query completed tasks, use `--include-done` or `--include-closed` with date filters:

```bash
# Primitive filters (composable)
taskdn list --include-done --completed-after 2025-12-01
taskdn list --include-done --completed-before 2025-12-15
taskdn list --include-done --completed-after 2025-12-01 --completed-before 2025-12-15

# Convenience aliases
taskdn list --include-done --completed-today       # Finished today
taskdn list --include-done --completed-this-week   # Finished this week
```

The `--completed-after` and `--completed-before` filters can be combined for date ranges. The convenience aliases (`--completed-today`, `--completed-this-week`) are shorthand for the appropriate date range.

**Note:** These filters require `--include-done` or `--include-closed` to be explicit about including completed tasks.

#### Limiting Results

```bash
taskdn list --limit 20               # Return at most 20 results
taskdn list --overdue --limit 5      # Top 5 overdue tasks
```

Results are limited *after* sorting, so `--limit` combined with `--sort` gives you "top N by X".

### Add Command

Create new tasks, projects, or areas.

```bash
# Tasks
taskdn add "Review quarterly report"                    # Quick add to inbox
taskdn add "Review report" --project "Q1" --due friday  # With metadata
taskdn add "Task" --status ready --area "Work"          # With status and area
taskdn add "Task" --scheduled tomorrow                  # With scheduled date
taskdn add "Task" --defer-until "next monday"           # Deferred task
taskdn add                                              # Interactive (human only)

# Projects
taskdn add project "Q1 Planning"
taskdn add project "Q1 Planning" --area "Work" --status planning

# Areas
taskdn add area "Work"
taskdn add area "Acme Corp" --type client
```

**AI mode output:**

The output always includes the path so AI agents can reference the created entity in follow-up commands.

```markdown
## Task Created

### Review quarterly report
- **Path:** ~/tasks/review-quarterly-report.md
- **Status:** inbox
- **Created at:** 2025-12-18T14:30:00
```

With additional fields specified:

```markdown
## Task Created

### Review quarterly report
- **Path:** ~/tasks/review-quarterly-report.md
- **Status:** ready
- **Project:** Q1 Planning
- **Due:** 2025-12-20
- **Created at:** 2025-12-18T14:30:00
```

Projects and areas follow the same pattern:

```markdown
## Project Created

### Q1 Planning
- **Path:** ~/projects/q1-planning.md
- **Status:** planning
- **Area:** Work
- **Created at:** 2025-12-18T14:30:00
```

### Task Operations

```bash
# Status changes
taskdn complete ~/tasks/foo.md           # Mark done
taskdn drop ~/tasks/foo.md               # Mark dropped
taskdn status ~/tasks/foo.md blocked     # Change to any status

# Edit
taskdn edit ~/tasks/foo.md               # Open in $EDITOR (human only)

# Programmatic update (for AI/scripts)
taskdn update ~/tasks/foo.md --set status=ready
taskdn update ~/tasks/foo.md --set title="New Title" --set due=2025-12-20
taskdn update ~/tasks/foo.md --unset project    # Remove field

# Values with spaces need quotes (either style works)
taskdn update ~/tasks/foo.md --set title="My Task Title"
taskdn update ~/tasks/foo.md --set "title=My Task Title"

# Archive (manual)
taskdn archive ~/tasks/foo.md            # Move to tasks/archive/
```

### Utility Commands

```bash
taskdn                                   # Shows --help
taskdn --version                         # Show version
taskdn config                            # Show current config
taskdn config --set tasksDir=./tasks     # Set a value
taskdn init                              # Interactive setup (creates config)
```

### Doctor Command

Comprehensive health check for the entire vault. Reports problems but does not fix them.

```bash
taskdn doctor                            # Full health check
taskdn doctor --ai                       # Structured output for AI agents
taskdn doctor --json                     # JSON output for scripts
```

**What it checks:**

| Level | Checks |
|-------|--------|
| System | Config file exists and is valid |
| System | Tasks/projects/areas directories exist and are accessible |
| File | YAML frontmatter is parseable |
| File | Required fields present (title, status) |
| File | Status values are valid |
| File | Date fields are valid format |
| References | Project references point to existing projects |
| References | Area references point to existing areas |

**Human mode output:**

```
✓ Config found (~/.config/taskdn/config.json)
✓ Tasks directory (47 files)
✓ Projects directory (6 files)
✓ Areas directory (4 files)

⚠ 3 issues found:

  ~/tasks/fix-login.md
    → References non-existent project "Q1 Planing" (did you mean "Q1 Planning"?)

  ~/tasks/old-task.md
    → Invalid status "inprogress" (valid: inbox, ready, in-progress, ...)

  ~/projects/abandoned.md
    → YAML parse error on line 3

Summary: 3 issues in 57 files checked
```

**AI mode output:**

```markdown
## System Health

- **Config:** OK (~/.config/taskdn/config.json)
- **Tasks:** OK (47 files)
- **Projects:** OK (6 files)
- **Areas:** OK (4 files)

## Issues (3)

### ~/tasks/fix-login.md
- **Code:** REFERENCE_ERROR
- **Field:** project
- **Message:** References non-existent project "Q1 Planing"
- **Suggestion:** Did you mean "Q1 Planning"?

### ~/tasks/old-task.md
- **Code:** INVALID_STATUS
- **Field:** status
- **Value:** inprogress
- **Valid values:** inbox, ready, in-progress, blocked, done, dropped, icebox

### ~/projects/abandoned.md
- **Code:** PARSE_ERROR
- **Line:** 3
- **Message:** Unexpected key in YAML frontmatter

## Summary

3 issues found across 57 files checked.
```

**Exit codes:**

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Issues found (command succeeded, but problems exist) |
| 2 | Command failed to run (couldn't read config, etc.) |

Exit code 1 for issues follows linter conventions—useful for CI pipelines.

---

## Identification: Paths vs Fuzzy Search

**For writes (complete, drop, status, update, archive):**

- AI mode: Requires exact file paths. No ambiguity allowed.
- Human mode: Accepts fuzzy search on title. Prompts if ambiguous.

**For reads (list, context, show):**

- Both modes accept fuzzy search where it makes sense.
- AI mode always returns absolute paths so follow-up commands can use them.

```bash
# Human: fuzzy search OK, prompts if multiple matches
taskdn complete "login bug"

# AI: must use path (obtained from previous query)
taskdn complete ~/tasks/fix-login-bug.md --ai
```

**Path format in AI mode output:** Always absolute paths. This eliminates ambiguity about working directories and ensures paths can be used directly in follow-up commands.

---

## Completed & Archived Tasks

### What "Active" Means

Commands like `taskdn list` return "active" entities by default. Here's what "active" means for each entity type:

**Active tasks** have ALL of:
- Status NOT IN (`done`, `dropped`)
- `defer-until` is either unset or ≤ today
- File is not in the `archive/` subdirectory

**Active projects** have ALL of:
- Status is unset OR status NOT IN (`done`)
- File is not in the `archive/` subdirectory

**Active areas** have ALL of:
- Status is unset OR status = `active`

Note: Project status `paused` is still considered active (just on hold). Area status values other than `active` (e.g., `archived`) are excluded by default.

### Inclusion Flags

| State                  | Default Behavior | Flag to Include     |
| ---------------------- | ---------------- | ------------------- |
| Active (see above)     | Included         | —                   |
| `done`                 | Excluded         | `--include-done`    |
| `dropped`              | Excluded         | `--include-dropped` |
| Both done + dropped    | Excluded         | `--include-closed`  |
| Deferred (future date) | Excluded         | `--include-deferred`|
| Archived (in archive/) | Never included   | `--archived`        |

Archiving is manual via `taskdn archive <path>`.

### Deferred Tasks

Tasks with `defer-until` set to a future date are automatically hidden from all queries until that date arrives. This is implicit filtering—you don't need to add `--exclude-deferred`.

To see deferred tasks:
```bash
taskdn list --include-deferred           # Show all, including deferred
taskdn list --deferred-this-week         # Tasks becoming visible this week
```

---

## Date Handling

**Input:** Natural language accepted in all modes.

```bash
taskdn add "Task" --due tomorrow
taskdn add "Task" --due "next friday"
taskdn add "Task" --due 2025-12-20
taskdn add "Task" --due +3d              # 3 days from now
```

**Output:** Always ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).

---

## Configuration

### File Locations

```
~/.config/taskdn/config.json    # User config
./.taskdn.json                  # Local override (project-specific)
```

### Configuration Schema

```json
{
  "tasksDir": "/path/to/tasks",
  "projectsDir": "/path/to/projects",
  "areasDir": "/path/to/areas"
}
```

### Precedence (highest to lowest)

1. CLI flags (`--tasks-dir ./tasks`)
2. Environment variables (`TASKDN_TASKS_DIR`)
3. Local config (`./.taskdn.json`)
4. User config (`~/.config/taskdn/config.json`)
5. Defaults

### Init Command

`taskdn init` runs an interactive setup:

1. Prompts for tasks directory path
2. Prompts for projects directory path
3. Prompts for areas directory path
4. Creates `.taskdn.json` with those paths

---

## Additional Features

### Dry Run Mode

```bash
taskdn add "New task" --dry-run          # Shows what would be created
taskdn complete ~/tasks/foo.md --dry-run # Shows what would change
```

### Piping Support

```bash
# Pipe in data
echo '{"title": "New task"}' | taskdn add --stdin
echo 'title: New task' | taskdn add --stdin

# Pipe out for processing
taskdn list --json | jq '.[] | select(.status == "ready")'
```

### Bulk Operations

```bash
# Complete multiple tasks
taskdn complete ~/tasks/a.md ~/tasks/b.md ~/tasks/c.md
```

**Partial failure behavior:**
- All items are processed (don't stop at first error)
- Successes and failures are reported separately
- Exit code is `1` if ANY operation failed, `0` if all succeeded

**AI mode output:**

```markdown
## Completed (2)

### ~/tasks/a.md
- **Title:** Fix login bug
- **Status:** done
- **Completed at:** 2025-12-18T14:30:00

### ~/tasks/c.md
- **Title:** Write tests
- **Status:** done
- **Completed at:** 2025-12-18T14:30:01

## Errors (1)

### ~/tasks/b.md
- **Code:** NOT_FOUND
- **Message:** Task file does not exist
```

If all operations succeed, the "Errors" section is omitted. If all operations fail, the "Completed" section is omitted.

### Short Flags

Common flags have single-letter shortcuts:

| Short | Long        | Usage                    |
| ----- | ----------- | ------------------------ |
| `-s`  | `--status`  | `-s ready`               |
| `-p`  | `--project` | `-p "Q1 Planning"`       |
| `-a`  | `--area`    | `-a "Work"`              |
| `-d`  | `--due`     | `-d today`               |
| `-q`  | `--query`   | `-q "login"`             |
| `-l`  | `--limit`   | `-l 20`                  |

---

## Non-Functional Requirements

### Exit Codes

- `0` — Success
- `1` — General error
- `2` — Usage error (invalid arguments, unknown flags)

### Error Messages

- Should be helpful and suggest fixes
- In AI mode, errors include structured information (error code, suggestions)
- In human mode, errors are friendly prose with "Did you mean?" suggestions

### Error Codes

Errors include a machine-readable code and contextual information:

| Code | When | Includes |
|------|------|----------|
| `NOT_FOUND` | File/entity doesn't exist | Suggestions for similar items |
| `AMBIGUOUS` | Fuzzy search matched multiple items | List of matches with paths |
| `INVALID_STATUS` | Bad status value | List of valid statuses |
| `INVALID_DATE` | Unparseable date string | Expected formats |
| `INVALID_PATH` | Path outside configured directories | Configured directory paths |
| `PARSE_ERROR` | YAML frontmatter malformed | Line number, specific issue |
| `MISSING_FIELD` | Required field absent | Which field is missing |
| `REFERENCE_ERROR` | Project/area reference doesn't exist | The broken reference |
| `PERMISSION_ERROR` | Can't read/write file | File path |
| `CONFIG_ERROR` | Config missing or invalid | Suggestion to run `taskdn init` |

**Error structure (AI mode):**

Each error includes:
- `code` — Machine-readable identifier from the table above
- `message` — Human-readable explanation of what went wrong
- `details` — Context-specific information (the bad value, the path, etc.)
- `suggestions` — When applicable (similar items, valid values, next steps)

**AI mode error examples:**

```markdown
## Error: NOT_FOUND

- **Message:** Task file does not exist
- **Path:** ~/tasks/nonexistent.md
- **Suggestion:** Did you mean ~/tasks/existent-task.md?
```

```markdown
## Error: AMBIGUOUS

- **Message:** Multiple tasks match "login"
- **Matches:**
  - ~/tasks/fix-login-bug.md — "Fix login bug"
  - ~/tasks/login-redesign.md — "Login page redesign"
  - ~/tasks/login-tests.md — "Write login tests"
```

```markdown
## Error: INVALID_STATUS

- **Message:** Invalid status value
- **Value:** inprogress
- **Valid values:** inbox, icebox, ready, in-progress, blocked, done, dropped
```

The heading always includes the error code for quick identification. Fields vary by error type but follow the structure above.

Additional error codes may be added as needed during implementation.

### Error Output Destination

Errors go to different streams depending on mode:

- **Human mode:** stderr (Unix standard, allows `taskdn list > file.txt` without errors in file)
- **AI mode:** stdout (guarantees agents see errors as part of the response)
- **JSON mode:** stdout (errors are structured data)

This ensures AI agents always receive error information, while human mode follows Unix conventions for piping.

### Shell Completions

The CLI should support auto-completion for bash, zsh, and fish shells.

### Performance

- Startup time should be fast enough for interactive use
- Commands should complete quickly for typical vault sizes (hundreds of tasks)

---

## Design Decisions & Rationale

This section documents key design decisions and why they were made.

### Why two distinct modes (human vs AI)?

Humans and AI agents have fundamentally different needs. Humans want pretty output, tolerate prompts, and think in fuzzy terms ("the login task"). AI agents need structured data, unambiguous identifiers (paths), and single-call efficiency. Rather than find a mediocre middle ground, we optimize for each.

### Why `--ai` as a mode, not just a format?

The `--ai` flag isn't just about output format—it changes behavior. AI mode never prompts (which would hang the agent), always includes file paths (so the agent can reference items in follow-up commands), and returns structured errors. This is more than just "output differently."

### Why Markdown for AI output?

AI agents receive CLI output in their context window. The format should be:
1. Token-efficient (LLMs pay per token)
2. Gracefully degradable (agents often use `head -100`)
3. Readable without parsing (no code execution needed)
4. Familiar (LLMs are trained on Markdown)

JSON fails on degradability (truncated JSON is invalid) and requires mental parsing. YAML is better but still structural. Markdown is organized text that LLMs can read directly.

### Why the `context` command?

AI agents helping users plan or review need hierarchical context. Without `context`, an agent would need multiple calls: get the area, then get its projects, then get tasks for each project. The `context` command returns everything in one call—the entity plus all related entities—minimizing round trips.

### Why does `context` with no arguments return a vault overview?

An AI agent's first question is often "what's going on in this vault?" Rather than add a separate `stats` command, we extend `context` to serve this purpose. With an entity argument, you get that entity's context. With no argument, you get the vault's context—areas, projects, counts, and what's due/scheduled this week. This keeps the command set small while serving the "orient me" use case.

### Why separate `show` and `context`?

`show` returns a single entity with its body. `context` returns an entity plus its relationships (parent area/project, child tasks). They serve different purposes: `show` is "let me see this thing," `context` is "let me understand the full picture around this thing."

### Why separate `list` and `show`?

`list` returns multiple entities in summary form. `show` returns one entity with full detail. They have different intents: `list` is "what things match these criteria?" while `show` is "tell me everything about this specific thing." This mirrors familiar patterns like `git log` vs `git show`. Merging them (e.g., `list --full <path>`) would conflate two distinct operations.

### Why require paths for writes in AI mode?

When an AI agent completes, drops, or updates a task, it must use the exact file path. This prevents mistakes—no risk of fuzzy matching the wrong task. The pattern is: query first (get paths), then act (use paths). This is slightly more verbose but eliminates a class of errors.

### Why fuzzy search for humans, paths for AI writes?

Humans think in titles ("complete the login bug task"). Requiring exact paths would be tedious. So human mode accepts fuzzy search and prompts when ambiguous. AI mode requires paths because AI agents shouldn't guess—they should use the paths returned from previous queries.

### Why verb-first command structure?

`taskdn list` is cleaner than `taskdn task list` for the 90% case (tasks). The grammar is: verbs default to tasks, add entity type for projects/areas (`taskdn list projects`). This keeps common operations brief while remaining predictable.

### Why manual archiving?

Archiving is a deliberate act of putting something away "forever." Automatic archiving on completion would be presumptuous—users might want to see recent completions. Manual archiving via `taskdn archive` gives users control.

### Why exclude done/dropped tasks by default?

Active lists should show actionable items. Completed tasks clutter the view. But they're not archived—they're still in the tasks directory as recent history. Flags like `--include-done` make them accessible when needed.

### Why auto-hide deferred tasks?

The `defer-until` field means "don't show me this until then." Requiring users to add `--exclude-deferred` to every query would be tedious. Auto-hiding matches user intent. `--include-deferred` is available when you need to see everything.

### Why natural language dates?

Typing `--due tomorrow` or `--due "next friday"` is more ergonomic than calculating ISO dates. Since we control the date parsing, we can accept natural language and always output ISO 8601.

### Why convenience commands (today, inbox, next)?

Daily workflows shouldn't require 30+ keystrokes. `taskdn today` vs `taskdn list --due today --scheduled today` is a massive ergonomic win. These commands encode common workflows that would otherwise require flag combinations.

### Why a single `doctor` command instead of separate `validate`?

Health checking has multiple layers: system config, file syntax, field values, cross-file references. Splitting these into `validate` (files) and `doctor` (system) creates artificial boundaries—a broken project reference is both a file issue and a system issue. One command that checks everything and reports all problems is simpler to remember and provides a complete picture. The name `doctor` implies diagnosis without treatment—it tells you what's wrong but doesn't fix it.

---

## Future Considerations

These are explicitly out of scope for v1 but may be added later:

- **Filtering in context command**: A generalized filter DSL (e.g., `--filter "tasks:status=done|ready"`) that works consistently across commands.
- **Computed filters**: `--actionable` (ready or in-progress, not deferred), `--stale` (not updated recently).
- **Saved views**: Named queries that can be recalled (e.g., `taskdn view "weekly-review"`).
