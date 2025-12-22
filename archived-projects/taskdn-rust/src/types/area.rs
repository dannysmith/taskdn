//! Area entity and related types.

use std::collections::HashMap;
use std::path::PathBuf;
use std::str::FromStr;

/// Status of an area.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Default)]
#[non_exhaustive]
pub enum AreaStatus {
    /// Area is active and accepting new tasks/projects.
    #[default]
    Active,
    /// Area is archived (no longer active).
    Archived,
}

impl AreaStatus {
    /// Returns true if this area is active.
    #[must_use]
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Active)
    }

    /// Returns the canonical string representation.
    #[must_use]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Active => "active",
            Self::Archived => "archived",
        }
    }
}

impl FromStr for AreaStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "active" => Ok(Self::Active),
            "archived" => Ok(Self::Archived),
            _ => Err(format!("invalid area status: {s}")),
        }
    }
}

impl std::fmt::Display for AreaStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// A parsed area file.
#[derive(Debug, Clone, PartialEq)]
pub struct Area {
    /// Absolute path to the area file.
    pub path: PathBuf,

    // Required
    /// The area title.
    pub title: String,

    // Optional
    /// Current status of the area.
    pub status: Option<AreaStatus>,
    /// Type of area (e.g., "personal", "work").
    pub area_type: Option<String>,
    /// Brief description of the area.
    pub description: Option<String>,

    /// Markdown body.
    pub body: String,
    /// Unknown frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl Area {
    /// Returns the filename without path (e.g., "my-area.md").
    #[must_use]
    pub fn filename(&self) -> &str {
        self.path.file_name().and_then(|n| n.to_str()).unwrap_or("")
    }

    /// Returns true if this area is archived (based on status field).
    ///
    /// Note: For areas, "archived" is a status value, not a physical location.
    /// This differs from tasks where "archived" means moved to a subdirectory.
    #[must_use]
    pub fn is_archived(&self) -> bool {
        self.status == Some(AreaStatus::Archived)
    }

    /// Returns true if this area is active (not archived).
    #[must_use]
    pub fn is_active(&self) -> bool {
        !self.is_archived()
    }
}

/// Parsed area content without a file path.
#[derive(Debug, Clone, PartialEq)]
pub struct ParsedArea {
    /// The area title.
    pub title: String,
    /// Current status.
    pub status: Option<AreaStatus>,
    /// Type of area.
    pub area_type: Option<String>,
    /// Brief description.
    pub description: Option<String>,
    /// Markdown body.
    pub body: String,
    /// Unknown frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl ParsedArea {
    /// Convert to an Area by associating with a file path.
    #[must_use]
    pub fn with_path(self, path: impl Into<PathBuf>) -> Area {
        Area {
            path: path.into(),
            title: self.title,
            status: self.status,
            area_type: self.area_type,
            description: self.description,
            body: self.body,
            extra: self.extra,
        }
    }
}

/// Data for creating a new area.
#[derive(Debug, Clone, Default)]
pub struct NewArea {
    /// The area title (required).
    pub title: String,
    /// Optional custom filename.
    pub filename: Option<String>,
    /// Initial status.
    pub status: Option<AreaStatus>,
    /// Type of area.
    pub area_type: Option<String>,
    /// Brief description.
    pub description: Option<String>,
    /// Markdown body.
    pub body: String,
    /// Additional frontmatter fields.
    pub extra: HashMap<String, serde_yaml::Value>,
}

impl NewArea {
    /// Create a new area with the given title.
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
    pub fn with_status(mut self, status: AreaStatus) -> Self {
        self.status = Some(status);
        self
    }

    /// Set the area type.
    #[must_use]
    pub fn with_area_type(mut self, area_type: impl Into<String>) -> Self {
        self.area_type = Some(area_type.into());
        self
    }

    /// Set the description.
    #[must_use]
    pub fn with_description(mut self, description: impl Into<String>) -> Self {
        self.description = Some(description.into());
        self
    }

