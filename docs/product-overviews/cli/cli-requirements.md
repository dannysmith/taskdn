# The CLI Tool - Requirements & Overview

**Status:** Implemented (v0.1.0)

Command-line interface for humans and AI agents.

> **Note:** This document describes the high-level requirements and design philosophy for the CLI. For detailed command reference and usage patterns, see:
>
> - [CLI Interface Guide](../../tdn-cli/docs/developer/cli-interface-guide.md) - Complete command reference
> - [AI Context Output](../../tdn-cli/docs/developer/ai-context.md) - AI mode output specification
> - [Output Format Spec](../../tdn-cli/docs/developer/output-format-spec.md) - Output format details
> - [S1: Core Specification](/tdn-specs/S1-core.md) - File format specification
> - [S2: Interface Design](/tdn-specs/S2-interface-design.md) - General interface patterns

## Context & Purpose

**Primary users:**

- Human users (terminal interaction)
- AI coding assistants (Claude Code, Cursor, etc.)
- Shell scripts and automation

**Design goal:** Serve both human and AI users exceptionally well with distinct modes, rather than compromising with a one-size-fits-all approach.

---

## Two User Types, Two Modes

> See also: [S2 §2 Design Philosophy](/tdn-specs/S2-interface-design.md#2-design-philosophy) and [S2 §3 Interface Modes](/tdn-specs/S2-interface-design.md#3-interface-modes)

The CLI serves two fundamentally different users with different needs:

| Human User                               | AI Agent                            |
| ---------------------------------------- | ----------------------------------- |
| Wants quick, scannable output            | Wants structured, complete data     |
| Types short commands                     | Needs unambiguous identifiers       |
| Tolerates prompts and interaction        | Needs single-call efficiency        |
| Values aesthetics (colors, alignment)    | Values token efficiency             |
| Thinks in fuzzy terms ("the login task") | Needs exact references (file paths) |

Rather than compromise, we embrace this split with distinct modes.

### Interactive Prompts (Human Mode)

Some human-mode operations require interactive prompts:

- **Fuzzy match with multiple results:** User selects from a list
- **`taskdn new` with no arguments:** Prompts for title, status, etc.
- **Confirmations:** Destructive operations may prompt for confirmation

The exact UX for these prompts will be designed during implementation using a TUI library. Key principles:

- Ctrl-C always cancels safely (no partial operations)
- Prompts show sensible defaults where applicable
- AI mode (`--ai`) never prompts—it succeeds or fails with a clear error

Interactive prompt behavior is not covered by automated tests.

---

## Output Modes & Flags

The CLI supports three output modes to serve different consumers:

| Flags         | Format                | Prompts? | Use Case                         |
| ------------- | --------------------- | -------- | -------------------------------- |
| (none)        | Pretty terminal (colors, tables) | Yes      | Human at terminal                |
| `--ai`        | Structured Markdown   | No       | AI agents (Claude Code, etc.)    |
| `--json`      | JSON                  | No       | Scripts, programmatic access     |
| `--ai --json` | Markdown in JSON      | No       | AI agents needing JSON envelope  |

### Key Differences

**Human mode (default):**
- Colored, formatted output optimized for terminal viewing
- Interactive prompts when needed (fuzzy search disambiguation, confirmations)
- Friendly error messages with suggestions

**AI mode (`--ai`):**
- Structured Markdown optimized for LLM consumption
- Token-efficient (compact notation, progressive disclosure)
- File paths always included (for follow-up commands)
- No prompts—succeeds or fails with structured error
- Degrades gracefully when truncated

**JSON mode (`--json`):**
- Machine-readable structured data
- Always includes `summary` field for self-documentation
- CamelCase field names (JavaScript convention)
- No prompts, structured errors

### Why Markdown for AI Mode?

AI agents receive CLI output in their context window. Markdown is ideal because:

1. **Token-efficient** — More compact than JSON/YAML
2. **Degrades gracefully** — Partial output (e.g., via `head -100`) remains useful
3. **No parsing needed** — LLMs read Markdown directly
4. **Familiar format** — LLMs are heavily trained on Markdown

For detailed output specifications and examples, see:
- [Output Format Spec](../../tdn-cli/docs/developer/output-format-spec.md) - All output modes
- [AI Context Output](../../tdn-cli/docs/developer/ai-context.md) - AI mode specifics

---

## Commands

The CLI provides comprehensive commands for managing tasks, projects, and areas. For complete command reference with detailed syntax and examples, see [CLI Interface Guide](../../tdn-cli/docs/developer/cli-interface-guide.md).

### Command Categories

**Core Commands:**

| Command     | Purpose                               | Example                                  |
| ----------- | ------------------------------------- | ---------------------------------------- |
| `list`      | Query and filter entities             | `taskdn list --status ready --due today` |
| `show`      | Display full entity details           | `taskdn show "Fix bug"`                  |
| `new`       | Create entities                       | `taskdn new "Write docs" --due tomorrow` |
| `context`   | Show entity + relationships           | `taskdn context area "Work" --ai`        |
| `today`     | Show today's actionable tasks         | `taskdn today`                           |

**Mutation Commands:**

| Command       | Purpose                    | Example                             |
| ------------- | -------------------------- | ----------------------------------- |
| `set status`  | Change task/project status | `taskdn set status "Fix bug" done`  |
| `update`      | Modify entity fields       | `taskdn update task --set due=2025-01-20` |
| `archive`     | Move to archive subdirectory | `taskdn archive "Old task"`         |
| `open`        | Open in $EDITOR            | `taskdn open "Fix bug"`             |
| `append-body` | Add content to body        | `taskdn append-body task "Progress note"` |

**Utility Commands:**

| Command  | Purpose                | Example                  |
| -------- | ---------------------- | ------------------------ |
| `doctor` | Health check vault     | `taskdn doctor --ai`     |
| `config` | Show/modify config     | `taskdn config`          |
| `init`   | Interactive setup      | `taskdn init`            |

### Key Command Features

**Context Command** - The primary command for AI agents:

```bash
taskdn context --ai                    # Vault overview
taskdn context area "Work" --ai        # Area + projects + tasks
taskdn context project "Q1" --ai       # Project + tasks + parent area
taskdn context task "Fix bug" --ai     # Task + parent project/area
```

Returns structured Markdown with progressive disclosure:Stats → Structure → Timeline → In-Progress Details → Excerpts → Reference table.

See [ai-context.md](../../tdn-cli/docs/developer/ai-context.md) for complete specification.

**Filtering and Sorting:**

- Boolean filter logic: same type = OR, different types = AND
- Natural language dates: `--due tomorrow`, `--scheduled "next friday"`
- Text search: `--query "login"`
- Sort by any field: `--sort due --desc`

**Batch Operations:**

```bash
taskdn set status task1.md task2.md task3.md done
```

Processes all targets, reports successes and failures separately.

**Entity Lookup:**

- Human mode: Fuzzy title matching with disambiguation prompts
- AI mode: Exact file paths required (obtained from previous queries)

For detailed command syntax, filtering rules, date handling, and output formats, see [CLI Interface Guide](../../tdn-cli/docs/developer/cli-interface-guide.md).

---

## Entity Identification

The CLI uses different identification approaches for human and AI users:

**Human mode:**
- Fuzzy title matching (case-insensitive substring)
- Interactive disambiguation when multiple matches
- File paths also accepted

**AI mode:**
- Write operations require exact file paths (no ambiguity)
- Read operations can use fuzzy matching
- All output includes file paths for follow-up commands

**Fuzzy matching:** Simple case-insensitive substring search. "login" matches "Fix login bug". No typo tolerance ("logn" won't match "login").

For detailed rules and examples, see [CLI Interface Guide - Entity Lookup](../../tdn-cli/docs/developer/cli-interface-guide.md#entity-lookup--path-resolution).

---

## Active vs Completed/Archived Entities

By default, commands show "active" entities:

**Active tasks:**
- Status NOT IN (done, dropped, icebox)
- Not deferred (defer-until ≤ today or unset)
- Not in archive/ subdirectory

**Active projects:**
- Status NOT IN (done)

**Active areas:**
- Status = active OR unset

**Inclusion flags** allow querying non-active entities:

- `--include-done`, `--include-dropped`, `--include-icebox`
- `--include-closed` (done + dropped)
- `--include-deferred` (tasks with future defer-until dates)
- `--include-archived` (files in archive/ subdirectory)
- `--only-archived` (exclusively from archive/)

For detailed filtering rules and examples, see [CLI Interface Guide](../../tdn-cli/docs/developer/cli-interface-guide.md).

---

## Date Handling

**Input:** Natural language or ISO 8601:

```bash
taskdn new "Task" --due tomorrow
taskdn new "Task" --due "next friday"
taskdn new "Task" --due 2025-12-20        # ISO 8601 (recommended for AI agents)
taskdn new "Task" --due +3d               # Relative (3 days from now)
```

**Output:** Always ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).

**Natural language rules:**
- Day names = next occurrence ("friday" on Wednesday = this Friday)
- "next X" = skip immediate ("next friday" on Thursday = Friday in 8 days)
- Relative: `+3d`, `+1w`, `+2m`
- System local timezone

For complete date parsing rules, see [CLI Interface Guide - Date Handling](../../tdn-cli/docs/developer/cli-interface-guide.md#date-handling).

---

## Configuration

**Configuration sources** (highest to lowest precedence):

1. CLI flags (`--tasks-dir ./tasks`)
2. Environment variables (`TASKDN_TASKS_DIR`)
3. Local config (`./.taskdn.json`)
4. User config (`~/.config/taskdn/config.json`)
5. Defaults (`./tasks`, `./projects`, `./areas`)

**Schema:**

```json
{
  "tasksDir": "/path/to/tasks",
  "projectsDir": "/path/to/projects",
  "areasDir": "/path/to/areas"
}
```

**Interactive setup:** `taskdn init` creates `.taskdn.json` with prompted directory paths.

---

## Additional Features

**Batch operations:** Multiple targets supported for mutation commands. Processes all, reports successes and failures separately.

```bash
taskdn set status task1.md task2.md task3.md done
```

**Dry run mode:** Preview changes without executing.

```bash
taskdn new "Task" --dry-run
taskdn set status task.md done --dry-run
```

**Short flags:** Common flags have single-letter shortcuts (`-s`, `-p`, `-a`, `-d`, `-q`, `-l`).

For complete feature documentation, see [CLI Interface Guide](../../tdn-cli/docs/developer/cli-interface-guide.md).

---

## Non-Functional Requirements

### Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| `0`  | Success (including empty results)    |
| `1`  | Runtime error (file/vault issues)    |
| `2`  | Usage error (invalid arguments)      |

**Distinction:** Exit code 2 = "command syntax wrong", Exit code 1 = "command valid but operation failed"

### Error Handling

**Structured errors** with machine-readable codes:
- `NOT_FOUND`, `AMBIGUOUS`, `INVALID_STATUS`, `INVALID_DATE`, `PARSE_ERROR`, `REFERENCE_ERROR`, etc.
- Include contextual information and suggestions
- Formatted appropriately for each output mode

**Error output streams:**
- Human mode: stderr (Unix standard)
- AI/JSON modes: stdout (ensures agents receive errors)

For complete error code reference and examples, see [CLI Interface Guide - Error Handling](../../tdn-cli/docs/developer/cli-interface-guide.md#error-handling).

### Performance

Target performance (achieved on typical laptop hardware):
- CLI startup: <100ms
- Single file parse: <1ms
- 5000 file vault scan: <1000ms
- Feels responsive for vaults up to a few thousand files

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

### Why `project` (singular) when files use `projects` (array)?

The specification defines the field as `projects` (an array with exactly one element) for compatibility with tools like TaskNotes that support multiple projects per task. However, Taskdn enforces single-project semantics, so the CLI presents this as `project` (singular) everywhere:

- Output shows `project: Q1 Planning` (not `projects`)
- Input accepts `--project "Q1"` and `--set project="Q1"`
- The CLI reads `projects[0]` and writes `projects: ["[[value]]"]`

This prevents users and AI agents from thinking multiple projects are supported. If a file contains multiple projects (from another tool or manual editing), the CLI uses the first one and ignores the rest. The `doctor` command warns about multi-project files.

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

### Why convenience commands (today, inbox)?

Daily workflows shouldn't require 30+ keystrokes. `taskdn today` vs `taskdn list --due today --scheduled today` is a massive ergonomic win. These commands encode common workflows that would otherwise require flag combinations.

### Why a single `doctor` command instead of separate `validate`?

Health checking has multiple layers: system config, file syntax, field values, cross-file references. Splitting these into `validate` (files) and `doctor` (system) creates artificial boundaries—a broken project reference is both a file issue and a system issue. One command that checks everything and reports all problems is simpler to remember and provides a complete picture. The name `doctor` implies diagnosis without treatment—it tells you what's wrong but doesn't fix it.

---

## Future Considerations

These are explicitly out of scope for v1 but may be added later:

- **Filtering in context command**: A generalized filter DSL (e.g., `--filter "tasks:status=done|ready"`) that works consistently across commands.
- **Computed filters**: `--actionable` (ready or in-progress, not deferred), `--stale` (not updated recently).
- **Saved views**: Named queries that can be recalled (e.g., `taskdn view "weekly-review"`).
