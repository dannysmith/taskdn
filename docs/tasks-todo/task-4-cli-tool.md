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
[
  {"path": "~/tasks/fix-login-bug.md", "title": "Fix login bug", "status": "in-progress", "due": "2025-12-15"},
  {"path": "~/tasks/write-docs.md", "title": "Write documentation", "status": "ready", "project": "Q1 Planning"}
]
```

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

# No args: helpful error with list of active areas/projects
taskdn context                        # Human: interactive chooser
taskdn context --ai                   # AI: returns list with paths
```

**What context returns (example: `taskdn context area "Work" --ai`):**

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
taskdn update ~/tasks/foo.md --set "title=New Title" --set "due=2025-12-20"
taskdn update ~/tasks/foo.md --unset project    # Remove field

# Archive (manual)
taskdn archive ~/tasks/foo.md            # Move to tasks/archive/
```

### Utility Commands

```bash
taskdn                                   # Shows --help
taskdn --version                         # Show version
taskdn validate                          # Check all files for errors
taskdn validate ~/tasks/foo.md           # Check single file
taskdn config                            # Show current config
taskdn config --set tasksDir=./tasks     # Set a value
taskdn init                              # Interactive setup (creates config)
```

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

| State                  | Default Behavior | Flag to Include     |
| ---------------------- | ---------------- | ------------------- |
| Active statuses        | Included         | —                   |
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

# Returns results for each
```

### Short Flags

Common flags have single-letter shortcuts:

| Short | Long        | Usage                    |
| ----- | ----------- | ------------------------ |
| `-s`  | `--status`  | `-s ready`               |
| `-p`  | `--project` | `-p "Q1 Planning"`       |
| `-a`  | `--area`    | `-a "Work"`              |
| `-d`  | `--due`     | `-d today`               |
| `-q`  | `--query`   | `-q "login"`             |

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

### Why separate `show` and `context`?

`show` returns a single entity with its body. `context` returns an entity plus its relationships (parent area/project, child tasks). They serve different purposes: `show` is "let me see this thing," `context` is "let me understand the full picture around this thing."

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

---

## Open Questions & Items to Resolve

This section captures items that need further discussion before implementation.

### 1. Sorting (Medium Priority)

No default sorting specified. Should we have:

```bash
taskdn list --sort due          # By due date (nulls last?)
taskdn list --sort created      # By creation date
taskdn list --sort updated      # By last update
taskdn list --sort title        # Alphabetical
taskdn list --sort due --desc   # Descending
```

**Questions:**
- Is this needed for v1?
- What's the default sort order when no `--sort` specified?
- How to handle null values (tasks without due dates)?

### 2. Activity/History Queries (Medium Priority)

How does someone ask "what did I complete this week"?

**Proposed:**
```bash
taskdn list --include-done --completed-after 2025-12-09
# Or shorthand:
taskdn list --include-done --completed-this-week
```

### 3. Error Structure (High Priority)

We need to define error codes and structure for AI mode.

**Human mode example:**
```
Error: Task not found: "login bug"

Did you mean one of these?
  • Fix login button (~/tasks/fix-login-button.md)
  • Login page redesign (~/tasks/login-redesign.md)
```

**AI mode example:**
```markdown
## Error: NOT_FOUND

No task matching "login bug"

### Suggestions

- **Fix login button** — ~/tasks/fix-login-button.md
- **Login page redesign** — ~/tasks/login-redesign.md
```

**Needs:**
- Define error codes (NOT_FOUND, INVALID_STATUS, AMBIGUOUS_MATCH, etc.)
- Define which information each error includes
- Ensure AI mode errors are still readable Markdown

### 4. Empty Results

If a query returns nothing:

**Human mode:** Show helpful message ("No tasks found matching your criteria")

**AI mode:** What format?
```markdown
## Tasks (0)

No tasks match the specified criteria.
```

Or just empty output? The former is more informative when truncated.

### 5. Markdown Format Details (High Priority)

The exact Markdown format for AI mode needs specification:

- Heading levels for different entity types
- Which fields are always shown vs conditional
- How to represent arrays (projects field)
- How to handle very long bodies (truncation?)
- Format for dates (ISO 8601, but with or without time?)

### 6. Stats/Summary Command (Low Priority)

Should there be a way to get summary statistics?

```bash
taskdn stats
# Output:
# Tasks: 47 total (12 ready, 3 in-progress, 5 blocked, 15 inbox, 12 icebox)
# Overdue: 2
# Due this week: 8
# Projects: 6 active
# Areas: 4 active
```

**Question:** Useful for dashboards and AI overview, but can `context` serve this purpose?

### 7. Limit/Pagination (Low Priority)

For large task lists:
```bash
taskdn list --limit 20
taskdn list --limit 20 --offset 40   # Page 3
```

Probably not needed for v1 if most users have <100 active tasks.

### 8. Health Check / Doctor (Low Priority)

```bash
taskdn doctor
# Checks:
# ✓ Config file found
# ✓ Tasks directory exists (47 tasks)
# ✓ Projects directory exists (6 projects)
# ✓ Areas directory exists (4 areas)
# ⚠ 2 tasks reference non-existent projects
# ⚠ 1 task has invalid status value
```

**Question:** Does this overlap too much with `validate`? Maybe `validate` covers file syntax and `doctor` covers system health?

---

## Summary: Prioritized Open Items

| Item | Priority | Status |
|------|----------|--------|
| Error structure for AI mode | High | Needs spec |
| Markdown format specification | High | Needs spec |
| Empty result handling | High | Needs decision |
| Sorting options | Medium | Needs decision |
| Activity queries (`--completed-this-week`) | Medium | Likely yes |
| Stats command | Low | Maybe v2 |
| Limit/pagination | Low | Maybe v2 |
| Doctor command | Low | Maybe v2 |

---

## Future Considerations

These are explicitly out of scope for v1 but may be added later:

- **Filtering in context command**: A generalized filter DSL (e.g., `--filter "tasks:status=done|ready"`) that works consistently across commands.
- **Computed filters**: `--actionable` (ready or in-progress, not deferred), `--stale` (not updated recently).
- **Saved views**: Named queries that can be recalled (e.g., `taskdn view "weekly-review"`).
