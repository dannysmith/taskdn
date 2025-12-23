//! Vault index and relationship-aware query functions.
//!
//! This module provides composite query functions that resolve relationships
//! between tasks, projects, and areas. The VaultIndex struct is internal;
//! TypeScript only sees the NAPI-exported query functions.
//!
//! Key design decisions:
//! - Simple operations (like `show`) don't build an index
//! - Only relationship-aware operations build what they need
//! - `get_projects_in_area()` skips reading task files (optimization)
//! - Broken references produce warnings, not errors

use std::collections::{HashMap, HashSet};

use crate::area::Area;
use crate::project::Project;
use crate::task::Task;
use crate::vault::{VaultConfig, scan_areas, scan_projects, scan_tasks};
use crate::wikilink::extract_wikilink_name;

// =============================================================================
// NAPI Result Types
// =============================================================================

/// Result for tasks-in-area query
#[derive(Debug, Clone)]
#[napi(object)]
pub struct TasksInAreaResult {
    pub tasks: Vec<Task>,
    /// Warnings about broken references (e.g., "Task 'X' references unknown project 'Y'")
    pub warnings: Vec<String>,
}

/// Full context for an area (for context command)
#[derive(Debug, Clone)]
#[napi(object)]
pub struct AreaContextResult {
    /// The area, or None if not found
    pub area: Option<Area>,
    /// Projects in this area
    pub projects: Vec<Project>,
    /// Tasks via projects + direct area assignment
    pub tasks: Vec<Task>,
    /// Warnings about broken references
    pub warnings: Vec<String>,
}

/// Full context for a project (for context command)
#[derive(Debug, Clone)]
#[napi(object)]
pub struct ProjectContextResult {
    /// The project, or None if not found
    pub project: Option<Project>,
    /// Parent area if any
    pub area: Option<Area>,
    /// Tasks in this project
    pub tasks: Vec<Task>,
    /// Warnings about broken references
    pub warnings: Vec<String>,
}

// =============================================================================
// Internal VaultIndex (not NAPI-exported)
// =============================================================================

/// Internal index for resolving relationships between entities.
/// Not exposed via NAPI - used internally by query functions.
struct VaultIndex {
    tasks: Vec<Task>,
    projects: Vec<Project>,
    areas: Vec<Area>,
    /// Map from lowercase area name to index in `areas`
    area_by_name: HashMap<String, usize>,
    /// Map from lowercase project name to index in `projects`
    project_by_name: HashMap<String, usize>,
    /// Map from project index to list of task indices
    tasks_by_project: HashMap<usize, Vec<usize>>,
    /// Map from area index to list of task indices (direct assignment)
    tasks_by_area: HashMap<usize, Vec<usize>>,
    /// Map from area index to list of project indices
    projects_by_area: HashMap<usize, Vec<usize>>,
}

impl VaultIndex {
    /// Build a full index (reads all entity types).
    fn build(config: &VaultConfig) -> Self {
        let tasks = scan_tasks(config.clone());
        let projects = scan_projects(config.clone());
        let areas = scan_areas(config.clone());

        Self::build_from_entities(tasks, projects, areas)
    }

    /// Build an index without tasks (for projects-only queries).
    /// This is an optimization - skips reading task files.
    fn build_without_tasks(config: &VaultConfig) -> Self {
        let projects = scan_projects(config.clone());
        let areas = scan_areas(config.clone());

        Self::build_from_entities(Vec::new(), projects, areas)
    }

