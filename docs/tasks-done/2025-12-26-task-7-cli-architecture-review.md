# Task 7: Architecture Review & Refactoring

**Work Directory:** `tdn-cli/`

## Overview

This is a comprehensive review checkpoint after implementing all core functionality (read and write operations). Before proceeding to polish and configuration, we pause to review our implementation.

Relevant docs for information:

- `tdn-cli/docs/developer/cli-interface-guide.md`
- `tdn-cli/docs/developer/output-format-spec.md`
- `tdn-cli/docs/developer/ai-context.md`
- `../../docs/product-overviews/cli/cli-tech.md`

## Why This Checkpoint Exists

At this point we have:

- All entity parsing (tasks, projects, areas)
- Vault scanning and indexing
- Relationship traversal
- All filtering and sorting
- Context command
- Convenience commands
- File writing
- Status changes and updates
- Batch operations

This is the right time to step back and ensure the architecture is sound before adding configuration, doctor, and polish features.

## Review Sessions

These reviews should be conducted as **separate sessions**, in the order shown below. Each session should start with a fresh read of the relevant code.

### For Each Session

- Start with fresh read of relevant code
- Identify issues (not just check boxes)
- Propose changes to user before implementing
- Focus on "ACTUALLY good" not just "passes checklist"
- Keep scope tight (one session = one review area)

---

### Session 1: Type & API Contract Review

**Scope:** Rust type design + NAPI API surface (the contract between layers)

**Why first:** Everything else depends on getting this interface right. Types and API are too intertwined to review separately.

**Deferred from Task 4:** Structured error types were identified as a "low priority" improvement in the Task 4 review. Consider implementing during this session. The current approach uses string-based error messages which TypeScript pattern-matches on—this works but is fragile.

#### Type Design Questions

- Do we have all the types we need?
- Are enums marked `#[non_exhaustive]` where appropriate?
- Is the `Option<Option<T>>` pattern used correctly for updates?
- Are there redundant types that could be consolidated?
- Is NAPI type generation producing clean TypeScript types?

#### API Design Questions

- Is the API surface appropriate? Too large? Too granular?
- Are function signatures consistent?
- Is error handling consistent across all functions?
- Are return types appropriate for TypeScript consumption?
- Should any internal functions be exposed? Any exposed functions be internal?
- Should we implement structured error types now?

#### Checklist

- [ ] Review all public structs
- [ ] Review all enums
- [ ] List all `#[napi]` functions
- [ ] Review each function for naming consistency
- [ ] Review each function for error handling pattern
- [ ] Identify any missing types or functions
- [ ] Identify any functions that should be merged or split
- [ ] Check for redundant types
- [ ] Decision on structured error types

---

### Session 2: Read/Write Implementation Review

**Scope:** File I/O patterns and round-trip fidelity

**Context from Task 4:** The "Read vs Write Separation" pattern (see `cli-tech.md`) was established during Task 4 review. Read operations use typed "parsed view" structs; write operations manipulate raw YAML. Verify this pattern is working as designed.

#### Questions to Answer

- Is read performance acceptable for large vaults?
- Is write round-trip fidelity working correctly per S3 spec?
- Are batch operations efficient (not reading same file multiple times)?
- Is error recovery appropriate (partial failures)?
- Is the read/write separation pattern working well in practice?

#### Specific Checks

- [ ] Profile vault scanning for 1000+ files (if possible)
- [ ] Verify unknown frontmatter fields survive read/write
- [ ] Verify date format preservation (date vs datetime)
- [ ] Verify file reference format preservation (wikilink vs path)
- [ ] Verify batch operations report partial failures correctly
- [ ] Verify YAML field ordering is reasonably preserved
- [ ] Review error handling in file operations
- [ ] Check for any file reading redundancy

---

### Session 3: TypeScript Layer Review

**Scope:** Command structure, formatters, and usage of Rust API

**Why after Session 1:** If Session 1 changes the API, we'll know what TypeScript needs to adapt to.

#### Questions to Answer

- Is the command structure consistent?
- Are formatters well-organized?
- Is there duplicated logic that should be extracted?
- Are types properly defined and used?
- Is error handling consistent?
- Are we using the Rust API appropriately?

#### Checklist

- [ ] Review `src/commands/` structure
- [ ] Review `src/output/` structure
- [ ] Check for duplicated formatting logic
- [ ] Check for proper TypeScript types (not `any`)
- [ ] Review error handling patterns
- [ ] Verify consistent command structure
- [ ] Check for opportunities to extract common utilities

---

### Session 4: Test Coverage Review

