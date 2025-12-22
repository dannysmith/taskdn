//! Performance benchmarks for the taskdn library.
//!
//! Target performance:
//! - Single file parse: <1ms
//! - Full vault scan (5000 files): 200-500ms
//! - Query operations: <5ms

use criterion::{black_box, criterion_group, criterion_main, Criterion};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use taskdn::{ParsedTask, Task, TaskFilter, TaskStatus, Taskdn, TaskdnConfig};
use tempfile::TempDir;

/// Sample task content for benchmarks.
fn sample_task_content(i: usize, status: &str) -> String {
    format!(
        r#"---
title: Task {i}
status: {status}
created-at: 2025-01-01
updated-at: 2025-01-02
project: "[[Project A]]"
area: "[[Work]]"
custom-field: value{i}
---

## Description

This is task number {i} with some body content.

- Item 1
- Item 2
- Item 3

```
Code block
```
"#
    )
}

/// Create a test vault with the specified number of files.
fn setup_vault(num_tasks: usize) -> (TempDir, Taskdn) {
    let temp = TempDir::new().expect("Failed to create temp dir");
    let tasks_dir = temp.path().join("tasks");
    let projects_dir = temp.path().join("projects");
    let areas_dir = temp.path().join("areas");

    fs::create_dir_all(&tasks_dir).expect("Failed to create tasks dir");
    fs::create_dir_all(&projects_dir).expect("Failed to create projects dir");
    fs::create_dir_all(&areas_dir).expect("Failed to create areas dir");

    // Create task files
    let statuses = ["inbox", "ready", "in-progress", "blocked", "done"];
    for i in 0..num_tasks {
        let status = statuses[i % statuses.len()];
        let content = sample_task_content(i, status);
        let path = tasks_dir.join(format!("task-{i:05}.md"));
        fs::write(&path, &content).expect("Failed to write task file");
    }

    let config = TaskdnConfig::new(tasks_dir, projects_dir, areas_dir);
    let sdk = Taskdn::new(config).expect("Failed to create SDK");

    (temp, sdk)
}

/// Benchmark: Parse a single task file from string content.
fn bench_parse_single_file(c: &mut Criterion) {
    let content = sample_task_content(0, "ready");

    c.bench_function("parse_single_file", |b| {
        b.iter(|| {
            let _parsed = ParsedTask::parse(black_box(&content)).expect("Parse failed");
        });
    });
}

/// Benchmark: Parse 100 tasks sequentially.
fn bench_parse_100_files(c: &mut Criterion) {
    let contents: Vec<String> = (0..100).map(|i| sample_task_content(i, "ready")).collect();

    c.bench_function("parse_100_files_sequential", |b| {
        b.iter(|| {
            for content in &contents {
                let _parsed = ParsedTask::parse(black_box(content)).expect("Parse failed");
            }
        });
    });
}

/// Benchmark: List all tasks from vault (parallel scan).
fn bench_list_tasks_100(c: &mut Criterion) {
    let (_temp, sdk) = setup_vault(100);

    c.bench_function("list_tasks_100", |b| {
        b.iter(|| {
            let _tasks = sdk
                .list_tasks(black_box(&TaskFilter::new()))
                .expect("List failed");
        });
    });
}

/// Benchmark: List tasks with filter.
fn bench_list_tasks_with_filter_100(c: &mut Criterion) {
    let (_temp, sdk) = setup_vault(100);
    let filter = TaskFilter::new().with_status(TaskStatus::Ready);

    c.bench_function("list_tasks_with_filter_100", |b| {
        b.iter(|| {
            let _tasks = sdk.list_tasks(black_box(&filter)).expect("List failed");
        });
    });
}

/// Benchmark: Filter in-memory tasks (no I/O).
fn bench_filter_in_memory(c: &mut Criterion) {
    // Create 1000 in-memory tasks
    let tasks: Vec<Task> = (0..1000)
        .map(|i| {
            let status = match i % 5 {
                0 => TaskStatus::Inbox,
                1 => TaskStatus::Ready,
                2 => TaskStatus::InProgress,
                3 => TaskStatus::Blocked,
                _ => TaskStatus::Done,
            };
            Task {
                path: PathBuf::from(format!("/tasks/task-{i}.md")),
                title: format!("Task {i}"),
                status,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-02".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            }
        })
        .collect();

    let filter = TaskFilter::new().with_status(TaskStatus::Ready);

    c.bench_function("filter_in_memory_1000", |b| {
        b.iter(|| {
            let _filtered: Vec<&Task> = tasks
                .iter()
                .filter(|t| filter.matches(black_box(t)))
                .collect();
        });
    });
}

/// Benchmark: Large vault scan (1000 files).
fn bench_list_tasks_1000(c: &mut Criterion) {
    let (_temp, sdk) = setup_vault(1000);

    c.bench_function("list_tasks_1000", |b| {
        b.iter(|| {
            let _tasks = sdk
                .list_tasks(black_box(&TaskFilter::new()))
                .expect("List failed");
        });
    });
}

criterion_group!(
    benches,
    bench_parse_single_file,
    bench_parse_100_files,
    bench_list_tasks_100,
    bench_list_tasks_with_filter_100,
    bench_filter_in_memory,
    bench_list_tasks_1000,
);
criterion_main!(benches);
