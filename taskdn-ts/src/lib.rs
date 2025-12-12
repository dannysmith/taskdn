//! NAPI-RS bindings for the Taskdn Rust SDK.
//!
//! This is a thin wrapper that exposes the Rust SDK to Node.js/Bun environments.
//! All business logic remains in the Rust SDK - this layer only handles type
//! conversion between Rust and JavaScript.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::path::PathBuf;
use taskdn::{TaskdnConfig, Taskdn as CoreTaskdn, TaskFilter as CoreTaskFilter};
use taskdn::types::{
    TaskStatus as CoreTaskStatus,
    ProjectStatus as CoreProjectStatus,
    AreaStatus as CoreAreaStatus,
    FileReference as CoreFileReference,
    DateTimeValue as CoreDateTimeValue,
    Task as CoreTask,
    NewTask as CoreNewTask,
    TaskUpdates as CoreTaskUpdates,
};
use taskdn::validation::ValidationWarning as CoreValidationWarning;

// =============================================================================
// Status Enums
// =============================================================================

/// Status of a task.
///
/// - `inbox`: New task, needs triage
/// - `icebox`: Deprioritized, might do someday
/// - `ready`: Ready to work on
/// - `in-progress`: Currently being worked on
/// - `blocked`: Waiting on something external
/// - `dropped`: Abandoned, won't be completed
/// - `done`: Successfully completed
#[napi(string_enum)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskStatus {
    #[napi(value = "inbox")]
    Inbox,
    #[napi(value = "icebox")]
    Icebox,
    #[napi(value = "ready")]
    Ready,
    #[napi(value = "in-progress")]
    InProgress,
    #[napi(value = "blocked")]
    Blocked,
    #[napi(value = "dropped")]
    Dropped,
    #[napi(value = "done")]
    Done,
}

impl From<CoreTaskStatus> for TaskStatus {
    fn from(status: CoreTaskStatus) -> Self {
        match status {
            CoreTaskStatus::Inbox => TaskStatus::Inbox,
            CoreTaskStatus::Icebox => TaskStatus::Icebox,
            CoreTaskStatus::Ready => TaskStatus::Ready,
            CoreTaskStatus::InProgress => TaskStatus::InProgress,
            CoreTaskStatus::Blocked => TaskStatus::Blocked,
            CoreTaskStatus::Dropped => TaskStatus::Dropped,
            CoreTaskStatus::Done => TaskStatus::Done,
            // Handle future variants - default to Inbox
            _ => TaskStatus::Inbox,
        }
    }
}

impl From<TaskStatus> for CoreTaskStatus {
    fn from(status: TaskStatus) -> Self {
        match status {
            TaskStatus::Inbox => CoreTaskStatus::Inbox,
            TaskStatus::Icebox => CoreTaskStatus::Icebox,
            TaskStatus::Ready => CoreTaskStatus::Ready,
            TaskStatus::InProgress => CoreTaskStatus::InProgress,
            TaskStatus::Blocked => CoreTaskStatus::Blocked,
            TaskStatus::Dropped => CoreTaskStatus::Dropped,
            TaskStatus::Done => CoreTaskStatus::Done,
        }
    }
}

/// Status of a project.
///
/// - `planning`: Project is being planned
/// - `ready`: Project is ready to start
/// - `blocked`: Project is blocked on something
/// - `in-progress`: Project is actively being worked on
/// - `paused`: Project is temporarily paused
/// - `done`: Project is complete
#[napi(string_enum)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectStatus {
    #[napi(value = "planning")]
    Planning,
    #[napi(value = "ready")]
    Ready,
    #[napi(value = "blocked")]
    Blocked,
    #[napi(value = "in-progress")]
    InProgress,
    #[napi(value = "paused")]
    Paused,
    #[napi(value = "done")]
    Done,
}

impl From<CoreProjectStatus> for ProjectStatus {
    fn from(status: CoreProjectStatus) -> Self {
        match status {
            CoreProjectStatus::Planning => ProjectStatus::Planning,
            CoreProjectStatus::Ready => ProjectStatus::Ready,
            CoreProjectStatus::Blocked => ProjectStatus::Blocked,
            CoreProjectStatus::InProgress => ProjectStatus::InProgress,
            CoreProjectStatus::Paused => ProjectStatus::Paused,
            CoreProjectStatus::Done => ProjectStatus::Done,
            // Handle future variants - default to Planning
            _ => ProjectStatus::Planning,
        }
    }
}

