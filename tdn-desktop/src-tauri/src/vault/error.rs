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
