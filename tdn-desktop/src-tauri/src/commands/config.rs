//! Configuration-related commands for reading CLI config and app info.

use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::types::{CliConfig, CliConfigError, DummyVaultPaths};

/// Read CLI config from ~/.taskdn.json
#[tauri::command]
#[specta::specta]
pub async fn read_cli_config() -> Result<CliConfig, CliConfigError> {
    let home = dirs::home_dir().ok_or(CliConfigError::HomeNotFound)?;
    let config_path = home.join(".taskdn.json");

    if !config_path.exists() {
        return Err(CliConfigError::FileNotFound);
    }

    let contents =
        std::fs::read_to_string(&config_path).map_err(|e| CliConfigError::ReadError {
            message: e.to_string(),
        })?;

    serde_json::from_str(&contents).map_err(|e| CliConfigError::ParseError {
        message: e.to_string(),
    })
}

/// Get the app's data directory path
#[tauri::command]
#[specta::specta]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Open the app's data directory in the system file manager
#[tauri::command]
#[specta::specta]
pub fn open_app_data_dir(app: AppHandle) -> Result<(), String> {
    let path = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // Ensure directory exists
    if !path.exists() {
        std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    }

    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Check if running in development mode
#[tauri::command]
#[specta::specta]
pub fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}

/// Get dummy vault paths for development testing (only in debug builds)
#[cfg(debug_assertions)]
#[tauri::command]
#[specta::specta]
pub fn get_dummy_vault_paths() -> DummyVaultPaths {
    // CARGO_MANIFEST_DIR is src-tauri/, navigate to repo root
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let repo_root = std::path::Path::new(manifest_dir)
        .parent() // tdn-desktop/
        .and_then(|p| p.parent()) // taskdn/ (repo root)
        .expect("Failed to find repo root");

    let vault = repo_root.join("dummy-demo-vault");

    DummyVaultPaths {
        tasks_dir: vault.join("tasks").to_string_lossy().to_string(),
        areas_dir: vault.join("areas").to_string_lossy().to_string(),
        projects_dir: vault.join("projects").to_string_lossy().to_string(),
    }
}

#[cfg(not(debug_assertions))]
#[tauri::command]
#[specta::specta]
pub fn get_dummy_vault_paths() -> DummyVaultPaths {
    // In release builds, return empty paths (command shouldn't be called)
    DummyVaultPaths {
        tasks_dir: String::new(),
        areas_dir: String::new(),
        projects_dir: String::new(),
    }
}

// =============================================================================
// Testable Core Functions (test-only)
// =============================================================================

