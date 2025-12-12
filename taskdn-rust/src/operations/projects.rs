//! Project operations for the Taskdn SDK.

use crate::error::{Error, Result};
use crate::filter::{ProjectFilter, TaskFilter};
use crate::types::{NewProject, ParsedProject, Project, ProjectUpdates, Task};
use crate::utils::generate_filename;
use crate::writer::write_project;
use crate::Taskdn;
use rayon::prelude::*;
use std::fs;
use std::path::{Path, PathBuf};

impl Taskdn {
    // ==========================================================================
    // Read Operations
    // ==========================================================================

    /// Get a single project by path.
    ///
    /// # Arguments
    /// * `path` - Path to the project file (absolute or relative to `projects_dir`)
    ///
    /// # Errors
    /// Returns `Error::NotFound` if the file doesn't exist.
    /// Returns `Error::Parse` if the file cannot be parsed.
    pub fn get_project(&self, path: impl AsRef<Path>) -> Result<Project> {
        let path = self.resolve_project_path(path.as_ref())?;
        let content =
            fs::read_to_string(&path).map_err(|_| Error::NotFound { path: path.clone() })?;

        ParsedProject::parse(&content)
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

    /// List projects matching a filter.
    ///
    /// If any project in the directory has `taskdn-type: project` in its frontmatter,
    /// only files with that field will be included (opt-in behavior).
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for matching projects
    ///
    /// # Errors
    /// Returns an error if the projects directory cannot be read.
    pub fn list_projects(&self, filter: &ProjectFilter) -> Result<Vec<Project>> {
        let entries = fs::read_dir(&self.config.projects_dir)?;

        // Collect paths first for parallel processing
        let paths: Vec<PathBuf> = entries
            .flatten()
            .filter_map(|entry| {
                let path = entry.path();
                if path.is_file() && path.extension().is_some_and(|e| e == "md") {
                    Some(path)
                } else {
                    None
                }
            })
            .collect();

        // Parse all projects in parallel
        let all_projects: Vec<Project> = paths
            .par_iter()
            .filter_map(|path| self.get_project(path).ok())
            .collect();

        // Check for opt-in behavior: if any has taskdn-type: project, filter to those only
        let has_opt_in = all_projects
            .iter()
            .any(|p| Self::has_taskdn_type(&p.extra, "project"));

        let projects: Vec<Project> = if has_opt_in {
            all_projects
                .into_iter()
                .filter(|p| Self::has_taskdn_type(&p.extra, "project"))
                .filter(|p| filter.matches(p))
                .collect()
        } else {
            all_projects
                .into_iter()
                .filter(|p| filter.matches(p))
                .collect()
        };

        Ok(projects)
    }

    /// Check if extra fields contain `taskdn-type` with the specified value.
    fn has_taskdn_type(
        extra: &std::collections::HashMap<String, serde_yaml::Value>,
        expected: &str,
    ) -> bool {
        extra
            .get("taskdn-type")
            .is_some_and(|v| v.as_str().is_some_and(|s| s.eq_ignore_ascii_case(expected)))
    }

    // ==========================================================================
    // Create Operations
    // ==========================================================================

    /// Create a new project, returns the path where it was created.
    ///
    /// # Arguments
    /// * `project` - The project data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    pub fn create_project(&self, project: NewProject) -> Result<PathBuf> {
        let filename = project
            .filename
            .clone()
            .unwrap_or_else(|| generate_filename(&project.title));

        let path = self.config.projects_dir.join(&filename);

        // Check if file already exists
        if path.exists() {
            return Err(Error::Validation {
                path: path.clone(),
                message: format!("file already exists: {filename}"),
            });
        }

        let full_project = Project {
            path: path.clone(),
            title: project.title,
            unique_id: None,
            status: project.status,
            description: project.description,
            area: project.area,
            start_date: project.start_date,
            end_date: project.end_date,
            blocked_by: Vec::new(),
            body: project.body,
            extra: project.extra,
        };

        write_project(&path, &full_project)?;
        Ok(path)
    }

    // ==========================================================================
    // Update Operations
    // ==========================================================================

    /// Update a project with partial changes.
    ///
    /// # Arguments
    /// * `path` - Path to the project file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn update_project(&self, path: impl AsRef<Path>, updates: ProjectUpdates) -> Result<()> {
        let path = self.resolve_project_path(path.as_ref())?;
        let mut project = self.get_project(&path)?;

        // Apply updates
        if let Some(title) = updates.title {
            project.title = title;
        }
        if let Some(status) = updates.status {
            project.status = status;
        }
        if let Some(description) = updates.description {
            project.description = description;
        }
        if let Some(area) = updates.area {
            project.area = area;
        }
        if let Some(start_date) = updates.start_date {
            project.start_date = start_date;
        }
        if let Some(end_date) = updates.end_date {
            project.end_date = end_date;
        }

