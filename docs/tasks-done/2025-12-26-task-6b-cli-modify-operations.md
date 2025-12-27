# Task 6B: CLI Modify Operations

**Work Directory:** `tdn-cli/`

**Depends on:** Task 6A (Write Infrastructure & Create Operations)

## Overview

Implement all commands that modify existing files: `complete`, `drop`, `status`, `update`, `archive`, and `edit`. Also implement batch operations and dry-run mode.

These commands use the write infrastructure from Task 6A.

## Phases

### Phase 1: Complete and Drop Commands

Quick status change commands for finishing tasks.

```bash
taskdn complete ~/tasks/foo.md
taskdn drop ~/tasks/foo.md
```

**Complete behavior:**

1. Validate file exists and is a task
2. Set status to `done`
3. Set `completed-at` to now
4. Set `updated-at` to now

**Drop behavior:**

1. Validate file exists and is a task
2. Set status to `dropped`
3. Set `completed-at` to now
4. Set `updated-at` to now

**AI mode requirement:** Must use exact path (no fuzzy matching for writes).

**Human mode:** May use fuzzy title matching with confirmation prompt.

**Output (AI mode):**

```markdown
## Task Completed

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** done
- **completed-at:** 2025-01-18T14:30:00
```

### Phase 2: Status Command

General status change command for any valid status.

```bash
taskdn status ~/tasks/foo.md ready
taskdn status ~/tasks/foo.md blocked
taskdn status ~/tasks/foo.md in-progress
```

**Validation:** Status value must be valid (error code: `INVALID_STATUS`).

**Valid task statuses:** `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `done`, `dropped`

**Behavior:**

1. Validate status value against allowed values
2. Update status field
3. Update `updated-at`
4. If status is `done` or `dropped`, also set `completed-at`
5. If changing FROM `done`/`dropped` to another status, clear `completed-at`

**Error output (AI mode):**

```markdown
## Error: INVALID_STATUS

- **message:** Invalid status value
- **value:** inprogress
- **valid-values:** inbox, icebox, ready, in-progress, blocked, done, dropped
```

### Phase 3: Update Command

Programmatic field updates with `--set` and `--unset`.

```bash
taskdn update ~/tasks/foo.md --set status=ready
taskdn update ~/tasks/foo.md --set "title=New Title" --set due=2025-12-20
taskdn update ~/tasks/foo.md --unset project
taskdn update ~/tasks/foo.md --set project="[[Q1 Planning]]"
```

**Parsing `--set`:**

- Format: `field=value`
- Values with spaces need quotes: `--set "title=My New Title"`
- Wikilinks need quotes: `--set project="[[Q1 Planning]]"`

**Validation:**

- Known fields: validate type/format
- `status`: must be valid enum value
- Date fields (`due`, `scheduled`, `defer-until`): must be ISO 8601 or natural language
- Unknown fields: allow (supports user custom fields)

**Output (AI mode):**

```markdown
## Task Updated

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** ready
- **updated-at:** 2025-01-18T14:35:00

### Changes

- **status:** in-progress → ready
```

### Phase 4: Archive Command

Move file to archive subdirectory.

```bash
taskdn archive ~/tasks/foo.md
taskdn archive ~/tasks/foo.md ~/tasks/bar.md   # Multiple files
```

**Behavior:**

1. Validate file exists
2. Determine archive path (`tasks/archive/` for tasks, etc.)
3. Create archive directory if needed
4. Move file (preserving filename)
5. Update `updated-at` in the moved file

**Edge case:** If target file already exists in archive, add numeric suffix.

**Output (AI mode):**

```markdown
## Archived

### Fix login bug

- **from:** ~/tasks/fix-login-bug.md
- **to:** ~/tasks/archive/fix-login-bug.md
```

### Phase 5: Batch Operations

Support multiple paths in a single command.

```bash
taskdn complete ~/tasks/a.md ~/tasks/b.md ~/tasks/c.md
taskdn status ~/tasks/a.md ~/tasks/b.md ready
taskdn archive ~/tasks/a.md ~/tasks/b.md
```

**Behavior:**

- Process all items (don't stop on first error)
- Report successes and failures separately
- Exit code 1 if ANY failed, 0 if all succeeded

**Output (AI mode):**

```markdown
## Completed (2)

### ~/tasks/a.md

- **title:** Fix login bug
- **status:** done
- **completed-at:** 2025-12-18T14:30:00

