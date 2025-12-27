//! Vault session management for efficient index reuse.
//!
//! The VaultSession pattern solves three performance problems:
//! 1. Eliminates redundant vault scans for multiple queries
//! 2. Provides lazy index building (only when needed)
//! 3. Caches VaultConfig to avoid cloning
//!
//! Usage pattern:
//! - Create one session per command invocation
//! - Use session for all queries within that command
//! - Session is dropped when command exits (no staleness issues)

use std::sync::OnceLock;

use crate::area::Area;
use crate::project::Project;
use crate::task::Task;
use crate::vault::VaultConfig;
use crate::vault_index::{
    VaultIndex, AreaContextResult, ProjectContextResult, TaskContextResult,
    TasksInAreaResult, ProjectsInAreaResult,
};

/// Session for vault operations.
/// Builds index lazily on first query and caches it for subsequent operations.
#[napi]
pub struct VaultSession {
    config: VaultConfig,
    /// Lazily built index - constructed on first query that needs it
    index: OnceLock<VaultIndex>,
}

impl VaultSession {
    /// Get or build the vault index.
    /// Uses OnceLock to ensure index is only built once, even across multiple calls.
    fn get_or_build_index(&self) -> &VaultIndex {
        self.index.get_or_init(|| VaultIndex::build(&self.config))
    }
}

/// Create a new vault session with the given configuration.
/// The session will lazily build an index on the first query that needs it.
#[napi]
pub fn create_vault_session(config: VaultConfig) -> VaultSession {
    VaultSession {
        config,
        index: OnceLock::new(),
    }
}

/// Result type for unified entity search across all entity types.
/// Returns separate vectors for each entity type that matched the query.
#[derive(Debug, Clone)]
#[napi(object)]
pub struct EntitySearchResult {
    pub tasks: Vec<Task>,
    pub projects: Vec<Project>,
    pub areas: Vec<Area>,
}

/// Find all entities matching a query (case-insensitive substring on title).
/// Searches tasks, projects, and areas in a single index scan.
/// Returns all matches - disambiguation is handled at the command layer.
#[napi]
pub fn find_entity_by_title(session: &VaultSession, query: String) -> EntitySearchResult {
    let index = session.get_or_build_index();
    let query_lower = query.to_lowercase();

    // Search all entity types with the cached index
    let tasks = index
        .find_tasks_by_title(&query)
        .into_iter()
        .cloned()
        .collect();

    let projects: Vec<Project> = index
        .projects()
        .iter()
        .filter(|p| p.title.to_lowercase().contains(&query_lower))
        .cloned()
        .collect();

    let areas: Vec<Area> = index
        .areas()
        .iter()
        .filter(|a| a.title.to_lowercase().contains(&query_lower))
        .cloned()
        .collect();

    EntitySearchResult {
        tasks,
        projects,
        areas,
    }
}

/// Find tasks matching a query (case-insensitive substring on title).
/// Uses the session's cached index for O(1) lookup after first query.
#[napi]
pub fn find_tasks_by_title(session: &VaultSession, query: String) -> Vec<Task> {
    let index = session.get_or_build_index();
    index.find_tasks_by_title(&query).into_iter().cloned().collect()
}

/// Find projects matching a query (case-insensitive substring on title).
/// Uses the session's cached index for O(1) lookup after first query.
#[napi]
pub fn find_projects_by_title(session: &VaultSession, query: String) -> Vec<Project> {
    let index = session.get_or_build_index();
    let query_lower = query.to_lowercase();

    index
        .projects()
        .iter()
        .filter(|p| p.title.to_lowercase().contains(&query_lower))
        .cloned()
        .collect()
}

/// Find areas matching a query (case-insensitive substring on title).
/// Uses the session's cached index for O(1) lookup after first query.
#[napi]
pub fn find_areas_by_title(session: &VaultSession, query: String) -> Vec<Area> {
    let index = session.get_or_build_index();
    let query_lower = query.to_lowercase();

    index
        .areas()
        .iter()
        .filter(|a| a.title.to_lowercase().contains(&query_lower))
        .cloned()
        .collect()
}

// =============================================================================
// Context Query Functions
// =============================================================================

/// Get tasks in an area (direct + via projects).
/// Uses the session's cached index for efficient queries.
#[napi]
pub fn get_tasks_in_area(session: &VaultSession, area_name: String) -> TasksInAreaResult {
    let index = session.get_or_build_index();
    index.get_tasks_in_area_result(&area_name)
}

/// Get projects in an area.
/// Uses the session's cached index for efficient queries.
#[napi]
pub fn get_projects_in_area(session: &VaultSession, area_name: String) -> ProjectsInAreaResult {
    let index = session.get_or_build_index();
    index.get_projects_in_area_result(&area_name)
}

/// Get full context for an area (for context command).
/// Uses the session's cached index for efficient queries.
#[napi]
pub fn get_area_context(session: &VaultSession, area_name: String) -> AreaContextResult {
    let index = session.get_or_build_index();
    index.get_area_context_result(&area_name)
}

/// Get full context for a project (for context command).
/// Uses the session's cached index for efficient queries.
#[napi]
pub fn get_project_context(session: &VaultSession, project_name: String) -> ProjectContextResult {
    let index = session.get_or_build_index();
    index.get_project_context_result(&project_name)
}

/// Get full context for a task (for context command).
/// Accepts either an absolute file path or a task title.
/// Uses the session's cached index for efficient queries.
#[napi]
pub fn get_task_context(session: &VaultSession, path_or_title: String) -> TaskContextResult {
    let index = session.get_or_build_index();
    index.get_task_context_result(&path_or_title)
}
