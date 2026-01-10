//! VaultManager - Long-lived vault access with file watching.
//!
//! The VaultManager is stored in Tauri state and provides:
//! - In-memory index of all entities for fast lookups
//! - File watcher for detecting external changes
//! - RwLock for thread-safe access
//! - Write-loop prevention (ignoring our own writes)

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use log::{debug, error, info, warn};
use notify_debouncer_full::{
    new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
    DebounceEventResult, Debouncer, RecommendedCache,
};
use parking_lot::RwLock;
use tauri::{AppHandle, Emitter};

use crate::vault::{
    scan_areas, scan_projects, scan_tasks, Area, CreateProjectOptions, CreateTaskOptions, Project,
    ProjectUpdate, Task, TaskUpdate, VaultConfig, VaultError,
};

/// Event emitted when vault data changes (for frontend cache invalidation)
const VAULT_CHANGED_EVENT: &str = "vault-changed";

/// Debounce interval for file watcher
const DEBOUNCE_DURATION: Duration = Duration::from_millis(100);

/// In-memory index of vault entities
#[derive(Debug, Clone, Default)]
pub struct VaultIndex {
    pub tasks: HashMap<String, Task>,
    pub projects: HashMap<String, Project>,
    pub areas: HashMap<String, Area>,
    /// Index of task path -> task id for quick lookups
    pub task_paths: HashMap<String, String>,
    /// Index of project path -> project id
    pub project_paths: HashMap<String, String>,
    /// Index of area path -> area id
    pub area_paths: HashMap<String, String>,
}

impl VaultIndex {
    /// Build index from scanned entities
    pub fn from_scans(tasks: Vec<Task>, projects: Vec<Project>, areas: Vec<Area>) -> Self {
        let mut task_map = HashMap::with_capacity(tasks.len());
        let mut task_paths = HashMap::with_capacity(tasks.len());
        for task in tasks {
            task_paths.insert(task.path.clone(), task.id.clone());
            task_map.insert(task.id.clone(), task);
        }

        let mut project_map = HashMap::with_capacity(projects.len());
        let mut project_paths = HashMap::with_capacity(projects.len());
        for project in projects {
            project_paths.insert(project.path.clone(), project.id.clone());
            project_map.insert(project.id.clone(), project);
        }

        let mut area_map = HashMap::with_capacity(areas.len());
        let mut area_paths = HashMap::with_capacity(areas.len());
        for area in areas {
            area_paths.insert(area.path.clone(), area.id.clone());
            area_map.insert(area.id.clone(), area);
        }

        Self {
            tasks: task_map,
            projects: project_map,
            areas: area_map,
            task_paths,
            project_paths,
            area_paths,
        }
    }

    /// Get task by ID
    pub fn get_task(&self, id: &str) -> Option<&Task> {
        self.tasks.get(id)
    }

    /// Get project by ID
    pub fn get_project(&self, id: &str) -> Option<&Project> {
        self.projects.get(id)
    }

    /// Get area by ID
    pub fn get_area(&self, id: &str) -> Option<&Area> {
        self.areas.get(id)
    }

    /// Get all tasks
    pub fn all_tasks(&self) -> Vec<Task> {
        self.tasks.values().cloned().collect()
    }

    /// Get all projects
    pub fn all_projects(&self) -> Vec<Project> {
        self.projects.values().cloned().collect()
    }

    /// Get all areas
    pub fn all_areas(&self) -> Vec<Area> {
        self.areas.values().cloned().collect()
    }

    /// Update a task in the index
    pub fn update_task(&mut self, task: Task) {
        self.task_paths.insert(task.path.clone(), task.id.clone());
        self.tasks.insert(task.id.clone(), task);
    }

    /// Update a project in the index
    pub fn update_project(&mut self, project: Project) {
        self.project_paths
            .insert(project.path.clone(), project.id.clone());
        self.projects.insert(project.id.clone(), project);
    }

    /// Update an area in the index
    pub fn update_area(&mut self, area: Area) {
        self.area_paths.insert(area.path.clone(), area.id.clone());
        self.areas.insert(area.id.clone(), area);
    }

    /// Remove a task from the index by path
    pub fn remove_task_by_path(&mut self, path: &str) {
        if let Some(id) = self.task_paths.remove(path) {
            self.tasks.remove(&id);
        }
    }

