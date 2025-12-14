//! NAPI-RS bindings for the Taskdn Rust SDK.
//!
//! This is a thin wrapper that exposes the Rust SDK to Node.js/Bun environments.
//! All business logic remains in the Rust SDK - this layer only handles type
//! conversion between Rust and JavaScript.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;
use std::path::PathBuf;
use taskdn::{
    TaskdnConfig, Taskdn as CoreTaskdn,
    TaskFilter as CoreTaskFilter,
    ProjectFilter as CoreProjectFilter,
    AreaFilter as CoreAreaFilter,
    FileChangeKind as CoreFileChangeKind,
    VaultEvent as CoreVaultEvent,
};
use taskdn::types::{
    TaskStatus as CoreTaskStatus,
    ProjectStatus as CoreProjectStatus,
    AreaStatus as CoreAreaStatus,
    FileReference as CoreFileReference,
    DateTimeValue as CoreDateTimeValue,
    Task as CoreTask,
    NewTask as CoreNewTask,
    TaskUpdates as CoreTaskUpdates,
    Project as CoreProject,
    NewProject as CoreNewProject,
    ProjectUpdates as CoreProjectUpdates,
    Area as CoreArea,
    NewArea as CoreNewArea,
    AreaUpdates as CoreAreaUpdates,
};
use taskdn::validation::ValidationWarning as CoreValidationWarning;

// =============================================================================
// Helper: YAML to JSON conversion
// =============================================================================

/// Convert a serde_yaml::Value to serde_json::Value.
///
/// This allows us to expose the `extra` field (unknown frontmatter fields)
/// to JavaScript as a plain object.
fn yaml_to_json(value: &serde_yaml::Value) -> serde_json::Value {
    match value {
        serde_yaml::Value::Null => serde_json::Value::Null,
        serde_yaml::Value::Bool(b) => serde_json::Value::Bool(*b),
        serde_yaml::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                serde_json::Value::Number(i.into())
            } else if let Some(u) = n.as_u64() {
                serde_json::Value::Number(u.into())
            } else if let Some(f) = n.as_f64() {
                serde_json::Number::from_f64(f)
                    .map(serde_json::Value::Number)
                    .unwrap_or(serde_json::Value::Null)
            } else {
                serde_json::Value::Null
            }
        }
        serde_yaml::Value::String(s) => serde_json::Value::String(s.clone()),
        serde_yaml::Value::Sequence(seq) => {
            serde_json::Value::Array(seq.iter().map(yaml_to_json).collect())
        }
        serde_yaml::Value::Mapping(map) => {
            let obj: serde_json::Map<String, serde_json::Value> = map
                .iter()
                .filter_map(|(k, v)| {
                    k.as_str().map(|key| (key.to_string(), yaml_to_json(v)))
                })
                .collect();
            serde_json::Value::Object(obj)
        }
        serde_yaml::Value::Tagged(tagged) => yaml_to_json(&tagged.value),
    }
}

/// Convert extra fields HashMap to JSON-compatible HashMap.
fn convert_extra(extra: &HashMap<String, serde_yaml::Value>) -> HashMap<String, serde_json::Value> {
    extra.iter().map(|(k, v)| (k.clone(), yaml_to_json(v))).collect()
}

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
    /// Additional frontmatter fields not part of the Taskdn spec.
    /// These are preserved during round-trips.
    pub extra: HashMap<String, serde_json::Value>,
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
            extra: convert_extra(&task.extra),
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

/// A validation error for a specific file.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct ValidationError {
    /// Path to the file that failed validation.
    pub path: String,
    /// Human-readable error message.
    pub message: String,
}

/// Result of a batch operation.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct BatchResult {
    /// Paths of items that were successfully processed.
    pub succeeded: Vec<String>,
    /// Items that failed processing.
    pub failed: Vec<ValidationError>,
}

// =============================================================================
// Project Types
// =============================================================================

