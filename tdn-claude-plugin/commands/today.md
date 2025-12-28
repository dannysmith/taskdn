---
description: Show today's actionable tasks - what needs attention right now
allowed-tools: Bash(tdn:*)
---

# Today's Tasks

Show all tasks that need attention today.

## What to Do

Run the `tdn today` command and display the results to the user:

```bash
tdn today --ai
```

## What It Shows

The output includes:

- **In-progress** tasks (currently being worked on)
- **Overdue** tasks (past due date)
- **Due today** tasks
- **Scheduled today** tasks
- **Newly actionable** tasks (defer-until = today)

## What It Excludes

- Done, dropped, and icebox tasks
- Deferred tasks (defer-until > today)
- Archived tasks

## After Running

Display the command output directly. If the user wants to take action on any task (complete it, update it, etc.), use the appropriate `tdn` command from the task-management skill.
