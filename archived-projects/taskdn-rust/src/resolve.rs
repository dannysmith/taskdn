//! File reference resolution for `WikiLink`s and paths.

use std::path::PathBuf;

use crate::{Error, FileReference, Result, Taskdn};

impl Taskdn {
    /// Resolves a file reference to a project file path.
    ///
    /// # Resolution rules
    /// - `WikiLink`: Looks for `{target}.md` in `projects_dir`
    /// - `RelativePath`: Resolves relative to `projects_dir`
    /// - `Filename`: Looks for exact filename in `projects_dir`
    ///
    /// # Errors
    /// Returns `Error::UnresolvedReference` if the file cannot be found.
    pub fn resolve_project_reference(&self, reference: &FileReference) -> Result<PathBuf> {
        self.resolve_reference(reference, &self.config.projects_dir)
    }

    /// Resolves a file reference to an area file path.
    ///
    /// # Resolution rules
    /// - `WikiLink`: Looks for `{target}.md` in `areas_dir`
    /// - `RelativePath`: Resolves relative to `areas_dir`
    /// - `Filename`: Looks for exact filename in `areas_dir`
    ///
    /// # Errors
    /// Returns `Error::UnresolvedReference` if the file cannot be found.
    pub fn resolve_area_reference(&self, reference: &FileReference) -> Result<PathBuf> {
        self.resolve_reference(reference, &self.config.areas_dir)
    }

    /// Resolves a file reference to a task file path.
    ///
    /// # Resolution rules
    /// - `WikiLink`: Looks for `{target}.md` in `tasks_dir`
    /// - `RelativePath`: Resolves relative to `tasks_dir`
    /// - `Filename`: Looks for exact filename in `tasks_dir`
    ///
    /// # Errors
    /// Returns `Error::UnresolvedReference` if the file cannot be found.
    pub fn resolve_task_reference(&self, reference: &FileReference) -> Result<PathBuf> {
        self.resolve_reference(reference, &self.config.tasks_dir)
    }

    /// Internal resolution logic for any directory.
    #[allow(clippy::unused_self)] // May use self for caching in the future
    fn resolve_reference(
        &self,
        reference: &FileReference,
        base_dir: &std::path::Path,
    ) -> Result<PathBuf> {
        let path = match reference {
            FileReference::WikiLink { target, .. } => {
                // WikiLinks resolve to {target}.md in the base directory
                base_dir.join(format!("{target}.md"))
            }
            FileReference::RelativePath(rel_path) => {
                // Relative paths resolve from the base directory
                base_dir.join(rel_path)
            }
            FileReference::Filename(filename) => {
                // Filenames are looked up directly in the base directory
                base_dir.join(filename)
            }
        };

        // Canonicalize to resolve any ../ components and verify existence
        if path.exists() {
            Ok(path)
        } else {
            Err(Error::UnresolvedReference {
                reference: reference.to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_dirs() -> (TempDir, Taskdn) {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().join("tasks");
        let projects_dir = temp.path().join("projects");
        let areas_dir = temp.path().join("areas");

        fs::create_dir_all(&tasks_dir).unwrap();
        fs::create_dir_all(&projects_dir).unwrap();
        fs::create_dir_all(&areas_dir).unwrap();

        let config = crate::TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
        let sdk = Taskdn::new(config).unwrap();

        (temp, sdk)
    }

    #[test]
    fn resolve_wikilink_project() {
        let (temp, sdk) = setup_test_dirs();

        // Create a project file
        let project_path = temp.path().join("projects/Q1 Planning.md");
        fs::write(&project_path, "test").unwrap();

        let reference = FileReference::wiki_link("Q1 Planning");
        let resolved = sdk.resolve_project_reference(&reference).unwrap();

        assert_eq!(resolved, project_path);
    }

    #[test]
    fn resolve_wikilink_not_found() {
        let (_temp, sdk) = setup_test_dirs();

        let reference = FileReference::wiki_link("Nonexistent");
        let result = sdk.resolve_project_reference(&reference);

        assert!(matches!(result, Err(Error::UnresolvedReference { .. })));
    }

    #[test]
    fn resolve_relative_path() {
        let (temp, sdk) = setup_test_dirs();

        // Create a nested project file
        let nested_dir = temp.path().join("projects/subdir");
        fs::create_dir_all(&nested_dir).unwrap();
        let project_path = nested_dir.join("nested.md");
        fs::write(&project_path, "test").unwrap();

        let reference = FileReference::relative_path("./subdir/nested.md");
        let resolved = sdk.resolve_project_reference(&reference).unwrap();

        assert_eq!(resolved, temp.path().join("projects/subdir/nested.md"));
    }

    #[test]
    fn resolve_filename() {
        let (temp, sdk) = setup_test_dirs();

        // Create a project file
        let project_path = temp.path().join("projects/my-project.md");
        fs::write(&project_path, "test").unwrap();

        let reference = FileReference::filename("my-project.md");
        let resolved = sdk.resolve_project_reference(&reference).unwrap();

        assert_eq!(resolved, project_path);
    }

    #[test]
    fn resolve_area_wikilink() {
        let (temp, sdk) = setup_test_dirs();

        // Create an area file
        let area_path = temp.path().join("areas/Work.md");
        fs::write(&area_path, "test").unwrap();

        let reference = FileReference::wiki_link("Work");
        let resolved = sdk.resolve_area_reference(&reference).unwrap();

        assert_eq!(resolved, area_path);
    }

    #[test]
    fn resolve_task_wikilink() {
        let (temp, sdk) = setup_test_dirs();

        // Create a task file
        let task_path = temp.path().join("tasks/Buy groceries.md");
        fs::write(&task_path, "test").unwrap();

        let reference = FileReference::wiki_link("Buy groceries");
        let resolved = sdk.resolve_task_reference(&reference).unwrap();

        assert_eq!(resolved, task_path);
    }

    #[test]
    fn resolve_wikilink_with_heading_ignores_heading() {
        let (temp, sdk) = setup_test_dirs();

        // Create a project file
        let project_path = temp.path().join("projects/Project.md");
        fs::write(&project_path, "test").unwrap();

        // Parse a WikiLink with heading - heading should be stripped during parse
        let reference = FileReference::parse("[[Project#Section]]");
        let resolved = sdk.resolve_project_reference(&reference).unwrap();

        assert_eq!(resolved, project_path);
    }

    #[test]
    fn resolve_wikilink_with_special_characters() {
        let (temp, sdk) = setup_test_dirs();

        // Create a project file with special characters in name
        let project_path = temp.path().join("projects/John's Q1 (2025) Planning.md");
        fs::write(&project_path, "test").unwrap();

        let reference = FileReference::wiki_link("John's Q1 (2025) Planning");
        let resolved = sdk.resolve_project_reference(&reference).unwrap();

        assert_eq!(resolved, project_path);
    }
}
