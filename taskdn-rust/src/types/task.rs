//! Task entity and related types.

use super::{DateTimeValue, FileReference};
use chrono::NaiveDate;
use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;

/// Status of a task.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
#[non_exhaustive]
pub enum TaskStatus {
    /// New task, needs triage.
    #[default]
    Inbox,
    /// Deprioritized, might do someday.
    Icebox,
    /// Ready to work on.
    Ready,
    /// Currently being worked on.
    InProgress,
    /// Waiting on something external.
    Blocked,
    /// Abandoned, won't be completed.
    Dropped,
    /// Successfully completed.
    Done,
}

impl TaskStatus {
    /// Returns true if this status represents a completed state (done or dropped).
    #[must_use]
    pub fn is_completed(&self) -> bool {
        matches!(self, Self::Done | Self::Dropped)
    }

    /// Returns true if this status represents an active state.
    ///
    /// Active means the task is not completed (done/dropped) and not in inbox/icebox.
    #[must_use]
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Ready | Self::InProgress | Self::Blocked)
    }

    /// Returns the canonical string representation (lowercase, hyphenated).
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Inbox => "inbox",
            Self::Icebox => "icebox",
            Self::Ready => "ready",
            Self::InProgress => "in-progress",
            Self::Blocked => "blocked",
            Self::Dropped => "dropped",
            Self::Done => "done",
        }
    }
}

impl FromStr for TaskStatus {
    type Err = String;

    /// Parse from string (case-insensitive, handles "in-progress" and "in\_progress").
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().replace('_', "-").as_str() {
            "inbox" => Ok(Self::Inbox),
            "icebox" => Ok(Self::Icebox),
            "ready" => Ok(Self::Ready),
            "in-progress" => Ok(Self::InProgress),
            "blocked" => Ok(Self::Blocked),
            "dropped" => Ok(Self::Dropped),
            "done" => Ok(Self::Done),
            _ => Err(format!("invalid task status: {s}")),
        }
    }
}

impl std::fmt::Display for TaskStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// A parsed task file.
#[derive(Debug, Clone, PartialEq)]
pub struct Task {
    // Identity
    /// Absolute path to the task file.
    pub path: PathBuf,

    // Required frontmatter
    /// The task title.
    pub title: String,
    /// Current status of the task.
    pub status: TaskStatus,
    /// When the task was created.
    pub created_at: DateTimeValue,
    /// When the task was last updated.
    pub updated_at: DateTimeValue,

    // Optional frontmatter
    /// When the task was completed (set automatically when status becomes done/dropped).
    pub completed_at: Option<DateTimeValue>,
    /// When the task is due.
    pub due: Option<DateTimeValue>,
    /// Date the task is scheduled to be worked on.
    pub scheduled: Option<NaiveDate>,
    /// Date until which the task is deferred (hidden until this date).
    pub defer_until: Option<NaiveDate>,
    /// Reference to the project this task belongs to.
    pub project: Option<FileReference>,
    /// Reference to the area this task belongs to.
    pub area: Option<FileReference>,

    // Preserved content
    /// Markdown body (everything after frontmatter).
    pub body: String,
    /// Unknown frontmatter fields (preserved on write).
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl Task {
    /// Returns the filename without path (e.g., "my-task.md").
    #[must_use]
    pub fn filename(&self) -> &str {
        self.path.file_name().and_then(|n| n.to_str()).unwrap_or("")
    }

    /// Returns true if this task is in the archive subdirectory.
    #[must_use]
    pub fn is_archived(&self) -> bool {
        self.path.components().any(|c| c.as_os_str() == "archive")
    }

    /// Returns true if this task is "active" (not done, dropped, or archived).
    #[must_use]
    pub fn is_active(&self) -> bool {
        !self.status.is_completed() && !self.is_archived()
    }
}

/// Parsed task content without a file path.
///
/// Use this when parsing from a string rather than reading from disk.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedTask {
    /// The task title.
    pub title: String,
    /// Current status of the task.
    pub status: TaskStatus,
    /// When the task was created.
    pub created_at: DateTimeValue,
    /// When the task was last updated.
    pub updated_at: DateTimeValue,
    /// When the task was completed.
    pub completed_at: Option<DateTimeValue>,
    /// When the task is due.
    pub due: Option<DateTimeValue>,
    /// Date the task is scheduled to be worked on.
    pub scheduled: Option<NaiveDate>,
    /// Date until which the task is deferred.
    pub defer_until: Option<NaiveDate>,
    /// Reference to the project this task belongs to.
    pub project: Option<FileReference>,
    /// Reference to the area this task belongs to.
    pub area: Option<FileReference>,
    /// Markdown body.
    pub body: String,
    /// Unknown frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl ParsedTask {
    /// Convert to a Task by associating with a file path.
    #[must_use]
    pub fn with_path(self, path: impl Into<PathBuf>) -> Task {
        Task {
            path: path.into(),
            title: self.title,
            status: self.status,
            created_at: self.created_at,
            updated_at: self.updated_at,
            completed_at: self.completed_at,
            due: self.due,
            scheduled: self.scheduled,
            defer_until: self.defer_until,
            project: self.project,
            area: self.area,
            body: self.body,
            extra: self.extra,
        }
    }
}