### ~/tasks/c.md

- **title:** Write tests
- **status:** done
- **completed-at:** 2025-12-18T14:30:01

## Errors (1)

### ~/tasks/b.md

- **code:** NOT_FOUND
- **message:** Task file does not exist
```

If all succeed, omit "Errors" section. If all fail, omit success section.

### Phase 6: Edit Command

Open file in $EDITOR (human mode only).

```bash
taskdn edit ~/tasks/foo.md
```

**Behavior:**

1. Resolve path (fuzzy matching allowed in human mode)
2. Determine editor: `$VISUAL` → `$EDITOR` → `vim` → `nano`
3. Spawn editor process and wait for exit
4. Optionally: re-read file and warn if now invalid YAML

**AI mode:** Return error - not supported in non-interactive mode.

```markdown
## Error: NOT_SUPPORTED

- **message:** Edit command requires interactive mode
- **suggestion:** Use `update --set` for programmatic changes
```

### Phase 7: Dry Run Mode

Preview what would happen without making changes.

```bash
taskdn add "New task" --dry-run
taskdn complete ~/tasks/foo.md --dry-run
taskdn update ~/tasks/foo.md --set status=ready --dry-run
taskdn archive ~/tasks/foo.md --dry-run
```

**Behavior:**

- Perform all validation
- Calculate what would change
- Display preview
- Do NOT write any files

**Output:**

```markdown
## Dry Run: Task Would Be Created

### New task

- **path:** ~/tasks/new-task.md (would be created)
- **status:** inbox
- **created-at:** 2025-01-18T14:30:00
```

```markdown
## Dry Run: Task Would Be Updated

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md

### Changes

- **status:** in-progress → ready
- **updated-at:** 2025-01-18T14:30:00 → 2025-01-18T14:35:00
```

## Test Cases

```typescript
describe('complete command', () => {
  test('sets status to done')
  test('sets completed-at timestamp')
  test('updates updated-at timestamp')
  test('requires exact path in AI mode')
  test('accepts fuzzy title in human mode')
  test('errors if file not found')
})

describe('drop command', () => {
  test('sets status to dropped')
  test('sets completed-at timestamp')
})

describe('status command', () => {
  test('changes to valid status')
  test('rejects invalid status with INVALID_STATUS error')
  test('sets completed-at when changing to done/dropped')
  test('clears completed-at when changing from done to ready')
})

describe('update command', () => {
  test('updates single field')
  test('updates multiple fields')
  test('unsets field with --unset')
  test('validates status values')
  test('validates date formats')
  test('allows unknown fields (custom)')
  test('preserves unknown fields not being updated')
})

describe('archive command', () => {
  test('moves file to archive directory')
  test('creates archive directory if needed')
  test('handles duplicate filename in archive')
  test('updates updated-at in moved file')
})

describe('batch operations', () => {
  test('processes all items even if some fail')
  test('reports successes and failures separately')
  test('exit code 1 if any failure')
  test('exit code 0 if all succeed')
})

describe('edit command', () => {
  test('opens file in $EDITOR')
  test('errors in AI mode')
  test('falls back through VISUAL → EDITOR → vim → nano')
})

describe('dry run', () => {
  test('shows what add would create')
  test('shows what update would change')
  test('does not create files')
  test('does not modify files')
})
```

## Verification

- [x] `complete` sets status and completed-at
- [x] `drop` sets status and completed-at
- [x] `status` validates and updates correctly
- [x] `status` handles completed-at for done/dropped transitions
- [x] `update --set` works for all field types
- [x] `update --unset` removes fields
- [x] `update` preserves fields not being modified
- [x] `archive` moves files to correct location
- [x] `archive` handles existing files in archive
- [x] Batch operations continue on individual failures
- [x] Batch operations report correctly
- [x] `edit` opens editor in human mode
- [x] `edit` errors in AI mode
- [x] `--dry-run` shows preview for all write commands
- [x] `--dry-run` does not modify filesystem
- [x] All output modes (human, AI, JSON) work
- [x] cli-progress.md updated

## Notes

- All modify operations use `update_file_fields()` from Task 6A
- Fuzzy matching for human mode can reuse existing `findTasksByTitle()` etc.
- The `archive` command needs to handle different entity types (tasks, projects, areas have different archive locations)
- Consider: should `archive` update references in other files? (Probably not for v1)
- Dry run for batch operations should show all items that would be affected
