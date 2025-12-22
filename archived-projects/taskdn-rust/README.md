# taskdn-rust

Rust library for parsing, querying, and manipulating Taskdn task files.

## Overview

This is the core SDK that powers the Taskdn ecosystem. It provides:

- **Parsing** - Read markdown files with YAML frontmatter into typed entities
- **Querying** - Filter tasks, projects, and areas by status, dates, assignments
- **CRUD Operations** - Create, read, update, and delete entities with automatic timestamp management
- **Validation** - Check files against the Taskdn specification
- **Round-trip Preservation** - Unknown frontmatter fields are preserved when writing
- **File Watching** - Process file system events or use built-in watcher

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
taskdn = "0.1"
```

For file watching support:

```toml
[dependencies]
taskdn = { version = "0.1", features = ["watch"] }
```

## Quick Start

```rust
use taskdn::{Taskdn, TaskdnConfig, TaskFilter, TaskStatus, NewTask};
use std::path::PathBuf;

fn main() -> taskdn::Result<()> {
    // Initialize with your vault directories
    let config = TaskdnConfig::new(
        PathBuf::from("./tasks"),
        PathBuf::from("./projects"),
        PathBuf::from("./areas"),
    );
    let sdk = Taskdn::new(config)?;

    // Create a new task
    let path = sdk.create_task(NewTask::new("Review pull request"))?;

    // List ready tasks
    let ready = sdk.list_tasks(&TaskFilter::new().with_status(TaskStatus::Ready))?;

    // Complete a task
    sdk.complete_task(&path)?;

    Ok(())
}
```

## Usage Examples

### Creating Tasks

```rust
use taskdn::{NewTask, TaskStatus, FileReference};
use chrono::NaiveDate;

// Simple task (defaults to Inbox status)
let task = NewTask::new("Quick capture");

// Task with all options
let task = NewTask::new("Implement feature X")
    .with_status(TaskStatus::Ready)
    .with_due("2025-01-15".parse()?)
    .with_scheduled(NaiveDate::from_ymd_opt(2025, 1, 14).unwrap())
    .in_project(FileReference::wiki_link("Q1 Roadmap"))
    .in_area(FileReference::wiki_link("Work"))
    .with_body("## Notes\n\nImplementation details...");
```

### Querying Tasks

```rust
use taskdn::{TaskFilter, TaskStatus};
use chrono::NaiveDate;

// By status
let ready = sdk.list_tasks(&TaskFilter::new().with_status(TaskStatus::Ready))?;
let active = sdk.list_tasks(&TaskFilter::new().with_statuses([
    TaskStatus::Ready,
    TaskStatus::InProgress,
]))?;

// By assignment
let project_tasks = sdk.list_tasks(&TaskFilter::new().in_project("[[My Project]]"))?;
let orphan_tasks = sdk.list_tasks(&TaskFilter::new().without_project())?;

// By dates
let today = NaiveDate::from_ymd_opt(2025, 1, 15).unwrap();
let overdue = sdk.list_tasks(&TaskFilter::overdue(today))?;
let due_soon = sdk.list_tasks(&TaskFilter::upcoming(today, 7))?; // next 7 days
let visible = sdk.list_tasks(&TaskFilter::new().visible_as_of(today))?;

// Preset filters
let inbox = sdk.list_tasks(&TaskFilter::inbox())?;
let available = sdk.list_tasks(&TaskFilter::available(today))?;
```

### Updating Tasks

```rust
use taskdn::{TaskUpdates, TaskStatus};

// Update specific fields
sdk.update_task(&path, TaskUpdates::new()
    .title("New title")
    .status(TaskStatus::InProgress))?;

// Clear optional fields
sdk.update_task(&path, TaskUpdates::new().clear_due())?;

// Convenience methods for status transitions
sdk.complete_task(&path)?;  // Sets status to Done, sets completed_at
sdk.drop_task(&path)?;      // Sets status to Dropped, sets completed_at
sdk.start_task(&path)?;     // Sets status to InProgress
sdk.block_task(&path)?;     // Sets status to Blocked
```

### Working with Projects

```rust
use taskdn::{NewProject, ProjectStatus, ProjectFilter};

// Create a project
let path = sdk.create_project(
    NewProject::new("Q1 Planning")
        .with_status(ProjectStatus::InProgress)
        .in_area("[[Work]]")
)?;

// Query projects
let active = sdk.list_projects(&ProjectFilter::active())?;
let work_projects = sdk.list_projects(&ProjectFilter::new().in_area("[[Work]]"))?;

