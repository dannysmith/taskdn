# Task 8: CLI Configuration, System & Polish

**Work Directory:** `tdn-cli/`

**Depends on:** Task 7 (Architecture Review)

## Overview

Implement configuration commands (`init`, `config`), system health check (`doctor`), interactive features, and polish items like short flags and shell completions.

## Phases

### Phase 1: Init Command

Interactive setup for new users.

```bash
taskdn init
```

**Behavior:**
1. Check if config already exists (offer to overwrite)
2. Prompt for tasks directory path
3. Prompt for projects directory path
4. Prompt for areas directory path
5. Create `.taskdn.json` in current directory
6. Optionally create the directories if they don't exist

**Config file format:**
```json
{
  "tasksDir": "/path/to/tasks",
  "projectsDir": "/path/to/projects",
  "areasDir": "/path/to/areas"
}
```

**Non-interactive mode:**
```bash
taskdn init --tasks-dir ./tasks --projects-dir ./projects --areas-dir ./areas
```

### Phase 2: Config Command

View and modify configuration.

```bash
taskdn config                           # Show current config
taskdn config --set tasksDir=./tasks    # Set a value
```

**Show output (human mode):**
```
Configuration

  Tasks directory:    ~/notes/tasks
  Projects directory: ~/notes/projects
  Areas directory:    ~/notes/areas

  Config file: ~/.config/taskdn/config.json
```

**Show output (AI mode):**
```markdown
## Configuration

- **tasks-dir:** ~/notes/tasks
- **projects-dir:** ~/notes/projects
- **areas-dir:** ~/notes/areas
- **config-file:** ~/.config/taskdn/config.json
```

**Config precedence (highest to lowest):**
1. CLI flags (`--tasks-dir`)
2. Environment variables (`TASKDN_TASKS_DIR`)
3. Local config (`./.taskdn.json`)
4. User config (`~/.config/taskdn/config.json`)
5. Defaults

### Phase 3: Doctor Command

Comprehensive health check for the vault.

```bash
taskdn doctor
taskdn doctor --ai
taskdn doctor --json
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
| File | Tasks have at most one project |
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

**Exit codes:**
| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | Issues found (command succeeded, but problems exist) |
| 2 | Command failed to run (couldn't read config, etc.) |

### Phase 4: Interactive Prompts & Fuzzy Disambiguation

> **Includes fuzzy disambiguation from Task 2 Phase 6**
>
> This phase wires up interactive prompts to all commands that accept entity names: `show`, `complete`, `drop`, `status`, `update`, `archive`. Uses the fuzzy lookup utility from Task 3 Phase 10.

Implement interactive features for human mode.

**Fuzzy match disambiguation (human mode):**
When a fuzzy search returns multiple matches:
```
? Multiple tasks match "login":

  ○ Fix login bug
    ~/tasks/fix-login-bug.md

  ○ Login page redesign
    ~/tasks/login-redesign.md

  ○ Write login tests
    ~/tasks/login-tests.md

  Select one (or press Ctrl-C to cancel):
```

**Commands that use disambiguation:**
- `show <name>` - show a task/project/area by name
- `complete <name>` - mark task complete
- `drop <name>` - mark task dropped
- `status <name> <status>` - change status
- `update <name>` - update fields
- `archive <name>` - archive entity

**AI/JSON mode behavior:**
When multiple matches found, return `AMBIGUOUS` error:
```json
{
  "error": true,
  "code": "AMBIGUOUS",
  "message": "Multiple tasks match 'login'",
  "matches": [
    {"title": "Fix login bug", "path": "~/tasks/fix-login-bug.md"},
    {"title": "Login page redesign", "path": "~/tasks/login-redesign.md"}
  ],
  "suggestion": "Use a more specific name or provide the full path"
}
```

**Confirmation prompts:**
For destructive operations (if we add any):
```
? Are you sure you want to archive 5 tasks? (y/N)
```

**Interactive add:**
When `taskdn add` is called with no arguments:
```
? Task title: Review quarterly report
? Status: (inbox) ready
? Project: (none) Q1 Planning
? Due date: (none) friday

