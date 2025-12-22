//! File change processing for the Taskdn SDK.
//!
//! This module provides types and methods for processing file system changes into
//! typed vault events. Consumers can use their own file watchers and pass events
//! through `process_file_change()` to get parsed, validated entity updates.
//!
//! # Example
//!
//! ```ignore
//! use taskdn::{Taskdn, FileChangeKind, VaultEvent};
//!
//! let taskdn = Taskdn::new(config)?;
//! let paths = taskdn.watched_paths();
//!
//! // Set up your file watcher for these paths...
//! // When a file changes:
//! if let Some(event) = taskdn.process_file_change(&path, FileChangeKind::Modified)? {
//!     match event {
//!         VaultEvent::TaskUpdated(task) => println!("Updated: {}", task.title),
//!         // ...
//!     }
//! }
//! ```

use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::types::{Area, Project, Task};
use crate::Taskdn;

/// The kind of file system change that occurred.
///
/// This maps to common file watcher event types. Consumers should convert
/// their watcher's event types to these variants before calling `process_file_change()`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
#[non_exhaustive]
pub enum FileChangeKind {
    /// A new file was created.
    Created,
    /// An existing file was modified.
    Modified,
    /// A file was deleted.
    Deleted,
}

/// A typed event representing a change in the vault.
///
/// Unlike raw file system events, these contain fully parsed entities
/// (for creates/updates) or path information (for deletes).
#[derive(Debug, Clone, PartialEq)]
#[non_exhaustive]
pub enum VaultEvent {
    /// A new task was created.
    TaskCreated(Task),
    /// An existing task was updated.
    TaskUpdated(Task),
    /// A task was deleted.
    TaskDeleted {
        /// The path of the deleted task file.
        path: PathBuf,
    },

    /// A new project was created.
    ProjectCreated(Project),
    /// An existing project was updated.
    ProjectUpdated(Project),
    /// A project was deleted.
    ProjectDeleted {
        /// The path of the deleted project file.
        path: PathBuf,
    },

    /// A new area was created.
    AreaCreated(Area),
    /// An existing area was updated.
    AreaUpdated(Area),
    /// An area was deleted.
    AreaDeleted {
        /// The path of the deleted area file.
        path: PathBuf,
    },
}

/// The type of entity based on which directory a path is in.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EntityType {
    Task,
    Project,
    Area,
}

impl Taskdn {
    /// Process a file change into a typed vault event.
    ///
    /// This method takes a raw file system event and returns a typed `VaultEvent`
    /// if the file is relevant to the vault (i.e., a `.md` file in a watched directory).
    ///
    /// # Arguments
    ///
    /// * `path` - The path to the changed file
    /// * `kind` - The type of change (created, modified, or deleted)
    ///
    /// # Returns
    ///
    /// * `Ok(Some(event))` - The file was relevant and successfully processed
    /// * `Ok(None)` - The file was not relevant (wrong directory, not `.md`, etc.)
    /// * `Err(e)` - The file was relevant but failed to parse
    ///
    /// # Errors
    ///
    /// Returns an error if the file is in a watched directory and has a `.md` extension,
    /// but cannot be parsed as a valid entity. For deleted files, no parsing is attempted
    /// so no error can occur (unless the path itself is invalid).
    ///
    /// # Example
    ///
    /// ```ignore
    /// // From your file watcher callback:
    /// match taskdn.process_file_change(&path, FileChangeKind::Modified)? {
    ///     Some(VaultEvent::TaskUpdated(task)) => {
    ///         println!("Task updated: {}", task.title);
    ///     }
    ///     Some(other) => { /* handle other events */ }
    ///     None => { /* file wasn't relevant */ }
    /// }
    /// ```
    pub fn process_file_change(
        &self,
        path: impl AsRef<Path>,
        kind: FileChangeKind,
    ) -> Result<Option<VaultEvent>> {
        let path = path.as_ref();

        // Check if this is a .md file
        if !Self::is_markdown_file(path) {
            return Ok(None);
        }

        // Determine which entity type based on directory
        let Some(entity_type) = self.classify_path(path) else {
            return Ok(None); // Not in a watched directory
        };

        // Process based on change kind
        match kind {
            FileChangeKind::Created => self.process_create(path, entity_type),
            FileChangeKind::Modified => self.process_modify(path, entity_type),
            FileChangeKind::Deleted => Ok(Some(Self::process_delete(path, entity_type))),
        }
    }

