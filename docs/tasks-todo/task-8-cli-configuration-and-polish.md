# Task 8: CLI Configuration, System & Polish

**Work Directory:** `tdn-cli/`

**Depends on:** Task 7 (Architecture Review)

## Overview

Implement configuration commands (`init`, `config`), system health check (`doctor`), interactive disambiguation, and polish items like short flags and piping support.

## Phases

### Phase 1: Init Command

> **Note:** Config system exists in `src/config/index.ts` but currently uses `~/.config/taskdn/config.json`. This phase updates it to use `~/.taskdn.json` and adds the user-facing `init` command.

Interactive setup for new users.

```bash
taskdn init
```

**What to achieve:**

1. Update config system to use `~/.taskdn.json` instead of `~/.config/taskdn/config.json`
2. Create `init` command that:
   - Checks if config already exists (offer to overwrite)
   - Prompts for tasks/projects/areas directory paths
   - Creates `~/.taskdn.json` with user's choices
3. Support non-interactive mode with flags: `--tasks-dir`, `--projects-dir`, `--areas-dir`

**Config file format:**

```json
{
  "tasksDir": "/path/to/tasks",
  "projectsDir": "/path/to/projects",
  "areasDir": "/path/to/areas"
}
```

### Phase 2: Config Command

View current configuration (read-only).

```bash
taskdn config
```

**What to achieve:**

Create `config` command that shows effective configuration values.

**Human mode output example:**

```
Configuration

  Tasks directory:    ~/notes/tasks
  Projects directory: ~/notes/projects
  Areas directory:    ~/notes/areas

  Config file: ~/.taskdn.json
```

**AI mode output example:**

```markdown
## Configuration

- **tasks-dir:** ~/notes/tasks
- **projects-dir:** ~/notes/projects
- **areas-dir:** ~/notes/areas
- **config-file:** ~/.taskdn.json
```

**Note:** Users can edit `~/.taskdn.json` directly to change config - no `--set` needed.

### Phase 3: Doctor Command

Comprehensive health check for the vault.

```bash
taskdn doctor
```

**What to achieve:**

Create `doctor` command that validates:

**System checks:**
- Config file exists and is valid JSON
- Tasks/projects/areas directories exist and are readable

**File checks:**
- YAML frontmatter is parseable
- Required fields present (title, status for tasks)
- Status values are valid
- Date fields are valid ISO 8601 format
- Tasks have at most one project
- `taskdn-type` consistency (if ANY file uses it, all in directory should)

**Reference checks:**
- Project references point to existing projects
- Area references point to existing areas

**Output:**
- List issues found with file paths and clear descriptions
- Exit 0 if clean, exit 1 if issues found, exit 2 if command fails

**Human mode output example:**

```
✓ Config found (~/.taskdn.json)
✓ Tasks directory (47 files)
✓ Projects directory (6 files)
✓ Areas directory (4 files)

⚠ 3 issues found:

  ~/tasks/fix-login.md
    → References non-existent project "Q1 Planing"

  ~/tasks/old-task.md
    → Invalid status "inprogress" (valid: inbox, ready, in-progress, ...)

  ~/projects/abandoned.md
    → YAML parse error on line 3

Summary: 3 issues in 57 files checked
```

### Phase 4: Interactive Disambiguation

> **Note:** Interactive prompts already work in `new` command. Commands already throw AMBIGUOUS errors when queries match multiple entities. This phase intercepts those errors in human mode and shows an interactive picker.

**What to achieve:**

When a command throws an AMBIGUOUS error in human mode (not `--ai` or `--json`):
- Show interactive list with entity titles and file paths
- Let user select which one they mean
- Cancel if user presses Ctrl-C
- Execute the command with the selected entity

In AI/JSON mode:
- Keep current behavior (return AMBIGUOUS error)

**Commands that already handle ambiguous queries:**
- `show <query>`
- `update <query>`
- `archive <query>`
- `open <query>`
- `append-body <query>`
- `set status <query> <status>`

**Human mode example:**

```
? Multiple tasks match "login":

  ○ Fix login bug
    ~/tasks/fix-login-bug.md

  ○ Login page redesign
    ~/tasks/login-redesign.md

  Select one (or press Ctrl-C to cancel):
```

### Phase 5: Short Flags

Add single-letter shortcuts for common flags.

**What to achieve:**

Add short aliases to existing long flags:

| Short | Long        | Commands      |
| ----- | ----------- | ------------- |
| `-s`  | `--status`  | list, new     |
| `-p`  | `--project` | list, new     |
| `-a`  | `--area`    | list, new     |
| `-d`  | `--due`     | list, new     |
| `-l`  | `--limit`   | list          |

Example: `taskdn list -s ready -p "Q1" -l 10`

### Phase 6: Piping Support

**What to achieve:**

Add `--stdin` flag to `new` command to accept piped JSON input.

**Example:**

```bash
echo '{"title": "New task", "status": "ready"}' | taskdn new --stdin
```

**Note:** Only support JSON (not YAML) to keep it simple. `--json` output already works for piping out.

## Example Test Cases

```typescript
describe('init command', () => {
  test('creates config file')
  test('prompts for directories')
  test('works non-interactively with flags')
  test('warns if config exists')
})

describe('config command', () => {
  test('shows current config')
  test('shows effective values from different sources')
})

describe('doctor command', () => {
  test('passes on healthy vault')
  test('reports parse errors')
  test('reports invalid status')
  test('reports broken references')
  test('exits 1 when issues found')
  test('exits 0 when clean')
})

describe('short flags', () => {
  test('-s works like --status')
  test('-p works like --project')
  test('-d works like --due')
})

describe('piping', () => {
  test('--stdin accepts JSON for new command')
  test('--json output is valid JSON')
})
```

## Notes

- `@clack/prompts` is already a dependency - use it for interactive prompts
- Doctor command should be efficient for large vaults
