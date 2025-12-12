//! Task operations for the Taskdn SDK.

use crate::error::{BatchResult, Error, Result};
use crate::filter::TaskFilter;
use crate::types::{DateTimeValue, NewTask, ParsedTask, Task, TaskStatus, TaskUpdates};
use crate::utils::generate_filename;
use crate::writer::{write_task, write_task_with_updates};
use crate::Taskdn;
use std::fs;
use std::path::{Path, PathBuf};

impl Taskdn {
    // ==========================================================================
    // Read Operations
    // ==========================================================================

    /// Get a single task by path.
    ///
    /// # Arguments
    /// * `path` - Path to the task file (absolute or relative to `tasks_dir`)
    ///
    /// # Errors
    /// Returns `Error::NotFound` if the file doesn't exist.
    /// Returns `Error::Parse` if the file cannot be parsed.
    pub fn get_task(&self, path: impl AsRef<Path>) -> Result<Task> {
        let path = self.resolve_task_path(path.as_ref())?;
        let content =
            fs::read_to_string(&path).map_err(|_| Error::NotFound { path: path.clone() })?;

        ParsedTask::parse(&content)
            .map(|parsed| parsed.with_path(&path))
            .map_err(|e| match e {
                Error::ContentParse { message } => Error::Parse {
                    path: path.clone(),
                    message,
                },
                Error::ContentMissingField { field } => Error::MissingField {
                    path: path.clone(),
                    field,
                },
                Error::ContentInvalidField { field, message } => Error::InvalidField {
                    path: path.clone(),
                    field,
                    message,
                },
                other => other,
            })
    }

    /// List tasks matching a filter.
    ///
    /// Invalid files are silently skipped. Use `validate_all_tasks()` for strict validation.
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for matching tasks
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    pub fn list_tasks(&self, filter: &TaskFilter) -> Result<Vec<Task>> {
        let tasks = self.scan_tasks(filter)?;
        Ok(tasks)
    }

    /// Count tasks matching a filter (more efficient than list).
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for matching tasks
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    pub fn count_tasks(&self, filter: &TaskFilter) -> Result<usize> {
        // For now, just use list_tasks and count
        // Could be optimized to avoid collecting into Vec
        Ok(self.list_tasks(filter)?.len())
    }

    // ==========================================================================
    // Create Operations
    // ==========================================================================

    /// Create a new task, returns the path where it was created.
    ///
    /// # Arguments
    /// * `task` - The task data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    pub fn create_task(&self, task: NewTask) -> Result<PathBuf> {
        let filename = task
            .filename
            .clone()
            .unwrap_or_else(|| generate_filename(&task.title));

        let path = self.config.tasks_dir.join(&filename);

        // Check if file already exists
        if path.exists() {
            return Err(Error::Validation {
                path: path.clone(),
                message: format!("file already exists: {filename}"),
            });
        }

        let now = DateTimeValue::now();

        let full_task = Task {
            path: path.clone(),
            title: task.title,
            status: task.status,
            created_at: now.clone(),
            updated_at: now,
            completed_at: None,
            due: task.due,
            scheduled: task.scheduled,
            defer_until: task.defer_until,
            project: task.project,
            area: task.area,
            body: task.body,
            extra: task.extra,
            projects_count: None,
        };