    /// Remove a project from the index by path
    pub fn remove_project_by_path(&mut self, path: &str) {
        if let Some(id) = self.project_paths.remove(path) {
            self.projects.remove(&id);
        }
    }

    /// Remove an area from the index by path
    pub fn remove_area_by_path(&mut self, path: &str) {
        if let Some(id) = self.area_paths.remove(path) {
            self.areas.remove(&id);
        }
    }
}

/// Inner state of the VaultManager
struct VaultManagerInner {
    config: Option<VaultConfig>,
    index: VaultIndex,
    last_write: Instant,
    writing_flag: Arc<AtomicBool>,
}

/// VaultManager provides thread-safe access to vault data with file watching.
pub struct VaultManager {
    inner: RwLock<VaultManagerInner>,
    #[allow(dead_code)]
    watcher: RwLock<Option<Debouncer<RecommendedWatcher, RecommendedCache>>>,
}

impl VaultManager {
    /// Create a new uninitialized VaultManager
    pub fn new() -> Self {
        Self {
            inner: RwLock::new(VaultManagerInner {
                config: None,
                index: VaultIndex::default(),
                last_write: Instant::now(),
                writing_flag: Arc::new(AtomicBool::new(false)),
            }),
            watcher: RwLock::new(None),
        }
    }

    /// Initialize or re-initialize the vault with a new config.
    /// Scans all directories and sets up file watching.
    pub fn initialize(&self, config: VaultConfig, app_handle: AppHandle) -> Result<(), VaultError> {
        info!(
            "Initializing vault with config: tasks={}, projects={}, areas={}",
            config.tasks_dir, config.projects_dir, config.areas_dir
        );

        // Validate config
        if !config.is_valid() {
            return Err(VaultError::not_configured(
                "One or more vault directories do not exist",
            ));
        }

        // Scan all directories
        let tasks = scan_tasks(&config);
        let projects = scan_projects(&config);
        let areas = scan_areas(&config);

        info!(
            "Scanned vault: {} tasks, {} projects, {} areas",
            tasks.len(),
            projects.len(),
            areas.len()
        );

        // Build index
        let index = VaultIndex::from_scans(tasks, projects, areas);

        // Set up file watcher
        let watcher = self.setup_file_watcher(&config, app_handle)?;

        // Update state
        {
            let mut inner = self.inner.write();
            inner.config = Some(config);
            inner.index = index;
        }

        // Store watcher
        {
            let mut watcher_guard = self.watcher.write();
            *watcher_guard = Some(watcher);
        }

        Ok(())
    }

    /// Set up the file watcher for all vault directories.
    fn setup_file_watcher(
        &self,
        config: &VaultConfig,
        app_handle: AppHandle,
    ) -> Result<Debouncer<RecommendedWatcher, RecommendedCache>, VaultError> {
        let writing_flag = {
            let inner = self.inner.read();
            inner.writing_flag.clone()
        };

        // Create debounced watcher
        let mut debouncer =
            new_debouncer(DEBOUNCE_DURATION, None, move |res: DebounceEventResult| {
                match res {
                    Ok(events) => {
                        // Check write loop prevention
                        if writing_flag.load(Ordering::SeqCst) {
                            debug!("Ignoring file event (we're writing)");
                            return;
                        }

                        // Check if any .md files changed
                        let has_md_changes = events.iter().any(|e| {
                            e.paths
                                .iter()
                                .any(|p| p.extension().map(|ext| ext == "md").unwrap_or(false))
                        });

                        if has_md_changes {
                            debug!("Vault files changed, emitting vault-changed event");
                            if let Err(e) = app_handle.emit(VAULT_CHANGED_EVENT, ()) {
                                error!("Failed to emit vault-changed event: {e}");
                            }
                        }
                    }
                    Err(errors) => {
                        for e in errors {
                            warn!("File watcher error: {e}");
                        }
                    }
                }
            })
            .map_err(|e| {
                VaultError::watcher_error(format!("Failed to create file watcher: {e}"))
            })?;

        // Watch all directories
        let dirs = [&config.tasks_dir, &config.projects_dir, &config.areas_dir];
        for dir in dirs {
            debouncer
                .watch(PathBuf::from(dir).as_path(), RecursiveMode::NonRecursive)
                .map_err(|e| {
                    VaultError::watcher_error(format!("Failed to watch directory {dir}: {e}"))
                })?;
            debug!("Watching directory: {dir}");
        }

        Ok(debouncer)
    }

