# Task 5: CLI Context & Convenience Commands

**Work Directory:** `tdn-cli/`

**Depends on:** Task 4 (Relationship Infrastructure)

## Overview

Implement the `context` command for hierarchical entity views, and convenience commands (`today`, `inbox`, `next`) for common workflows.

---

## Prerequisites from Task 4

The following Rust functions are available via `@bindings`:

| Function               | Purpose                                              | Returns                                  |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `getAreaContext()`     | Area + its projects + all tasks (direct + indirect)  | `AreaContextResult`                      |
| `getProjectContext()`  | Project + parent area + its tasks                    | `ProjectContextResult`                   |
| `getTasksInArea()`     | Tasks in an area (direct + via projects)             | `TasksInAreaResult`                      |
| `getProjectsInArea()`  | Projects in an area (optimized: no task file reads)  | `Project[]`                              |
| `extractWikilinkName()`| Extract target name from wikilink syntax             | `string \| null`                         |

**To be added in Phase 3:**

| Function               | Purpose                                              | Returns                                  |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `getTaskContext()`     | Task + parent project + parent area                  | `TaskContextResult`                      |

**Result types (from Rust):**

```typescript
interface AreaContextResult {
  area: Area | null;        // null if area not found
  projects: Project[];      // Projects in this area
  tasks: Task[];            // All tasks (direct + via projects)
  warnings: string[];       // Broken reference warnings
}

interface ProjectContextResult {
  project: Project | null;  // null if project not found
  area: Area | null;        // Parent area if any
  tasks: Task[];            // Tasks in this project
  warnings: string[];
}

interface TasksInAreaResult {
  tasks: Task[];
  warnings: string[];
}
```

---

## Current State

- **context.ts** - Implements `context area` command; stubs for project/task/vault-overview
- **list.ts** - Contains date utilities to be extracted in Phase 5.0
- **output/types.ts** - All context result types implemented
- **output/ai.ts, human.ts, json.ts** - Formatters for all context types implemented

---

## Phase 0: Formatter Infrastructure ✅ COMPLETE

Before implementing context commands, extend the formatter infrastructure.

### 0.1 Add Context Result Types ✅

Added to `src/output/types.ts`:
- `AreaContextResultOutput`
- `ProjectContextResultOutput`
- `TaskContextResultOutput`
- `VaultOverviewResult` with `AreaSummary`, `VaultSummary`, `ThisWeekSummary`

### 0.2 Implement Formatters ✅

Implemented formatting for all context types in:
- `src/output/ai.ts` - Structured markdown
- `src/output/human.ts` - Pretty colored output
- `src/output/json.ts` - JSON with summary

### Phase 0 Verification

- [x] New result types added to `types.ts`
- [x] `FormattableResult` union updated
- [x] Formatters compile without errors
- [x] Existing tests still pass

---

## Phase 1: Context Area Command ✅ COMPLETE

`context area "Work"` returns the area plus its projects and tasks.

### 1.1 Implementation

**File:** `src/commands/context.ts`

```typescript
// Pseudocode structure
if (entityType === 'area') {
  const config = getVaultConfig();
  const result = getAreaContext(config, target);

  if (!result.area) {
    // Handle area not found (NOT_FOUND error)
  }

  // Group tasks by project for display
  const projectTasks = groupTasksByProject(result.tasks, result.projects);
  const directTasks = result.tasks.filter(t => !t.project);

  const output: AreaContextResultOutput = {
    type: 'area-context',
    area: result.area,
    projects: result.projects,
    projectTasks,
    directTasks,
    warnings: result.warnings,
  };

  console.log(formatOutput(output, globalOpts));
}
```

### 1.2 Output Format (AI Mode)

Per cli-requirements.md Section "Context Command":

```markdown
## Area: Work

- **path:** ~/areas/work.md
- **status:** active

### Body

Area description here...

## Projects in Work (2)

### Project: Q1 Planning

- **path:** ~/projects/q1-planning.md
- **status:** in-progress
- **tasks:** 1

#### Task: Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** in-progress
- **project:** Q1 Planning
- **due:** 2025-01-15

### Project: Client Onboarding

- **path:** ~/projects/client-onboarding.md
- **status:** ready
- **tasks:** 0

## Tasks Directly in Area: Work (1)

#### Task: Fix Thing

- **path:** ~/tasks/fix-thing.md
- **status:** in-progress
- **due:** 2025-01-16
```

