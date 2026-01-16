//! Vault management module for reading/writing task, project, and area files.
//!
//! This module provides:
//! - Entity structs (Task, Project, Area) matching the S1 specification
//! - File parsing and writing with round-trip fidelity
//! - VaultIndex for efficient relationship lookups
//! - VaultManager for long-lived vault access with file watching
//!
//! The architecture follows the pattern from the CLI but adapted for
//! desktop app requirements (long-lived, file watching, RwLock for mutability).

mod entities;
mod error;
mod manager;
mod scanner;
pub mod wikilink;
mod writer;

// Re-export internal types for use within the vault module
pub(crate) use entities::{AreaFrontmatter, ProjectFrontmatter, TaskFrontmatter};

// Public API
pub use entities::{
    Area, AreaStatus, CreateProjectOptions, CreateTaskOptions, Project, ProjectStatus,
    ProjectUpdate, Task, TaskStatus, TaskUpdate,
};
pub use error::VaultError;
pub use manager::{VaultIndex, VaultManager};
pub use scanner::{
    parse_area_file, parse_project_file, parse_task_file, scan_areas, scan_projects, scan_tasks,
    VaultConfig,
};
pub use writer::{create_project_file, create_task_file, update_project, update_task};
