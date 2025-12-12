# taskdn-rust Architecture Guide

This document defines the public API and design philosophy for the `taskdn-rust` library. It serves as the authoritative reference for implementation.

---

## Overview

`taskdn-rust` is a library crate for working with Taskdn's markdown-based task management system. It provides:

- Parsing and validation of task/project/area files
- CRUD operations with automatic timestamp management
- Flexible querying and filtering
- File reference resolution (WikiLinks, paths)
- Round-trip preservation of unknown fields and markdown content

### Consumers

- **TypeScript SDK** — Via NAPI-RS bindings
- **Tauri Desktop App** — Direct Cargo dependency
- **CLI** — Via TypeScript SDK
- **Other Rust consumers**

### Design Philosophy

1. **Stateless** — The SDK holds configuration, not cached data. Every query reads from disk. Consumers manage their own caching.

2. **Path as identifier** — File paths are the primary identifier for all entities. No internal IDs.

3. **Explicit over implicit** — Operations do exactly what they say. No hidden side effects except documented automatic timestamp updates.

4. **Preserve what we don't understand** — Unknown frontmatter fields and markdown body are preserved exactly on write.

5. **Errors, not panics** — All fallible operations return `Result<T, Error>`. No `unwrap()` in library code.

6. **Extensible without breaking** — Use `#[non_exhaustive]` on enums and provide `..Default::default()` patterns for structs.

---

## Initialization

### TaskdnConfig

Configuration for the SDK. Specifies where to find files:

```rust
pub struct TaskdnConfig {
    /// Directory containing task files (required)
    pub tasks_dir: PathBuf,
    /// Directory containing project files
    pub projects_dir: PathBuf,
    /// Directory containing area files
    pub areas_dir: PathBuf,
}
```

### Taskdn

The main entry point. All operations go through this struct:

```rust
impl Taskdn {
    /// Create a new SDK instance with the given configuration.
    /// Validates that directories exist and are readable.
    pub fn new(config: TaskdnConfig) -> Result<Self, Error>;

    /// Access the configuration
    pub fn config(&self) -> &TaskdnConfig;
}
```

---

## Core Types

### Task

Represents a parsed task file:

```rust
pub struct Task {
    // Identity
    /// Absolute path to the file
    pub path: PathBuf,

    // Required frontmatter (per spec)
    pub title: String,
    pub status: TaskStatus,
    pub created_at: DateTimeValue,
    pub updated_at: DateTimeValue,

    // Optional frontmatter
    pub completed_at: Option<DateTimeValue>,
    pub due: Option<DateTimeValue>,
    pub scheduled: Option<NaiveDate>,
    pub defer_until: Option<NaiveDate>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,

    // Preserved content
    /// Markdown body (everything after frontmatter)
    pub body: String,
    /// Unknown frontmatter fields (preserved on write)
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl Task {
    /// The filename without path (e.g., "my-task.md")
    pub fn filename(&self) -> &str;

    /// Whether this task is in the archive subdirectory
    pub fn is_archived(&self) -> bool;

    /// Whether this task is "active" (not done, dropped, or archived)
    pub fn is_active(&self) -> bool;
}
```

### TaskStatus

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum TaskStatus {
    Inbox,
    Icebox,
    Ready,
    InProgress,
    Blocked,
    Dropped,
    Done,
}

impl TaskStatus {
    /// Whether this status represents a completed state (done or dropped)
    pub fn is_completed(&self) -> bool;

    /// Whether this status represents an active state
    pub fn is_active(&self) -> bool;

    /// The canonical string representation (lowercase, hyphenated)
    pub fn as_str(&self) -> &'static str;
}

impl FromStr for TaskStatus {
    type Err = Error;
    /// Parse from string (case-insensitive, handles "in-progress" format)
    fn from_str(s: &str) -> Result<Self, Self::Err>;
}
```

### Project

```rust
pub struct Project {
    pub path: PathBuf,