        write_project(&path, &project)
    }

    // ==========================================================================
    // Delete Operations
    // ==========================================================================

    /// Permanently delete a project file.
    ///
    /// # Arguments
    /// * `path` - Path to the project file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    pub fn delete_project(&self, path: impl AsRef<Path>) -> Result<()> {
        let path = self.resolve_project_path(path.as_ref())?;
        fs::remove_file(&path).map_err(|_| Error::NotFound { path })
    }

    // ==========================================================================
    // Related Entity Operations
    // ==========================================================================

    /// Get all tasks assigned to this project.
    ///
    /// # Arguments
    /// * `project` - Path to the project file
    ///
    /// # Errors
    /// Returns an error if the tasks directory cannot be read.
    pub fn get_tasks_for_project(&self, project: impl AsRef<Path>) -> Result<Vec<Task>> {
        let project_path = self.resolve_project_path(project.as_ref())?;
        let project = self.get_project(&project_path)?;

        // Create a reference that matches how tasks store project references
        // We need to match against any reference format that points to this project
        let project_filename = project_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        let project_stem = project_path
            .file_stem()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        // Get all tasks and filter by project reference
        let all_tasks = self.list_tasks(&TaskFilter::new().include_archive_dir())?;

        let matching_tasks: Vec<Task> = all_tasks
            .into_iter()
            .filter(|task| {
                task.project.as_ref().is_some_and(|ref proj_ref| {
                    // Check if the reference matches this project
                    match proj_ref {
                        crate::FileReference::WikiLink { target, .. } => {
                            target == project_stem || target == &project.title
                        }
                        crate::FileReference::Filename(name) => name == project_filename,
                        crate::FileReference::RelativePath(rel_path) => {
                            rel_path.ends_with(project_filename)
                        }
                    }
                })
            })
            .collect();

        Ok(matching_tasks)
    }

    // ==========================================================================
    // Internal Helpers
    // ==========================================================================

    /// Resolve a project path - if relative, resolve against `projects_dir`.
    fn resolve_project_path(&self, path: &Path) -> Result<PathBuf> {
        if path.is_absolute() {
            if path.exists() {
                Ok(path.to_path_buf())
            } else {
                Err(Error::NotFound {
                    path: path.to_path_buf(),
                })
            }
        } else {
            let full_path = self.config.projects_dir.join(path);
            if full_path.exists() {
                Ok(full_path)
            } else {
                Err(Error::NotFound { path: full_path })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{FileReference, NewTask, ProjectStatus};
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

    fn create_project_file(dir: &Path, filename: &str, content: &str) {
        let path = dir.join(filename);
        fs::write(path, content).unwrap();
    }

    fn sample_project_content(title: &str, status: Option<&str>) -> String {
        let status_line = status.map(|s| format!("status: {s}\n")).unwrap_or_default();
        format!(
            r#"---
title: {title}
{status_line}---

Project body.
"#
        )
    }

    mod get_project {
        use super::*;

        #[test]
        fn get_existing_project() {
            let (_temp, sdk) = setup_test_env();
            create_project_file(
                &sdk.config.projects_dir,
                "test-project.md",
                &sample_project_content("Test Project", Some("in-progress")),
            );

            let project = sdk.get_project("test-project.md").unwrap();
            assert_eq!(project.title, "Test Project");
            assert_eq!(project.status, Some(ProjectStatus::InProgress));
        }

        #[test]
        fn get_nonexistent_project() {
            let (_temp, sdk) = setup_test_env();
            let result = sdk.get_project("nonexistent.md");
            assert!(matches!(result, Err(Error::NotFound { .. })));
        }
    }

    mod list_projects {
        use super::*;

        #[test]
        fn list_all_projects() {
            let (_temp, sdk) = setup_test_env();
            create_project_file(
                &sdk.config.projects_dir,
                "project1.md",
                &sample_project_content("Project 1", Some("in-progress")),
            );
            create_project_file(
                &sdk.config.projects_dir,
                "project2.md",
                &sample_project_content("Project 2", Some("planning")),
            );

            let projects = sdk.list_projects(&ProjectFilter::new()).unwrap();
            assert_eq!(projects.len(), 2);
        }

        #[test]
        fn list_with_status_filter() {
            let (_temp, sdk) = setup_test_env();
            create_project_file(
                &sdk.config.projects_dir,
                "project1.md",
                &sample_project_content("Project 1", Some("in-progress")),
            );
            create_project_file(
                &sdk.config.projects_dir,
                "project2.md",
                &sample_project_content("Project 2", Some("done")),
            );

            let projects = sdk
                .list_projects(&ProjectFilter::new().with_status(ProjectStatus::InProgress))
                .unwrap();
            assert_eq!(projects.len(), 1);
            assert_eq!(projects[0].title, "Project 1");
        }

        #[test]
        fn opt_in_filters_to_typed_projects_only() {
            let (_temp, sdk) = setup_test_env();

            // Regular project without taskdn-type
            create_project_file(
                &sdk.config.projects_dir,
                "regular.md",
                &sample_project_content("Regular Project", None),
            );

            // Project with taskdn-type: project
            create_project_file(
                &sdk.config.projects_dir,
                "typed.md",
                r#"---
title: Typed Project
taskdn-type: project
---

Body.
"#,
            );

            // Because one has taskdn-type, only that one should be returned
            let projects = sdk.list_projects(&ProjectFilter::new()).unwrap();
            assert_eq!(projects.len(), 1);
            assert_eq!(projects[0].title, "Typed Project");
        }

        #[test]
        fn no_opt_in_returns_all_projects() {
            let (_temp, sdk) = setup_test_env();

            // Two regular projects without taskdn-type
            create_project_file(
                &sdk.config.projects_dir,
                "project1.md",
                &sample_project_content("Project 1", None),
            );
            create_project_file(
                &sdk.config.projects_dir,
                "project2.md",
                &sample_project_content("Project 2", None),
            );

            // No opt-in, so both should be returned
            let projects = sdk.list_projects(&ProjectFilter::new()).unwrap();
            assert_eq!(projects.len(), 2);
        }
    }

    mod create_project {
        use super::*;

        #[test]
        fn create_basic_project() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_project(NewProject::new("My New Project"))
                .unwrap();

            assert!(path.exists());
            let project = sdk.get_project(&path).unwrap();
            assert_eq!(project.title, "My New Project");
        }

        #[test]
        fn create_with_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_project(NewProject::new("Project").with_status(ProjectStatus::Planning))
                .unwrap();

            let project = sdk.get_project(&path).unwrap();
            assert_eq!(project.status, Some(ProjectStatus::Planning));
        }

        #[test]
        fn create_fails_if_exists() {
            let (_temp, sdk) = setup_test_env();
            sdk.create_project(NewProject::new("Test").with_filename("test.md"))
                .unwrap();

            let result = sdk.create_project(NewProject::new("Test").with_filename("test.md"));
            assert!(matches!(result, Err(Error::Validation { .. })));
        }
    }

    mod update_project {
        use super::*;

        #[test]
        fn update_title() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_project(NewProject::new("Original")).unwrap();

            sdk.update_project(&path, ProjectUpdates::new().title("Updated"))
                .unwrap();

            let project = sdk.get_project(&path).unwrap();
            assert_eq!(project.title, "Updated");
        }

        #[test]
        fn update_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_project(NewProject::new("Project").with_status(ProjectStatus::Planning))
                .unwrap();

            sdk.update_project(&path, ProjectUpdates::new().status(ProjectStatus::Done))
                .unwrap();

            let project = sdk.get_project(&path).unwrap();
            assert_eq!(project.status, Some(ProjectStatus::Done));
        }
    }

    mod delete_project {
        use super::*;

        #[test]
        fn delete_removes_file() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_project(NewProject::new("Project")).unwrap();

            sdk.delete_project(&path).unwrap();

            assert!(!path.exists());
        }
    }

    mod get_tasks_for_project {
        use super::*;

        #[test]
        fn gets_tasks_with_wikilink_reference() {
            let (_temp, sdk) = setup_test_env();

            // Create a project
            let project_path = sdk
                .create_project(NewProject::new("My Project").with_filename("my-project.md"))
                .unwrap();

            // Create tasks - one referencing the project, one not
            sdk.create_task(
                NewTask::new("Task 1").in_project(FileReference::wiki_link("my-project")),
            )
            .unwrap();
            sdk.create_task(NewTask::new("Task 2")).unwrap();

            let tasks = sdk.get_tasks_for_project(&project_path).unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Task 1");
        }

        #[test]
        fn gets_tasks_with_filename_reference() {
            let (_temp, sdk) = setup_test_env();

            let project_path = sdk
                .create_project(NewProject::new("Project").with_filename("project.md"))
                .unwrap();

            sdk.create_task(NewTask::new("Task").in_project(FileReference::filename("project.md")))
                .unwrap();

            let tasks = sdk.get_tasks_for_project(&project_path).unwrap();
            assert_eq!(tasks.len(), 1);
        }

        #[test]
        fn returns_empty_when_no_tasks() {
            let (_temp, sdk) = setup_test_env();

            let project_path = sdk.create_project(NewProject::new("Project")).unwrap();
            sdk.create_task(NewTask::new("Unrelated Task")).unwrap();

            let tasks = sdk.get_tasks_for_project(&project_path).unwrap();
            assert!(tasks.is_empty());
        }
    }
}
