# Task 8: SDK API

Implement the main `Taskdn` struct with CRUD operations and query capabilities.

## Scope

### Main Entry Point (`src/lib.rs`)
- [ ] Write failing integration tests for full workflows
- [ ] Implement `Taskdn::new(config: TaskdnConfig) -> Result<Self, Error>`
- [ ] Implement task CRUD operations
- [ ] Implement project CRUD operations
- [ ] Implement area CRUD operations
- [ ] Implement query/filter API
- [ ] Implement batch operations with rayon for parallelism
- [ ] Implement archiving (move completed/dropped tasks to archive)

## CRUD Operations

### Tasks
```rust
impl Taskdn {
    pub fn list_tasks(&self) -> Result<Vec<Task>, Error>;
    pub fn get_task(&self, path: &Path) -> Result<Task, Error>;
    pub fn create_task(&self, task: &Task) -> Result<PathBuf, Error>;
    pub fn update_task(&self, path: &Path, updates: TaskUpdates) -> Result<(), Error>;
    pub fn delete_task(&self, path: &Path) -> Result<(), Error>;
    pub fn archive_task(&self, path: &Path) -> Result<PathBuf, Error>;
}
```

### Projects & Areas
Similar CRUD for projects and areas.

## Query API

- [ ] Design and implement filtering by status
- [ ] Filter by project reference
- [ ] Filter by area reference
- [ ] Filter by date ranges (due, scheduled, defer-until)
- [ ] Filter by custom predicates

```rust
impl Taskdn {
    pub fn query_tasks(&self) -> TaskQuery;
}

impl TaskQuery {
    pub fn status(self, status: TaskStatus) -> Self;
    pub fn project(self, project: &Path) -> Self;
    pub fn due_before(self, date: Date) -> Self;
    pub fn execute(self) -> Result<Vec<Task>, Error>;
}
```

## Integration Tests

- [ ] Full workflow: create task → update → query → archive
- [ ] Batch operations with many files
- [ ] Error handling for invalid files in directory
- [ ] Performance test: 5000 tasks under target times

## Performance Targets

From phase2 doc:
- Single file parse: <1ms
- Full vault scan (5000 tasks, parallel): ~200-500ms
- Query by status (in-memory filter): <5ms

## Notes

- Use rayon for parallel file operations
- Consider lazy loading vs eager loading for large vaults
- Invalid files should be skipped with warnings, not fail the whole operation