    // Required
    pub title: String,

    // Optional
    pub unique_id: Option<String>,
    pub status: Option<ProjectStatus>,
    pub description: Option<String>,
    pub area: Option<FileReference>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub blocked_by: Vec<FileReference>,

    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}
```

### ProjectStatus

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum ProjectStatus {
    Planning,
    Ready,
    Blocked,
    InProgress,
    Paused,
    Done,
}
```

### Area

```rust
pub struct Area {
    pub path: PathBuf,

    // Required
    pub title: String,

    // Optional
    pub status: Option<AreaStatus>,
    pub area_type: Option<String>,
    pub description: Option<String>,

    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}
```

### AreaStatus

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum AreaStatus {
    Active,
    Archived,
}
```

### Date and DateTime Values

The spec allows both date (`YYYY-MM-DD`) and datetime (`YYYY-MM-DDTHH:MM:SS`) formats. We preserve the original format for round-tripping:

```rust
/// A date or datetime value, preserving the original format
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DateTimeValue {
    Date(NaiveDate),
    DateTime(NaiveDateTime),
}

impl DateTimeValue {
    pub fn date(&self) -> NaiveDate;
    pub fn datetime(&self) -> Option<NaiveDateTime>;
    pub fn is_date_only(&self) -> bool;
}
```

**Date-only fields** (`scheduled`, `defer_until`) use `NaiveDate` directly.

**Date-or-datetime fields** (`created_at`, `updated_at`, `due`, `completed_at`) use `DateTimeValue` to preserve the original format.

### FileReference

References to other files, as stored in frontmatter. Preserves the original format for round-tripping:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FileReference {
    /// WikiLink: [[Page Name]] or [[Page Name|Display Text]]
    WikiLink { target: String, display: Option<String> },
    /// Relative path: ./projects/foo.md
    RelativePath(String),
    /// Bare filename: foo.md
    Filename(String),
}

impl FileReference {
    /// Parse a string into a FileReference
    pub fn parse(s: &str) -> Self;

    /// The display name (WikiLink display text, or filename without extension)
    pub fn display_name(&self) -> &str;
}
```

---

## Filtering and Queries

### TaskFilter

A struct for specifying query criteria. Uses the builder pattern for ergonomic Rust usage, but the struct itself is serializable for NAPI-RS:

```rust
#[derive(Debug, Clone, Default)]
pub struct TaskFilter {
    // Status filtering (OR within, AND with other fields)
    pub status: Option<Vec<TaskStatus>>,
    pub exclude_status: Option<Vec<TaskStatus>>,

    // Assignment filtering
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,          // Tasks with this area directly assigned
    pub area_via_project: Option<FileReference>,  // Tasks whose project is in this area
    pub has_project: Option<bool>,
    pub has_area: Option<bool>,

    // Date filtering (compares by date portion for datetime fields)
    pub due_before: Option<NaiveDate>,
    pub due_after: Option<NaiveDate>,
    pub due_on: Option<NaiveDate>,
    pub scheduled_before: Option<NaiveDate>,
    pub scheduled_after: Option<NaiveDate>,
    pub scheduled_on: Option<NaiveDate>,
    pub created_before: Option<NaiveDateTime>,
    pub created_after: Option<NaiveDateTime>,
    pub visible_as_of: Option<NaiveDate>,  // defer_until <= date OR defer_until is None

    // Archive handling (tasks in tasks/archive/ subdirectory)
    pub include_archive_dir: bool,  // Default: false
}
```

**Note on date filtering:** Date filters compare against the date portion of datetime values. For example, `due_before(2025-01-15)` matches tasks with `due: 2025-01-14` or `due: 2025-01-14T23:59`, but not `due: 2025-01-15T00:00`.

**Builder methods** for ergonomic construction:

