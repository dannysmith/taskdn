//! Area operations for the Taskdn SDK.

use crate::error::{Error, Result};
use crate::filter::{AreaFilter, ProjectFilter, TaskFilter};
use crate::types::{Area, AreaUpdates, NewArea, ParsedArea, Project, Task};
use crate::utils::generate_filename;
use crate::writer::write_area;
use crate::Taskdn;
use std::fs;
use std::path::{Path, PathBuf};

impl Taskdn {
    // ==========================================================================
    // Read Operations
    // ==========================================================================

    /// Get a single area by path.
    ///
    /// # Arguments
    /// * `path` - Path to the area file (absolute or relative to `areas_dir`)
    ///
    /// # Errors
    /// Returns `Error::NotFound` if the file doesn't exist.
    /// Returns `Error::Parse` if the file cannot be parsed.
    pub fn get_area(&self, path: impl AsRef<Path>) -> Result<Area> {
        let path = self.resolve_area_path(path.as_ref())?;
        let content =
            fs::read_to_string(&path).map_err(|_| Error::NotFound { path: path.clone() })?;

        ParsedArea::parse(&content)
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

    /// List areas matching a filter.
    ///
    /// # Arguments
    /// * `filter` - Filter criteria for matching areas
    ///
    /// # Errors
    /// Returns an error if the areas directory cannot be read.
    pub fn list_areas(&self, filter: &AreaFilter) -> Result<Vec<Area>> {
        let mut areas = Vec::new();
        let entries = fs::read_dir(&self.config.areas_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();

            // Skip directories
            if path.is_dir() {
                continue;
            }

            // Only process .md files
            if path.extension().is_some_and(|e| e == "md") {
                // Try to parse the area, skip if invalid
                if let Ok(area) = self.get_area(&path) {
                    if filter.matches(&area) {
                        areas.push(area);
                    }
                }
            }
        }

        Ok(areas)
    }

    // ==========================================================================
    // Create Operations
    // ==========================================================================

    /// Create a new area, returns the path where it was created.
    ///
    /// # Arguments
    /// * `area` - The area data to create
    ///
    /// # Errors
    /// Returns an error if the file cannot be created.
    pub fn create_area(&self, area: NewArea) -> Result<PathBuf> {
        let filename = area
            .filename
            .clone()
            .unwrap_or_else(|| generate_filename(&area.title));

        let path = self.config.areas_dir.join(&filename);

        // Check if file already exists
        if path.exists() {
            return Err(Error::Validation {
                path: path.clone(),
                message: format!("file already exists: {filename}"),
            });
        }

        let full_area = Area {
            path: path.clone(),
            title: area.title,
            status: area.status,
            area_type: area.area_type,
            description: area.description,
            body: area.body,
            extra: area.extra,
        };

        write_area(&path, &full_area)?;
        Ok(path)
    }

    // ==========================================================================
    // Update Operations
    // ==========================================================================

    /// Update an area with partial changes.
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    /// * `updates` - Partial updates to apply
    ///
    /// # Errors
    /// Returns an error if the file cannot be read or written.
    pub fn update_area(&self, path: impl AsRef<Path>, updates: AreaUpdates) -> Result<()> {
        let path = self.resolve_area_path(path.as_ref())?;
        let mut area = self.get_area(&path)?;

        // Apply updates
        if let Some(title) = updates.title {
            area.title = title;
        }
        if let Some(status) = updates.status {
            area.status = status;
        }
        if let Some(area_type) = updates.area_type {
            area.area_type = area_type;
        }
        if let Some(description) = updates.description {
            area.description = description;
        }

        write_area(&path, &area)
    }

    // ==========================================================================
    // Delete Operations
    // ==========================================================================

    /// Permanently delete an area file.
    ///
    /// # Arguments
    /// * `path` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the file cannot be deleted.
    pub fn delete_area(&self, path: impl AsRef<Path>) -> Result<()> {
        let path = self.resolve_area_path(path.as_ref())?;
        fs::remove_file(&path).map_err(|_| Error::NotFound { path })
    }

    // ==========================================================================
    // Related Entity Operations
    // ==========================================================================

    /// Get all projects assigned to this area.
    ///
    /// # Arguments
    /// * `area` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the projects directory cannot be read.
    pub fn get_projects_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Project>> {
        let area_path = self.resolve_area_path(area.as_ref())?;
        let area = self.get_area(&area_path)?;

        let area_filename = area_path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        let area_stem = area_path.file_stem().and_then(|n| n.to_str()).unwrap_or("");

        // Get all projects and filter by area reference
        let all_projects = self.list_projects(&ProjectFilter::new())?;

        let matching_projects: Vec<Project> = all_projects
            .into_iter()
            .filter(|project| {
                project
                    .area
                    .as_ref()
                    .is_some_and(|ref area_ref| match area_ref {
                        crate::FileReference::WikiLink { target, .. } => {
                            target == area_stem || target == &area.title
                        }
                        crate::FileReference::Filename(name) => name == area_filename,
                        crate::FileReference::RelativePath(rel_path) => {
                            rel_path.ends_with(area_filename)
                        }
                    })
            })
            .collect();

        Ok(matching_projects)
    }

    /// Get all tasks assigned to this area.
    ///
    /// This includes:
    /// - Tasks directly assigned to the area (via `area` field)
    /// - Tasks assigned via projects that belong to this area
    ///
    /// # Arguments
    /// * `area` - Path to the area file
    ///
    /// # Errors
    /// Returns an error if the tasks/projects directories cannot be read.
    pub fn get_tasks_for_area(&self, area: impl AsRef<Path>) -> Result<Vec<Task>> {
        let area_path = self.resolve_area_path(area.as_ref())?;
        let area = self.get_area(&area_path)?;

        let area_filename = area_path.file_name().and_then(|n| n.to_str()).unwrap_or("");

        let area_stem = area_path.file_stem().and_then(|n| n.to_str()).unwrap_or("");

        // Get all tasks
        let all_tasks = self.list_tasks(&TaskFilter::new().include_archive_dir())?;

        // Get projects for this area
        let area_projects = self.get_projects_for_area(&area_path)?;
        let project_stems: Vec<String> = area_projects
            .iter()
            .filter_map(|p| {
                p.path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .map(String::from)
            })
            .collect();
        let project_titles: Vec<&str> = area_projects.iter().map(|p| p.title.as_str()).collect();

        let matching_tasks: Vec<Task> = all_tasks
            .into_iter()
            .filter(|task| {
                // Check direct area assignment
                let direct_match = task
                    .area
                    .as_ref()
                    .is_some_and(|ref area_ref| match area_ref {
                        crate::FileReference::WikiLink { target, .. } => {
                            target == area_stem || target == &area.title
                        }
                        crate::FileReference::Filename(name) => name == area_filename,
                        crate::FileReference::RelativePath(rel_path) => {
                            rel_path.ends_with(area_filename)
                        }
                    });

                // Check via project
                let via_project =
                    task.project
                        .as_ref()
                        .is_some_and(|ref proj_ref| match proj_ref {
                            crate::FileReference::WikiLink { target, .. } => {
                                project_stems.contains(&target.to_string())
                                    || project_titles.contains(&target.as_str())
                            }
                            crate::FileReference::Filename(name) => project_stems
                                .iter()
                                .any(|stem| name == &format!("{stem}.md")),
                            crate::FileReference::RelativePath(rel_path) => project_stems
                                .iter()
                                .any(|stem| rel_path.ends_with(&format!("{stem}.md"))),
                        });

                direct_match || via_project
            })
            .collect();

        Ok(matching_tasks)
    }

    // ==========================================================================
    // Internal Helpers
    // ==========================================================================

    /// Resolve an area path - if relative, resolve against `areas_dir`.
    fn resolve_area_path(&self, path: &Path) -> Result<PathBuf> {
        if path.is_absolute() {
            if path.exists() {
                Ok(path.to_path_buf())
            } else {
                Err(Error::NotFound {
                    path: path.to_path_buf(),
                })
            }
        } else {
            let full_path = self.config.areas_dir.join(path);
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
    use crate::types::{AreaStatus, FileReference, NewProject, NewTask};
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

    fn create_area_file(dir: &Path, filename: &str, content: &str) {
        let path = dir.join(filename);
        fs::write(path, content).unwrap();
    }

    fn sample_area_content(title: &str, status: Option<&str>) -> String {
        let status_line = status.map(|s| format!("status: {s}\n")).unwrap_or_default();
        format!(
            r#"---
title: {title}
{status_line}---

Area body.
"#
        )
    }

    mod get_area {
        use super::*;

        #[test]
        fn get_existing_area() {
            let (_temp, sdk) = setup_test_env();
            create_area_file(
                &sdk.config.areas_dir,
                "test-area.md",
                &sample_area_content("Test Area", Some("active")),
            );

            let area = sdk.get_area("test-area.md").unwrap();
            assert_eq!(area.title, "Test Area");
            assert_eq!(area.status, Some(AreaStatus::Active));
        }

        #[test]
        fn get_nonexistent_area() {
            let (_temp, sdk) = setup_test_env();
            let result = sdk.get_area("nonexistent.md");
            assert!(matches!(result, Err(Error::NotFound { .. })));
        }
    }

    mod list_areas {
        use super::*;

        #[test]
        fn list_all_areas() {
            let (_temp, sdk) = setup_test_env();
            create_area_file(
                &sdk.config.areas_dir,
                "area1.md",
                &sample_area_content("Area 1", Some("active")),
            );
            create_area_file(
                &sdk.config.areas_dir,
                "area2.md",
                &sample_area_content("Area 2", Some("archived")),
            );

            let areas = sdk.list_areas(&AreaFilter::new()).unwrap();
            assert_eq!(areas.len(), 2);
        }

        #[test]
        fn list_with_status_filter() {
            let (_temp, sdk) = setup_test_env();
            create_area_file(
                &sdk.config.areas_dir,
                "area1.md",
                &sample_area_content("Area 1", Some("active")),
            );
            create_area_file(
                &sdk.config.areas_dir,
                "area2.md",
                &sample_area_content("Area 2", Some("archived")),
            );

            let areas = sdk.list_areas(&AreaFilter::active()).unwrap();
            assert_eq!(areas.len(), 1);
            assert_eq!(areas[0].title, "Area 1");
        }
    }

    mod create_area {
        use super::*;

        #[test]
        fn create_basic_area() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_area(NewArea::new("My New Area")).unwrap();

            assert!(path.exists());
            let area = sdk.get_area(&path).unwrap();
            assert_eq!(area.title, "My New Area");
        }

        #[test]
        fn create_with_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_area(NewArea::new("Area").with_status(AreaStatus::Active))
                .unwrap();

            let area = sdk.get_area(&path).unwrap();
            assert_eq!(area.status, Some(AreaStatus::Active));
        }
    }

    mod update_area {
        use super::*;

        #[test]
        fn update_title() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_area(NewArea::new("Original")).unwrap();

            sdk.update_area(&path, AreaUpdates::new().title("Updated"))
                .unwrap();

            let area = sdk.get_area(&path).unwrap();
            assert_eq!(area.title, "Updated");
        }

        #[test]
        fn update_status() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk
                .create_area(NewArea::new("Area").with_status(AreaStatus::Active))
                .unwrap();

            sdk.update_area(&path, AreaUpdates::new().status(AreaStatus::Archived))
                .unwrap();

            let area = sdk.get_area(&path).unwrap();
            assert_eq!(area.status, Some(AreaStatus::Archived));
        }
    }

    mod delete_area {
        use super::*;

        #[test]
        fn delete_removes_file() {
            let (_temp, sdk) = setup_test_env();
            let path = sdk.create_area(NewArea::new("Area")).unwrap();

            sdk.delete_area(&path).unwrap();

            assert!(!path.exists());
        }
    }

    mod get_projects_for_area {
        use super::*;

        #[test]
        fn gets_projects_with_wikilink_reference() {
            let (_temp, sdk) = setup_test_env();

            let area_path = sdk
                .create_area(NewArea::new("Work").with_filename("work.md"))
                .unwrap();

            sdk.create_project(
                NewProject::new("Project 1")
                    .with_filename("project1.md")
                    .in_area(FileReference::wiki_link("work")),
            )
            .unwrap();
            sdk.create_project(NewProject::new("Project 2").with_filename("project2.md"))
                .unwrap();

            let projects = sdk.get_projects_for_area(&area_path).unwrap();
            assert_eq!(projects.len(), 1);
            assert_eq!(projects[0].title, "Project 1");
        }
    }

    mod get_tasks_for_area {
        use super::*;

        #[test]
        fn gets_tasks_with_direct_area_reference() {
            let (_temp, sdk) = setup_test_env();

            let area_path = sdk
                .create_area(NewArea::new("Work").with_filename("work.md"))
                .unwrap();

            sdk.create_task(NewTask::new("Task 1").in_area(FileReference::wiki_link("work")))
                .unwrap();
            sdk.create_task(NewTask::new("Task 2")).unwrap();

            let tasks = sdk.get_tasks_for_area(&area_path).unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Task 1");
        }

        #[test]
        fn gets_tasks_via_project() {
            let (_temp, sdk) = setup_test_env();

            let area_path = sdk
                .create_area(NewArea::new("Work").with_filename("work.md"))
                .unwrap();

            sdk.create_project(
                NewProject::new("My Project")
                    .with_filename("my-project.md")
                    .in_area(FileReference::wiki_link("work")),
            )
            .unwrap();

            // Task assigned to project (which is in the area)
            sdk.create_task(
                NewTask::new("Task Via Project").in_project(FileReference::wiki_link("my-project")),
            )
            .unwrap();

            let tasks = sdk.get_tasks_for_area(&area_path).unwrap();
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Task Via Project");
        }

        #[test]
        fn gets_both_direct_and_via_project_tasks() {
            let (_temp, sdk) = setup_test_env();

            let area_path = sdk
                .create_area(NewArea::new("Work").with_filename("work.md"))
                .unwrap();

            sdk.create_project(
                NewProject::new("Project")
                    .with_filename("project.md")
                    .in_area(FileReference::wiki_link("work")),
            )
            .unwrap();

            // Direct area reference
            sdk.create_task(NewTask::new("Direct Task").in_area(FileReference::wiki_link("work")))
                .unwrap();

            // Via project
            sdk.create_task(
                NewTask::new("Project Task").in_project(FileReference::wiki_link("project")),
            )
            .unwrap();

            // Unrelated
            sdk.create_task(NewTask::new("Unrelated")).unwrap();

            let tasks = sdk.get_tasks_for_area(&area_path).unwrap();
            assert_eq!(tasks.len(), 2);
        }
    }
}
