---
description: Prime the current session with general context from taskdn and load the task-management skill
allowed-tools: Bash(tdn:*), Skill(tdn:task-management)
---

This session is being primed with context on the user's personal task management system: tasks, projects and life areas. Do this:

1. Load the `task-management` skill now.
2. Run `tdn config --ai && tdn context --ai` (so output -> your context)
3. Report only: "Got it... <x> areas, <y> active projects... 🚀" (where x & y are based on the output of (2))
