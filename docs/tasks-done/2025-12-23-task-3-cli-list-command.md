# Task 3: CLI List Command

**Work Directory:** `tdn-cli/`

**Depends on:** Task 2 (project/area parsing)

## Overview

Implement the `list` command with all filtering, sorting, and output options. This is the largest single command implementation.

The command stub already exists with some flags defined. This task implements the actual functionality and adds remaining flags incrementally as each phase requires them.

## TDD Workflow

Phases 2-9 follow the standard TDD workflow:

1. **Write failing E2E test** - Describe expected behavior
2. **Add fixture files as needed** - Ensure they conform to S1 spec
3. **Review test against specs** - Check S1, S2, `cli-requirements.md`
4. **User confirms test** - Commit before implementing
5. **Implement until green** - Iteratively build the solution
6. **Refactor** - Clean up Rust and TypeScript code
7. **Add Rust unit tests** - Where valuable for parsing logic
8. **Add TS unit tests** - For formatters and utilities as needed
9. **Run checks** - `bun run fix` then `bun run check`
10. **Update docs** - `tdn-cli/docs/cli-progress.md` and this task document
11. **Summary** - Provide summary and manual test commands, suggest commit message

**Exceptions:**
- **Phase 1** is infrastructure (Rust scanning functions). Uses Rust unit tests, not E2E TDD.
- **Phase 10** is utility infrastructure for future commands. Uses unit tests primarily.

## Testing Notes

### Date Mocking Strategy

Tests involving "today", "this week", "overdue", etc. must mock the current date to avoid flaky tests. Strategy:

1. **Fixture files use fixed dates** (e.g., `due: 2025-06-15`)
2. **Tests mock "today"** to a known date relative to fixtures
3. **Implementation accepts an optional `referenceDate` parameter** for testing (defaults to actual current date in production)

Example test setup:
```typescript
// Mock today as 2025-06-15 for predictable date comparisons
const mockToday = '2025-06-15';
const { stdout } = await runCli(['list', '--due', 'today'], { mockDate: mockToday });
```

The exact mocking mechanism will be determined during implementation (environment variable, CLI flag for testing, or dependency injection).

### Output Mode Coverage

Each filtering phase (2-9) should include tests for all three output modes:
- Human mode (default) - verify key content appears
- AI mode (`--ai`) - verify structured markdown format
- JSON mode (`--json`) - verify JSON structure and field names

### Empty Results

All filtering phases should include a test case where filters match nothing:
- Exit code should be 0 (empty result is valid, not an error)
- Output should explicitly indicate no matches (not silent)

---

## Phases

### Phase 1: Vault Scanning in Rust

> **Note:** This phase is infrastructure. It does not follow the E2E TDD workflow. Use Rust unit tests to verify scanning behavior.

Add functions to scan directories and return all entities.

**Create `vault.rs`:**
```rust
/// Configuration for vault directories
#[napi(object)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
}

/// Scan tasks directory and return all parseable tasks
#[napi]
pub fn scan_tasks(config: &VaultConfig) -> Vec<Task> { ... }

/// Scan projects directory
#[napi]
pub fn scan_projects(config: &VaultConfig) -> Vec<Project> { ... }

/// Scan areas directory
#[napi]
pub fn scan_areas(config: &VaultConfig) -> Vec<Area> { ... }
```

**Behavior:**
- Read all `.md` files in the directory (not subdirectories by default)
- Skip files that fail to parse (log warning, continue)
- Return successfully parsed entities

**Rust unit tests:**
```rust
#[cfg(test)]
mod tests {
    #[test]
    fn scan_tasks_returns_parseable_files() { ... }

    #[test]
    fn scan_tasks_skips_unparseable_files() { ... }

    #[test]
    fn scan_tasks_excludes_subdirectories() { ... }
}
```

**Integration test (TypeScript):**
```typescript
describe('vault scanning bindings', () => {
  test('scanTasks returns tasks from fixture directory', () => {
    const config = { tasksDir: fixturePath('vault/tasks'), ... };
    const tasks = scanTasks(config);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some(t => t.title === 'Minimal Task')).toBe(true);
  });
});
```

---