**Scope:** E2E test coverage and quality assessment

**Why last:** Validates everything after any refactoring from earlier sessions.

**Not in scope:** Achieving 100% coverage. Just identify obvious gaps.

#### Questions to Answer

- Are all commands tested in all output modes?
- Are error cases covered?
- Are edge cases covered?
- Are Rust unit tests adequate?

#### Checklist

- [ ] Review test coverage across all commands
- [ ] Check coverage of all output modes (human, ai, json, ai-json)
- [ ] Identify gaps in error case testing
- [ ] Identify gaps in edge case testing
- [ ] Review quality of existing tests
- [ ] Review Rust unit test coverage

---

## Expected Output

This task should produce:

1. A cleaner, more maintainable codebase
2. Updated documentation (if patterns or interfaces change)
3. A list of any deferred improvements (for future consideration)
4. Confidence that the foundation is solid for Task 8

## Notes

- This is a review task, not a feature task
- If major changes are needed, discuss with user first
- Each session should be conducted separately with fresh eyes
- Focus on internal code quality, not external CLI interface (unless major issues found)

---

# Implementation Plan

This section accumulates actionable improvements identified during the review sessions. Items will be added as each session completes.

## From Session 1: Type & API Contract Review

**Review Document:** `task-7-session-1-review-report.md`

### Improvements to Implement

#### 1. Implement Structured Error Types (Priority: High)

**Rationale:** Current string-based errors are fragile - TypeScript must pattern-match on message text. Structured errors provide type-safe error handling.

**Implementation:**
- [ ] Define error types in new `crates/core/src/error.rs` module
  - [ ] Create `TdnErrorKind` enum with variants: `FileNotFound`, `FileReadError`, `ParseError`, `ValidationError`, `WriteError`
  - [ ] Create `TdnError` struct with `kind`, `message`, optional `path`, optional `field`
  - [ ] Mark with `#[napi]` attributes for TypeScript exposure
- [ ] Update all error sites across modules to use structured errors
  - [ ] `task.rs` - parse errors
  - [ ] `project.rs` - parse errors
  - [ ] `area.rs` - parse errors
  - [ ] `writer.rs` - file operation errors
  - [ ] `vault.rs` - scanning errors (if any remain)
- [ ] Update TypeScript layer to use structured error handling
  - [ ] Update error handlers to switch on `error.kind`
  - [ ] Remove string pattern matching on error messages
- [ ] Add tests for each error type
  - [ ] Rust unit tests verify correct error kind returned
  - [ ] TypeScript/E2E tests verify error kind is accessible

**Estimated Effort:** 2-3 hours

#### 2. Add Warnings to get_projects_in_area (Priority: Medium)

**Rationale:** Consistency with other query functions. If a project references an unknown area, this should surface as a warning.

**Implementation:**
- [ ] Create new `ProjectsInAreaResult` struct in `vault_index.rs`
  ```rust
  #[napi(object)]
  pub struct ProjectsInAreaResult {
      pub projects: Vec<Project>,
      pub warnings: Vec<String>,
  }
  ```
- [ ] Update `get_projects_in_area` return type from `Vec<Project>` to `ProjectsInAreaResult`
- [ ] Add warning detection for projects with broken area references
- [ ] Update TypeScript layer to handle new return type
  - [ ] Update any commands using `get_projects_in_area`
  - [ ] Display warnings if present
- [ ] Add tests for warning scenarios
- [ ] Regenerate NAPI bindings: `bun run build`

**Estimated Effort:** 30-45 minutes

#### 3. Clarify Parameter Naming (Priority: Low - Optional)

**Rationale:** `identifier` is vague - `path_or_title` is more explicit about what the parameter accepts.

**Implementation:**
- [ ] Rename parameter in `vault_index.rs`:
  ```rust
  pub fn get_task_context(config: VaultConfig, path_or_title: String) -> TaskContextResult
  ```