    /// Check if the vault is configured
    pub fn is_configured(&self) -> bool {
        self.inner.read().config.is_some()
    }

    /// Get the vault configuration
    pub fn config(&self) -> Option<VaultConfig> {
        self.inner.read().config.clone()
    }

    /// Refresh the vault index by re-scanning all directories.
    pub fn refresh(&self) -> Result<(), VaultError> {
        let config = {
            let inner = self.inner.read();
            inner.config.clone()
        };

        let config = config.ok_or_else(|| VaultError::not_configured("Vault not initialized"))?;

        let tasks = scan_tasks(&config);
        let projects = scan_projects(&config);
        let areas = scan_areas(&config);

        let index = VaultIndex::from_scans(tasks, projects, areas);

        {
            let mut inner = self.inner.write();
            inner.index = index;
        }

        Ok(())
    }

    // =========================================================================
    // Read Operations
    // =========================================================================

    /// Get all tasks
    pub fn list_tasks(&self) -> Result<Vec<Task>, VaultError> {
        self.ensure_configured()?;
        Ok(self.inner.read().index.all_tasks())
    }

    /// Get all projects
    pub fn list_projects(&self) -> Result<Vec<Project>, VaultError> {
        self.ensure_configured()?;
        Ok(self.inner.read().index.all_projects())
    }

    /// Get all areas
    pub fn list_areas(&self) -> Result<Vec<Area>, VaultError> {
        self.ensure_configured()?;
        Ok(self.inner.read().index.all_areas())
    }

    /// Get task by ID
    pub fn get_task(&self, id: &str) -> Result<Task, VaultError> {
        self.ensure_configured()?;
        self.inner
            .read()
            .index
            .get_task(id)
            .cloned()
            .ok_or_else(|| VaultError::entity_not_found("Task", id))
    }

    /// Get project by ID
    pub fn get_project(&self, id: &str) -> Result<Project, VaultError> {
        self.ensure_configured()?;
        self.inner
            .read()
            .index
            .get_project(id)
            .cloned()
            .ok_or_else(|| VaultError::entity_not_found("Project", id))
    }

    /// Get area by ID
    pub fn get_area(&self, id: &str) -> Result<Area, VaultError> {
        self.ensure_configured()?;
        self.inner
            .read()
            .index
            .get_area(id)
            .cloned()
            .ok_or_else(|| VaultError::entity_not_found("Area", id))
    }

    // =========================================================================
    // Write Operations
    // =========================================================================

    /// Create a new task
    pub fn create_task(&self, options: CreateTaskOptions) -> Result<Task, VaultError> {
        self.ensure_configured()?;
        debug!(
            "Creating task: {}",
            options.title.as_deref().unwrap_or("(untitled)")
        );

        let tasks_dir = {
            let inner = self.inner.read();
            inner
                .config
                .as_ref()
                .map(|c| c.tasks_dir.clone())
                .ok_or_else(|| VaultError::not_configured("Vault not initialized"))?
        };

        // Set write flag for loop prevention
        self.set_writing(true);
        let result = crate::vault::create_task_file(&tasks_dir, options);
        self.set_writing(false);

        let task = result?;

        // Update index
        {
            let mut inner = self.inner.write();
            inner.index.update_task(task.clone());
        }

        info!("Task created: {}", task.id);
        Ok(task)
    }

    /// Create a new project
    pub fn create_project(&self, options: CreateProjectOptions) -> Result<Project, VaultError> {
        self.ensure_configured()?;
        debug!("Creating project: {}", options.title);

        let projects_dir = {
            let inner = self.inner.read();
            inner
                .config
                .as_ref()
                .map(|c| c.projects_dir.clone())
                .ok_or_else(|| VaultError::not_configured("Vault not initialized"))?
        };

        self.set_writing(true);
        let result = crate::vault::create_project_file(&projects_dir, options);
        self.set_writing(false);

        let project = result?;

        {
            let mut inner = self.inner.write();
            inner.index.update_project(project.clone());
        }

        info!("Project created: {}", project.id);
        Ok(project)
    }

