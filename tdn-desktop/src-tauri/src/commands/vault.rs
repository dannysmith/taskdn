//! Tauri commands for vault operations (CRUD for tasks, projects, areas).
//!
//! These commands provide type-safe access to the vault via tauri-specta.

use tauri::State;

use crate::vault::{
    Area, CreateProjectOptions, CreateTaskOptions, Project, ProjectUpdate, Task, TaskUpdate,
    VaultConfig, VaultError, VaultManager,
};

// =============================================================================
// Initialization
// =============================================================================

/// Initialize the vault with the given configuration.
/// Should be called after preferences are loaded.
#[tauri::command]
#[specta::specta]
pub fn init_vault(
    app: tauri::AppHandle,
    vault_manager: State<'_, VaultManager>,
    tasks_dir: String,
    projects_dir: String,
    areas_dir: String,
    ignore: Option<Vec<String>>,
) -> Result<(), VaultError> {
    let config = VaultConfig::from_dirs(tasks_dir, projects_dir, areas_dir, ignore);
    vault_manager.initialize(config, app)
}

/// Check if the vault is configured
#[tauri::command]
#[specta::specta]
pub fn is_vault_configured(vault_manager: State<'_, VaultManager>) -> bool {
    vault_manager.is_configured()
}

/// Refresh the vault by re-scanning all directories.
/// Call this when receiving the vault-changed event.
#[tauri::command]
#[specta::specta]
pub fn refresh_vault(vault_manager: State<'_, VaultManager>) -> Result<(), VaultError> {
    vault_manager.refresh()
}

// =============================================================================
// List Operations
// =============================================================================

/// Get all tasks from the vault
#[tauri::command]
#[specta::specta]
pub fn list_tasks(vault_manager: State<'_, VaultManager>) -> Result<Vec<Task>, VaultError> {
    vault_manager.list_tasks()
}

/// Get all projects from the vault
#[tauri::command]
#[specta::specta]
pub fn list_projects(vault_manager: State<'_, VaultManager>) -> Result<Vec<Project>, VaultError> {
    vault_manager.list_projects()
}

/// Get all areas from the vault
#[tauri::command]
#[specta::specta]
pub fn list_areas(vault_manager: State<'_, VaultManager>) -> Result<Vec<Area>, VaultError> {
    vault_manager.list_areas()
}

// =============================================================================
// Get Single Entity
// =============================================================================

/// Get a task by ID
#[tauri::command]
#[specta::specta]
pub fn get_task(vault_manager: State<'_, VaultManager>, id: String) -> Result<Task, VaultError> {
    vault_manager.get_task(&id)
}

/// Get a project by ID
#[tauri::command]
#[specta::specta]
pub fn get_project(
    vault_manager: State<'_, VaultManager>,
    id: String,
) -> Result<Project, VaultError> {
    vault_manager.get_project(&id)
}

/// Get an area by ID
#[tauri::command]
#[specta::specta]
pub fn get_area(vault_manager: State<'_, VaultManager>, id: String) -> Result<Area, VaultError> {
    vault_manager.get_area(&id)
}

// =============================================================================
// Create Operations
// =============================================================================

/// Create a new task
#[tauri::command]
#[specta::specta]
pub fn create_task(
    vault_manager: State<'_, VaultManager>,
    options: CreateTaskOptions,
) -> Result<Task, VaultError> {
    vault_manager.create_task(options)
}

/// Create a new project
#[tauri::command]
#[specta::specta]
pub fn create_project(
    vault_manager: State<'_, VaultManager>,
    options: CreateProjectOptions,
) -> Result<Project, VaultError> {
    vault_manager.create_project(options)
}

// =============================================================================
// Update Operations
// =============================================================================

/// Update an existing task
#[tauri::command]
#[specta::specta]
pub fn update_task(
    vault_manager: State<'_, VaultManager>,
    update: TaskUpdate,
) -> Result<Task, VaultError> {
    vault_manager.update_task(update)
}

/// Update an existing project
#[tauri::command]
#[specta::specta]
pub fn update_project(
    vault_manager: State<'_, VaultManager>,
    update: ProjectUpdate,
) -> Result<Project, VaultError> {
    vault_manager.update_project(update)
}

