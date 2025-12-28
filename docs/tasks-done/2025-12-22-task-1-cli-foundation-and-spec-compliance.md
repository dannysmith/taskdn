# Task 1: CLI Foundation & Spec Compliance

**Work Directory:** `tdn-cli/`

## Overview

Ensure test fixtures conform to S1 spec, add missing project/area fixtures, establish structured error handling, document the TDD workflow, and create the CLI progress checklist.

Most of the E2E infrastructure is already in place. This task is about housekeeping and ensuring we have a solid foundation before implementing more commands.

## Phases

### Phase 1: Audit and Fix Task Fixtures

The current fixtures are missing required S1 fields.

**S1 Required Fields (Section 3.3):**

- `title` - present
- `status` - present
- `created-at` - **MISSING**
- `updated-at` - **MISSING**

**Files to update:**

- `tests/fixtures/vault/tasks/minimal.md`
- `tests/fixtures/vault/tasks/full-metadata.md`
- `tests/fixtures/vault/tasks/with-body.md`
- `tests/fixtures/vault/tasks/status-*.md` (all 6 status files)

**Example fix for minimal.md:**

```yaml
---
title: Minimal Task
status: ready
created-at: 2025-01-10
updated-at: 2025-01-10
---
```

### Phase 2: Add Project Fixtures

Create `tests/fixtures/vault/projects/` with files for testing project parsing.

**Files to create:**

- `minimal.md` - Required fields only (title, status)
- `full-metadata.md` - All optional fields populated
- `with-body.md` - Project with notes/description

**S1 Required Fields for Projects (Section 4.3):**

- `title`
- `status` - One of: `planning`, `in-progress`, `paused`, `blocked`, `done`, `dropped`

**S1 Optional Fields for Projects (Section 4.4):**

- `created-at`, `updated-at`, `completed-at`
- `area` (file reference)
- `start-date`, `end-date` (dates)
- `description` (string)
- `blocked-by` (array of file references)

### Phase 3: Add Area Fixtures

Create `tests/fixtures/vault/areas/` with files for testing area parsing.

**Files to create:**

- `minimal.md` - Required fields only
- `full-metadata.md` - All optional fields
- `with-body.md` - Area with notes

**S1 Required Fields for Areas (Section 5.3):**

- `title`

**S1 Optional Fields for Areas (Section 5.4):**

- `status` - One of: `active`, `archived`
- `type` - One of: `personal`, `work`, `client`, `other`
- `created-at`, `updated-at`
- `description` (string)

### Phase 4: Structured Error Codes

Establish the error code pattern that all commands will use.

**Error codes from CLI spec:**
| Code | When | Includes |
|------|------|----------|
| `NOT_FOUND` | File/entity doesn't exist | Suggestions |
| `AMBIGUOUS` | Fuzzy match returned multiple | List of matches |
| `INVALID_STATUS` | Bad status value | Valid statuses |
| `INVALID_DATE` | Unparseable date | Expected formats |
| `INVALID_PATH` | Path outside directories | Configured paths |
| `PARSE_ERROR` | YAML malformed | Line number |
| `MISSING_FIELD` | Required field absent | Field name |
| `REFERENCE_ERROR` | Reference doesn't exist | Broken reference |
| `PERMISSION_ERROR` | Can't read/write | File path |
| `CONFIG_ERROR` | Config missing/invalid | Run init suggestion |

**Implementation:**

1. Define error types in TypeScript (`src/errors/types.ts`)
2. Create error formatting for each output mode
3. Update `show` command to use structured errors

### Phase 5: Document TDD Workflow in CLAUDE.md

Add the TDD workflow to `tdn-cli/CLAUDE.md`:

```markdown
## TDD Workflow for CLI Features

This process only applies in full when adding new features (ie commands etc) to the CLI.

For each feature or small set of features:

1. **Write failing E2E test** - Describe expected behavior
2. **Add fixture files as needed** - Ensure they conform to S1 spec
3. **Review test against specs** - Check S1, S2, `cli-requirements.md`
4. **User confirms test** - Commit before implementing
5. **Implement until green** - Iteratively build the solution
6. **Refactor** - Clean up Rust and TypeScript code and identify opportunities to refactor
7. **Add Rust unit tests** - Where valuable for parsing logic
8. **Add TS unit tests** - For formatters and utilities as needed
9. **Run checks** - `bun run fix` then `bun run check`
10. **Update docs** - cli-progress.md and task document
11. **Summary** - Provide summary including manual test commands to user and a short commit message
```

### Phase 6: Create cli-progress.md

Create `tdn-cli/docs/cli-progress.md` with a checklist of every command and feature.

See the cli-progress.md content below.

## Verification

- [ ] All task fixtures have `created-at` and `updated-at` fields
- [ ] Project fixtures exist and conform to S1 Section 4
- [ ] Area fixtures exist and conform to S1 Section 5
- [ ] Error types defined with formatting for all output modes
- [ ] CLAUDE.md contains TDD workflow
- [ ] cli-progress.md exists with full command checklist
- [ ] `bun run test` passes
- [ ] `bun run check` passes

## Notes

- Don't change behavior of existing `show` command tests (they should still pass)
- The Rust parser may need minor updates for project/area parsing in Task 2
- Error codes will be used but full implementation happens gradually as we build commands
