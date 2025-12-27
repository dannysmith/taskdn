//! NAPI result types for vault query operations.
//!
//! These types are exposed to TypeScript via NAPI and represent the results
//! of relationship-aware queries (tasks in area, project context, etc.).

use crate::area::Area;
use crate::project::Project;
use crate::task::Task;

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