impl From<ProjectStatus> for CoreProjectStatus {
    fn from(status: ProjectStatus) -> Self {
        match status {
            ProjectStatus::Planning => CoreProjectStatus::Planning,
            ProjectStatus::Ready => CoreProjectStatus::Ready,
            ProjectStatus::Blocked => CoreProjectStatus::Blocked,
            ProjectStatus::InProgress => CoreProjectStatus::InProgress,
            ProjectStatus::Paused => CoreProjectStatus::Paused,
            ProjectStatus::Done => CoreProjectStatus::Done,
        }
    }
}

/// Status of an area.
///
/// - `active`: Area is active and accepting new tasks/projects
/// - `archived`: Area is archived (no longer active)
#[napi(string_enum)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AreaStatus {
    #[napi(value = "active")]
    Active,
    #[napi(value = "archived")]
    Archived,
}

impl From<CoreAreaStatus> for AreaStatus {
    fn from(status: CoreAreaStatus) -> Self {
        match status {
            CoreAreaStatus::Active => AreaStatus::Active,
            CoreAreaStatus::Archived => AreaStatus::Archived,
            // Handle future variants - default to Active
            _ => AreaStatus::Active,
        }
    }
}

impl From<AreaStatus> for CoreAreaStatus {
    fn from(status: AreaStatus) -> Self {
        match status {
            AreaStatus::Active => CoreAreaStatus::Active,
            AreaStatus::Archived => CoreAreaStatus::Archived,
        }
    }
}

// =============================================================================
// FileReference
// =============================================================================

/// A reference to another file (task, project, or area).
///
/// This is a tagged union represented as an object with a `type` field:
/// - `wikilink`: Obsidian-style `[[Page Name]]` or `[[Page Name|Display Text]]`
/// - `relativePath`: Relative file path like `./projects/foo.md`
/// - `filename`: Bare filename like `foo.md`
#[napi(object)]
#[derive(Debug, Clone)]
pub struct FileReference {
    /// The type of reference: "wikilink", "relativePath", or "filename"
    #[napi(js_name = "type")]
    pub ref_type: String,
    /// For wikilink: the target page name (without brackets)
    pub target: Option<String>,
    /// For wikilink: optional display text (after the `|`)
    pub display: Option<String>,
    /// For relativePath: the relative file path
    pub path: Option<String>,
    /// For filename: the bare filename
    pub name: Option<String>,
}

impl From<CoreFileReference> for FileReference {
    fn from(reference: CoreFileReference) -> Self {
        match reference {
            CoreFileReference::WikiLink { target, display } => FileReference {
                ref_type: "wikilink".to_string(),
                target: Some(target),
                display,
                path: None,
                name: None,
            },
            CoreFileReference::RelativePath(path) => FileReference {
                ref_type: "relativePath".to_string(),
                target: None,
                display: None,
                path: Some(path),
                name: None,
            },
            CoreFileReference::Filename(name) => FileReference {
                ref_type: "filename".to_string(),
                target: None,
                display: None,
                path: None,
                name: Some(name),
            },
        }
    }
}

impl From<FileReference> for CoreFileReference {
    fn from(reference: FileReference) -> Self {
        match reference.ref_type.as_str() {
            "wikilink" => CoreFileReference::WikiLink {
                target: reference.target.unwrap_or_default(),
                display: reference.display,
            },
            "relativePath" => {
                CoreFileReference::RelativePath(reference.path.unwrap_or_default())
            }
            "filename" => {
                CoreFileReference::Filename(reference.name.unwrap_or_default())
            }
            // Default to filename if unknown type
            _ => CoreFileReference::Filename(
                reference.name.or(reference.path).or(reference.target).unwrap_or_default()
            ),
        }
    }
}

// =============================================================================
// Task Types
// =============================================================================

