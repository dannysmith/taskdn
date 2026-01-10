//! Shared types and validation functions for the Tauri application.

use regex::Regex;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::sync::LazyLock;

/// Default shortcut for the quick pane
pub const DEFAULT_QUICK_PANE_SHORTCUT: &str = "CommandOrControl+Shift+.";

/// Maximum size for recovery data files (10MB)
pub const MAX_RECOVERY_DATA_BYTES: u32 = 10_485_760;

/// Pre-compiled regex pattern for filename validation.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub static FILENAME_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^[a-zA-Z0-9_-]+(\.[a-zA-Z0-9]+)?$")
        .expect("Failed to compile filename regex pattern")
});

// ============================================================================
// Preferences
// ============================================================================

/// Application preferences that persist to disk.
/// Only contains settings that should be saved between sessions.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(default)]
pub struct AppPreferences {
    pub theme: String,
    /// Global shortcut for quick pane (e.g., "CommandOrControl+Shift+.")
    /// If None, uses the default shortcut
    pub quick_pane_shortcut: Option<String>,
    /// User's preferred language (e.g., "en", "es", "de")
    /// If None, uses system locale detection
    pub language: Option<String>,
    /// Directory containing task files
    pub tasks_dir: Option<String>,
    /// Directory containing area files
    pub areas_dir: Option<String>,
    /// Directory containing project files
    pub projects_dir: Option<String>,
    /// Filenames to ignore when scanning directories
    pub ignore: Option<Vec<String>>,
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            quick_pane_shortcut: None, // None means use default
            language: None,            // None means use system locale
            tasks_dir: None,
            areas_dir: None,
            projects_dir: None,
            ignore: None,
        }
    }
}

// ============================================================================
// Recovery Errors
// ============================================================================

/// Error types for recovery operations (typed for frontend matching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum RecoveryError {
    /// File does not exist (expected case, not a failure)
    FileNotFound,
    /// Filename validation failed
    ValidationError { message: String },
    /// Data exceeds size limit
    DataTooLarge { max_bytes: u32 },
    /// File system read/write error
    IoError { message: String },
    /// JSON serialization/deserialization error
    ParseError { message: String },
}

impl std::fmt::Display for RecoveryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RecoveryError::FileNotFound => write!(f, "File not found"),
            RecoveryError::ValidationError { message } => write!(f, "Validation error: {message}"),
            RecoveryError::DataTooLarge { max_bytes } => {
                write!(f, "Data too large (max {max_bytes} bytes)")
            }
            RecoveryError::IoError { message } => write!(f, "IO error: {message}"),
            RecoveryError::ParseError { message } => write!(f, "Parse error: {message}"),
        }
    }
}

// ============================================================================
// Validation Functions
// ============================================================================

/// Validates a filename for safe file system operations.
/// Only allows alphanumeric characters, dashes, underscores, and a single extension.
pub fn validate_filename(filename: &str) -> Result<(), String> {
    if filename.is_empty() {
        return Err("Filename cannot be empty".to_string());
    }

    if filename.chars().count() > 100 {
        return Err("Filename too long (max 100 characters)".to_string());
    }

    if !FILENAME_PATTERN.is_match(filename) {
        return Err(
            "Invalid filename: only alphanumeric characters, dashes, underscores, and dots allowed"
                .to_string(),
        );
    }

    Ok(())
}

/// Validates string input length (by character count, not bytes).
pub fn validate_string_input(input: &str, max_len: usize, field_name: &str) -> Result<(), String> {
    let char_count = input.chars().count();
    if char_count > max_len {
        return Err(format!("{field_name} too long (max {max_len} characters)"));
    }
    Ok(())
}

/// Validates theme value.
pub fn validate_theme(theme: &str) -> Result<(), String> {
    match theme {
        "light" | "dark" | "system" => Ok(()),
        _ => Err("Invalid theme: must be 'light', 'dark', or 'system'".to_string()),
    }
}

// ============================================================================
// CLI Config Types
// ============================================================================

/// Config read from CLI's ~/.taskdn.json
/// Note: CLI uses camelCase field names (tasksDir, areasDir, projectsDir)
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct CliConfig {
    pub tasks_dir: Option<String>,
    pub areas_dir: Option<String>,
    pub projects_dir: Option<String>,
    pub ignore: Option<Vec<String>>,
}

