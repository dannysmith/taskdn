//! Error types for vault operations.
//!
//! These are structured for frontend consumption via tauri-specta.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;

/// Vault operation error types
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum VaultError {
    /// Vault not configured (no directories set in preferences)
    NotConfigured { message: String },
    /// File does not exist
    FileNotFound { path: String },
    /// Entity not found by ID
    EntityNotFound { entity_type: String, id: String },
    /// Failed to read file
    ReadError { path: String, message: String },
    /// Failed to write file
    WriteError { path: String, message: String },
    /// Failed to parse frontmatter
    ParseError { path: String, message: String },
    /// Validation failed
    ValidationError { field: String, message: String },
    /// File watcher error
    WatcherError { message: String },
    /// Internal error
    Internal { message: String },
}

impl fmt::Display for VaultError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            VaultError::NotConfigured { message } => write!(f, "Vault not configured: {message}"),
            VaultError::FileNotFound { path } => write!(f, "File not found: {path}"),
            VaultError::EntityNotFound { entity_type, id } => {
                write!(f, "{entity_type} not found: {id}")
            }
            VaultError::ReadError { path, message } => write!(f, "Read error ({path}): {message}"),
            VaultError::WriteError { path, message } => {
                write!(f, "Write error ({path}): {message}")
            }
            VaultError::ParseError { path, message } => {
                write!(f, "Parse error ({path}): {message}")
            }
            VaultError::ValidationError { field, message } => {
                write!(f, "Validation error ({field}): {message}")
            }
            VaultError::WatcherError { message } => write!(f, "Watcher error: {message}"),
            VaultError::Internal { message } => write!(f, "Internal error: {message}"),
        }
    }
}

impl std::error::Error for VaultError {}

impl VaultError {
    pub fn not_configured(message: impl Into<String>) -> Self {
        Self::NotConfigured {
            message: message.into(),
        }
    }

    pub fn file_not_found(path: impl Into<String>) -> Self {
        Self::FileNotFound { path: path.into() }
    }

    pub fn entity_not_found(entity_type: impl Into<String>, id: impl Into<String>) -> Self {
        Self::EntityNotFound {
            entity_type: entity_type.into(),
            id: id.into(),
        }
    }

    pub fn read_error(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ReadError {
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn write_error(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self::WriteError {
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn parse_error(path: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ParseError {
            path: path.into(),
            message: message.into(),
        }
    }

    pub fn validation_error(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self::ValidationError {
            field: field.into(),
            message: message.into(),
        }
    }

    pub fn watcher_error(message: impl Into<String>) -> Self {
        Self::WatcherError {
            message: message.into(),
        }
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------------
    // Display implementation tests
    // ------------------------------------------------------------------------

    #[test]
    fn display_not_configured() {
        let err = VaultError::NotConfigured {
            message: "No vault path set".to_string(),
        };
        assert_eq!(format!("{err}"), "Vault not configured: No vault path set");
    }

    #[test]
    fn display_file_not_found() {
        let err = VaultError::FileNotFound {
            path: "/path/to/file.md".to_string(),
        };
        assert_eq!(format!("{err}"), "File not found: /path/to/file.md");
    }

    #[test]
    fn display_entity_not_found() {
        let err = VaultError::EntityNotFound {
            entity_type: "Task".to_string(),
            id: "task-123".to_string(),
        };
        assert_eq!(format!("{err}"), "Task not found: task-123");
    }

    #[test]
    fn display_read_error() {
        let err = VaultError::ReadError {
            path: "/path/to/file.md".to_string(),
            message: "Permission denied".to_string(),
        };
        assert_eq!(
            format!("{err}"),
            "Read error (/path/to/file.md): Permission denied"
        );
    }

    #[test]
    fn display_write_error() {
        let err = VaultError::WriteError {
            path: "/path/to/file.md".to_string(),
            message: "Disk full".to_string(),
        };
        assert_eq!(
            format!("{err}"),
            "Write error (/path/to/file.md): Disk full"
        );
    }

    #[test]
    fn display_parse_error() {
        let err = VaultError::ParseError {
            path: "/path/to/file.md".to_string(),
            message: "Invalid YAML".to_string(),
        };
        assert_eq!(
            format!("{err}"),
            "Parse error (/path/to/file.md): Invalid YAML"
        );
    }

    #[test]
    fn display_validation_error() {
        let err = VaultError::ValidationError {
            field: "title".to_string(),
            message: "Title is required".to_string(),
        };
        assert_eq!(
            format!("{err}"),
            "Validation error (title): Title is required"
        );
    }

    #[test]
    fn display_watcher_error() {
        let err = VaultError::WatcherError {
            message: "Failed to start watcher".to_string(),
        };
        assert_eq!(format!("{err}"), "Watcher error: Failed to start watcher");
    }

    #[test]
    fn display_internal() {
        let err = VaultError::Internal {
            message: "Unexpected state".to_string(),
        };
        assert_eq!(format!("{err}"), "Internal error: Unexpected state");
    }

    // ------------------------------------------------------------------------
    // Builder method tests
    // ------------------------------------------------------------------------

    #[test]
    fn builder_not_configured() {
        let err = VaultError::not_configured("test message");
        assert!(matches!(err, VaultError::NotConfigured { message } if message == "test message"));
    }

    #[test]
    fn builder_file_not_found() {
        let err = VaultError::file_not_found("/test/path");
        assert!(matches!(err, VaultError::FileNotFound { path } if path == "/test/path"));
    }

    #[test]
    fn builder_entity_not_found() {
        let err = VaultError::entity_not_found("Project", "proj-123");
        assert!(matches!(
            err,
            VaultError::EntityNotFound { entity_type, id }
            if entity_type == "Project" && id == "proj-123"
        ));
    }

    #[test]
    fn builder_read_error() {
        let err = VaultError::read_error("/test/path", "error msg");
        assert!(matches!(
            err,
            VaultError::ReadError { path, message }
            if path == "/test/path" && message == "error msg"
        ));
    }

    #[test]
    fn builder_write_error() {
        let err = VaultError::write_error("/test/path", "write failed");
        assert!(matches!(
            err,
            VaultError::WriteError { path, message }
            if path == "/test/path" && message == "write failed"
        ));
    }

    #[test]
    fn builder_parse_error() {
        let err = VaultError::parse_error("/test/path", "invalid yaml");
        assert!(matches!(
            err,
            VaultError::ParseError { path, message }
            if path == "/test/path" && message == "invalid yaml"
        ));
    }

    #[test]
    fn builder_validation_error() {
        let err = VaultError::validation_error("status", "invalid value");
        assert!(matches!(
            err,
            VaultError::ValidationError { field, message }
            if field == "status" && message == "invalid value"
        ));
    }

    #[test]
    fn builder_watcher_error() {
        let err = VaultError::watcher_error("watcher failed");
        assert!(matches!(
            err,
            VaultError::WatcherError { message }
            if message == "watcher failed"
        ));
    }

    #[test]
    fn builder_internal() {
        let err = VaultError::internal("internal error");
        assert!(matches!(
            err,
            VaultError::Internal { message }
            if message == "internal error"
        ));
    }

    // ------------------------------------------------------------------------
    // Builder accepts various Into<String> types
    // ------------------------------------------------------------------------

    #[test]
    fn builder_accepts_string() {
        let err = VaultError::internal(String::from("owned string"));
        assert!(matches!(err, VaultError::Internal { message } if message == "owned string"));
    }

    #[test]
    fn builder_accepts_str_ref() {
        let err = VaultError::internal("str ref");
        assert!(matches!(err, VaultError::Internal { message } if message == "str ref"));
    }
}