### Phase 2: Basic List (Active Tasks)

Implement default `list` behavior - show active tasks only.

**Active task definition (from CLI spec):**
- Status NOT IN (`done`, `dropped`, `icebox`)
- `defer-until` is unset or <= today
- Not in `archive/` subdirectory

**E2E tests to write first:**
```typescript
describe('taskdn list', () => {
  test('returns exit code 0', async () => {
    const { exitCode } = await runCli(['list']);
    expect(exitCode).toBe(0);
  });

  test('lists active tasks (human mode)', async () => {
    const { stdout } = await runCli(['list']);
    expect(stdout).toContain('Minimal Task');
    // Should NOT contain done/dropped/icebox tasks
  });

  test('excludes done tasks by default', async () => {
    const { stdout } = await runCli(['list', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t => t.status !== 'done')).toBe(true);
  });

  test('outputs structured markdown in AI mode', async () => {
    const { stdout } = await runCli(['list', '--ai']);
    expect(stdout).toContain('## Tasks');
    expect(stdout).toContain('- **path:**');
    expect(stdout).toContain('- **status:**');
  });

  test('outputs JSON with summary field', async () => {
    const { stdout } = await runCli(['list', '--json']);
    const output = JSON.parse(stdout);
    expect(output.summary).toBeDefined();
    expect(Array.isArray(output.tasks)).toBe(true);
  });

  test('returns empty result when no active tasks', async () => {
    // Use a fixture vault with only done/dropped tasks
    const { stdout, exitCode } = await runCli(['list', '--json'], { vault: 'empty-active' });
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
    expect(output.summary).toContain('No tasks');
  });
});
```

**Human mode output:**
```
Tasks (3)

  In Progress
  Full Metadata Task                 due: 2025-01-20
    ~/tasks/full-metadata.md

  Ready
  Minimal Task
    ~/tasks/minimal.md

  Task With Body
    ~/tasks/with-body.md
```

**AI mode output:**
```markdown
## Tasks (3)

### Full Metadata Task

- **path:** ~/tasks/full-metadata.md
- **status:** in-progress
- **due:** 2025-01-20
- **project:** Test Project

### Minimal Task

- **path:** ~/tasks/minimal.md
- **status:** ready
```

---

### Phase 3: List Projects and Areas

Extend list to support `list projects` and `list areas`.

```bash
taskdn list projects           # All active projects
taskdn list areas              # All active areas
```

**Active project definition (from CLI spec):**
- Status is unset OR status NOT IN (`done`)

**Active area definition (from CLI spec):**
- Status is unset OR status = `active`

**E2E tests:**
```typescript
describe('taskdn list projects', () => {
  test('lists active projects', async () => {
    const { stdout, exitCode } = await runCli(['list', 'projects']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Minimal Project');
  });

  test('includes projects without status (treated as active)', async () => {
    const { stdout } = await runCli(['list', 'projects', '--json']);
    const output = JSON.parse(stdout);
    // Project Without Status should be included
    expect(output.projects.some(p => p.title === 'Project Without Status')).toBe(true);
  });

  test('excludes done projects', async () => {
    const { stdout } = await runCli(['list', 'projects', '--json']);
    const output = JSON.parse(stdout);
    expect(output.projects.every(p => p.status !== 'done')).toBe(true);
  });
});

describe('taskdn list areas', () => {
  test('lists active areas', async () => {
    const { stdout, exitCode } = await runCli(['list', 'areas']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Minimal Area');
  });

  test('includes areas without status (treated as active)', async () => {
    const { stdout } = await runCli(['list', 'areas', '--json']);
    const output = JSON.parse(stdout);
    expect(output.areas.some(a => a.status === undefined)).toBe(true);
  });

  test('excludes archived areas', async () => {
    const { stdout } = await runCli(['list', 'areas', '--json']);
    const output = JSON.parse(stdout);
    expect(output.areas.every(a => a.status !== 'archived')).toBe(true);
  });
});
```

---

### Phase 4: Status Filtering

Implement `--status` flag.

```bash
taskdn list --status ready
taskdn list --status ready,in-progress    # OR logic
```