// Get tasks belonging to a project
let tasks = sdk.get_tasks_for_project(&path)?;
```

### Working with Areas

```rust
use taskdn::{NewArea, AreaFilter};

// Create an area
let path = sdk.create_area(
    NewArea::new("Work")
        .with_area_type("professional")
        .with_description("Work-related tasks and projects")
)?;

// Query areas
let active = sdk.list_areas(&AreaFilter::active())?;

// Get all entities in an area (direct + via project)
let tasks = sdk.get_tasks_for_area(&path)?;
let projects = sdk.get_projects_for_area(&path)?;
```

### File Watching

Process file changes manually:

```rust
use taskdn::{FileChangeKind, VaultEvent};

// When your file watcher reports a change
if let Some(event) = sdk.process_file_change(&path, FileChangeKind::Modified)? {
    match event {
        VaultEvent::TaskCreated(task) => println!("New task: {}", task.title),
        VaultEvent::TaskUpdated(task) => println!("Updated: {}", task.title),
        VaultEvent::TaskDeleted { path } => println!("Deleted: {:?}", path),
        // ... handle project and area events
        _ => {}
    }
}
```

Or use the built-in watcher (requires `watch` feature):

```rust
use taskdn::{FileWatcher, WatchConfig, VaultEvent};
use std::time::Duration;

let (watcher, receiver) = FileWatcher::new(&sdk, WatchConfig {
    debounce: Duration::from_millis(100),
})?;

// Events arrive on the receiver channel
for event in receiver {
    match event {
        VaultEvent::TaskUpdated(task) => { /* ... */ }
        _ => {}
    }
}
```

### Validation

```rust
// Validate a single task
let warnings = sdk.get_task_warnings(&path)?;
for warning in warnings {
    println!("{}", warning);
}

// Validate all tasks
let result = sdk.validate_all_tasks();
for (path, warnings) in &result.warnings {
    for warning in warnings {
        println!("{}: {}", path.display(), warning);
    }
}
```

### Parsing Without SDK

Parse content directly without file I/O:

```rust
use taskdn::ParsedTask;

let content = r#"---
title: My Task
status: ready
created-at: 2025-01-01
updated-at: 2025-01-02
---

Task body content.
"#;

let parsed = ParsedTask::parse(content)?;
println!("Title: {}", parsed.title);

// Convert to full Task by adding a path
let task = parsed.with_path("/path/to/task.md");
```

## Performance

Target benchmarks (5000 files):

| Operation         | Target    | Description                          |
| ----------------- | --------- | ------------------------------------ |
| Single file parse | <1ms      | Parse one markdown file              |
| Full vault scan   | 200-500ms | List all tasks with parallel parsing |
| Query (in-memory) | <5ms      | Filter already-loaded tasks          |

The SDK uses [rayon](https://docs.rs/rayon) for parallel file parsing during scans.

## Development

### Prerequisites

- Rust 1.70+ (2021 edition)
- [just](https://github.com/casey/just) (optional, for task runner)

### Commands

```bash
just check    # Run all checks (format, lint, test)
cargo build   # Build the library
cargo test    # Run tests
cargo clippy -- -D warnings  # Lint
cargo doc --open             # Build and open documentation
```

### Project Structure

```
src/
├── lib.rs           # Public API, SDK entry point
├── config.rs        # Configuration types
├── error.rs         # Error types (thiserror)
├── types/           # Entity types (Task, Project, Area)
│   ├── task.rs      # Task entity, NewTask, TaskUpdates
│   ├── project.rs   # Project entity, NewProject, ProjectUpdates
│   ├── area.rs      # Area entity, NewArea, AreaUpdates
│   ├── datetime.rs  # DateTimeValue (preserves format)
│   └── reference.rs # FileReference (WikiLink, path)
├── filter.rs        # TaskFilter, ProjectFilter, AreaFilter
├── parser.rs        # Frontmatter parsing (gray_matter)
├── writer.rs        # File writing with field preservation
├── operations/      # SDK method implementations
│   ├── tasks.rs     # Task CRUD operations
│   ├── projects.rs  # Project CRUD operations
│   ├── areas.rs     # Area CRUD operations
│   └── validation.rs# Validation operations
├── events.rs        # VaultEvent, file change processing
├── watcher.rs       # FileWatcher (watch feature)
└── validation.rs    # ValidationWarning types
```

## Testing

Integration tests use a disposable copy of the demo vault:

```bash
../scripts/reset-dummy-vault.sh  # Reset test vault
cargo test                        # Run all tests
```

## License

MIT
