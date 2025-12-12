//! Integration tests for the taskdn library.

use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use taskdn::{
    NewArea, NewProject, NewTask, ParsedArea, ParsedProject, ParsedTask, TaskFilter, TaskStatus,
    Taskdn, TaskdnConfig,
};
use tempfile::TempDir;

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

// =============================================================================
// SDK Workflow Integration Tests
// =============================================================================

fn setup_test_sdk() -> (TempDir, Taskdn) {
    let temp = TempDir::new().unwrap();
    let tasks_dir = temp.path().join("tasks");
    let projects_dir = temp.path().join("projects");
    let areas_dir = temp.path().join("areas");

    fs::create_dir_all(&tasks_dir).unwrap();
    fs::create_dir_all(&projects_dir).unwrap();
    fs::create_dir_all(&areas_dir).unwrap();

    let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
    let sdk = Taskdn::new(config).unwrap();

    (temp, sdk)
}

#[test]
fn full_workflow_create_update_query_archive() {
    let (_temp, sdk) = setup_test_sdk();

    // 1. Create a task
    let task_path = sdk.create_task(NewTask::new("Test Task")).unwrap();
    assert!(task_path.exists());

    // 2. Verify initial state
    let task = sdk.get_task(&task_path).unwrap();
    assert_eq!(task.title, "Test Task");
    assert_eq!(task.status, TaskStatus::Inbox);

    // 3. Update status to Ready
    sdk.start_task(&task_path).unwrap();
    let task = sdk.get_task(&task_path).unwrap();
    assert_eq!(task.status, TaskStatus::InProgress);

    // 4. Query to find it
    let tasks = sdk
        .list_tasks(&TaskFilter::new().with_status(TaskStatus::InProgress))
        .unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0].title, "Test Task");

    // 5. Complete the task
    sdk.complete_task(&task_path).unwrap();
    let task = sdk.get_task(&task_path).unwrap();
    assert_eq!(task.status, TaskStatus::Done);
    assert!(task.completed_at.is_some());

    // 6. Archive the task
    let archived_path = sdk.archive_task(&task_path).unwrap();
    assert!(archived_path.exists());
    assert!(!task_path.exists());
    assert!(archived_path.to_string_lossy().contains("archive"));

    // 7. Verify it's excluded from default query
    let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
    assert!(tasks.is_empty());

    // 8. But included when requesting archive
    let tasks = sdk
        .list_tasks(&TaskFilter::new().include_archive_dir())
        .unwrap();
    assert_eq!(tasks.len(), 1);

    // 9. Unarchive and verify
    let restored_path = sdk.unarchive_task(&archived_path).unwrap();
    assert!(restored_path.exists());
    assert!(!archived_path.exists());
}

#[test]
fn batch_operations_with_many_tasks() {
    let (_temp, sdk) = setup_test_sdk();

    // Create 50 tasks
    let mut paths = Vec::new();
    for i in 0..50 {
        let path = sdk
            .create_task(NewTask::new(format!("Task {i}")).with_filename(format!("task-{i}.md")))
            .unwrap();
        paths.push(path);
    }

    // List all tasks
    let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
    assert_eq!(tasks.len(), 50);

    // Count tasks
    let count = sdk.count_tasks(&TaskFilter::new()).unwrap();
    assert_eq!(count, 50);

    // Filter by status (all should be inbox)
    let inbox = sdk
        .list_tasks(&TaskFilter::new().with_status(TaskStatus::Inbox))
        .unwrap();
    assert_eq!(inbox.len(), 50);

    // Batch update some tasks to ready
    for path in &paths[0..10] {
        sdk.start_task(path).unwrap();
    }

    // Verify counts after update
    let in_progress = sdk
        .list_tasks(&TaskFilter::new().with_status(TaskStatus::InProgress))
        .unwrap();
    assert_eq!(in_progress.len(), 10);

    let inbox = sdk
        .list_tasks(&TaskFilter::new().with_status(TaskStatus::Inbox))
        .unwrap();
    assert_eq!(inbox.len(), 40);
}

#[test]
fn error_handling_for_invalid_files() {
    let (_temp, sdk) = setup_test_sdk();

    // Create a valid task
    sdk.create_task(NewTask::new("Valid Task")).unwrap();

    // Create an invalid file manually (can't be parsed)
    let invalid_path = sdk.config().tasks_dir.join("invalid.md");
    fs::write(&invalid_path, "not valid yaml frontmatter at all").unwrap();

    // list_tasks should skip invalid/unparseable files
    let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
    assert_eq!(tasks.len(), 1);
    assert_eq!(tasks[0].title, "Valid Task");

    // Create a task that parses but has a validation warning (done without completed_at)
    let invalid_task_path = sdk.config().tasks_dir.join("invalid-task.md");
    fs::write(
        &invalid_task_path,
        r#"---
title: Done without completed-at
status: done
created-at: 2025-01-01
updated-at: 2025-01-01
---
"#,
    )
    .unwrap();

    // validate_all_tasks should report the validation error
    let errors = sdk.validate_all_tasks();
    assert!(!errors.is_empty(), "Should have validation errors");
}