**E2E tests:**
```typescript
describe('--status filter', () => {
  test('filters by single status', async () => {
    const { stdout } = await runCli(['list', '--status', 'ready', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    expect(output.tasks.every(t => t.status === 'ready')).toBe(true);
  });

  test('filters by multiple statuses (OR logic)', async () => {
    const { stdout } = await runCli(['list', '--status', 'ready,in-progress', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t =>
      t.status === 'ready' || t.status === 'in-progress'
    )).toBe(true);
  });

  test('returns empty when status matches nothing', async () => {
    // Filter for a status that exists but no active tasks have
    const { stdout, exitCode } = await runCli(['list', '--status', 'blocked', '--json']);
    // This may return empty or not depending on fixtures
    expect(exitCode).toBe(0);
  });

  test('works in AI mode', async () => {
    const { stdout } = await runCli(['list', '--status', 'ready', '--ai']);
    expect(stdout).toContain('## Tasks');
  });
});
```

---

### Phase 5: Project/Area Filtering

Implement `--project` and `--area` flags.

```bash
taskdn list --project "Q1 Planning"
taskdn list --area "Work"
taskdn list --project "Q1" --area "Work"    # Combined = AND
```

**Matching:** Fuzzy substring match on project/area name (case-insensitive).

**E2E tests:**
```typescript
describe('--project filter', () => {
  test('filters by project name (substring match)', async () => {
    const { stdout } = await runCli(['list', '--project', 'Test', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t =>
      t.project && t.project.toLowerCase().includes('test')
    )).toBe(true);
  });

  test('is case-insensitive', async () => {
    const { stdout: upper } = await runCli(['list', '--project', 'TEST', '--json']);
    const { stdout: lower } = await runCli(['list', '--project', 'test', '--json']);
    expect(JSON.parse(upper).tasks.length).toBe(JSON.parse(lower).tasks.length);
  });
});

describe('--area filter', () => {
  test('filters by area name (substring match)', async () => {
    const { stdout } = await runCli(['list', '--area', 'Work', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t =>
      t.area && t.area.toLowerCase().includes('work')
    )).toBe(true);
  });
});

describe('combined filters', () => {
  test('--project AND --area uses AND logic', async () => {
    const { stdout } = await runCli(['list', '--project', 'Test', '--area', 'Work', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t =>
      t.project?.toLowerCase().includes('test') &&
      t.area?.toLowerCase().includes('work')
    )).toBe(true);
  });
});
```

---

### Phase 6: Date Filters

Implement date-based filtering.

```bash
taskdn list --due today
taskdn list --due tomorrow
taskdn list --due this-week
taskdn list --overdue
taskdn list --scheduled today
```

**Implementation notes:**
- Date comparison logic can be in TypeScript (simpler) or Rust (faster)
- "today" = current date in local timezone (mocked in tests)
- "this-week" = today through end of week (Sunday)
- "overdue" = due date < today AND status not done/dropped

**Fixture requirements:**
Add to `tests/fixtures/vault/tasks/`:
- `due-fixed-date.md` - due: 2025-06-15 (use with mocked "today")
- `due-past.md` - due: 2020-01-01 (always overdue)
- `scheduled-fixed-date.md` - scheduled: 2025-06-15

**E2E tests:**
```typescript
describe('--due filter', () => {
  // Mock today as 2025-06-15 for these tests

  test('--due today returns tasks due on mocked date', async () => {
    const { stdout } = await runCli(['list', '--due', 'today', '--json'], { mockDate: '2025-06-15' });
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t => t.due === '2025-06-15')).toBe(true);
  });

  test('--overdue returns tasks with due date before today', async () => {
    const { stdout } = await runCli(['list', '--overdue', '--json'], { mockDate: '2025-06-15' });
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeGreaterThan(0);
    expect(output.tasks.every(t => t.due < '2025-06-15')).toBe(true);
  });
});

describe('--scheduled filter', () => {
  test('--scheduled today returns tasks scheduled for mocked date', async () => {
    const { stdout } = await runCli(['list', '--scheduled', 'today', '--json'], { mockDate: '2025-06-15' });
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t => t.scheduled === '2025-06-15')).toBe(true);
  });
});
```