    /// Returns the paths that should be watched for file changes.
    ///
    /// This returns the configured `tasks_dir`, `projects_dir`, and `areas_dir`.
    /// Consumers should set up their file watchers to recursively watch these directories.
    ///
    /// # Example
    ///
    /// ```ignore
    /// let paths = taskdn.watched_paths();
    /// for path in paths {
    ///     my_watcher.watch_recursive(&path)?;
    /// }
    /// ```
    #[must_use]
    pub fn watched_paths(&self) -> Vec<PathBuf> {
        vec![
            self.config.tasks_dir.clone(),
            self.config.projects_dir.clone(),
            self.config.areas_dir.clone(),
        ]
    }

    /// Check if a path has a `.md` extension.
    fn is_markdown_file(path: &Path) -> bool {
        path.extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("md"))
    }

    /// Classify a path as a task, project, or area based on its directory.
    ///
    /// Returns `None` if the path is not in any of the watched directories.
    fn classify_path(&self, path: &Path) -> Option<EntityType> {
        // For existing files, we can canonicalize for reliable comparison.
        // For deleted files, we need to work with the raw path.
        let path = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());

        // Check tasks_dir (including archive subdirectory)
        if let Ok(tasks_dir) = self.config.tasks_dir.canonicalize() {
            if path.starts_with(&tasks_dir) {
                return Some(EntityType::Task);
            }
        }
        // Fallback for non-canonicalized paths (deleted files)
        if path.starts_with(&self.config.tasks_dir) {
            return Some(EntityType::Task);
        }

        // Check projects_dir
        if let Ok(projects_dir) = self.config.projects_dir.canonicalize() {
            if path.starts_with(&projects_dir) {
                return Some(EntityType::Project);
            }
        }
        if path.starts_with(&self.config.projects_dir) {
            return Some(EntityType::Project);
        }

        // Check areas_dir
        if let Ok(areas_dir) = self.config.areas_dir.canonicalize() {
            if path.starts_with(&areas_dir) {
                return Some(EntityType::Area);
            }
        }
        if path.starts_with(&self.config.areas_dir) {
            return Some(EntityType::Area);
        }

        None
    }

    /// Process a file creation event.
    fn process_create(&self, path: &Path, entity_type: EntityType) -> Result<Option<VaultEvent>> {
        match entity_type {
            EntityType::Task => {
                let task = self.get_task(path)?;
                Ok(Some(VaultEvent::TaskCreated(task)))
            }
            EntityType::Project => {
                let project = self.get_project(path)?;
                Ok(Some(VaultEvent::ProjectCreated(project)))
            }
            EntityType::Area => {
                let area = self.get_area(path)?;
                Ok(Some(VaultEvent::AreaCreated(area)))
            }
        }
    }

    /// Process a file modification event.
    fn process_modify(&self, path: &Path, entity_type: EntityType) -> Result<Option<VaultEvent>> {
        match entity_type {
            EntityType::Task => {
                let task = self.get_task(path)?;
                Ok(Some(VaultEvent::TaskUpdated(task)))
            }
            EntityType::Project => {
                let project = self.get_project(path)?;
                Ok(Some(VaultEvent::ProjectUpdated(project)))
            }
            EntityType::Area => {
                let area = self.get_area(path)?;
                Ok(Some(VaultEvent::AreaUpdated(area)))
            }
        }
    }

    /// Process a file deletion event.
    fn process_delete(path: &Path, entity_type: EntityType) -> VaultEvent {
        let path = path.to_path_buf();
        match entity_type {
            EntityType::Task => VaultEvent::TaskDeleted { path },
            EntityType::Project => VaultEvent::ProjectDeleted { path },
            EntityType::Area => VaultEvent::AreaDeleted { path },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TaskdnConfig;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_vault() -> (TempDir, Taskdn) {
        let temp_dir = TempDir::new().unwrap();
        let tasks_dir = temp_dir.path().join("tasks");
        let projects_dir = temp_dir.path().join("projects");
        let areas_dir = temp_dir.path().join("areas");

        fs::create_dir_all(&tasks_dir).unwrap();
        fs::create_dir_all(&projects_dir).unwrap();
        fs::create_dir_all(&areas_dir).unwrap();

        let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
        let taskdn = Taskdn::new(config).unwrap();

        (temp_dir, taskdn)
    }

    fn create_task_file(dir: &Path, filename: &str, title: &str) -> PathBuf {
        let path = dir.join(filename);
        let content = format!(
            r#"---
title: {title}
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---
Task body
"#
        );
        fs::write(&path, content).unwrap();
        path
    }

    fn create_project_file(dir: &Path, filename: &str, title: &str) -> PathBuf {
        let path = dir.join(filename);
        let content = format!(
            r#"---
title: {title}
---
Project body
"#
        );
        fs::write(&path, content).unwrap();
        path
    }

    fn create_area_file(dir: &Path, filename: &str, title: &str) -> PathBuf {
        let path = dir.join(filename);
        let content = format!(
            r#"---
title: {title}
---
Area body
"#
        );
        fs::write(&path, content).unwrap();
        path
    }

    #[test]
    fn watched_paths_returns_all_directories() {
        let (_temp, taskdn) = setup_test_vault();
        let paths = taskdn.watched_paths();

        assert_eq!(paths.len(), 3);
        assert!(paths.contains(&taskdn.config().tasks_dir));
        assert!(paths.contains(&taskdn.config().projects_dir));
        assert!(paths.contains(&taskdn.config().areas_dir));
    }

    #[test]
    fn process_file_change_ignores_non_markdown_files() {
        let (_temp, taskdn) = setup_test_vault();
        let path = taskdn.config().tasks_dir.join("file.txt");
        fs::write(&path, "some content").unwrap();

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn process_file_change_ignores_files_outside_watched_dirs() {
        let (temp, taskdn) = setup_test_vault();
        let path = temp.path().join("random.md");
        fs::write(&path, "---\ntitle: Random\n---\n").unwrap();

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[test]
    fn process_task_created() {
        let (_temp, taskdn) = setup_test_vault();
        let path = create_task_file(&taskdn.config().tasks_dir, "test.md", "Test Task");

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::TaskCreated(task)) => {
                assert_eq!(task.title, "Test Task");
            }
            other => panic!("Expected TaskCreated, got {:?}", other),
        }
    }

    #[test]
    fn process_task_modified() {
        let (_temp, taskdn) = setup_test_vault();
        let path = create_task_file(&taskdn.config().tasks_dir, "test.md", "Test Task");

        let result = taskdn.process_file_change(&path, FileChangeKind::Modified);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::TaskUpdated(task)) => {
                assert_eq!(task.title, "Test Task");
            }
            other => panic!("Expected TaskUpdated, got {:?}", other),
        }
    }

    #[test]
    fn process_task_deleted() {
        let (_temp, taskdn) = setup_test_vault();
        let path = create_task_file(&taskdn.config().tasks_dir, "test.md", "Test Task");

        // Delete the file first (to simulate real-world scenario)
        fs::remove_file(&path).unwrap();

        let result = taskdn.process_file_change(&path, FileChangeKind::Deleted);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::TaskDeleted { path: deleted_path }) => {
                assert_eq!(deleted_path, path);
            }
            other => panic!("Expected TaskDeleted, got {:?}", other),
        }
    }

    #[test]
    fn process_project_created() {
        let (_temp, taskdn) = setup_test_vault();
        let path = create_project_file(&taskdn.config().projects_dir, "project.md", "Test Project");

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::ProjectCreated(project)) => {
                assert_eq!(project.title, "Test Project");
            }
            other => panic!("Expected ProjectCreated, got {:?}", other),
        }
    }

    #[test]
    fn process_area_created() {
        let (_temp, taskdn) = setup_test_vault();
        let path = create_area_file(&taskdn.config().areas_dir, "area.md", "Test Area");

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::AreaCreated(area)) => {
                assert_eq!(area.title, "Test Area");
            }
            other => panic!("Expected AreaCreated, got {:?}", other),
        }
    }

    #[test]
    fn process_invalid_task_returns_error() {
        let (_temp, taskdn) = setup_test_vault();
        let path = taskdn.config().tasks_dir.join("invalid.md");
        // Missing required fields
        fs::write(&path, "---\nrandom: field\n---\n").unwrap();

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_err());
    }

    #[test]
    fn process_task_in_archive_subdirectory() {
        let (_temp, taskdn) = setup_test_vault();
        let archive_dir = taskdn.config().tasks_dir.join("archive");
        fs::create_dir_all(&archive_dir).unwrap();

        let path = create_task_file(&archive_dir, "archived.md", "Archived Task");

        let result = taskdn.process_file_change(&path, FileChangeKind::Created);
        assert!(result.is_ok());

        match result.unwrap() {
            Some(VaultEvent::TaskCreated(task)) => {
                assert_eq!(task.title, "Archived Task");
                assert!(task.is_archived());
            }
            other => panic!("Expected TaskCreated, got {:?}", other),
        }
    }

    #[test]
    fn file_change_kind_traits() {
        // Test Debug
        assert_eq!(format!("{:?}", FileChangeKind::Created), "Created");

        // Test Clone and Copy
        let kind = FileChangeKind::Modified;
        let cloned = kind;
        assert_eq!(kind, cloned);

        // Test PartialEq
        assert_eq!(FileChangeKind::Created, FileChangeKind::Created);
        assert_ne!(FileChangeKind::Created, FileChangeKind::Deleted);

        // Test Hash (via use in HashSet)
        use std::collections::HashSet;
        let mut set = HashSet::new();
        set.insert(FileChangeKind::Created);
        set.insert(FileChangeKind::Modified);
        assert!(set.contains(&FileChangeKind::Created));
    }
}