/// A parsed project from a markdown file.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct Project {
    /// Absolute path to the project file.
    pub path: String,
    /// The project title.
    pub title: String,
    /// Current status of the project.
    pub status: Option<ProjectStatus>,
    /// Optional unique ID for the project.
    #[napi(js_name = "uniqueId")]
    pub unique_id: Option<String>,
    /// Project description.
    pub description: Option<String>,
    /// When the project starts (ISO date string).
    #[napi(js_name = "startDate")]
    pub start_date: Option<String>,
    /// When the project ends (ISO date string).
    #[napi(js_name = "endDate")]
    pub end_date: Option<String>,
    /// Reference to the area this project belongs to.
    pub area: Option<FileReference>,
    /// References to projects blocking this one.
    #[napi(js_name = "blockedBy")]
    pub blocked_by: Vec<FileReference>,
    /// Markdown body (everything after frontmatter).
    pub body: String,
    /// Additional frontmatter fields not part of the Taskdn spec.
    /// These are preserved during round-trips.
    pub extra: HashMap<String, serde_json::Value>,
}

impl From<CoreProject> for Project {
    fn from(project: CoreProject) -> Self {
        Project {
            path: project.path.to_string_lossy().to_string(),
            title: project.title,
            status: project.status.map(|s| s.into()),
            unique_id: project.unique_id,
            description: project.description,
            start_date: project.start_date.map(|d| d.format("%Y-%m-%d").to_string()),
            end_date: project.end_date.map(|d| d.format("%Y-%m-%d").to_string()),
            area: project.area.map(|a| a.into()),
            blocked_by: project.blocked_by.into_iter().map(|r| r.into()).collect(),
            body: project.body,
            extra: convert_extra(&project.extra),
        }
    }
}

/// Data for creating a new project.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct NewProject {
    /// The project title (required).
    pub title: String,
    /// Initial status.
    pub status: Option<ProjectStatus>,
    /// Project description.
    pub description: Option<String>,
    /// When the project starts (ISO date string).
    #[napi(js_name = "startDate")]
    pub start_date: Option<String>,
    /// When the project ends (ISO date string).
    #[napi(js_name = "endDate")]
    pub end_date: Option<String>,
    /// Reference to the area this project belongs to.
    pub area: Option<FileReference>,
    /// Markdown body content.
    pub body: Option<String>,
    /// Optional custom filename (generated from title if not provided).
    pub filename: Option<String>,
}

impl TryFrom<NewProject> for CoreNewProject {
    type Error = Error;

    fn try_from(project: NewProject) -> std::result::Result<Self, Self::Error> {
        let mut new_project = CoreNewProject::new(&project.title);

        if let Some(status) = project.status {
            new_project = new_project.with_status(status.into());
        }

        if let Some(description) = project.description {
            new_project = new_project.with_description(description);
        }

        if let Some(start_str) = project.start_date {
            let start = chrono::NaiveDate::parse_from_str(&start_str, "%Y-%m-%d")
                .map_err(|e| Error::from_reason(format!("invalid start_date: {}", e)))?;
            new_project = new_project.with_start_date(start);
        }

        if let Some(end_str) = project.end_date {
            let end = chrono::NaiveDate::parse_from_str(&end_str, "%Y-%m-%d")
                .map_err(|e| Error::from_reason(format!("invalid end_date: {}", e)))?;
            new_project = new_project.with_end_date(end);
        }

        if let Some(area) = project.area {
            new_project = new_project.in_area(CoreFileReference::from(area));
        }

        if let Some(body) = project.body {
            new_project = new_project.with_body(body);
        }

        if let Some(filename) = project.filename {
            new_project = new_project.with_filename(filename);
        }

        Ok(new_project)
    }
}

/// Partial updates for a project.
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct ProjectUpdates {
    /// New title.
    pub title: Option<String>,
    /// New status.
    pub status: Option<ProjectStatus>,
    /// New description.
    pub description: Option<String>,
    /// New start date (ISO date string).
    #[napi(js_name = "startDate")]
    pub start_date: Option<String>,
    /// New end date (ISO date string).
    #[napi(js_name = "endDate")]
    pub end_date: Option<String>,
    /// New area reference.
    pub area: Option<FileReference>,
}

