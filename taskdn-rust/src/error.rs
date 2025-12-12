//! Error types for the taskdn library.

use std::path::PathBuf;

/// All errors that can occur in the taskdn library.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// Failed to read a file from disk.
    #[error("failed to read file {path}: {source}")]
    ReadFile {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    /// Failed to write a file to disk.
    #[error("failed to write file {path}: {source}")]
    WriteFile {
        path: PathBuf,
        #[source]
        source: std::io::Error,
    },

    /// Failed to parse frontmatter YAML.
    #[error("failed to parse frontmatter in {path}: {message}")]
    ParseFrontmatter { path: PathBuf, message: String },

    /// A required field is missing from the frontmatter.
    #[error("missing required field '{field}' in {path}")]
    MissingField { path: PathBuf, field: &'static str },

    /// A field has an invalid value.
    #[error("invalid value for field '{field}' in {path}: {message}")]
    InvalidField {
        path: PathBuf,
        field: &'static str,
        message: String,
    },

    /// Failed to resolve a file reference (`WikiLink` or path).
    #[error("could not resolve reference '{reference}': {message}")]
    UnresolvedReference { reference: String, message: String },

    /// The specified path does not exist.
    #[error("path does not exist: {0}")]
    PathNotFound(PathBuf),

    /// The specified path is not a directory.
    #[error("path is not a directory: {0}")]
    NotADirectory(PathBuf),
}

/// Result type alias for taskdn operations.
pub type Result<T> = std::result::Result<T, Error>;
