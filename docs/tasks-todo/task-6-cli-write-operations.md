# Task 6: CLI Write Operations

**Work Directory:** `tdn-cli/`

**Depends on:** Task 3 (List Command)

## Overview

Implement all commands that modify files: `add`, `complete`, `drop`, `status`, `update`, `archive`, and `edit`. Also implement batch operations.

## Architectural Note: Round-Trip Fidelity

When writing files, we must preserve what we don't understand:
- Unknown frontmatter fields must survive read/write cycles
- User's date format choice (date vs datetime) must be preserved
- File reference format (wikilink vs relative path) must be preserved
- Markdown body content must remain unchanged

This is critical because users extend files with custom fields.

**Key Architecture Decision (from Task 4 Review):**

The existing read-focused structs (`Task`, `Project`, `Area`) are "parsed views" that discard information for efficient querying. Write operations need a different approach:

- **Don't** try to round-trip through the typed structs
- **Do** manipulate raw YAML (`serde_yaml::Value`) to preserve structure
- **Do** apply targeted field updates rather than full rewrites

See `cli-tech.md` "Read vs Write Separation" section for the full pattern.

This means Phase 1 creates **new** write infrastructure rather than modifying the existing parsers.

## Phases

### Phase 1: File Writing Infrastructure in Rust

Add file writing capability to Rust core.

**Key functions:**
```rust
/// Write a task file, preserving unknown fields and formatting
#[napi]
pub fn write_task_file(path: String, task: TaskUpdate) -> Result<Task>

/// Update specific fields without full rewrite
#[napi]
pub fn update_task_fields(
    path: String,
    updates: Vec<FieldUpdate>,
) -> Result<Task>

/// FieldUpdate for --set and --unset
#[napi(object)]
pub struct FieldUpdate {
    pub field: String,
    pub value: Option<String>,  // None = unset
}
```

**Preservation strategy:**
1. Read original file content
2. Parse frontmatter but keep raw YAML structure
3. Apply updates to specific fields
4. Reconstruct file with original formatting where possible

### Phase 2: Add Task Command

Implement `add "Task title"` for quick task creation.

```bash
taskdn add "Review quarterly report"
taskdn add "Task" --status ready
taskdn add "Task" --project "Q1" --due friday
taskdn add "Task" --area "Work" --scheduled tomorrow
```

**Behavior:**
1. Generate filename from title (slugify)
2. Create file with frontmatter
3. Set `created-at` and `updated-at` to now
4. Default status: `inbox`
5. Return created task with path

**Output (AI mode):**
```markdown
## Task Created

### Review quarterly report

- **path:** ~/tasks/review-quarterly-report.md
- **status:** inbox
- **created-at:** 2025-01-18T14:30:00
```

**Interactive mode (human, no args):**
- Prompt for title
- Prompt for status (with defaults)
- Prompt for optional fields

### Phase 3: Add Project and Area

Extend add command for projects and areas.

```bash
taskdn add project "Q1 Planning"
taskdn add project "Q1" --area "Work" --status planning
taskdn add area "Work"
taskdn add area "Acme Corp" --type client
```

### Phase 4: Complete and Drop Commands

Quick status change commands.

```bash
taskdn complete ~/tasks/foo.md
taskdn drop ~/tasks/foo.md
```

**Complete behavior:**
1. Set status to `done`
2. Set `completed-at` to now
3. Set `updated-at` to now

**Drop behavior:**
1. Set status to `dropped`
2. Set `completed-at` to now
3. Set `updated-at` to now

**AI mode requirement:** Must use exact path (no fuzzy matching for writes).

**Human mode:** May use fuzzy title matching with confirmation.

### Phase 5: Status Command

General status change command.

```bash
taskdn status ~/tasks/foo.md ready
taskdn status ~/tasks/foo.md blocked
taskdn status ~/tasks/foo.md in-progress
```

**Validation:** Status value must be valid (error code: INVALID_STATUS).

**Behavior:**
1. Validate status value
2. Update status field
3. Update `updated-at`
4. If status is `done` or `dropped`, set `completed-at`

### Phase 6: Update Command

Programmatic field updates with `--set` and `--unset`.

