# Task 5: CLI Context & Convenience Commands

**Work Directory:** `tdn-cli/`

**Depends on:** Task 4 (Relationship Infrastructure)

## Overview

Implement the `context` command for hierarchical entity views, and convenience commands (`today`, `inbox`, `next`) for common workflows.

## Phases

### Phase 1: Context Area Command

`context area "Work"` returns the area plus its projects and tasks.

**Output structure (AI mode):**
```markdown
## Area: Work

- **path:** ~/areas/work.md
- **status:** active

### Body

Area description here...

## Projects in Work (2)

### Q1 Planning

- **path:** ~/projects/q1-planning.md
- **status:** in-progress
- **tasks:** 5

### Client Onboarding

- **path:** ~/projects/client-onboarding.md
- **status:** ready
- **tasks:** 3

## Tasks in Work (8)

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** in-progress
- **project:** Q1 Planning
- **due:** 2025-01-15
```

**Implementation:**

Uses `get_area_context()` from Task 4's relationship infrastructure:

```typescript
const context = getAreaContext(config, areaName);

if (!context.area) {
  // Handle area not found
}

// context.area - the matched area
// context.projects - all projects in this area
// context.tasks - all tasks (direct + via projects)
// context.warnings - any broken reference warnings
```

The Rust function handles:
- Wikilink parsing (via `extract_wikilink_name`)
- Finding projects with matching area reference
- Finding tasks with direct area OR via matched projects
- Deduplication (task with both direct and indirect reference)

### Phase 2: Context Project Command

`context project "Q1 Planning"` returns project + tasks + parent area.

**Implementation:**

Uses `get_project_context()` from Task 4's relationship infrastructure:

```typescript
const context = getProjectContext(config, projectName);

if (!context.project) {
  // Handle project not found
}

// context.project - the matched project
// context.area - parent area (if any)
// context.tasks - all tasks in this project
// context.warnings - any broken reference warnings
```

**Output structure (AI mode):**
```markdown
## Project: Q1 Planning

- **path:** ~/projects/q1-planning.md
- **status:** in-progress
- **area:** Work
- **start-date:** 2025-01-01
- **end-date:** 2025-03-31

### Body

Project notes...

## Parent Area

### Work

- **path:** ~/areas/work.md
- **status:** active

## Tasks in Q1 Planning (5)

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** in-progress
- **due:** 2025-01-15

### Write documentation

- **path:** ~/tasks/write-docs.md
- **status:** ready
```

### Phase 3: Context Task Command

`context task ~/tasks/foo.md` returns task + parent project + parent area.

**Output structure (AI mode):**
```markdown
## Task: Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** in-progress
- **due:** 2025-01-15
- **project:** Q1 Planning

### Body

Task details...

## Parent Project

### Q1 Planning

- **path:** ~/projects/q1-planning.md
- **status:** in-progress

## Parent Area

### Work

- **path:** ~/areas/work.md
- **status:** active
```

### Phase 4: Vault Overview

`context --ai` with no arguments returns vault overview.

**Output structure:**
```markdown
## Vault Overview

### Areas (3)

#### Work

- **path:** ~/areas/work.md
- **projects:** 2 active
- **tasks:** 15 active

#### Personal

- **path:** ~/areas/personal.md
- **projects:** 1 active
- **tasks:** 8 active

### Summary

- **total-active-tasks:** 47
- **overdue:** 2
- **in-progress:** 3

### This Week

#### Due (5)

- Fix login bug - ~/tasks/fix-login.md (due: 2025-01-18)
- Review report - ~/tasks/review-report.md (due: 2025-01-20)

#### Scheduled (3)

- Team standup prep - ~/tasks/standup-prep.md (scheduled: 2025-01-19)
```

**Human mode (no args):** Error prompting to specify entity or use --ai.

### Phase 5: Today Command

**Note from Task 4 Review:** Extract date utilities from `list.ts` to `src/lib/date.ts` when implementing this phase:
- `getToday()`, `formatDate()`, `getTomorrow()`, `getEndOfWeek()`, `getStartOfWeek()`

`taskdn today` - Tasks due today + scheduled for today.

```bash
taskdn today
taskdn today --ai
taskdn today --json
```

**Equivalent to:** `taskdn list --due today --scheduled today` (with OR logic between them)

**Output includes:**
- Overdue tasks (highlighted)
- Due today
- Scheduled for today
- In-progress tasks (current work)

### Phase 6: Inbox Command

`taskdn inbox` - Tasks with status: inbox.

```bash
taskdn inbox
taskdn inbox --ai
```

**Equivalent to:** `taskdn list --status inbox`

### Phase 7: Next Command

`taskdn next` - Smart prioritization of actionable tasks.

**Priority order (from CLI spec):**
1. Overdue tasks (highest)
2. Due today
3. Due this week
4. Currently in-progress
5. Ready status
6. Has a project (vs orphaned)

**Output:** Top N tasks (default 10?) in priority order.

**Implementation:**
1. Get all active tasks
2. Score each task based on priority factors
3. Sort by score descending
4. Return top N

## With-Bodies Flag

For context command, `--with-bodies` includes full body content for all related entities (not just primary).

```bash
taskdn context area "Work" --with-bodies --ai
```

## Test Cases

```typescript
describe('taskdn context', () => {
  describe('context area', () => {
    test('includes area details');
    test('includes child projects');
    test('includes tasks in area');
    test('respects --with-bodies flag');
  });

  describe('context project', () => {
    test('includes project details');
    test('includes parent area');
    test('includes tasks in project');
  });

  describe('context task', () => {
    test('includes task details');
    test('includes parent project');
    test('includes parent area');
  });

  describe('vault overview', () => {
    test('returns overview in AI mode with no args');
    test('errors in human mode with no args');
    test('includes area summaries');
    test('includes this week section');
  });
});

describe('convenience commands', () => {
  describe('today', () => {
    test('shows due today');
    test('shows scheduled today');
    test('shows overdue');
  });

  describe('inbox', () => {
    test('shows only inbox status tasks');
  });

  describe('next', () => {
    test('returns prioritized list');
    test('overdue tasks appear first');
  });
});
```

## Fixture Requirements

Need fixtures with relationships:

```
tests/fixtures/vault/
├── tasks/
│   ├── in-project-1.md     # projects: [[Test Project]]
│   ├── in-project-2.md     # projects: [[Test Project]]
│   └── orphan.md           # No project
├── projects/
│   ├── test-project.md     # area: [[Work]]
│   └── no-area.md          # No area
└── areas/
    └── work.md
```

## Verification

- [ ] `context area` shows area + projects + tasks
- [ ] `context project` shows project + tasks + parent area
- [ ] `context task` shows task + parent project + area
- [ ] `context --ai` shows vault overview
- [ ] `context` (human, no args) shows helpful error
- [ ] `--with-bodies` includes all bodies
- [ ] `today` shows due/scheduled today + overdue
- [ ] `inbox` shows inbox tasks
- [ ] `next` returns prioritized list
- [ ] All commands work in all output modes
- [ ] cli-progress.md updated

## Notes

- Context command is the key command for AI agents - needs to be efficient
- **Relationship resolution is handled by Task 4's Rust functions:**
  - `get_area_context()` - returns area + projects + tasks in one call
  - `get_project_context()` - returns project + area + tasks in one call
  - No need for caching - each function builds what it needs internally
- **Wikilink parsing** is handled by `extract_wikilink_name()` from Task 4
- The "This Week" section in vault overview needs date range calculation (use date utilities from list.ts)