**Field selection (per cli-requirements.md):**

| Entity           | Fields Shown                                    |
| ---------------- | ----------------------------------------------- |
| Area (primary)   | Full frontmatter + body                         |
| Project (related)| title (heading), path, status, task count       |
| Task (related)   | title (heading), path, status, due (if set)     |

### 1.3 Tests

**E2E tests (`tests/e2e/context-area.test.ts`):**

```typescript
describe('context area', () => {
  test('returns area with projects and tasks', async () => {
    // Uses fixture with relationships
  });

  test('includes projects in area', async () => {});

  test('includes tasks via projects', async () => {});

  test('includes tasks directly in area', async () => {});

  test('deduplicates tasks in both project and direct area', async () => {
    // Edge case: task has area AND its project is in same area
  });

  test('handles area not found', async () => {
    // Should return NOT_FOUND error
  });

  test('works in all output modes', async () => {});
});
```

### 1.3 Tests ✅

E2E tests added in `tests/e2e/context-area.test.ts` (22 tests).

### Phase 1 Verification

- [x] `context area "Work"` returns area details
- [x] Includes child projects with task counts
- [x] Includes tasks organized by project
- [x] Includes direct tasks (tasks with area but no project)
- [x] Body included for primary entity only (area)
- [x] NOT_FOUND error for missing area
- [x] Works in human, AI, and JSON modes
- [x] E2E tests pass

---

## Phase 2: Context Project Command ✅ COMPLETE

`context project "Q1 Planning"` returns project + tasks + parent area.

### 2.1 Implementation

Uses `getProjectContext()` from Task 4.

```typescript
if (entityType === 'project') {
  const config = getVaultConfig();
  const result = getProjectContext(config, target);

  if (!result.project) {
    // Handle project not found
  }

  const output: ProjectContextResultOutput = {
    type: 'project-context',
    project: result.project,
    area: result.area,
    tasks: result.tasks,
    warnings: result.warnings,
  };

  console.log(formatOutput(output, globalOpts));
}
```

### 2.2 Output Format (AI Mode)

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

### 2.3 Tests

```typescript
describe('context project', () => {
  test('returns project with tasks and parent area', async () => {});
  test('includes parent area details', async () => {});
  test('includes all tasks in project', async () => {});
  test('handles project with no area', async () => {});
  test('handles project not found', async () => {});
  test('works in all output modes', async () => {});
});
```

### 2.3 Tests ✅

E2E tests added in `tests/e2e/context-project.test.ts` (20 tests).

### Phase 2 Verification

- [x] `context project "Q1"` returns project details
- [x] Includes parent area (if any)
- [x] Includes all tasks in project
- [x] Body included for primary entity only (project)
- [x] NOT_FOUND error for missing project
- [x] Works in all output modes
- [x] E2E tests pass

---

## Phase 3: Context Task Command

`context task ~/tasks/foo.md` returns task + parent project + parent area.

### 3.1 Implementation

Add a new Rust function following the same pattern as `getAreaContext()` and `getProjectContext()`:

**Rust (`crates/core/src/vault_index.rs`):**

```rust
#[napi(object)]
pub struct TaskContextResult {
    pub task: Option<Task>,       // None if task not found
    pub project: Option<Project>, // Parent project if any
    pub area: Option<Area>,       // Parent area (direct or via project)
    pub warnings: Vec<String>,
}

#[napi]
pub fn get_task_context(config: VaultConfig, task_path: String) -> TaskContextResult
```

**TypeScript usage:**

```typescript
if (entityType === 'task') {
  const config = getVaultConfig();
  const result = getTaskContext(config, target);

  if (!result.task) {
    // Handle task not found (NOT_FOUND error)
  }

  const output: TaskContextResultOutput = {
    type: 'task-context',
    task: result.task,
    project: result.project,
    area: result.area,
    warnings: result.warnings,
  };

  console.log(formatOutput(output, globalOpts));
}
```

This keeps all relationship resolution in Rust, consistent with the area and project context commands.

