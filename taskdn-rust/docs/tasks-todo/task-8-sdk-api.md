# Task 8: SDK API

Implement the main `Taskdn` struct with CRUD operations and query capabilities.

**Reference:** See `docs/developer/architecture-guide.md` for complete API specification.

## Scope

### Main Entry Point (`src/lib.rs`)
- [x] Implement `Taskdn::new(config: TaskdnConfig) -> Result<Self, Error>`
- [x] Validate directories exist and are readable
- [x] Store config for use in operations

### Task Operations
- [x] `get_task(&self, path: impl AsRef<Path>) -> Result<Task, Error>`
- [x] `list_tasks(&self, filter: &TaskFilter) -> Result<Vec<Task>, Error>`
- [x] `count_tasks(&self, filter: &TaskFilter) -> Result<usize, Error>`
- [x] `create_task(&self, task: NewTask) -> Result<PathBuf, Error>`
- [x] `create_inbox_task(&self, title: impl AsRef<str>) -> Result<PathBuf, Error>`
- [x] `update_task(&self, path: impl AsRef<Path>, updates: TaskUpdates) -> Result<(), Error>`
- [x] `update_tasks_matching(&self, filter: &TaskFilter, updates: &TaskUpdates) -> BatchResult<PathBuf>`
- [x] `complete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [x] `drop_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [x] `start_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [x] `block_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [x] `archive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>`
- [x] `unarchive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>`
- [x] `delete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`

### Project Operations
- [x] `get_project`, `list_projects`, `create_project`, `update_project`, `delete_project`
- [x] `get_tasks_for_project(&self, project: impl AsRef<Path>) -> Result<Vec<Task>, Error>`

### Area Operations
- [x] `get_area`, `list_areas`, `create_area`, `update_area`, `delete_area`
- [x] `get_projects_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Project>, Error>`
- [x] `get_tasks_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Task>, Error>`

### Validation
- [x] `validate_task(&self, path: impl AsRef<Path>) -> Result<(), Error>`
- [x] `validate_all_tasks(&self) -> Vec<(PathBuf, Error)>`
- [x] `get_task_warnings(&self, path: impl AsRef<Path>) -> Result<Vec<ValidationWarning>, Error>`

### Filtering Implementation
- [x] Implement `TaskFilter` matching logic
- [ ] Handle `area_via_project` (join through projects) - *handled at SDK level in `get_tasks_for_area`*
- [x] Date comparison (extract date portion from datetime)
- [x] Archive directory handling (`include_archive_dir`)

### Directory Scanning Opt-in (from Task 5)
- [ ] Handle `taskdn-type: project` opt-in behavior
  - If ANY project in a directory has `taskdn-type: project`, ignore files without it
- [ ] Handle `taskdn-type: area` opt-in behavior (same logic as projects)

### Filename Generation
- [x] Generate filename from title (lowercase, spaces to hyphens, special chars removed)
- [x] Use provided filename if specified in `NewTask`
- [x] Handle collisions (fail if file exists)

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
