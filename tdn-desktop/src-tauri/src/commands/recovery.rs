//! Emergency data recovery commands.
//!
//! Provides a simple pattern for saving JSON data to disk for crash recovery
//! or session persistence.

use serde_json::Value;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

use crate::types::{validate_filename, RecoveryError, MAX_RECOVERY_DATA_BYTES};

/// Number of days to retain recovery files before cleanup.
const RECOVERY_FILE_RETENTION_DAYS: u64 = 7;

/// Gets the path to the recovery directory, creating it if necessary.
fn get_recovery_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    let recovery_dir = app_data_dir.join("recovery");

    // Ensure the recovery directory exists
    std::fs::create_dir_all(&recovery_dir)
        .map_err(|e| format!("Failed to create recovery directory: {e}"))?;

    Ok(recovery_dir)
}

/// Saves emergency data to a JSON file for later recovery.
/// Validates filename and enforces a 10MB size limit.
#[tauri::command]
#[specta::specta]
pub async fn save_emergency_data(
    app: AppHandle,
    filename: String,
    data: Value,
) -> Result<(), RecoveryError> {
    log::info!("Saving emergency data to file: {filename}");

    // Validate filename with proper security checks
    validate_filename(&filename).map_err(|e| RecoveryError::ValidationError { message: e })?;

    // Serialize to pretty JSON once for both size validation and writing
    let json_content = serde_json::to_string_pretty(&data).map_err(|e| {
        log::error!("Failed to serialize emergency data: {e}");
        RecoveryError::ParseError {
            message: e.to_string(),
        }
    })?;

    // Validate size (10MB limit) on the actual content that will be written
    if json_content.len() > MAX_RECOVERY_DATA_BYTES as usize {
        return Err(RecoveryError::DataTooLarge {
            max_bytes: MAX_RECOVERY_DATA_BYTES,
        });
    }

    let recovery_dir = get_recovery_dir(&app).map_err(|e| RecoveryError::IoError { message: e })?;
    let file_path = recovery_dir.join(format!("{filename}.json"));

    // Write to a temporary file first, then rename (atomic operation)
    let temp_path = file_path.with_extension("tmp");

    std::fs::write(&temp_path, json_content).map_err(|e| {
        log::error!("Failed to write emergency data file: {e}");
        RecoveryError::IoError {
            message: e.to_string(),
        }
    })?;

    if let Err(rename_err) = std::fs::rename(&temp_path, &file_path) {
        log::error!("Failed to finalize emergency data file: {rename_err}");
        // Clean up the temp file to avoid leaving orphaned files on disk
        if let Err(remove_err) = std::fs::remove_file(&temp_path) {
            log::warn!("Failed to remove temp file after rename failure: {remove_err}");
        }
        return Err(RecoveryError::IoError {
            message: rename_err.to_string(),
        });
    }

    log::info!("Successfully saved emergency data to {file_path:?}");
    Ok(())
}

/// Loads emergency data from a previously saved JSON file.
/// Returns FileNotFound if the file doesn't exist.
#[tauri::command]
#[specta::specta]
pub async fn load_emergency_data(app: AppHandle, filename: String) -> Result<Value, RecoveryError> {
    log::info!("Loading emergency data from file: {filename}");

    // Validate filename with proper security checks
    validate_filename(&filename).map_err(|e| RecoveryError::ValidationError { message: e })?;

    let recovery_dir = get_recovery_dir(&app).map_err(|e| RecoveryError::IoError { message: e })?;
    let file_path = recovery_dir.join(format!("{filename}.json"));

    if !file_path.exists() {
        log::info!("Recovery file not found: {file_path:?}");
        return Err(RecoveryError::FileNotFound);
    }

    let contents = std::fs::read_to_string(&file_path).map_err(|e| {
        log::error!("Failed to read recovery file: {e}");
        RecoveryError::IoError {
            message: e.to_string(),
        }
    })?;

    let data: Value = serde_json::from_str(&contents).map_err(|e| {
        log::error!("Failed to parse recovery JSON: {e}");
        RecoveryError::ParseError {
            message: e.to_string(),
        }
    })?;

    log::info!("Successfully loaded emergency data");
    Ok(data)
}

/// Checks if a file is older than the specified number of days.
/// Returns `None` if the file age cannot be determined (e.g., metadata error).
fn is_file_older_than_days(path: &Path, days: u64) -> Option<bool> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    let modified_secs = modified.duration_since(UNIX_EPOCH).ok()?.as_secs();

    let now_secs = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    let cutoff_secs = now_secs.saturating_sub(days * 24 * 60 * 60);

    Some(modified_secs < cutoff_secs)
}

