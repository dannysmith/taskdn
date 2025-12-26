use napi::bindgen_prelude::*;
use serde::Serialize;

/// Error kind enum exposed to TypeScript as a string union
#[derive(Debug, Clone, Serialize)]
#[napi(string_enum)]
#[serde(rename_all = "PascalCase")]
pub enum TdnErrorKind {
    FileNotFound,
    FileReadError,
    ParseError,
    ValidationError,
    WriteError,
}

/// Structured error type exposed to TypeScript
#[derive(Debug, Clone)]
#[napi(object)]
pub struct TdnError {
    /// The kind/category of error
    pub kind: TdnErrorKind,
    /// Human-readable error message
    pub message: String,
    /// Optional file path where the error occurred
    pub path: Option<String>,
    /// Optional field name for validation/parse errors
    pub field: Option<String>,
}

impl TdnError {
    /// Create a file not found error
    pub fn file_not_found(path: impl Into<String>) -> Self {
        let path_str = path.into();
        Self {
            kind: TdnErrorKind::FileNotFound,
            message: format!("File not found: {}", path_str),
            path: Some(path_str),
            field: None,
        }
    }

    /// Create a file read error
    pub fn file_read_error(path: impl Into<String>, details: impl Into<String>) -> Self {
        let path_str = path.into();
        Self {
            kind: TdnErrorKind::FileReadError,
            message: format!("Failed to read file: {}", details.into()),
            path: Some(path_str),
            field: None,
        }
    }

    /// Create a parse error
    pub fn parse_error(
        path: impl Into<String>,
        field: Option<String>,
        details: impl Into<String>,
    ) -> Self {
        let path_str = path.into();
        Self {
            kind: TdnErrorKind::ParseError,
            message: format!("Failed to parse frontmatter: {}", details.into()),
            path: Some(path_str),
            field,
        }
    }

    /// Create a validation error
    pub fn validation_error(
        path: impl Into<String>,
        field: impl Into<String>,
        details: impl Into<String>,
    ) -> Self {
        let path_str = path.into();
        let field_str = field.into();
        Self {
            kind: TdnErrorKind::ValidationError,
            message: format!(
                "Validation error in field '{}': {}",
                field_str,
                details.into()
            ),
            path: Some(path_str),
            field: Some(field_str),
        }
    }

    /// Create a write error
    pub fn write_error(path: impl Into<String>, details: impl Into<String>) -> Self {
        let path_str = path.into();
        Self {
            kind: TdnErrorKind::WriteError,
            message: format!("Failed to write file: {}", details.into()),
            path: Some(path_str),
            field: None,
        }
    }
}

/// Convert TdnError into a NAPI Error for Result returns
impl From<TdnError> for Error {
    fn from(err: TdnError) -> Self {
        // NAPI requires us to return Error, but we'll serialize TdnError as JSON
        // in the message so TypeScript can parse it back
        let json = serde_json::json!({
            "kind": err.kind,
            "message": err.message,
            "path": err.path,
            "field": err.field,
        });
        Error::new(Status::GenericFailure, json.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_not_found_error() {
        let err = TdnError::file_not_found("/path/to/file.md");
        assert!(matches!(err.kind, TdnErrorKind::FileNotFound));
        assert_eq!(err.path, Some("/path/to/file.md".to_string()));
        assert!(err.message.contains("File not found"));
    }

    #[test]
    fn test_parse_error_with_field() {
        let err = TdnError::parse_error(
            "/path/to/file.md",
            Some("title".to_string()),
            "Missing required field",
        );
        assert!(matches!(err.kind, TdnErrorKind::ParseError));
        assert_eq!(err.field, Some("title".to_string()));
        assert!(err.message.contains("Failed to parse frontmatter"));
    }

    #[test]
    fn test_validation_error() {
        let err = TdnError::validation_error("/path/to/file.md", "status", "Invalid status value");
        assert!(matches!(err.kind, TdnErrorKind::ValidationError));
        assert_eq!(err.field, Some("status".to_string()));
        assert!(err.message.contains("Validation error"));
    }

    #[test]
    fn test_error_to_napi_error() {
        let tdn_err = TdnError::file_not_found("/test.md");
        let napi_err: Error = tdn_err.into();
        let msg = napi_err.to_string();

        // Should contain JSON representation
        assert!(msg.contains("FileNotFound"));
        assert!(msg.contains("/test.md"));
    }
}
