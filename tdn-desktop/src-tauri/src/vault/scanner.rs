//! File scanning and parsing infrastructure.
//!
//! Provides parallel file scanning for tasks, projects, and areas.
//! Uses rayon for efficient parallel processing with bounded resources.

use std::fs;
use std::path::Path;

use globset::{GlobBuilder, GlobSetBuilder};
use gray_matter::{engine::YAML, Matter};
use log::{debug, warn};
use rayon::prelude::*;
use serde::de::DeserializeOwned;

use crate::vault::{
    Area, AreaFrontmatter, Project, ProjectFrontmatter, Task, TaskFrontmatter, VaultError,
};

// Security: Resource limits to prevent DoS via large vaults
const MAX_FILES_PER_SCAN: usize = 10_000;
const MAX_PARALLEL_THREADS: usize = 8;

/// Configuration for vault directories
#[derive(Debug, Clone)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
    pub ignore: Option<Vec<String>>,
}

impl VaultConfig {
    /// Create config from preferences
    pub fn from_dirs(
        tasks_dir: impl Into<String>,
        projects_dir: impl Into<String>,
        areas_dir: impl Into<String>,
        ignore: Option<Vec<String>>,
    ) -> Self {
        Self {
            tasks_dir: tasks_dir.into(),
            projects_dir: projects_dir.into(),
            areas_dir: areas_dir.into(),
            ignore,
        }
    }

    /// Check if the configuration is valid (all directories exist)
    pub fn is_valid(&self) -> bool {
        Path::new(&self.tasks_dir).is_dir()
            && Path::new(&self.projects_dir).is_dir()
            && Path::new(&self.areas_dir).is_dir()
    }
}

/// Scan tasks directory and return all parseable tasks.
pub fn scan_tasks(config: &VaultConfig) -> Vec<Task> {
    scan_directory(&config.tasks_dir, config.ignore.as_ref(), parse_task_file)
}

/// Scan projects directory and return all parseable projects.
pub fn scan_projects(config: &VaultConfig) -> Vec<Project> {
    scan_directory(
        &config.projects_dir,
        config.ignore.as_ref(),
        parse_project_file,
    )
}

/// Scan areas directory and return all parseable areas.
pub fn scan_areas(config: &VaultConfig) -> Vec<Area> {
    scan_directory(&config.areas_dir, config.ignore.as_ref(), parse_area_file)
}

/// Parse a single task file.
pub fn parse_task_file(path: &str) -> Result<Task, VaultError> {
    let (frontmatter, body) = parse_frontmatter::<TaskFrontmatter>(path)?;
    Ok(Task::from_frontmatter(path.to_string(), frontmatter, body))
}

/// Parse a single project file.
pub fn parse_project_file(path: &str) -> Result<Project, VaultError> {
    let (frontmatter, body) = parse_frontmatter::<ProjectFrontmatter>(path)?;
    Ok(Project::from_frontmatter(
        path.to_string(),
        frontmatter,
        body,
    ))
}

/// Parse a single area file.
pub fn parse_area_file(path: &str) -> Result<Area, VaultError> {
    let (frontmatter, body) = parse_frontmatter::<AreaFrontmatter>(path)?;
    Ok(Area::from_frontmatter(path.to_string(), frontmatter, body))
}

/// Generic frontmatter parser.
fn parse_frontmatter<T: DeserializeOwned>(path: &str) -> Result<(T, String), VaultError> {
    let content = fs::read_to_string(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            VaultError::file_not_found(path)
        } else {
            VaultError::read_error(path, e.to_string())
        }
    })?;

    let matter = Matter::<YAML>::new();
    let parsed = matter
        .parse_with_struct::<T>(&content)
        .ok_or_else(|| VaultError::parse_error(path, "Failed to parse frontmatter"))?;

    Ok((parsed.data, parsed.content.to_string()))
}