---

### Phase 7: Sorting and Limits

Implement `--sort`, `--desc`, and `--limit`.

```bash
taskdn list --sort due
taskdn list --sort created
taskdn list --sort title --desc
taskdn list --limit 10
taskdn list --sort due --limit 5    # Top 5 by due date
```

**Sort fields mapping:**
| CLI Flag Value | Actual Field Name |
|----------------|-------------------|
| `due` | `due` |
| `created` | `created-at` |
| `updated` | `updated-at` |
| `title` | `title` |

**Null handling:** Items without the sort field appear last, regardless of sort direction.

**Default sort:** `created` descending (newest first).

**E2E tests:**
```typescript
describe('--sort flag', () => {
  test('sorts by due date ascending by default', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--json']);
    const output = JSON.parse(stdout);
    const withDue = output.tasks.filter(t => t.due);
    for (let i = 1; i < withDue.length; i++) {
      expect(withDue[i].due >= withDue[i-1].due).toBe(true);
    }
  });

  test('--desc reverses sort order', async () => {
    const { stdout } = await runCli(['list', '--sort', 'title', '--desc', '--json']);
    const output = JSON.parse(stdout);
    for (let i = 1; i < output.tasks.length; i++) {
      expect(output.tasks[i].title <= output.tasks[i-1].title).toBe(true);
    }
  });

  test('items without sort field appear last', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--json']);
    const output = JSON.parse(stdout);
    const lastWithDue = output.tasks.findLastIndex(t => t.due);
    const firstWithoutDue = output.tasks.findIndex(t => !t.due);
    if (lastWithDue !== -1 && firstWithoutDue !== -1) {
      expect(lastWithDue).toBeLessThan(firstWithoutDue);
    }
  });
});

describe('--limit flag', () => {
  test('limits number of results', async () => {
    const { stdout } = await runCli(['list', '--limit', '2', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.length).toBeLessThanOrEqual(2);
  });

  test('limit is applied after sorting', async () => {
    const { stdout } = await runCli(['list', '--sort', 'due', '--limit', '3', '--json']);
    const output = JSON.parse(stdout);
    // Should get the 3 earliest due dates
    expect(output.tasks.length).toBeLessThanOrEqual(3);
  });
});
```

---

### Phase 8: Inclusion Flags

Implement flags to include non-active items.

```bash
taskdn list --include-done
taskdn list --include-dropped
taskdn list --include-closed        # Both done + dropped
taskdn list --include-icebox
taskdn list --include-deferred
taskdn list --include-archived
taskdn list --only-archived         # Archived only
```

**Completed task queries:**
```bash
taskdn list --include-done --completed-after 2025-01-01
taskdn list --include-done --completed-before 2025-01-15
taskdn list --include-done --completed-today
taskdn list --include-done --completed-this-week
```

**Fixture requirements:**
Add to `tests/fixtures/vault/tasks/`:
- `deferred-future.md` - defer-until: 2099-01-01 (always future)
- `completed-recent.md` - status: done, completed-at: 2025-06-14

Add `tests/fixtures/vault/tasks/archive/`:
- `archived-task.md` - For `--include-archived` and `--only-archived` tests

**E2E tests:**
```typescript
describe('--include-done flag', () => {
  test('includes done tasks when flag is set', async () => {
    const { stdout } = await runCli(['list', '--include-done', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.some(t => t.status === 'done')).toBe(true);
  });
});

describe('--include-archived flag', () => {
  test('includes archived tasks when flag is set', async () => {
    const { stdout } = await runCli(['list', '--include-archived', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.some(t => t.path.includes('archive/'))).toBe(true);
  });
});

describe('--only-archived flag', () => {
  test('returns only archived tasks', async () => {
    const { stdout } = await runCli(['list', '--only-archived', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t => t.path.includes('archive/'))).toBe(true);
  });
});

describe('completed date filters', () => {
  test('--completed-after filters by completion date', async () => {
    const { stdout } = await runCli([
      'list', '--include-done', '--completed-after', '2025-06-01', '--json'
    ], { mockDate: '2025-06-15' });
    const output = JSON.parse(stdout);
    expect(output.tasks.every(t => t.completedAt >= '2025-06-01')).toBe(true);
  });
});
```