- [ ] Update doc comments to clarify behavior
- [ ] Update internal references to use new name
- [ ] Note: This is NOT a breaking change for TypeScript (parameter names don't propagate)

**Estimated Effort:** 5 minutes

### Decisions Made

#### ❌ Do NOT Add `#[non_exhaustive]` to Enums

**Rationale:** This is a monorepo with tightly-coupled Rust and TypeScript layers. When we add new enum variants (e.g., new TaskStatus), we WANT the TypeScript build to break. This forces us to handle the new variant in all the right places (formatters, commands, status handlers).

**Key insight:** Breaking the TypeScript build is a **compile-time safety check**, not a problem to avoid. The TypeScript layer is the only consumer of the Rust API, and they're versioned together.

`#[non_exhaustive]` is for public library crates with external downstream users. That's not our architecture.

---

## From Session 2: Read/Write Implementation Review

**Review Document:** `task-7-session-2-review-report.md`

### Key Findings

**Overall Assessment: A+** - Production-ready, excellent S3 spec compliance

- ✅ All S3 spec MUST requirements met
- ✅ Round-trip fidelity perfect (unknown fields, dates, body preserved)
- ✅ Atomic writes implemented correctly
- ✅ Read/Write Separation pattern working as designed
- ✅ Comprehensive test coverage (Rust + E2E)
- ✅ No redundant file operations detected

### Improvements to Implement (All Optional - Low Priority)

#### 1. YAML Field Ordering Preservation (Priority: Low - Nice-to-have)

**Rationale:** S3 spec says "SHOULD preserve field ordering" but current implementation using `BTreeMap` doesn't maintain order. This is cosmetic - YAML semantics don't depend on field order.

**Implementation:**
- [ ] Replace `serde_yaml::Mapping` (which uses `BTreeMap`) with `indexmap`-based mapping
- [ ] Test that field order is preserved after updates
- [ ] Verify diffs are cleaner for version control

**Estimated Effort:** 1-2 hours

**Note:** Not required for production. Defer to post-Task 8 unless user feedback requests it.

#### 2. Parse Failure Logging (Priority: Low - Future enhancement)

**Rationale:** Scanning silently skips unparseable files. A comment in code says "log would go here in production." This would be helpful for future `doctor` command.

**Implementation:**
- [ ] Add optional warnings collection to scan functions
- [ ] Return warnings alongside results (similar to context query pattern)
- [ ] Update TypeScript layer to display warnings if present

**Estimated Effort:** 2-3 hours

**Note:** Not needed for current MVP. Defer to Task 8 (doctor command).

#### 3. Add fsync() to Atomic Writes (Priority: Very Low)

**Rationale:** S3 spec says "sync to disk (if available)." Current implementation doesn't call `fsync()`, leaving tiny window for data loss on power failure.

**Implementation:**
- [ ] Add `File::sync_all()` call before rename in `atomic_write()`
- [ ] Test on Linux/macOS/Windows

**Estimated Effort:** 15 minutes

**Note:** Extremely unlikely scenario. Acceptable trade-off for simplicity.

### Decisions Made

#### ✅ Custom ISO 8601 Implementation is Acceptable

**Rationale:** Avoids chrono dependency (100+ transitive deps). Code is correct and well-tested. Minimal dependencies is a valid engineering choice.

**Decision:** Keep as-is. No action needed.

#### ✅ No Rust Batch Write API Needed

**Rationale:** File operations are independent (no transactions). TypeScript layer handles orchestration well. Each file is updated once (no redundant reading). Simpler Rust API surface is better.

**Decision:** Current design is good. No action needed.

#### ⚠️ Large Vault Performance Testing Deferred

**Rationale:** Demo vault has ~115 files, cannot test 1000+ file requirement. Code patterns indicate good performance (lazy evaluation, no N+1 queries). Estimated 1000-file scan: <200ms.

**Decision:** Defer performance testing until real-world usage. Code patterns are sound.

---

## From Session 3: TypeScript Layer Review

**Review Document:** `task-7-session-3-review-report.md`

### Key Findings

**Overall Assessment: A** - Well-architected and production-ready

- ✅ Excellent type safety (zero `any` types found)
- ✅ Consistent command structure using commander-js
- ✅ Well-organized formatter pattern (4 output modes)
- ✅ Good separation of concerns (helpers properly modularized)
- ✅ Efficient Rust API usage (no redundant calls)
- ⚠️ Code duplication in filtering/sorting logic (~300 lines)
- ⚠️ Three large command files (549-678 lines each)

### Improvements to Implement

#### 1. Extract Filtering/Sorting Utilities (Priority: Medium)

**Rationale:** `list.ts` has ~300 lines of duplicated filtering and sorting logic for tasks, projects, and areas. This creates maintainability risk - when updating one, must update all three.

**Implementation:**
- [ ] Create new `lib/filtering.ts` module
- [ ] Extract generic `filterByStatus<T>()` function
  - Used 3 times in `list.ts` (lines 140-150, 224-234, 362-372)
  - Handles comma-separated status values with kebab-case normalization
- [ ] Extract generic `sortEntities<T>()` function
  - Used 3 times with slight variations
  - Handles undefined values, descending/ascending, field mapping
- [ ] Extract generic `filterByQuery<T>()` function
  - Used 3 times for title/description searching
  - Accepts field list to search
- [ ] Extract `limitResults<T>()` function (simple but repeated)
- [ ] Update `list.ts` to use new utilities
- [ ] Test all filtering combinations to ensure no regression

**Estimated Effort:** 4-6 hours

**Estimated Savings:** ~260 lines removed from `list.ts`, better maintainability

#### 2. Extract Batch Operation Utility (Priority: Low-Medium)

**Rationale:** Batch processing pattern duplicated across `set.ts`, `update.ts`, `archive.ts` (~150 lines). Each implements same success/failure tracking pattern.

**Implementation:**
- [ ] Create new `lib/batch.ts` module
- [ ] Extract generic `processBatch<TInput, TSuccess>()` function
  ```typescript
  export function processBatch<TInput, TSuccess>(
    items: TInput[],
    operation: string,
    processor: (item: TInput) => TSuccess,
    extractInfo: (item: TInput, result: TSuccess) => SuccessInfo
  ): BatchResult
  ```
- [ ] Update `set.ts`, `update.ts`, `archive.ts` to use utility
- [ ] Test batch operations with mixed success/failure scenarios

**Estimated Effort:** 2-3 hours

**Estimated Savings:** ~100 lines across 3 files

#### 3. Consolidate Date Formatting (Priority: Low)

**Rationale:** Date formatting functions duplicated between `human.ts` and `helpers/date-utils.ts`.

**Implementation:**
- [ ] Move `formatShortDate()` and `formatLongDate()` from `human.ts` to `helpers/date-utils.ts`
- [ ] Update `human.ts` imports
- [ ] Ensure formatting matches existing behavior

**Estimated Effort:** 30 minutes

**Estimated Savings:** ~20 lines

#### 4. Consider Splitting Large Commands (Priority: Low - Optional)

**Rationale:** Three commands exceed 500 lines (list: 549, new: 589, update: 678). Harder to navigate but not blocking.

**Commands to consider:**
- `update.ts` (678 lines) - could split validation into separate module
- `new.ts` (589 lines) - could split prompting logic per entity type
- `list.ts` (549 lines) - will shrink significantly after filtering utilities extraction

**Implementation:**
- [ ] Evaluate after filtering utilities extraction (list.ts will shrink)
- [ ] If still desired, extract sub-modules:
  - `update-validation.ts` (validation functions)
  - `new-prompts.ts` (interactive prompting)
- [ ] Test comprehensively after splits

**Estimated Effort:** 2-3 hours per file

**Note:** Defer until after other refactorings. May not be necessary after filtering utilities reduce list.ts size.

### Decisions Made

#### ✅ Type Safety is Excellent - No Action Needed

**Finding:** Zero uses of `any` type throughout ~10,300 lines of TypeScript.

**Decision:** Type safety is production-ready. No action needed.

#### ✅ Command Structure is Consistent - No Action Needed

**Finding:** All commands follow same pattern (commander-js setup → try/catch logic → formatOutput → exit codes).

**Decision:** Structure is sound. No refactoring needed.

#### ✅ Large Formatter Files are Justified

**Finding:** ai.ts is 1,925 lines, human.ts is 1,237 lines.

**Rationale:** Formatters implement comprehensive output requirements per ai-context.md and cli-requirements.md specs. Size is justified by functionality.

**Decision:** Keep as-is. Well-organized with helpers already extracted.

#### ⏳ Error Handling Improvements Deferred to Session 1 Implementation

**Finding:** String-based error matching pervasive throughout commands (e.g., `message.includes('File not found')`).

**Rationale:** This is the Rust API issue identified in Session 1. Once structured Rust errors are implemented, TypeScript layer will be updated to use error.kind instead of string matching.

**Decision:** Wait for Session 1 structured error implementation, then update all error handlers in one sweep.

---

## From Session 4: Test Coverage Review

**Review Document:** `task-7-session-4-review-report.md`

### Key Findings

**Overall Assessment: A** - Production-ready test coverage with one minor gap

- ✅ **E2E Tests:** ~549 test cases covering 10/11 commands (91%)
- ✅ **Rust Unit Tests:** 95 tests covering parsing, indexing, file operations
- ✅ **TypeScript Unit Tests:** ~177 tests covering helpers and utilities
- ✅ **Test Fixtures:** 35 well-designed .md files covering edge cases
- ✅ **Output Mode Coverage:** All commands tested in all 4 modes (human, AI, JSON, AI-JSON)
- ✅ **Error Scenarios:** All major error codes tested
- ✅ **Fuzzy Matching:** Comprehensively tested (unique, ambiguous, none)
- ✅ **Round-Trip Fidelity:** Extensively validated (unknown fields, dates, body)
- ⚠️ **One Gap:** append-body command missing E2E tests

### Test Distribution

| Test Type | Count | Coverage |
|-----------|-------|----------|
| E2E test cases | ~549 | All commands except append-body |
| Rust unit tests | 95 | vault_index (30), writer (21), wikilink (16), vault (13), parsers (15) |
| TypeScript unit tests | ~177 | Helpers (date utils, stats, reference tables, body utils) |
| Test fixtures | 35 .md files | All statuses, edge cases, malformed data |
| **Total lines of test code** | **~6,000** | **Comprehensive** |

### Improvements to Implement

#### 1. Add E2E Tests for append-body Command (Priority: Medium)

**Rationale:** append-body command exists but has no end-to-end test coverage. This is the only command without E2E tests.

**Implementation:**
- [ ] Create `tests/e2e/append-body.test.ts` file
- [ ] Test appending to tasks
  - [ ] Append with path argument
  - [ ] Append with fuzzy title match
  - [ ] Append with AMBIGUOUS match error
  - [ ] Append with NOT_FOUND error
- [ ] Test appending to projects
- [ ] Test appending to areas
- [ ] Test all output modes (human, AI, JSON, AI-JSON)
- [ ] Test dry-run mode (if implemented)
- [ ] Test file content preservation (frontmatter unchanged, body appended correctly)
- [ ] Test with multiline input
- [ ] Test with special characters in input

**Estimated Effort:** 2-3 hours

**Note:** Should be added before Task 8, or early in Task 8 polish phase.

#### 2. Expand Malformed Fixture Coverage (Priority: Low - Optional)

**Rationale:** Currently only one `malformed.md` fixture exists. Could add more parse error scenarios for comprehensive error handling validation.

**Implementation:**
- [ ] Add `fixtures/vault/tasks/invalid-status.md` (invalid status value)
- [ ] Add `fixtures/vault/tasks/missing-title.md` (missing required field)
- [ ] Add `fixtures/vault/projects/broken-wikilink.md` (malformed WikiLink format)
- [ ] Update existing tests to verify these parse errors are handled gracefully
- [ ] Add E2E tests for doctor command (future) to detect these issues

**Estimated Effort:** 1-2 hours

**Note:** Defer to post-Task 8. Current error coverage is adequate.

#### 3. Add Performance Smoke Test (Priority: Very Low - Optional)

**Rationale:** Current fixtures have ~35 files. Session 2 couldn't verify 1000+ file performance requirement. Could add optional performance test.

**Implementation:**
- [ ] Create script to generate large test vault (1000 files)
- [ ] Add performance test suite (separate from main tests, opt-in)
- [ ] Measure scan/list/index operations
- [ ] Document baseline performance metrics
- [ ] Add to CI as optional/nightly job

**Estimated Effort:** 3-4 hours (including infrastructure)

**Note:** Defer indefinitely. Code patterns are sound. Add only if users report performance issues.

### Decisions Made

#### ✅ Test Coverage is Production-Ready

**Finding:** 91% command coverage (10/11), all output modes tested, comprehensive Rust and TypeScript unit tests.

**Decision:** Test suite provides sufficient confidence for production release. The one gap (append-body E2E) should be filled but isn't blocking.

#### ✅ Test Infrastructure is Excellent

**Finding:** Well-organized E2E/unit separation, excellent helper utilities (`runCli`, fixtures), ANSI stripping, deterministic date mocking.

**Decision:** No changes needed to test infrastructure. It's well-designed.

#### ✅ Rust Test Coverage is Strong

**Finding:** 95 Rust unit tests covering parsing (15 tests), file operations (21 tests), indexing (30 tests), WikiLink parsing (16 tests), scanning (13 tests).

**Decision:** Rust layer is well-tested. No additional Rust tests needed.

#### ✅ E2E Tests Cover All Critical Paths

**Finding:** All commands (except append-body) tested in all output modes with comprehensive filtering, sorting, fuzzy matching, error scenarios, and batch operations coverage.

**Decision:** E2E test coverage is excellent. Only missing append-body.

#### ⏸️ Performance and Concurrency Testing Deferred

**Finding:** No tests for 1000+ file vaults or concurrent CLI invocations.

**Rationale:**
- Code patterns are sound (verified in Session 2)
- CLI is short-lived process (races unlikely)
- No performance issues reported
- Can add later if needed

**Decision:** Defer performance and concurrency testing. Not required for MVP.