```rust
impl TaskFilter {
    pub fn new() -> Self;

    // Status
    pub fn with_status(self, status: TaskStatus) -> Self;
    pub fn with_statuses(self, statuses: impl IntoIterator<Item = TaskStatus>) -> Self;
    pub fn excluding_status(self, status: TaskStatus) -> Self;

    // Assignment
    pub fn in_project(self, project: impl Into<FileReference>) -> Self;
    pub fn in_area(self, area: impl Into<FileReference>) -> Self;
    pub fn in_area_via_project(self, area: impl Into<FileReference>) -> Self;
    pub fn with_project(self) -> Self;
    pub fn without_project(self) -> Self;

    // Dates
    pub fn due_before(self, date: NaiveDate) -> Self;
    pub fn due_after(self, date: NaiveDate) -> Self;
    pub fn due_on(self, date: NaiveDate) -> Self;
    pub fn scheduled_on(self, date: NaiveDate) -> Self;
    pub fn visible_as_of(self, date: NaiveDate) -> Self;

    // Archive (tasks in archive subdirectory)
    pub fn include_archive_dir(self) -> Self;
}
```

**Preset filters** for common queries:

```rust
impl TaskFilter {
    /// Tasks with status = Inbox
    pub fn inbox() -> Self;

    /// Tasks scheduled today, due today, or overdue (visible, not completed)
    pub fn today(today: NaiveDate) -> Self;

    /// Tasks where due < today and not completed
    pub fn overdue(today: NaiveDate) -> Self;

    /// Tasks due within the next N days
    pub fn upcoming(today: NaiveDate, days: u32) -> Self;

    /// Tasks that are ready to work on (not blocked, deferred, or completed)
    pub fn available(today: NaiveDate) -> Self;
}
```

### Filter Semantics

- **AND between different fields** — A task must match ALL specified criteria
- **OR within status lists** — `with_statuses([Ready, InProgress])` matches either
- **None means "don't filter"** — Unset fields don't constrain results
- **`area` vs `area_via_project`** — These are independent filters; use both to find all tasks related to an area

### ProjectFilter and AreaFilter

Similar patterns for projects and areas (simpler, fewer fields):

```rust
#[derive(Debug, Clone, Default)]
pub struct ProjectFilter {
    pub status: Option<Vec<ProjectStatus>>,
    pub area: Option<FileReference>,
    pub has_area: Option<bool>,
}

#[derive(Debug, Clone, Default)]
pub struct AreaFilter {
    /// Filter by status. If None, returns all areas.
    /// Use Some(vec![AreaStatus::Active]) to exclude archived.
    pub status: Option<Vec<AreaStatus>>,
}
```

**Note:** For areas, "archived" is a status value (`status: archived` in frontmatter), not a physical location. This differs from tasks where "archived" means moved to the `tasks/archive/` subdirectory.

---

## Creating and Updating

### NewTask

For creating tasks. Unlike `Task`, this doesn't include path, `created_at`, `updated_at`, or `completed_at` (SDK sets these automatically):

```rust
#[derive(Debug, Clone)]
pub struct NewTask {
    pub title: String,
    pub status: TaskStatus,  // Defaults to Inbox in new()
    pub filename: Option<String>,  // Optional; generated from title if None
    pub due: Option<DateTimeValue>,
    pub scheduled: Option<NaiveDate>,
    pub defer_until: Option<NaiveDate>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl NewTask {
    /// Create a new task with the given title. Status defaults to Inbox.
    pub fn new(title: impl Into<String>) -> Self;

    // Builder methods
    pub fn with_status(self, status: TaskStatus) -> Self;
    pub fn with_filename(self, filename: impl Into<String>) -> Self;
    pub fn with_due(self, due: impl Into<DateTimeValue>) -> Self;
    pub fn in_project(self, project: impl Into<FileReference>) -> Self;
    // etc.
}
```

**Filename generation:** If `filename` is `None`, the SDK generates a filename from the title (lowercased, spaces to hyphens, special chars removed, truncated if too long). If `filename` is `Some`, the SDK uses it directly. Consumers are responsible for ensuring uniqueness.