/// Data for creating a new task.
///
/// Unlike `Task`, this doesn't include path, `created_at`, `updated_at`, or
/// `completed_at` (SDK sets these automatically).
#[derive(Debug, Clone, Default)]
pub struct NewTask {
    /// The task title (required).
    pub title: String,
    /// Initial status (defaults to Inbox).
    pub status: TaskStatus,
    /// Optional custom filename (generated from title if None).
    pub filename: Option<String>,
    /// When the task is due.
    pub due: Option<DateTimeValue>,
    /// Date the task is scheduled to be worked on.
    pub scheduled: Option<NaiveDate>,
    /// Date until which the task is deferred.
    pub defer_until: Option<NaiveDate>,
    /// Reference to the project this task belongs to.
    pub project: Option<FileReference>,
    /// Reference to the area this task belongs to.
    pub area: Option<FileReference>,
    /// Markdown body content.
    pub body: String,
    /// Additional frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl NewTask {
    /// Create a new task with the given title. Status defaults to Inbox.
    #[must_use]
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            status: TaskStatus::Inbox,
            ..Default::default()
        }
    }

    /// Set the status.
    #[must_use]
    pub fn with_status(mut self, status: TaskStatus) -> Self {
        self.status = status;
        self
    }

    /// Set a custom filename.
    #[must_use]
    pub fn with_filename(mut self, filename: impl Into<String>) -> Self {
        self.filename = Some(filename.into());
        self
    }

    /// Set the due date/datetime.
    #[must_use]
    pub fn with_due(mut self, due: impl Into<DateTimeValue>) -> Self {
        self.due = Some(due.into());
        self
    }

    /// Set the scheduled date.
    #[must_use]
    pub fn with_scheduled(mut self, scheduled: NaiveDate) -> Self {
        self.scheduled = Some(scheduled);
        self
    }

    /// Set the defer until date.
    #[must_use]
    pub fn with_defer_until(mut self, defer_until: NaiveDate) -> Self {
        self.defer_until = Some(defer_until);
        self
    }

    /// Assign to a project.
    #[must_use]
    pub fn in_project(mut self, project: impl Into<FileReference>) -> Self {
        self.project = Some(project.into());
        self
    }

    /// Assign to an area.
    #[must_use]
    pub fn in_area(mut self, area: impl Into<FileReference>) -> Self {
        self.area = Some(area.into());
        self
    }

    /// Set the body content.
    #[must_use]
    pub fn with_body(mut self, body: impl Into<String>) -> Self {
        self.body = body.into();
        self
    }
}

/// Partial updates for a task.
///
/// Uses the double-Option pattern: `None` means "don't change",
/// `Some(None)` means "clear the field", `Some(Some(x))` means "set to x".
#[derive(Debug, Clone, Default)]
pub struct TaskUpdates {
    /// New title (None = don't change).
    pub title: Option<String>,
    /// New status (None = don't change).
    pub status: Option<TaskStatus>,
    /// New due date (None = don't change, Some(None) = clear, Some(Some(x)) = set).
    pub due: Option<Option<DateTimeValue>>,
    /// New scheduled date.
    pub scheduled: Option<Option<NaiveDate>>,
    /// New defer until date.
    pub defer_until: Option<Option<NaiveDate>>,
    /// New project reference.
    pub project: Option<Option<FileReference>>,
    /// New area reference.
    pub area: Option<Option<FileReference>>,
}

impl TaskUpdates {
    /// Create a new empty updates struct.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Set a new title.
    #[must_use]
    pub fn title(mut self, title: impl Into<String>) -> Self {
        self.title = Some(title.into());
        self
    }

    /// Set a new status.
    #[must_use]
    pub fn status(mut self, status: TaskStatus) -> Self {
        self.status = Some(status);
        self
    }

    /// Set a new due date.
    #[must_use]
    pub fn due(mut self, due: impl Into<DateTimeValue>) -> Self {
        self.due = Some(Some(due.into()));
        self
    }

    /// Clear the due date.
    #[must_use]
    pub fn clear_due(mut self) -> Self {
        self.due = Some(None);
        self
    }

    /// Set a new scheduled date.
    #[must_use]
    pub fn scheduled(mut self, scheduled: NaiveDate) -> Self {
        self.scheduled = Some(Some(scheduled));
        self
    }

    /// Clear the scheduled date.
    #[must_use]
    pub fn clear_scheduled(mut self) -> Self {
        self.scheduled = Some(None);
        self
    }

    /// Set a new defer until date.
    #[must_use]
    pub fn defer_until(mut self, defer_until: NaiveDate) -> Self {
        self.defer_until = Some(Some(defer_until));
        self
    }

    /// Clear the defer until date.
    #[must_use]
    pub fn clear_defer_until(mut self) -> Self {
        self.defer_until = Some(None);
        self
    }

    /// Set a new project reference.
    #[must_use]
    pub fn project(mut self, project: impl Into<FileReference>) -> Self {
        self.project = Some(Some(project.into()));
        self
    }