/// Generic directory scanner that applies a parse function to each .md file.
/// Returns successfully parsed entities, skipping failures.
fn scan_directory<T, F>(
    dir_path: &str,
    ignore_patterns: Option<&Vec<String>>,
    parse_fn: F,
) -> Vec<T>
where
    F: Fn(&str) -> Result<T, VaultError> + Sync,
    T: Send,
{
    let path = Path::new(dir_path);

    debug!("Scanning directory: {dir_path}");

    // Build ignore matcher if patterns provided
    let ignore_set = build_ignore_set(ignore_patterns);

    // Return empty if directory doesn't exist
    if !path.exists() || !path.is_dir() {
        debug!("Directory does not exist or is not a directory: {dir_path}");
        return Vec::new();
    }

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(e) => {
            warn!("Failed to read directory {dir_path}: {e}");
            return Vec::new();
        }
    };

    // Collect entries for parallel processing
    let entries: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            // Only process files (not subdirectories)
            entry.file_type().map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter(|entry| {
            // Check ignore patterns on filename only
            if let Some(ref ignore_set) = ignore_set {
                if let Some(filename) = entry.path().file_name() {
                    if ignore_set.is_match(filename) {
                        debug!(
                            "Ignoring file (matched pattern): {}",
                            entry.path().display()
                        );
                        return false;
                    }
                }
            }
            true
        })
        .filter(|entry| {
            // Only process .md files
            entry
                .path()
                .extension()
                .map(|ext| ext == "md")
                .unwrap_or(false)
        })
        .take(MAX_FILES_PER_SCAN) // Security: Limit file count
        .collect();

    let file_count = entries.len();
    debug!("Found {file_count} .md files to process in {dir_path}");

    // Warn if we hit the file limit
    if file_count == MAX_FILES_PER_SCAN {
        warn!(
            "Directory {dir_path} contains {} or more files - processing limited to {MAX_FILES_PER_SCAN} for safety",
            MAX_FILES_PER_SCAN
        );
    }

    // Security: Configure thread pool with resource limits
    let pool = rayon::ThreadPoolBuilder::new()
        .num_threads(MAX_PARALLEL_THREADS)
        .build()
        .unwrap();

    // Process files in parallel with limited concurrency
    pool.install(|| {
        entries
            .par_iter()
            .filter_map(|entry| {
                let file_path = entry.path().to_string_lossy().to_string();
                match parse_fn(&file_path) {
                    Ok(entity) => {
                        debug!("Successfully parsed: {}", entry.path().display());
                        Some(entity)
                    }
                    Err(e) => {
                        warn!("Failed to parse file {}: {e}", entry.path().display());
                        None
                    }
                }
            })
            .collect()
    })
}

