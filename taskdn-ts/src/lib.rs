//! NAPI-RS bindings for the Taskdn Rust SDK.
//!
//! This is a thin wrapper that exposes the Rust SDK to Node.js/Bun environments.
//! All business logic remains in the Rust SDK - this layer only handles type
//! conversion between Rust and JavaScript.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::path::PathBuf;
use taskdn::{TaskdnConfig, Taskdn as CoreTaskdn};

/// The main entry point for the Taskdn SDK.
///
/// Provides methods for listing, reading, creating, and updating tasks,
/// projects, and areas.
#[napi]
pub struct Taskdn {
    inner: CoreTaskdn,
}

#[napi]
impl Taskdn {
    /// Creates a new Taskdn instance with the given directory paths.
    ///
    /// # Arguments
    ///
    /// * `tasks_dir` - Path to the tasks directory
    /// * `projects_dir` - Path to the projects directory
    /// * `areas_dir` - Path to the areas directory
    ///
    /// # Errors
    ///
    /// Returns an error if any of the directories do not exist.
    #[napi(constructor)]
    pub fn new(tasks_dir: String, projects_dir: String, areas_dir: String) -> Result<Self> {
        let config = TaskdnConfig::new(
            PathBuf::from(tasks_dir),
            PathBuf::from(projects_dir),
            PathBuf::from(areas_dir),
        );
        let inner = CoreTaskdn::new(config)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(Self { inner })
    }

    /// Returns the configured tasks directory path.
    #[napi(getter)]
    pub fn tasks_dir(&self) -> String {
        self.inner.config().tasks_dir.to_string_lossy().to_string()
    }

    /// Returns the configured projects directory path.
    #[napi(getter)]
    pub fn projects_dir(&self) -> String {
        self.inner.config().projects_dir.to_string_lossy().to_string()
    }

    /// Returns the configured areas directory path.
    #[napi(getter)]
    pub fn areas_dir(&self) -> String {
        self.inner.config().areas_dir.to_string_lossy().to_string()
    }
}