    /// Clear the project reference.
    #[must_use]
    pub fn clear_project(mut self) -> Self {
        self.project = Some(None);
        self
    }

    /// Set a new area reference.
    #[must_use]
    pub fn area(mut self, area: impl Into<FileReference>) -> Self {
        self.area = Some(Some(area.into()));
        self
    }

    /// Clear the area reference.
    #[must_use]
    pub fn clear_area(mut self) -> Self {
        self.area = Some(None);
        self
    }

    /// Returns true if no updates are specified.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.status.is_none()
            && self.due.is_none()
            && self.scheduled.is_none()
            && self.defer_until.is_none()
            && self.project.is_none()
            && self.area.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod task_status {
        use super::*;

        #[test]
        fn parse_lowercase() {
            assert_eq!("inbox".parse::<TaskStatus>().unwrap(), TaskStatus::Inbox);
            assert_eq!("ready".parse::<TaskStatus>().unwrap(), TaskStatus::Ready);
            assert_eq!(
                "in-progress".parse::<TaskStatus>().unwrap(),
                TaskStatus::InProgress
            );
        }

        #[test]
        fn parse_case_insensitive() {
            assert_eq!("INBOX".parse::<TaskStatus>().unwrap(), TaskStatus::Inbox);
            assert_eq!("Ready".parse::<TaskStatus>().unwrap(), TaskStatus::Ready);
            assert_eq!(
                "IN-PROGRESS".parse::<TaskStatus>().unwrap(),
                TaskStatus::InProgress
            );
        }

        #[test]
        fn parse_underscore_variant() {
            assert_eq!(
                "in_progress".parse::<TaskStatus>().unwrap(),
                TaskStatus::InProgress
            );
        }

        #[test]
        fn parse_invalid() {
            assert!("invalid".parse::<TaskStatus>().is_err());
        }

        #[test]
        fn as_str_returns_canonical() {
            assert_eq!(TaskStatus::Inbox.as_str(), "inbox");
            assert_eq!(TaskStatus::InProgress.as_str(), "in-progress");
        }

        #[test]
        fn is_completed() {
            assert!(TaskStatus::Done.is_completed());
            assert!(TaskStatus::Dropped.is_completed());
            assert!(!TaskStatus::Ready.is_completed());
            assert!(!TaskStatus::Inbox.is_completed());
        }

        #[test]
        fn is_active() {
            assert!(TaskStatus::Ready.is_active());
            assert!(TaskStatus::InProgress.is_active());
            assert!(TaskStatus::Blocked.is_active());
            assert!(!TaskStatus::Inbox.is_active());
            assert!(!TaskStatus::Done.is_active());
        }
    }

    mod task {
        use super::*;
        use std::path::Path;

        fn sample_task(path: impl AsRef<Path>) -> Task {
            Task {
                path: path.as_ref().to_path_buf(),
                title: "Test Task".to_string(),
                status: TaskStatus::Ready,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn filename_extracts_correctly() {
            let task = sample_task("/path/to/tasks/my-task.md");
            assert_eq!(task.filename(), "my-task.md");
        }

        #[test]
        fn is_archived_detects_archive_path() {
            let archived = sample_task("/path/to/tasks/archive/old-task.md");
            assert!(archived.is_archived());

            let not_archived = sample_task("/path/to/tasks/my-task.md");
            assert!(!not_archived.is_archived());
        }

        #[test]
        fn is_active_considers_status_and_archive() {
            let active = sample_task("/path/to/tasks/my-task.md");
            assert!(active.is_active());

            let mut done = sample_task("/path/to/tasks/done-task.md");
            done.status = TaskStatus::Done;
            assert!(!done.is_active());

            let archived = sample_task("/path/to/tasks/archive/old-task.md");
            assert!(!archived.is_active());
        }
    }

    mod new_task {
        use super::*;

        #[test]
        fn new_defaults_to_inbox() {
            let task = NewTask::new("Test");
            assert_eq!(task.status, TaskStatus::Inbox);
        }

        #[test]
        fn builder_pattern() {
            let task = NewTask::new("Test")
                .with_status(TaskStatus::Ready)
                .in_project("[[My Project]]")
                .with_body("Some content");

            assert_eq!(task.status, TaskStatus::Ready);
            assert!(task.project.is_some());
            assert_eq!(task.body, "Some content");
        }
    }

    mod task_updates {
        use super::*;

        #[test]
        fn empty_updates() {
            let updates = TaskUpdates::new();
            assert!(updates.is_empty());
        }

        #[test]
        fn with_title() {
            let updates = TaskUpdates::new().title("New Title");
            assert!(!updates.is_empty());
            assert_eq!(updates.title, Some("New Title".to_string()));
        }

        #[test]
        fn clear_due() {
            let updates = TaskUpdates::new().clear_due();
            assert_eq!(updates.due, Some(None));
        }

        #[test]
        fn set_due() {
            let due: DateTimeValue = "2025-06-01".parse().unwrap();
            let updates = TaskUpdates::new().due(due.clone());
            assert_eq!(updates.due, Some(Some(due)));
        }
    }
}