fn project_updates_to_core(updates: &ProjectUpdates) -> std::result::Result<CoreProjectUpdates, Error> {
    let mut core = CoreProjectUpdates::new();

    if let Some(ref title) = updates.title {
        core = core.title(title);
    }

    if let Some(status) = updates.status {
        core = core.status(status.into());
    }

    if let Some(ref description) = updates.description {
        core = core.description(description);
    }

    if let Some(ref start_str) = updates.start_date {
        let start = chrono::NaiveDate::parse_from_str(start_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid start_date: {}", e)))?;
        core = core.start_date(start);
    }

    if let Some(ref end_str) = updates.end_date {
        let end = chrono::NaiveDate::parse_from_str(end_str, "%Y-%m-%d")
            .map_err(|e| Error::from_reason(format!("invalid end_date: {}", e)))?;
        core = core.end_date(end);
    }

    if let Some(ref area) = updates.area {
        core = core.area(CoreFileReference::from(area.clone()));
    }

    Ok(core)
}

/// Filter criteria for querying projects.
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct ProjectFilter {
    /// Include only projects with one of these statuses.
    pub statuses: Option<Vec<ProjectStatus>>,
    /// Projects assigned to this area.
    pub area: Option<FileReference>,
    /// Filter by whether project has an area assigned.
    #[napi(js_name = "hasArea")]
    pub has_area: Option<bool>,
}

fn project_filter_to_core(filter: &ProjectFilter) -> std::result::Result<CoreProjectFilter, Error> {
    let mut core = CoreProjectFilter::new();

    if let Some(ref statuses) = filter.statuses {
        let core_statuses: Vec<CoreProjectStatus> = statuses.iter()
            .map(|s| (*s).into())
            .collect();
        core = core.with_statuses(core_statuses);
    }

    if let Some(ref area) = filter.area {
        core = core.in_area(CoreFileReference::from(area.clone()));
    }

    if let Some(has_area) = filter.has_area {
        if has_area {
            core = core.with_area();
        } else {
            core = core.without_area();
        }
    }

    Ok(core)
}

// =============================================================================
// Area Types
// =============================================================================

/// A parsed area from a markdown file.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct Area {
    /// Absolute path to the area file.
    pub path: String,
    /// The area title.
    pub title: String,
    /// Current status of the area.
    pub status: Option<AreaStatus>,
    /// The type of area (from `type` field in spec).
    #[napi(js_name = "areaType")]
    pub area_type: Option<String>,
    /// Area description.
    pub description: Option<String>,
    /// Markdown body (everything after frontmatter).
    pub body: String,
    /// Additional frontmatter fields not part of the Taskdn spec.
    /// These are preserved during round-trips.
    pub extra: HashMap<String, serde_json::Value>,
}

impl From<CoreArea> for Area {
    fn from(area: CoreArea) -> Self {
        Area {
            path: area.path.to_string_lossy().to_string(),
            title: area.title,
            status: area.status.map(|s| s.into()),
            area_type: area.area_type,
            description: area.description,
            body: area.body,
            extra: convert_extra(&area.extra),
        }
    }
}

/// Data for creating a new area.
#[napi(object)]
#[derive(Debug, Clone)]
pub struct NewArea {
    /// The area title (required).
    pub title: String,
    /// Initial status.
    pub status: Option<AreaStatus>,
    /// The type of area.
    #[napi(js_name = "areaType")]
    pub area_type: Option<String>,
    /// Area description.
    pub description: Option<String>,
    /// Markdown body content.
    pub body: Option<String>,
    /// Optional custom filename (generated from title if not provided).
    pub filename: Option<String>,
}

impl TryFrom<NewArea> for CoreNewArea {
    type Error = Error;