/// A parsed task from a markdown file.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct Task {
    /// Absolute path to the task file.
    pub path: String,
    /// The task title.
    pub title: String,
    /// Current status of the task.
    pub status: TaskStatus,
    /// When the task was created (ISO string).
    #[napi(js_name = "createdAt")]
    pub created_at: String,
    /// When the task was last updated (ISO string).
    #[napi(js_name = "updatedAt")]
    pub updated_at: String,
    /// When the task was completed (ISO string, if completed).
    #[napi(js_name = "completedAt")]
    pub completed_at: Option<String>,
    /// When the task is due (ISO string).
    pub due: Option<String>,
    /// Date the task is scheduled to be worked on (ISO date string).
    pub scheduled: Option<String>,
    /// Date until which the task is deferred (ISO date string).
    #[napi(js_name = "deferUntil")]
    pub defer_until: Option<String>,
    /// Reference to the project this task belongs to.
    pub project: Option<FileReference>,
    /// Reference to the area this task belongs to.
    pub area: Option<FileReference>,
    /// Markdown body (everything after frontmatter).
    pub body: String,
    /// Whether this task is in the archive subdirectory.
    #[napi(js_name = "isArchived")]
    pub is_archived: bool,
    /// Whether this task is active (not completed and not archived).
    #[napi(js_name = "isActive")]
    pub is_active: bool,
}

impl From<CoreTask> for Task {
    fn from(task: CoreTask) -> Self {
        let is_archived = task.is_archived();
        let is_active = task.is_active();

        Task {
            path: task.path.to_string_lossy().to_string(),
            title: task.title,
            status: task.status.into(),
            created_at: task.created_at.to_string(),
            updated_at: task.updated_at.to_string(),
            completed_at: task.completed_at.map(|dt| dt.to_string()),
            due: task.due.map(|dt| dt.to_string()),
            scheduled: task.scheduled.map(|d| d.format("%Y-%m-%d").to_string()),
            defer_until: task.defer_until.map(|d| d.format("%Y-%m-%d").to_string()),
            project: task.project.map(|p| p.into()),
            area: task.area.map(|a| a.into()),
            body: task.body,
            is_archived,
            is_active,
        }
    }
}

/// Data for creating a new task.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct NewTask {
    /// The task title (required).
    pub title: String,
    /// Initial status (defaults to "inbox").
    pub status: Option<TaskStatus>,
    /// When the task is due (ISO string).
    pub due: Option<String>,
    /// Date the task is scheduled (ISO date string).
    pub scheduled: Option<String>,
    /// Date until which the task is deferred (ISO date string).
    #[napi(js_name = "deferUntil")]
    pub defer_until: Option<String>,
    /// Reference to the project this task belongs to.
    pub project: Option<FileReference>,
    /// Reference to the area this task belongs to.
    pub area: Option<FileReference>,
    /// Markdown body content.
    pub body: Option<String>,
    /// Optional custom filename (generated from title if not provided).
    pub filename: Option<String>,
}

impl TryFrom<NewTask> for CoreNewTask {
    type Error = Error;

    fn try_from(task: NewTask) -> std::result::Result<Self, Self::Error> {
        let mut new_task = CoreNewTask::new(&task.title);

        if let Some(status) = task.status {
            new_task = new_task.with_status(status.into());
        }

        if let Some(due_str) = task.due {
            let due = due_str.parse::<CoreDateTimeValue>()
                .map_err(|e| Error::from_reason(format!("invalid due date: {}", e)))?;
            new_task = new_task.with_due(due);
        }

        if let Some(scheduled_str) = task.scheduled {
            let scheduled = chrono::NaiveDate::parse_from_str(&scheduled_str, "%Y-%m-%d")
                .map_err(|e| Error::from_reason(format!("invalid scheduled date: {}", e)))?;
            new_task = new_task.with_scheduled(scheduled);
        }

        if let Some(defer_str) = task.defer_until {
            let defer = chrono::NaiveDate::parse_from_str(&defer_str, "%Y-%m-%d")
                .map_err(|e| Error::from_reason(format!("invalid defer_until date: {}", e)))?;
            new_task = new_task.with_defer_until(defer);
        }

        if let Some(project) = task.project {
            new_task = new_task.in_project(CoreFileReference::from(project));
        }

        if let Some(area) = task.area {
            new_task = new_task.in_area(CoreFileReference::from(area));
        }

        if let Some(body) = task.body {
            new_task = new_task.with_body(body);
        }

        if let Some(filename) = task.filename {
            new_task = new_task.with_filename(filename);
        }

        Ok(new_task)
    }
}