Creating task...
✓ Created ~/tasks/review-quarterly-report.md
```

**Test cases for fuzzy disambiguation:**
```typescript
describe('fuzzy matching prompts', () => {
  test('shows prompt when multiple matches (human mode)');
  test('returns AMBIGUOUS error with matches (AI mode)');
  test('returns AMBIGUOUS error with matches (JSON mode)');
  test('proceeds without prompt for single match');
  test('returns NOT_FOUND when no matches');
});
```

### Phase 5: Short Flags

Add single-letter shortcuts for common flags.

| Short | Long | Usage |
|-------|------|-------|
| `-s` | `--status` | `-s ready` |
| `-p` | `--project` | `-p "Q1"` |
| `-a` | `--area` | `-a "Work"` |
| `-d` | `--due` | `-d today` |
| `-q` | `--query` | `-q "login"` |
| `-l` | `--limit` | `-l 20` |

**Implementation:** Add to Commander.js option definitions.

### Phase 6: Piping Support

Support for piping data in and out.

**Pipe in:**
```bash
echo '{"title": "New task"}' | taskdn add --stdin
echo 'title: New task' | taskdn add --stdin
```

**Pipe out:**
```bash
taskdn list --json | jq '.tasks[] | select(.status == "ready")'
```

The `--json` output is already pipeable. Add `--stdin` for input.

### Phase 7: Shell Completions

Generate shell completion scripts.

```bash
taskdn completions bash > ~/.bash_completion.d/taskdn
taskdn completions zsh > ~/.zfunc/_taskdn
taskdn completions fish > ~/.config/fish/completions/taskdn.fish
```

**What to complete:**
- Command names
- Flag names
- Status values for `--status`
- Entity types for `list` (tasks, projects, areas)
- File paths for commands that take paths

### Phase 8: Error Refinement

Polish error messages across all commands.

**Helpful suggestions:**
```
Error: No configuration found.

Run `taskdn init` to set up your vault, or create a .taskdn.json file.
```

**Did you mean:**
```
Error: Invalid status "inprogress"

Did you mean "in-progress"? Valid values: inbox, icebox, ready, in-progress, blocked, dropped, done
```

**Actionable context:**
```
Error: File not found: ~/tasks/login-bug.md

Similar tasks found:
  - ~/tasks/fix-login-bug.md
  - ~/tasks/login-page-redesign.md

Use `taskdn list -q "login"` to search for tasks.
```

## Test Cases

```typescript
describe('init command', () => {
  test('creates config file');
  test('prompts for directories');
  test('works non-interactively with flags');
  test('warns if config exists');
});

describe('config command', () => {
  test('shows current config');
  test('sets config values');
  test('shows config sources');
});

describe('doctor command', () => {
  test('passes on healthy vault');
  test('reports parse errors');
  test('reports invalid status');
  test('reports broken references');
  test('exits 1 when issues found');
  test('exits 0 when clean');
});

describe('short flags', () => {
  test('-s works like --status');
  test('-p works like --project');
  test('-d works like --due');
});

describe('piping', () => {
  test('--stdin accepts JSON');
  test('--stdin accepts YAML');
  test('--json output is valid JSON');
});
```

## Verification

- [ ] `init` creates config interactively and non-interactively
- [ ] `config` shows and sets values
- [ ] `doctor` checks all aspects and reports issues
- [ ] Fuzzy disambiguation prompts work for show, complete, drop, etc.
- [ ] AMBIGUOUS error returned in AI/JSON mode for multiple matches
- [ ] Interactive prompts work for `add` with no args
- [ ] Short flags work for all common options
- [ ] `--stdin` accepts piped input
- [ ] Shell completions generate correctly
- [ ] Error messages are helpful with suggestions
- [ ] All commands work in all output modes
- [ ] cli-progress.md fully checked off

## Notes

- `@clack/prompts` is already a dependency - use it for interactive prompts
- Commander.js supports completion generation
- Doctor command should be efficient for large vaults
- Consider: should doctor have a `--fix` option? (Probably not for v1)
- Error refinement is iterative - improve as we use the CLI