### NewProject and NewArea

Similar patterns for projects and areas:

```rust
#[derive(Debug, Clone)]
pub struct NewProject {
    pub title: String,
    pub filename: Option<String>,
    pub status: Option<ProjectStatus>,
    pub description: Option<String>,
    pub area: Option<FileReference>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone)]
pub struct NewArea {
    pub title: String,
    pub filename: Option<String>,
    pub status: Option<AreaStatus>,
    pub area_type: Option<String>,
    pub description: Option<String>,
    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}
```

### TaskUpdates

For partial updates. The double-Option pattern distinguishes "don't change" from "clear":

```rust
#[derive(Debug, Clone, Default)]
pub struct TaskUpdates {
    /// None = don't change, Some(x) = set to x
    pub title: Option<String>,
    pub status: Option<TaskStatus>,

    /// None = don't change, Some(None) = clear, Some(Some(x)) = set
    pub due: Option<Option<DateTimeValue>>,
    pub scheduled: Option<Option<NaiveDate>>,
    pub defer_until: Option<Option<NaiveDate>>,
    pub project: Option<Option<FileReference>>,
    pub area: Option<Option<FileReference>>,
}

impl TaskUpdates {
    pub fn new() -> Self;

    pub fn title(self, title: impl Into<String>) -> Self;
    pub fn status(self, status: TaskStatus) -> Self;
    pub fn due(self, due: impl Into<DateTimeValue>) -> Self;
    pub fn clear_due(self) -> Self;
    pub fn project(self, project: impl Into<FileReference>) -> Self;
    pub fn clear_project(self) -> Self;
    // etc.
}
```

**Note:** `updated_at` is automatically set on every update. `completed_at` is automatically set when status changes to `Done` or `Dropped`. The markdown body is never modified by updates.

### ProjectUpdates and AreaUpdates

Similar patterns:

```rust
#[derive(Debug, Clone, Default)]
pub struct ProjectUpdates {
    pub title: Option<String>,
    pub status: Option<Option<ProjectStatus>>,
    pub description: Option<Option<String>>,
    pub area: Option<Option<FileReference>>,
    pub start_date: Option<Option<NaiveDate>>,
    pub end_date: Option<Option<NaiveDate>>,
}

#[derive(Debug, Clone, Default)]
pub struct AreaUpdates {
    pub title: Option<String>,
    pub status: Option<Option<AreaStatus>>,
    pub area_type: Option<Option<String>>,
    pub description: Option<Option<String>>,
}
```

---

## SDK Operations

### Task Operations

```rust
impl Taskdn {
    // === Read ===

    /// Get a single task by path
    pub fn get_task(&self, path: impl AsRef<Path>) -> Result<Task, Error>;

    /// List tasks matching a filter
    pub fn list_tasks(&self, filter: &TaskFilter) -> Result<Vec<Task>, Error>;

    /// Count tasks matching a filter (more efficient than list)
    pub fn count_tasks(&self, filter: &TaskFilter) -> Result<usize, Error>;

    // === Create ===

    /// Create a new task, returns the path where it was created
    pub fn create_task(&self, task: NewTask) -> Result<PathBuf, Error>;

    /// Quick capture: create an inbox task with just a title
    pub fn create_inbox_task(&self, title: impl AsRef<str>) -> Result<PathBuf, Error>;

    // === Update ===

    /// Update a task with partial changes
    pub fn update_task(
        &self,
        path: impl AsRef<Path>,
        updates: TaskUpdates
    ) -> Result<(), Error>;

    /// Update all tasks matching a filter
    pub fn update_tasks_matching(
        &self,
        filter: &TaskFilter,
        updates: &TaskUpdates,
    ) -> BatchResult<PathBuf>;

    // === Status Transitions (convenience) ===

    /// Mark a task as done (sets completed_at automatically)
    pub fn complete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Mark a task as dropped (sets completed_at automatically)
    pub fn drop_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Start working on a task (status → InProgress)
    pub fn start_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Block a task (status → Blocked)
    pub fn block_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    // === Archive ===

    /// Move a task to the archive subdirectory
    pub fn archive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>;

    /// Restore a task from the archive
    pub fn unarchive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf, Error>;

    // === Delete ===

    /// Permanently delete a task file
    pub fn delete_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;
}
```