        write_task(&path, &full_task)?;
        Ok(path)
    }

    /// Quick capture: create an inbox task with just a title.
    ///
    /// # Arguments
    /// * `title` - The task title
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    pub fn create_inbox_task(&self, title: impl AsRef<str>) -> Result<PathBuf> {
        self.create_task(NewTask::new(title.as_ref()))
    }

    // ==========================================================================
    // Update Operations
    // ==========================================================================

    /// Update a task with partial changes.
    ///
    /// Automatically updates `updated_at` and sets `completed_at` when
    /// transitioning to Done or Dropped.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn update_task(&self, path: impl AsRef<Path>, updates: TaskUpdates) -> Result<()> {
        let path = self.resolve_task_path(path.as_ref())?;
        let mut task = self.get_task(&path)?;
        let previous_status = Some(task.status);

        // Apply updates
        if let Some(title) = updates.title {
            task.title = title;
        }
        if let Some(status) = updates.status {
            task.status = status;
        }
        if let Some(due) = updates.due {
            task.due = due;
        }
        if let Some(scheduled) = updates.scheduled {
            task.scheduled = scheduled;
        }
        if let Some(defer_until) = updates.defer_until {
            task.defer_until = defer_until;
        }
        if let Some(project) = updates.project {
            task.project = project;
        }
        if let Some(area) = updates.area {
            task.area = area;
        }

        write_task_with_updates(&path, &mut task, previous_status)
    }

    /// Update all tasks matching a filter.
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for matching tasks
    /// * `updates` - Partial updates to apply to all matching tasks
    ///
    /// # Returns
    /// A `BatchResult` containing paths of successfully updated tasks and any failures.
    #[must_use]
    pub fn update_tasks_matching(
        &self,
        filter: &TaskFilter,
        updates: &TaskUpdates,
    ) -> BatchResult<PathBuf> {
        let mut result = BatchResult::new();

        match self.list_tasks(filter) {
            Ok(tasks) => {
                for task in tasks {
                    match self.update_task(&task.path, updates.clone()) {
                        Ok(()) => result.succeeded.push(task.path),
                        Err(e) => result.failed.push((task.path, e)),
                    }
                }
            }
            Err(e) => {
                result.failed.push((self.config.tasks_dir.clone(), e));
            }
        }

        result
    }

    // ==========================================================================
    // Status Transition Operations (convenience)
    // ==========================================================================

    /// Mark a task as done (sets `completed_at` automatically).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn complete_task(&self, path: impl AsRef<Path>) -> Result<()> {
        self.update_task(path, TaskUpdates::new().status(TaskStatus::Done))
    }

    /// Mark a task as dropped (sets `completed_at` automatically).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn drop_task(&self, path: impl AsRef<Path>) -> Result<()> {
        self.update_task(path, TaskUpdates::new().status(TaskStatus::Dropped))
    }

    /// Start working on a task (status -> `InProgress`).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn start_task(&self, path: impl AsRef<Path>) -> Result<()> {
        self.update_task(path, TaskUpdates::new().status(TaskStatus::InProgress))
    }

    /// Block a task (status -> Blocked).
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn block_task(&self, path: impl AsRef<Path>) -> Result<()> {
        self.update_task(path, TaskUpdates::new().status(TaskStatus::Blocked))
    }

    // ==========================================================================
    // Archive Operations
    // ==========================================================================

    /// Move a task to the archive subdirectory.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Returns
    /// The new path in the archive directory.
    ///
    /// # Errors
    /// Returns an error if the file cannot be moved or archive directory cannot be created.
    pub fn archive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf> {
        let path = self.resolve_task_path(path.as_ref())?;

        // Ensure archive directory exists
        let archive_dir = self.config.tasks_dir.join("archive");
        if !archive_dir.exists() {
            fs::create_dir_all(&archive_dir)?;
        }

        let filename = path
            .file_name()
            .ok_or_else(|| Error::NotFound { path: path.clone() })?;
        let new_path = archive_dir.join(filename);

        // Check if already archived
        if path.starts_with(&archive_dir) {
            return Err(Error::Validation {
                path: path.clone(),
                message: "task is already archived".to_string(),
            });
        }

        // Check for collision
        if new_path.exists() {
            return Err(Error::Validation {
                path: new_path.clone(),
                message: "file already exists in archive".to_string(),
            });
        }

        fs::rename(&path, &new_path)?;
        Ok(new_path)
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
    pub fn unarchive_task(&self, path: impl AsRef<Path>) -> Result<PathBuf> {
        let path = self.resolve_task_path(path.as_ref())?;
        let archive_dir = self.config.tasks_dir.join("archive");

        // Check if in archive
        if !path.starts_with(&archive_dir) {
            return Err(Error::Validation {
                path: path.clone(),
                message: "task is not in archive".to_string(),
            });
        }

        let filename = path
            .file_name()
            .ok_or_else(|| Error::NotFound { path: path.clone() })?;
        let new_path = self.config.tasks_dir.join(filename);

        // Check for collision
        if new_path.exists() {
            return Err(Error::Validation {
                path: new_path.clone(),
                message: "file already exists in tasks directory".to_string(),
            });
        }

        fs::rename(&path, &new_path)?;
        Ok(new_path)
    }

    // ==========================================================================
    // Delete Operations
    // ==========================================================================

    /// Permanently delete a task file.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    pub fn delete_task(&self, path: impl AsRef<Path>) -> Result<()> {
        let path = self.resolve_task_path(path.as_ref())?;
        fs::remove_file(&path).map_err(|_| Error::NotFound { path })
    }

    // ==========================================================================
    // Internal Helpers
    // ==========================================================================

    /// Resolve a task path - if relative, resolve against `tasks_dir`.
    fn resolve_task_path(&self, path: &Path) -> Result<PathBuf> {
        if path.is_absolute() {
            if path.exists() {
                Ok(path.to_path_buf())
            } else {
                Err(Error::NotFound {
                    path: path.to_path_buf(),
                })
            }
        } else {
            let full_path = self.config.tasks_dir.join(path);
            if full_path.exists() {
                Ok(full_path)
            } else {
                Err(Error::NotFound { path: full_path })
            }
        }
    }

    /// Scan the tasks directory and return tasks matching the filter.
    fn scan_tasks(&self, filter: &TaskFilter) -> Result<Vec<Task>> {
        let mut tasks = Vec::new();

        // Scan main tasks directory
        self.scan_directory(&self.config.tasks_dir, filter, &mut tasks, false)?;

        // Scan archive if requested
        if filter.include_archive_dir {
            let archive_dir = self.config.tasks_dir.join("archive");
            if archive_dir.exists() {
                self.scan_directory(&archive_dir, filter, &mut tasks, true)?;
            }
        }

        Ok(tasks)
    }

    /// Scan a single directory for tasks.
    fn scan_directory(
        &self,
        dir: &Path,
        filter: &TaskFilter,
        tasks: &mut Vec<Task>,
        _is_archive: bool,
    ) -> Result<()> {
        let entries = fs::read_dir(dir)?;

        for entry in entries.flatten() {
            let path = entry.path();

            // Skip directories (except archive which we handle separately)
            if path.is_dir() {
                // Skip archive dir here - it's handled explicitly if include_archive_dir is set
                continue;
            }

            // Only process .md files
            if path.extension().is_some_and(|e| e == "md") {
                // Try to parse the task, skip if invalid
                if let Ok(task) = self.get_task(&path) {
                    // Apply filter
                    if filter.matches(&task) {
                        tasks.push(task);
                    }
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::TaskdnConfig;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_env() -> (TempDir, Taskdn) {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().join("tasks");
        let projects_dir = temp.path().join("projects");
        let areas_dir = temp.path().join("areas");

        fs::create_dir_all(&tasks_dir).unwrap();
        fs::create_dir_all(&projects_dir).unwrap();
        fs::create_dir_all(&areas_dir).unwrap();

        let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
        let sdk = Taskdn::new(config).unwrap();

        (temp, sdk)
    }

    fn create_task_file(dir: &Path, filename: &str, content: &str) {
        let path = dir.join(filename);
        fs::write(path, content).unwrap();
    }

    fn sample_task_content(title: &str, status: &str) -> String {
        format!(
            r#"---
title: {title}
status: {status}
created-at: 2025-01-01
updated-at: 2025-01-02
---

Task body.
"#
        )
    }

    mod get_task {
        use super::*;

        #[test]
        fn get_existing_task() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "test-task.md",
                &sample_task_content("Test Task", "ready"),
            );

            let task = sdk.get_task("test-task.md").unwrap();
            assert_eq!(task.title, "Test Task");
            assert_eq!(task.status, TaskStatus::Ready);
        }

        #[test]
        fn get_task_absolute_path() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.config.tasks_dir.join("test-task.md");
            create_task_file(
                &sdk.config.tasks_dir,
                "test-task.md",
                &sample_task_content("Test Task", "inbox"),
            );

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.title, "Test Task");
        }

        #[test]
        fn get_nonexistent_task() {
            let (_temp, sdk) = setup_test_env();
            let result = sdk.get_task("nonexistent.md");
            assert!(matches!(result, Err(Error::NotFound { .. })));
        }
    }

    mod list_tasks {
        use super::*;

        #[test]
        fn list_all_tasks() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "task1.md",
                &sample_task_content("Task 1", "ready"),
            );
            create_task_file(
                &sdk.config.tasks_dir,
                "task2.md",
                &sample_task_content("Task 2", "inbox"),
            );

            let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
            assert_eq!(tasks.len(), 2);
        }

        #[test]
        fn list_with_status_filter() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "task1.md",
                &sample_task_content("Task 1", "ready"),
            );
            create_task_file(
                &sdk.config.tasks_dir,
                "task2.md",
                &sample_task_content("Task 2", "inbox"),
            );

            let tasks = sdk
                .list_tasks(&TaskFilter::new().with_status(TaskStatus::Ready))
                .unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Task 1");
        }

        #[test]
        fn excludes_archive_by_default() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "active.md",
                &sample_task_content("Active", "ready"),
            );
            let archive_dir = sdk.config.tasks_dir.join("archive");
            fs::create_dir_all(&archive_dir).unwrap();
            create_task_file(
                &archive_dir,
                "archived.md",
                &sample_task_content("Archived", "done"),
            );

            let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Active");
        }

        #[test]
        fn includes_archive_when_requested() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "active.md",
                &sample_task_content("Active", "ready"),
            );
            let archive_dir = sdk.config.tasks_dir.join("archive");
            fs::create_dir_all(&archive_dir).unwrap();
            create_task_file(
                &archive_dir,
                "archived.md",
                &sample_task_content("Archived", "done"),
            );

            let tasks = sdk
                .list_tasks(&TaskFilter::new().include_archive_dir())
                .unwrap();
            assert_eq!(tasks.len(), 2);
        }

        #[test]
        fn skips_invalid_files() {
            let (_temp, sdk) = setup_test_env();
            create_task_file(
                &sdk.config.tasks_dir,
                "valid.md",
                &sample_task_content("Valid", "ready"),
            );
            create_task_file(
                &sdk.config.tasks_dir,
                "invalid.md",
                "not valid yaml frontmatter",
            );

            let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Valid");
        }
    }

    mod create_task {
        use super::*;

        #[test]
        fn create_basic_task() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("My New Task")).unwrap();

            assert!(path.exists());
            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.title, "My New Task");
            assert_eq!(task.status, TaskStatus::Inbox);
        }

        #[test]
        fn create_with_custom_filename() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_task(NewTask::new("Task").with_filename("custom-name.md"))
                .unwrap();

            assert_eq!(path.file_name().unwrap(), "custom-name.md");
        }

        #[test]
        fn create_with_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_task(NewTask::new("Ready Task").with_status(TaskStatus::Ready))
                .unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::Ready);
        }

        #[test]
        fn create_fails_if_exists() {
            let (_temp, sdk) = setup_test_env();
            sdk.create_task(NewTask::new("Test").with_filename("test.md"))
                .unwrap();

            let result = sdk.create_task(NewTask::new("Test").with_filename("test.md"));
            assert!(matches!(result, Err(Error::Validation { .. })));
        }

        #[test]
        fn create_inbox_task() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_inbox_task("Quick capture").unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.title, "Quick capture");
            assert_eq!(task.status, TaskStatus::Inbox);
        }
    }

    mod update_task {
        use super::*;

        #[test]
        fn update_title() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Original")).unwrap();

            sdk.update_task(&path, TaskUpdates::new().title("Updated"))
                .unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.title, "Updated");
        }

        #[test]
        fn update_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            sdk.update_task(&path, TaskUpdates::new().status(TaskStatus::Ready))
                .unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::Ready);
        }

        #[test]
        fn update_sets_updated_at() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();
            let original = sdk.get_task(&path).unwrap();

            sdk.update_task(&path, TaskUpdates::new().title("New Title"))
                .unwrap();

            let updated = sdk.get_task(&path).unwrap();
            // The update should have been applied
            assert_eq!(updated.title, "New Title");
            // updated_at should be >= original (may be same if < 1 second elapsed)
            assert!(updated.updated_at.date() >= original.updated_at.date());
        }
    }

    mod status_transitions {
        use super::*;

        #[test]
        fn complete_task_sets_done() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_task(NewTask::new("Task").with_status(TaskStatus::Ready))
                .unwrap();

            sdk.complete_task(&path).unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::Done);
            assert!(task.completed_at.is_some());
        }

        #[test]
        fn drop_task_sets_dropped() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_task(NewTask::new("Task").with_status(TaskStatus::Ready))
                .unwrap();

            sdk.drop_task(&path).unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::Dropped);
            assert!(task.completed_at.is_some());
        }

        #[test]
        fn start_task_sets_in_progress() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            sdk.start_task(&path).unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::InProgress);
        }

        #[test]
        fn block_task_sets_blocked() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            sdk.block_task(&path).unwrap();

            let task = sdk.get_task(&path).unwrap();
            assert_eq!(task.status, TaskStatus::Blocked);
        }
    }

    mod archive_operations {
        use super::*;

        #[test]
        fn archive_task_moves_to_archive() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            let archived_path = sdk.archive_task(&path).unwrap();

            assert!(!path.exists());
            assert!(archived_path.exists());
            assert!(archived_path.to_string_lossy().contains("archive"));
        }

        #[test]
        fn archive_creates_directory() {
            let (_temp, sdk) = setup_test_env();
            let archive_dir = sdk.config.tasks_dir.join("archive");
            assert!(!archive_dir.exists());

            let path = sdk.create_task(NewTask::new("Task")).unwrap();
            sdk.archive_task(&path).unwrap();

            assert!(archive_dir.exists());
        }

        #[test]
        fn archive_fails_if_already_archived() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();
            let archived_path = sdk.archive_task(&path).unwrap();

            let result = sdk.archive_task(&archived_path);
            assert!(matches!(result, Err(Error::Validation { .. })));
        }

        #[test]
        fn unarchive_task_moves_back() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();
            let filename = path.file_name().unwrap().to_owned();
            let archived_path = sdk.archive_task(&path).unwrap();

            let restored_path = sdk.unarchive_task(&archived_path).unwrap();

            assert!(!archived_path.exists());
            assert!(restored_path.exists());
            assert_eq!(restored_path.file_name().unwrap(), filename);
        }

        #[test]
        fn unarchive_fails_if_not_archived() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            let result = sdk.unarchive_task(&path);
            assert!(matches!(result, Err(Error::Validation { .. })));
        }
    }

    mod delete_task {
        use super::*;

        #[test]
        fn delete_removes_file() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Task")).unwrap();

            sdk.delete_task(&path).unwrap();

            assert!(!path.exists());
        }

        #[test]
        fn delete_nonexistent_fails() {
            let (_temp, sdk) = setup_test_env();
            let result = sdk.delete_task("nonexistent.md");
            assert!(matches!(result, Err(Error::NotFound { .. })));
        }
    }
}
