# Phase 4: CLI Tool

Command-line interface for humans and AI agents.

## Context & Dependencies

```
┌─────────────────────┐
│     Rust SDK        │
│  (taskdn-rust)      │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  TypeScript SDK     │
│  (taskdn-ts)        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│       CLI           │  ← You are here
│   (taskdn-cli)      │
│   TypeScript/Bun    │
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

| Human User | AI Agent |
|------------|----------|
| Wants quick, scannable output | Wants structured, complete data |
| Types short commands | Needs unambiguous identifiers |
| Tolerates prompts and interaction | Needs single-call efficiency |
| Values aesthetics (colors, alignment) | Values token efficiency |
| Thinks in fuzzy terms ("the login task") | Needs exact references (file paths) |

Rather than compromise, we embrace this split with distinct modes.

---

## Output Modes & Flags

### The Flag System

| Flags | Mode | Format | Prompts? |
|-------|------|--------|----------|
| (none) | Human | Pretty (colors, tables) | Yes |
| `--json` | Script | JSON | No |
| `--ai` | AI | YAML | No |
| `--ai --json` | AI | JSON | No |

- **`--ai`** is a *mode* that changes behavior: no prompts, always includes file paths, structured errors, YAML output by default
- **`--json`** is a *format* override that can combine with any mode

### AI Mode Behaviors

When `--ai` is set:
- Output format defaults to YAML (token-efficient, handles nesting well)
- File paths are always included in output (for follow-up commands)
- Never prompts for input—either succeeds or fails with clear error
- Errors are structured (parseable), not human-friendly prose

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
```yaml
tasks:
  - path: ~/tasks/fix-login-bug.md
    title: Fix login bug
    status: in-progress
    due: 2025-12-15
  - path: ~/tasks/write-docs.md
    title: Write documentation
    status: ready
    project: Q1 Planning
```

---

## Commands

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
```yaml
area:
  path: ~/areas/work.md
  title: Work
  status: active

projects:
  - path: ~/projects/q1-planning.md
    title: Q1 Planning
    status: in-progress
    task_count: 5
  - path: ~/projects/client-onboarding.md
    title: Client Onboarding
    status: ready
    task_count: 3

tasks:
  - path: ~/tasks/fix-login-bug.md
    title: Fix login bug
    status: in-progress
    project: Q1 Planning
    due: 2025-12-15
  - path: ~/tasks/write-docs.md
    title: Write documentation
    status: ready
    project: Q1 Planning
```

**Body inclusion:** Task/project/area bodies are NOT included by default. Use `--with-bodies` to include them.

### Show Command

View a single entity with its full content (body included). No expanded context.

```bash
taskdn show ~/tasks/fix-login-bug.md
taskdn show project "Q1 Planning"
taskdn show area "Work"
```

### List Command (Tasks)

```bash
taskdn list                              # All active tasks
taskdn list --status ready               # Filter by status
taskdn list --status ready,in-progress   # Multiple statuses
taskdn list --project "Q1 Planning"      # Filter by project
taskdn list --area "Work"                # Filter by area
taskdn list --due today                  # Due today
taskdn list --due tomorrow               # Due tomorrow
taskdn list --due this-week              # Due this week
taskdn list --overdue                    # Past due date
```

### Projects & Areas Commands

```bash
# List
taskdn projects                          # List all projects
taskdn areas                             # List all areas

# Create
taskdn project new "Q1 Planning"
taskdn project new "Q1 Planning" --area "Work" --status planning

taskdn area new "Work"
taskdn area new "Acme Corp" --type client
```

### Search Command

```bash
taskdn search "quarterly"                # Alias for search tasks
taskdn search tasks "quarterly"          # Search task titles and bodies
taskdn search projects "quarterly"       # Search projects
taskdn search areas "acme"               # Search areas
```

Returns matches with paths (for AI to use in follow-up commands).

### Task Operations

```bash
# Create
taskdn add "Review quarterly report"                    # Quick add to inbox
taskdn add "Review report" --project "Q1" --due friday  # With metadata
taskdn add                                              # Interactive (human only)

# Status changes
taskdn complete ~/tasks/foo.md           # Mark done
taskdn drop ~/tasks/foo.md               # Mark dropped
taskdn status ~/tasks/foo.md blocked     # Change to any status

# Edit
taskdn edit ~/tasks/foo.md               # Open in $EDITOR (human only)

