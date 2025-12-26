# Task 7-1: CLI Architecture Improvements

**Work Directory:** `tdn-cli/`
**Created:** 2025-12-26

## Overview

This task implements the improvements identified during the comprehensive architecture review (Task 7, Sessions 1-4). The goal is to strengthen the codebase foundation before proceeding to Task 8 (configuration and polish).

**Review Documents:**

- `task-7-session-1-review-report.md` - Type & API Contract Review
- `task-7-session-2-review-report.md` - Read/Write Implementation Review
- `task-7-session-3-review-report.md` - TypeScript Layer Review
- `task-7-session-4-review-report.md` - Test Coverage Review

## Implementation Order

Work through items in priority order. Each item is self-contained and can be completed independently, but the order below minimizes rework:

1. Structured Error Types (affects both Rust and TypeScript layers)
2. Add Warnings to get_projects_in_area (Rust API change)
3. Clarify Parameter Naming (trivial Rust change)
4. Add fsync() to Atomic Writes (trivial Rust change)
5. Add append-body E2E Tests (TypeScript tests)
6. Consolidate Date Formatting (TypeScript refactor)
7. Extract Filtering/Sorting Utilities (TypeScript refactor)
8. Extract Batch Operation Utility (TypeScript refactor)

---

## 1. Implement Structured Error Types

**Priority:** Critical (High)
**Effort:** 2-3 hours
**Session:** Session 1, Issue #1
**Impact:** Eliminates fragile string-based error matching throughout TypeScript layer

### Current Problem

TypeScript commands pattern-match on Rust error message strings:

```typescript
if (message.includes('File not found')) {
  cliError = createError.notFound(...);
}
```

This is brittle - changes to Rust error messages break TypeScript code.

### Solution

Implement structured error types in Rust that NAPI exposes to TypeScript.

### Implementation Steps

**Rust side:**

- [ ] Create `crates/core/src/error.rs` module
  - [ ] Define `TdnErrorKind` enum with variants (use `#[napi(string_enum)]` to expose as TypeScript string union):
    - `FileNotFound`
    - `FileReadError`
    - `ParseError`
    - `ValidationError`
    - `WriteError`
  - [ ] Define `TdnError` struct with (use `#[napi(object)]` to expose as TypeScript object):
    - `kind: TdnErrorKind`
    - `message: String`
    - `path: Option<String>`
    - `field: Option<String>`
- [ ] Update `lib.rs` to export error module
- [ ] Update all error sites to use structured errors:
  - [ ] `task.rs` - parse errors
  - [ ] `project.rs` - parse errors
  - [ ] `area.rs` - parse errors
  - [ ] `writer.rs` - file operation errors
  - [ ] `vault.rs` - scanning errors
  - [ ] `vault_index.rs` - context query errors
- [ ] Add Rust unit tests for error creation and serialization
- [ ] Regenerate NAPI bindings: `bun run build`

**TypeScript side:**

- [ ] Update all command error handlers to use `error.kind` instead of string matching
  - [ ] `show.ts:59-75` - replace `message.includes()` logic
  - [ ] `set.ts`, `update.ts`, `archive.ts`, `new.ts` - update batch error handling
  - [ ] `append-body.ts`, `open.ts` - update error handlers
- [ ] Remove string-based error detection utilities (if any)
- [ ] Verify TypeScript compilation succeeds
- [ ] Run tests: `bun run test`
- [ ] Verify E2E tests pass with structured errors

**Validation:**

- [ ] All Rust tests pass: `cargo test`
- [ ] All TypeScript tests pass: `bun run test`
- [ ] Error messages are still informative
- [ ] Error codes are correctly propagated to JSON/AI output modes

---

## 2. Add Warnings to get_projects_in_area

**Priority:** Important (Medium)
**Effort:** 30-45 minutes
**Session:** Session 1, Issue #2
**Impact:** API consistency - aligns with other query functions that return warnings

### Current Problem

`get_projects_in_area()` returns `Vec<Project>` while other query functions return result structs with warnings. If a project references an unknown area, no warning is surfaced.

### Solution

Change return type to include warnings.

### Implementation Steps

- [ ] In `crates/core/src/vault_index.rs`:
  - [ ] Create new `ProjectsInAreaResult` struct:
    ```rust
    #[napi(object)]
    pub struct ProjectsInAreaResult {
        pub projects: Vec<Project>,
        pub warnings: Vec<String>,
    }
    ```
  - [ ] Update `get_projects_in_area()` signature to return `ProjectsInAreaResult`
  - [ ] Add warning detection for projects with broken area references
  - [ ] Update function body to collect warnings
