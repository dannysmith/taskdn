//! Demo of the taskdn SDK.
//!
//! Run with: cargo run --example demo

use std::fs;
use taskdn::{
    AreaFilter, FileReference, NewArea, NewProject, NewTask, ProjectFilter, ProjectStatus,
    TaskFilter, TaskStatus, Taskdn, TaskdnConfig,
};
use tempfile::TempDir;

fn main() -> taskdn::Result<()> {
    println!("=== Taskdn SDK Demo ===\n");

    // Create a temporary vault
    let temp = TempDir::new().expect("Failed to create temp dir");
    let tasks_dir = temp.path().join("tasks");
    let projects_dir = temp.path().join("projects");
    let areas_dir = temp.path().join("areas");

    fs::create_dir_all(&tasks_dir).expect("Failed to create tasks dir");
    fs::create_dir_all(&projects_dir).expect("Failed to create projects dir");
    fs::create_dir_all(&areas_dir).expect("Failed to create areas dir");

    println!("Created vault at: {}\n", temp.path().display());

    // Initialize the SDK
    let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
    let sdk = Taskdn::new(config)?;

    // --- Create Areas ---
    println!("--- Creating Areas ---");

    let work_path = sdk.create_area(
        NewArea::new("Work")
            .with_area_type("professional")
            .with_description("Work-related tasks and projects"),
    )?;
    println!("Created area: {}", work_path.display());

    let personal_path = sdk.create_area(NewArea::new("Personal").with_area_type("life"))?;
    println!("Created area: {}", personal_path.display());

    // --- Create Projects ---
    println!("\n--- Creating Projects ---");

    let project_path = sdk.create_project(
        NewProject::new("Q1 Roadmap")
            .with_status(ProjectStatus::InProgress)
            .in_area(FileReference::wiki_link("Work"))
            .with_description("Q1 2025 planning"),
    )?;
    println!("Created project: {}", project_path.display());

    let side_project = sdk.create_project(
        NewProject::new("Side Project")
            .with_status(ProjectStatus::Planning)
            .in_area(FileReference::wiki_link("Personal")),
    )?;
    println!("Created project: {}", side_project.display());

    // --- Create Tasks ---
    println!("\n--- Creating Tasks ---");

    // Quick inbox capture
    let task1 = sdk.create_inbox_task("Review pull request")?;
    println!("Created inbox task: {}", task1.display());

    // Task with project assignment
    let task2 = sdk.create_task(
        NewTask::new("Write roadmap document")
            .with_status(TaskStatus::Ready)
            .in_project(FileReference::wiki_link("Q1 Roadmap"))
            .in_area(FileReference::wiki_link("Work")),
    )?;
    println!("Created task in project: {}", task2.display());

    // Task with due date
    let task3 = sdk.create_task(
        NewTask::new("Prepare presentation")
            .with_status(TaskStatus::Ready)
            .in_project(FileReference::wiki_link("Q1 Roadmap")),
    )?;
    println!("Created task: {}", task3.display());

    // Personal task
    let task4 = sdk.create_task(
        NewTask::new("Buy groceries")
            .with_status(TaskStatus::Ready)
            .in_area(FileReference::wiki_link("Personal")),
    )?;
    println!("Created personal task: {}", task4.display());

    // --- Query Tasks ---
    println!("\n--- Querying Tasks ---");

    let all_tasks = sdk.list_tasks(&TaskFilter::new())?;
    println!("Total tasks: {}", all_tasks.len());

    let inbox = sdk.list_tasks(&TaskFilter::inbox())?;
    println!("Inbox tasks: {}", inbox.len());

    let ready = sdk.list_tasks(&TaskFilter::new().with_status(TaskStatus::Ready))?;
    println!("Ready tasks: {}", ready.len());
    for task in &ready {
        println!("  - {} (project: {:?})", task.title, task.project);
    }

    // --- Query by Project ---
    println!("\n--- Tasks in Q1 Roadmap ---");

    let project_tasks = sdk.get_tasks_for_project(&project_path)?;
    println!("Found {} tasks:", project_tasks.len());
    for task in &project_tasks {
        println!("  - {} [{}]", task.title, task.status);
    }

    // --- Query by Area ---
    println!("\n--- Work Area Overview ---");

    let work_projects = sdk.get_projects_for_area(&work_path)?;
    println!("Projects: {}", work_projects.len());

    let work_tasks = sdk.get_tasks_for_area(&work_path)?;
    println!("Tasks (direct + via projects): {}", work_tasks.len());

    // --- Update and Complete Tasks ---
    println!("\n--- Completing Tasks ---");

    sdk.start_task(&task2)?;
    let task = sdk.get_task(&task2)?;
    println!("Started: {} -> {}", task.title, task.status);

    sdk.complete_task(&task2)?;
    let task = sdk.get_task(&task2)?;
    println!(
        "Completed: {} -> {} (completed_at: {:?})",
        task.title, task.status, task.completed_at
    );

    // --- Archive ---
    println!("\n--- Archiving ---");

    let archived_path = sdk.archive_task(&task2)?;
    println!("Archived to: {}", archived_path.display());

    // Archived tasks excluded by default
    let active = sdk.list_tasks(&TaskFilter::new())?;
    println!("Active tasks (excluding archive): {}", active.len());

    // Include archive
    let all = sdk.list_tasks(&TaskFilter::new().include_archive_dir())?;
    println!("All tasks (including archive): {}", all.len());

    // --- List Projects and Areas ---
    println!("\n--- Projects ---");
    let projects = sdk.list_projects(&ProjectFilter::new())?;
    for p in &projects {
        println!(
            "  - {} [{:?}] (area: {:?})",
            p.title,
            p.status.unwrap_or(ProjectStatus::Planning),
            p.area
        );
    }

    println!("\n--- Areas ---");
    let areas = sdk.list_areas(&AreaFilter::new())?;
    for a in &areas {
        println!("  - {} ({:?})", a.title, a.area_type);
    }

    println!("\n=== Demo Complete ===");
    Ok(())
}
