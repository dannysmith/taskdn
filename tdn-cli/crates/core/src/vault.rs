use std::fs;
use std::path::Path;

use rayon::prelude::*;

use crate::area::{Area, parse_area_file};
use crate::project::{Project, parse_project_file};
use crate::task::{Task, parse_task_file};

/// Configuration for vault directories
#[derive(Debug, Clone)]
#[napi(object)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
}

/// Scan tasks directory and return all parseable tasks.
/// Reads all .md files in the directory (not subdirectories).
/// Skips files that fail to parse.
#[napi]
pub fn scan_tasks(config: VaultConfig) -> Vec<Task> {
    scan_directory(&config.tasks_dir, parse_task_file)
}

/// Scan projects directory and return all parseable projects.
/// Reads all .md files in the directory (not subdirectories).
/// Skips files that fail to parse.
#[napi]
pub fn scan_projects(config: VaultConfig) -> Vec<Project> {
    scan_directory(&config.projects_dir, parse_project_file)
}

/// Scan areas directory and return all parseable areas.
/// Reads all .md files in the directory (not subdirectories).
/// Skips files that fail to parse.
#[napi]
pub fn scan_areas(config: VaultConfig) -> Vec<Area> {
    scan_directory(&config.areas_dir, parse_area_file)
}

/// Find tasks matching a query (case-insensitive substring on title).
/// Returns all matches - disambiguation is handled at the command layer.
#[napi]
pub fn find_tasks_by_title(config: VaultConfig, query: String) -> Vec<Task> {
    let query_lower = query.to_lowercase();
    scan_tasks(config)
        .into_iter()
        .filter(|task| task.title.to_lowercase().contains(&query_lower))
        .collect()
}

/// Find projects matching a query (case-insensitive substring on title).
/// Returns all matches - disambiguation is handled at the command layer.
#[napi]
pub fn find_projects_by_title(config: VaultConfig, query: String) -> Vec<Project> {
    let query_lower = query.to_lowercase();
    scan_projects(config)
        .into_iter()
        .filter(|project| project.title.to_lowercase().contains(&query_lower))
        .collect()
}

/// Find areas matching a query (case-insensitive substring on title).
/// Returns all matches - disambiguation is handled at the command layer.
#[napi]
pub fn find_areas_by_title(config: VaultConfig, query: String) -> Vec<Area> {
    let query_lower = query.to_lowercase();
    scan_areas(config)
        .into_iter()
        .filter(|area| area.title.to_lowercase().contains(&query_lower))
        .collect()
}

