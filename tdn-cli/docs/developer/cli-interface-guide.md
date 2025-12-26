# CLI Interface Guide

**Status:** Implemented

This document describes the common interface patterns used across all CLI commands in `tdn-cli`. For output format specifications, see `output-format-spec.md` and `ai-context.md`.

---

## Global Flags

All commands support these global flags:

- `--ai` - AI mode: structured Markdown output, no interactive prompts
- `--json` - JSON output format for programmatic access
- `--ai --json` - AI Markdown wrapped in JSON envelope

**Output Mode Resolution:**

- No flags → `human` (default, formatted for terminal display)
- `--ai` → `ai` (structured markdown)
- `--json` → `json` (raw JSON)
- `--ai --json` → `ai-json` (markdown in JSON wrapper, with references as JSON)

---

## Core Commands

The CLI provides these primary commands:

| Command       | Purpose                            | Typical Usage                                  |
| ------------- | ---------------------------------- | ---------------------------------------------- |
| `list`        | Query and filter entities          | `taskdn list --status inbox --due today`       |
| `show`        | Display full entity details        | `taskdn show "Fix bug"`                        |
| `new`         | Create entities                    | `taskdn new "Write docs" --due tomorrow`       |
| `context`     | Show everything incl relationships | `taskdn context area "Work"`                   |
| `today`       | Show today's actionable tasks      | `taskdn today`                                 |
| `set status`  | Change task/project status         | `taskdn set status "Fix bug" done`             |
| `update`      | Modify entity fields               | `taskdn update "Fix bug" --set area="Work"`    |
| `archive`     | Move to archive subdirectory       | `taskdn archive "Old task"`                    |
| `open`        | Open in $EDITOR                    | `taskdn open "Fix bug"`                        |
| `append-body` | Add content to body                | `taskdn append-body "Fix bug" "Progress note"` |

**Entity Type Support:**

- Most commands accept both singular and plural forms: `task`/`tasks`, `project`/`projects`, `area`/`areas`
- Default entity type is "task" for most commands.

---

## Entity Lookup & Path Resolution

Commands that target specific entities (show, update, archive, etc.) support two lookup modes:

### Path Detection

A query is treated as a **file path** if it:

- Starts with `/` (absolute)
- Starts with `./` or `../` (relative)
- Starts with `~` (home directory)
- Contains path separators
- Ends with `.md`

Paths are resolved against the appropriate entity directory (tasks, projects, areas) and validated for existence.

### Fuzzy Title Matching

Non-path queries trigger **fuzzy matching** against entity titles:

- **Exact match:** Accepted immediately
- **Single match:** Accepted automatically
- **Multiple matches:** Returns ambiguous error with all matching titles
- **No matches:** Returns not-found error

Matching is case-insensitive and substring-based across all entities in the vault.

---

## Filtering (List Command)

The `list` command provides comprehensive filtering capabilities:

### Status Filters

- `--status <status>` - Comma-separated for OR logic (e.g., `inbox,ready`)
- Status-specific flags: `--include-done`, `--include-dropped`, `--include-archived`, etc.
- `--only-archived` - Show only archived entities

### Date/Schedule Filters

- `--due <when>` - Filter by due date
- `--scheduled <when>` - Filter by scheduled date
- `--overdue` - Due date in the past
- `--completed-after <date>`, `--completed-before <date>` - Completion date range
- `--completed-today`, `--completed-this-week` - Recent completions

### Reference Filters

- `--project <name>` - Case-insensitive substring match
- `--area <name>` - Case-insensitive substring match

### Full-Text Search

- `--query <text>` - Search in title and body (case-insensitive)

### Result Control

- `--sort <field>` - Sort by field (due, created, updated, title, start-date, end-date)
- `--desc` - Descending sort order
- `--limit <n>` - Limit result count

**Filter Logic:**

- Within a filter type (e.g., multiple status values): OR logic
- Between filter types (e.g., status + project): AND logic

---

## Date Handling

### Natural Language Date Parsing

Date fields (`--due`, `--scheduled`, `--defer-until`) support:

- **Keywords:** `today`, `tomorrow`
- **Weekdays:** `monday`, `friday`, `wed` (next occurrence)
- **Relative:** `+1d`, `+3d`, `+1w`, `+2w` (days/weeks from today)
- **Special:** `next week` (Monday of next week)
- **ISO format:** `2025-01-15` (pass-through)

### Date Filters

Time-based filters (`--due`, `--scheduled`) accept:

- `today` - Exact date match
- `tomorrow` - Next day
- `this-week` - Within next 7 days

### Date Calculations

- Week boundaries: Monday is start of week
- Overdue: `due < today`
- All dates stored and compared in YYYY-MM-DD format
- Testing: `TASKDN_MOCK_DATE` env var overrides "today"

---

## Sorting Patterns

Sorting is controlled by two flags:

- `--sort <field>` - Field name (kebab-case)
- `--desc` - Reverse order (ascending is default)

**Field Name Mapping:**

- Input uses kebab-case: `created-at`, `start-date`, `end-date`
- Maps to entity property names internally

**Sort Behavior:**

- Undefined values sort last (ascending) or first (descending)
- Stable sort preserves original order for equal values
- String comparison is case-insensitive

---

## Batch Operations

Mutation commands supporting multiple targets (`set status`, `archive`, `update`):

- Accept variadic arguments: `taskdn set status task1 task2 task3 done`
- Each target processed independently
- Return `BatchResult` with separate `successes` and `failures` arrays
- Failures include path, error code, and message
- Output format adapts to show batch results clearly

---

## Error Handling

All commands use typed errors with consistent structure:

**Error Types:**

- `NOT_FOUND` - Entity doesn't exist
- `AMBIGUOUS` - Multiple matches for fuzzy query
- `INVALID_STATUS` - Status not in whitelist
- `INVALID_DATE` - Date format or value invalid
- `PARSE_ERROR` - File parsing failed
- `MISSING_FIELD` - Required field absent
- Others: `INVALID_PATH`, `REFERENCE_ERROR`, `PERMISSION_ERROR`, `CONFIG_ERROR`, `NOT_SUPPORTED`

**Error Output:**

- Human mode: Formatted with context and suggestions
- AI/JSON modes: Structured error objects
- Exit codes reflect error conditions

---

## Configuration

Configuration precedence (highest to lowest):

1. **Environment variables:** `TASKDN_TASKS_DIR`, `TASKDN_PROJECTS_DIR`, `TASKDN_AREAS_DIR`
2. **Local config:** `./.taskdn.json` (from cwd)
3. **User config:** `~/.config/taskdn/config.json`
4. **Defaults:** `./tasks`, `./projects`, `./areas` (relative to cwd)

All paths resolved relative to current working directory unless absolute.

---

## Validation Rules

- **Status values:** Validated against spec-defined whitelist per entity type
- **Dates:** Must parse successfully via natural language parser
- **Paths:** File existence verified before operations
- **References:** Area/project references validated on update
- **Entity types:** Normalized to singular/plural equivalents

---

## Command-Specific Behaviors

### Set Status

- Automatically sets `completed-at` when transitioning to `done` or `dropped`
- Automatically clears `completed-at` when transitioning away from completion statuses
- Supports `--dry-run` flag for preview

### New

- Interactive prompts in human mode (suppressed in AI/JSON modes)
- Generates filename from title (kebab-case slug)
- Sets `created-at` automatically for tasks
- Validates date fields before creation

### Today

- Combines multiple criteria with OR logic: in-progress, overdue, due today, scheduled today, newly actionable
- Excludes: done, dropped, icebox, deferred (defer-until > today), archived
- No additional filtering available

### Context

- Shows hierarchical relationships (area → projects → tasks)
- Generates timeline sections where relevant (overdue, blocked, due today, etc.)
- Includes statistics specific to entity type
- Output varies by entity type (area, project, task)

### Archive

- Moves to `parent/archive/` subdirectory
- Handles name collisions with numeric suffixes
- Preserves file extension and structure
- Updates entity status if applicable