# Programmatic update (for AI/scripts)
taskdn update ~/tasks/foo.md --data "status: ready"
taskdn update ~/tasks/foo.md --data "title: New Title" --data "due: 2025-12-20"
echo "status: done" | taskdn update ~/tasks/foo.md --stdin

# Archive (manual)
taskdn archive ~/tasks/foo.md            # Move to tasks/archive/
```

### Utility Commands

```bash
taskdn                                   # Shows --help
taskdn validate                          # Check all task files for errors
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

**For reads (list, search, context, show):**
- Both modes accept fuzzy search where it makes sense.
- AI mode always returns paths so follow-up commands can use them.

```bash
# Human: fuzzy search OK, prompts if multiple matches
taskdn complete "login bug"

# AI: must use path (obtained from previous query)
taskdn complete ~/tasks/fix-login-bug.md --ai
```

---

## Completed & Archived Tasks

| State | Default Behavior | Flag to Include |
|-------|------------------|-----------------|
| Active statuses | Included | — |
| `done` | Excluded | `--include-done` |
| `dropped` | Excluded | `--include-dropped` |
| Both done + dropped | Excluded | `--include-closed` |
| Archived (in archive/) | Never included | `--archived` |

Archiving is manual via `taskdn archive <path>`.

---

## Date Handling

**Input:** Natural language accepted in all modes.
```bash
taskdn add "Task" --due tomorrow
taskdn add "Task" --due "next friday"
taskdn add "Task" --due 2025-12-20
taskdn add "Task" --due +3d              # 3 days from now
```

**Output:** Always ISO 8601 format.

---

## Configuration

### File Locations

```
~/.config/taskdn/config.json    # User config (XDG-compliant)
./.taskdn.config.json           # Local override (project-specific)
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
3. Local config (`./.taskdn.config.json`)
4. User config (`~/.config/taskdn/config.json`)
5. Defaults

### Init Command

`taskdn init` runs an interactive setup:
1. Prompts for tasks directory path
2. Prompts for projects directory path
3. Prompts for areas directory path
4. Creates `.taskdn.config.json` with those paths

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
taskdn complete ~/tasks/a.md ~/tasks/b.md ~/tasks/c.md --ai

# Returns results for each
```

---

## Technical Decisions

### Built with TypeScript/Bun

**Why TypeScript/Bun (not Rust):**
- Faster development iteration
- Uses the TypeScript SDK directly
- Bun compiles to standalone executables
- 50-100ms startup is acceptable for a task management CLI

**Characteristics:**
- Binary size: ~50-100MB (includes Bun runtime)
- Startup time: ~50-100ms
- Cross-platform: macOS, Linux, Windows

---

## Build & Distribution

### Building

```bash
# Development
bun run src/cli.ts

# Build standalone executable
bun build --compile --minify --outfile taskdn

# Cross-compile
bun build --compile --target=bun-darwin-arm64 --outfile dist/taskdn-macos-arm64
bun build --compile --target=bun-darwin-x64 --outfile dist/taskdn-macos-x64
bun build --compile --target=bun-linux-x64 --outfile dist/taskdn-linux-x64
bun build --compile --target=bun-windows-x64 --outfile dist/taskdn.exe
```

### Distribution

- **npm:** `npm install -g @taskdn/cli` or `bun add -g @taskdn/cli`
- **GitHub Releases:** Standalone executables for each platform
- **Homebrew:** Formula for macOS users (future)

---

## Project Structure

```
taskdn-cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/
│   │   ├── context.ts
│   │   ├── show.ts
│   │   ├── list.ts
│   │   ├── search.ts
│   │   ├── add.ts
│   │   ├── complete.ts
│   │   ├── update.ts
│   │   ├── edit.ts
│   │   ├── archive.ts
│   │   ├── validate.ts
│   │   ├── config.ts
│   │   ├── projects.ts
│   │   └── areas.ts
│   ├── output/
│   │   ├── human.ts        # Colors, tables
│   │   ├── json.ts         # JSON format
│   │   └── yaml.ts         # YAML format (AI default)
│   └── config.ts           # Config loading
└── bin/
    └── taskdn              # Compiled executable
```

---

## Dependencies

```json
{
  "dependencies": {
    "@taskdn/sdk": "workspace:*",
    "commander": "^12.0.0",
    "picocolors": "^1.0.0",
    "cli-table3": "^0.6.0",
    "yaml": "^2.0.0"
  },
  "devDependencies": {
    "@clack/prompts": "^0.7.0"
  }
}
```

