# Command Reference

Complete documentation for all `tdn` CLI commands.

**Remember:** Always use `--ai` flag for all commands.

---

## tdn list

Query and filter entities.

### Syntax

```bash
tdn list [entity-type] [options] --ai
```

### Entity Types

- `tasks` (default)
- `projects`
- `areas`

### Filter Options

| Option               | Description                               | Example                |
| -------------------- | ----------------------------------------- | ---------------------- |
| `--status <status>`  | Filter by status (comma-separated for OR) | `--status inbox,ready` |
| `--due <when>`       | Filter by due date                        | `--due today`          |
| `--scheduled <when>` | Filter by scheduled date                  | `--scheduled tomorrow` |
| `--overdue`          | Show overdue tasks                        | `--overdue`            |
| `--project <name>`   | Filter by project (substring match)       | `--project "Q1"`       |
| `--area <name>`      | Filter by area (substring match)          | `--area "Work"`        |
| `--query <text>`     | Search in title and body                  | `--query "dentist"`    |

### Include Flags

By default, completed/archived items are hidden. Use these to include them:

| Flag                 | Description              |
| -------------------- | ------------------------ |
| `--include-done`     | Include done tasks       |
| `--include-dropped`  | Include dropped tasks    |
| `--include-icebox`   | Include icebox tasks     |
| `--include-closed`   | Include done + dropped   |
| `--include-deferred` | Include deferred tasks   |
| `--include-archived` | Include archived files   |
| `--only-archived`    | Show only archived files |

### Sort Options

| Option           | Description                                                                   |
| ---------------- | ----------------------------------------------------------------------------- |
| `--sort <field>` | Sort by field: `due`, `created`, `updated`, `title`, `start-date`, `end-date` |
| `--desc`         | Descending order                                                              |
| `--limit <n>`    | Limit results                                                                 |

### Examples

```bash
# All active tasks
tdn list --ai

# Inbox tasks
tdn list --status inbox --ai

# Tasks due this week, sorted by due date
tdn list --due this-week --sort due --ai

# Search for "report" in Work area
tdn list --area Work --query report --ai

# All projects including done
tdn list projects --include-done --ai
```

---

## tdn show

Display full entity details including body content.

### Syntax

```bash
tdn show <identifier> [entity-type] --ai
```

### Identifier

Can be:

- **Title** (fuzzy match): `"Fix bug"`
- **File path**: `./tasks/fix-bug.md` or `fix-bug.md`

### Examples

```bash
# Show task by title
tdn show "Call dentist" --ai

# Show project by path
tdn show ./projects/q1-planning.md project --ai

# Show area
tdn show "Work" area --ai
```

---

## tdn new

Create a new task, project, or area.

### Syntax

```bash
tdn new [entity-type] "<title>" [options] --ai
```

### Task Options

| Option                 | Description                     | Example                     |
| ---------------------- | ------------------------------- | --------------------------- |
| `--status <status>`    | Initial status (default: inbox) | `--status ready`            |
| `--due <date>`         | Due date                        | `--due tomorrow`            |
| `--scheduled <date>`   | Scheduled date                  | `--scheduled friday`        |
| `--defer-until <date>` | Hide until date                 | `--defer-until "next week"` |
| `--project <name>`     | Assign to project               | `--project "Q1 Planning"`   |
| `--area <name>`        | Assign to area                  | `--area "Work"`             |

### Project Options

| Option                 | Description                        |
| ---------------------- | ---------------------------------- |
| `--status <status>`    | Initial status (default: planning) |
| `--area <name>`        | Assign to area                     |
| `--start-date <date>`  | Project start date                 |
| `--end-date <date>`    | Project end date                   |
| `--description <text>` | Short description                  |

### Area Options

| Option                 | Description                             |
| ---------------------- | --------------------------------------- |
| `--status <status>`    | Initial status (default: active)        |
| `--type <type>`        | Area type (e.g., "client", "life-area") |
| `--description <text>` | Short description                       |

### Date Formats

Accepts natural language or ISO 8601:

| Input        | Meaning             |
| ------------ | ------------------- |
| `today`      | Today's date        |
| `tomorrow`   | Tomorrow            |
| `friday`     | Next Friday         |
| `next week`  | Monday of next week |
| `+3d`        | 3 days from now     |
| `+1w`        | 1 week from now     |
| `2025-01-20` | Specific date       |

### Examples

```bash
# Simple task
tdn new "Call dentist" --ai

# Task with details
tdn new "Review quarterly report" --due friday --project "Q1 Planning" --ai

# New project
tdn new project "Website Redesign" --area "Work" --start-date today --ai

# New area
tdn new area "Side Business" --type "business" --ai
```

---

## tdn context

Show entity with full hierarchical context. The primary command for understanding relationships.

### Syntax

```bash
tdn context [entity-type] [identifier] --ai
```

### Modes

