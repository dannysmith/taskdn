# CLI Implementation Progress

Checklist tracking implementation of all CLI commands and features.

**Task documents:** See `docs/tasks-todo/task-{1-8}-cli-*.md`

---

## Commands

### Read Commands

- [x] `show <path>` - Show task by path
- [x] `show <path>` - Show project by path (auto-detected)
- [ ] `show area <name>` - Show area
- [ ] `show` fuzzy matching (human mode)
- [ ] `list` - List active tasks
- [ ] `list projects` - List projects
- [ ] `list areas` - List areas
- [ ] `list --status <status>` - Filter by status
- [ ] `list --status <s1>,<s2>` - Multiple statuses (OR)
- [ ] `list --project <name>` - Filter by project
- [ ] `list --area <name>` - Filter by area
- [ ] `list --due today/tomorrow/this-week` - Due date filter
- [ ] `list --overdue` - Overdue tasks
- [ ] `list --scheduled today` - Scheduled filter
- [ ] `list --sort <field>` - Sort results
- [ ] `list --desc` - Descending sort
- [ ] `list --limit <n>` - Limit results
- [ ] `list --include-done` - Include completed
- [ ] `list --include-dropped` - Include dropped
- [ ] `list --include-closed` - Include done + dropped
- [ ] `list --include-icebox` - Include icebox
- [ ] `list --include-deferred` - Include deferred
- [ ] `list --include-archived` - Include archived
- [ ] `list --only-archived` - Archived only
- [ ] `list --completed-after <date>` - Completion date filter
- [ ] `list --completed-before <date>` - Completion date filter
- [ ] `list --completed-today` - Completed today
- [ ] `list --completed-this-week` - Completed this week
- [ ] `list --query <text>` - Text search
- [ ] `context area <name>` - Area with projects and tasks
- [ ] `context project <name>` - Project with tasks and parent
- [ ] `context task <path>` - Task with parents
- [ ] `context --ai` (no args) - Vault overview
- [ ] `context --with-bodies` - Include all bodies

### Convenience Commands

- [ ] `today` - Due/scheduled today + overdue
- [ ] `inbox` - Inbox tasks
- [ ] `next` - Smart prioritization

### Write Commands

- [ ] `add <title>` - Quick add task
- [ ] `add <title> --status <s>` - With status
- [ ] `add <title> --project <p>` - With project
- [ ] `add <title> --area <a>` - With area
- [ ] `add <title> --due <date>` - With due date
- [ ] `add <title> --scheduled <date>` - With scheduled
- [ ] `add <title> --defer-until <date>` - With defer
- [ ] `add` (no args, human mode) - Interactive add
- [ ] `add project <name>` - Add project
- [ ] `add area <name>` - Add area
- [ ] `complete <path>` - Mark done
- [ ] `drop <path>` - Mark dropped
- [ ] `status <path> <status>` - Change status
- [ ] `update <path> --set <field>=<value>` - Update field
- [ ] `update <path> --unset <field>` - Clear field
- [ ] `archive <path>` - Move to archive
- [ ] `edit <path>` - Open in $EDITOR
- [ ] Batch operations (multiple paths)
- [ ] `--dry-run` - Preview changes

### System Commands

- [ ] `init` - Interactive setup
- [ ] `init --tasks-dir ... --projects-dir ... --areas-dir ...` - Non-interactive
- [ ] `config` - Show config
- [ ] `config --set <key>=<value>` - Set config
- [ ] `doctor` - Health check
- [ ] `--version` - Show version
- [ ] `--help` - Show help

---

## Output Modes

- [ ] Human mode (default) - Colors, formatting
- [ ] `--ai` mode - Structured Markdown
- [ ] `--json` mode - JSON with summary
- [ ] Errors in human mode (stderr)
- [ ] Errors in AI mode (stdout, structured)
- [ ] Errors in JSON mode (stdout, JSON)

---

## Error Codes

- [ ] `NOT_FOUND` - File/entity doesn't exist
- [ ] `AMBIGUOUS` - Multiple matches
- [ ] `INVALID_STATUS` - Bad status value
- [ ] `INVALID_DATE` - Unparseable date
- [ ] `INVALID_PATH` - Path outside directories
- [ ] `PARSE_ERROR` - YAML malformed
- [ ] `MISSING_FIELD` - Required field absent
- [ ] `REFERENCE_ERROR` - Reference doesn't exist
- [ ] `PERMISSION_ERROR` - Can't read/write
- [ ] `CONFIG_ERROR` - Config missing/invalid

---

## Features

### Short Flags

- [ ] `-s` for `--status`
- [ ] `-p` for `--project`
- [ ] `-a` for `--area`
- [ ] `-d` for `--due`
- [ ] `-q` for `--query`
- [ ] `-l` for `--limit`

### Interactive Features (Human Mode)

- [ ] Fuzzy match disambiguation prompt
- [ ] Interactive `add` (no args)
- [ ] Confirmation prompts

### Other Features

- [ ] `--stdin` - Pipe input
- [ ] Shell completions (bash)
- [ ] Shell completions (zsh)
- [ ] Shell completions (fish)

---

## Infrastructure

### Rust Core

- [x] Task parsing (`parseTaskFile`)
- [x] Project parsing (`parseProjectFile`)
- [ ] Area parsing (`parseAreaFile`)
- [ ] Vault scanning
- [ ] Wikilink parsing utility
- [ ] Vault index (relationships)
- [ ] File writing with round-trip fidelity
- [ ] Batch operations

### TypeScript Layer

- [x] Output formatters (human, AI, JSON)
- [x] Global options (--ai, --json)
- [x] CLI framework (Commander.js)
- [ ] Error handling with codes
- [ ] Interactive prompts (@clack/prompts)

---

## Exit Codes

- [ ] `0` - Success (including empty results)
- [ ] `1` - Runtime error
- [ ] `2` - Usage error

---

## Notes

Items marked [x] are implemented. Items marked [ ] are pending.

Update this file as features are completed.
