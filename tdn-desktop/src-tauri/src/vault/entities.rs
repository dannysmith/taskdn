//! Entity structs for tasks, projects, and areas.
//!
//! Design: Each entity has two representations:
//! - Internal frontmatter structs (kebab-case for YAML parsing)
//! - Public structs (camelCase for TypeScript via tauri-specta)
//!
//! This approach allows us to correctly parse YAML frontmatter while
//! also generating proper TypeScript types for the frontend.

use serde::{Deserialize, Serialize};
use specta::Type;

// =============================================================================
// Task
// =============================================================================

/// Task status enum matching S1 spec Section 3.5
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum TaskStatus {
    #[default]
    Inbox,
    Icebox,
    Ready,
    InProgress,
    Blocked,
    Dropped,
    Done,
}

/// Internal frontmatter structure for tasks (kebab-case for YAML).
/// Not exposed via specta - used only for parsing.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) struct TaskFrontmatter {
    pub title: String,
    pub status: TaskStatus,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub completed_at: Option<String>,
    #[serde(default)]
    pub due: Option<String>,
    #[serde(default)]
    pub scheduled: Option<String>,
    #[serde(default)]
    pub defer_until: Option<String>,
    #[serde(default)]
    pub area: Option<String>,
    #[serde(default)]
    pub projects: Option<Vec<String>>,
}

/// Public task struct exposed to TypeScript via tauri-specta.
/// Uses camelCase for TypeScript compatibility.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    /// Unique identifier derived from file path
    pub id: String,
    /// Absolute file path to the task
    pub path: String,
    /// Task title from frontmatter
    pub title: String,
    /// Task status
    pub status: TaskStatus,
    /// Creation date (ISO 8601)
    pub created_at: Option<String>,
    /// Last update date (ISO 8601)
    pub updated_at: Option<String>,
    /// Completion date (ISO 8601) - set when status becomes done/dropped
    pub completed_at: Option<String>,
    /// Due date/datetime (ISO 8601)
    pub due: Option<String>,
    /// Scheduled date (ISO 8601)
    pub scheduled: Option<String>,
    /// Defer until date (ISO 8601)
    pub defer_until: Option<String>,
    /// Area reference (WikiLink format, e.g., "[[Work]]")
    pub area: Option<String>,
    /// Project reference (WikiLink format) - first element of projects array
    pub project: Option<String>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

impl Task {
    /// Create a Task from parsed frontmatter and body content.
    pub(crate) fn from_frontmatter(
        path: String,
        frontmatter: TaskFrontmatter,
        body: String,
    ) -> Self {
        // Generate stable ID from path (hash the path for consistency)
        let id = generate_id_from_path(&path);

        // Extract first project from projects array
        let project = frontmatter.projects.and_then(|p| p.into_iter().next());

        Self {
            id,
            path,
            title: frontmatter.title,
            status: frontmatter.status,
            created_at: frontmatter.created_at,
            updated_at: frontmatter.updated_at,
            completed_at: frontmatter.completed_at,
            due: frontmatter.due,
            scheduled: frontmatter.scheduled,
            defer_until: frontmatter.defer_until,
            area: frontmatter.area,
            project,
            body,
        }
    }
}

// =============================================================================
// Project
// =============================================================================

/// Project status enum matching S1 spec Section 4.5
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum ProjectStatus {
    Planning,
    Ready,
    Blocked,
    InProgress,
    Paused,
    Done,
}

/// Internal frontmatter structure for projects (kebab-case for YAML).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) struct ProjectFrontmatter {
    pub title: String,
    #[serde(default)]
    pub status: Option<ProjectStatus>,
    #[serde(default)]
    pub area: Option<String>,
    #[serde(default)]
    pub start_date: Option<String>,
    #[serde(default)]
    pub end_date: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub blocked_by: Option<Vec<String>>,
}

/// Public project struct exposed to TypeScript via tauri-specta.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    /// Unique identifier derived from file path
    pub id: String,
    /// Absolute file path to the project
    pub path: String,
    /// Project title from frontmatter
    pub title: String,
    /// Project status (optional per S1 spec)
    pub status: Option<ProjectStatus>,
    /// Area reference (WikiLink format)
    pub area: Option<String>,
    /// Start date (ISO 8601)
    pub start_date: Option<String>,
    /// End date (ISO 8601)
    pub end_date: Option<String>,
    /// Short description
    pub description: Option<String>,
    /// Projects that block this one (WikiLink format)
    pub blocked_by: Option<Vec<String>>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