| Usage                             | Output                        |
| --------------------------------- | ----------------------------- |
| `tdn context --ai`                | Full vault overview           |
| `tdn context area "Work" --ai`    | Area + its projects + tasks   |
| `tdn context project "Q1" --ai`   | Project + parent area + tasks |
| `tdn context task "Fix bug" --ai` | Task + parent project + area  |

### Output Sections

The context output uses progressive disclosure:

1. **Stats** — Quick counts
2. **Structure** — Hierarchical tree
3. **Timeline** — Time-sensitive items (overdue, due today, scheduled)
4. **In-Progress** — Details on active work
5. **Excerpts** — Body content snippets
6. **Reference** — File paths for all mentioned entities

### Examples

```bash
# What's going on in my vault?
tdn context --ai

# Deep dive into Work area
tdn context area "Work" --ai

# Full context for a specific task
tdn context task "Fix authentication bug" --ai
```

---

## tdn today

Show today's actionable tasks. A focused view for daily work.

### Syntax

```bash
tdn today --ai
```

### What It Shows

- In-progress tasks
- Overdue tasks
- Tasks due today
- Tasks scheduled for today
- Newly actionable tasks (defer-until = today)

### What It Excludes

- Done, dropped, icebox tasks
- Deferred tasks (defer-until > today)
- Archived tasks

---

## tdn set status

Change the status of a task or project.

### Syntax

```bash
tdn set status <identifier> <new-status> --ai
```

### Task Statuses

| Status        | Meaning                             |
| ------------- | ----------------------------------- |
| `inbox`       | Newly captured, not yet processed   |
| `icebox`      | Intentionally deferred indefinitely |
| `ready`       | Ready to work on                    |
| `in-progress` | Currently being worked on           |
| `blocked`     | Waiting on external dependency      |
| `dropped`     | Abandoned                           |
| `done`        | Completed                           |

### Project Statuses

| Status        | Meaning               |
| ------------- | --------------------- |
| `planning`    | Being scoped          |
| `ready`       | Ready to begin        |
| `blocked`     | Waiting on dependency |
| `in-progress` | Active work           |
| `paused`      | Temporarily on hold   |
| `done`        | Completed             |

### Automatic Timestamps

- Setting status to `done` or `dropped` auto-sets `completed-at`
- Clearing done/dropped auto-clears `completed-at`

### Examples

```bash
# Complete a task
tdn set status "Call dentist" done --ai

# Start working on something
tdn set status "Review report" in-progress --ai

# Pause a project
tdn set status "Website Redesign" project paused --ai
```

---

## tdn update

Modify entity fields.

### Syntax

```bash
tdn update <identifier> [entity-type] --set field=value [--set field=value ...] --ai
```

### Updatable Fields

**Tasks:**

- `due`, `scheduled`, `defer-until` — Dates
- `project`, `area` — References
- `status` — Task status

**Projects:**

- `status`, `area`, `description`, `start-date`, `end-date`

**Areas:**

- `status`, `type`, `description`

### Clearing Fields

Use empty value to clear:

```bash
tdn update "Task" --set due= --ai
```

### Examples

```bash
# Change due date
tdn update "Review report" --set due=tomorrow --ai

# Move task to different project
tdn update "Fix bug" --set project="Q2 Planning" --ai

# Update project end date
tdn update "Q1 Planning" project --set end-date=2025-03-31 --ai
```

---

## tdn archive

Move completed items to archive subdirectory.

### Syntax

```bash
tdn archive <identifier> [entity-type] --ai
```

### Behavior

- Moves file to `{directory}/archive/` subdirectory
- Handles filename collisions with numeric suffixes
- Works for tasks, projects, and areas

### Examples

```bash
# Archive a completed task
tdn archive "Old completed task" --ai

# Archive a done project
tdn archive "2024 Annual Review" project --ai
```

---

## tdn append-body

Add content to an entity's body section.

### Syntax

```bash
tdn append-body <identifier> [entity-type] "<content>" --ai
```

### Examples

```bash
# Add a note to a task
tdn append-body "Fix bug" "Discovered root cause: token refresh logic" --ai

# Add update to project
tdn append-body "Q1 Planning" project "Stakeholder approved timeline" --ai
```

---

## tdn doctor

Health check the vault for issues.

### Syntax

```bash
tdn doctor --ai
```

### What It Checks

- Missing required fields
- Invalid status values
- Broken references (project/area links that don't exist)
- Multi-project tasks (warns, not error)
- Malformed frontmatter

---

## tdn config

Show current configuration.

### Syntax

```bash
tdn config
```

### Output

Shows resolved paths (accounting for local overrides):

```
tasksDir: /path/to/tasks
projectsDir: /path/to/projects
areasDir: /path/to/areas
```

---

## tdn open

Open entity in $EDITOR.

### Syntax

```bash
tdn open <identifier> [entity-type]
```

**Note:** Rarely used by AI agents — primarily for human users.

---

## Batch Operations

Several commands support multiple targets:

```bash
tdn set status task1.md task2.md task3.md done --ai
tdn archive task1.md task2.md --ai
```

Results report successes and failures separately.