    /// Build index from pre-loaded entities.
    fn build_from_entities(tasks: Vec<Task>, projects: Vec<Project>, areas: Vec<Area>) -> Self {
        // Build area name lookup (case-insensitive)
        let area_by_name: HashMap<String, usize> = areas
            .iter()
            .enumerate()
            .map(|(i, area)| (area.title.to_lowercase(), i))
            .collect();

        // Build project name lookup (case-insensitive)
        let project_by_name: HashMap<String, usize> = projects
            .iter()
            .enumerate()
            .map(|(i, project)| (project.title.to_lowercase(), i))
            .collect();

        // Build projects-by-area index
        let mut projects_by_area: HashMap<usize, Vec<usize>> = HashMap::new();
        for (project_idx, project) in projects.iter().enumerate() {
            if let Some(area_ref) = &project.area
                && let Some(area_name) = extract_wikilink_name(area_ref)
                && let Some(&area_idx) = area_by_name.get(&area_name.to_lowercase())
            {
                projects_by_area
                    .entry(area_idx)
                    .or_default()
                    .push(project_idx);
            }
        }

        // Build tasks-by-project and tasks-by-area indices
        let mut tasks_by_project: HashMap<usize, Vec<usize>> = HashMap::new();
        let mut tasks_by_area: HashMap<usize, Vec<usize>> = HashMap::new();

        for (task_idx, task) in tasks.iter().enumerate() {
            // Index by project
            if let Some(project_ref) = &task.project
                && let Some(project_name) = extract_wikilink_name(project_ref)
                && let Some(&project_idx) = project_by_name.get(&project_name.to_lowercase())
            {
                tasks_by_project
                    .entry(project_idx)
                    .or_default()
                    .push(task_idx);
            }

            // Index by direct area assignment
            if let Some(area_ref) = &task.area
                && let Some(area_name) = extract_wikilink_name(area_ref)
                && let Some(&area_idx) = area_by_name.get(&area_name.to_lowercase())
            {
                tasks_by_area.entry(area_idx).or_default().push(task_idx);
            }
        }

        Self {
            tasks,
            projects,
            areas,
            area_by_name,
            project_by_name,
            tasks_by_project,
            tasks_by_area,
            projects_by_area,
        }
    }

    /// Find area by name (case-insensitive).
    fn find_area(&self, name: &str) -> Option<&Area> {
        self.area_by_name
            .get(&name.to_lowercase())
            .map(|&idx| &self.areas[idx])
    }

    /// Find project by name (case-insensitive).
    fn find_project(&self, name: &str) -> Option<&Project> {
        self.project_by_name
            .get(&name.to_lowercase())
            .map(|&idx| &self.projects[idx])
    }

    /// Get projects in an area.
    fn get_projects_in_area(&self, area_name: &str) -> Vec<&Project> {
        let area_idx = match self.area_by_name.get(&area_name.to_lowercase()) {
            Some(&idx) => idx,
            None => return Vec::new(),
        };

        self.projects_by_area
            .get(&area_idx)
            .map(|indices| indices.iter().map(|&i| &self.projects[i]).collect())
            .unwrap_or_default()
    }

    /// Get tasks in an area (direct + via projects), with deduplication.
    /// Returns (tasks, warnings).
    fn get_tasks_in_area(&self, area_name: &str) -> (Vec<&Task>, Vec<String>) {
        let mut warnings = Vec::new();
        let mut task_indices: HashSet<usize> = HashSet::new();

        let area_idx = match self.area_by_name.get(&area_name.to_lowercase()) {
            Some(&idx) => idx,
            None => return (Vec::new(), warnings),
        };

        // 1. Tasks with direct area assignment
        if let Some(indices) = self.tasks_by_area.get(&area_idx) {
            task_indices.extend(indices.iter().copied());
        }

        // 2. Tasks via projects in this area
        if let Some(project_indices) = self.projects_by_area.get(&area_idx) {
            for &project_idx in project_indices {
                if let Some(task_indices_for_project) = self.tasks_by_project.get(&project_idx) {
                    task_indices.extend(task_indices_for_project.iter().copied());
                }
            }
        }

        // 3. Check for tasks with unresolvable project references (for warnings)
        for &task_idx in &task_indices {
            let task = &self.tasks[task_idx];
            if let Some(project_ref) = &task.project
                && let Some(project_name) = extract_wikilink_name(project_ref)
                && !self
                    .project_by_name
                    .contains_key(&project_name.to_lowercase())
            {
                warnings.push(format!(
                    "Task '{}' references unknown project '{}'",
                    task.title, project_name
                ));
            }
        }

        let tasks: Vec<&Task> = task_indices.iter().map(|&i| &self.tasks[i]).collect();
        (tasks, warnings)
    }

    /// Get tasks in a project.
    fn get_tasks_in_project(&self, project_name: &str) -> Vec<&Task> {
        let project_idx = match self.project_by_name.get(&project_name.to_lowercase()) {
            Some(&idx) => idx,
            None => return Vec::new(),
        };

        self.tasks_by_project
            .get(&project_idx)
            .map(|indices| indices.iter().map(|&i| &self.tasks[i]).collect())
            .unwrap_or_default()
    }

    /// Get the area for a project.
    fn get_area_for_project(&self, project: &Project) -> Option<&Area> {
        let area_ref = project.area.as_ref()?;
        let area_name = extract_wikilink_name(area_ref)?;
        self.find_area(area_name)
    }
}

// =============================================================================
// NAPI-exported Query Functions
// =============================================================================

