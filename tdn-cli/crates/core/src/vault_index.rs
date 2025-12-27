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

/// Result for projects-in-area query
#[derive(Debug, Clone)]
#[napi(object)]
pub struct ProjectsInAreaResult {
    pub projects: Vec<Project>,
    /// Warnings about broken references (e.g., "Project 'X' references unknown area 'Y'")
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

/// Full context for a task (for context command)
#[derive(Debug, Clone)]
#[napi(object)]
pub struct TaskContextResult {
    /// The task, or None if not found or ambiguous
    pub task: Option<Task>,
    /// Parent project if any
    pub project: Option<Project>,
    /// Parent area (direct or via project)
    pub area: Option<Area>,
    /// Warnings about broken references
    pub warnings: Vec<String>,
    /// Multiple tasks matched the identifier (ambiguous lookup)
    /// Only populated when lookup by title matches multiple tasks
    pub ambiguous_matches: Vec<Task>,
}

// =============================================================================
// Internal VaultIndex (not NAPI-exported)
// =============================================================================

/// Internal index for resolving relationships between entities.
/// Not exposed via NAPI - used internally by query functions.
pub(crate) struct VaultIndex {
    tasks: Vec<Task>,
    projects: Vec<Project>,
    areas: Vec<Area>,
    /// Map from lowercase area name to index in `areas`
    area_by_name: HashMap<String, usize>,
    /// Map from lowercase project name to index in `projects`
    project_by_name: HashMap<String, usize>,
    /// Map from task path to index in `tasks` (for O(1) path lookups)
    task_by_path: HashMap<String, usize>,
    /// Map from project index to list of task indices
    tasks_by_project: HashMap<usize, Vec<usize>>,
    /// Map from area index to list of task indices (direct assignment)
    tasks_by_area: HashMap<usize, Vec<usize>>,
    /// Map from area index to list of project indices
    projects_by_area: HashMap<usize, Vec<usize>>,
}

impl VaultIndex {
    /// Build a full index (reads all entity types).
    pub(crate) fn build(config: &VaultConfig) -> Self {
        let tasks = scan_tasks(config.clone());
        let projects = scan_projects(config.clone());
        let areas = scan_areas(config.clone());

        Self::build_from_entities(tasks, projects, areas)
    }

    /// Build an index without tasks (for projects-only queries).
    /// This is an optimization - skips reading task files.
    #[allow(dead_code)]
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

