//! Preferences management commands.
//!
//! Handles loading and saving user preferences to disk.

use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::types::{validate_string_input, validate_theme, AppPreferences};

/// Gets the path to the preferences file.
fn get_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    Ok(app_data_dir.join("preferences.json"))
}

/// Load the saved quick pane shortcut from preferences, returning None on any failure.
/// Used at startup before the full preferences system is available.
pub fn load_quick_pane_shortcut(app: &AppHandle) -> Option<String> {
    load_preferences_sync(app)
        .ok()
        .and_then(|p| p.quick_pane_shortcut)
}

/// Vault directory configuration from preferences.
pub struct VaultDirs {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
    pub ignore: Option<Vec<String>>,
}

/// Load vault directories from preferences, returning None if not all paths are configured.
/// Used at startup to auto-initialize the vault.
pub fn load_vault_dirs(app: &AppHandle) -> Option<VaultDirs> {
    let prefs = load_preferences_sync(app).ok()?;

    // All three directories must be configured
    let tasks_dir = prefs.tasks_dir?;
    let projects_dir = prefs.projects_dir?;
    let areas_dir = prefs.areas_dir?;

    Some(VaultDirs {
        tasks_dir,
        projects_dir,
        areas_dir,
        ignore: prefs.ignore,
    })
}

/// Synchronously load preferences from disk.
/// Used at startup before async runtime is fully available.
fn load_preferences_sync(app: &AppHandle) -> Result<AppPreferences, ()> {
    let path = get_preferences_path(app).map_err(|_| ())?;
    if !path.exists() {
        return Err(());
    }
    let contents = std::fs::read_to_string(&path)
        .inspect_err(|e| log::warn!("Failed to read preferences: {e}"))
        .map_err(|_| ())?;
    serde_json::from_str(&contents)
        .inspect_err(|e| log::warn!("Failed to parse preferences: {e}"))
        .map_err(|_| ())
}

/// Simple greeting command for demonstration purposes.
#[tauri::command]
#[specta::specta]
pub fn greet(name: &str) -> Result<String, String> {
    // Input validation
    validate_string_input(name, 100, "Name").map_err(|e| {
        log::warn!("Invalid greet input: {e}");
        e
    })?;

    log::info!("Greeting user: {name}");
    Ok(format!("Hello, {name}! You've been greeted from Rust!"))
}

/// Loads user preferences from disk.
/// Returns default preferences if the file doesn't exist.
#[tauri::command]
#[specta::specta]
pub async fn load_preferences(app: AppHandle) -> Result<AppPreferences, String> {
    log::debug!("Loading preferences from disk");
    let prefs_path = get_preferences_path(&app)?;

    if !prefs_path.exists() {
        log::info!("Preferences file not found, using defaults");
        return Ok(AppPreferences::default());
    }

    let contents = std::fs::read_to_string(&prefs_path).map_err(|e| {
        log::error!("Failed to read preferences file: {e}");
        format!("Failed to read preferences file: {e}")
    })?;

    let preferences: AppPreferences = serde_json::from_str(&contents).map_err(|e| {
        log::error!("Failed to parse preferences JSON: {e}");
        format!("Failed to parse preferences: {e}")
    })?;

    log::info!("Successfully loaded preferences");
    Ok(preferences)
}

/// Saves user preferences to disk.
/// Uses atomic write (temp file + rename) to prevent corruption.
#[tauri::command]
#[specta::specta]
pub async fn save_preferences(app: AppHandle, preferences: AppPreferences) -> Result<(), String> {
    // Validate theme value
    validate_theme(&preferences.theme)?;

    log::debug!("Saving preferences to disk: {preferences:?}");
    let prefs_path = get_preferences_path(&app)?;

    let json_content = serde_json::to_string_pretty(&preferences).map_err(|e| {
        log::error!("Failed to serialize preferences: {e}");
        format!("Failed to serialize preferences: {e}")
    })?;

    // Write to a temporary file first, then rename (atomic operation)
    let temp_path = prefs_path.with_extension("tmp");

    std::fs::write(&temp_path, json_content).map_err(|e| {
        log::error!("Failed to write preferences file: {e}");
        format!("Failed to write preferences file: {e}")
    })?;

    if let Err(rename_err) = std::fs::rename(&temp_path, &prefs_path) {
        log::error!("Failed to finalize preferences file: {rename_err}");
        // Clean up the temp file to avoid leaving orphaned files on disk
        if let Err(remove_err) = std::fs::remove_file(&temp_path) {
            log::warn!("Failed to remove temp file after rename failure: {remove_err}");
        }
        return Err(format!("Failed to finalize preferences file: {rename_err}"));
    }

    log::info!("Successfully saved preferences to {prefs_path:?}");
    Ok(())
}