/// Get tasks in an area (direct + via projects).
/// Reads: areas, projects, tasks. Builds index internally.
#[napi]
pub fn get_tasks_in_area(config: VaultConfig, area_name: String) -> TasksInAreaResult {
    let index = VaultIndex::build(&config);
    let (tasks, warnings) = index.get_tasks_in_area(&area_name);

    TasksInAreaResult {
        tasks: tasks.into_iter().cloned().collect(),
        warnings,
    }
}

/// Get projects in an area. Does NOT read task files.
/// Reads: areas, projects only.
#[napi]
pub fn get_projects_in_area(config: VaultConfig, area_name: String) -> Vec<Project> {
    let index = VaultIndex::build_without_tasks(&config);
    index
        .get_projects_in_area(&area_name)
        .into_iter()
        .cloned()
        .collect()
}

/// Get full context for an area (for context command).
#[napi]
pub fn get_area_context(config: VaultConfig, area_name: String) -> AreaContextResult {
    let index = VaultIndex::build(&config);

    let area = index.find_area(&area_name).cloned();
    let projects: Vec<Project> = index
        .get_projects_in_area(&area_name)
        .into_iter()
        .cloned()
        .collect();
    let (tasks, warnings) = index.get_tasks_in_area(&area_name);

    AreaContextResult {
        area,
        projects,
        tasks: tasks.into_iter().cloned().collect(),
        warnings,
    }
}