---

### Phase 9: Text Search

Implement `--query` for full-text search.

```bash
taskdn list --query "login"
taskdn list --query "bug fix"
```

**Search scope:** Title and body content.

**Matching:** Case-insensitive substring.

**E2E tests:**
```typescript
describe('--query flag', () => {
  test('searches in task title', async () => {
    const { stdout } = await runCli(['list', '--query', 'Minimal', '--json']);
    const output = JSON.parse(stdout);
    expect(output.tasks.some(t => t.title.includes('Minimal'))).toBe(true);
  });

  test('searches in task body', async () => {
    const { stdout } = await runCli(['list', '--query', 'subtask', '--json']);
    const output = JSON.parse(stdout);
    // "With Body" task contains "subtask" in body
    expect(output.tasks.some(t => t.title === 'Task With Body')).toBe(true);
  });

  test('is case-insensitive', async () => {
    const { stdout: upper } = await runCli(['list', '--query', 'MINIMAL', '--json']);
    const { stdout: lower } = await runCli(['list', '--query', 'minimal', '--json']);
    expect(JSON.parse(upper).tasks.length).toBe(JSON.parse(lower).tasks.length);
  });

  test('returns empty when no matches', async () => {
    const { stdout, exitCode } = await runCli(['list', '--query', 'xyznonexistent', '--json']);
    expect(exitCode).toBe(0);
    const output = JSON.parse(stdout);
    expect(output.tasks).toEqual([]);
  });
});
```

---

### Phase 10: Fuzzy Entity Lookup Utility

> **Note:** This phase provides shared infrastructure for future commands (`show` fuzzy matching, `complete`, `drop`, `status`, `update`, `archive`). Interactive prompts for disambiguation are handled in Task 8.

Create shared utility functions for finding entities by name (case-insensitive substring matching).

**Add to `vault.rs`:**
```rust
/// Find tasks matching a query (case-insensitive substring on title)
#[napi]
pub fn find_tasks_by_title(config: &VaultConfig, query: &str) -> Vec<Task>

/// Find projects matching a query
#[napi]
pub fn find_projects_by_title(config: &VaultConfig, query: &str) -> Vec<Project>

/// Find areas matching a query
#[napi]
pub fn find_areas_by_title(config: &VaultConfig, query: &str) -> Vec<Area>
```

**Behavior:**
- Scan the relevant directory (reuse `scan_*` functions)
- Filter by case-insensitive substring match on title
- Return all matches (disambiguation handled at command layer)

**TypeScript wrapper for commands:**
```typescript
// src/lib/entity-lookup.ts
export interface LookupResult<T> {
  type: 'exact' | 'single' | 'multiple' | 'none';
  matches: T[];
}

export async function lookupTask(query: string): Promise<LookupResult<Task>> {
  // 1. Check if query is a path - return exact match
  // 2. Otherwise, call findTasksByTitle
  // 3. Categorize result: none, single, multiple
}
```

**Unit tests (TypeScript):**
```typescript
describe('fuzzy entity lookup', () => {
  test('finds task by exact title');
  test('finds task by partial title (case-insensitive)');
  test('returns multiple matches when ambiguous');
  test('returns empty when no matches');
  test('prefers path if query looks like a path');
});
```

---

## Fixture Summary

### Existing fixtures (`tests/fixtures/vault/`)

Already available:
- `tasks/minimal.md` - Minimal task (ready)
- `tasks/full-metadata.md` - Task with all fields (in-progress)
- `tasks/with-body.md` - Task with body content
- `tasks/status-*.md` - One for each status
- `tasks/malformed.md` - For error testing
- `projects/minimal.md`, `full-metadata.md`, `with-body.md`, `no-status.md`
- `areas/minimal.md`, `full-metadata.md`, `with-body.md`, `status-archived.md`

### New fixtures needed

**Phase 6 (Date Filters):**
- `tasks/due-fixed-date.md` - due: 2025-06-15
- `tasks/due-past.md` - due: 2020-01-01
- `tasks/scheduled-fixed-date.md` - scheduled: 2025-06-15