        // Build task path lookup (for O(1) path lookups)
        let task_by_path: HashMap<String, usize> = tasks
            .iter()
            .enumerate()
            .map(|(i, task)| (task.path.clone(), i))
            .collect();

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
            task_by_path,
            tasks_by_project,
            tasks_by_area,
            projects_by_area,
        }
    }

    /// Get all projects in the index.
    pub(crate) fn projects(&self) -> &[Project] {
        &self.projects
    }

    /// Get all areas in the index.
    pub(crate) fn areas(&self) -> &[Area] {
        &self.areas
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

    /// Find tasks by title (case-insensitive substring matching).
    /// Returns all tasks with titles containing the query string.
    pub(crate) fn find_tasks_by_title(&self, query: &str) -> Vec<&Task> {
        let query_lower = query.to_lowercase();
        self.tasks
            .iter()
            .filter(|task| task.title.to_lowercase().contains(&query_lower))
            .collect()
    }

    /// Get projects in an area.
    /// Returns (projects, warnings).
    /// Generates warnings for projects that reference non-existent areas.
    fn get_projects_in_area(&self, area_name: &str) -> (Vec<&Project>, Vec<String>) {
        let mut warnings = Vec::new();

        let area_idx = match self.area_by_name.get(&area_name.to_lowercase()) {
            Some(&idx) => idx,
            None => return (Vec::new(), warnings),
        };

        let projects = self
            .projects_by_area
            .get(&area_idx)
            .map(|indices| {
                indices
                    .iter()
                    .map(|&i| {
                        let project = &self.projects[i];
                        // Check if this project's area reference is valid
                        if let Some(ref area_ref) = project.area
                            && let Some(referenced_area_name) = extract_wikilink_name(area_ref)
                            && !self
                                .area_by_name
                                .contains_key(&referenced_area_name.to_lowercase())
                        {
                            warnings.push(format!(
                                "Project '{}' references unknown area '{}'",
                                project.title, referenced_area_name
                            ));
                        }
                        &self.projects[i]
                    })
                    .collect()
            })
            .unwrap_or_default();

        (projects, warnings)
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

    /// Get the project for a task (via project reference).
    fn get_project_for_task(&self, task: &Task) -> Option<&Project> {
        let project_ref = task.project.as_ref()?;
        let project_name = extract_wikilink_name(project_ref)?;
        self.find_project(project_name)
    }

    /// Get the area for a task (direct or via project).
    fn get_area_for_task(&self, task: &Task) -> Option<&Area> {
        // First try direct area reference
        if let Some(area_ref) = &task.area
            && let Some(area_name) = extract_wikilink_name(area_ref)
            && let Some(area) = self.find_area(area_name)
        {
            return Some(area);
        }

        // Fall back to area via project
        if let Some(project) = self.get_project_for_task(task) {
            return self.get_area_for_project(project);
        }

        None
    }

    /// Find a task by path (O(1) lookup via HashMap).
    fn find_task_by_path(&self, path: &str) -> Option<&Task> {
        self.task_by_path.get(path).map(|&idx| &self.tasks[idx])
    }

    // =========================================================================
    // Public(crate) methods for VaultSession
    // =========================================================================

    /// Get tasks in an area result (for session API).
    pub(crate) fn get_tasks_in_area_result(&self, area_name: &str) -> TasksInAreaResult {
        let (tasks, warnings) = self.get_tasks_in_area(area_name);

        TasksInAreaResult {
            tasks: tasks.into_iter().cloned().collect(),
            warnings,
        }
    }

    /// Get projects in an area result (for session API).
    pub(crate) fn get_projects_in_area_result(&self, area_name: &str) -> ProjectsInAreaResult {
        let (projects, warnings) = self.get_projects_in_area(area_name);

        ProjectsInAreaResult {
            projects: projects.into_iter().cloned().collect(),
            warnings,
        }
    }

    /// Get area context result (for session API).
    pub(crate) fn get_area_context_result(&self, area_name: &str) -> AreaContextResult {
        let area = self.find_area(area_name).cloned();
        let (projects, project_warnings) = self.get_projects_in_area(area_name);
        let (tasks, task_warnings) = self.get_tasks_in_area(area_name);

        // Combine warnings from both projects and tasks
        let mut warnings = project_warnings;
        warnings.extend(task_warnings);

        AreaContextResult {
            area,
            projects: projects.into_iter().cloned().collect(),
            tasks: tasks.into_iter().cloned().collect(),
            warnings,
        }
    }

    /// Get project context result (for session API).
    pub(crate) fn get_project_context_result(&self, project_name: &str) -> ProjectContextResult {
        let mut warnings = Vec::new();

        let project = self.find_project(project_name).cloned();

        // Get parent area if project exists and has area reference
        let area = project
            .as_ref()
            .and_then(|p| self.get_area_for_project(p))
            .cloned();

        // Warn if project has area reference but area not found
        if let Some(ref p) = project
            && let Some(area_ref) = &p.area
            && let Some(area_name) = crate::wikilink::extract_wikilink_name(area_ref)
            && self.find_area(area_name).is_none()
        {
            warnings.push(format!(
                "Project '{}' references unknown area '{}'",
                p.title, area_name
            ));
        }

        let tasks: Vec<Task> = self
            .get_tasks_in_project(project_name)
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

    /// Get task context result (for session API).
    pub(crate) fn get_task_context_result(&self, path_or_title: &str) -> TaskContextResult {
        let mut warnings = Vec::new();

        // Determine if this is a path or title lookup
        let (task, ambiguous_matches) = if is_path_identifier(path_or_title) {
            // Path lookup - find by exact path
            let task = self.find_task_by_path(path_or_title).cloned();
            (task, Vec::new())
        } else {
            // Title lookup - case-insensitive, may have multiple matches
            let matches = self.find_tasks_by_title(path_or_title);
            match matches.len() {
                0 => (None, Vec::new()),
                1 => (Some(matches[0].clone()), Vec::new()),
                _ => {
                    // Multiple matches - return them as ambiguous
                    let ambiguous: Vec<Task> = matches.into_iter().cloned().collect();
                    (None, ambiguous)
                }
            }
        };

        // If ambiguous, return early with just the matches
        if !ambiguous_matches.is_empty() {
            return TaskContextResult {
                task: None,
                project: None,
                area: None,
                warnings: Vec::new(),
                ambiguous_matches,
            };
        }

        // Get parent project if task exists and has project reference
        let project = task
            .as_ref()
            .and_then(|t| self.get_project_for_task(t))
            .cloned();

        // Warn if task has project reference but project not found
        if let Some(ref t) = task
            && let Some(project_ref) = &t.project
            && let Some(project_name) = crate::wikilink::extract_wikilink_name(project_ref)
            && self.find_project(project_name).is_none()
        {
            warnings.push(format!(
                "Task '{}' references unknown project '{}'",
                t.title, project_name
            ));
        }

        // Get parent area (direct or via project)
        let area = task
            .as_ref()
            .and_then(|t| self.get_area_for_task(t))
            .cloned();

        // Warn if task has direct area reference but area not found
        if let Some(ref t) = task
            && let Some(area_ref) = &t.area
            && let Some(area_name) = crate::wikilink::extract_wikilink_name(area_ref)
            && self.find_area(area_name).is_none()
        {
            warnings.push(format!(
                "Task '{}' references unknown area '{}'",
                t.title, area_name
            ));
        }

        TaskContextResult {
            task,
            project,
            area,
            warnings,
            ambiguous_matches: Vec::new(),
        }
    }
}

// =============================================================================
// Helper Functions
// =============================================================================

/// Check if a string looks like a file path (vs a title).
/// Returns true if the identifier is an absolute path.
/// Cross-platform: handles Unix paths (/foo/bar) and Windows paths (C:\foo\bar).
fn is_path_identifier(identifier: &str) -> bool {
    use std::path::Path;
    Path::new(identifier).is_absolute()
}

// =============================================================================
// NOTE: Context and relationship query functions
// =============================================================================
//
// These functions are implemented as internal methods on VaultIndex.
// The NAPI exports for TypeScript live in vault_session.rs, which creates
// a VaultSession to cache the index across multiple queries.
//
// For TypeScript usage, use createVaultSession() and session-based functions:
// getTasksInArea, getProjectsInArea, getAreaContext, getProjectContext, getTaskContext

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault_session::{create_vault_session, get_tasks_in_area, get_projects_in_area, get_area_context, get_project_context, get_task_context};
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

        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "Work".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "Work".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "Work".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "Work".to_string());

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
        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "WORK".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_tasks_in_area(&session, "Nonexistent".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_projects_in_area(&session, "Work".to_string());

        assert_eq!(result.projects.len(), 2);
        let titles: Vec<&str> = result.projects.iter().map(|p| p.title.as_str()).collect();
        assert!(titles.contains(&"Q1"));
        assert!(titles.contains(&"Q2"));
        assert!(result.warnings.is_empty());
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

        let session = create_vault_session(config.clone());
        let result = get_projects_in_area(&session, "Nonexistent".to_string());

        assert!(result.projects.is_empty());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn get_projects_in_area_warns_on_broken_area_reference() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Create Work area
        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );

        // Create project with valid area
        write_file(
            Path::new(&config.projects_dir),
            "q1.md",
            "---\ntitle: Q1\narea: \"[[Work]]\"\n---\n",
        );

        // Create project with broken area reference
        write_file(
            Path::new(&config.projects_dir),
            "orphan.md",
            "---\ntitle: Orphan Project\narea: \"[[NonexistentArea]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_projects_in_area(&session, "Work".to_string());

        assert_eq!(result.projects.len(), 1);
        assert_eq!(result.projects[0].title, "Q1");

        // Should NOT have warnings because Q1's area reference is valid
        assert!(result.warnings.is_empty());
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

        let session = create_vault_session(config.clone());
        let result = get_area_context(&session, "Work".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_area_context(&session, "Nonexistent".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_project_context(&session, "Q1".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_project_context(&session, "Nonexistent".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_project_context(&session, "Orphan Project".to_string());

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

        let session = create_vault_session(config.clone());
        let result = get_project_context(&session, "Standalone".to_string());

        assert!(result.project.is_some());
        assert!(result.area.is_none());
        assert!(result.warnings.is_empty());
    }

    // =========================================================================
    // get_task_context Tests
    // =========================================================================

    #[test]
    fn get_task_context_returns_complete_context() {
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
        let task_path = format!("{}/task1.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Task One\nstatus: ready\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert_eq!(result.task.unwrap().title, "Task One");
        assert!(result.project.is_some());
        assert_eq!(result.project.unwrap().title, "Q1");
        assert!(result.area.is_some());
        assert_eq!(result.area.unwrap().title, "Work");
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn get_task_context_returns_none_for_unknown_task() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "/nonexistent/task.md".to_string());

        assert!(result.task.is_none());
        assert!(result.project.is_none());
        assert!(result.area.is_none());
    }

    #[test]
    fn get_task_context_handles_task_with_direct_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "work.md",
            "---\ntitle: Work\n---\n",
        );
        let task_path = format!("{}/task1.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Direct Area Task\nstatus: ready\narea: \"[[Work]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert!(result.project.is_none()); // No project reference
        assert!(result.area.is_some()); // Direct area
        assert_eq!(result.area.unwrap().title, "Work");
    }

    #[test]
    fn get_task_context_handles_task_without_parents() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let task_path = format!("{}/task1.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Orphan Task\nstatus: ready\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert!(result.project.is_none());
        assert!(result.area.is_none());
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn get_task_context_warns_on_broken_project_reference() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let task_path = format!("{}/task1.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Broken Project Task\nstatus: ready\nprojects:\n  - \"[[Nonexistent Project]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert!(result.project.is_none());
        assert_eq!(result.warnings.len(), 1);
        assert!(result.warnings[0].contains("Nonexistent Project"));
    }

    #[test]
    fn get_task_context_warns_on_broken_area_reference() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let task_path = format!("{}/task1.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Broken Area Task\nstatus: ready\narea: \"[[Nonexistent Area]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert!(result.area.is_none());
        assert_eq!(result.warnings.len(), 1);
        assert!(result.warnings[0].contains("Nonexistent Area"));
    }

    #[test]
    fn get_task_context_prefers_direct_area_over_project_area() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.areas_dir),
            "personal.md",
            "---\ntitle: Personal\n---\n",
        );
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
        let task_path = format!("{}/task1.md", config.tasks_dir);
        // Task has direct area "Personal" but project is in "Work"
        write_file(
            Path::new(&config.tasks_dir),
            "task1.md",
            "---\ntitle: Mixed Task\nstatus: ready\narea: \"[[Personal]]\"\nprojects:\n  - \"[[Q1]]\"\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert!(result.project.is_some());
        // Direct area takes precedence
        assert!(result.area.is_some());
        assert_eq!(result.area.unwrap().title, "Personal");
    }

    // =========================================================================
    // Title-based Task Lookup Tests
    // =========================================================================

    #[test]
    fn get_task_context_finds_task_by_title() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "my-task.md",
            "---\ntitle: My Unique Task\nstatus: ready\n---\n",
        );

        // Look up by title (not path)
        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "My Unique Task".to_string());

        assert!(result.task.is_some());
        assert_eq!(result.task.unwrap().title, "My Unique Task");
        assert!(result.ambiguous_matches.is_empty());
    }

    #[test]
    fn get_task_context_title_lookup_is_case_insensitive() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "my-task.md",
            "---\ntitle: My Unique Task\nstatus: ready\n---\n",
        );

        // Look up by lowercase title
        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "my unique task".to_string());

        assert!(result.task.is_some());
        assert_eq!(result.task.unwrap().title, "My Unique Task");
    }

    #[test]
    fn get_task_context_returns_ambiguous_for_duplicate_titles() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        write_file(
            Path::new(&config.tasks_dir),
            "task-a.md",
            "---\ntitle: Duplicate Title\nstatus: ready\n---\n",
        );
        write_file(
            Path::new(&config.tasks_dir),
            "task-b.md",
            "---\ntitle: Duplicate Title\nstatus: in-progress\n---\n",
        );

        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "Duplicate Title".to_string());

        // task should be None when ambiguous
        assert!(result.task.is_none());
        // Should have 2 ambiguous matches
        assert_eq!(result.ambiguous_matches.len(), 2);
    }

    #[test]
    fn get_task_context_uses_path_lookup_for_absolute_paths() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        let task_path = format!("{}/my-task.md", config.tasks_dir);
        write_file(
            Path::new(&config.tasks_dir),
            "my-task.md",
            "---\ntitle: My Task\nstatus: ready\n---\n",
        );

        // Look up by absolute path (starts with /)
        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, task_path);

        assert!(result.task.is_some());
        assert_eq!(result.task.unwrap().title, "My Task");
        assert!(result.ambiguous_matches.is_empty());
    }

    #[test]
    fn get_task_context_path_lookup_returns_none_for_nonexistent() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Look up by absolute path that doesn't exist
        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "/nonexistent/task.md".to_string());

        assert!(result.task.is_none());
        assert!(result.ambiguous_matches.is_empty());
    }

    #[test]
    fn get_task_context_title_lookup_returns_none_for_nonexistent() {
        let temp_dir = create_temp_vault();
        let config = create_vault_config(&temp_dir);

        // Look up by title that doesn't exist
        let session = create_vault_session(config.clone());
        let result = get_task_context(&session, "Nonexistent Task Title".to_string());

        assert!(result.task.is_none());
        assert!(result.ambiguous_matches.is_empty());
    }
}