/// Get full context for a project (for context command).
#[napi]
pub fn get_project_context(config: VaultConfig, project_name: String) -> ProjectContextResult {
    let index = VaultIndex::build(&config);
    let mut warnings = Vec::new();

    let project = index.find_project(&project_name).cloned();

    // Get parent area if project exists and has area reference
    let area = project
        .as_ref()
        .and_then(|p| index.get_area_for_project(p))
        .cloned();

    // Warn if project has area reference but area not found
    if let Some(ref p) = project
        && let Some(area_ref) = &p.area
        && let Some(area_name) = extract_wikilink_name(area_ref)
        && index.find_area(area_name).is_none()
    {
        warnings.push(format!(
            "Project '{}' references unknown area '{}'",
            p.title, area_name
        ));
    }

    let tasks: Vec<Task> = index
        .get_tasks_in_project(&project_name)
        .into_iter()
        .cloned()
        .collect();

    ProjectContextResult {
        project,
        area,
        tasks,
        warnings,
    }
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use std::path::Path;
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

    // =========================================================================
    // VaultIndex Build Tests
    // =========================================================================

    #[test]
    fn build_from_empty_vault() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let index = VaultIndex::build(&config);

        assert!(index.tasks.is_empty());
        assert!(index.projects.is_empty());
        assert!(index.areas.is_empty());
    }

    #[test]
    fn build_indexes_entities_correctly() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Create area
        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\nstatus: active\n---\n",
        );

        // Create project in area
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1 Planning\nstatus: in-progress\narea: \"[[Work]]\"\n---\n",
        );

        // Create task in project
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\nprojects:\n  - \"[[Q1 Planning]]\"\n---\n",
        );

        let index = VaultIndex::build(&config);

        assert_eq!(index.areas.len(), 1);
        assert_eq!(index.projects.len(), 1);
        assert_eq!(index.tasks.len(), 1);
        assert!(index.area_by_name.contains_key("work"));
        assert!(index.project_by_name.contains_key("q1 planning"));
    }

    #[test]
    fn build_without_tasks_skips_task_files() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\n---\n",
        );

        let index = VaultIndex::build_without_tasks(&config);

        assert_eq!(index.areas.len(), 1);
        assert_eq!(index.projects.len(), 1);
        assert!(index.tasks.is_empty()); // Tasks not loaded
    }

    // =========================================================================
    // get_tasks_in_area Tests
    // =========================================================================

    #[test]
    fn get_tasks_in_area_finds_direct_tasks() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Direct Task\nstatus: ready\narea: \"[[Work]]\"\n---\n",
        );

        let result = get_tasks_in_area(config, "Work".to_string());

        assert_eq!(result.tasks.len(), 1);
        assert_eq!(result.tasks[0].title, "Direct Task");
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn get_tasks_in_area_finds_tasks_via_project() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Project Task\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let result = get_tasks_in_area(config, "Work".to_string());

        assert_eq!(result.tasks.len(), 1);
        assert_eq!(result.tasks[0].title, "Project Task");
    }

    #[test]
    fn get_tasks_in_area_finds_both_direct_and_via_project() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "direct.md",
            "---\ntitle: Direct Task\nstatus: ready\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "project.md",
            "---\ntitle: Project Task\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let result = get_tasks_in_area(config, "Work".to_string());

        assert_eq!(result.tasks.len(), 2);
        let titles: Vec<&str> = result.tasks.iter().map(|t| t.title.as_str()).collect();
        assert!(titles.contains(&"Direct Task"));
        assert!(titles.contains(&"Project Task"));
    }

    #[test]
    fn get_tasks_in_area_deduplicates() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        // Task has BOTH direct area AND project in same area
        write_file(
            Path::new(&config.tasks_dir),
            "both.md",
            "---\ntitle: Both Ways\nstatus: ready\narea: \"[[Work]]\"\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let result = get_tasks_in_area(config, "Work".to_string());

        // Should only appear once, not twice
        assert_eq!(result.tasks.len(), 1);
        assert_eq!(result.tasks[0].title, "Both Ways");
    }

    #[test]
    fn get_tasks_in_area_case_insensitive() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task\nstatus: ready\narea: \"[[work]]\"\n---\n",
        );

        // Query with different case
        let result = get_tasks_in_area(config, "WORK".to_string());

        assert_eq!(result.tasks.len(), 1);
    }

    #[test]
    fn get_tasks_in_area_returns_empty_for_unknown_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task\nstatus: ready\narea: \"[[Work]]\"\n---\n",
        );

        let result = get_tasks_in_area(config, "Nonexistent".to_string());

        assert!(result.tasks.is_empty());
    }

    // =========================================================================
    // get_projects_in_area Tests
    // =========================================================================

    #[test]
    fn get_projects_in_area_finds_projects() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q2.md",
            "---\ntitle: Q2\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "personal.md",
            "---\ntitle: Personal Project\narea: \"[[Personal]]\"\n---\n",
        );

        let projects = get_projects_in_area(config, "Work".to_string());

        assert_eq!(projects.len(), 2);
        let titles: Vec<&str> = projects.iter().map(|p| p.title.as_str()).collect();
        assert!(titles.contains(&"Q1"));
        assert!(titles.contains(&"Q2"));
    }

    #[test]
    fn get_projects_in_area_returns_empty_for_unknown_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );

        let projects = get_projects_in_area(config, "Nonexistent".to_string());

        assert!(projects.is_empty());
    }

    // =========================================================================
    // get_area_context Tests
    // =========================================================================

    #[test]
    fn get_area_context_returns_complete_context() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\nstatus: active\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let result = get_area_context(config, "Work".to_string());

        assert!(result.area.is_some());
        assert_eq!(result.area.unwrap().title, "Work");
        assert_eq!(result.projects.len(), 1);
        assert_eq!(result.projects[0].title, "Q1");
        assert_eq!(result.tasks.len(), 1);
        assert_eq!(result.tasks[0].title, "Task One");
    }

    #[test]
    fn get_area_context_returns_none_for_unknown_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let result = get_area_context(config, "Nonexistent".to_string());

        assert!(result.area.is_none());
        assert!(result.projects.is_empty());
        assert!(result.tasks.is_empty());
    }

    // =========================================================================
    // get_project_context Tests
    // =========================================================================

    #[test]
    fn get_project_context_returns_complete_context() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task2.md",
            "---\ntitle: Task Two\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let result = get_project_context(config, "Q1".to_string());

        assert!(result.project.is_some());
        assert_eq!(result.project.unwrap().title, "Q1");
        assert!(result.area.is_some());
        assert_eq!(result.area.unwrap().title, "Work");
        assert_eq!(result.tasks.len(), 2);
    }

    #[test]
    fn get_project_context_returns_none_for_unknown_project() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let result = get_project_context(config, "Nonexistent".to_string());

        assert!(result.project.is_none());
        assert!(result.area.is_none());
        assert!(result.tasks.is_empty());
    }

    #[test]
    fn get_project_context_warns_on_broken_area_reference() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.projects_dir),
            "orphan.md",
            "---\ntitle: Orphan Project\narea: \"[[Nonexistent Area]]\"\n---\n",
        );

        let result = get_project_context(config, "Orphan Project".to_string());

        assert!(result.project.is_some());
        assert!(result.area.is_none());
        assert_eq!(result.warnings.len(), 1);
        assert!(result.warnings[0].contains("Nonexistent Area"));
    }

    #[test]
    fn get_project_context_handles_project_without_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.projects_dir),
            "standalone.md",
            "---\ntitle: Standalone\n---\n",
        );

        let result = get_project_context(config, "Standalone".to_string());

        assert!(result.project.is_some());
        assert!(result.area.is_none());
        assert!(result.warnings.is_empty());
    }
}
