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
