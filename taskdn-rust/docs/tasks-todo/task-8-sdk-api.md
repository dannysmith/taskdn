# Task 8: SDK API

Implement the main `Taskdn` struct with CRUD operations and query capabilities.

**Reference:** See `docs/developer/architecture-guide.md` for complete API specification.

## Scope

### Main Entry Point (`src/lib.rs`)
- [ ] Implement `Taskdn::new(config: TaskdnConfig) -> Result<Self, Error>`
- [ ] Validate directories exist and are readable
- [ ] Store config for use in operations

### Task Operations
- [ ] `get_task(&self, path: impl AsRef<Path>) -> Result<Task, Error>`
- [ ] `list_tasks(&self, filter: TaskFilter) -> Result<Vec<Task>, Error>`
- [ ] `count_tasks(&self, filter: TaskFilter) -> Result<usize, Error>`
- [ ] `create_task(&self, task: NewTask) -> Result<PathBuf, Error>`
- [ ] `create_inbox_task(&self, title: impl AsRef<str>) -> Result<PathBuf, Error>`
- [ ] `update_task(&self, path: impl AsRef<Path>, updates: TaskUpdates) -> Result<(), Error>`
- [ ] `update_tasks_matching(&self, filter: TaskFilter, updates: TaskUpdates) -> BatchResult<PathBuf>`
- [ ] `complete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [ ] `drop_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [ ] `start_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [ ] `block_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [ ] `archive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>`
- [ ] `unarchive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>`
- [ ] `delete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`

### Project Operations
- [ ] `get_project`, `list_projects`, `create_project`, `update_project`, `delete_project`
- [ ] `get_tasks_for_project(&self, project: impl AsRef<Path>) -> Result<Vec<Task>, Error>`

### Area Operations
- [ ] `get_area`, `list_areas`, `create_area`, `update_area`, `delete_area`
- [ ] `get_projects_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Project>, Error>`
- [ ] `get_tasks_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Task>, Error>`

### Validation
- [ ] `validate_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [ ] `validate_all_tasks(&self) -> Vec<(PathBuf, Error)>`

### Filtering Implementation
- [ ] Implement `TaskFilter` matching logic
- [ ] Handle `area_via_project` (join through projects)
- [ ] Date comparison (extract date portion from datetime)
- [ ] Archive directory handling (`include_archive_dir`)

### Filename Generation
- [ ] Generate filename from title (lowercase, spaces to hyphens, special chars removed)
- [ ] Use provided filename if specified in `NewTask`
- [ ] Handle collisions (append number or fail?)

## Integration Tests

- [ ] Full workflow: create task → update → query → archive
- [ ] Batch operations with many files
- [ ] Error handling for invalid files in directory
- [ ] `get_tasks_for_area` returns tasks directly in area + via projects
- [ ] Performance test: 5000 tasks under target times

## Performance

Use `rayon` for parallel file operations:
- Single file parse: <1ms
- 5000 file scan (parallel): ~200-500ms
- Query by status (in-memory filter): <5ms

## Notes

- Invalid files are skipped during `list_tasks()`, not errors
- Use `validate_all_tasks()` for strict validation
- `BatchResult<T>` for partial success in batch operations
- All path parameters use `impl AsRef<Path>` for flexibility