    fn try_from(area: NewArea) -> std::result::Result<Self, Self::Error> {
        let mut new_area = CoreNewArea::new(&area.title);

        if let Some(status) = area.status {
            new_area = new_area.with_status(status.into());
        }

        if let Some(area_type) = area.area_type {
            new_area = new_area.with_area_type(area_type);
        }

        if let Some(description) = area.description {
            new_area = new_area.with_description(description);
        }

        if let Some(body) = area.body {
            new_area = new_area.with_body(body);
        }

        if let Some(filename) = area.filename {
            new_area = new_area.with_filename(filename);
        }

        Ok(new_area)
    }
}

/// Partial updates for an area.
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct AreaUpdates {
    /// New title.
    pub title: Option<String>,
    /// New status.
    pub status: Option<AreaStatus>,
    /// New area type.
    #[napi(js_name = "areaType")]
    pub area_type: Option<String>,
    /// New description.
    pub description: Option<String>,
}

fn area_updates_to_core(updates: &AreaUpdates) -> CoreAreaUpdates {
    let mut core = CoreAreaUpdates::new();

    if let Some(ref title) = updates.title {
        core = core.title(title);
    }

    if let Some(status) = updates.status {
        core = core.status(status.into());
    }

    if let Some(ref area_type) = updates.area_type {
        core = core.area_type(area_type);
    }

    if let Some(ref description) = updates.description {
        core = core.description(description);
    }

    core
}

/// Filter criteria for querying areas.
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct AreaFilter {
    /// Include only areas with one of these statuses.
    pub statuses: Option<Vec<AreaStatus>>,
}

fn area_filter_to_core(filter: &AreaFilter) -> CoreAreaFilter {
    let mut core = CoreAreaFilter::new();

    if let Some(ref statuses) = filter.statuses {
        let core_statuses: Vec<CoreAreaStatus> = statuses.iter()
            .map(|s| (*s).into())
            .collect();
        core = core.with_statuses(core_statuses);
    }

    core
}

// =============================================================================
// Event Types
// =============================================================================

/// The kind of file system change that occurred.
#[napi(string_enum)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileChangeKind {
    /// A new file was created.
    #[napi(value = "created")]
    Created,
    /// An existing file was modified.
    #[napi(value = "modified")]
    Modified,
    /// A file was deleted.
    #[napi(value = "deleted")]
    Deleted,
}

impl From<FileChangeKind> for CoreFileChangeKind {
    fn from(kind: FileChangeKind) -> Self {
        match kind {
            FileChangeKind::Created => CoreFileChangeKind::Created,
            FileChangeKind::Modified => CoreFileChangeKind::Modified,
            FileChangeKind::Deleted => CoreFileChangeKind::Deleted,
        }
    }
}

/// Parse a string into FileChangeKind.
fn parse_file_change_kind(s: &str) -> std::result::Result<CoreFileChangeKind, Error> {
    match s.to_lowercase().as_str() {
        "created" => Ok(CoreFileChangeKind::Created),
        "modified" => Ok(CoreFileChangeKind::Modified),
        "deleted" => Ok(CoreFileChangeKind::Deleted),
        _ => Err(Error::from_reason(format!(
            "invalid file change kind: '{}'. Expected 'created', 'modified', or 'deleted'",
            s
        ))),
    }
}

/// A typed event representing a change in the vault.
///
/// This is a discriminated union - check the `type` field to determine
/// which entity fields are populated:
///
/// - `taskCreated`, `taskUpdated`: `task` is defined
/// - `taskDeleted`: `path` is defined
/// - `projectCreated`, `projectUpdated`: `project` is defined
/// - `projectDeleted`: `path` is defined
/// - `areaCreated`, `areaUpdated`: `area` is defined
/// - `areaDeleted`: `path` is defined
#[napi(object)]
#[derive(Debug, Clone)]
pub struct VaultEvent {
    /// The type of event.
    /// One of: "taskCreated", "taskUpdated", "taskDeleted",
    /// "projectCreated", "projectUpdated", "projectDeleted",
    /// "areaCreated", "areaUpdated", "areaDeleted"
    #[napi(js_name = "type")]
    pub event_type: String,