    /// Set the body content.
    #[must_use]
    pub fn with_body(mut self, body: impl Into<String>) -> Self {
        self.body = body.into();
        self
    }
}

/// Partial updates for an area.
#[derive(Debug, Clone, Default)]
pub struct AreaUpdates {
    /// New title.
    pub title: Option<String>,
    /// New status.
    pub status: Option<Option<AreaStatus>>,
    /// New area type.
    pub area_type: Option<Option<String>>,
    /// New description.
    pub description: Option<Option<String>>,
}

impl AreaUpdates {
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
    pub fn status(mut self, status: AreaStatus) -> Self {
        self.status = Some(Some(status));
        self
    }

    /// Clear the status.
    #[must_use]
    pub fn clear_status(mut self) -> Self {
        self.status = Some(None);
        self
    }

    /// Set a new area type.
    #[must_use]
    pub fn area_type(mut self, area_type: impl Into<String>) -> Self {
        self.area_type = Some(Some(area_type.into()));
        self
    }

    /// Clear the area type.
    #[must_use]
    pub fn clear_area_type(mut self) -> Self {
        self.area_type = Some(None);
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

    /// Returns true if no updates are specified.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.title.is_none()
            && self.status.is_none()
            && self.area_type.is_none()
            && self.description.is_none()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod area_status {
        use super::*;

        #[test]
        fn parse_all_statuses() {
            assert_eq!("active".parse::<AreaStatus>().unwrap(), AreaStatus::Active);
            assert_eq!(
                "archived".parse::<AreaStatus>().unwrap(),
                AreaStatus::Archived
            );
        }

        #[test]
        fn parse_case_insensitive() {
            assert_eq!("ACTIVE".parse::<AreaStatus>().unwrap(), AreaStatus::Active);
            assert_eq!(
                "Archived".parse::<AreaStatus>().unwrap(),
                AreaStatus::Archived
            );
        }

        #[test]
        fn is_active() {
            assert!(AreaStatus::Active.is_active());
            assert!(!AreaStatus::Archived.is_active());
        }

        #[test]
        fn as_str() {
            assert_eq!(AreaStatus::Active.as_str(), "active");
            assert_eq!(AreaStatus::Archived.as_str(), "archived");
        }
    }

    mod area {
        use super::*;
        use std::path::Path;

        fn sample_area(path: impl AsRef<Path>) -> Area {
            Area {
                path: path.as_ref().to_path_buf(),
                title: "Test Area".to_string(),
                status: None,
                area_type: None,
                description: None,
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn filename_extracts_correctly() {
            let area = sample_area("/path/to/areas/my-area.md");
            assert_eq!(area.filename(), "my-area.md");
        }

        #[test]
        fn is_archived_checks_status() {
            let mut area = sample_area("/path/to/areas/work.md");
            assert!(!area.is_archived());
            assert!(area.is_active());

            area.status = Some(AreaStatus::Archived);
            assert!(area.is_archived());
            assert!(!area.is_active());
        }
    }

    mod new_area {
        use super::*;

        #[test]
        fn builder_pattern() {
            let area = NewArea::new("Work")
                .with_status(AreaStatus::Active)
                .with_area_type("professional")
                .with_description("Work-related stuff");

            assert_eq!(area.title, "Work");
            assert_eq!(area.status, Some(AreaStatus::Active));
            assert_eq!(area.area_type, Some("professional".to_string()));
            assert_eq!(area.description, Some("Work-related stuff".to_string()));
        }
    }

    mod area_updates {
        use super::*;

        #[test]
        fn empty_updates() {
            let updates = AreaUpdates::new();
            assert!(updates.is_empty());
        }

        #[test]
        fn with_title() {
            let updates = AreaUpdates::new().title("New Title");
            assert!(!updates.is_empty());
            assert_eq!(updates.title, Some("New Title".to_string()));
        }

        #[test]
        fn clear_description() {
            let updates = AreaUpdates::new().clear_description();
            assert_eq!(updates.description, Some(None));
        }
    }
}
