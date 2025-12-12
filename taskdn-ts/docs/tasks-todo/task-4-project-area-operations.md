# Task 4: Project and Area Operations

Implement project and area functionality. These follow the same patterns as tasks.

## Project Types

### Project (output)

```rust
#[napi(object)]
pub struct Project {
    pub path: String,
    pub title: String,
    pub status: Option<String>,  // ProjectStatus
    pub unique_id: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub area: Option<FileReference>,
    pub blocked_by: Option<Vec<FileReference>>,
    pub body: String,
}
```

### NewProject, ProjectUpdates, ProjectFilter

Similar structure to task equivalents.

## Area Types

### Area (output)

```rust
#[napi(object)]
pub struct Area {
    pub path: String,
    pub title: String,
    pub status: Option<String>,  // AreaStatus
    pub area_type: Option<String>,  // "type" field from spec
    pub description: Option<String>,
    pub body: String,
}
```

### NewArea, AreaUpdates, AreaFilter

Similar structure to task/project equivalents.

## Methods to Expose

### Project methods

```rust
#[napi]
impl Taskdn {
    #[napi]
    pub fn get_project(&self, path: String) -> Result<Project>;

    #[napi]
    pub fn list_projects(&self, filter: Option<ProjectFilter>) -> Result<Vec<Project>>;

    #[napi]
    pub fn create_project(&self, project: NewProject) -> Result<String>;

    #[napi]
    pub fn update_project(&self, path: String, updates: ProjectUpdates) -> Result<()>;

    #[napi]
    pub fn delete_project(&self, path: String) -> Result<()>;

    #[napi]
    pub fn get_tasks_for_project(&self, path: String) -> Result<Vec<Task>>;
}
```

### Area methods

```rust
#[napi]
impl Taskdn {
    #[napi]
    pub fn get_area(&self, path: String) -> Result<Area>;

    #[napi]
    pub fn list_areas(&self, filter: Option<AreaFilter>) -> Result<Vec<Area>>;

    #[napi]
    pub fn create_area(&self, area: NewArea) -> Result<String>;

    #[napi]
    pub fn update_area(&self, path: String, updates: AreaUpdates) -> Result<()>;

    #[napi]
    pub fn delete_area(&self, path: String) -> Result<()>;

    #[napi]
    pub fn get_tasks_for_area(&self, path: String) -> Result<Vec<Task>>;

    #[napi]
    pub fn get_projects_for_area(&self, path: String) -> Result<Vec<Project>>;
}
```

## Implementation Notes

- These follow the exact same patterns as task operations
- Projects and areas have simpler status handling (no transitions like tasks)
- The `get_*_for_*` methods return related entities

## Verification

```typescript
const projects = sdk.listProjects();
const areas = sdk.listAreas({ status: 'active' });
const tasksInProject = sdk.getTasksForProject('./projects/q1-planning.md');
```

## Files to modify

- `src/lib.rs` - Add types and methods

## After completion

Run `bun test` - the API snapshot test should fail. Review the diff and update: `bun test --update-snapshots`