### 3.2 Output Format (AI Mode)

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

### 3.3 Tests

```typescript
describe('context task', () => {
  test('returns task with parent project and area', async () => {});
  test('includes parent project details', async () => {});
  test('includes parent area (via project)', async () => {});
  test('includes direct area when no project', async () => {});
  test('handles task with no parents', async () => {});
  test('handles task not found', async () => {});
  test('accepts path input', async () => {});
  test('works in all output modes', async () => {});
});
```

### Phase 3 Verification

- [ ] `context task ~/tasks/foo.md` returns task details
- [ ] Includes parent project (if any)
- [ ] Includes parent area (via project or direct)
- [ ] Body included for primary entity (task)
- [ ] NOT_FOUND error for missing task
- [ ] Works in all output modes
- [ ] E2E tests pass

---

## Phase 4: Vault Overview

`context --ai` with no arguments returns vault overview.

### 4.1 Behavior by Mode

| Mode  | No Args Behavior                                    |
| ----- | --------------------------------------------------- |
| AI    | Returns vault overview (areas, summary, this week)  |
| Human | Error: "Please specify an entity or use --ai"       |
| JSON  | Returns vault overview (same as AI mode)            |

The stub in `context.ts` already handles the human mode error.

### 4.2 Implementation

```typescript
if (!entityType && !target) {
  if (mode === 'human') {
    // Already implemented in stub - error message
  }

  // Build vault overview
  const config = getVaultConfig();
  const areas = scanAreas(config).filter(isActiveArea);
  const projects = scanProjects(config).filter(isActiveProject);
  const tasks = scanTasks(config).filter(isActiveTask);

  // Calculate summaries
  const areaSummaries = areas.map(area => ({
    area,
    projectCount: projects.filter(p => projectInArea(p, area)).length,
    activeTaskCount: tasks.filter(t => taskInArea(t, area, projects)).length,
  }));

  const today = getToday();
  const endOfWeek = getEndOfWeek(today);

  const summary: VaultSummary = {
    totalActiveTasks: tasks.length,
    overdueCount: tasks.filter(t => t.due && t.due < today).length,
    inProgressCount: tasks.filter(t => t.status === 'InProgress').length,
  };

  const thisWeek: ThisWeekSummary = {
    dueTasks: tasks.filter(t => t.due && t.due >= today && t.due <= endOfWeek),
    scheduledTasks: tasks.filter(t => t.scheduled && t.scheduled >= today && t.scheduled <= endOfWeek),
  };

  const output: VaultOverviewResult = {
    type: 'vault-overview',
    areas: areaSummaries,
    summary,
    thisWeek,
  };

  console.log(formatOutput(output, globalOpts));
}
```

### 4.3 Output Format (AI Mode)

Per cli-requirements.md:

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

### 4.4 Tests

```typescript
describe('vault overview', () => {
  test('returns overview in AI mode with no args', async () => {});
  test('errors in human mode with no args', async () => {});
  test('includes area summaries with counts', async () => {});
  test('includes vault summary statistics', async () => {});
  test('includes this week section', async () => {});
  test('works in JSON mode', async () => {});
});
```

### Phase 4 Verification

- [ ] `context --ai` returns vault overview
- [ ] `context` (human, no args) shows helpful error
- [ ] Area summaries include project and task counts
- [ ] Summary includes total tasks, overdue, in-progress
- [ ] This Week section shows due and scheduled tasks
- [ ] Works in AI and JSON modes
- [ ] E2E tests pass

---

## Phase 5: Context Enhancements

### 5.0 Extract Date Utilities (Prep)

Before implementing convenience commands, extract date utilities from `list.ts`:

**Create `src/lib/date.ts`:**

```typescript
export function getToday(): string;
export function formatDate(date: Date): string;
export function getTomorrow(today: string): string;
export function getEndOfWeek(today: string): string;
export function getStartOfWeek(today: string): string;
```

Update `list.ts` to import from `@/lib/date.ts`.

### 5.1 With-Bodies Flag

Add `--with-bodies` flag to include body content for all entities, not just primary.

```bash
taskdn context area "Work" --with-bodies --ai
```

**Implementation:**