/// Error types for CLI config operations (typed for frontend matching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum CliConfigError {
    /// Home directory could not be determined
    HomeNotFound,
    /// ~/.taskdn.json does not exist (CLI not configured - not a real error)
    FileNotFound,
    /// Failed to read the file
    ReadError { message: String },
    /// Failed to parse JSON
    ParseError { message: String },
}

impl std::fmt::Display for CliConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CliConfigError::HomeNotFound => write!(f, "Home directory not found"),
            CliConfigError::FileNotFound => write!(f, "CLI config file not found"),
            CliConfigError::ReadError { message } => write!(f, "Read error: {message}"),
            CliConfigError::ParseError { message } => write!(f, "Parse error: {message}"),
        }
    }
}

/// Paths to dummy vault for development testing
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DummyVaultPaths {
    pub tasks_dir: String,
    pub areas_dir: String,
    pub projects_dir: String,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    // ------------------------------------------------------------------------
    // validate_filename tests
    // ------------------------------------------------------------------------

    #[test]
    fn validate_filename_accepts_simple_name() {
        assert!(validate_filename("test").is_ok());
        assert!(validate_filename("myfile").is_ok());
    }

    #[test]
    fn validate_filename_accepts_name_with_extension() {
        assert!(validate_filename("test.json").is_ok());
        assert!(validate_filename("data.txt").is_ok());
        assert!(validate_filename("recovery-2025.json").is_ok());
    }

    #[test]
    fn validate_filename_accepts_dashes_and_underscores() {
        assert!(validate_filename("my-file").is_ok());
        assert!(validate_filename("my_file").is_ok());
        assert!(validate_filename("my-file_name").is_ok());
        assert!(validate_filename("test-123_data").is_ok());
    }

    #[test]
    fn validate_filename_accepts_alphanumeric() {
        assert!(validate_filename("file123").is_ok());
        assert!(validate_filename("123file").is_ok());
        assert!(validate_filename("File123Name").is_ok());
    }

    #[test]
    fn validate_filename_rejects_empty() {
        let result = validate_filename("");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("empty"));
    }

    #[test]
    fn validate_filename_rejects_too_long() {
        let long_name = "a".repeat(101);
        let result = validate_filename(&long_name);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("too long"));
    }

    #[test]
    fn validate_filename_accepts_max_length() {
        let max_name = "a".repeat(100);
        assert!(validate_filename(&max_name).is_ok());
    }

    #[test]
    fn validate_filename_rejects_path_traversal() {
        assert!(validate_filename("../etc/passwd").is_err());
        assert!(validate_filename("..").is_err());
        assert!(validate_filename("./file").is_err());
        assert!(validate_filename("path/to/file").is_err());
    }

    #[test]
    fn validate_filename_rejects_special_chars() {
        assert!(validate_filename("file name").is_err()); // space
        assert!(validate_filename("file:name").is_err()); // colon
        assert!(validate_filename("file*name").is_err()); // asterisk
        assert!(validate_filename("file?name").is_err()); // question mark
        assert!(validate_filename("file<name").is_err()); // angle bracket
        assert!(validate_filename("file>name").is_err()); // angle bracket
        assert!(validate_filename("file|name").is_err()); // pipe
        assert!(validate_filename("file\"name").is_err()); // quote
    }

    #[test]
    fn validate_filename_rejects_multiple_extensions() {
        assert!(validate_filename("file.tar.gz").is_err());
        assert!(validate_filename("test.backup.json").is_err());
    }

    #[test]
    fn validate_filename_rejects_hidden_files() {
        assert!(validate_filename(".hidden").is_err());
        assert!(validate_filename(".gitignore").is_err());
    }

    // ------------------------------------------------------------------------
    // validate_string_input tests
    // ------------------------------------------------------------------------

    #[test]
    fn validate_string_input_accepts_within_limit() {
        assert!(validate_string_input("hello", 10, "field").is_ok());
        assert!(validate_string_input("", 10, "field").is_ok());
    }

    #[test]
    fn validate_string_input_accepts_at_limit() {
        assert!(validate_string_input("12345", 5, "field").is_ok());
        assert!(validate_string_input("hello", 5, "field").is_ok());
    }

    #[test]
    fn validate_string_input_rejects_over_limit() {
        let result = validate_string_input("hello world", 5, "Title");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("Title"));
        assert!(err.contains("too long"));
        assert!(err.contains("5"));
    }

    #[test]
    fn validate_string_input_counts_chars_not_bytes() {
        // Unicode characters should count as 1 character each
        // "café" is 4 characters but 5 bytes (é is 2 bytes)
        assert!(validate_string_input("café", 4, "field").is_ok());
        assert!(validate_string_input("café", 3, "field").is_err());

        // Emoji test - each emoji is 1 character
        assert!(validate_string_input("👍👍👍", 3, "field").is_ok());
        assert!(validate_string_input("👍👍👍", 2, "field").is_err());
    }

    // ------------------------------------------------------------------------
    // validate_theme tests
    // ------------------------------------------------------------------------

    #[test]
    fn validate_theme_accepts_valid_values() {
        assert!(validate_theme("light").is_ok());
        assert!(validate_theme("dark").is_ok());
        assert!(validate_theme("system").is_ok());
    }

    #[test]
    fn validate_theme_rejects_invalid_values() {
        assert!(validate_theme("").is_err());
        assert!(validate_theme("Light").is_err()); // case-sensitive
        assert!(validate_theme("DARK").is_err());
        assert!(validate_theme("auto").is_err());
        assert!(validate_theme("default").is_err());
        assert!(validate_theme("blue").is_err());
    }

    #[test]
    fn validate_theme_error_message_is_helpful() {
        let result = validate_theme("invalid");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("light"));
        assert!(err.contains("dark"));
        assert!(err.contains("system"));
    }

    // ------------------------------------------------------------------------
    // RecoveryError Display tests
    // ------------------------------------------------------------------------

    #[test]
    fn recovery_error_display_file_not_found() {
        let err = RecoveryError::FileNotFound;
        assert_eq!(format!("{err}"), "File not found");
    }

    #[test]
    fn recovery_error_display_validation_error() {
        let err = RecoveryError::ValidationError {
            message: "bad input".to_string(),
        };
        assert_eq!(format!("{err}"), "Validation error: bad input");
    }

    #[test]
    fn recovery_error_display_data_too_large() {
        let err = RecoveryError::DataTooLarge {
            max_bytes: 10_485_760,
        };
        assert!(format!("{err}").contains("10485760"));
    }

    #[test]
    fn recovery_error_display_io_error() {
        let err = RecoveryError::IoError {
            message: "permission denied".to_string(),
        };
        assert!(format!("{err}").contains("permission denied"));
    }

    #[test]
    fn recovery_error_display_parse_error() {
        let err = RecoveryError::ParseError {
            message: "invalid JSON".to_string(),
        };
        assert!(format!("{err}").contains("invalid JSON"));
    }

    // ------------------------------------------------------------------------
    // CliConfigError Display tests
    // ------------------------------------------------------------------------

    #[test]
    fn cli_config_error_display_home_not_found() {
        let err = CliConfigError::HomeNotFound;
        assert!(format!("{err}").contains("Home"));
    }

    #[test]
    fn cli_config_error_display_file_not_found() {
        let err = CliConfigError::FileNotFound;
        assert!(format!("{err}").contains("not found"));
    }

    #[test]
    fn cli_config_error_display_read_error() {
        let err = CliConfigError::ReadError {
            message: "access denied".to_string(),
        };
        assert!(format!("{err}").contains("access denied"));
    }

    #[test]
    fn cli_config_error_display_parse_error() {
        let err = CliConfigError::ParseError {
            message: "unexpected token".to_string(),
        };
        assert!(format!("{err}").contains("unexpected token"));
    }

    // ------------------------------------------------------------------------
    // AppPreferences Default tests
    // ------------------------------------------------------------------------

    #[test]
    fn app_preferences_default_theme() {
        let prefs = AppPreferences::default();
        assert_eq!(prefs.theme, "system");
    }

    #[test]
    fn app_preferences_default_optional_fields_are_none() {
        let prefs = AppPreferences::default();
        assert!(prefs.quick_pane_shortcut.is_none());
        assert!(prefs.language.is_none());
        assert!(prefs.tasks_dir.is_none());
        assert!(prefs.areas_dir.is_none());
        assert!(prefs.projects_dir.is_none());
        assert!(prefs.ignore.is_none());
    }
}
