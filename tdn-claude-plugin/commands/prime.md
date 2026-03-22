---
description: Prime the current session with general context from taskdn and load the task-management skill
allowed-tools: Bash(tdn:*), Bash(which:*), Bash(curl:*), Bash(export:*), Bash(find:*), Bash(ls:*), Bash(cat:*), Bash(echo:*), Skill(tdn:task-management)
---

This session is being primed with context on the user's personal task management system: tasks, projects and life areas. Do this:

1. Load the `task-management` skill now.
2. Check if `tdn` is available: run `which tdn`
   - **If found** → skip to step 4.
   - **If not found** → continue to step 3.
3. Set up tdn for this environment (likely Claude Cowork). See [cowork.md](../skills/task-management/cowork.md) for full details. In short:
   a. Install: `curl -fsSL https://github.com/taskdn/taskdn/releases/latest/download/install.sh | bash && export PATH="$PATH:$HOME/.local/bin"`
   b. If install fails, search mounted dirs for a `tdn` binary: `find /sessions/*/mnt/ /mnt/ -name 'tdn' -o -name 'tdn-linux-arm64' 2>/dev/null`
   c. Discover vault directories in mounted paths (look for `tasks`, `projects`, `areas` folders)
   d. Create a `.taskdn.json` in the current directory with the discovered paths
   e. Verify with `tdn config --ai`
   f. If none of this works, tell the user and fall back to direct file access using the skill's specification and templates docs.
4. Run `tdn config --ai && tdn context --ai` (so output → your context)
5. Report only: "Got it... <x> areas, <y> active projects... 🚀" (where x & y are based on the output of step 4)