- [ ] Add Rust unit tests for warning scenarios
- [ ] Regenerate NAPI bindings: `bun run build`
- [ ] Update TypeScript layer:
  - [ ] Find all usages of `get_projects_in_area()` (likely in context commands)
  - [ ] Update to destructure `{ projects, warnings }` from result
  - [ ] Display warnings if present (follow pattern from other context commands)
- [ ] Update E2E tests if needed
- [ ] Run full test suite: `bun run test`

**Validation:**

- [ ] Rust tests pass
- [ ] TypeScript compiles without errors
- [ ] E2E tests pass
- [ ] Warnings are displayed in context output when area references are broken

---

## 3. Clarify Parameter Naming

**Priority:** Worth Doing (Low, but 5 minutes)
**Effort:** 5 minutes
**Session:** Session 1, Issue #4
**Impact:** Improved API clarity

### Current Problem

`get_task_context(identifier: String)` parameter name is vague - doesn't indicate it accepts both paths and titles.

### Solution

Rename to `path_or_title` for clarity.

### Implementation Steps

- [ ] In `crates/core/src/vault_index.rs`:
  - [ ] Change parameter name: `pub fn get_task_context(config: VaultConfig, path_or_title: String)`
  - [ ] Update doc comments to clarify dual behavior
  - [ ] Update any internal references to use new name
