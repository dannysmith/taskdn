# Task: Conformity with specs Review

> Check for feature conformity with S1 and S2 specs

## Findings Summary

[spec-conformity-review.md](./spec-conformity-review.md)

**Overall Assessment:** Strong conformance (95%) with excellent implementation of core requirements. The CLI correctly handles all required S1 data format requirements and implements comprehensive S2 interface patterns.

## Actions

The tasks below have been edited by the user. These are the only ones we should work on.

1. **Fix doctor command status values** (`tdn-cli/src/commands/doctor.ts:93-101`)

   - Change `'completed'` → `'done'`
   - Change `'cancelled'` → `'dropped'`
   - Impact: Doctor is currently flagging valid tasks as invalid

2. **Handle ambiguity differently between modes**

   - When `lookupEntity()` finds multiple matches:
     - Human mode: Show interactive selection (current behavior ✓)
     - JSON/AI mode: Return structured `AMBIGUOUS` error with match list
   - Impact: Prevents scripts/agents from hanging on interactive prompts

3. **Add multi-project validation to doctor command**

   - Check if `task.projects.length > 1`
   - Warn: "Task has multiple projects (Taskdn uses single-project semantics)"
   - Impact: Detects spec violations from manual edits or migration

4. **Audit and standardize JSON summary field**

   - Verify all commands that output JSON include `summary` field
   - Commands to check: `list`, `show`, `context`, `new`, `set status`, `update`, `archive`, `doctor`
   - Impact: Ensures consistent JSON structure per guidance in `tdn-cli/docs/developer/output-format-spec.md`

5. **Verify null handling in sorting**

   - Test that tasks without a sort field value appear last regardless of direction
   - Document behavior if correct, fix if not

6. **Centralize status constants**

   - Create shared constants file: `tdn-cli/src/lib/constants.ts`
   - Export `VALID_TASK_STATUSES`, `VALID_PROJECT_STATUSES`, `VALID_AREA_STATUSES`
   - Import in `doctor.ts`, `update.ts`, etc.
   - Impact: Prevents future inconsistencies like issue #1

7. **Extract mode-specific behavior**
   - Consider strategy pattern for mode-specific lookup/ambiguity handling
   - Makes mode differences more explicit and testable
   - Impact: Better code organization, easier to maintain mode requirements
