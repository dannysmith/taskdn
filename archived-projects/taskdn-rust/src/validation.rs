//! Validation warnings for spec compliance.
//!
//! The parser validates required fields and formats. This module provides
//! additional validation for spec recommendations and advisory checks.

use std::path::Path;

/// A validation warning about spec compliance.
///
/// These are advisory - the data is still usable, but may not fully comply
/// with the Taskdn specification.
#[derive(Debug, Clone, PartialEq, Eq)]
#[non_exhaustive]
pub enum ValidationWarning {
    /// The `projects` array has more than one element.
    /// Per spec, a task should belong to exactly one project.
    MultipleProjects {
        /// Number of projects in the array.
        count: usize,
    },

    /// A completed task (done/dropped) is missing the `completed-at` field.
    MissingCompletedAt,
}

impl ValidationWarning {
    /// Returns a human-readable message for this warning.
    #[must_use]
    pub fn message(&self) -> String {
        match self {
            Self::MultipleProjects { count } => {
                format!(
                    "projects array has {count} elements; spec requires exactly one project per task"
                )
            }
            Self::MissingCompletedAt => {
                "completed task is missing 'completed-at' field".to_string()
            }
        }
    }

    /// Returns a human-readable message with path context.
    #[must_use]
    pub fn message_with_path(&self, path: &Path) -> String {
        format!("{}: {}", path.display(), self.message())
    }
}

impl std::fmt::Display for ValidationWarning {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn multiple_projects_message() {
        let warning = ValidationWarning::MultipleProjects { count: 3 };
        assert!(warning.message().contains("3 elements"));
        assert!(warning.message().contains("exactly one"));
    }

    #[test]
    fn missing_completed_at_message() {
        let warning = ValidationWarning::MissingCompletedAt;
        assert!(warning.message().contains("completed-at"));
    }

    #[test]
    fn message_with_path() {
        let warning = ValidationWarning::MissingCompletedAt;
        let path = Path::new("/test/task.md");
        let msg = warning.message_with_path(path);
        assert!(msg.contains("/test/task.md"));
        assert!(msg.contains("completed-at"));
    }

    #[test]
    fn display_impl() {
        let warning = ValidationWarning::MultipleProjects { count: 2 };
        let display = format!("{warning}");
        assert!(display.contains("2 elements"));
    }
}
