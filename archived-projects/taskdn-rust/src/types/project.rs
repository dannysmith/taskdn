//! Project entity and related types.

use super::FileReference;
use chrono::NaiveDate;
use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;

/// Status of a project.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
#[non_exhaustive]
pub enum ProjectStatus {
    /// Project is being planned.
    #[default]
    Planning,
    /// Project is ready to start.
    Ready,
    /// Project is blocked on something.
    Blocked,
    /// Project is actively being worked on.
    InProgress,
    /// Project is temporarily paused.
    Paused,
    /// Project is complete.
    Done,
}

impl ProjectStatus {
    /// Returns true if this status represents a completed state.
    #[must_use]
    pub fn is_completed(&self) -> bool {
        matches!(self, Self::Done)
    }

    /// Returns true if this status represents an active state.
    #[must_use]
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Ready | Self::InProgress | Self::Blocked)
    }

    /// Returns the canonical string representation (lowercase, hyphenated).
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Planning => "planning",
            Self::Ready => "ready",
            Self::Blocked => "blocked",
            Self::InProgress => "in-progress",
            Self::Paused => "paused",
            Self::Done => "done",
        }
    }
}

impl FromStr for ProjectStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().replace('_', "-").as_str() {
            "planning" => Ok(Self::Planning),
            "ready" => Ok(Self::Ready),
            "blocked" => Ok(Self::Blocked),
            "in-progress" => Ok(Self::InProgress),
            "paused" => Ok(Self::Paused),
            "done" => Ok(Self::Done),
            _ => Err(format!("invalid project status: {s}")),
        }
    }
}

impl std::fmt::Display for ProjectStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// A parsed project file.
#[derive(Debug, Clone, PartialEq)]
pub struct Project {
    /// Absolute path to the project file.
    pub path: PathBuf,

    // Required
    /// The project title.
    pub title: String,

    // Optional
    /// Unique identifier (for external references).
    pub unique_id: Option<String>,
    /// Current status of the project.
    pub status: Option<ProjectStatus>,
    /// Brief description of the project.
    pub description: Option<String>,
    /// Reference to the area this project belongs to.
    pub area: Option<FileReference>,
    /// When the project started.
    pub start_date: Option<NaiveDate>,
    /// When the project is expected to end.
    pub end_date: Option<NaiveDate>,
    /// Projects that must complete before this one can proceed.
    pub blocked_by: Vec<FileReference>,

    /// Markdown body.
    pub body: String,
    /// Unknown frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl Project {
    /// Returns the filename without path (e.g., "my-project.md").
    #[must_use]
    pub fn filename(&self) -> &str {
        self.path.file_name().and_then(|n| n.to_str()).unwrap_or("")
    }
}

/// Parsed project content without a file path.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedProject {
    /// The project title.
    pub title: String,
    /// Unique identifier.
    pub unique_id: Option<String>,
    /// Current status.
    pub status: Option<ProjectStatus>,
    /// Brief description.
    pub description: Option<String>,
    /// Reference to the area.
    pub area: Option<FileReference>,
    /// Start date.
    pub start_date: Option<NaiveDate>,
    /// End date.
    pub end_date: Option<NaiveDate>,
    /// Blocking projects.
    pub blocked_by: Vec<FileReference>,
    /// Markdown body.
    pub body: String,
    /// Unknown frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl ParsedProject {
    /// Convert to a Project by associating with a file path.
    #[must_use]
    pub fn with_path(self, path: impl Into<PathBuf>) -> Project {
        Project {
            path: path.into(),
            title: self.title,
            unique_id: self.unique_id,
            status: self.status,
            description: self.description,
            area: self.area,
            start_date: self.start_date,
            end_date: self.end_date,
            blocked_by: self.blocked_by,
            body: self.body,
            extra: self.extra,
        }
    }
}

/// Data for creating a new project.
#[derive(Debug, Clone, Default)]
pub struct NewProject {
    /// The project title (required).
    pub title: String,
    /// Optional custom filename.
    pub filename: Option<String>,
    /// Initial status.
    pub status: Option<ProjectStatus>,
    /// Brief description.
    pub description: Option<String>,
    /// Reference to the area.
    pub area: Option<FileReference>,
    /// Start date.
    pub start_date: Option<NaiveDate>,
    /// End date.
    pub end_date: Option<NaiveDate>,
    /// Markdown body.
    pub body: String,
    /// Additional frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl NewProject {
    /// Create a new project with the given title.
    #[must_use]
    pub fn new(title: impl Into<String>) -> Self {
        Self {
            title: title.into(),
            ..Default::default()
        }
    }

    /// Set a custom filename.
    #[must_use]
    pub fn with_filename(mut self, filename: impl Into<String>) -> Self {
        self.filename = Some(filename.into());
        self
    }

    /// Set the status.
    #[must_use]
    pub fn with_status(mut self, status: ProjectStatus) -> Self {
        self.status = Some(status);
        self
    }

