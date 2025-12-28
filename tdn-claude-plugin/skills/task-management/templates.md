# File Templates

Reference templates for tasks, projects, and areas.

**Note:** The CLI's `tdn new` command handles file creation with proper timestamps and filenames. Use these templates only for:

- Understanding the expected file structure
- Creating files directly (rare edge cases)
- Reference when reading/analyzing files

---

## Task Template

```yaml
---
title: [Task title]
status: inbox
created-at: [YYYY-MM-DD]
updated-at: [YYYY-MM-DD]
---
## Notes

[Task details, context, or notes go here]
```

### Task with All Optional Fields

```yaml
---
title: [Task title]
status: ready
created-at: 2025-01-15
updated-at: 2025-01-15
due: 2025-01-20
scheduled: 2025-01-18
defer-until: 2025-01-16
projects:
  - "[[Project Name]]"
area: "[[Area Name]]"
---

## Notes

[Task details go here]

## Checklist

- [ ] Subtask 1
- [ ] Subtask 2
```

---

## Project Template

```yaml
---
title: [Project title]
status: planning
---

## Overview

[What is this project about?]

## Goals

[What does "done" look like?]
```

### Project with All Optional Fields

```yaml
---
title: [Project title]
status: in-progress
area: "[[Area Name]]"
description: [Short description under 500 characters]
start-date: 2025-01-01
end-date: 2025-03-31
---

## Overview

[Project description and context]

## Goals

- [ ] Goal 1
- [ ] Goal 2

## Milestones

| Date | Milestone |
|------|-----------|
| Jan 15 | Phase 1 complete |
| Feb 1 | Phase 2 complete |

## Notes

[Ongoing notes and updates]
```

---

## Area Template

```yaml
---
title: [Area title]
status: active
---
## Overview

[What does this area of responsibility cover?]
```

### Area with All Optional Fields

```yaml
---
title: [Area title]
status: active
type: [e.g., "client", "life-area", "business"]
description: [Short description under 500 characters]
---

## Overview

[Area description]

## Key Responsibilities

- Responsibility 1
- Responsibility 2

## Current Priorities

- Priority 1
- Priority 2

## Notes

[Context, contacts, background information]
```

---

## Filename Conventions

When the CLI creates files, it generates kebab-case filenames from titles:

| Title               | Filename              |
| ------------------- | --------------------- |
| "Call the dentist"  | `call-the-dentist.md` |
| "Q1 Planning 2025"  | `q1-planning-2025.md` |
| "Fix Auth Bug #123" | `fix-auth-bug-123.md` |

If creating files manually, follow the same pattern for consistency.

---

## File Reference Formats

When referencing projects or areas from tasks, use WikiLink format:

```yaml
# Preferred - WikiLink
projects:
  - "[[Q1 Planning]]"
area: "[[Work]]"

# Also valid - relative path
projects:
  - "./projects/q1-planning.md"
area: "./areas/work.md"

# Also valid - filename only
projects:
  - "q1-planning.md"
```

WikiLinks are preferred because they're human-readable and compatible with tools like Obsidian.