| Library | Purpose |
|---------|---------|
| `@taskdn/sdk` | TypeScript SDK (the Rust bindings) |
| `commander` | CLI argument parsing |
| `picocolors` | Terminal colors (fastest option) |
| `cli-table3` | Pretty tables for human output |
| `yaml` | YAML serialization for AI output |
| `@clack/prompts` | Interactive prompts (add, edit, init) |

---

## Notes

- Shell completions (bash, zsh, fish) should be auto-generated from commander
- Consider adding `--verbose` flag for debugging
- Error messages should be helpful and suggest fixes
- Exit codes should follow conventions (0 = success, 1 = error, 2 = usage error)

---

## Future Considerations

These are explicitly out of scope for v1 but may be added later:

- **Filtering in context command**: A generalized filter DSL (e.g., `--filter "tasks:status=done|ready"`) that works consistently across commands.
- **Shorthand commands**: `taskdn today`, `taskdn inbox`, `taskdn next` for common queries.
- **Computed filters**: `--actionable` (ready or in-progress, not deferred), `--stale` (not updated recently).

---

## Design Decisions & Rationale

This section documents key design decisions and why they were made.

### Why two distinct modes (human vs AI)?

Humans and AI agents have fundamentally different needs. Humans want pretty output, tolerate prompts, and think in fuzzy terms ("the login task"). AI agents need structured data, unambiguous identifiers (paths), and single-call efficiency. Rather than find a mediocre middle ground, we optimize for each.

### Why `--ai` as a mode, not just a format?

The `--ai` flag isn't just about output format—it changes behavior. AI mode never prompts (which would hang the agent), always includes file paths (so the agent can reference items in follow-up commands), and returns structured errors. This is more than just "output YAML instead of pretty text."

### Why YAML for AI output (not JSON)?

YAML is significantly more token-efficient than JSON (fewer brackets, quotes, less nesting overhead). Modern LLMs parse YAML reliably. For multi-line content like task bodies, YAML handles it more elegantly. The `--json` flag is available when strict JSON is needed.

### Why the `context` command?

AI agents helping users plan or review need hierarchical context. Without `context`, an agent would need multiple calls: get the area, then get its projects, then get tasks for each project. The `context` command returns everything in one call—the entity plus all related entities—minimizing round trips.

### Why separate `show` and `context`?

`show` returns a single entity with its body. `context` returns an entity plus its relationships (parent area/project, child tasks). They serve different purposes: `show` is "let me see this thing," `context` is "let me understand the full picture around this thing."

### Why require paths for writes in AI mode?

When an AI agent completes, drops, or updates a task, it must use the exact file path. This prevents mistakes—no risk of fuzzy matching the wrong task. The pattern is: query first (get paths), then act (use paths). This is slightly more verbose but eliminates a class of errors.

### Why fuzzy search for humans, paths for AI writes?

Humans think in titles ("complete the login bug task"). Requiring exact paths would be tedious. So human mode accepts fuzzy search and prompts when ambiguous. AI mode requires paths because AI agents shouldn't guess—they should use the paths returned from previous queries.

### Why noun commands for projects/areas (`taskdn projects`) instead of subcommands (`taskdn list projects`)?

Brevity for the common case. `taskdn list` (tasks) is the 90% case and stays short. Projects and areas are less frequent, so slightly longer commands are acceptable. The noun form (`taskdn projects`) is still shorter than the subcommand form.

### Why separate commands for project/area creation?

Tasks, projects, and areas have different fields and semantics per the spec. Separate commands (`taskdn project new`, `taskdn area new`) make this explicit and allow type-specific flags without confusion.

### Why manual archiving?

Archiving is a deliberate act of putting something away "forever." Automatic archiving on completion would be presumptuous—users might want to see recent completions. Manual archiving via `taskdn archive` gives users control.

### Why exclude done/dropped tasks by default?

Active lists should show actionable items. Completed tasks clutter the view. But they're not archived—they're still in the tasks directory as recent history. Flags like `--include-done` make them accessible when needed.

### Why natural language dates?

Typing `--due tomorrow` or `--due "next friday"` is more ergonomic than calculating ISO dates. Since we control the date parsing, we can accept natural language and always output ISO 8601.

### Why `taskdn` with no args shows help (not a dashboard)?

Keep it simple for v1. A dashboard view could be added later as a shorthand command (`taskdn today` or similar), but the default behavior should be predictable and minimal.