impl Project {
    /// Create a Project from parsed frontmatter and body content.
    pub(crate) fn from_frontmatter(
        path: String,
        frontmatter: ProjectFrontmatter,
        body: String,
    ) -> Self {
        let id = generate_id_from_path(&path);

        Self {
            id,
            path,
            title: frontmatter.title,
            status: frontmatter.status,
            area: frontmatter.area,
            start_date: frontmatter.start_date,
            end_date: frontmatter.end_date,
            description: frontmatter.description,
            blocked_by: frontmatter.blocked_by,
            body,
        }
    }
}

// =============================================================================
// Area
// =============================================================================

/// Area status enum matching S1 spec Section 5.5
/// Unlike tasks/projects, area status is for visibility only (active vs hidden).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "kebab-case")]
pub enum AreaStatus {
    Active,
    Archived,
}

/// Internal frontmatter structure for areas (kebab-case for YAML).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) struct AreaFrontmatter {
    pub title: String,
    #[serde(default)]
    pub status: Option<AreaStatus>,
    /// 'type' field in YAML - renamed to avoid Rust keyword conflict
    #[serde(default, rename = "type")]
    pub area_type: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
}

/// Public area struct exposed to TypeScript via tauri-specta.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Area {
    /// Unique identifier derived from file path
    pub id: String,
    /// Absolute file path to the area
    pub path: String,
    /// Area title from frontmatter
    pub title: String,
    /// Area status (optional per S1 spec)
    pub status: Option<AreaStatus>,
    /// Area type (e.g., "client", "life-area") - free-form string
    pub area_type: Option<String>,
    /// Short description
    pub description: Option<String>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

impl Area {
    /// Create an Area from parsed frontmatter and body content.
    pub(crate) fn from_frontmatter(
        path: String,
        frontmatter: AreaFrontmatter,
        body: String,
    ) -> Self {
        let id = generate_id_from_path(&path);

        Self {
            id,
            path,
            title: frontmatter.title,
            status: frontmatter.status,
            area_type: frontmatter.area_type,
            description: frontmatter.description,
            body,
        }
    }
}

// =============================================================================
// Update Types (for mutations)
// =============================================================================

/// Options for creating a new task
#[derive(Debug, Clone, Default, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskOptions {
    pub title: Option<String>,
    pub status: Option<TaskStatus>,
    pub project_id: Option<String>,
    pub area_id: Option<String>,
    pub scheduled: Option<String>,
    pub due: Option<String>,
    pub defer_until: Option<String>,
}

/// Fields that can be updated on a task
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdate {
    /// Task ID (required to identify which task to update)
    pub id: String,
    /// New title (if provided)
    pub title: Option<String>,
    /// New status (if provided)
    pub status: Option<TaskStatus>,
    /// New project reference (if provided, empty string to clear)
    pub project: Option<String>,
    /// New area reference (if provided, empty string to clear)
    pub area: Option<String>,
    /// New scheduled date (if provided, empty string to clear)
    pub scheduled: Option<String>,
    /// New due date (if provided, empty string to clear)
    pub due: Option<String>,
    /// New defer-until date (if provided, empty string to clear)
    pub defer_until: Option<String>,
    /// New body content (if provided)
    pub body: Option<String>,
}

/// Options for creating a new project
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectOptions {
    pub title: String,
    pub status: Option<ProjectStatus>,
    pub area_id: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Fields that can be updated on a project
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectUpdate {
    pub id: String,
    pub title: Option<String>,
    pub status: Option<ProjectStatus>,
    pub area: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub body: Option<String>,
}

// =============================================================================
// Helper Functions
// =============================================================================

/// Generate a stable ID from a file path.
/// Uses xxhash for consistent hashing across Rust versions.
fn generate_id_from_path(path: &str) -> String {
    let hash = xxhash_rust::xxh64::xxh64(path.as_bytes(), 0);
    format!("{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_id_from_path_is_stable() {
        let path = "/Users/test/vault/tasks/my-task.md";
        let id1 = generate_id_from_path(path);
        let id2 = generate_id_from_path(path);
        assert_eq!(id1, id2);
    }

    #[test]
    fn test_generate_id_from_path_is_unique() {
        let id1 = generate_id_from_path("/path/task1.md");
        let id2 = generate_id_from_path("/path/task2.md");
        assert_ne!(id1, id2);
    }

    #[test]
    fn test_task_status_serialization() {
        let status = TaskStatus::InProgress;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, r#""in-progress""#);
    }

    #[test]
    fn test_project_status_serialization() {
        let status = ProjectStatus::InProgress;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, r#""in-progress""#);
    }

    #[test]
    fn test_area_status_serialization() {
        let status = AreaStatus::Archived;
        let json = serde_json::to_string(&status).unwrap();
        assert_eq!(json, r#""archived""#);
    }
}