// =============================================================================
// Delete Operations
// =============================================================================

/// Delete a task by ID.
///
/// If `permanent` is true, the file is permanently deleted.
/// Otherwise, it's moved to the OS trash/recycle bin.
#[tauri::command]
#[specta::specta]
pub fn delete_task(
    vault_manager: State<'_, VaultManager>,
    id: String,
    permanent: bool,
) -> Result<(), VaultError> {
    vault_manager.delete_task(&id, permanent)
}

// =============================================================================
// Raw Content
// =============================================================================

/// Get raw file content for an entity (task, project, or area) by ID.
/// Returns the entire markdown file as a string.
#[tauri::command]
#[specta::specta]
pub fn get_entity_raw_content(
    vault_manager: State<'_, VaultManager>,
    entity_type: String,
    id: String,
) -> Result<String, VaultError> {
    vault_manager.get_entity_raw_content(&entity_type, &id)
}

// =============================================================================
// Tests
// =============================================================================
//
// These tests verify the vault command handlers by testing the underlying
// VaultManager methods directly. The command handlers are thin wrappers that
// extract State<VaultManager> and delegate to these methods.

#[cfg(test)]
mod tests {
    use tempfile::TempDir;

    use crate::vault::{
        CreateProjectOptions, CreateTaskOptions, ProjectUpdate, TaskStatus, TaskUpdate,
        VaultConfig, VaultManager,
    };

    /// Create a temp directory with vault structure (tasks/, projects/, areas/)
    fn create_test_vault() -> TempDir {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");

        std::fs::create_dir(temp_dir.path().join("tasks")).expect("Failed to create tasks dir");
        std::fs::create_dir(temp_dir.path().join("projects"))
            .expect("Failed to create projects dir");
        std::fs::create_dir(temp_dir.path().join("areas")).expect("Failed to create areas dir");

        temp_dir
    }

    /// Create a VaultConfig from a temp directory
    fn config_from_temp(temp_dir: &TempDir) -> VaultConfig {
        VaultConfig::from_dirs(
            temp_dir.path().join("tasks").to_string_lossy().to_string(),
            temp_dir
                .path()
                .join("projects")
                .to_string_lossy()
                .to_string(),
            temp_dir.path().join("areas").to_string_lossy().to_string(),
            None,
        )
    }

    /// Create and initialize a VaultManager for testing
    fn create_test_manager(temp_dir: &TempDir) -> VaultManager {
        let manager = VaultManager::new();
        let config = config_from_temp(temp_dir);
        manager
            .initialize_for_test(config)
            .expect("Failed to initialize vault");
        manager
    }

    // -------------------------------------------------------------------------
    // Initialization Tests
    // -------------------------------------------------------------------------

    #[test]
    fn vault_manager_not_configured_initially() {
        let manager = VaultManager::new();
        assert!(!manager.is_configured());
    }

