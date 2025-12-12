# Task 3: Task Operations

Implement all task-related functionality.

## Types to Expose

### Task (output type)

```rust
#[napi(object)]
pub struct Task {
    pub path: String,
    pub title: String,
    pub status: String,  // TaskStatus as string
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub body: String,
    pub is_archived: bool,
    pub is_active: bool,
}
```

### NewTask (input type for creation)

```rust
#[napi(object)]
pub struct NewTask {
    pub title: String,
    pub status: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub body: Option<String>,
    pub filename: Option<String>,
}
```

### TaskUpdates (input type for updates)

The Rust SDK uses `Option<Option<T>>` for clearable fields:
- `None` = don't change
- `Some(None)` = clear the field
- `Some(Some(value))` = set to value

In JavaScript/TypeScript this maps naturally:
- `undefined` or field omitted = don't change
- `null` = clear the field
- `value` = set to value

```rust
#[napi(object)]
pub struct TaskUpdates {
    pub title: Option<String>,
    pub status: Option<String>,
    // These use Option<Option<String>> in Rust, exposed as nullable in TS
    pub due: Option<String>,        // null to clear, undefined to skip
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
}
```

**NAPI conversion note:** Need to handle the `Option<Option<T>>` pattern. Check NAPI-RS docs for nullable handling - may need custom conversion logic or `#[napi(ts_type = "string | null")]`.

### TaskFilter (input type for queries)

```rust
#[napi(object)]
pub struct TaskFilter {
    pub statuses: Option<Vec<String>>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub has_project: Option<bool>,
    pub has_area: Option<bool>,
    pub due_before: Option<String>,
    pub due_after: Option<String>,
    pub include_archive: Option<bool>,
}
```

### ValidationWarning (output type)

```rust
#[napi(object)]
pub struct ValidationWarning {
    pub message: String,
    pub field: Option<String>,
}
```

## Methods to Expose

On the `Taskdn` class:

```rust
#[napi]
impl Taskdn {
    // Read
    #[napi]
    pub fn get_task(&self, path: String) -> Result<Task>;

    #[napi]
    pub fn list_tasks(&self, filter: Option<TaskFilter>) -> Result<Vec<Task>>;

    #[napi]
    pub fn count_tasks(&self, filter: Option<TaskFilter>) -> Result<u32>;

    // Create
    #[napi]
    pub fn create_task(&self, task: NewTask) -> Result<String>;

    #[napi]
    pub fn create_inbox_task(&self, title: String) -> Result<String>;

    // Update
    #[napi]
    pub fn update_task(&self, path: String, updates: TaskUpdates) -> Result<()>;

    // Status transitions
    #[napi]
    pub fn complete_task(&self, path: String) -> Result<()>;

    #[napi]
    pub fn drop_task(&self, path: String) -> Result<()>;

    #[napi]
    pub fn start_task(&self, path: String) -> Result<()>;

    #[napi]
    pub fn block_task(&self, path: String) -> Result<()>;

    // Archive
    #[napi]
    pub fn archive_task(&self, path: String) -> Result<String>;

    #[napi]
    pub fn unarchive_task(&self, path: String) -> Result<String>;

    // Delete
    #[napi]
    pub fn delete_task(&self, path: String) -> Result<()>;

    // Validation
    #[napi]
    pub fn validate_task(&self, path: String) -> Result<()>;

    #[napi]
    pub fn get_task_warnings(&self, path: String) -> Result<Vec<ValidationWarning>>;
}
```

## Implementation Notes

- All methods follow the same pattern: call inner Rust SDK, convert types, map errors
- Path return values should be strings (not PathBuf)
- The `Option<Option<T>>` pattern for clearable fields needs careful NAPI handling
- `validate_all_tasks` returns `Vec<(PathBuf, Error)>` which is awkward - consider exposing or skipping

## Verification

After this task, basic task operations should work:
```typescript
const sdk = new Taskdn('./tasks', './projects', './areas');
const path = sdk.createTask({ title: 'Test task' });
const task = sdk.getTask(path);
sdk.completeTask(path);

// Clearing a field
sdk.updateTask(path, { due: null });  // clears due date

// Validation
const warnings = sdk.getTaskWarnings(path);
```

## Files to modify

- `src/lib.rs` - Add types and methods

## After completion

Run `bun test` - the API snapshot test should fail. Review the diff and update: `bun test --update-snapshots`