### Project Operations

```rust
impl Taskdn {
    pub fn get_project(&self, path: impl AsRef<Path>) -> Result<Project, Error>;
    pub fn list_projects(&self, filter: &ProjectFilter) -> Result<Vec<Project>, Error>;
    pub fn create_project(&self, project: NewProject) -> Result<PathBuf, Error>;
    pub fn update_project(
        &self,
        path: impl AsRef<Path>,
        updates: ProjectUpdates
    ) -> Result<(), Error>;
    pub fn delete_project(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Get all tasks assigned to this project
    pub fn get_tasks_for_project(
        &self,
        project: impl AsRef<Path>
    ) -> Result<Vec<Task>, Error>;
}
```

### Area Operations

```rust
impl Taskdn {
    pub fn get_area(&self, path: impl AsRef<Path>) -> Result<Area, Error>;
    pub fn list_areas(&self, filter: &AreaFilter) -> Result<Vec<Area>, Error>;
    pub fn create_area(&self, area: NewArea) -> Result<PathBuf, Error>;
    pub fn update_area(
        &self,
        path: impl AsRef<Path>,
        updates: AreaUpdates
    ) -> Result<(), Error>;
    pub fn delete_area(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Get all projects in this area
    pub fn get_projects_for_area(
        &self,
        area: impl AsRef<Path>
    ) -> Result<Vec<Project>, Error>;

    /// Get all tasks in this area (direct + via projects)
    pub fn get_tasks_for_area(
        &self,
        area: impl AsRef<Path>
    ) -> Result<Vec<Task>, Error>;
}
```

### Reference Resolution

```rust
impl Taskdn {
    /// Resolve a file reference to an actual path
    /// Searches the appropriate directory based on context
    pub fn resolve_project_reference(
        &self,
        reference: &FileReference
    ) -> Result<PathBuf, Error>;

    pub fn resolve_area_reference(
        &self,
        reference: &FileReference
    ) -> Result<PathBuf, Error>;
}
```

### Validation

```rust
impl Taskdn {
    /// Validate a single task file against the spec (returns error for hard failures)
    pub fn validate_task(&self, path: impl AsRef<Path>) -> Result<(), Error>;

    /// Validate all tasks, returning a list of errors
    pub fn validate_all_tasks(&self) -> Vec<(PathBuf, Error)>;

    /// Get validation warnings for a task (non-fatal issues)
    pub fn get_task_warnings(
        &self,
        path: impl AsRef<Path>
    ) -> Result<Vec<ValidationWarning>, Error>;
}
```

**ValidationWarning** represents non-fatal validation issues:

```rust
pub enum ValidationWarning {
    /// Task is done/dropped but missing completed_at
    MissingCompletedAt,
    /// Task has multiple projects assigned (unusual but valid)
    MultipleProjects { count: usize },
}

impl ValidationWarning {
    pub fn message(&self) -> &'static str;
}
```

---

## Parsing API

For consumers who want to parse content without file I/O (useful for testing, streaming, etc.):

