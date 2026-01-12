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