    /// Set the description.
    #[must_use]
    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    /// Assign to an area.
    #[must_use]
    pub fn in_area(mut self, area: impl Into<FileReference>) -> Self {
        self.area = Some(area.into());
        self
    }

    /// Set the start date.
    #[must_use]
    pub fn with_start_date(mut self, date: NaiveDate) -> Self {
        self.start_date = Some(date);
        self
    }

    /// Set the end date.
    #[must_use]
    pub fn with_end_date(mut self, date: NaiveDate) -> Self {
        self.end_date = Some(date);
        self
    }

    /// Set the body content.
    #[must_use]
    pub fn with_body(mut self, body: impl Into<String>) -> Self {
        self.body = body.into();
        self
    }
}

/// Partial updates for a project.
#[derive(Debug, Clone, Default)]
pub struct ProjectUpdates {
    /// New title.
    pub title: Option<String>,
    /// New status.
    pub status: Option<Option<ProjectStatus>>,
    /// New description.
    pub description: Option<Option<String>>,
    /// New area reference.
    pub area: Option<Option<FileReference>>,
    /// New start date.
    pub start_date: Option<Option<NaiveDate>>,
    /// New end date.
    pub end_date: Option<Option<NaiveDate>>,
}

impl ProjectUpdates {
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
    pub fn status(mut self, status: ProjectStatus) -> Self {
        self.status = Some(Some(status));
        self
    }

    /// Clear the status.
    #[must_use]
    pub fn clear_status(mut self) -> Self {
        self.status = Some(None);
        self
    }

    /// Set a new description.
    #[must_use]
    pub fn description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(Some(description.into()));
        self
    }

    /// Clear the description.
    #[must_use]
    pub fn clear_description(mut self) -> Self {
        self.description = Some(None);
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

    /// Set a new start date.
    #[must_use]
    pub fn start_date(mut self, date: NaiveDate) -> Self {
        self.start_date = Some(Some(date));
        self
    }

    /// Clear the start date.
    #[must_use]
    pub fn clear_start_date(mut self) -> Self {
        self.start_date = Some(None);
        self
    }

    /// Set a new end date.
    #[must_use]
    pub fn end_date(mut self, date: NaiveDate) -> Self {
        self.end_date = Some(Some(date));
        self
    }

    /// Clear the end date.
    #[must_use]
    pub fn clear_end_date(mut self) -> Self {
        self.end_date = Some(None);
        self
    }

    /// Returns true if no updates are specified.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.status.is_none()
            && self.description.is_none()
            && self.area.is_none()
            && self.start_date.is_none()
            && self.end_date.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod project_status {
        use super::*;

        #[test]
        fn parse_all_statuses() {
            assert_eq!(
                "planning".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::Planning
            );
            assert_eq!(
                "ready".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::Ready
            );
            assert_eq!(
                "blocked".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::Blocked
            );
            assert_eq!(
                "in-progress".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::InProgress
            );
            assert_eq!(
                "paused".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::Paused
            );
            assert_eq!(
                "done".parse::<ProjectStatus>().unwrap(),
                ProjectStatus::Done
            );
        }

        #[test]
        fn is_completed() {
            assert!(ProjectStatus::Done.is_completed());
            assert!(!ProjectStatus::Planning.is_completed());
            assert!(!ProjectStatus::InProgress.is_completed());
        }

        #[test]
        fn is_active() {
            assert!(ProjectStatus::Ready.is_active());
            assert!(ProjectStatus::InProgress.is_active());
            assert!(ProjectStatus::Blocked.is_active());
            assert!(!ProjectStatus::Planning.is_active());
            assert!(!ProjectStatus::Done.is_active());
        }
    }

    mod project {
        use super::*;
        use std::path::Path;

        fn sample_project(path: impl AsRef<Path>) -> Project {
            Project {
                path: path.as_ref().to_path_buf(),
                title: "Test Project".to_string(),
                unique_id: None,
                status: None,
                description: None,
                area: None,
                start_date: None,
                end_date: None,
                blocked_by: Vec::new(),
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn filename_extracts_correctly() {
            let project = sample_project("/path/to/projects/my-project.md");
            assert_eq!(project.filename(), "my-project.md");
        }
    }

    mod new_project {
        use super::*;

        #[test]
        fn builder_pattern() {
            let project = NewProject::new("My Project")
                .with_status(ProjectStatus::Planning)
                .in_area("[[Work]]")
                .with_description("A test project");

            assert_eq!(project.title, "My Project");
            assert_eq!(project.status, Some(ProjectStatus::Planning));
            assert!(project.area.is_some());
            assert_eq!(project.description, Some("A test project".to_string()));
        }
    }

    mod project_updates {
        use super::*;

        #[test]
        fn empty_updates() {
            let updates = ProjectUpdates::new();
            assert!(updates.is_empty());
        }

        #[test]
        fn clear_area() {
            let updates = ProjectUpdates::new().clear_area();
            assert_eq!(updates.area, Some(None));
        }
    }
}