```rust
/// Parsed task content without a file path.
/// Use this when parsing from a string rather than reading from disk.
pub struct ParsedTask {
    pub title: String,
    pub status: TaskStatus,
    pub created_at: DateTimeValue,
    pub updated_at: DateTimeValue,
    pub completed_at: Option<DateTimeValue>,
    pub due: Option<DateTimeValue>,
    pub scheduled: Option<NaiveDate>,
    pub defer_until: Option<NaiveDate>,
    pub project: Option<FileReference>,
    pub area: Option<FileReference>,
    pub body: String,
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl ParsedTask {
    /// Parse task content from a string
    pub fn parse(content: &str) -> Result<Self, Error>;

    /// Convert to a Task by associating with a file path
    pub fn with_path(self, path: impl Into<PathBuf>) -> Task;
}

impl Task {
    /// Serialize to file content (frontmatter + body)
    pub fn to_string(&self) -> String;
}

// Similar ParsedProject, ParsedArea types
```

This separation ensures that `Task` always represents a file on disk with a valid path, while `ParsedTask` is used for parsing content from any source.

---

## File Change Processing

The SDK provides tools to help consumers handle file system changes. The core processing logic is always available; an optional bundled watcher is behind a feature flag.

### Design Rationale

Most consumers already have file watching infrastructure:
- **Tauri**: `tauri-plugin-fs-watch`
- **Obsidian**: `vault.on('modify', ...)` API
- **Node.js bindings**: `chokidar`, `fs.watch`

The SDK's value is **making sense of changes**, not raw file watching:
- Is this file in a relevant directory?
- Is it a valid `.md` file?
- What type of entity is it?
- What's the parsed content?

### Core API (always available)

```rust
/// What kind of change occurred (from your watcher)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileChangeKind {
    Created,
    Modified,
    Deleted,
}

/// Typed vault events with parsed content
#[derive(Debug, Clone)]
#[non_exhaustive]
pub enum VaultEvent {
    TaskCreated(Task),
    TaskUpdated(Task),
    TaskDeleted { path: PathBuf },
    ProjectCreated(Project),
    ProjectUpdated(Project),
    ProjectDeleted { path: PathBuf },
    AreaCreated(Area),
    AreaUpdated(Area),
    AreaDeleted { path: PathBuf },
}

impl Taskdn {
    /// Process a file change into a typed vault event.
    ///
    /// Returns `Ok(None)` if the file isn't relevant:
    /// - Not in tasks/projects/areas directory
    /// - Not a `.md` file
    /// - Not a valid Taskdn entity (for Created/Modified)
    ///
    /// Returns `Err` if parsing fails for a relevant file.
    pub fn process_file_change(
        &self,
        path: impl AsRef<Path>,
        kind: FileChangeKind,
    ) -> Result<Option<VaultEvent>, Error>;

    /// Returns paths that should be watched (tasks_dir, projects_dir, areas_dir).
    /// Useful for setting up your own file watcher.
    pub fn watched_paths(&self) -> Vec<PathBuf>;
}
```

### Usage with External Watcher

```rust
let taskdn = Taskdn::new(config)?;
let paths = taskdn.watched_paths();

// Set up your preferred file watcher (tauri, chokidar, etc.)
for path in &paths {
    my_watcher.watch(path)?;
}

// Handle events from your watcher
my_watcher.on_event(|path, kind| {
    let kind = match kind {
        MyEventKind::Create => FileChangeKind::Created,
        MyEventKind::Modify => FileChangeKind::Modified,
        MyEventKind::Remove => FileChangeKind::Deleted,
    };

    match taskdn.process_file_change(&path, kind)? {
        Some(event) => handle_vault_event(event),
        None => {} // File wasn't relevant (not .md, wrong directory, etc.)
    }
    Ok(())
});
```

### Optional Bundled Watcher

For consumers without their own file watching infrastructure, an optional watcher is available behind the `watch` feature flag.

**Cargo.toml:**
```toml
[features]
default = []
watch = ["dep:notify", "dep:notify-debouncer-mini"]

[dependencies]
notify = { version = "8", optional = true }
notify-debouncer-mini = { version = "0.5", optional = true }
```