**Phase 8 (Inclusion Flags):**
- `tasks/deferred-future.md` - defer-until: 2099-01-01
- `tasks/completed-recent.md` - status: done, completed-at: 2025-06-14
- `tasks/archive/archived-task.md` - Archived task for testing

---

## Output Format Summary

**Human mode list fields:**
- Title (bold)
- Status (grouped)
- Due date (if set)
- Path (dim)

**AI mode list fields (from spec):**
| Always | If set |
|--------|--------|
| path, title, status | due, project (or area if no project) |

**JSON mode:**
```json
{
  "summary": "Found 5 tasks",
  "tasks": [...]
}
```

**Empty results:**
```json
{
  "summary": "No tasks match the specified criteria",
  "tasks": []
}
```

---

## Verification

- [x] `list` returns active tasks by default
- [x] `list projects` and `list areas` work
- [x] `--status` filtering works (single and multiple)
- [x] `--project` and `--area` filtering works
- [x] `--due`, `--overdue`, `--scheduled` work
- [x] `--sort` and `--limit` work
- [x] All inclusion flags work
- [x] `--query` text search works
- [x] Fuzzy entity lookup functions exported from Rust
- [x] TypeScript lookup wrapper categorizes results correctly
- [x] All output modes produce correct format (human, AI, JSON)
- [x] Empty results handled gracefully (exit 0, explicit message)
- [x] `tdn-cli/docs/cli-progress.md` updated

---

## Notes

- This is a large task - consider implementing in multiple sessions
- Date handling uses TypeScript (simpler) with mocked dates in tests
- Filter combination: same filter = OR, different filters = AND
- Short flags (`-s`, `-p`, `-a`, `-d`, `-q`, `-l`) are implemented in Task 8
- Consider performance: for large vaults, move filtering to Rust if needed

## Progress

### Phase 1: Vault Scanning in Rust - COMPLETE

- Created `crates/core/src/vault.rs` with `VaultConfig` and `scanTasks`, `scanProjects`, `scanAreas`
- Scans `.md` files in top-level directory only (excludes subdirectories like `archive/`)
- Skips malformed files, returns empty for nonexistent directories
- 7 Rust unit tests + 8 TypeScript integration tests
- Created `src/config/index.ts` for vault configuration (env vars, config files)

### Phase 2: Basic List (Active Tasks) - COMPLETE

- Implemented `list` command with active task filtering
- Active = not done/dropped/icebox, not deferred (defer-until > today), not in archive/
- Implemented `--status` filter with comma-separated OR logic
- Implemented all three output formatters for task-list:
  - Human mode: Grouped by status, colored output
  - AI mode: `## Tasks (N)` header with `### TaskTitle` headings
  - JSON mode: `{ summary, tasks: [...] }` structure
- 19 E2E tests covering all output modes and edge cases

### Phase 3: List Projects and Areas - COMPLETE

- Extended `list` command to support `list projects` and `list areas`
- Added `ProjectListResult` and `AreaListResult` types
- Active project = status unset OR status NOT IN (done)
- Active area = status unset OR status = 'active'
- Added formatters for all three output modes:
  - Human mode: Grouped by status, shows area/type
  - AI mode: `## Projects (N)` / `## Areas (N)` with `###` item headings
  - JSON mode: `{ summary, projects: [...] }` / `{ summary, areas: [...] }`
- Added `status-done.md` project fixture for exclusion testing
- 26 new E2E tests (13 for projects, 13 for areas)

### Phase 4: Status Filtering - COMPLETE

- `--status` filter was implemented in Phase 2
- Added comprehensive tests for single status, multiple statuses (OR logic), empty results
- 5 new E2E tests verifying status filter behavior

### Phase 5: Project/Area Filtering - COMPLETE

- Implemented `--project` and `--area` flags with case-insensitive substring matching
- Combined filters use AND logic (e.g., `--project "Test" --area "Work"`)
- 8 new E2E tests covering:
  - Project filtering (substring match, case-insensitive, empty results)
  - Area filtering (substring match, case-insensitive, empty results)
  - Combined filters (project+area, status+project)

### Phase 6: Date Filters - COMPLETE