    /// The task (for task events).
    pub task: Option<Task>,

    /// The project (for project events).
    pub project: Option<Project>,

    /// The area (for area events).
    pub area: Option<Area>,

    /// The path of the deleted file (for delete events).
    pub path: Option<String>,
}

impl From<CoreVaultEvent> for VaultEvent {
    fn from(event: CoreVaultEvent) -> Self {
        match event {
            CoreVaultEvent::TaskCreated(task) => VaultEvent {
                event_type: "taskCreated".to_string(),
                task: Some(Task::from(task)),
                project: None,
                area: None,
                path: None,
            },
            CoreVaultEvent::TaskUpdated(task) => VaultEvent {
                event_type: "taskUpdated".to_string(),
                task: Some(Task::from(task)),
                project: None,
                area: None,
                path: None,
            },
            CoreVaultEvent::TaskDeleted { path } => VaultEvent {
                event_type: "taskDeleted".to_string(),
                task: None,
                project: None,
                area: None,
                path: Some(path.to_string_lossy().to_string()),
            },
            CoreVaultEvent::ProjectCreated(project) => VaultEvent {
                event_type: "projectCreated".to_string(),
                task: None,
                project: Some(Project::from(project)),
                area: None,
                path: None,
            },
            CoreVaultEvent::ProjectUpdated(project) => VaultEvent {
                event_type: "projectUpdated".to_string(),
                task: None,
                project: Some(Project::from(project)),
                area: None,
                path: None,
            },
            CoreVaultEvent::ProjectDeleted { path } => VaultEvent {
                event_type: "projectDeleted".to_string(),
                task: None,
                project: None,
                area: None,
                path: Some(path.to_string_lossy().to_string()),
            },
            CoreVaultEvent::AreaCreated(area) => VaultEvent {
                event_type: "areaCreated".to_string(),
                task: None,
                project: None,
                area: Some(Area::from(area)),
                path: None,
            },
            CoreVaultEvent::AreaUpdated(area) => VaultEvent {
                event_type: "areaUpdated".to_string(),
                task: None,
                project: None,
                area: Some(Area::from(area)),
                path: None,
            },
            CoreVaultEvent::AreaDeleted { path } => VaultEvent {
                event_type: "areaDeleted".to_string(),
                task: None,
                project: None,
                area: None,
                path: Some(path.to_string_lossy().to_string()),
            },
            // Handle future variants
            _ => VaultEvent {
                event_type: "unknown".to_string(),
                task: None,
                project: None,
                area: None,
                path: None,
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

    /// Validate a task file for spec compliance.
    ///
    /// This method checks for hard validation errors (e.g., completed tasks
    /// missing `completed-at`). Use `getTaskWarnings` for advisory warnings.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Errors
    /// Returns an error if the task fails validation or cannot be read.
    #[napi(js_name = "validateTask")]
    pub fn validate_task(&self, path: String) -> Result<()> {
        self.inner
            .validate_task(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Validate all task files in the vault.
    ///
    /// Returns a list of validation errors. An empty list means all tasks are valid.
    /// This includes archived tasks.
    ///
    /// # Returns
    /// A list of validation errors, one per invalid task.
    #[napi(js_name = "validateAllTasks")]
    pub fn validate_all_tasks(&self) -> Vec<ValidationError> {
        self.inner
            .validate_all_tasks()
            .into_iter()
            .map(|(path, error)| ValidationError {
                path: path.to_string_lossy().to_string(),
                message: error.to_string(),
            })
            .collect()
    }

    // =========================================================================
    // Task Bulk Operations
    // =========================================================================

    /// Update all tasks matching a filter.
    ///
    /// This is a bulk operation that applies the same updates to multiple tasks.
    /// Unlike `updateTask`, this method does not throw on individual failures -
    /// instead it returns a result indicating which tasks succeeded and which failed.
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for selecting tasks to update
    /// * `updates` - Updates to apply to matching tasks
    ///
    /// # Returns
    /// A `BatchResult` with lists of succeeded and failed paths.
    #[napi(js_name = "updateTasksMatching")]
    pub fn update_tasks_matching(&self, filter: TaskFilter, updates: TaskUpdates) -> Result<BatchResult> {
        let core_filter = task_filter_to_core(&filter)?;
        let core_updates = task_updates_to_core(&updates)?;

        let result = self.inner.update_tasks_matching(&core_filter, &core_updates);

        Ok(BatchResult {
            succeeded: result.succeeded.into_iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect(),
            failed: result.failed.into_iter()
                .map(|(path, error)| ValidationError {
                    path: path.to_string_lossy().to_string(),
                    message: error.to_string(),
                })
                .collect(),
        })
    }

    // =========================================================================
    // Project Read Operations
    // =========================================================================

    /// Get a single project by path.
    ///
    /// # Arguments
    /// * `path` - Path to the project file (absolute or relative to projects_dir)
    ///
    /// # Errors
    /// Returns an error if the file doesn't exist or cannot be parsed.
    #[napi(js_name = "getProject")]
    pub fn get_project(&self, path: String) -> Result<Project> {
        self.inner
            .get_project(&path)
            .map(Project::from)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// List projects matching a filter.
    ///
    /// # Arguments
    /// * `filter` - Optional filter criteria for matching projects
    ///
    /// # Errors
    /// Returns an error if the projects directory cannot be read.
    #[napi(js_name = "listProjects")]
    pub fn list_projects(&self, filter: Option<ProjectFilter>) -> Result<Vec<Project>> {
        let core_filter = match filter {
            Some(f) => project_filter_to_core(&f)?,
            None => CoreProjectFilter::new(),
        };

        self.inner
            .list_projects(&core_filter)
            .map(|projects| projects.into_iter().map(Project::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Project Create Operations
    // =========================================================================

    /// Create a new project, returns the path where it was created.
    ///
    /// # Arguments
    /// * `project` - The project data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    #[napi(js_name = "createProject")]
    pub fn create_project(&self, project: NewProject) -> Result<String> {
        let core_project = CoreNewProject::try_from(project)?;

        self.inner
            .create_project(core_project)
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Project Update Operations
    // =========================================================================

    /// Update a project with partial changes.
    ///
    /// # Arguments
    /// * `path` - Path to the project file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "updateProject")]
    pub fn update_project(&self, path: String, updates: ProjectUpdates) -> Result<()> {
        let core_updates = project_updates_to_core(&updates)?;

        self.inner
            .update_project(&path, core_updates)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Project Delete Operations
    // =========================================================================

    /// Permanently delete a project file.
    ///
    /// # Arguments
    /// * `path` - Path to the project file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    #[napi(js_name = "deleteProject")]
    pub fn delete_project(&self, path: String) -> Result<()> {
        self.inner
            .delete_project(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Project Related Entity Operations
    // =========================================================================

    /// Get all tasks assigned to a project.
    ///
    /// # Arguments
    /// * `path` - Path to the project file
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    #[napi(js_name = "getTasksForProject")]
    pub fn get_tasks_for_project(&self, path: String) -> Result<Vec<Task>> {
        self.inner
            .get_tasks_for_project(&path)
            .map(|tasks| tasks.into_iter().map(Task::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Area Read Operations
    // =========================================================================

    /// Get a single area by path.
    ///
    /// # Arguments
    /// * `path` - Path to the area file (absolute or relative to areas_dir)
    ///
    /// # Errors
    /// Returns an error if the file doesn't exist or cannot be parsed.
    #[napi(js_name = "getArea")]
    pub fn get_area(&self, path: String) -> Result<Area> {
        self.inner
            .get_area(&path)
            .map(Area::from)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// List areas matching a filter.
    ///
    /// # Arguments
    /// * `filter` - Optional filter criteria for matching areas
    ///
    /// # Errors
    /// Returns an error if the areas directory cannot be read.
    #[napi(js_name = "listAreas")]
    pub fn list_areas(&self, filter: Option<AreaFilter>) -> Result<Vec<Area>> {
        let core_filter = match filter {
            Some(f) => area_filter_to_core(&f),
            None => CoreAreaFilter::new(),
        };

        self.inner
            .list_areas(&core_filter)
            .map(|areas| areas.into_iter().map(Area::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Area Create Operations
    // =========================================================================

    /// Create a new area, returns the path where it was created.
    ///
    /// # Arguments
    /// * `area` - The area data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    #[napi(js_name = "createArea")]
    pub fn create_area(&self, area: NewArea) -> Result<String> {
        let core_area = CoreNewArea::try_from(area)?;

        self.inner
            .create_area(core_area)
            .map(|path| path.to_string_lossy().to_string())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Area Update Operations
    // =========================================================================

    /// Update an area with partial changes.
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    #[napi(js_name = "updateArea")]
    pub fn update_area(&self, path: String, updates: AreaUpdates) -> Result<()> {
        let core_updates = area_updates_to_core(&updates);

        self.inner
            .update_area(&path, core_updates)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Area Delete Operations
    // =========================================================================

    /// Permanently delete an area file.
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    #[napi(js_name = "deleteArea")]
    pub fn delete_area(&self, path: String) -> Result<()> {
        self.inner
            .delete_area(&path)
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Area Related Entity Operations
    // =========================================================================

    /// Get all tasks assigned to an area (directly or via projects).
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the tasks/projects directories cannot be read.
    #[napi(js_name = "getTasksForArea")]
    pub fn get_tasks_for_area(&self, path: String) -> Result<Vec<Task>> {
        self.inner
            .get_tasks_for_area(&path)
            .map(|tasks| tasks.into_iter().map(Task::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Get all projects assigned to an area.
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the projects directory cannot be read.
    #[napi(js_name = "getProjectsForArea")]
    pub fn get_projects_for_area(&self, path: String) -> Result<Vec<Project>> {
        self.inner
            .get_projects_for_area(&path)
            .map(|projects| projects.into_iter().map(Project::from).collect())
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    // =========================================================================
    // Event Processing
    // =========================================================================

    /// Process a file change and return the corresponding vault event.
    ///
    /// This method takes a raw file system event and returns a typed `VaultEvent`
    /// if the file is relevant to the vault (i.e., a `.md` file in a watched directory).
    ///
    /// Returns `null` if the file is not a recognized task/project/area.
    ///
    /// # Arguments
    /// * `path` - The path to the changed file
    /// * `kind` - The type of change: "created", "modified", or "deleted"
    ///
    /// # Example
    ///
    /// ```typescript
    /// const event = sdk.processFileChange('./tasks/my-task.md', 'modified');
    /// if (event?.type === 'taskUpdated') {
    ///     console.log('Task updated:', event.task.title);
    /// }
    /// ```
    #[napi(js_name = "processFileChange")]
    pub fn process_file_change(&self, path: String, kind: String) -> Result<Option<VaultEvent>> {
        let core_kind = parse_file_change_kind(&kind)?;

        self.inner
            .process_file_change(&path, core_kind)
            .map(|opt| opt.map(VaultEvent::from))
            .map_err(|e| Error::from_reason(e.to_string()))
    }

    /// Returns the paths that should be watched for file changes.
    ///
    /// Returns the configured `tasksDir`, `projectsDir`, and `areasDir`.
    /// Consumers should set up their file watchers to recursively watch these directories.
    #[napi(js_name = "watchedPaths")]
    pub fn watched_paths(&self) -> Vec<String> {
        self.inner
            .watched_paths()
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect()
    }
}
