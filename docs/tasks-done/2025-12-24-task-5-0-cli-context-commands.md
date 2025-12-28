# Task 5: CLI Context

**Work Directory:** `tdn-cli/`

**Depends on:** Task 4 (Relationship Infrastructure)

## Overview

Implement the `context` command for hierarchical entity views.

---

## Prerequisites from Task 4

The following Rust functions are available via `@bindings`:

| Function                | Purpose                                             | Returns                |
| ----------------------- | --------------------------------------------------- | ---------------------- |
| `getAreaContext()`      | Area + its projects + all tasks (direct + indirect) | `AreaContextResult`    |
| `getProjectContext()`   | Project + parent area + its tasks                   | `ProjectContextResult` |
| `getTasksInArea()`      | Tasks in an area (direct + via projects)            | `TasksInAreaResult`    |
| `getProjectsInArea()`   | Projects in an area (optimized: no task file reads) | `Project[]`            |
| `extractWikilinkName()` | Extract target name from wikilink syntax            | `string \| null`       |

**Added in Phase 3:**

| Function           | Purpose                             | Returns             |
| ------------------ | ----------------------------------- | ------------------- |
| `getTaskContext()` | Task + parent project + parent area | `TaskContextResult` |

**Result types (from Rust):**

```typescript
interface AreaContextResult {
  area: Area | null // null if area not found
  projects: Project[] // Projects in this area
  tasks: Task[] // All tasks (direct + via projects)
  warnings: string[] // Broken reference warnings
}

interface ProjectContextResult {
  project: Project | null // null if project not found
  area: Area | null // Parent area if any
  tasks: Task[] // Tasks in this project
  warnings: string[]
}

interface TasksInAreaResult {
  tasks: Task[]
  warnings: string[]
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
  const config = getVaultConfig()
  const result = getAreaContext(config, target)

  if (!result.area) {
    // Handle area not found (NOT_FOUND error)
  }

  // Group tasks by project for display
  const projectTasks = groupTasksByProject(result.tasks, result.projects)
  const directTasks = result.tasks.filter((t) => !t.project)

  const output: AreaContextResultOutput = {
    type: 'area-context',
    area: result.area,
    projects: result.projects,
    projectTasks,
    directTasks,
    warnings: result.warnings,
  }

  console.log(formatOutput(output, globalOpts))
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

| Entity            | Fields Shown                                |
| ----------------- | ------------------------------------------- |
| Area (primary)    | Full frontmatter + body                     |
| Project (related) | title (heading), path, status, task count   |
| Task (related)    | title (heading), path, status, due (if set) |

### 1.3 Tests

**E2E tests (`tests/e2e/context-area.test.ts`):**

```typescript
describe('context area', () => {
  test('returns area with projects and tasks', async () => {
    // Uses fixture with relationships
  })

  test('includes projects in area', async () => {})

  test('includes tasks via projects', async () => {})

  test('includes tasks directly in area', async () => {})

  test('deduplicates tasks in both project and direct area', async () => {
    // Edge case: task has area AND its project is in same area
  })

  test('handles area not found', async () => {
    // Should return NOT_FOUND error
  })

  test('works in all output modes', async () => {})
})
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
  const config = getVaultConfig()
  const result = getProjectContext(config, target)

  if (!result.project) {
    // Handle project not found
  }

  const output: ProjectContextResultOutput = {
    type: 'project-context',
    project: result.project,
    area: result.area,
    tasks: result.tasks,
    warnings: result.warnings,
  }

  console.log(formatOutput(output, globalOpts))
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
  test('returns project with tasks and parent area', async () => {})
  test('includes parent area details', async () => {})
  test('includes all tasks in project', async () => {})
  test('handles project with no area', async () => {})
  test('handles project not found', async () => {})
  test('works in all output modes', async () => {})
})
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

## Phase 3: Context Task Command ✅ COMPLETE

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
  const config = getVaultConfig()
  const result = getTaskContext(config, target)

  if (!result.task) {
    // Handle task not found (NOT_FOUND error)
  }

  const output: TaskContextResultOutput = {
    type: 'task-context',
    task: result.task,
    project: result.project,
    area: result.area,
    warnings: result.warnings,
  }

  console.log(formatOutput(output, globalOpts))
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
  test('returns task with parent project and area', async () => {})
  test('includes parent project details', async () => {})
  test('includes parent area (via project)', async () => {})
  test('includes direct area when no project', async () => {})
  test('handles task with no parents', async () => {})
  test('handles task not found', async () => {})
  test('accepts path input', async () => {})
  test('works in all output modes', async () => {})
})
```

### 3.3 Tests ✅

E2E tests added in `tests/e2e/context-task.test.ts` (20 tests).
Rust unit tests added in `crates/core/src/vault_index.rs` (7 tests for `get_task_context`).

### Phase 3 Verification

- [x] `context task ~/tasks/foo.md` returns task details
- [x] Includes parent project (if any)
- [x] Includes parent area (via project or direct)
- [x] Body included for primary entity (task)
- [x] NOT_FOUND error for missing task
- [x] Works in all output modes
- [x] E2E tests pass

---

## Final Checklist

### Context Commands

- [x] `context area` shows area + projects + tasks
- [x] `context project` shows project + tasks + parent area
- [x] `context task` shows task + parent project + area
- [x] `context` (human, no args) shows helpful error
