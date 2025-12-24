# Task 7: Architecture Review & Refactoring

**Work Directory:** `tdn-cli/`

**Depends on:** Task 6B (Modify Operations)

## Overview

This is a comprehensive review checkpoint after implementing all core functionality (read and write operations). Before proceeding to polish and configuration, we pause to:

1. Review the Rust "external" API design
2. Review read/write patterns including batching
3. Assess type design completeness
4. Identify and execute refactoring opportunities
5. Review TypeScript structure

## Why This Checkpoint Exists

At this point we have:

- All entity parsing (tasks, projects, areas)
- Vault scanning and indexing
- Relationship traversal
- All filtering and sorting
- Context command
- Convenience commands
- File writing with round-trip fidelity
- Status changes and updates
- Batch operations

This is the right time to step back and ensure the architecture is sound before adding configuration, doctor, and polish features.

## Phases

### Phase 1: Rust API Design Review

Evaluate the "external" API exposed via NAPI.

**Deferred from Task 4:** Structured error types were identified as a "low priority" improvement in the Task 4 review. Consider implementing during this review phase. The current approach uses string-based error messages which TypeScript pattern-matches on—this works but is fragile.

**Questions to answer:**

- Is the API surface appropriate? Too large? Too granular?
- Are function signatures consistent?
- Is error handling consistent across all functions?
- Are return types appropriate for TypeScript consumption?
- Should any internal functions be exposed? Any exposed functions be internal?
- Should we implement structured error types now?

**Checklist:**

- [ ] List all `#[napi]` functions
- [ ] Review each for naming consistency
- [ ] Review each for error handling pattern
- [ ] Identify any missing functions
- [ ] Identify any functions that should be merged or split
- [ ] Decision on structured error types

### Phase 2: Read/Write Pattern Review

Evaluate the file I/O patterns.

**Context from Task 4:** The "Read vs Write Separation" pattern (see `cli-tech.md`) was established during Task 4 review. Read operations use typed "parsed view" structs; write operations manipulate raw YAML. Verify this pattern is working as designed.

**Questions to answer:**

- Is read performance acceptable for large vaults?
- Is write round-trip fidelity working correctly per S3 spec?
- Are batch operations efficient (not reading same file multiple times)?
- Is error recovery appropriate (partial failures)?
- Is the read/write separation pattern working well in practice?

**Specific checks:**

- [ ] Profile vault scanning for 1000+ files (if possible)
- [ ] Verify unknown frontmatter fields survive read/write
- [ ] Verify date format preservation (date vs datetime)
- [ ] Verify file reference format preservation (wikilink vs path)
- [ ] Verify batch operations report partial failures correctly
- [ ] Verify YAML field ordering is reasonably preserved

### Phase 3: Type Design Review

Evaluate Rust type design.

**Questions to answer:**

- Do we have all the types we need?
- Are enums marked `#[non_exhaustive]` where appropriate?
- Is the `Option<Option<T>>` pattern used correctly for updates?
- Are there redundant types that could be consolidated?

**Checklist:**

- [ ] Review all public structs
- [ ] Review all enums
- [ ] Check for missing types
- [ ] Check for redundant types
- [ ] Verify NAPI type generation is clean

### Phase 4: Rust Refactoring

Execute identified refactoring opportunities.

**Common patterns to look for:**

- Duplicated parsing logic
- Inconsistent error creation
- Functions that are too long
- Missing abstractions
- Dead code

**Approach:**

1. List all identified issues from phases 1-3
2. Prioritize by impact vs effort
3. Execute high-value refactors
4. Document any deferred items

### Phase 5: TypeScript Structure Review

Evaluate TypeScript code organization.

**Questions to answer:**

- Is the command structure consistent?
- Are formatters well-organized?
- Is there duplicated logic that should be extracted?
- Are types properly defined and used?
- Is error handling consistent?

**Checklist:**

- [ ] Review `src/commands/` structure
- [ ] Review `src/output/` structure
- [ ] Check for duplicated formatting logic
- [ ] Check for proper TypeScript types (not `any`)
- [ ] Review error handling patterns

### Phase 6: TypeScript Refactoring

Execute identified refactoring opportunities.

**Common patterns to look for:**

- Duplicated output formatting
- Inconsistent option handling
- Missing utility functions
- Type assertions that could be avoided

### Phase 7: Test Coverage Review

Evaluate test coverage and quality.

**Questions to answer:**

- Are all commands tested in all output modes?
- Are error cases covered?
- Are edge cases covered?
- Are Rust unit tests adequate?

**Not in scope:** Achieving 100% coverage. Just identify obvious gaps.

### Phase 8: Documentation Update

Update developer documentation to reflect current architecture.

**Documents to review/update:**

- `tdn-cli/docs/developer/architecture-guide.md`
- `tdn-cli/docs/developer/testing.md`
- Any new documents needed in `tdn-cli/docs/developer/`
- `docs/product-overviews/cli-tech.md`

## Verification

- [ ] All `#[napi]` functions reviewed
- [ ] Read/write patterns verified
- [ ] Type design reviewed
- [ ] Rust refactoring complete
- [ ] TypeScript refactoring complete
- [ ] Test coverage gaps identified
- [ ] Documentation updated
- [ ] All tests pass
- [ ] `bun run check` passes

## Output

This task should produce:

1. A cleaner, more maintainable codebase
2. Updated documentation
3. A list of any deferred improvements (for future consideration)
4. Confidence that the foundation is solid for Task 8

## Notes

- This is a review task, not a feature task
- Don't over-engineer - fix obvious issues, defer speculative improvements
- Keep changes focused and testable
- If major changes are needed, discuss with user first