- Add `withBodies` option to context command
- Pass through to formatter
- When true, include body for projects and tasks (not just area)

### Phase 5 Verification

- [ ] Date utilities extracted to `src/lib/date.ts`
- [ ] `list.ts` updated to use shared utilities
- [ ] `--with-bodies` flag works with all context subcommands
- [ ] Bodies included for related entities when flag set

---

## Phase 6: Today Command

`taskdn today` - Tasks due today + scheduled for today + overdue.

### 6.1 Implementation

**Create `src/commands/today.ts`:**

```typescript
export const todayCommand = new Command('today')
  .description('Tasks due or scheduled for today')
  .action((options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();
    const today = getToday();

    let tasks = scanTasks(config).filter(isActiveTask);

    // Include: due today, scheduled today, overdue, in-progress
    tasks = tasks.filter(task =>
      task.due === today ||
      task.scheduled === today ||
      (task.due && task.due < today) ||  // overdue
      task.status === 'InProgress'
    );

    // Sort: overdue first, then due today, then scheduled, then in-progress
    tasks = sortByTodayPriority(tasks, today);

    const output: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(output, globalOpts));
  });
```

**Register in `src/commands/index.ts`.**

### 6.2 Output Considerations

Uses existing `TaskListResult` and formatters. Output is same as `list` command.

In human mode, overdue tasks should be highlighted (red/warning color).

### 6.3 Tests

```typescript
describe('today command', () => {
  test('shows tasks due today', async () => {});
  test('shows tasks scheduled for today', async () => {});
  test('shows overdue tasks', async () => {});
  test('shows in-progress tasks', async () => {});
  test('sorts by priority (overdue first)', async () => {});
  test('works in all output modes', async () => {});
});
```

### Phase 6 Verification

- [ ] `today` command shows due today
- [ ] Shows scheduled for today
- [ ] Shows overdue tasks
- [ ] Shows in-progress tasks
- [ ] Proper priority sorting
- [ ] Works in all output modes
- [ ] E2E tests pass

---

## Phase 7: Inbox Command

`taskdn inbox` - Tasks with status: inbox.

### 7.1 Implementation

**Create `src/commands/inbox.ts`:**

```typescript
export const inboxCommand = new Command('inbox')
  .description('Tasks in inbox')
  .action((options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();

    const tasks = scanTasks(config).filter(task => task.status === 'Inbox');

    const output: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(output, globalOpts));
  });
```

**Register in `src/commands/index.ts`.**

### 7.2 Tests

```typescript
describe('inbox command', () => {
  test('shows only inbox status tasks', async () => {});
  test('works in all output modes', async () => {});
  test('empty result when no inbox tasks', async () => {});
});
```

### Phase 7 Verification

- [ ] `inbox` command shows inbox tasks only
- [ ] Works in all output modes
- [ ] E2E tests pass

---

## Phase 8: Next Command

`taskdn next` - Smart prioritization of actionable tasks.

### 8.1 Priority Algorithm

Per cli-requirements.md, priority order (highest to lowest):

1. Overdue tasks
2. Due today
3. Due this week
4. Currently in-progress
5. Ready status
6. Has a project (vs orphaned)

### 8.2 Implementation

**Create `src/commands/next.ts`:**

```typescript
function calculatePriorityScore(task: Task, today: string, endOfWeek: string): number {
  let score = 0;

  // Overdue: highest priority (100 points)
  if (task.due && task.due < today) {
    score += 100;
  }
  // Due today (50 points)
  else if (task.due === today) {
    score += 50;
  }
  // Due this week (25 points)
  else if (task.due && task.due <= endOfWeek) {
    score += 25;
  }

  // In-progress (20 points)
  if (task.status === 'InProgress') {
    score += 20;
  }
  // Ready (10 points)
  else if (task.status === 'Ready') {
    score += 10;
  }

  // Has project (5 points)
  if (task.project) {
    score += 5;
  }

  return score;
}

export const nextCommand = new Command('next')
  .description('Prioritized list of actionable tasks')
  .option('-l, --limit <n>', 'Maximum tasks to return', '10')
  .action((options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();
    const today = getToday();
    const endOfWeek = getEndOfWeek(today);
    const limit = parseInt(options.limit, 10);

    let tasks = scanTasks(config).filter(isActiveTask);

    // Only include actionable tasks (ready, in-progress, or have due dates)
    tasks = tasks.filter(task =>
      task.status === 'Ready' ||
      task.status === 'InProgress' ||
      task.due
    );

    // Score and sort
    const scored = tasks.map(task => ({
      task,
      score: calculatePriorityScore(task, today, endOfWeek),
    }));

    scored.sort((a, b) => b.score - a.score);

    const topTasks = scored.slice(0, limit).map(s => s.task);

    const output: TaskListResult = {
      type: 'task-list',
      tasks: topTasks,
    };

    console.log(formatOutput(output, globalOpts));
  });
```