**API:**
```rust
#[cfg(feature = "watch")]
pub struct FileWatcher { /* ... */ }

#[cfg(feature = "watch")]
pub struct WatchConfig {
    /// Debounce duration (default: 500ms)
    pub debounce: Duration,
}

#[cfg(feature = "watch")]
impl Taskdn {
    /// Start watching for file changes.
    /// The callback receives fully typed `VaultEvent`s.
    pub fn watch<F>(&self, callback: F) -> Result<FileWatcher, Error>
    where
        F: Fn(VaultEvent) + Send + 'static;

    /// Start watching with custom configuration.
    pub fn watch_with_config<F>(
        &self,
        config: WatchConfig,
        callback: F,
    ) -> Result<FileWatcher, Error>
    where
        F: Fn(VaultEvent) + Send + 'static;
}

#[cfg(feature = "watch")]
impl FileWatcher {
    /// Stop watching and clean up resources.
    pub fn stop(self);
}
```

**Usage:**
```rust
let taskdn = Taskdn::new(config)?;

let watcher = taskdn.watch(|event| {
    match event {
        VaultEvent::TaskCreated(task) => println!("New: {}", task.title),
        VaultEvent::TaskUpdated(task) => println!("Updated: {}", task.title),
        VaultEvent::TaskDeleted { path } => println!("Deleted: {:?}", path),
        // ...
    }
})?;

// Later...
watcher.stop();
```

---

## Error Handling

### Error Type

```rust
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
    #[error("file not found: {}", path.display())]
    NotFound { path: PathBuf },

    #[error("failed to parse {}: {message}", path.display())]
    Parse { path: PathBuf, message: String },

    #[error("validation error in {}: {message}", path.display())]
    Validation { path: PathBuf, message: String },

    #[error("missing required field '{field}' in {}", path.display())]
    MissingField { path: PathBuf, field: &'static str },

    #[error("invalid value for '{field}' in {}: {message}", path.display())]
    InvalidField { path: PathBuf, field: &'static str, message: String },

    #[error("unresolved reference: {reference}")]
    UnresolvedReference { reference: String },

    #[error("cannot delete {}: {reason}", path.display())]
    DeleteBlocked { path: PathBuf, reason: String },

    #[error("directory not found: {}", path.display())]
    DirectoryNotFound { path: PathBuf },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
```

### BatchResult

For operations that can partially succeed:

```rust
pub struct BatchResult<T> {
    pub succeeded: Vec<T>,
    pub failed: Vec<(PathBuf, Error)>,
}

impl<T> BatchResult<T> {
    pub fn is_complete_success(&self) -> bool;
    pub fn success_count(&self) -> usize;
    pub fn failure_count(&self) -> usize;

    /// Convert to Result, failing if any operation failed
    pub fn into_result(self) -> Result<Vec<T>, Vec<(PathBuf, Error)>>;
}
```

### Error Handling Guidelines

1. **Single operations** return `Result<T, Error>`
2. **Batch operations** return `BatchResult<T>` (best-effort, continues on failure)
3. **List operations** skip invalid files and return valid ones (use `validate_all_tasks()` for strict mode)

---

## Automatic Behaviors

The SDK automatically handles:

| Field | Behavior |
|-------|----------|
| `created_at` | Set to current time on `create_task()` |
| `updated_at` | Set to current time on every `update_task()` |
| `completed_at` | Set to current time when status changes to `Done` or `Dropped` |

The SDK never modifies:
- The markdown body
- Unknown frontmatter fields (preserved on write)
- Field order in frontmatter (preserved where possible)

---

## Directory Scanning Opt-in

For projects and areas, the SDK supports opt-in behavior via the `taskdn-type` field:

**Behavior:**
- If ANY file in the projects directory has `taskdn-type: project` in its frontmatter, only files with that field are included in `list_projects()`
- If ANY file in the areas directory has `taskdn-type: area` in its frontmatter, only files with that field are included in `list_areas()`
- If no files have the `taskdn-type` field, all `.md` files are included (default behavior)