- [ ] Note: This is NOT a breaking change for TypeScript (parameter names don't propagate to NAPI bindings)
- [ ] Verify Rust tests still pass: `cargo test`

**Validation:**

- [ ] Rust compiles
- [ ] Tests pass
- [ ] Doc comments are clear

---

## 4. Add fsync() to Atomic Writes

**Priority:** Worth Doing (Very Low, but 15 minutes)
**Effort:** 15 minutes
**Session:** Session 2, Issue #3
**Impact:** Reduces tiny data loss window on power failure

### Current Problem

S3 spec says "sync to disk (if available)" but `atomic_write()` doesn't call `fsync()`. There's a small window where data could be lost on power failure.

### Solution

Add `File::sync_all()` call before rename operation.

### Implementation Steps

- [ ] In `crates/core/src/writer.rs`, in `atomic_write()` function:

  - [ ] After writing temp file, before rename:

    ```rust
    // Write to temp file
    fs::write(&temp_path, content)?;

    // Sync to disk (NEW)
    let file = fs::File::open(&temp_path)?;
    file.sync_all()?;

    // Rename temp file to target (atomic)
    fs::rename(&temp_path, path)?;
    ```

- [ ] Verify existing tests still pass
- [ ] Test on Linux/macOS (Windows behavior may differ, but API is cross-platform)

**Validation:**

- [ ] Rust tests pass
- [ ] Manual test: create file, verify it's written correctly
- [ ] No performance regression (fsync is fast for small files)

---

## 5. Add E2E Tests for append-body Command

**Priority:** Important (Medium)
**Effort:** 2-3 hours
**Session:** Session 4, Issue #1
**Impact:** Closes the only gap in E2E test coverage (10/11 → 11/11 commands)

### Current Problem

`append-body` command exists but has no E2E test coverage. It's the only command without E2E tests.

### Solution

Create comprehensive E2E test suite for append-body command.

### Implementation Steps

- [ ] Create `tests/e2e/append-body.test.ts`
- [ ] Test basic appending functionality:
  - [ ] Append to task with path argument
  - [ ] Append to project with path argument
  - [ ] Append to area with path argument
- [ ] Test fuzzy matching:
  - [ ] Append with unique fuzzy title match
  - [ ] Append with ambiguous match (expect AMBIGUOUS error)
  - [ ] Append with no match (expect NOT_FOUND error)
  - [ ] Case-insensitive matching
- [ ] Test file content preservation:
  - [ ] Frontmatter unchanged after append
  - [ ] Existing body content preserved
  - [ ] New content appended correctly
  - [ ] Newline handling correct
- [ ] Test all output modes:
  - [ ] Human mode shows confirmation
  - [ ] AI mode outputs structured markdown
  - [ ] JSON mode outputs valid JSON with expected structure
  - [ ] AI-JSON mode wraps markdown in JSON envelope
- [ ] Test dry-run mode (if implemented for this command):
  - [ ] Preview shows what would be appended
  - [ ] File is not actually modified
- [ ] Test edge cases:
  - [ ] Multiline input
  - [ ] Special characters in input (markdown syntax, code blocks, etc.)
  - [ ] Appending to file with no existing body
  - [ ] Appending to file with existing body content
- [ ] Run tests: `bun run test tests/e2e/append-body.test.ts`

**Validation:**

- [ ] All tests pass
- [ ] Command coverage is now 11/11 (100%)
- [ ] Test patterns match other E2E test files

---

## 6. Consolidate Date Formatting

**Priority:** Worth Doing (Low, but 30 minutes)
**Effort:** 30 minutes
**Session:** Session 3, Issue #3
**Impact:** Eliminates duplication, centralizes date formatting logic

### Current Problem

Date formatting functions are duplicated:

- `formatShortDate()` and `formatLongDate()` in `src/output/human.ts`
- Similar functions in `src/output/helpers/date-utils.ts`

### Solution

Move all date formatting to `helpers/date-utils.ts`.

### Implementation Steps

- [ ] In `src/output/helpers/date-utils.ts`:
  - [ ] Add `formatShortDate(dateStr: string): string` if not present
  - [ ] Add `formatLongDate(dateStr: string): string` if not present
  - [ ] Export both functions from module
  - [ ] Ensure formatting behavior matches `human.ts` versions exactly
- [ ] Update `src/output/helpers/index.ts` to export new functions
- [ ] In `src/output/human.ts`:
  - [ ] Remove `formatShortDate()` function definition
  - [ ] Remove `formatLongDate()` function definition
  - [ ] Import from helpers: `import { formatShortDate, formatLongDate } from './helpers/index.ts';`
  - [ ] Verify all call sites still work
- [ ] Run tests: `bun run test`
- [ ] Verify human output mode still formats dates correctly

**Validation:**

- [ ] TypeScript compiles
- [ ] All tests pass
- [ ] Date formatting in human mode unchanged
- [ ] ~20 lines removed from human.ts

---

## 7. Extract Filtering/Sorting Utilities

**Priority:** Important (Medium)
**Effort:** 4-6 hours
**Session:** Session 3, Issue #1
**Impact:** Removes ~260 lines of duplication from list.ts, significantly improves maintainability

### Current Problem

`list.ts` has ~300 lines of duplicated filtering and sorting logic for tasks, projects, and areas. Same filtering patterns repeated 3 times with minor variations.

### Solution

Extract generic filtering and sorting utilities to `lib/filtering.ts`.

### Implementation Steps

**Create new utilities module:**

- [ ] Create `src/lib/filtering.ts`
- [ ] Implement generic utilities:
  - [ ] `filterByStatus<T extends { status?: string }>(entities: T[], statusFilter: string): T[]`
    - Handles comma-separated status values
    - Handles kebab-case and PascalCase normalization
    - Used in list.ts lines 140-150, 224-234, 362-372
  - [ ] `sortEntities<T>(entities: T[], field: keyof T, descending?: boolean): T[]`
    - Handles undefined values (put last)
    - Case-insensitive for string fields
    - Used 3 times with variations
  - [ ] `filterByQuery<T>(entities: T[], query: string, fields: (keyof T)[]): T[]`
    - Case-insensitive substring match
    - Searches across specified fields (title, description, body, etc.)
    - Used 3 times
  - [ ] `limitResults<T>(entities: T[], limitStr: string): T[]`
    - Parses limit string, validates, slices array
    - Simple but repeated

**Update list.ts to use utilities:**

- [ ] Import new utilities: `import { filterByStatus, sortEntities, filterByQuery, limitResults } from '@/lib/filtering';`
- [ ] Replace tasks filtering logic (lines 290-541):
  - [ ] Replace status filter with `tasks = filterByStatus(tasks, options.status)`
  - [ ] Replace query filter with `tasks = filterByQuery(tasks, options.query, ['title', 'body'])`
  - [ ] Replace sort logic with `tasks = sortEntities(tasks, taskField, options.desc)`
  - [ ] Replace limit logic with `tasks = limitResults(tasks, options.limit)`
- [ ] Replace projects filtering logic (lines 133-213):
  - [ ] Similar replacements for projects
  - [ ] Query searches ['title', 'description']
- [ ] Replace areas filtering logic (lines 217-286):
  - [ ] Similar replacements for areas
  - [ ] Query searches ['title', 'description']

**Testing:**

- [ ] Add unit tests for filtering utilities in `tests/unit/filtering.test.ts`:
  - [ ] Test filterByStatus with single status, multiple statuses, kebab-case
  - [ ] Test sortEntities with different fields, ascending/descending, undefined handling
  - [ ] Test filterByQuery with single field, multiple fields, case-insensitivity
  - [ ] Test limitResults with valid/invalid input
- [ ] Run full E2E test suite: `bun run test tests/e2e/list.test.ts`
  - All existing list tests must pass
  - No behavioral changes - just refactoring
- [ ] Verify list.ts line count reduced significantly (~260 lines removed)

**Validation:**

- [ ] All unit tests pass
- [ ] All E2E tests pass (especially list.test.ts)
- [ ] TypeScript compiles
- [ ] list.ts is now ~280-300 lines (down from 549)
- [ ] Filtering behavior unchanged

---

## 8. Extract Batch Operation Utility

**Priority:** Worth Doing (Low-Medium)
**Effort:** 2-3 hours
**Session:** Session 3, Issue #2
**Impact:** Removes ~100 lines of duplication across 3 files, better maintainability

### Current Problem

Batch processing pattern duplicated across `set.ts`, `update.ts`, `archive.ts` (~150 lines total). Each implements the same success/failure tracking pattern.

### Solution

Extract generic batch processor to `lib/batch.ts`.

### Implementation Steps

**Create batch utility module:**

- [ ] Create `src/lib/batch.ts`
- [ ] Implement generic batch processor:

  ```typescript
  export interface BatchSuccessInfo {
    path: string
    title: string
    task?: Task
    project?: Project
    toPath?: string // for archive
  }

  export function processBatch<TInput>(
    items: TInput[],
    operation:
      | 'completed'
      | 'dropped'
      | 'status-changed'
      | 'updated'
      | 'archived',
    processor: (item: TInput) => BatchSuccessInfo,
    extractPath: (item: TInput) => string
  ): BatchResult {
    const successes: BatchSuccessInfo[] = []
    const failures: Array<{ path: string; code: string; message: string }> = []

    for (const item of items) {
      try {
        const result = processor(item)
        successes.push(result)
      } catch (error) {
        const path = extractPath(item)
        if (isCliError(error)) {
          failures.push({ path, code: error.code, message: error.message })
        } else {
          failures.push({ path, code: 'UNKNOWN', message: String(error) })
        }
      }
    }

    return { type: 'batch-result', operation, successes, failures }
  }
  ```

**Update commands to use batch utility:**

- [ ] Update `src/commands/set.ts` (lines 198-260):
  - [ ] Import `processBatch`
  - [ ] Replace batch processing loop with `processBatch()` call
  - [ ] Pass processor function that calls `changeTaskStatus()`
  - [ ] Pass path extractor function
- [ ] Update `src/commands/update.ts`:
  - [ ] Similar refactoring for batch update operations
- [ ] Update `src/commands/archive.ts`:
  - [ ] Similar refactoring for batch archive operations

**Testing:**

- [ ] Add unit tests for batch utility in `tests/unit/batch.test.ts`:
  - [ ] Test all successes
  - [ ] Test all failures
  - [ ] Test mixed success/failure
  - [ ] Test error code propagation
- [ ] Run E2E tests for affected commands:
  - [ ] `bun run test tests/e2e/modify.test.ts` (covers set, update, archive)
  - All batch operation tests must pass

**Validation:**

- [ ] All tests pass
- [ ] TypeScript compiles
- [ ] Batch operations behavior unchanged
- [ ] ~100 lines removed across set.ts, update.ts, archive.ts
- [ ] Error handling remains consistent

---

## Completion Criteria

This task is complete when:

- [ ] All 8 improvement items implemented
- [ ] All Rust tests pass: `cargo test`
- [ ] All TypeScript tests pass: `bun run test`
- [ ] Type checking passes: `bun run check`
- [ ] Formatting is clean: `bun run fix`
- [ ] E2E command coverage is 11/11 (100%)
- [ ] list.ts reduced from 549 to ~280-300 lines
- [ ] String-based error matching eliminated from TypeScript layer
- [ ] All NAPI bindings regenerated and working

## Post-Implementation

After completing this task:

1. **Archive review documents:**

   - Move `task-7-*.md` files to `docs/tasks-done/`
   - Preserve as reference but not active tasks

2. **Update progress:**

   - Mark Task 7 as complete
   - Update `tdn-cli/docs/cli-progress.md` if needed

3. **Prepare for Task 8:**
   - Codebase is now in optimal state
   - Architecture is solid
   - Can proceed with configuration and polish features

## Notes

- Work through items in the recommended order to minimize rework
- Regenerate NAPI bindings after each Rust API change: `bun run build`
- Run tests frequently during implementation
- Each item is independent - can pause/resume between items
- Total effort is 12-18 hours - can split across multiple sessions