    /// Update a task
    pub fn update_task(&self, update: TaskUpdate) -> Result<Task, VaultError> {
        self.ensure_configured()?;
        debug!("Updating task: {}", update.id);

        let task = self.get_task(&update.id)?;

        self.set_writing(true);
        let result = crate::vault::update_task(&task, update.clone());
        self.set_writing(false);

        let updated_task = result?;

        {
            let mut inner = self.inner.write();
            inner.index.update_task(updated_task.clone());
        }

        info!("Task updated: {}", update.id);
        Ok(updated_task)
    }

    /// Update a project
    pub fn update_project(&self, update: ProjectUpdate) -> Result<Project, VaultError> {
        self.ensure_configured()?;
        debug!("Updating project: {}", update.id);

        let project = self.get_project(&update.id)?;

        self.set_writing(true);
        let result = crate::vault::update_project(&project, update.clone());
        self.set_writing(false);

        let updated_project = result?;

        {
            let mut inner = self.inner.write();
            inner.index.update_project(updated_project.clone());
        }

        info!("Project updated: {}", update.id);
        Ok(updated_project)
    }

    // =========================================================================
    // Delete Operations
    // =========================================================================

    /// Delete a task by ID
    pub fn delete_task(&self, id: &str) -> Result<(), VaultError> {
        self.ensure_configured()?;
        debug!("Deleting task: {id}");

        let task = self.get_task(id)?;

        // Delete the file
        self.set_writing(true);
        let result = std::fs::remove_file(&task.path);
        self.set_writing(false);

        result
            .map_err(|e| VaultError::write_error(&task.path, format!("Failed to delete: {e}")))?;

        // Remove from index
        {
            let mut inner = self.inner.write();
            inner.index.remove_task_by_path(&task.path);
        }

        info!("Task deleted: {id}");
        Ok(())
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    fn ensure_configured(&self) -> Result<(), VaultError> {
        if !self.is_configured() {
            return Err(VaultError::not_configured("Vault not initialized"));
        }
        Ok(())
    }

    fn set_writing(&self, writing: bool) {
        debug!("Write flag: {writing}");
        let mut inner = self.inner.write();
        inner.writing_flag.store(writing, Ordering::SeqCst);
        if !writing {
            inner.last_write = Instant::now();
        }
    }
}

impl Default for VaultManager {
    fn default() -> Self {
        Self::new()
    }
}

// VaultManager is thread-safe
unsafe impl Send for VaultManager {}
unsafe impl Sync for VaultManager {}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Create a test task with minimal required fields
    fn test_task(id: &str, path: &str) -> Task {
        Task {
            id: id.to_string(),
            path: path.to_string(),
            title: format!("Task {id}"),
            status: crate::vault::TaskStatus::Inbox,
            created_at: Some("2025-01-15".to_string()),
            updated_at: Some("2025-01-15".to_string()),
            completed_at: None,
            due: None,
            scheduled: None,
            defer_until: None,
            area: None,
            project: None,
            body: String::new(),
        }
    }

    /// Create a test project with minimal required fields
    fn test_project(id: &str, path: &str) -> Project {
        Project {
            id: id.to_string(),
            path: path.to_string(),
            title: format!("Project {id}"),
            status: None,
            area: None,
            start_date: None,
            end_date: None,
            description: None,
            blocked_by: None,
            body: String::new(),
        }
    }

    /// Create a test area with minimal required fields
    fn test_area(id: &str, path: &str) -> Area {
        Area {
            id: id.to_string(),
            path: path.to_string(),
            title: format!("Area {id}"),
            status: None,
            area_type: None,
            description: None,
            body: String::new(),
        }
    }

    // ------------------------------------------------------------------------
    // VaultIndex::from_scans tests
    // ------------------------------------------------------------------------

    #[test]
    fn vault_index_from_scans_builds_maps() {
        let tasks = vec![
            test_task("task-1", "/tasks/task-1.md"),
            test_task("task-2", "/tasks/task-2.md"),
        ];
        let projects = vec![test_project("proj-1", "/projects/proj-1.md")];
        let areas = vec![test_area("area-1", "/areas/area-1.md")];

        let index = VaultIndex::from_scans(tasks, projects, areas);

        assert_eq!(index.tasks.len(), 2);
        assert_eq!(index.projects.len(), 1);
        assert_eq!(index.areas.len(), 1);
    }