### 8.3 Tests

```typescript
describe('next command', () => {
  test('returns prioritized list', async () => {});
  test('overdue tasks appear first', async () => {});
  test('due today before due this week', async () => {});
  test('in-progress before ready', async () => {});
  test('respects --limit option', async () => {});
  test('default limit is 10', async () => {});
  test('works in all output modes', async () => {});
});
```

### Phase 8 Verification

- [ ] `next` returns prioritized task list
- [ ] Overdue tasks appear first
- [ ] Priority order matches specification
- [ ] `--limit` option works
- [ ] Default limit is 10
- [ ] Works in all output modes
- [ ] E2E tests pass

---

## Fixture Requirements

Existing fixtures in `tests/fixtures/vault/` have been enhanced for relationship testing.

### Current Fixtures with Relationships

```
tests/fixtures/vault/
├── tasks/
│   ├── full-metadata.md      # project: [[Test Project]], area: [[Work]] ✅
│   ├── in-test-project.md    # project: [[Test Project]] ✅ (added Phase 1)
│   ├── in-work-direct.md     # area: [[Work]], no project ✅ (added Phase 1)
│   ├── status-inbox.md       # status: inbox ✅
│   ├── due-past.md           # due: past date ✅
│   ├── due-this-week.md      # due: within week ✅
│   └── ...other status/date fixtures
├── projects/
│   ├── test-project.md       # area: [[Work]] ✅
│   └── ...other project fixtures
└── areas/
    └── work.md               # ✅
```

### Still Needed (for later phases)

- `no-area-project.md` - Project without area (for Phase 2 edge case)

### Mock Date Testing

For date-dependent tests (today, overdue, this week), use `TASKDN_MOCK_DATE` env var (already supported in list.ts date utilities).

---

## Final Verification Checklist

### Context Commands

- [x] `context area` shows area + projects + tasks
- [x] `context project` shows project + tasks + parent area
- [ ] `context task` shows task + parent project + area
- [ ] `context --ai` (no args) shows vault overview
- [x] `context` (human, no args) shows helpful error
- [ ] `--with-bodies` includes all bodies

### Convenience Commands

- [ ] `today` shows due/scheduled today + overdue + in-progress
- [ ] `inbox` shows inbox tasks only
- [ ] `next` returns prioritized list with correct ordering

### Cross-Cutting

- [x] All commands work in human, AI, and JSON modes (for implemented commands)
- [ ] Date utilities extracted to `src/lib/date.ts`
- [x] Error handling follows existing patterns (NOT_FOUND, etc.)
- [ ] `cli-progress.md` updated
- [x] All E2E tests pass
- [x] `bun run check` passes

---

## Notes

- **Context command is key for AI agents** - Must be efficient (single call)
- **Relationship resolution handled by Rust** - `getAreaContext()`, `getProjectContext()` from Task 4
- **Wikilink parsing** - `extractWikilinkName()` from Task 4
- **Date utilities** - Extract to shared module before Phase 6
- **Output modes** - All commands support human/AI/JSON via existing formatter infrastructure

## Relevant Specifications

- **cli-requirements.md** - Context Command, Convenience Commands, AI Mode Output
- **S2-interface-design.md** - Output formats, error handling patterns
- **S1-core.md** - Entity relationships, field definitions

## Dependencies for Future Tasks

- **Task 6 (Write Operations):** May reuse date utilities and error patterns
- **Task 7 (Doctor Command):** May reuse relationship infrastructure for reference validation