    #[test]
    fn vault_manager_configured_after_init() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);
        assert!(manager.is_configured());
    }

    #[test]
    fn vault_manager_init_fails_with_invalid_dirs() {
        let manager = VaultManager::new();
        let config = VaultConfig::from_dirs(
            "/nonexistent/tasks".to_string(),
            "/nonexistent/projects".to_string(),
            "/nonexistent/areas".to_string(),
            None,
        );
        let result = manager.initialize_for_test(config);
        assert!(result.is_err());
    }

    // -------------------------------------------------------------------------
    // List Operations (Empty Vault)
    // -------------------------------------------------------------------------

    #[test]
    fn list_tasks_empty_vault() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let tasks = manager.list_tasks().expect("list_tasks failed");
        assert!(tasks.is_empty());
    }

    #[test]
    fn list_projects_empty_vault() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let projects = manager.list_projects().expect("list_projects failed");
        assert!(projects.is_empty());
    }

    #[test]
    fn list_areas_empty_vault() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let areas = manager.list_areas().expect("list_areas failed");
        assert!(areas.is_empty());
    }

    #[test]
    fn list_fails_when_not_configured() {
        let manager = VaultManager::new();
        assert!(manager.list_tasks().is_err());
        assert!(manager.list_projects().is_err());
        assert!(manager.list_areas().is_err());
    }

    // -------------------------------------------------------------------------
    // Create Task Tests
    // -------------------------------------------------------------------------

    #[test]
    fn create_task_minimal() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Test Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };

        let task = manager.create_task(options).expect("create_task failed");

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, TaskStatus::Inbox); // Default status
        assert!(task.path.contains("test-task.md"));
    }

    #[test]
    fn create_task_with_all_fields() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Full Task".to_string()),
            status: Some(TaskStatus::Ready),
            due: Some("2025-12-31".to_string()),
            scheduled: Some("2025-06-15".to_string()),
            defer_until: Some("2025-06-01".to_string()),
            project_id: Some("test-project".to_string()),
            area_id: Some("work".to_string()),
        };

        let task = manager.create_task(options).expect("create_task failed");

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.status, TaskStatus::Ready);
        assert_eq!(task.due, Some("2025-12-31".to_string()));
        assert_eq!(task.scheduled, Some("2025-06-15".to_string()));
        assert_eq!(task.defer_until, Some("2025-06-01".to_string()));
        // project and area are stored as wikilinks internally
        assert!(task.project.is_some());
        assert!(task.area.is_some());
    }

    #[test]
    fn create_task_appears_in_list() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Listed Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };

        let created = manager.create_task(options).expect("create_task failed");
        let tasks = manager.list_tasks().expect("list_tasks failed");

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].id, created.id);
    }

    #[test]
    fn create_task_file_exists_on_disk() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Disk Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };

        let task = manager.create_task(options).expect("create_task failed");

        assert!(
            std::path::Path::new(&task.path).exists(),
            "Task file should exist at {}",
            task.path
        );
    }

    // -------------------------------------------------------------------------
    // Create Project Tests
    // -------------------------------------------------------------------------

    #[test]
    fn create_project_minimal() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateProjectOptions {
            title: "Test Project".to_string(),
            status: None,
            area_id: None,
            start_date: None,
            end_date: None,
            description: None,
        };

        let project = manager
            .create_project(options)
            .expect("create_project failed");

        assert_eq!(project.title, "Test Project");
        assert!(project.path.contains("test-project.md"));
    }

    #[test]
    fn create_project_with_all_fields() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateProjectOptions {
            title: "Full Project".to_string(),
            status: Some(crate::vault::ProjectStatus::InProgress),
            area_id: Some("work".to_string()),
            start_date: Some("2025-01-01".to_string()),
            end_date: Some("2025-12-31".to_string()),
            description: Some("Project description".to_string()),
        };

        let project = manager
            .create_project(options)
            .expect("create_project failed");

        assert_eq!(project.title, "Full Project");
        assert_eq!(
            project.status,
            Some(crate::vault::ProjectStatus::InProgress)
        );
        assert!(project.area.is_some()); // area stored as wikilink
        assert_eq!(project.start_date, Some("2025-01-01".to_string()));
        assert_eq!(project.end_date, Some("2025-12-31".to_string()));
        assert_eq!(project.description, Some("Project description".to_string()));
    }

    #[test]
    fn create_project_appears_in_list() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateProjectOptions {
            title: "Listed Project".to_string(),
            status: None,
            area_id: None,
            start_date: None,
            end_date: None,
            description: None,
        };

        let created = manager
            .create_project(options)
            .expect("create_project failed");
        let projects = manager.list_projects().expect("list_projects failed");

        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].id, created.id);
    }

    // -------------------------------------------------------------------------
    // Get Entity Tests
    // -------------------------------------------------------------------------

    #[test]
    fn get_task_by_id() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Retrievable Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };

        let created = manager.create_task(options).expect("create_task failed");
        let retrieved = manager.get_task(&created.id).expect("get_task failed");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.title, "Retrievable Task");
    }

    #[test]
    fn get_task_not_found() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let result = manager.get_task("nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn get_project_by_id() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateProjectOptions {
            title: "Retrievable Project".to_string(),
            status: None,
            area_id: None,
            start_date: None,
            end_date: None,
            description: None,
        };

        let created = manager
            .create_project(options)
            .expect("create_project failed");
        let retrieved = manager
            .get_project(&created.id)
            .expect("get_project failed");

        assert_eq!(retrieved.id, created.id);
        assert_eq!(retrieved.title, "Retrievable Project");
    }

    #[test]
    fn get_project_not_found() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let result = manager.get_project("nonexistent-id");
        assert!(result.is_err());
    }

    #[test]
    fn get_area_not_found() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let result = manager.get_area("nonexistent-id");
        assert!(result.is_err());
    }

    // -------------------------------------------------------------------------
    // Update Task Tests
    // -------------------------------------------------------------------------

    #[test]
    fn update_task_title() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create task
        let options = CreateTaskOptions {
            title: Some("Original Title".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");

        // Update title
        let update = TaskUpdate {
            id: created.id.clone(),
            title: Some("Updated Title".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project: None,
            area: None,
            body: None,
        };
        let updated = manager.update_task(update).expect("update_task failed");

        assert_eq!(updated.title, "Updated Title");
        assert_eq!(updated.id, created.id);
    }

    #[test]
    fn update_task_status() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create task
        let options = CreateTaskOptions {
            title: Some("Status Task".to_string()),
            status: Some(TaskStatus::Inbox),
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");
        assert_eq!(created.status, TaskStatus::Inbox);

        // Update status to Done
        let update = TaskUpdate {
            id: created.id.clone(),
            title: None,
            status: Some(TaskStatus::Done),
            due: None,
            scheduled: None,
            defer_until: None,
            project: None,
            area: None,
            body: None,
        };
        let updated = manager.update_task(update).expect("update_task failed");

        assert_eq!(updated.status, TaskStatus::Done);
        assert!(updated.completed_at.is_some()); // Should set completed_at
    }

    #[test]
    fn update_task_persists_to_disk() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create task
        let options = CreateTaskOptions {
            title: Some("Persist Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");

        // Update
        let update = TaskUpdate {
            id: created.id.clone(),
            title: Some("Persisted Title".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project: None,
            area: None,
            body: None,
        };
        manager.update_task(update).expect("update_task failed");

        // Read file directly
        let content =
            std::fs::read_to_string(&created.path).expect("Failed to read task file");
        assert!(content.contains("Persisted Title"));
    }

    #[test]
    fn update_nonexistent_task_fails() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let update = TaskUpdate {
            id: "nonexistent-id".to_string(),
            title: Some("Title".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project: None,
            area: None,
            body: None,
        };
        let result = manager.update_task(update);
        assert!(result.is_err());
    }

    // -------------------------------------------------------------------------
    // Update Project Tests
    // -------------------------------------------------------------------------

    #[test]
    fn update_project_title() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create project
        let options = CreateProjectOptions {
            title: "Original Project".to_string(),
            status: None,
            area_id: None,
            start_date: None,
            end_date: None,
            description: None,
        };
        let created = manager
            .create_project(options)
            .expect("create_project failed");

        // Update
        let update = ProjectUpdate {
            id: created.id.clone(),
            title: Some("Updated Project".to_string()),
            status: None,
            area: None,
            start_date: None,
            end_date: None,
            description: None,
            body: None,
        };
        let updated = manager
            .update_project(update)
            .expect("update_project failed");

        assert_eq!(updated.title, "Updated Project");
    }

    #[test]
    fn update_project_status() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create project
        let options = CreateProjectOptions {
            title: "Status Project".to_string(),
            status: Some(crate::vault::ProjectStatus::Planning),
            area_id: None,
            start_date: None,
            end_date: None,
            description: None,
        };
        let created = manager
            .create_project(options)
            .expect("create_project failed");

        // Update status
        let update = ProjectUpdate {
            id: created.id.clone(),
            title: None,
            status: Some(crate::vault::ProjectStatus::Done),
            area: None,
            start_date: None,
            end_date: None,
            description: None,
            body: None,
        };
        let updated = manager
            .update_project(update)
            .expect("update_project failed");

        assert_eq!(updated.status, Some(crate::vault::ProjectStatus::Done));
    }

    // -------------------------------------------------------------------------
    // Delete Task Tests
    // -------------------------------------------------------------------------

    #[test]
    fn delete_task_permanent() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create task
        let options = CreateTaskOptions {
            title: Some("Delete Me".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");
        let path = created.path.clone();

        // Verify file exists
        assert!(std::path::Path::new(&path).exists());

        // Delete permanently
        manager
            .delete_task(&created.id, true)
            .expect("delete_task failed");

        // Verify file is gone
        assert!(!std::path::Path::new(&path).exists());

        // Verify not in list
        let tasks = manager.list_tasks().expect("list_tasks failed");
        assert!(tasks.is_empty());
    }

    #[test]
    fn delete_task_removes_from_index() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create task
        let options = CreateTaskOptions {
            title: Some("Indexed Task".to_string()),
            status: None,
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");

        // Verify in list
        assert_eq!(manager.list_tasks().unwrap().len(), 1);

        // Delete
        manager
            .delete_task(&created.id, true)
            .expect("delete_task failed");

        // Verify removed from list
        assert!(manager.list_tasks().unwrap().is_empty());

        // Verify get_task fails
        assert!(manager.get_task(&created.id).is_err());
    }

    #[test]
    fn delete_nonexistent_task_fails() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let result = manager.delete_task("nonexistent-id", true);
        assert!(result.is_err());
    }

    // -------------------------------------------------------------------------
    // Raw Content Tests
    // -------------------------------------------------------------------------

    #[test]
    fn get_entity_raw_content_task() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let options = CreateTaskOptions {
            title: Some("Raw Content Task".to_string()),
            status: Some(TaskStatus::Ready),
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        };
        let created = manager.create_task(options).expect("create_task failed");

        let content = manager
            .get_entity_raw_content("task", &created.id)
            .expect("get_entity_raw_content failed");

        assert!(content.contains("Raw Content Task"));
        assert!(content.contains("ready")); // Status in frontmatter
    }

    #[test]
    fn get_entity_raw_content_invalid_type() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        let result = manager.get_entity_raw_content("invalid", "some-id");
        assert!(result.is_err());
    }

    // -------------------------------------------------------------------------
    // Refresh Tests
    // -------------------------------------------------------------------------

    #[test]
    fn refresh_picks_up_new_files() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Initially empty
        assert!(manager.list_tasks().unwrap().is_empty());

        // Write a task file directly
        let task_content = r#"---