```bash
taskdn update ~/tasks/foo.md --set status=ready
taskdn update ~/tasks/foo.md --set "title=New Title" --set due=2025-12-20
taskdn update ~/tasks/foo.md --unset project
taskdn update ~/tasks/foo.md --set project="[[Q1 Planning]]"
```

**Parsing --set:**
- `field=value` format
- Values with spaces need quotes
- Wikilinks need quotes: `--set project="[[Q1 Planning]]"`

**Validation:**
- Known fields: validate type/format
- Status: must be valid enum
- Dates: must be ISO 8601 or natural language (converted)
- Unknown fields: allow (for user custom fields)

**Output (AI mode):**
```markdown
## Task Updated

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** ready
- **updated-at:** 2025-01-18T14:35:00

### Changes

- **status:** in-progress -> ready
```

### Phase 7: Archive Command

Move file to archive subdirectory.

```bash
taskdn archive ~/tasks/foo.md
taskdn archive ~/tasks/foo.md ~/tasks/bar.md   # Multiple
```

**Behavior:**
1. Move file from `tasks/` to `tasks/archive/`
2. Preserve filename
3. Update `updated-at`

**Output:**
```markdown
## Archived

### Fix login bug

- **from:** ~/tasks/fix-login-bug.md
- **to:** ~/tasks/archive/fix-login-bug.md
```

### Phase 8: Batch Operations

Multiple paths in a single command.

```bash
taskdn complete ~/tasks/a.md ~/tasks/b.md ~/tasks/c.md
taskdn status ~/tasks/a.md ~/tasks/b.md ready
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

### Phase 9: Edit Command

Open file in $EDITOR (human mode only).

```bash
taskdn edit ~/tasks/foo.md
```

**Behavior:**
1. Resolve path
2. Open in $EDITOR (or $VISUAL, fall back to vim/nano)
3. Wait for editor to close
4. Re-read and validate file (optional: warn if now invalid)

**AI mode:** Error - not supported in non-interactive mode.

### Phase 10: Dry Run Mode

Preview what would happen without making changes.

```bash
taskdn add "New task" --dry-run
taskdn complete ~/tasks/foo.md --dry-run
taskdn update ~/tasks/foo.md --set status=ready --dry-run
```

**Output:**
```markdown
## Dry Run: Task Would Be Created

### New task

- **path:** ~/tasks/new-task.md (would be created)
- **status:** inbox
- **created-at:** 2025-01-18T14:30:00
```

## Test Cases

```typescript
describe('add command', () => {
  test('creates task with minimal args');
  test('creates task with all options');
  test('generates slug filename from title');
  test('sets created-at and updated-at');
  test('defaults to inbox status');
  test('creates project');
  test('creates area');
  test('errors in AI mode with no title');
});

describe('complete command', () => {
  test('sets status to done');
  test('sets completed-at');
  test('requires exact path in AI mode');
  test('accepts fuzzy title in human mode');
});

describe('update command', () => {
  test('updates single field');
  test('updates multiple fields');
  test('unsets field');
  test('validates status values');
  test('preserves unknown fields');
});

describe('batch operations', () => {
  test('processes all items');
  test('reports partial failures');
  test('exit code 1 on any failure');
});

describe('dry run', () => {
  test('shows what would happen');
  test('does not create files');
  test('does not modify files');
});
```

## Verification

- [ ] File writing preserves unknown fields
- [ ] `add` creates tasks with correct frontmatter
- [ ] `add project` and `add area` work
- [ ] `complete` and `drop` set correct fields
- [ ] `status` validates and updates
- [ ] `update --set` and `--unset` work
- [ ] `archive` moves files correctly
- [ ] Batch operations handle partial failures
- [ ] `edit` opens editor (human mode only)
- [ ] `--dry-run` shows preview without changes
- [ ] All output modes work correctly
- [ ] cli-progress.md updated

## Notes

- Round-trip fidelity is critical - test with custom fields
- Date handling: accept natural language, store ISO 8601
- For `projects` field: CLI uses `--project` (singular) but writes `projects: [["..."]]` (array)
- Filename generation: slugify title, handle duplicates
- Consider: what happens if target archive file already exists?
