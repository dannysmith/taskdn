//! Core types for the Taskdn library.
//!
//! This module contains all entity types (Task, Project, Area), their status enums,
//! creation/update types, and supporting types like `DateTimeValue` and `FileReference`.

mod area;
mod datetime;
mod project;
mod reference;
mod task;

pub use area::{Area, AreaStatus, AreaUpdates, NewArea, ParsedArea};
pub use datetime::DateTimeValue;
pub use project::{NewProject, ParsedProject, Project, ProjectStatus, ProjectUpdates};
pub use reference::FileReference;
pub use task::{NewTask, ParsedTask, Task, TaskStatus, TaskUpdates};