- Implemented date mocking via `TASKDN_MOCK_DATE` environment variable for testing
- Added date utility functions: `getTomorrow()`, `getEndOfWeek()`, `formatDate()`
- Implemented `--due` filter with values: `today`, `tomorrow`, `this-week`
- Implemented `--overdue` filter for tasks with due date before today
- Implemented `--scheduled` filter with value: `today`
- Created 5 new fixture files for date testing:
  - `due-fixed-date.md` (due: 2025-06-15)
  - `due-tomorrow.md` (due: 2025-06-16)
  - `due-this-week.md` (due: 2025-06-18)
  - `due-past.md` (due: 2020-01-01, always overdue)
  - `scheduled-fixed-date.md` (scheduled: 2025-06-15)
- 17 new E2E tests covering:
  - `--due today/tomorrow/this-week` in all output modes
  - `--overdue` with empty results and active task filtering
  - `--scheduled today` in all output modes
  - Combined filters (date + status, date + project)

### Phase 7: Sorting and Limits - COMPLETE

- Implemented `--sort` with fields: `due`, `created`, `updated`, `title`
- Field mapping: `created` → `createdAt`, `updated` → `updatedAt`
- Implemented `--desc` flag for descending order
- Implemented `--limit <n>` to limit results (applied after sorting)
- Null handling: items without the sort field appear last regardless of direction
- Case-insensitive comparison for title sorting
- 15 new E2E tests covering:
  - Sorting by due, created, title in ascending order
  - `--desc` reversing sort order
  - Items without sort field appearing last
  - Limit applied after sorting
  - Combined with other filters

### Phase 8: Inclusion Flags - COMPLETE

- Implemented all inclusion flags:
  - `--include-done` - Include tasks with status=done
  - `--include-dropped` - Include tasks with status=dropped
  - `--include-closed` - Include both done and dropped
  - `--include-icebox` - Include tasks with status=icebox
  - `--include-deferred` - Include tasks with defer-until > today
  - `--include-archived` - Include tasks from archive/ subdirectory
  - `--only-archived` - Show only archived tasks
- Implemented completed date filters:
  - `--completed-after <date>` - Filter by completedAt >= date
  - `--completed-before <date>` - Filter by completedAt < date
  - `--completed-today` - Filter for completedAt = today
  - `--completed-this-week` - Filter for completedAt within current week
- Added `getStartOfWeek()` utility function for week range calculation
- Created 3 new fixture files:
  - `deferred-future.md` (defer-until: 2099-01-01)
  - `completed-recent.md` (status: done, completed-at: 2025-06-14)
  - `archive/archived-task.md` (for archive testing)
- Archived tasks are included regardless of their status (they're explicitly requested)
- 14 new E2E tests covering all inclusion flags and completed date filters

### Phase 9: Text Search - COMPLETE

- Implemented `--query` filter for full-text search in title and body
- Case-insensitive substring matching
- Works with all output modes (human, AI, JSON)
- Combines with other filters using AND logic
- 8 new E2E tests covering:
  - Search in title
  - Search in body (including markdown content)
  - Case-insensitive matching
  - Empty results when no matches
  - All output modes
  - Combined with status filter (AND logic)

### Phase 10: Fuzzy Entity Lookup Utility - COMPLETE

- Added Rust functions for fuzzy entity lookup:
  - `findTasksByTitle(config, query)` - Find tasks by title substring
  - `findProjectsByTitle(config, query)` - Find projects by title substring
  - `findAreasByTitle(config, query)` - Find areas by title substring
- All functions use case-insensitive substring matching
- 6 new Rust unit tests covering exact match, partial match, case-insensitivity, and no matches
- Created TypeScript wrapper `src/lib/entity-lookup.ts` with:
  - `LookupResult<T>` interface with types: 'exact', 'single', 'multiple', 'none'
  - `lookupTask(query, config?)` - Task lookup with path detection
  - `lookupProject(query, config?)` - Project lookup with path detection
  - `lookupArea(query, config?)` - Area lookup with path detection
- Path detection supports: absolute, relative, tilde, and .md suffix
- 22 new TypeScript unit tests covering all lookup scenarios
