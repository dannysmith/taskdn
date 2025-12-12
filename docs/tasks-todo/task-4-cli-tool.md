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

## Scope

- Human-friendly formatted output (colors, tables, interactive prompts)
- Machine-readable output (JSON) for scripts and AI agents
- Token-efficient output mode for AI agents
- Commands: list, add, complete, edit, search, etc.
- Configuration for task directory locations
- Shell completions
- Shipped as a single Bun executable

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

### Output Modes

Three output modes to serve different consumers:

```bash
# Default: Human-friendly (colors, tables, formatting)
taskdn list

# JSON: Strict JSON for scripts and tools
taskdn list --json

# AI: Token-efficient for AI agents
taskdn list --ai
```

---

## Commands

```bash
# Listing & Querying
taskdn list [--status <status>] [--project <project>] [--area <area>]
taskdn list --due today
taskdn list --due this-week
taskdn search <query>

# Creating
taskdn add <title> [--project <project>] [--area <area>] [--due <date>]
taskdn add  # Interactive mode

# Updating
taskdn complete <id-or-path>
taskdn edit <id-or-path>
taskdn status <id-or-path> <new-status>

# Other
taskdn config [--set <key=value>]
taskdn init  # Initialize taskdn in current directory
```

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
│   │   ├── list.ts
│   │   ├── add.ts
│   │   ├── complete.ts
│   │   ├── edit.ts
│   │   └── config.ts
│   ├── output/
│   │   ├── human.ts        # Colors, tables
│   │   ├── json.ts         # Strict JSON
│   │   └── ai.ts           # Token-efficient
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
    "cli-table3": "^0.6.0"
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
| `@clack/prompts` | Interactive prompts (add, edit) |

---

## Key Features

### Dry Run Mode

```bash
# Show what would happen without making changes
taskdn add "New task" --dry-run
taskdn complete task-123 --dry-run
```

### Piping Support

```bash
# Pipe in task data
echo '{"title": "New task", "status": "inbox"}' | taskdn add --stdin

# Pipe out for further processing
taskdn list --json | jq '.[] | select(.status == "ready")'
```

### AI Agent Optimization

The `--ai` flag produces compact, token-efficient output:

```bash
$ taskdn list --ai
id|title|status|due
task-1|Fix login bug|in-progress|2025-12-15
task-2|Write docs|ready|
task-3|Review PR|blocked|2025-12-13
```

vs JSON (~3x more tokens):

```json
[
  {"id": "task-1", "title": "Fix login bug", "status": "in-progress", "due": "2025-12-15"},
  ...
]
```

---

## Notes

- Shell completions (bash, zsh, fish) should be auto-generated from commander
- Consider adding `--verbose` flag for debugging
- Error messages should be helpful and suggest fixes
- Exit codes should follow conventions (0 = success, 1 = error, 2 = usage error)
