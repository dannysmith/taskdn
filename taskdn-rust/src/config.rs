//! Configuration for the Taskdn SDK.

use std::path::PathBuf;

/// Configuration for initializing the Taskdn SDK.
///
/// Specifies the paths to the directories containing tasks, projects, and areas.
#[derive(Debug, Clone)]
pub struct TaskdnConfig {
    /// Path to the directory containing task files.
    pub tasks_dir: PathBuf,
    /// Path to the directory containing project files.
    pub projects_dir: PathBuf,
    /// Path to the directory containing area files.
    pub areas_dir: PathBuf,
}

impl TaskdnConfig {
    /// Creates a new configuration with the specified directories.
    #[must_use]
    pub fn new(tasks_dir: PathBuf, projects_dir: PathBuf, areas_dir: PathBuf) -> Self {
        Self {
            tasks_dir,
            projects_dir,
            areas_dir,
        }
    }
}