/// Partial updates for a task.
///
/// - `undefined` or field omitted = don't change
/// - `null` = clear the field
/// - `value` = set to value
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct TaskUpdates {
    /// New title.
    pub title: Option<String>,
    /// New status.
    pub status: Option<TaskStatus>,
    /// New due date (ISO string, or null to clear).
    pub due: Option<String>,
    /// New scheduled date (ISO date string, or null to clear).
    pub scheduled: Option<String>,
    /// New defer until date (ISO date string, or null to clear).
    #[napi(js_name = "deferUntil")]
    pub defer_until: Option<String>,
    /// New project reference (or null to clear).
    pub project: Option<FileReference>,
    /// New area reference (or null to clear).
    pub area: Option<FileReference>,
}

/// Convert TaskUpdates to CoreTaskUpdates.
///
/// Note: This handles the conversion but doesn't support the "clear field"
/// case (null in JS). For full null support, we'd need a more complex approach.
/// For now, providing a value sets it, omitting leaves unchanged.
fn task_updates_to_core(updates: &TaskUpdates) -> std::result::Result<CoreTaskUpdates, Error> {
    let mut core = CoreTaskUpdates::new();

    if let Some(ref title) = updates.title {
        core = core.title(title);
    }

    if let Some(status) = updates.status {
        core = core.status(status.into());
    }

    if let Some(ref due_str) = updates.due {
        let due = due_str.parse::<CoreDateTimeValue>()
            .map_err(|e| Error::from_reason(format!("invalid due date: {}", e)))?;
        core = core.due(due);
    }

    if let Some(ref scheduled_str) = updates.scheduled {
        let scheduled = chrono::NaiveDate::parse_from_str(scheduled_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid scheduled date: {}", e)))?;
        core = core.scheduled(scheduled);
    }

    if let Some(ref defer_str) = updates.defer_until {
        let defer = chrono::NaiveDate::parse_from_str(defer_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid defer_until date: {}", e)))?;
        core = core.defer_until(defer);
    }

    if let Some(ref project) = updates.project {
        core = core.project(CoreFileReference::from(project.clone()));
    }

    if let Some(ref area) = updates.area {
        core = core.area(CoreFileReference::from(area.clone()));
    }

    Ok(core)
}

/// Filter criteria for querying tasks.
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct TaskFilter {
    /// Include only tasks with one of these statuses.
    pub statuses: Option<Vec<TaskStatus>>,
    /// Tasks assigned to this project.
    pub project: Option<FileReference>,
    /// Tasks directly assigned to this area.
    pub area: Option<FileReference>,
    /// Filter by whether task has a project assigned.
    #[napi(js_name = "hasProject")]
    pub has_project: Option<bool>,
    /// Filter by whether task has an area assigned.
    #[napi(js_name = "hasArea")]
    pub has_area: Option<bool>,
    /// Tasks due before this date (ISO date string).
    #[napi(js_name = "dueBefore")]
    pub due_before: Option<String>,
    /// Tasks due after this date (ISO date string).
    #[napi(js_name = "dueAfter")]
    pub due_after: Option<String>,
    /// Include tasks from the archive subdirectory (default: false).
    #[napi(js_name = "includeArchive")]
    pub include_archive: Option<bool>,
}

fn task_filter_to_core(filter: &TaskFilter) -> std::result::Result<CoreTaskFilter, Error> {
    let mut core = CoreTaskFilter::new();

    if let Some(ref statuses) = filter.statuses {
        let core_statuses: Vec<CoreTaskStatus> = statuses.iter()
            .map(|s| (*s).into())
            .collect();
        core = core.with_statuses(core_statuses);
    }

    if let Some(ref project) = filter.project {
        core = core.in_project(CoreFileReference::from(project.clone()));
    }

    if let Some(ref area) = filter.area {
        core = core.in_area(CoreFileReference::from(area.clone()));
    }

    if let Some(has_project) = filter.has_project {
        if has_project {
            core = core.with_project();
        } else {
            core = core.without_project();
        }
    }

    if let Some(has_area) = filter.has_area {
        if has_area {
            core = core.with_area();
        } else {
            core = core.without_area();
        }
    }

    if let Some(ref due_before_str) = filter.due_before {
        let date = chrono::NaiveDate::parse_from_str(due_before_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid due_before date: {}", e)))?;
        core = core.due_before(date);
    }

    if let Some(ref due_after_str) = filter.due_after {
        let date = chrono::NaiveDate::parse_from_str(due_after_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid due_after date: {}", e)))?;
        core = core.due_after(date);
    }

    if filter.include_archive == Some(true) {
        core = core.include_archive_dir();
    }

    Ok(core)
}

// =============================================================================
// ValidationWarning
// =============================================================================

/// A validation warning about spec compliance.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct ValidationWarning {
    /// Human-readable warning message.
    pub message: String,
    /// Optional field name related to the warning.
    pub field: Option<String>,
}

impl From<CoreValidationWarning> for ValidationWarning {
    fn from(warning: CoreValidationWarning) -> Self {
        match warning {
            CoreValidationWarning::MultipleProjects { count } => ValidationWarning {
                message: format!(
                    "projects array has {} elements; spec requires exactly one project per task",
                    count
                ),
                field: Some("projects".to_string()),
            },
            CoreValidationWarning::MissingCompletedAt => ValidationWarning {
                message: "completed task is missing 'completed-at' field".to_string(),
                field: Some("completed-at".to_string()),
            },
            // Handle future variants
            _ => ValidationWarning {
                message: "unknown validation warning".to_string(),
                field: None,
            },
        }
    }
}

// =============================================================================
// DateTimeValue helpers
// =============================================================================

/// Convert a CoreDateTimeValue to an ISO string for JavaScript.
///
/// - Date-only values become "YYYY-MM-DD"
/// - DateTime values become "YYYY-MM-DDTHH:MM:SS"
pub fn datetime_to_string(value: &CoreDateTimeValue) -> String {
    value.to_string()
}

/// Parse an ISO string into a CoreDateTimeValue.
///
/// Accepts both date ("YYYY-MM-DD") and datetime ("YYYY-MM-DDTHH:MM:SS") formats.
pub fn string_to_datetime(s: &str) -> Result<CoreDateTimeValue> {
    s.parse::<CoreDateTimeValue>()
        .map_err(|e| Error::from_reason(e))
}

// =============================================================================
// Main SDK Entry Point
// =============================================================================

/// The main entry point for the Taskdn SDK.
///
/// Provides methods for listing, reading, creating, and updating tasks,
/// projects, and areas.
#[napi]
pub struct Taskdn {
    inner: CoreTaskdn,
}

#[napi]
impl Taskdn {
    /// Creates a new Taskdn instance with the given directory paths.
    ///
    /// # Arguments
    ///
    /// * `tasks_dir` - Path to the tasks directory
    /// * `projects_dir` - Path to the projects directory
    /// * `areas_dir` - Path to the areas directory
    ///
    /// # Errors
    ///
    /// Returns an error if any of the directories do not exist.
    #[napi(constructor)]
    pub fn new(tasks_dir: String, projects_dir: String, areas_dir: String) -> Result<Self> {
        let config = TaskdnConfig::new(
            PathBuf::from(tasks_dir),
            PathBuf::from(projects_dir),
            PathBuf::from(areas_dir),
        );
        let inner = CoreTaskdn::new(config)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(Self { inner })
    }

    /// Returns the configured tasks directory path.
    #[napi(getter)]
    pub fn tasks_dir(&self) -> String {
        self.inner.config().tasks_dir.to_string_lossy().to_string()
    }

    /// Returns the configured projects directory path.
    #[napi(getter)]
    pub fn projects_dir(&self) -> String {
        self.inner.config().projects_dir.to_string_lossy().to_string()
    }

    /// Returns the configured areas directory path.
    #[napi(getter)]
    pub fn areas_dir(&self) -> String {
        self.inner.config().areas_dir.to_string_lossy().to_string()
    }

    // =========================================================================
    // Task Read Operations
    // =========================================================================

    /// Get a single task by path.
    ///
    /// # Arguments
    /// * `path` - Path to the task file (absolute or relative to tasks_dir)
    ///
    /// # Errors
    /// Returns an error if the file doesn't exist or cannot be parsed.
    #[napi(js_name = "getTask")]
    pub fn get_task(&self, path: String) -> Result<Task> {
        self.inner
            .get_task(&path)
            .map(Task::from)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// List tasks matching a filter.
    ///
    /// Invalid files are silently skipped.
    ///
    /// # Arguments
    /// * `filter` - Optional filter criteria for matching tasks
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    #[napi(js_name = "listTasks")]
    pub fn list_tasks(&self, filter: Option<TaskFilter>) -> Result<Vec<Task>> {
        let core_filter = match filter {
            Some(f) => task_filter_to_core(&f)?,
            None => CoreTaskFilter::new(),
        };

        self.inner
            .list_tasks(&core_filter)
            .map(|tasks| tasks.into_iter().map(Task::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Count tasks matching a filter (more efficient than list).
    ///
    /// # Arguments
    /// * `filter` - Optional filter criteria for matching tasks
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    #[napi(js_name = "countTasks")]
    pub fn count_tasks(&self, filter: Option<TaskFilter>) -> Result<u32> {
        let core_filter = match filter {
            Some(f) => task_filter_to_core(&f)?,
            None => CoreTaskFilter::new(),
        };

        self.inner
            .count_tasks(&core_filter)
            .map(|count| count as u32)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Create Operations
    // =========================================================================

    /// Create a new task, returns the path where it was created.
    ///
    /// # Arguments
    /// * `task` - The task data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    #[napi(js_name = "createTask")]
    pub fn create_task(&self, task: NewTask) -> Result<String> {
        let core_task = CoreNewTask::try_from(task)?;

        self.inner
            .create_task(core_task)
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Quick capture: create an inbox task with just a title.
    ///
    /// # Arguments
    /// * `title` - The task title
    ///
    /// # Returns
    /// The path where the task was created.
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    #[napi(js_name = "createInboxTask")]
    pub fn create_inbox_task(&self, title: String) -> Result<String> {
        self.inner
            .create_inbox_task(&title)
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Update Operations
    // =========================================================================

    /// Update a task with partial changes.
    ///
    /// Automatically updates `updatedAt` and sets `completedAt` when
    /// transitioning to Done or Dropped.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "updateTask")]
    pub fn update_task(&self, path: String, updates: TaskUpdates) -> Result<()> {
        let core_updates = task_updates_to_core(&updates)?;

        self.inner
            .update_task(&path, core_updates)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Status Transition Operations
    // =========================================================================

    /// Mark a task as done (sets `completedAt` automatically).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "completeTask")]
    pub fn complete_task(&self, path: String) -> Result<()> {
        self.inner
            .complete_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Mark a task as dropped (sets `completedAt` automatically).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "dropTask")]
    pub fn drop_task(&self, path: String) -> Result<()> {
        self.inner
            .drop_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Start working on a task (status -> InProgress).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "startTask")]
    pub fn start_task(&self, path: String) -> Result<()> {
        self.inner
            .start_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Block a task (status -> Blocked).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "blockTask")]
    pub fn block_task(&self, path: String) -> Result<()> {
        self.inner
            .block_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Archive Operations
    // =========================================================================

    /// Move a task to the archive subdirectory.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Returns
    /// The new path in the archive directory.
    ///
    /// # Errors
    /// Returns an error if the file cannot be moved.
    #[napi(js_name = "archiveTask")]
    pub fn archive_task(&self, path: String) -> Result<String> {
        self.inner
            .archive_task(&path)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Restore a task from the archive.
    ///
    /// # Arguments
    /// * `path` - Path to the archived task file
    ///
    /// # Returns
    /// The new path in the tasks directory.
    ///
    /// # Errors
    /// Returns an error if the file cannot be moved.
    #[napi(js_name = "unarchiveTask")]
    pub fn unarchive_task(&self, path: String) -> Result<String> {
        self.inner
            .unarchive_task(&path)
            .map(|p| p.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Delete Operations
    // =========================================================================

    /// Permanently delete a task file.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    #[napi(js_name = "deleteTask")]
    pub fn delete_task(&self, path: String) -> Result<()> {
        self.inner
            .delete_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Task Validation Operations
    // =========================================================================

    /// Get validation warnings for a task.
    ///
    /// Validation warnings are advisory - they indicate the task may not fully
    /// comply with the Taskdn specification, but is still usable.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Returns
    /// A list of validation warnings. Empty if the task fully complies.
    ///
    /// # Errors
    /// Returns an error if the file cannot be read.
    #[napi(js_name = "getTaskWarnings")]
    pub fn get_task_warnings(&self, path: String) -> Result<Vec<ValidationWarning>> {
        let task = self.inner
            .get_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(task.validate().into_iter().map(ValidationWarning::from).collect())
    }
}
