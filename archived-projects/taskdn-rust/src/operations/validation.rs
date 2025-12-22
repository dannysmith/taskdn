//! Validation operations for the Taskdn SDK.

use crate::error::{Error, Result};
use crate::filter::TaskFilter;
use crate::validation::ValidationWarning;
use crate::Taskdn;
use std::path::{Path, PathBuf};

impl Taskdn {
    /// Validate a single task file.
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Returns
    /// `Ok(())` if the task is valid, otherwise returns an error with validation details.
    ///
    /// # Errors
    /// Returns `Error::Validation` if the task has validation errors (like `MissingCompletedAt`).
    /// Returns `Error::NotFound` if the file doesn't exist.
    pub fn validate_task(&self, path: impl AsRef<Path>) -> Result<()> {
        let task = self.get_task(path)?;
        let warnings = task.validate();

        // Treat MissingCompletedAt as a hard error (spec requirement)
        let errors: Vec<&ValidationWarning> = warnings
            .iter()
            .filter(|w| matches!(w, ValidationWarning::MissingCompletedAt))
            .collect();

        if errors.is_empty() {
            Ok(())
        } else {
            let error_messages: Vec<String> = errors.iter().map(|w| w.message()).collect();
            Err(Error::Validation {
                path: task.path,
                message: error_messages.join("; "),
            })
        }
    }

    /// Validate all task files in the tasks directory.
    ///
    /// This includes archived tasks.
    ///
    /// # Returns
    /// A vector of `(PathBuf, Error)` tuples for each task that failed validation.
    /// An empty vector means all tasks are valid.
    #[must_use]
    pub fn validate_all_tasks(&self) -> Vec<(PathBuf, Error)> {
        let mut errors = Vec::new();

        // Get all tasks including archived
        let tasks = match self.list_tasks(&TaskFilter::new().include_archive_dir()) {
            Ok(tasks) => tasks,
            Err(e) => {
                errors.push((self.config.tasks_dir.clone(), e));
                return errors;
            }
        };

        for task in tasks {
            let warnings = task.validate();

            // Check for hard errors (MissingCompletedAt)
            let has_errors = warnings
                .iter()
                .any(|w| matches!(w, ValidationWarning::MissingCompletedAt));

            if has_errors {
                let error_messages: Vec<String> = warnings
                    .iter()
                    .filter(|w| matches!(w, ValidationWarning::MissingCompletedAt))
                    .map(ValidationWarning::message)
                    .collect();

                errors.push((
                    task.path.clone(),
                    Error::Validation {
                        path: task.path,
                        message: error_messages.join("; "),
                    },
                ));
            }
        }

        errors
    }

    /// Get validation warnings for a task (including non-fatal issues).
    ///
    /// # Arguments
    /// * `path` - Path to the task file
    ///
    /// # Returns
    /// A vector of validation warnings for the task.
    ///
    /// # Errors
    /// Returns an error if the task cannot be read.
    pub fn get_task_warnings(&self, path: impl AsRef<Path>) -> Result<Vec<ValidationWarning>> {
        let task = self.get_task(path)?;
        Ok(task.validate())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::NewTask;
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

    mod validate_task {
        use super::*;

        #[test]
        fn valid_task_passes() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_task(NewTask::new("Valid Task")).unwrap();

            let result = sdk.validate_task(&path);
            assert!(result.is_ok());
        }

        #[test]
        fn task_without_completed_at_when_done_fails() {
            let (_temp, sdk) = setup_test_env();

            // Manually create a task that's done but missing completed_at
            let content = r#"---
title: Invalid Done Task
status: done
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let path = sdk.config.tasks_dir.join("invalid.md");
            fs::write(&path, content).unwrap();

            let result = sdk.validate_task(&path);
            assert!(matches!(result, Err(Error::Validation { .. })));
        }
    }

    mod validate_all_tasks {
        use super::*;

        #[test]
        fn all_valid_returns_empty() {
            let (_temp, sdk) = setup_test_env();
            sdk.create_task(NewTask::new("Task 1")).unwrap();
            sdk.create_task(NewTask::new("Task 2")).unwrap();

            let errors = sdk.validate_all_tasks();
            assert!(errors.is_empty());
        }

        #[test]
        fn returns_errors_for_invalid_tasks() {
            let (_temp, sdk) = setup_test_env();

            // Create valid task
            sdk.create_task(NewTask::new("Valid")).unwrap();

            // Create invalid task (done without completed_at)
            let content = r#"---
title: Invalid
status: done
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let path = sdk.config.tasks_dir.join("invalid.md");
            fs::write(&path, content).unwrap();

            let errors = sdk.validate_all_tasks();
            assert_eq!(errors.len(), 1);
            assert!(errors[0].0.ends_with("invalid.md"));
        }

        #[test]
        fn includes_archived_tasks() {
            let (_temp, sdk) = setup_test_env();

            // Create and archive an invalid task
            let archive_dir = sdk.config.tasks_dir.join("archive");
            fs::create_dir_all(&archive_dir).unwrap();

            let content = r#"---
title: Archived Invalid
status: done
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let path = archive_dir.join("archived-invalid.md");
            fs::write(&path, content).unwrap();

            let errors = sdk.validate_all_tasks();
            assert_eq!(errors.len(), 1);
            assert!(errors[0].0.to_string_lossy().contains("archive"));
        }
    }

    mod get_task_warnings {
        use super::*;

        #[test]
        fn returns_warnings() {
            let (_temp, sdk) = setup_test_env();

            // Create task with multiple projects (should warn per spec)
            let content = r#"---
title: Multi Project Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-02
projects:
  - "[[Project A]]"
  - "[[Project B]]"
---
"#;
            let path = sdk.config.tasks_dir.join("multi-project.md");
            fs::write(&path, content).unwrap();

            let warnings = sdk.get_task_warnings(&path).unwrap();
            assert!(!warnings.is_empty());
        }
    }
}
