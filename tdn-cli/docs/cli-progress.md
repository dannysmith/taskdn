# CLI Implementation Progress

Checklist tracking implementation of all CLI commands and features.

**Task documents:** See `docs/tasks-todo/task-{1-8}-cli-*.md`

---

## Commands

### Read Commands

- [x] `show <path>` - Show task by path
- [x] `show <path>` - Show project by path (auto-detected)
- [x] `show <path>` - Show area by path (auto-detected)
- [ ] `show` fuzzy matching (human mode)
- [x] `list` - List active tasks
- [x] `list projects` - List projects
- [x] `list areas` - List areas
- [x] `list --status <status>` - Filter by status
- [x] `list --status <s1>,<s2>` - Multiple statuses (OR)
- [x] `list --project <name>` - Filter by project
- [x] `list --area <name>` - Filter by area
- [x] `list --due today/tomorrow/this-week` - Due date filter
- [x] `list --overdue` - Overdue tasks
- [x] `list --scheduled today` - Scheduled filter
- [x] `list --sort <field>` - Sort results
- [x] `list --desc` - Descending sort
- [x] `list --limit <n>` - Limit results
- [x] `list --include-done` - Include completed
- [x] `list --include-dropped` - Include dropped
- [x] `list --include-closed` - Include done + dropped
- [x] `list --include-icebox` - Include icebox
- [x] `list --include-deferred` - Include deferred
- [x] `list --include-archived` - Include archived
- [x] `list --only-archived` - Archived only
- [x] `list --completed-after <date>` - Completion date filter
- [x] `list --completed-before <date>` - Completion date filter
- [x] `list --completed-today` - Completed today
- [x] `list --completed-this-week` - Completed this week
- [x] `list --query <text>` - Text search
- [x] `context area <name>` - Area with projects and tasks
- [x] `context project <name>` - Project with tasks and parent
- [x] `context task <path>` - Task with parents
- [x] `context --ai` (no args) - Vault overview

### Convenience Commands

- [x] `today` - Due/scheduled today + overdue
- [x] `inbox` - Inbox tasks

### Write Commands

- [x] `add <title>` - Quick add task
- [x] `add <title> --status <s>` - With status
- [x] `add <title> --project <p>` - With project
- [x] `add <title> --area <a>` - With area
- [x] `add <title> --due <date>` - With due date (natural language supported)
- [x] `add <title> --scheduled <date>` - With scheduled
- [x] `add <title> --defer-until <date>` - With defer
- [x] `add` (no args, human mode) - Interactive add
- [x] `add project <name>` - Add project
- [x] `add project <name> --area <a> --status <s>` - With options
- [x] `add area <name>` - Add area
- [x] `add area <name> --type <t>` - With type
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

- [x] Human mode (default) - Colors, formatting
- [x] `--ai` mode - Structured Markdown
- [x] `--json` mode - JSON with summary
- [x] Errors in human mode (stderr)
- [x] Errors in AI mode (stdout, structured)
- [x] Errors in JSON mode (stdout, JSON)

---

## Error Codes

- [x] `NOT_FOUND` - File/entity doesn't exist (show command)
- [ ] `AMBIGUOUS` - Multiple matches
- [ ] `INVALID_STATUS` - Bad status value
- [x] `INVALID_DATE` - Unparseable date
- [ ] `INVALID_PATH` - Path outside directories
- [x] `PARSE_ERROR` - YAML malformed (show command)
- [x] `MISSING_FIELD` - Required field absent
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
- [x] Interactive `add` (no args)
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
- [x] Area parsing (`parseAreaFile`)
- [x] Vault scanning (`scanTasks`, `scanProjects`, `scanAreas`)
- [x] Fuzzy entity lookup (`findTasksByTitle`, `findProjectsByTitle`, `findAreasByTitle`)
- [x] Wikilink parsing utility (`extractWikilinkName`)
- [x] Vault index & relationship queries (`getTasksInArea`, `getProjectsInArea`, `getAreaContext`, `getProjectContext`, `getTaskContext`)
- [x] File writing with round-trip fidelity (`createTaskFile`, `createProjectFile`, `createAreaFile`, `updateFileFields`)
- [ ] Batch operations
- [ ] `taskdn-type` field support for mixed-content directories (S1 4.4, 5.4)

### TypeScript Layer

- [x] Output formatters (human, AI, JSON)
- [x] Global options (--ai, --json)
- [x] CLI framework (Commander.js)
- [x] Entity lookup wrapper (`lookupTask`, `lookupProject`, `lookupArea`)
- [x] Error handling with codes
- [x] Interactive prompts (@clack/prompts)
- [x] Natural language date parsing

---

## Exit Codes

- [x] `0` - Success (including empty results)
- [x] `1` - Runtime error
- [x] `2` - Usage error

---

## Notes

Items marked [x] are implemented. Items marked [ ] are pending.

Update this file as features are completed.