    #[test]
    fn vault_index_from_scans_builds_path_index() {
        let tasks = vec![test_task("task-1", "/tasks/task-1.md")];
        let projects = vec![test_project("proj-1", "/projects/proj-1.md")];
        let areas = vec![test_area("area-1", "/areas/area-1.md")];

        let index = VaultIndex::from_scans(tasks, projects, areas);

        assert_eq!(index.task_paths.get("/tasks/task-1.md"), Some(&"task-1".to_string()));
        assert_eq!(index.project_paths.get("/projects/proj-1.md"), Some(&"proj-1".to_string()));
        assert_eq!(index.area_paths.get("/areas/area-1.md"), Some(&"area-1".to_string()));
    }

    #[test]
    fn vault_index_from_scans_empty_vectors() {
        let index = VaultIndex::from_scans(vec![], vec![], vec![]);

        assert!(index.tasks.is_empty());
        assert!(index.projects.is_empty());
        assert!(index.areas.is_empty());
    }

    // ------------------------------------------------------------------------
    // VaultIndex get_* tests
    // ------------------------------------------------------------------------

    #[test]
    fn vault_index_get_task_found() {
        let tasks = vec![test_task("task-1", "/tasks/task-1.md")];
        let index = VaultIndex::from_scans(tasks, vec![], vec![]);

        let task = index.get_task("task-1");
        assert!(task.is_some());
        assert_eq!(task.unwrap().id, "task-1");
    }

    #[test]
    fn vault_index_get_task_not_found() {
        let index = VaultIndex::from_scans(vec![], vec![], vec![]);
        assert!(index.get_task("nonexistent").is_none());
    }

    #[test]
    fn vault_index_get_project_found() {
        let projects = vec![test_project("proj-1", "/projects/proj-1.md")];
        let index = VaultIndex::from_scans(vec![], projects, vec![]);

        let project = index.get_project("proj-1");
        assert!(project.is_some());
        assert_eq!(project.unwrap().id, "proj-1");
    }

    #[test]
    fn vault_index_get_project_not_found() {
        let index = VaultIndex::from_scans(vec![], vec![], vec![]);
        assert!(index.get_project("nonexistent").is_none());
    }

    #[test]
    fn vault_index_get_area_found() {
        let areas = vec![test_area("area-1", "/areas/area-1.md")];
        let index = VaultIndex::from_scans(vec![], vec![], areas);

        let area = index.get_area("area-1");
        assert!(area.is_some());
        assert_eq!(area.unwrap().id, "area-1");
    }

    #[test]
    fn vault_index_get_area_not_found() {
        let index = VaultIndex::from_scans(vec![], vec![], vec![]);
        assert!(index.get_area("nonexistent").is_none());
    }

    // ------------------------------------------------------------------------
    // VaultIndex all_* tests
    // ------------------------------------------------------------------------

