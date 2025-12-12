//! Taskdn - Rust library for parsing, querying, and manipulating Taskdn task files.
//!
//! This library provides the core functionality for working with Taskdn's markdown-based
//! task management system. It handles parsing files with YAML frontmatter, validating
//! against the specification, and performing CRUD operations.
//!
//! # Example
//!
//! ```ignore
//! use taskdn::{Taskdn, TaskdnConfig, TaskFilter, TaskStatus};
//! use std::path::PathBuf;
//!
//! let config = TaskdnConfig::new(
//!     PathBuf::from("./tasks"),
//!     PathBuf::from("./projects"),
//!     PathBuf::from("./areas"),
//! );
//!
//! let sdk = Taskdn::new(config)?;
//! let filter = TaskFilter::new().with_status(TaskStatus::Ready);
//! let tasks = sdk.list_tasks(filter)?;
//! ```

mod config;
mod error;
mod events;
mod filter;
mod operations;
mod parser;
mod resolve;
pub mod types;
mod utils;
pub mod validation;
#[cfg(feature = "watch")]
mod watcher;
mod writer;

// Re-export configuration
pub use config::TaskdnConfig;

// Re-export error types
pub use error::{BatchResult, Error, Result};

// Re-export event types (always available)
pub use events::{FileChangeKind, VaultEvent};

// Re-export filter types
pub use filter::{AreaFilter, ProjectFilter, TaskFilter};

// Re-export watcher types (only with "watch" feature)
#[cfg(feature = "watch")]
pub use watcher::{FileWatcher, WatchConfig};

// Re-export all entity types
pub use types::{
    Area, AreaStatus, AreaUpdates, DateTimeValue, FileReference, NewArea, NewProject, NewTask,
    ParsedArea, ParsedProject, ParsedTask, Project, ProjectStatus, ProjectUpdates, Task,
    TaskStatus, TaskUpdates,
};

// Re-export validation types
pub use validation::ValidationWarning;

/// The main entry point for the Taskdn SDK.
///
/// Provides methods for listing, reading, creating, and updating tasks,
/// projects, and areas.
#[derive(Debug)]
pub struct Taskdn {
    config: TaskdnConfig,
}

impl Taskdn {
    /// Creates a new Taskdn instance with the given configuration.
    ///
    /// # Errors
    ///
    /// Returns an error if any of the configured directories do not exist.
    pub fn new(config: TaskdnConfig) -> Result<Self> {
        // Validate that directories exist
        if !config.tasks_dir.exists() {
            return Err(Error::DirectoryNotFound {
                path: config.tasks_dir,
            });
        }
        if !config.projects_dir.exists() {
            return Err(Error::DirectoryNotFound {
                path: config.projects_dir,
            });
        }
        if !config.areas_dir.exists() {
            return Err(Error::DirectoryNotFound {
                path: config.areas_dir,
            });
        }

        Ok(Self { config })
    }

    /// Returns a reference to the configuration.
    #[must_use]
    pub fn config(&self) -> &TaskdnConfig {
        &self.config
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn new_with_nonexistent_dirs_fails() {
        let config = TaskdnConfig::new(
            PathBuf::from("/nonexistent/tasks"),
            PathBuf::from("/nonexistent/projects"),
            PathBuf::from("/nonexistent/areas"),
        );

        let result = Taskdn::new(config);
        assert!(result.is_err());
    }
}