/// Generic directory scanner that applies a parse function to each .md file.
/// Returns successfully parsed entities, skipping failures.
/// Uses parallel processing via rayon for improved performance on large vaults.
fn scan_directory<T, F>(dir_path: &str, parse_fn: F) -> Vec<T>
where
    F: Fn(String) -> napi::Result<T> + Sync,
    T: Send,
{
    let path = Path::new(dir_path);

    // Return empty if directory doesn't exist
    if !path.exists() || !path.is_dir() {
        return Vec::new();
    }

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(_) => return Vec::new(),
    };

    // Collect entries into a Vec for parallel processing
    let entries: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            // Only process files (not subdirectories)
            entry.file_type().map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter(|entry| {
            // Only process .md files
            entry
                .path()
                .extension()
                .map(|ext| ext == "md")
                .unwrap_or(false)
        })
        .collect();

    // Process files in parallel
    entries
        .par_iter()
        .filter_map(|entry| {
            let file_path = entry.path().to_string_lossy().to_string();
            // Skip files that fail to parse (log would go here in production)
            parse_fn(file_path).ok()
        })
        .collect()
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
        }
    }

    #[test]
    fn scan_tasks_returns_parseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Create valid task files
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

        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 2);

        let titles: Vec<&str> = tasks.iter().map(|t| t.title.as_str()).collect();
        assert!(titles.contains(&"Task One"));
        assert!(titles.contains(&"Task Two"));
    }

    #[test]
    fn scan_tasks_skips_unparseable_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Create one valid and one malformed task
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

        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Valid Task");
    }

    #[test]
    fn scan_tasks_excludes_subdirectories() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Create a task in the main directory
        write_file(
            Path::new(&config.tasks_dir),
            "main-task.md",
            "---\ntitle: Main Task\nstatus: ready\n---\n",
        );

        // Create a subdirectory with a task
        let archive_dir = Path::new(&config.tasks_dir).join("archive");
        fs::create_dir_all(&archive_dir).unwrap();
        write_file(
            &archive_dir,
            "archived-task.md",
            "---\ntitle: Archived Task\nstatus: done\n---\n",
        );

        let tasks = scan_tasks(config);
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

        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Valid Task");
    }

    #[test]
    fn scan_tasks_returns_empty_for_nonexistent_directory() {
        let config = VaultConfig {
            tasks_dir: "/nonexistent/path/tasks".to_string(),
            projects_dir: "/nonexistent/path/projects".to_string(),
            areas_dir: "/nonexistent/path/areas".to_string(),
        };

        let tasks = scan_tasks(config);
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
            "---\ntitle: Project Two\n---\n", // Status is optional for projects
        );

        let projects = scan_projects(config);
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
            "---\ntitle: Area Two\n---\n", // Status is optional for areas
        );

        let areas = scan_areas(config);
        assert_eq!(areas.len(), 2);
    }

    // =========================================================================
    // Fuzzy Entity Lookup Tests
    // =========================================================================

    #[test]
    fn find_tasks_by_title_exact_match() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Fix Login Bug\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task2.md",
            "---\ntitle: Update Documentation\nstatus: ready\n---\n",
        );

        let matches = find_tasks_by_title(config, "Fix Login Bug".to_string());
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].title, "Fix Login Bug");
    }

    #[test]
    fn find_tasks_by_title_partial_match() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Fix Login Bug\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task2.md",
            "---\ntitle: Login Page Redesign\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task3.md",
            "---\ntitle: Update Documentation\nstatus: ready\n---\n",
        );

        let matches = find_tasks_by_title(config, "Login".to_string());
        assert_eq!(matches.len(), 2);

        let titles: Vec<&str> = matches.iter().map(|t| t.title.as_str()).collect();
        assert!(titles.contains(&"Fix Login Bug"));
        assert!(titles.contains(&"Login Page Redesign"));
    }

    #[test]
    fn find_tasks_by_title_case_insensitive() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Fix Login Bug\nstatus: ready\n---\n",
        );

        // Test different cases
        let config1 = create_vault_config(&temp_dir);
        let matches_lower = find_tasks_by_title(config1, "login".to_string());
        assert_eq!(matches_lower.len(), 1);

        let config2 = create_vault_config(&temp_dir);
        let matches_upper = find_tasks_by_title(config2, "LOGIN".to_string());
        assert_eq!(matches_upper.len(), 1);

        let config3 = create_vault_config(&temp_dir);
        let matches_mixed = find_tasks_by_title(config3, "LoGiN".to_string());
        assert_eq!(matches_mixed.len(), 1);
    }

    #[test]
    fn find_tasks_by_title_no_matches() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Fix Login Bug\nstatus: ready\n---\n",
        );

        let matches = find_tasks_by_title(config, "nonexistent".to_string());
        assert!(matches.is_empty());
    }

    #[test]
    fn find_projects_by_title_partial_match() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.projects_dir),
            "project1.md",
            "---\ntitle: Q1 Planning\nstatus: planning\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "project2.md",
            "---\ntitle: Q2 Planning\nstatus: planning\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "project3.md",
            "---\ntitle: Client Onboarding\n---\n",
        );

        let matches = find_projects_by_title(config, "Planning".to_string());
        assert_eq!(matches.len(), 2);
    }

    #[test]
    fn find_areas_by_title_partial_match() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "area1.md",
            "---\ntitle: Work\nstatus: active\n---\n",
        );
        write_file(
            Path::new(&config.areas_dir),
            "area2.md",
            "---\ntitle: Personal\nstatus: active\n---\n",
        );
        write_file(
            Path::new(&config.areas_dir),
            "area3.md",
            "---\ntitle: Work Projects\n---\n",
        );

        let matches = find_areas_by_title(config, "Work".to_string());
        assert_eq!(matches.len(), 2);
    }
}
