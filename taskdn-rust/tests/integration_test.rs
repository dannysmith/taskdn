//! Integration tests for the taskdn library.

use std::fs;
use std::path::PathBuf;
use taskdn::{ParsedArea, ParsedProject, ParsedTask, Taskdn, TaskdnConfig};

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

// Parser integration tests using demo vault files

fn demo_vault_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("should have parent")
        .join("demo-vault")
}

#[test]
fn parse_demo_vault_task() {
    let task_path = demo_vault_path().join("tasks/review-quarterly-report.md");
    if !task_path.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let content = fs::read_to_string(&task_path).expect("should read file");
    let task = ParsedTask::parse(&content).expect("should parse task");

    assert_eq!(task.title, "Review quarterly report");
    assert!(task.project.is_some());
    assert!(task.area.is_some());
    assert!(task.due.is_some());
    assert!(task.body.contains("## Notes"));
}

#[test]
fn parse_demo_vault_project() {
    let project_path = demo_vault_path().join("projects/q1-planning-acme.md");
    if !project_path.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let content = fs::read_to_string(&project_path).expect("should read file");
    let project = ParsedProject::parse(&content).expect("should parse project");

    assert_eq!(project.title, "Q1 Planning - Acme Corp");
    assert!(project.unique_id.is_some());
    assert!(project.area.is_some());
    assert!(project.start_date.is_some());
    assert!(project.end_date.is_some());
}

#[test]
fn parse_demo_vault_area() {
    let area_path = demo_vault_path().join("areas/health.md");
    if !area_path.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let content = fs::read_to_string(&area_path).expect("should read file");
    let area = ParsedArea::parse(&content).expect("should parse area");

    assert_eq!(area.title, "Health");
    assert!(area.area_type.is_some());
    assert!(area.status.is_some());
    assert!(area.body.contains("## Goals"));
}

#[test]
fn parse_all_demo_vault_tasks() {
    let tasks_dir = demo_vault_path().join("tasks");
    if !tasks_dir.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let mut count = 0;
    for entry in fs::read_dir(&tasks_dir).expect("should read dir") {
        let entry = entry.expect("should get entry");
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            let content = fs::read_to_string(&path).expect("should read file");
            let result = ParsedTask::parse(&content);
            assert!(
                result.is_ok(),
                "Failed to parse task {:?}: {:?}",
                path,
                result.err()
            );
            count += 1;
        }
    }
    assert!(count > 0, "Should have parsed at least one task");
    eprintln!("Successfully parsed {} task files", count);
}

#[test]
fn parse_all_demo_vault_projects() {
    let projects_dir = demo_vault_path().join("projects");
    if !projects_dir.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let mut count = 0;
    for entry in fs::read_dir(&projects_dir).expect("should read dir") {
        let entry = entry.expect("should get entry");
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            let content = fs::read_to_string(&path).expect("should read file");
            let result = ParsedProject::parse(&content);
            assert!(
                result.is_ok(),
                "Failed to parse project {:?}: {:?}",
                path,
                result.err()
            );
            count += 1;
        }
    }
    assert!(count > 0, "Should have parsed at least one project");
    eprintln!("Successfully parsed {} project files", count);
}

#[test]
fn parse_all_demo_vault_areas() {
    let areas_dir = demo_vault_path().join("areas");
    if !areas_dir.exists() {
        eprintln!("Skipping test: demo-vault not found");
        return;
    }

    let mut count = 0;
    for entry in fs::read_dir(&areas_dir).expect("should read dir") {
        let entry = entry.expect("should get entry");
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            let content = fs::read_to_string(&path).expect("should read file");
            let result = ParsedArea::parse(&content);
            assert!(
                result.is_ok(),
                "Failed to parse area {:?}: {:?}",
                path,
                result.err()
            );
            count += 1;
        }
    }
    assert!(count > 0, "Should have parsed at least one area");
    eprintln!("Successfully parsed {} area files", count);
}