/// Removes recovery files older than the retention period.
/// Returns the count of removed files.
#[tauri::command]
#[specta::specta]
pub async fn cleanup_old_recovery_files(app: AppHandle) -> Result<u32, RecoveryError> {
    log::info!("Cleaning up old recovery files");

    let recovery_dir = get_recovery_dir(&app).map_err(|e| RecoveryError::IoError { message: e })?;

    let entries = std::fs::read_dir(&recovery_dir).map_err(|e| {
        log::error!("Failed to read recovery directory: {e}");
        RecoveryError::IoError {
            message: e.to_string(),
        }
    })?;

    let mut removed_count = 0;

    for entry in entries.flatten() {
        let path = entry.path();

        // Only process JSON files
        if path.extension().is_none_or(|ext| ext != "json") {
            continue;
        }

        // Check if file is older than retention period
        if is_file_older_than_days(&path, RECOVERY_FILE_RETENTION_DAYS) == Some(true) {
            match std::fs::remove_file(&path) {
                Ok(_) => {
                    log::info!("Removed old recovery file: {path:?}");
                    removed_count += 1;
                }
                Err(e) => {
                    log::warn!("Failed to remove old recovery file: {e}");
                }
            }
        }
    }

    log::info!("Cleanup complete. Removed {removed_count} old recovery files");
    Ok(removed_count)
}

// =============================================================================
// Testable Core Functions (test-only)
// =============================================================================

/// Save emergency data to the specified path with size validation.
#[cfg(test)]
fn save_emergency_data_to_path(path: &Path, data: &Value) -> Result<(), RecoveryError> {
    // Serialize to pretty JSON once for both size validation and writing
    let json_content =
        serde_json::to_string_pretty(data).map_err(|e| RecoveryError::ParseError {
            message: e.to_string(),
        })?;

    // Validate size (10MB limit)
    if json_content.len() > MAX_RECOVERY_DATA_BYTES as usize {
        return Err(RecoveryError::DataTooLarge {
            max_bytes: MAX_RECOVERY_DATA_BYTES,
        });
    }

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| RecoveryError::IoError {
            message: e.to_string(),
        })?;
    }

    // Write to a temporary file first, then rename (atomic operation)
    let temp_path = path.with_extension("tmp");

    std::fs::write(&temp_path, json_content).map_err(|e| RecoveryError::IoError {
        message: e.to_string(),
    })?;

    if let Err(rename_err) = std::fs::rename(&temp_path, path) {
        // Clean up the temp file
        let _ = std::fs::remove_file(&temp_path);
        return Err(RecoveryError::IoError {
            message: rename_err.to_string(),
        });
    }

    Ok(())
}

/// Load emergency data from the specified path.
#[cfg(test)]
fn load_emergency_data_from_path(path: &Path) -> Result<Value, RecoveryError> {
    if !path.exists() {
        return Err(RecoveryError::FileNotFound);
    }

    let contents = std::fs::read_to_string(path).map_err(|e| RecoveryError::IoError {
        message: e.to_string(),
    })?;

    serde_json::from_str(&contents).map_err(|e| RecoveryError::ParseError {
        message: e.to_string(),
    })
}

