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
