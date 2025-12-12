# Task 5: Event Processing

Implement file change event processing for consumers that bring their own file watcher.

## Types to Expose

### FileChangeKind

```rust
#[napi(string_enum)]
pub enum FileChangeKind {
    Created,
    Modified,
    Deleted,
}
```

### VaultEvent (discriminated union)

This is trickier - need to represent a Rust enum with data as a JavaScript object:

```rust
#[napi(object)]
pub struct VaultEvent {
    #[napi(js_name = "type")]
    pub event_type: String,  // "taskCreated" | "taskUpdated" | "taskDeleted" | etc.

    // Only one of these will be set based on event_type
    pub task: Option<Task>,
    pub project: Option<Project>,
    pub area: Option<Area>,
    pub path: Option<String>,  // for deleted events
}
```

TypeScript consumers can narrow based on `type`:
```typescript
const event = sdk.processFileChange(path, 'modified');
if (event?.type === 'taskUpdated') {
    console.log(event.task.title);  // Task is defined
}
```

## Method to Expose

```rust
#[napi]
impl Taskdn {
    /// Process a file change and return the corresponding vault event.
    /// Returns null if the file is not a recognized task/project/area.
    #[napi]
    pub fn process_file_change(
        &self,
        path: String,
        kind: String  // "created" | "modified" | "deleted"
    ) -> Result<Option<VaultEvent>>;
}
```

## Implementation Notes

- The Rust SDK's `process_file_change` returns `Result<Option<VaultEvent>>`
- Need to convert the Rust `VaultEvent` enum to our flattened object structure
- `kind` parameter could be a string or the FileChangeKind enum

## Usage Example

```typescript
// Consumer brings their own watcher (e.g., chokidar)
import chokidar from 'chokidar';

const watcher = chokidar.watch('./tasks');

watcher.on('change', (path) => {
    const event = sdk.processFileChange(path, 'modified');
    if (event) {
        switch (event.type) {
            case 'taskUpdated':
                console.log('Task updated:', event.task.title);
                break;
            case 'projectUpdated':
                console.log('Project updated:', event.project.title);
                break;
        }
    }
});
```

## Verification

```typescript
// Modify a task file, then:
const event = sdk.processFileChange('./tasks/my-task.md', 'modified');
expect(event?.type).toBe('taskUpdated');
expect(event?.task).toBeDefined();
```

## Files to modify

- `src/lib.rs` - Add FileChangeKind, VaultEvent, and processFileChange

## After completion

Run `bun test` - the API snapshot test should fail. Review the diff and update: `bun test --update-snapshots`