/// Clean up old recovery files in the specified directory.
#[cfg(test)]
fn cleanup_old_files_in_dir(dir: &Path, retention_days: u64) -> Result<u32, RecoveryError> {
    let entries = std::fs::read_dir(dir).map_err(|e| RecoveryError::IoError {
        message: e.to_string(),
    })?;

    let mut removed_count = 0;

    for entry in entries.flatten() {
        let path = entry.path();

        // Only process JSON files
        if path.extension().is_none_or(|ext| ext != "json") {
            continue;
        }

        // Check if file is older than retention period and remove it
        if is_file_older_than_days(&path, retention_days) == Some(true)
            && std::fs::remove_file(&path).is_ok()
        {
            removed_count += 1;
        }
    }

    Ok(removed_count)
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use tempfile::TempDir;

    /// Create a temp directory for testing
    fn create_test_dir() -> TempDir {
        TempDir::new().expect("Failed to create temp dir")
    }

    // -------------------------------------------------------------------------
    // is_file_older_than_days Tests
    // -------------------------------------------------------------------------

    #[test]
    fn is_file_older_than_days_returns_none_for_nonexistent() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("nonexistent.json");

        let result = is_file_older_than_days(&path, 7);
        assert!(result.is_none());
    }

    #[test]
    fn is_file_older_than_days_returns_false_for_new_file() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("new.json");
        std::fs::write(&path, "{}").expect("write failed");

        let result = is_file_older_than_days(&path, 7);
        assert_eq!(result, Some(false));
    }

    // -------------------------------------------------------------------------
    // save_emergency_data_to_path Tests
    // -------------------------------------------------------------------------

    #[test]
    fn save_emergency_data_creates_file() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let data = json!({"key": "value"});
        save_emergency_data_to_path(&path, &data).expect("save failed");

        assert!(path.exists());
    }

    #[test]
    fn save_emergency_data_writes_valid_json() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let data = json!({
            "tasks": [{"id": "1", "title": "Test"}],
            "timestamp": 1234567890
        });
        save_emergency_data_to_path(&path, &data).expect("save failed");

        let content = std::fs::read_to_string(&path).expect("read failed");
        let parsed: Value = serde_json::from_str(&content).expect("parse failed");
        assert_eq!(parsed["tasks"][0]["title"], "Test");
        assert_eq!(parsed["timestamp"], 1234567890);
    }

    #[test]
    fn save_emergency_data_rejects_too_large() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        // Create data larger than 10MB
        let large_string = "x".repeat(11_000_000);
        let data = json!({"data": large_string});

        let result = save_emergency_data_to_path(&path, &data);

        assert!(matches!(result, Err(RecoveryError::DataTooLarge { .. })));
        // File should not be created
        assert!(!path.exists());
    }

    #[test]
    fn save_emergency_data_creates_parent_directories() {
        let temp_dir = create_test_dir();
        let path = temp_dir
            .path()
            .join("nested")
            .join("dir")
            .join("recovery.json");

        let data = json!({"test": true});
        save_emergency_data_to_path(&path, &data).expect("save failed");

        assert!(path.exists());
    }

    #[test]
    fn save_emergency_data_overwrites_existing() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        // Save initial
        let data1 = json!({"version": 1});
        save_emergency_data_to_path(&path, &data1).expect("save failed");

        // Overwrite
        let data2 = json!({"version": 2});
        save_emergency_data_to_path(&path, &data2).expect("save failed");

        let content = std::fs::read_to_string(&path).expect("read failed");
        let parsed: Value = serde_json::from_str(&content).expect("parse failed");
        assert_eq!(parsed["version"], 2);
    }

    #[test]
    fn save_emergency_data_atomic_no_temp_file_left() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");
        let temp_path = temp_dir.path().join("recovery.tmp");

        let data = json!({"test": true});
        save_emergency_data_to_path(&path, &data).expect("save failed");

        // Temp file should be renamed, not left behind
        assert!(!temp_path.exists());
        assert!(path.exists());
    }

    // -------------------------------------------------------------------------
    // load_emergency_data_from_path Tests
    // -------------------------------------------------------------------------

    #[test]
    fn load_emergency_data_returns_file_not_found() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("nonexistent.json");

        let result = load_emergency_data_from_path(&path);

        assert!(matches!(result, Err(RecoveryError::FileNotFound)));
    }

    #[test]
    fn load_emergency_data_reads_valid_json() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let json = r#"{"tasks": [{"id": "123"}], "count": 42}"#;
        std::fs::write(&path, json).expect("write failed");

        let data = load_emergency_data_from_path(&path).expect("load failed");

        assert_eq!(data["tasks"][0]["id"], "123");
        assert_eq!(data["count"], 42);
    }

    #[test]
    fn load_emergency_data_fails_on_invalid_json() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        std::fs::write(&path, "not valid json {{{").expect("write failed");

        let result = load_emergency_data_from_path(&path);

        assert!(matches!(result, Err(RecoveryError::ParseError { .. })));
    }

    #[test]
    fn load_emergency_data_handles_complex_json() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let json = r#"{
            "tasks": [
                {"id": "1", "title": "Task 1", "status": "inbox"},
                {"id": "2", "title": "Task 2", "status": "done"}
            ],
            "projects": [],
            "metadata": {
                "version": "1.0",
                "timestamp": 1705000000
            }
        }"#;
        std::fs::write(&path, json).expect("write failed");

        let data = load_emergency_data_from_path(&path).expect("load failed");

        assert_eq!(data["tasks"].as_array().unwrap().len(), 2);
        assert_eq!(data["metadata"]["version"], "1.0");
    }

    // -------------------------------------------------------------------------
    // Round-trip Tests
    // -------------------------------------------------------------------------

    #[test]
    fn save_load_roundtrip_preserves_data() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let original = json!({
            "tasks": [
                {"id": "task-1", "title": "First Task", "status": "ready"},
                {"id": "task-2", "title": "Second Task", "status": "inbox"}
            ],
            "timestamp": 1705123456,
            "app_version": "1.2.3"
        });

        save_emergency_data_to_path(&path, &original).expect("save failed");
        let loaded = load_emergency_data_from_path(&path).expect("load failed");

        assert_eq!(loaded, original);
    }

    #[test]
    fn save_load_roundtrip_with_unicode() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let original = json!({
            "tasks": [{"title": "日本語タスク"}, {"title": "Tâche française"}]
        });

        save_emergency_data_to_path(&path, &original).expect("save failed");
        let loaded = load_emergency_data_from_path(&path).expect("load failed");

        assert_eq!(loaded["tasks"][0]["title"], "日本語タスク");
        assert_eq!(loaded["tasks"][1]["title"], "Tâche française");
    }

    #[test]
    fn save_load_roundtrip_with_empty_object() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        let original = json!({});

        save_emergency_data_to_path(&path, &original).expect("save failed");
        let loaded = load_emergency_data_from_path(&path).expect("load failed");

        assert!(loaded.as_object().unwrap().is_empty());
    }

    // -------------------------------------------------------------------------
    // cleanup_old_files_in_dir Tests
    // -------------------------------------------------------------------------

    #[test]
    fn cleanup_returns_zero_for_empty_dir() {
        let temp_dir = create_test_dir();

        let count = cleanup_old_files_in_dir(temp_dir.path(), 7).expect("cleanup failed");

        assert_eq!(count, 0);
    }

    #[test]
    fn cleanup_ignores_non_json_files() {
        let temp_dir = create_test_dir();

        // Create non-JSON files
        std::fs::write(temp_dir.path().join("file.txt"), "text").expect("write failed");
        std::fs::write(temp_dir.path().join("file.bak"), "backup").expect("write failed");

        let count = cleanup_old_files_in_dir(temp_dir.path(), 0).expect("cleanup failed");

        // Even with 0 retention days, non-JSON files should be ignored
        assert_eq!(count, 0);
        assert!(temp_dir.path().join("file.txt").exists());
        assert!(temp_dir.path().join("file.bak").exists());
    }

    #[test]
    fn cleanup_keeps_recent_files() {
        let temp_dir = create_test_dir();

        // Create a recent JSON file
        let path = temp_dir.path().join("recent.json");
        std::fs::write(&path, "{}").expect("write failed");

        let count = cleanup_old_files_in_dir(temp_dir.path(), 7).expect("cleanup failed");

        assert_eq!(count, 0);
        assert!(path.exists());
    }

    #[test]
    fn cleanup_fails_on_nonexistent_dir() {
        let temp_dir = create_test_dir();
        let nonexistent = temp_dir.path().join("does_not_exist");

        let result = cleanup_old_files_in_dir(&nonexistent, 7);

        assert!(matches!(result, Err(RecoveryError::IoError { .. })));
    }

    // -------------------------------------------------------------------------
    // validate_filename Integration Tests
    // -------------------------------------------------------------------------

    #[test]
    fn validate_filename_works_for_recovery_files() {
        // Valid recovery filenames
        assert!(validate_filename("session-backup").is_ok());
        assert!(validate_filename("recovery-2025-01-15").is_ok());
        assert!(validate_filename("emergency_data").is_ok());
    }

    #[test]
    fn validate_filename_rejects_path_traversal() {
        // Should reject any path traversal attempts
        assert!(validate_filename("../etc/passwd").is_err());
        assert!(validate_filename("..").is_err());
        assert!(validate_filename("path/to/file").is_err());
    }

    #[test]
    fn validate_filename_rejects_empty() {
        assert!(validate_filename("").is_err());
    }

    #[test]
    fn validate_filename_rejects_too_long() {
        let long_name = "a".repeat(101);
        assert!(validate_filename(&long_name).is_err());
    }

    // -------------------------------------------------------------------------
    // Size Limit Tests
    // -------------------------------------------------------------------------

    #[test]
    fn max_recovery_data_bytes_is_10mb() {
        assert_eq!(MAX_RECOVERY_DATA_BYTES, 10_485_760);
    }

    #[test]
    fn save_accepts_data_just_under_limit() {
        let temp_dir = create_test_dir();
        let path = temp_dir.path().join("recovery.json");

        // Create data that serializes to just under 10MB
        // Account for JSON formatting overhead (~100 bytes for structure)
        let target_size = 9_000_000; // Well under limit to avoid flakiness
        let data = json!({"data": "x".repeat(target_size)});

        let result = save_emergency_data_to_path(&path, &data);
        assert!(result.is_ok());
    }

    // -------------------------------------------------------------------------
    // Error Type Tests
    // -------------------------------------------------------------------------

    #[test]
    fn file_not_found_error_is_expected_case() {
        // FileNotFound is an expected case, not a failure
        // It indicates no recovery data exists, which is normal
        let err = RecoveryError::FileNotFound;
        let display = format!("{err}");
        assert!(display.contains("not found"));
    }

    #[test]
    fn data_too_large_error_includes_limit() {
        let err = RecoveryError::DataTooLarge {
            max_bytes: MAX_RECOVERY_DATA_BYTES,
        };
        let display = format!("{err}");
        assert!(display.contains("10485760"));
    }
}