    #[test]
    fn vault_index_all_tasks() {
        let tasks = vec![
            test_task("task-1", "/tasks/task-1.md"),
            test_task("task-2", "/tasks/task-2.md"),
        ];
        let index = VaultIndex::from_scans(tasks, vec![], vec![]);

        let all = index.all_tasks();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn vault_index_all_projects() {
        let projects = vec![
            test_project("proj-1", "/projects/proj-1.md"),
            test_project("proj-2", "/projects/proj-2.md"),
        ];
        let index = VaultIndex::from_scans(vec![], projects, vec![]);

        let all = index.all_projects();
        assert_eq!(all.len(), 2);
    }

    #[test]
    fn vault_index_all_areas() {
        let areas = vec![
            test_area("area-1", "/areas/area-1.md"),
            test_area("area-2", "/areas/area-2.md"),
        ];
        let index = VaultIndex::from_scans(vec![], vec![], areas);

        let all = index.all_areas();
        assert_eq!(all.len(), 2);
    }

    // ------------------------------------------------------------------------
    // VaultIndex update_* tests
    // ------------------------------------------------------------------------

    #[test]
    fn vault_index_update_task_adds_new() {
        let mut index = VaultIndex::default();
        let task = test_task("task-1", "/tasks/task-1.md");

        index.update_task(task);

        assert_eq!(index.tasks.len(), 1);
        assert!(index.get_task("task-1").is_some());
        assert_eq!(index.task_paths.get("/tasks/task-1.md"), Some(&"task-1".to_string()));
    }

    #[test]
    fn vault_index_update_task_replaces_existing() {
        let mut index = VaultIndex::default();
        let task1 = test_task("task-1", "/tasks/task-1.md");
        index.update_task(task1);

        let mut task2 = test_task("task-1", "/tasks/task-1.md");
        task2.title = "Updated Title".to_string();
        index.update_task(task2);

        assert_eq!(index.tasks.len(), 1);
        assert_eq!(index.get_task("task-1").unwrap().title, "Updated Title");
    }

    #[test]
    fn vault_index_update_project_adds_new() {
        let mut index = VaultIndex::default();
        let project = test_project("proj-1", "/projects/proj-1.md");

        index.update_project(project);

        assert_eq!(index.projects.len(), 1);
        assert!(index.get_project("proj-1").is_some());
    }

    #[test]
    fn vault_index_update_area_adds_new() {
        let mut index = VaultIndex::default();
        let area = test_area("area-1", "/areas/area-1.md");

        index.update_area(area);

        assert_eq!(index.areas.len(), 1);
        assert!(index.get_area("area-1").is_some());
    }

    // ------------------------------------------------------------------------
    // VaultIndex remove_*_by_path tests
    // ------------------------------------------------------------------------

    #[test]
    fn vault_index_remove_task_by_path() {
        let tasks = vec![
            test_task("task-1", "/tasks/task-1.md"),
            test_task("task-2", "/tasks/task-2.md"),
        ];
        let mut index = VaultIndex::from_scans(tasks, vec![], vec![]);

        index.remove_task_by_path("/tasks/task-1.md");

        assert_eq!(index.tasks.len(), 1);
        assert!(index.get_task("task-1").is_none());
        assert!(index.get_task("task-2").is_some());
        assert!(index.task_paths.get("/tasks/task-1.md").is_none());
    }

    #[test]
    fn vault_index_remove_task_by_path_nonexistent() {
        let tasks = vec![test_task("task-1", "/tasks/task-1.md")];
        let mut index = VaultIndex::from_scans(tasks, vec![], vec![]);

        // Should not panic
        index.remove_task_by_path("/nonexistent/path.md");

        assert_eq!(index.tasks.len(), 1);
    }

    #[test]
    fn vault_index_remove_project_by_path() {
        let projects = vec![test_project("proj-1", "/projects/proj-1.md")];
        let mut index = VaultIndex::from_scans(vec![], projects, vec![]);

        index.remove_project_by_path("/projects/proj-1.md");

        assert!(index.projects.is_empty());
        assert!(index.project_paths.is_empty());
    }

    #[test]
    fn vault_index_remove_area_by_path() {
        let areas = vec![test_area("area-1", "/areas/area-1.md")];
        let mut index = VaultIndex::from_scans(vec![], vec![], areas);

        index.remove_area_by_path("/areas/area-1.md");

        assert!(index.areas.is_empty());
        assert!(index.area_paths.is_empty());
    }

    // ------------------------------------------------------------------------
    // VaultManager basic tests (no Tauri AppHandle required)
    // ------------------------------------------------------------------------

    #[test]
    fn vault_manager_new_is_not_configured() {
        let manager = VaultManager::new();
        assert!(!manager.is_configured());
    }

    #[test]
    fn vault_manager_default_is_not_configured() {
        let manager = VaultManager::default();
        assert!(!manager.is_configured());
    }

    #[test]
    fn vault_manager_config_is_none_initially() {
        let manager = VaultManager::new();
        assert!(manager.config().is_none());
    }

    #[test]
    fn vault_manager_list_tasks_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.list_tasks();
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), VaultError::NotConfigured { .. }));
    }

    #[test]
    fn vault_manager_list_projects_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.list_projects();
        assert!(result.is_err());
    }

    #[test]
    fn vault_manager_list_areas_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.list_areas();
        assert!(result.is_err());
    }

    #[test]
    fn vault_manager_get_task_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.get_task("task-1");
        assert!(result.is_err());
    }

    #[test]
    fn vault_manager_get_project_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.get_project("proj-1");
        assert!(result.is_err());
    }

    #[test]
    fn vault_manager_get_area_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.get_area("area-1");
        assert!(result.is_err());
    }

    #[test]
    fn vault_manager_refresh_fails_when_not_configured() {
        let manager = VaultManager::new();
        let result = manager.refresh();
        assert!(result.is_err());
    }
}
