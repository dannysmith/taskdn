# Task 3: CLI List Command

**Work Directory:** `tdn-cli/`

**Depends on:** Task 2 (project/area parsing)

## Overview

Implement the `list` command with all filtering, sorting, and output options. This is the largest single command implementation.

The command stub already exists with flags defined. This task implements the actual functionality.

## Phases

### Phase 1: Vault Scanning in Rust

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

**E2E Test:**
```typescript
describe('taskdn list', () => {
  test('lists tasks from fixture vault', async () => {
    const { stdout, exitCode } = await runCli(['list']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Minimal Task');
  });
});
```

### Phase 2: Basic List (Active Tasks)

Implement default `list` behavior - show active tasks only.

**Active task definition (from CLI spec):**
- Status NOT IN (`done`, `dropped`, `icebox`)
- `defer-until` is unset or <= today
- Not in `archive/` subdirectory

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

### Phase 3: List Projects and Areas

Extend list to support `list projects` and `list areas`.

```bash
taskdn list projects           # All active projects
taskdn list areas              # All active areas
```

**Active project:** Status not in (`done`)
**Active area:** Status is unset or `active`

### Phase 4: Status Filtering

Implement `--status` flag.

```bash
taskdn list --status ready
taskdn list --status ready,in-progress    # OR logic
taskdn list -s blocked                    # Short flag
```

**Test cases:**
```typescript
test('filters by single status', async () => {
  const { stdout } = await runCli(['list', '--status', 'ready', '--json']);
  const output = JSON.parse(stdout);
  expect(output.tasks.every(t => t.status === 'ready')).toBe(true);
});

test('filters by multiple statuses (OR)', async () => {
  const { stdout } = await runCli(['list', '--status', 'ready,in-progress', '--json']);
  const output = JSON.parse(stdout);
  expect(output.tasks.every(t =>
    t.status === 'ready' || t.status === 'in-progress'
  )).toBe(true);
});
```

### Phase 5: Project/Area Filtering

Implement `--project` and `--area` flags.

```bash
taskdn list --project "Q1 Planning"
taskdn list --area "Work"
taskdn list -p "Q1" -a "Work"      # Combined = AND
```

**Matching:** Fuzzy substring match on project/area name (case-insensitive).

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
- Need date comparison logic in Rust or TypeScript
- "today" = current date in local timezone
- "this-week" = today through end of week (Sunday)
- "overdue" = due date < today AND status not done/dropped

**Test fixtures needed:**
- Task with `due: 2025-01-15` (for testing relative dates)
- Task with `scheduled: 2025-01-15`

### Phase 7: Sorting and Limits

Implement `--sort`, `--desc`, and `--limit`.

```bash
taskdn list --sort due
taskdn list --sort created
taskdn list --sort title --desc
taskdn list --limit 10
taskdn list --sort due --limit 5    # Top 5 by due date
```

**Sort fields:** `due`, `created`, `updated`, `title`

**Null handling:** Items without the sort field appear last.

**Default sort:** `created` (newest first).

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

### Phase 9: Text Search

Implement `--query` for full-text search.

```bash
taskdn list --query "login"
taskdn list -q "bug fix"
```

**Search scope:** Title and body content.

**Matching:** Case-insensitive substring.

### Phase 10: Fuzzy Entity Lookup Utility

> **Consolidated from Task 2 Phase 6**
>
> This phase provides the shared fuzzy lookup infrastructure used by `show`, `complete`, `drop`, `status`, `update`, and `archive` commands. Interactive prompts for disambiguation are handled in Task 8 Phase 4.

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

**Test cases:**
```typescript
describe('fuzzy entity lookup', () => {
  test('finds task by exact title');
  test('finds task by partial title (case-insensitive)');
  test('returns multiple matches when ambiguous');
  test('returns empty when no matches');
  test('prefers path if query looks like a path');
});
```

## Fixture Requirements

Need additional fixtures for comprehensive testing:

```
tests/fixtures/vault/tasks/
├── (existing files)
├── due-today.md           # due: <today's date>
├── due-past.md            # due: 2020-01-01 (overdue)
├── scheduled-today.md     # scheduled: <today's date>
├── deferred-future.md     # defer-until: <future date>
├── completed-recent.md    # status: done, completed-at: recent
└── archived/
    └── old-task.md        # For --include-archived tests
```

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

## Verification

- [ ] `list` returns active tasks by default
- [ ] `list projects` and `list areas` work
- [ ] `--status` filtering works (single and multiple)
- [ ] `--project` and `--area` filtering works
- [ ] `--due`, `--overdue`, `--scheduled` work
- [ ] `--sort` and `--limit` work
- [ ] All inclusion flags work
- [ ] `--query` text search works
- [ ] Fuzzy entity lookup functions exported from Rust
- [ ] TypeScript lookup wrapper categorizes results correctly
- [ ] All output modes produce correct format
- [ ] Empty results handled gracefully
- [ ] cli-progress.md updated

## Notes

- This is a large task - consider implementing in multiple sessions
- Date handling may need a shared utility (chrono in Rust or dayjs in TS)
- Filter combination: same filter = OR, different filters = AND
- Consider performance: for large vaults, filtering in Rust is better than TS
