//! Error types for the taskdn library.

use std::path::PathBuf;

/// All errors that can occur in the taskdn library.
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum Error {
    /// File not found at the specified path.
    #[error("file not found: {}", path.display())]
    NotFound { path: PathBuf },

    /// Failed to parse file content.
    #[error("failed to parse {}: {message}", path.display())]
    Parse { path: PathBuf, message: String },

    /// Failed to parse content (no file path context).
    #[error("failed to parse content: {message}")]
    ContentParse { message: String },

    /// Validation error in file content.
    #[error("validation error in {}: {message}", path.display())]
    Validation { path: PathBuf, message: String },

    /// A required field is missing from the frontmatter.
    #[error("missing required field '{field}' in {}", path.display())]
    MissingField { path: PathBuf, field: &'static str },

    /// A required field is missing from the content (no file path context).
    #[error("missing required field '{field}'")]
    ContentMissingField { field: &'static str },

    /// A field has an invalid value.
    #[error("invalid value for '{field}' in {}: {message}", path.display())]
    InvalidField {
        path: PathBuf,
        field: &'static str,
        message: String,
    },

    /// A field has an invalid value (no file path context).
    #[error("invalid value for '{field}': {message}")]
    ContentInvalidField {
        field: &'static str,
        message: String,
    },

    /// Failed to resolve a file reference (`WikiLink` or path).
    #[error("unresolved reference: {reference}")]
    UnresolvedReference { reference: String },

    /// Cannot delete file due to constraints.
    #[error("cannot delete {}: {reason}", path.display())]
    DeleteBlocked { path: PathBuf, reason: String },

    /// Directory not found.
    #[error("directory not found: {}", path.display())]
    DirectoryNotFound { path: PathBuf },

    /// General I/O error.
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Result type alias for taskdn operations.
pub type Result<T> = std::result::Result<T, Error>;

/// Result type for batch operations that can partially succeed.
#[derive(Debug)]
pub struct BatchResult<T> {
    /// Items that were successfully processed.
    pub succeeded: Vec<T>,
    /// Items that failed, with their errors.
    pub failed: Vec<(PathBuf, Error)>,
}

impl<T> BatchResult<T> {
    /// Creates a new empty batch result.
    #[must_use]
    pub fn new() -> Self {
        Self {
            succeeded: Vec::new(),
            failed: Vec::new(),
        }
    }

    /// Returns true if all operations succeeded.
    #[must_use]
    pub fn is_complete_success(&self) -> bool {
        self.failed.is_empty()
    }

    /// Returns the number of successful operations.
    #[must_use]
    pub fn success_count(&self) -> usize {
        self.succeeded.len()
    }

    /// Returns the number of failed operations.
    #[must_use]
    pub fn failure_count(&self) -> usize {
        self.failed.len()
    }

    /// Converts to Result, failing if any operation failed.
    ///
    /// # Errors
    ///
    /// Returns the list of failures if any operations failed.
    pub fn into_result(self) -> std::result::Result<Vec<T>, Vec<(PathBuf, Error)>> {
        if self.failed.is_empty() {
            Ok(self.succeeded)
        } else {
            Err(self.failed)
        }
    }
}

impl<T> Default for BatchResult<T> {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn batch_result_empty_is_success() {
        let result: BatchResult<PathBuf> = BatchResult::new();
        assert!(result.is_complete_success());
        assert_eq!(result.success_count(), 0);
        assert_eq!(result.failure_count(), 0);
    }

    #[test]
    fn batch_result_with_successes() {
        let mut result = BatchResult::new();
        result.succeeded.push(PathBuf::from("/test/a.md"));
        result.succeeded.push(PathBuf::from("/test/b.md"));

        assert!(result.is_complete_success());
        assert_eq!(result.success_count(), 2);
        assert_eq!(result.failure_count(), 0);
    }

    #[test]
    fn batch_result_with_failures() {
        let mut result: BatchResult<PathBuf> = BatchResult::new();
        result.succeeded.push(PathBuf::from("/test/a.md"));
        result.failed.push((
            PathBuf::from("/test/b.md"),
            Error::NotFound {
                path: PathBuf::from("/test/b.md"),
            },
        ));

        assert!(!result.is_complete_success());
        assert_eq!(result.success_count(), 1);
        assert_eq!(result.failure_count(), 1);
    }

    #[test]
    fn batch_result_into_result_success() {
        let mut result = BatchResult::new();
        result.succeeded.push(PathBuf::from("/test/a.md"));

        let converted = result.into_result();
        assert!(converted.is_ok());
        assert_eq!(converted.unwrap().len(), 1);
    }

    #[test]
    fn batch_result_into_result_failure() {
        let mut result: BatchResult<PathBuf> = BatchResult::new();
        result.failed.push((
            PathBuf::from("/test/b.md"),
            Error::NotFound {
                path: PathBuf::from("/test/b.md"),
            },
        ));

        let converted = result.into_result();
        assert!(converted.is_err());
    }
}
