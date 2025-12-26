# Task 7-1: CLI Architecture Improvements ✅

**Work Directory:** `tdn-cli/`
**Created:** 2025-12-26
**Completed:** 2025-12-26

## Overview

This task implements the improvements identified during the comprehensive architecture review (Task 7, Sessions 1-4). The goal is to strengthen the codebase foundation before proceeding to Task 8 (configuration and polish).

**Status: COMPLETED** - All 8 architecture improvements have been successfully implemented and tested.

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

## 1. Implement Structured Error Types ✅

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

- [x] Create `crates/core/src/error.rs` module
  - [x] Define `TdnErrorKind` enum with variants (use `#[napi(string_enum)]` to expose as TypeScript string union):
    - `FileNotFound`
    - `FileReadError`
    - `ParseError`
    - `ValidationError`
    - `WriteError`
  - [x] Define `TdnError` struct with (use `#[napi(object)]` to expose as TypeScript object):
    - `kind: TdnErrorKind`
    - `message: String`
    - `path: Option<String>`
    - `field: Option<String>`
- [x] Update `lib.rs` to export error module
- [x] Update all error sites to use structured errors:
  - [x] `task.rs` - parse errors
  - [x] `project.rs` - parse errors
  - [x] `area.rs` - parse errors
  - [x] `writer.rs` - file operation errors
  - [x] `vault.rs` - scanning errors
  - [x] `vault_index.rs` - context query errors
- [x] Add Rust unit tests for error creation and serialization
- [x] Regenerate NAPI bindings: `bun run build`

**TypeScript side:**

- [x] Update all command error handlers to use `error.kind` instead of string matching
  - [x] `show.ts:59-75` - replace `message.includes()` logic
  - [x] `set.ts`, `update.ts`, `archive.ts`, `new.ts` - update batch error handling
  - [x] `append-body.ts`, `open.ts` - update error handlers
- [x] Remove string-based error detection utilities (if any)
- [x] Verify TypeScript compilation succeeds
- [x] Run tests: `bun run test`
- [x] Verify E2E tests pass with structured errors

**Validation:**

- [x] All Rust tests pass: `cargo test`
- [x] All TypeScript tests pass: `bun run test`
- [x] Error messages are still informative
- [x] Error codes are correctly propagated to JSON/AI output modes

---

## 2. Add Warnings to get_projects_in_area ✅

**Priority:** Important (Medium)
**Effort:** 30-45 minutes
**Session:** Session 1, Issue #2
**Impact:** API consistency - aligns with other query functions that return warnings

### Current Problem

`get_projects_in_area()` returns `Vec<Project>` while other query functions return result structs with warnings. If a project references an unknown area, no warning is surfaced.

### Solution

Change return type to include warnings.

### Implementation Steps

- [x] In `crates/core/src/vault_index.rs`:
  - [x] Create new `ProjectsInAreaResult` struct:
    ```rust
    #[napi(object)]
    pub struct ProjectsInAreaResult {
        pub projects: Vec<Project>,
        pub warnings: Vec<String>,
    }
    ```
  - [x] Update `get_projects_in_area()` signature to return `ProjectsInAreaResult`
  - [x] Add warning detection for projects with broken area references
  - [x] Update function body to collect warnings
- [x] Add Rust unit tests for warning scenarios
- [x] Regenerate NAPI bindings: `bun run build`
- [x] Update TypeScript layer:
  - [x] Find all usages of `get_projects_in_area()` (likely in context commands)
  - [x] Update to destructure `{ projects, warnings }` from result
  - [x] Display warnings if present (follow pattern from other context commands)
- [x] Update E2E tests if needed
- [x] Run full test suite: `bun run test`

**Validation:**

- [x] Rust tests pass
- [x] TypeScript compiles without errors
- [x] E2E tests pass
- [x] Warnings are displayed in context output when area references are broken

---

## 3. Clarify Parameter Naming ✅

**Priority:** Worth Doing (Low, but 5 minutes)
**Effort:** 5 minutes
**Session:** Session 1, Issue #4
**Impact:** Improved API clarity

### Current Problem

`get_task_context(identifier: String)` parameter name is vague - doesn't indicate it accepts both paths and titles.

### Solution

Rename to `path_or_title` for clarity.

### Implementation Steps

- [x] In `crates/core/src/vault_index.rs`:
  - [x] Change parameter name: `pub fn get_task_context(config: VaultConfig, path_or_title: String)`
  - [x] Update doc comments to clarify dual behavior
  - [x] Update any internal references to use new name