title: External Task
status: inbox
created-at: 2025-01-15
updated-at: 2025-01-15
---
"#;
        let task_path = temp_dir.path().join("tasks").join("external-task.md");
        std::fs::write(&task_path, task_content).expect("Failed to write task file");

        // Still empty (not refreshed)
        assert!(manager.list_tasks().unwrap().is_empty());

        // Refresh
        manager.refresh().expect("refresh failed");

        // Now should have the task
        let tasks = manager.list_tasks().unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "External Task");
    }

    // -------------------------------------------------------------------------
    // Multiple Entity Tests
    // -------------------------------------------------------------------------

    #[test]
    fn create_multiple_tasks() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        for i in 1..=5 {
            let options = CreateTaskOptions {
                title: Some(format!("Task {i}")),
                status: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project_id: None,
                area_id: None,
            };
            manager.create_task(options).expect("create_task failed");
        }

        let tasks = manager.list_tasks().unwrap();
        assert_eq!(tasks.len(), 5);
    }

    #[test]
    fn create_tasks_and_projects_together() {
        let temp_dir = create_test_vault();
        let manager = create_test_manager(&temp_dir);

        // Create tasks
        for i in 1..=3 {
            let options = CreateTaskOptions {
                title: Some(format!("Task {i}")),
                status: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project_id: None,
                area_id: None,
            };
            manager.create_task(options).expect("create_task failed");
        }

        // Create projects
        for i in 1..=2 {
            let options = CreateProjectOptions {
                title: format!("Project {i}"),
                status: None,
                area_id: None,
                start_date: None,
                end_date: None,
                description: None,
            };
            manager
                .create_project(options)
                .expect("create_project failed");
        }

        assert_eq!(manager.list_tasks().unwrap().len(), 3);
        assert_eq!(manager.list_projects().unwrap().len(), 2);
        assert!(manager.list_areas().unwrap().is_empty());
    }
}
