---
description: Get a list of taskdn tasks which probably matter right now (in-progress, overdue, due today, scheduled today, newly become available today (defer-until = today)).
allowed-tools: Bash(tdn:*), Skill(tdn:task-management)
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