/// Build an ignore pattern set from a list of glob patterns.
fn build_ignore_set(patterns: Option<&Vec<String>>) -> Option<globset::GlobSet> {
    let patterns = patterns?;
    let mut builder = GlobSetBuilder::new();

    // Case sensitivity based on platform
    let case_insensitive = cfg!(any(target_os = "macos", target_os = "windows"));

    for pattern in patterns {
        match GlobBuilder::new(pattern)
            .case_insensitive(case_insensitive)
            .build()
        {
            Ok(glob) => {
                builder.add(glob);
            }
            Err(e) => {
                warn!("Invalid ignore pattern '{pattern}': {e} (skipping)");
            }
        }
    }

    match builder.build() {
        Ok(set) => {
            debug!("Built ignore set with {} patterns", patterns.len());
            Some(set)
        }
        Err(e) => {
            warn!("Failed to build ignore pattern set: {e}");
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    fn create_temp_vault() -> TempDir {
        TempDir::new().unwrap()
    }

    fn write_file(dir: &Path, name: &str, content: &str) {
        let file_path = dir.join(name);
        let mut file = File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
    }

    fn create_vault_config(temp_dir: &TempDir) -> VaultConfig {
        let tasks_dir = temp_dir.path().join("tasks");
        let projects_dir = temp_dir.path().join("projects");
        let areas_dir = temp_dir.path().join("areas");

        fs::create_dir_all(&tasks_dir).unwrap();
        fs::create_dir_all(&projects_dir).unwrap();
        fs::create_dir_all(&areas_dir).unwrap();

        VaultConfig {
            tasks_dir: tasks_dir.to_string_lossy().to_string(),
            projects_dir: projects_dir.to_string_lossy().to_string(),
            areas_dir: areas_dir.to_string_lossy().to_string(),
            ignore: None,
        }
    }

    #[test]
    fn scan_tasks_returns_parseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task2.md",
            "---\ntitle: Task Two\nstatus: in-progress\n---\n",
        );

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 2);

        let titles: Vec<&str> = tasks.iter().map(|t| t.title.as_str()).collect();
        assert!(titles.contains(&"Task One"));
        assert!(titles.contains(&"Task Two"));
    }

    #[test]
    fn scan_tasks_skips_unparseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "valid.md",
            "---\ntitle: Valid Task\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "malformed.md",
            "---\nno title here\n---\n",
        );

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Valid Task");
    }

    #[test]
    fn scan_tasks_excludes_subdirectories() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "main-task.md",
            "---\ntitle: Main Task\nstatus: ready\n---\n",
        );

        let archive_dir = Path::new(&config.tasks_dir).join("archive");
        fs::create_dir_all(&archive_dir).unwrap();
        write_file(
            &archive_dir,
            "archived-task.md",
            "---\ntitle: Archived Task\nstatus: done\n---\n",
        );

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Main Task");
    }

    #[test]
    fn scan_tasks_ignores_non_md_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task.md",
            "---\ntitle: Valid Task\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "readme.txt",
            "This is not a task",
        );
        write_file(Path::new(&config.tasks_dir), ".DS_Store", "binary stuff");

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Valid Task");
    }

    #[test]
    fn scan_tasks_returns_empty_for_nonexistent_directory() {
        let config = VaultConfig {
            tasks_dir: "/nonexistent/path/tasks".to_string(),
            projects_dir: "/nonexistent/path/projects".to_string(),
            areas_dir: "/nonexistent/path/areas".to_string(),
            ignore: None,
        };

        let tasks = scan_tasks(&config);
        assert!(tasks.is_empty());
    }

    #[test]
    fn scan_projects_returns_parseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.projects_dir),
            "project1.md",
            "---\ntitle: Project One\nstatus: planning\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "project2.md",
            "---\ntitle: Project Two\n---\n",
        );

        let projects = scan_projects(&config);
        assert_eq!(projects.len(), 2);
    }

    #[test]
    fn scan_areas_returns_parseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "area1.md",
            "---\ntitle: Area One\nstatus: active\n---\n",
        );
        write_file(
            Path::new(&config.areas_dir),
            "area2.md",
            "---\ntitle: Area Two\n---\n",
        );

        let areas = scan_areas(&config);
        assert_eq!(areas.len(), 2);
    }

    #[test]
    fn ignore_exact_filename() {
        let temp_dir = create_temp_vault();
        let mut config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task-1.md",
            "---\ntitle: Task 1\nstatus: inbox\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "cover.md",
            "---\ntitle: Cover\nstatus: inbox\n---\n",
        );

        config.ignore = Some(vec!["cover.md".to_string()]);

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Task 1");
    }

    #[test]
    fn ignore_wildcard_pattern() {
        let temp_dir = create_temp_vault();
        let mut config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task-1.md",
            "---\ntitle: Task 1\nstatus: inbox\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "backup.bak.md",
            "---\ntitle: Backup\nstatus: inbox\n---\n",
        );

        config.ignore = Some(vec!["*.bak.md".to_string()]);

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Task 1");
    }

    #[test]
    fn parse_task_with_body() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let content = r#"---
title: Task with Notes
status: in-progress
---
## Notes

This is the body content.

- Point 1
- Point 2
"#;
        write_file(Path::new(&config.tasks_dir), "task-with-body.md", content);

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Task with Notes");
        assert!(tasks[0].body.contains("## Notes"));
        assert!(tasks[0].body.contains("- Point 1"));
    }

    #[test]
    fn parse_task_with_all_fields() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let content = r#"---
title: Complete Task
status: ready
created-at: 2025-01-01T10:00:00Z
updated-at: 2025-01-05T15:30:00Z
due: 2025-01-15
scheduled: 2025-01-10
defer-until: 2025-01-08
area: "[[Work]]"
projects:
  - "[[Q1 Planning]]"
---
Body content here.
"#;
        write_file(Path::new(&config.tasks_dir), "complete-task.md", content);

        let tasks = scan_tasks(&config);
        assert_eq!(tasks.len(), 1);

        let task = &tasks[0];
        assert_eq!(task.title, "Complete Task");
        assert_eq!(task.created_at, Some("2025-01-01T10:00:00Z".to_string()));
        assert_eq!(task.due, Some("2025-01-15".to_string()));
        assert_eq!(task.scheduled, Some("2025-01-10".to_string()));
        assert_eq!(task.defer_until, Some("2025-01-08".to_string()));
        assert_eq!(task.area, Some("[[Work]]".to_string()));
        assert_eq!(task.project, Some("[[Q1 Planning]]".to_string()));
    }
}
