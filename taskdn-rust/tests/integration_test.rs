//! Integration tests for the taskdn library.

use std::path::PathBuf;
use taskdn::{Taskdn, TaskdnConfig};

#[test]
fn sdk_initialization_with_valid_dirs() {
    // Use the dummy-demo-vault for testing
    let vault_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("should have parent")
        .join("dummy-demo-vault");

    // Skip test if dummy vault doesn't exist (hasn't been created yet)
    if !vault_path.exists() {
        eprintln!(
            "Skipping test: dummy-demo-vault not found at {:?}",
            vault_path
        );
        return;
    }

    let config = TaskdnConfig::new(
        vault_path.join("tasks"),
        vault_path.join("projects"),
        vault_path.join("areas"),
    );

    let result = Taskdn::new(config);
    assert!(
        result.is_ok(),
        "SDK should initialize with valid directories"
    );
}

#[test]
fn sdk_initialization_fails_with_invalid_dirs() {
    let config = TaskdnConfig::new(
        PathBuf::from("/definitely/not/a/real/path/tasks"),
        PathBuf::from("/definitely/not/a/real/path/projects"),
        PathBuf::from("/definitely/not/a/real/path/areas"),
    );

    let result = Taskdn::new(config);
    assert!(
        result.is_err(),
        "SDK should fail with nonexistent directories"
    );
}