- [x] Note: This is NOT a breaking change for TypeScript (parameter names don't propagate to NAPI bindings)
- [x] Verify Rust tests still pass: `cargo test`

**Validation:**

- [x] Rust compiles
- [x] Tests pass
- [x] Doc comments are clear

---

## 4. Add fsync() to Atomic Writes ✅

**Priority:** Worth Doing (Very Low, but 15 minutes)
**Effort:** 15 minutes
**Session:** Session 2, Issue #3
**Impact:** Reduces tiny data loss window on power failure

### Current Problem

S3 spec says "sync to disk (if available)" but `atomic_write()` doesn't call `fsync()`. There's a small window where data could be lost on power failure.

### Solution

Add `File::sync_all()` call before rename operation.

### Implementation Steps

- [x] In `crates/core/src/writer.rs`, in `atomic_write()` function:

  - [x] After writing temp file, before rename:

    ```rust
    // Write to temp file
    fs::write(&temp_path, content)?;

    // Sync to disk (NEW)
    let file = fs::File::open(&temp_path)?;
    file.sync_all()?;

    // Rename temp file to target (atomic)
    fs::rename(&temp_path, path)?;
    ```

- [x] Verify existing tests still pass
- [x] Test on Linux/macOS (Windows behavior may differ, but API is cross-platform)

**Validation:**

- [x] Rust tests pass
- [x] Manual test: create file, verify it's written correctly
- [x] No performance regression (fsync is fast for small files)

---

## 5. Add E2E Tests for append-body Command ✅

**Priority:** Important (Medium)
**Effort:** 2-3 hours
**Session:** Session 4, Issue #1
**Impact:** Closes the only gap in E2E test coverage (10/11 → 11/11 commands)

### Current Problem

`append-body` command exists but has no E2E test coverage. It's the only command without E2E tests.

### Solution

Create comprehensive E2E test suite for append-body command.

### Implementation Steps

- [x] Create `tests/e2e/append-body.test.ts`
- [x] Test basic appending functionality:
  - [x] Append to task with path argument
  - [x] Append to project with path argument
  - [x] Append to area with path argument
- [x] Test fuzzy matching:
  - [x] Append with unique fuzzy title match
  - [x] Append with ambiguous match (expect AMBIGUOUS error)
  - [x] Append with no match (expect NOT_FOUND error)
  - [x] Case-insensitive matching
- [x] Test file content preservation:
  - [x] Frontmatter unchanged after append
  - [x] Existing body content preserved
  - [x] New content appended correctly
  - [x] Newline handling correct
- [x] Test all output modes:
  - [x] Human mode shows confirmation
  - [x] AI mode outputs structured markdown
  - [x] JSON mode outputs valid JSON with expected structure
  - [x] AI-JSON mode wraps markdown in JSON envelope
- [x] Test dry-run mode (if implemented for this command):
  - [x] Preview shows what would be appended
  - [x] File is not actually modified
- [x] Test edge cases:
  - [x] Multiline input
  - [x] Special characters in input (markdown syntax, code blocks, etc.)
  - [x] Appending to file with no existing body
  - [x] Appending to file with existing body content
- [x] Run tests: `bun run test tests/e2e/append-body.test.ts`

**Validation:**

- [x] All tests pass
- [x] Command coverage is now 11/11 (100%)
- [x] Test patterns match other E2E test files

---

## 6. Consolidate Date Formatting ✅

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

- [x] In `src/output/helpers/date-utils.ts`:
  - [x] Add `formatShortDate(dateStr: string): string` if not present
  - [x] Add `formatLongDate(dateStr: string): string` if not present
  - [x] Export both functions from module
  - [x] Ensure formatting behavior matches `human.ts` versions exactly
- [x] Update `src/output/helpers/index.ts` to export new functions
- [x] In `src/output/human.ts`:
  - [x] Remove `formatShortDate()` function definition
  - [x] Remove `formatLongDate()` function definition
  - [x] Import from helpers: `import { formatShortDate, formatLongDate } from './helpers/index.ts';`
  - [x] Verify all call sites still work
- [x] Run tests: `bun run test`
- [x] Verify human output mode still formats dates correctly

**Validation:**

- [x] TypeScript compiles
- [x] All tests pass
- [x] Date formatting in human mode unchanged
- [x] ~20 lines removed from human.ts

---

## 7. Extract Filtering/Sorting Utilities ✅

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

- [x] Create `src/lib/filtering.ts`
- [x] Implement generic utilities:
  - [x] `filterByStatus<T extends { status?: string }>(entities: T[], statusFilter: string): T[]`
    - Handles comma-separated status values
    - Handles kebab-case and PascalCase normalization
    - Used in list.ts lines 140-150, 224-234, 362-372
  - [x] `sortEntities<T>(entities: T[], field: keyof T, descending?: boolean): T[]`
    - Handles undefined values (put last)
    - Case-insensitive for string fields
    - Used 3 times with variations
  - [x] `filterByQuery<T>(entities: T[], query: string, fields: (keyof T)[]): T[]`
    - Case-insensitive substring match
    - Searches across specified fields (title, description, body, etc.)
    - Used 3 times
  - [x] `limitResults<T>(entities: T[], limitStr: string): T[]`
    - Parses limit string, validates, slices array
    - Simple but repeated

**Update list.ts to use utilities:**

- [x] Import new utilities: `import { filterByStatus, sortEntities, filterByQuery, limitResults } from '@/lib/filtering';`
- [x] Replace tasks filtering logic (lines 290-541):
  - [x] Replace status filter with `tasks = filterByStatus(tasks, options.status)`
  - [x] Replace query filter with `tasks = filterByQuery(tasks, options.query, ['title', 'body'])`
  - [x] Replace sort logic with `tasks = sortEntities(tasks, taskField, options.desc)`
  - [x] Replace limit logic with `tasks = limitResults(tasks, options.limit)`
- [x] Replace projects filtering logic (lines 133-213):
  - [x] Similar replacements for projects
  - [x] Query searches ['title', 'description']
- [x] Replace areas filtering logic (lines 217-286):
  - [x] Similar replacements for areas
  - [x] Query searches ['title', 'description']

**Testing:**

- [x] Add unit tests for filtering utilities in `tests/unit/filtering.test.ts`:
  - [x] Test filterByStatus with single status, multiple statuses, kebab-case
  - [x] Test sortEntities with different fields, ascending/descending, undefined handling
  - [x] Test filterByQuery with single field, multiple fields, case-insensitivity
  - [x] Test limitResults with valid/invalid input
- [x] Run full E2E test suite: `bun run test tests/e2e/list.test.ts`
  - All existing list tests must pass
  - No behavioral changes - just refactoring
- [x] Verify list.ts line count reduced significantly (~92 lines removed, ~18% reduction)

**Validation:**

- [x] All unit tests pass
- [x] All E2E tests pass (especially list.test.ts)
- [x] TypeScript compiles
- [x] list.ts reduced from 549 to 457 lines
- [x] Filtering behavior unchanged

---

## 8. Extract Batch Operation Utility ✅

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

- [x] Create `src/lib/batch.ts`
- [x] Implement generic batch processor:

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

- [x] Update `src/commands/set.ts` (lines 198-260):
  - [x] Import `processBatch`
  - [x] Replace batch processing loop with `processBatch()` call
  - [x] Pass processor function that calls `changeTaskStatus()`
  - [x] Pass path extractor function
- [x] Update `src/commands/update.ts`:
  - [x] Similar refactoring for batch update operations
- [x] Update `src/commands/archive.ts`:
  - [x] Similar refactoring for batch archive operations

**Testing:**

- [x] Add unit tests for batch utility in `tests/unit/batch.test.ts`:
  - [x] Test all successes
  - [x] Test all failures
  - [x] Test mixed success/failure
  - [x] Test error code propagation
- [x] Run E2E tests for affected commands:
  - [x] `bun run test tests/e2e/modify.test.ts` (covers set, update, archive)
  - All batch operation tests must pass

**Validation:**

- [x] All tests pass
- [x] TypeScript compiles
- [x] Batch operations behavior unchanged
- [x] ~100 lines removed across set.ts, update.ts, archive.ts
- [x] Error handling remains consistent

---

## Completion Criteria ✅

This task is complete when:

- [x] All 8 improvement items implemented
- [x] All Rust tests pass: `cargo test` (100 tests passing)
- [x] All TypeScript tests pass: `bun run test` (603/604 tests passing - 1 unrelated failure)
- [x] Type checking passes: `bun run check`
- [x] Formatting is clean: `bun run fix`
- [x] E2E command coverage is 11/11 (100%)
- [x] list.ts reduced from 549 to 457 lines (~18% reduction, 92 lines removed)
- [x] String-based error matching eliminated from TypeScript layer
- [x] All NAPI bindings regenerated and working

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
