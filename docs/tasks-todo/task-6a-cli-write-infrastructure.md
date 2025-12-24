# Task 6A: CLI Write Infrastructure & Create Operations

**Work Directory:** `tdn-cli/`

**Depends on:** Task 5 (Context Commands)

## Overview

Build the Rust file writing infrastructure with round-trip fidelity, then implement create operations (`add` for tasks, projects, and areas). This establishes the foundation for all write operations.

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

## Phases

### Phase 1: File Writing Infrastructure in Rust

Add file writing capability to Rust core. Create a new module (e.g., `writer.rs`).

**Core functions needed:**

```rust
/// Create a new task file with the given frontmatter fields
#[napi]
pub fn create_task_file(
    tasks_dir: String,
    title: String,
    fields: TaskCreateFields,
) -> Result<Task>

/// Update specific fields in an existing file
#[napi]
pub fn update_file_fields(
    path: String,
    updates: Vec<FieldUpdate>,
) -> Result<()>

/// FieldUpdate for targeted field changes
#[napi(object)]
pub struct FieldUpdate {
    pub field: String,
    pub value: Option<String>,  // None = unset/remove field
}

/// Fields for task creation
#[napi(object)]
pub struct TaskCreateFields {
    pub status: Option<String>,
    pub project: Option<String>,
    pub area: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
}
```

**Implementation pattern for updates:**

```rust
pub fn update_file_fields(path: String, updates: Vec<FieldUpdate>) -> Result<()> {
    // 1. Read original file
    let content = fs::read_to_string(&path)?;

    // 2. Parse frontmatter as generic YAML (preserves structure)
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(&content);
    let mut yaml: serde_yaml::Value = /* extract frontmatter as Value */;

    // 3. Apply updates to specific fields only
    for update in updates {
        match update.value {
            Some(v) => yaml[&update.field] = serde_yaml::Value::String(v),
            None => { yaml.as_mapping_mut()?.remove(&update.field); }
        }
    }

    // 4. Update timestamp
    yaml["updated-at"] = serde_yaml::Value::String(now_iso8601());

    // 5. Serialize and reconstruct file (body unchanged)
    let new_frontmatter = serde_yaml::to_string(&yaml)?;
    let new_content = format!("---\n{}---\n{}", new_frontmatter, parsed.content);

    // 6. Atomic write (write to temp, rename)
    atomic_write(&path, &new_content)?;

    Ok(())
}
```

**Helper utilities:**

- `slugify(title: &str) -> String` — Convert title to filename-safe slug
- `atomic_write(path: &str, content: &str) -> Result<()>` — Safe file write
- `now_iso8601() -> String` — Current timestamp in ISO 8601 format
- `handle_duplicate_filename(dir: &str, slug: &str) -> String` — Add suffix if file exists

**Round-trip fidelity tests:**

```rust
#[test]
fn preserves_unknown_fields() {
    // Create file with custom field "priority: high"
    // Update status field
    // Verify "priority: high" still present
}

#[test]
fn preserves_date_format() {
    // File has "due: 2025-01-15" (date only)
    // Update unrelated field
    // Verify due is still "2025-01-15" not "2025-01-15T00:00:00"
}

#[test]
fn preserves_body_content() {
    // File has markdown body with formatting
    // Update frontmatter
    // Verify body byte-for-byte identical
}
```

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
2. Handle duplicate filenames (add numeric suffix)
3. Create file with frontmatter
4. Set `created-at` and `updated-at` to now
5. Default status: `inbox`
6. Return created task with path

**Output (AI mode):**

```markdown
## Task Created

### Review quarterly report

- **path:** ~/tasks/review-quarterly-report.md
- **status:** inbox
- **created-at:** 2025-01-18T14:30:00
```

**Interactive mode (human, no args):**

- Prompt for title using `@clack/prompts`
- Prompt for status (with `inbox` default)
- Prompt for optional fields (project, due, etc.)

**Date handling:**

- Accept natural language: `tomorrow`, `friday`, `next week`, `+3d`
- Convert to ISO 8601 for storage
- Use a date parsing library (e.g., `chrono` in Rust or handle in TypeScript)

### Phase 3: Add Project and Area

Extend add command for projects and areas.

```bash
taskdn add project "Q1 Planning"
taskdn add project "Q1" --area "Work" --status planning
taskdn add area "Work"
taskdn add area "Acme Corp" --type client
```

**Project creation:**

- Required: title
- Optional: area, status, description, start-date, end-date
- Default status: none (projects don't require status)

**Area creation:**

- Required: title
- Optional: status, type, description
- Default status: `active`

**Output follows same pattern as task creation.**

## Test Cases

```typescript
describe('write infrastructure', () => {
  test('preserves unknown frontmatter fields on update');
  test('preserves date-only format (not converted to datetime)');
  test('preserves body content exactly');
  test('handles concurrent writes safely (atomic)');
});

describe('add command', () => {
  test('creates task with minimal args');
  test('creates task with all options');
  test('generates slug filename from title');
  test('handles duplicate filenames with suffix');
  test('sets created-at and updated-at');
  test('defaults to inbox status');
  test('converts natural language dates to ISO 8601');
  test('errors in AI mode with no title');
  test('interactive prompts work in human mode');
});

describe('add project', () => {
  test('creates project file');
  test('sets area reference correctly');
  test('handles optional status');
});

describe('add area', () => {
  test('creates area file');
  test('sets type field if provided');
  test('defaults status to active');
});
```

## Verification

- [ ] `update_file_fields()` preserves unknown fields
- [ ] `update_file_fields()` preserves date formats
- [ ] `update_file_fields()` preserves body content
- [ ] `create_task_file()` generates valid frontmatter
- [ ] Slugify handles special characters and spaces
- [ ] Duplicate filenames get numeric suffix
- [ ] `add` command works with all options
- [ ] `add project` creates valid project files
- [ ] `add area` creates valid area files
- [ ] Interactive mode works (human, no args)
- [ ] All output modes (human, AI, JSON) work
- [ ] Natural language dates converted correctly
- [ ] cli-progress.md updated

## Notes

- The `projects` field in task files is an array: `projects: [["[[Q1 Planning]]"]]`
- CLI uses `--project` (singular) but writes to `projects` array
- Timestamps should use local timezone, formatted as ISO 8601
- Consider what happens with very long titles (truncate slug?)
- Test with files that have YAML comments (they won't be preserved - document this)