/// Read CLI config from a specific path.
#[cfg(test)]
fn read_cli_config_from_path(path: &std::path::Path) -> Result<CliConfig, CliConfigError> {
    if !path.exists() {
        return Err(CliConfigError::FileNotFound);
    }

    let contents = std::fs::read_to_string(path).map_err(|e| CliConfigError::ReadError {
        message: e.to_string(),
    })?;

    serde_json::from_str(&contents).map_err(|e| CliConfigError::ParseError {
        message: e.to_string(),
    })
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    /// Create a temp directory for testing
    fn create_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp dir")
    }

    // -------------------------------------------------------------------------
    // read_cli_config_from_path Tests
    // -------------------------------------------------------------------------

    #[test]
    fn read_cli_config_file_not_found() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        let result = read_cli_config_from_path(&path);

        assert!(matches!(result, Err(CliConfigError::FileNotFound)));
    }

    #[test]
    fn read_cli_config_parses_valid_file() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        let json = r#"{
            "tasksDir": "/path/to/tasks",
            "areasDir": "/path/to/areas",
            "projectsDir": "/path/to/projects"
        }"#;
        std::fs::write(&path, json).expect("write failed");

        let config = read_cli_config_from_path(&path).expect("parse failed");

        assert_eq!(config.tasks_dir, Some("/path/to/tasks".to_string()));
        assert_eq!(config.areas_dir, Some("/path/to/areas".to_string()));
        assert_eq!(config.projects_dir, Some("/path/to/projects".to_string()));
    }

    #[test]
    fn read_cli_config_parses_with_ignore() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        let json = r#"{
            "tasksDir": "/tasks",
            "areasDir": "/areas",
            "projectsDir": "/projects",
            "ignore": ["*.tmp", ".DS_Store", "archive/*"]
        }"#;
        std::fs::write(&path, json).expect("write failed");

        let config = read_cli_config_from_path(&path).expect("parse failed");

        assert_eq!(
            config.ignore,
            Some(vec![
                "*.tmp".to_string(),
                ".DS_Store".to_string(),
                "archive/*".to_string()
            ])
        );
    }

    #[test]
    fn read_cli_config_handles_partial_config() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        // Only tasks_dir specified
        let json = r#"{"tasksDir": "/only/tasks"}"#;
        std::fs::write(&path, json).expect("write failed");

        let config = read_cli_config_from_path(&path).expect("parse failed");

        assert_eq!(config.tasks_dir, Some("/only/tasks".to_string()));
        assert!(config.areas_dir.is_none());
        assert!(config.projects_dir.is_none());
        assert!(config.ignore.is_none());
    }

    #[test]
    fn read_cli_config_handles_empty_object() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        std::fs::write(&path, "{}").expect("write failed");

        let config = read_cli_config_from_path(&path).expect("parse failed");

        assert!(config.tasks_dir.is_none());
        assert!(config.areas_dir.is_none());
        assert!(config.projects_dir.is_none());
        assert!(config.ignore.is_none());
    }

    #[test]
    fn read_cli_config_fails_on_invalid_json() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        std::fs::write(&path, "not valid json {{{").expect("write failed");

        let result = read_cli_config_from_path(&path);

        assert!(matches!(result, Err(CliConfigError::ParseError { .. })));
    }

    #[test]
    fn read_cli_config_ignores_unknown_fields() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join(".taskdn.json");

        // Config with extra unknown fields
        let json = r#"{
            "tasksDir": "/tasks",
            "unknownField": "value",
            "anotherUnknown": 123
        }"#;
        std::fs::write(&path, json).expect("write failed");

        let config = read_cli_config_from_path(&path).expect("parse failed");

        assert_eq!(config.tasks_dir, Some("/tasks".to_string()));
    }

    // -------------------------------------------------------------------------
    // is_dev_mode Tests
    // -------------------------------------------------------------------------

    #[test]
    fn is_dev_mode_returns_true_in_tests() {
        // Tests run with debug_assertions enabled
        assert!(is_dev_mode());
    }

    // -------------------------------------------------------------------------
    // get_dummy_vault_paths Tests
    // -------------------------------------------------------------------------

    #[test]
    fn get_dummy_vault_paths_returns_valid_paths() {
        let paths = get_dummy_vault_paths();

        // Paths should not be empty (in debug mode)
        assert!(!paths.tasks_dir.is_empty());
        assert!(!paths.areas_dir.is_empty());
        assert!(!paths.projects_dir.is_empty());

        // Paths should contain expected directory names
        assert!(paths.tasks_dir.contains("tasks"));
        assert!(paths.areas_dir.contains("areas"));
        assert!(paths.projects_dir.contains("projects"));
    }

    #[test]
    fn get_dummy_vault_paths_points_to_dummy_vault() {
        let paths = get_dummy_vault_paths();

        // All paths should be under dummy-demo-vault
        assert!(paths.tasks_dir.contains("dummy-demo-vault"));
        assert!(paths.areas_dir.contains("dummy-demo-vault"));
        assert!(paths.projects_dir.contains("dummy-demo-vault"));
    }

    // -------------------------------------------------------------------------
    // CliConfigError Display Tests
    // -------------------------------------------------------------------------

    #[test]
    fn cli_config_error_display() {
        let home_err = CliConfigError::HomeNotFound;
        assert!(format!("{home_err}").contains("Home"));

        let file_err = CliConfigError::FileNotFound;
        assert!(format!("{file_err}").contains("not found"));

        let read_err = CliConfigError::ReadError {
            message: "permission denied".to_string(),
        };
        assert!(format!("{read_err}").contains("permission denied"));

        let parse_err = CliConfigError::ParseError {
            message: "unexpected token".to_string(),
        };
        assert!(format!("{parse_err}").contains("unexpected token"));
    }

    // -------------------------------------------------------------------------
    // CliConfig Default Tests
    // -------------------------------------------------------------------------

    #[test]
    fn cli_config_default_all_none() {
        let config = CliConfig::default();

        assert!(config.tasks_dir.is_none());
        assert!(config.areas_dir.is_none());
        assert!(config.projects_dir.is_none());
        assert!(config.ignore.is_none());
    }
}
