//! NAPI-RS bindings for the Taskdn Rust SDK.
//!
//! This is a thin wrapper that exposes the Rust SDK to Node.js/Bun environments.
//! All business logic remains in the Rust SDK - this layer only handles type
//! conversion between Rust and JavaScript.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::path::PathBuf;
use taskdn::{TaskdnConfig, Taskdn as CoreTaskdn};
use taskdn::types::{
    TaskStatus as CoreTaskStatus,
    ProjectStatus as CoreProjectStatus,
    AreaStatus as CoreAreaStatus,
    FileReference as CoreFileReference,
    DateTimeValue as CoreDateTimeValue,
};

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
}