#[test]
fn get_tasks_for_area_includes_direct_and_via_project() {
    let (_temp, sdk) = setup_test_sdk();

    // Create an area
    let area_path = sdk
        .create_area(NewArea::new("Work").with_filename("work.md"))
        .unwrap();

    // Create a project in the area
    sdk.create_project(
        NewProject::new("Big Project")
            .with_filename("big-project.md")
            .in_area(taskdn::FileReference::wiki_link("work")),
    )
    .unwrap();

    // Create a task directly assigned to the area
    sdk.create_task(NewTask::new("Direct Task").in_area(taskdn::FileReference::wiki_link("work")))
        .unwrap();

    // Create a task assigned via the project
    sdk.create_task(
        NewTask::new("Project Task").in_project(taskdn::FileReference::wiki_link("big-project")),
    )
    .unwrap();

    // Create an unrelated task
    sdk.create_task(NewTask::new("Unrelated")).unwrap();

    // get_tasks_for_area should return both direct and via-project tasks
    let tasks = sdk.get_tasks_for_area(&area_path).unwrap();
    assert_eq!(tasks.len(), 2);

    let titles: Vec<_> = tasks.iter().map(|t| t.title.as_str()).collect();
    assert!(titles.contains(&"Direct Task"));
    assert!(titles.contains(&"Project Task"));
}

#[test]
fn performance_test_many_tasks() {
    let (_temp, sdk) = setup_test_sdk();

    // Create 500 tasks (scaled down from 5000 for faster CI)
    let create_start = Instant::now();
    for i in 0..500 {
        sdk.create_task(NewTask::new(format!("Task {i}")).with_filename(format!("task-{i:04}.md")))
            .unwrap();
    }
    let create_duration = create_start.elapsed();
    eprintln!("Created 500 tasks in {:?}", create_duration);

    // List all tasks
    let list_start = Instant::now();
    let tasks = sdk.list_tasks(&TaskFilter::new()).unwrap();
    let list_duration = list_start.elapsed();
    assert_eq!(tasks.len(), 500);
    eprintln!("Listed 500 tasks in {:?}", list_duration);

    // Query with filter
    let query_start = Instant::now();
    let inbox = sdk
        .list_tasks(&TaskFilter::new().with_status(TaskStatus::Inbox))
        .unwrap();
    let query_duration = query_start.elapsed();
    assert_eq!(inbox.len(), 500);
    eprintln!("Filtered 500 tasks in {:?}", query_duration);

    // Performance assertions (generous limits for CI variability)
    assert!(
        list_duration.as_millis() < 5000,
        "Listing 500 tasks took too long: {:?}",
        list_duration
    );
    assert!(
        query_duration.as_millis() < 5000,
        "Filtering 500 tasks took too long: {:?}",
        query_duration
    );
}

#[test]
fn cross_entity_relationships() {
    let (_temp, sdk) = setup_test_sdk();

    // Create areas
    let work_area = sdk
        .create_area(NewArea::new("Work").with_filename("work.md"))
        .unwrap();

    // Create projects in areas
    let project1 = sdk
        .create_project(
            NewProject::new("Project Alpha")
                .with_filename("alpha.md")
                .in_area(taskdn::FileReference::wiki_link("work")),
        )
        .unwrap();

    let project2 = sdk
        .create_project(
            NewProject::new("Project Beta")
                .with_filename("beta.md")
                .in_area(taskdn::FileReference::wiki_link("work")),
        )
        .unwrap();

    // Create tasks in projects
    sdk.create_task(
        NewTask::new("Alpha Task 1").in_project(taskdn::FileReference::wiki_link("alpha")),
    )
    .unwrap();

    sdk.create_task(
        NewTask::new("Alpha Task 2").in_project(taskdn::FileReference::wiki_link("alpha")),
    )
    .unwrap();

    sdk.create_task(NewTask::new("Beta Task").in_project(taskdn::FileReference::wiki_link("beta")))
        .unwrap();

    // Verify relationships
    let projects_in_work = sdk.get_projects_for_area(&work_area).unwrap();
    assert_eq!(projects_in_work.len(), 2);

    let tasks_in_alpha = sdk.get_tasks_for_project(&project1).unwrap();
    assert_eq!(tasks_in_alpha.len(), 2);

    let tasks_in_beta = sdk.get_tasks_for_project(&project2).unwrap();
    assert_eq!(tasks_in_beta.len(), 1);

    // All tasks for the area (via projects)
    let tasks_in_work = sdk.get_tasks_for_area(&work_area).unwrap();
    assert_eq!(tasks_in_work.len(), 3);
}