**Use case:** This allows users to have mixed content in their project/area directories (e.g., meeting notes alongside project files) without those files being treated as projects/areas.

**Example:**
```yaml
---
title: My Project
taskdn-type: project
status: in-progress
---
```

Files without `taskdn-type: project` will be ignored when any file has it.

---

## Conventions

### Naming

| Pattern | Meaning | Example |
|---------|---------|---------|
| `get_*` | Fetch single item, returns `Result<T, Error>` | `get_task(path)` |
| `list_*` | Fetch multiple items with filter | `list_tasks(filter)` |
| `create_*` | Create new item, returns path | `create_task(new_task)` |
| `update_*` | Modify existing item | `update_task(path, updates)` |
| `delete_*` | Remove item permanently | `delete_task(path)` |
| `*_for_*` | Get related items | `get_tasks_for_project(project)` |

### Path Parameters

All path parameters accept `impl AsRef<Path>`, so you can pass:
- `PathBuf`
- `&Path`
- `&str`
- `String`

### FileReference Conversions

`FileReference` implements `From<&str>` with automatic detection:
- `"[[Page Name]]"` → `FileReference::WikiLink`
- `"./path/to/file.md"` → `FileReference::RelativePath`
- `"filename.md"` → `FileReference::Filename`

---

## Extensibility

### Adding New Fields

The API is designed to be extended without breaking changes:

1. **Enums use `#[non_exhaustive]`** — New variants can be added
2. **Structs use `Default`** — New fields can be added with defaults
3. **Filters are additive** — New filter fields don't affect existing queries

### Future Considerations

If the spec adds new fields (e.g., `priority`, `tags`), we would:
1. Add the field to `Task`, `NewTask`, `TaskUpdates`
2. Add filter support in `TaskFilter`
3. Existing code continues to work via `..Default::default()`

---

## Module Structure

```
src/
├── lib.rs          # Re-exports, Taskdn struct
├── config.rs       # TaskdnConfig
├── error.rs        # Error enum, BatchResult
├── types/
│   ├── mod.rs
│   ├── task.rs     # Task, TaskStatus, NewTask, TaskUpdates, ParsedTask
│   ├── project.rs  # Project, ProjectStatus, NewProject, ProjectUpdates
│   ├── area.rs     # Area, AreaStatus, NewArea, AreaUpdates
│   ├── datetime.rs # DateTimeValue
│   └── reference.rs # FileReference
├── filter.rs       # TaskFilter, ProjectFilter, AreaFilter + matching logic
├── parser.rs       # Frontmatter parsing (gray_matter)
├── writer.rs       # File writing with preservation
├── resolve.rs      # Reference resolution
├── events.rs       # FileChangeKind, VaultEvent, process_file_change()
├── watcher.rs      # FileWatcher (behind "watch" feature)
├── utils.rs        # Filename generation utilities
├── validation.rs   # ValidationWarning enum
└── operations/     # SDK operations (impl Taskdn)
    ├── mod.rs
    ├── tasks.rs    # Task CRUD, status transitions, archive
    ├── projects.rs # Project CRUD, get_tasks_for_project
    ├── areas.rs    # Area CRUD, get_projects_for_area, get_tasks_for_area
    └── validation.rs # validate_task, validate_all_tasks, get_task_warnings
```

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Single file parse | < 1ms |
| 5,000 file scan (parallel) | 200-500ms |
| In-memory filter | < 5ms |

**Implementation:** The SDK uses `rayon` for parallel file operations in `list_tasks()`, `list_projects()`, and `list_areas()`. File paths are collected first, then parsed in parallel using `par_iter()`. Avoid allocations in hot paths.

---

## Testing

- **Unit tests** in each module's `#[cfg(test)]` block
- **Integration tests** in `tests/` using `dummy-demo-vault`
- **Round-trip tests** ensure parse → write → parse produces identical results
- **Property tests** for parsing edge cases

Test against the demo vault which covers all spec scenarios.
