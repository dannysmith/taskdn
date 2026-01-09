//! File writing infrastructure with round-trip fidelity.
//!
//! This module handles creating and updating task, project, and area files
//! while preserving unknown frontmatter fields, date formats, and body content.
//!
//! Key design principle: Don't round-trip through typed structs. Instead,
//! manipulate raw YAML to preserve structure the typed structs would discard.

use std::fs;
use std::path::Path;

use crate::vault::wikilink::ensure_wikilink;
use crate::vault::{
    parse_project_file, parse_task_file, CreateProjectOptions, CreateTaskOptions, Project,
    ProjectStatus, ProjectUpdate, Task, TaskStatus, TaskUpdate, VaultError,
};
use chrono::Utc;
use gray_matter::{engine::YAML, Matter};

// =============================================================================
// Helper Utilities
// =============================================================================

/// Convert a title to a filename-safe slug.
pub fn slugify(title: &str) -> String {
    let mut slug = String::with_capacity(title.len());

    for c in title.chars() {
        match c {
            'a'..='z' | '0'..='9' => slug.push(c),
            'A'..='Z' => slug.push(c.to_ascii_lowercase()),
            ' ' | '_' => slug.push('-'),
            '-' => slug.push('-'),
            // Skip special characters
            _ => {}
        }
    }

    // Collapse multiple hyphens
    let mut result = String::with_capacity(slug.len());
    let mut prev_hyphen = false;
    for c in slug.chars() {
        if c == '-' {
            if !prev_hyphen && !result.is_empty() {
                result.push(c);
            }
            prev_hyphen = true;
        } else {
            result.push(c);
            prev_hyphen = false;
        }
    }

    // Trim trailing hyphen
    while result.ends_with('-') {
        result.pop();
    }

    // Truncate if too long
    if result.len() > 100 {
        result.truncate(100);
        while result.ends_with('-') {
            result.pop();
        }
    }

    // Handle empty result
    if result.is_empty() {
        result = "untitled".to_string();
    }

    result
}

/// Generate a unique filename by adding a numeric suffix if needed.
pub fn unique_filename(dir: &Path, base_slug: &str) -> String {
    let base_path = dir.join(format!("{base_slug}.md"));
    if !base_path.exists() {
        return format!("{base_slug}.md");
    }

    let mut counter = 1;
    loop {
        let filename = format!("{base_slug}-{counter}.md");
        let path = dir.join(&filename);
        if !path.exists() {
            return filename;
        }
        counter += 1;
        // Safety limit
        if counter > 10000 {
            return format!("{base_slug}-{}.md", uuid::Uuid::new_v4());
        }
    }
}

/// Get current timestamp in ISO 8601 format (UTC).
pub fn now_iso8601() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

/// Atomically write content to a file.
pub fn atomic_write(path: &Path, content: &str) -> Result<(), VaultError> {
    let path_str = path.display().to_string();
    let parent = path.parent().ok_or_else(|| {
        VaultError::validation_error("path", "Invalid path - no parent directory")
    })?;

    // Create parent directory if it doesn't exist
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| {
            VaultError::write_error(&path_str, format!("Failed to create directory: {e}"))
        })?;
    }

    // Generate temp file name in same directory
    let temp_filename = format!(".tmp-{}", uuid::Uuid::new_v4());
    let temp_path = parent.join(temp_filename);

    // Write to temp file
    fs::write(&temp_path, content).map_err(|e| {
        VaultError::write_error(&path_str, format!("Failed to write temp file: {e}"))
    })?;

    // Sync to disk (fsync) for durability
    if let Ok(file) = fs::File::open(&temp_path) {
        if let Err(e) = file.sync_all() {
            // On Windows, sync can fail in some directories - non-fatal
            #[cfg(not(target_os = "windows"))]
            {
                let _ = fs::remove_file(&temp_path);
                return Err(VaultError::write_error(
                    &path_str,
                    format!("Failed to sync file to disk: {e}"),
                ));
            }
            #[cfg(target_os = "windows")]
            {
                let _ = e; // Suppress unused variable warning
            }
        }
    }

    // Rename temp file to target (atomic on most filesystems)
    fs::rename(&temp_path, path).map_err(|e| {
        let _ = fs::remove_file(&temp_path);
        VaultError::write_error(&path_str, format!("Failed to rename file: {e}"))
    })?;

    Ok(())
}

// =============================================================================
// YAML Manipulation Helpers
// =============================================================================

/// Parse file content into (raw YAML mapping, body content).
fn parse_file_parts(content: &str) -> Result<(serde_norway::Mapping, String), VaultError> {
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse(content);

    let yaml_str = parsed.matter;

    let mapping: serde_norway::Mapping = if yaml_str.is_empty() {
        serde_norway::Mapping::new()
    } else {
        serde_norway::from_str(&yaml_str).map_err(|e| {
            VaultError::parse_error("(content)", format!("Failed to parse YAML: {e}"))
        })?
    };

    Ok((mapping, parsed.content.to_string()))
}

fn set_yaml_field(mapping: &mut serde_norway::Mapping, key: &str, value: serde_norway::Value) {
    let yaml_key = serde_norway::Value::String(key.to_string());
    mapping.insert(yaml_key, value);
}

fn remove_yaml_field(mapping: &mut serde_norway::Mapping, key: &str) {
    let yaml_key = serde_norway::Value::String(key.to_string());
    mapping.remove(&yaml_key);
}

fn set_wikilink_field(mapping: &mut serde_norway::Mapping, key: &str, value: &str) {
    let wikilink = ensure_wikilink(value);
    set_yaml_field(mapping, key, serde_norway::Value::String(wikilink));
}

fn serialize_yaml(mapping: &serde_norway::Mapping) -> Result<String, VaultError> {
    serde_norway::to_string(mapping)
        .map_err(|e| VaultError::internal(format!("Failed to serialize YAML: {e}")))
}

fn reconstruct_file(frontmatter: &str, body: &str) -> String {
    if body.is_empty() {
        format!("---\n{frontmatter}---\n")
    } else {
        format!("---\n{frontmatter}---\n{body}")
    }
}

// =============================================================================
// Create Operations
// =============================================================================

/// Create a new task file with the given title and optional fields.
pub fn create_task_file(tasks_dir: &str, options: CreateTaskOptions) -> Result<Task, VaultError> {
    let dir = Path::new(tasks_dir);
    let title = options.title.unwrap_or_default();

    // Generate filename
    let slug = slugify(&title);
    let filename = unique_filename(dir, &slug);
    let file_path = dir.join(&filename);

    // Build frontmatter
    let mut mapping = serde_norway::Mapping::new();

    // Required fields
    set_yaml_field(
        &mut mapping,
        "title",
        serde_norway::Value::String(title.clone()),
    );

    // Status (default to inbox)
    let status = options.status.unwrap_or(TaskStatus::Inbox);
    let status_str = match status {
        TaskStatus::Inbox => "inbox",
        TaskStatus::Icebox => "icebox",
        TaskStatus::Ready => "ready",
        TaskStatus::InProgress => "in-progress",
        TaskStatus::Blocked => "blocked",
        TaskStatus::Dropped => "dropped",
        TaskStatus::Done => "done",
    };
    set_yaml_field(
        &mut mapping,
        "status",
        serde_norway::Value::String(status_str.to_string()),
    );

    // Timestamps
    let now = now_iso8601();
    set_yaml_field(
        &mut mapping,
        "created-at",
        serde_norway::Value::String(now.clone()),
    );
    set_yaml_field(&mut mapping, "updated-at", serde_norway::Value::String(now));

    // Optional fields
    if let Some(project) = &options.project_id {
        let wikilink = ensure_wikilink(project);
        let projects_array =
            serde_norway::Value::Sequence(vec![serde_norway::Value::String(wikilink)]);
        set_yaml_field(&mut mapping, "projects", projects_array);
    }

    if let Some(area) = &options.area_id {
        set_wikilink_field(&mut mapping, "area", area);
    }

    if let Some(due) = &options.due {
        set_yaml_field(
            &mut mapping,
            "due",
            serde_norway::Value::String(due.clone()),
        );
    }

    if let Some(scheduled) = &options.scheduled {
        set_yaml_field(
            &mut mapping,
            "scheduled",
            serde_norway::Value::String(scheduled.clone()),
        );
    }

    if let Some(defer_until) = &options.defer_until {
        set_yaml_field(
            &mut mapping,
            "defer-until",
            serde_norway::Value::String(defer_until.clone()),
        );
    }

    // Serialize and write
    let frontmatter = serialize_yaml(&mapping)?;
    let content = reconstruct_file(&frontmatter, "");

    atomic_write(&file_path, &content)?;

    // Parse and return the created task
    let path_str = file_path.to_string_lossy().to_string();
    parse_task_file(&path_str).inspect_err(|_| {
        let _ = fs::remove_file(&file_path);
    })
}

/// Create a new project file.
pub fn create_project_file(
    projects_dir: &str,
    options: CreateProjectOptions,
) -> Result<Project, VaultError> {
    let dir = Path::new(projects_dir);
    let title = options.title;

    let slug = slugify(&title);
    let filename = unique_filename(dir, &slug);
    let file_path = dir.join(&filename);

    let mut mapping = serde_norway::Mapping::new();

    set_yaml_field(
        &mut mapping,
        "title",
        serde_norway::Value::String(title.clone()),
    );

    if let Some(status) = &options.status {
        let status_str = match status {
            ProjectStatus::Planning => "planning",
            ProjectStatus::Ready => "ready",
            ProjectStatus::Blocked => "blocked",
            ProjectStatus::InProgress => "in-progress",
            ProjectStatus::Paused => "paused",
            ProjectStatus::Done => "done",
        };
        set_yaml_field(
            &mut mapping,
            "status",
            serde_norway::Value::String(status_str.to_string()),
        );
    }

    if let Some(area) = &options.area_id {
        set_wikilink_field(&mut mapping, "area", area);
    }

    if let Some(description) = &options.description {
        set_yaml_field(
            &mut mapping,
            "description",
            serde_norway::Value::String(description.clone()),
        );
    }

    if let Some(start_date) = &options.start_date {
        set_yaml_field(
            &mut mapping,
            "start-date",
            serde_norway::Value::String(start_date.clone()),
        );
    }

    if let Some(end_date) = &options.end_date {
        set_yaml_field(
            &mut mapping,
            "end-date",
            serde_norway::Value::String(end_date.clone()),
        );
    }

    let frontmatter = serialize_yaml(&mapping)?;
    let content = reconstruct_file(&frontmatter, "");

    atomic_write(&file_path, &content)?;

    let path_str = file_path.to_string_lossy().to_string();
    parse_project_file(&path_str).inspect_err(|_| {
        let _ = fs::remove_file(&file_path);
    })
}

// =============================================================================
// Update Operations
// =============================================================================

/// A single field update for targeted file modifications.
pub struct FieldUpdate {
    pub field: String,
    pub value: Option<String>,
}

/// Update specific fields in an existing file while preserving round-trip fidelity.
pub fn update_file_fields(path: &str, updates: Vec<FieldUpdate>) -> Result<(), VaultError> {
    let file_path = Path::new(path);

    let content = fs::read_to_string(file_path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            VaultError::file_not_found(path)
        } else {
            VaultError::read_error(path, e.to_string())
        }
    })?;

    let (mut mapping, body) = parse_file_parts(&content)?;

    for update in updates {
        match update.value {
            Some(value) if !value.is_empty() => {
                // Handle special cases for array fields
                if update.field == "projects" || update.field == "project" {
                    let wikilink = ensure_wikilink(&value);
                    let projects_array =
                        serde_norway::Value::Sequence(vec![serde_norway::Value::String(wikilink)]);
                    set_yaml_field(&mut mapping, "projects", projects_array);
                } else if update.field == "area" {
                    set_wikilink_field(&mut mapping, &update.field, &value);
                } else {
                    set_yaml_field(
                        &mut mapping,
                        &update.field,
                        serde_norway::Value::String(value),
                    );
                }
            }
            _ => {
                // Remove the field
                if update.field == "project" {
                    remove_yaml_field(&mut mapping, "projects");
                } else {
                    remove_yaml_field(&mut mapping, &update.field);
                }
            }
        }
    }

    // Update timestamp
    set_yaml_field(
        &mut mapping,
        "updated-at",
        serde_norway::Value::String(now_iso8601()),
    );

    // Handle completed-at for status changes to done/dropped
    let status_key = serde_norway::Value::String("status".to_string());
    if let Some(serde_norway::Value::String(status)) = mapping.get(&status_key) {
        if status == "done" || status == "dropped" {
            let completed_key = serde_norway::Value::String("completed-at".to_string());
            if !mapping.contains_key(&completed_key) {
                set_yaml_field(
                    &mut mapping,
                    "completed-at",
                    serde_norway::Value::String(now_iso8601()),
                );
            }
        }
    }

    let frontmatter = serialize_yaml(&mapping)?;
    let new_content = reconstruct_file(&frontmatter, &body);

    atomic_write(file_path, &new_content)?;

    Ok(())
}

/// Update a task by ID.
pub fn update_task(task: &Task, update: TaskUpdate) -> Result<Task, VaultError> {
    let mut updates = Vec::new();

    if let Some(title) = update.title {
        updates.push(FieldUpdate {
            field: "title".to_string(),
            value: Some(title),
        });
    }

    if let Some(status) = update.status {
        let status_str = match status {
            TaskStatus::Inbox => "inbox",
            TaskStatus::Icebox => "icebox",
            TaskStatus::Ready => "ready",
            TaskStatus::InProgress => "in-progress",
            TaskStatus::Blocked => "blocked",
            TaskStatus::Dropped => "dropped",
            TaskStatus::Done => "done",
        };
        updates.push(FieldUpdate {
            field: "status".to_string(),
            value: Some(status_str.to_string()),
        });
    }

    if let Some(project) = update.project {
        updates.push(FieldUpdate {
            field: "project".to_string(),
            value: if project.is_empty() {
                None
            } else {
                Some(project)
            },
        });
    }

    if let Some(area) = update.area {
        updates.push(FieldUpdate {
            field: "area".to_string(),
            value: if area.is_empty() { None } else { Some(area) },
        });
    }

    if let Some(scheduled) = update.scheduled {
        updates.push(FieldUpdate {
            field: "scheduled".to_string(),
            value: if scheduled.is_empty() {
                None
            } else {
                Some(scheduled)
            },
        });
    }

    if let Some(due) = update.due {
        updates.push(FieldUpdate {
            field: "due".to_string(),
            value: if due.is_empty() { None } else { Some(due) },
        });
    }

    if let Some(defer_until) = update.defer_until {
        updates.push(FieldUpdate {
            field: "defer-until".to_string(),
            value: if defer_until.is_empty() {
                None
            } else {
                Some(defer_until)
            },
        });
    }

    if !updates.is_empty() {
        update_file_fields(&task.path, updates)?;
    }

    // Handle body update separately (if provided)
    if let Some(new_body) = update.body {
        let content = fs::read_to_string(&task.path)
            .map_err(|e| VaultError::read_error(&task.path, e.to_string()))?;

        let (mapping, _old_body) = parse_file_parts(&content)?;
        let frontmatter = serialize_yaml(&mapping)?;
        let new_content = reconstruct_file(&frontmatter, &new_body);

        atomic_write(Path::new(&task.path), &new_content)?;
    }

    // Parse and return the updated task
    parse_task_file(&task.path)
}

/// Update a project by ID.
pub fn update_project(project: &Project, update: ProjectUpdate) -> Result<Project, VaultError> {
    let mut updates = Vec::new();

    if let Some(title) = update.title {
        updates.push(FieldUpdate {
            field: "title".to_string(),
            value: Some(title),
        });
    }

    if let Some(status) = update.status {
        let status_str = match status {
            ProjectStatus::Planning => "planning",
            ProjectStatus::Ready => "ready",
            ProjectStatus::Blocked => "blocked",
            ProjectStatus::InProgress => "in-progress",
            ProjectStatus::Paused => "paused",
            ProjectStatus::Done => "done",
        };
        updates.push(FieldUpdate {
            field: "status".to_string(),
            value: Some(status_str.to_string()),
        });
    }

    if let Some(area) = update.area {
        updates.push(FieldUpdate {
            field: "area".to_string(),
            value: if area.is_empty() { None } else { Some(area) },
        });
    }

    if let Some(description) = update.description {
        updates.push(FieldUpdate {
            field: "description".to_string(),
            value: if description.is_empty() {
                None
            } else {
                Some(description)
            },
        });
    }

    if let Some(start_date) = update.start_date {
        updates.push(FieldUpdate {
            field: "start-date".to_string(),
            value: if start_date.is_empty() {
                None
            } else {
                Some(start_date)
            },
        });
    }

    if let Some(end_date) = update.end_date {
        updates.push(FieldUpdate {
            field: "end-date".to_string(),
            value: if end_date.is_empty() {
                None
            } else {
                Some(end_date)
            },
        });
    }

    if !updates.is_empty() {
        update_file_fields(&project.path, updates)?;
    }

    // Handle body update separately (if provided)
    if let Some(new_body) = update.body {
        let content = fs::read_to_string(&project.path)
            .map_err(|e| VaultError::read_error(&project.path, e.to_string()))?;

        let (mapping, _old_body) = parse_file_parts(&content)?;
        let frontmatter = serialize_yaml(&mapping)?;
        let new_content = reconstruct_file(&frontmatter, &new_body);

        atomic_write(Path::new(&project.path), &new_content)?;
    }

    // Parse and return the updated project
    parse_project_file(&project.path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_slugify_basic() {
        assert_eq!(slugify("Hello World"), "hello-world");
        assert_eq!(slugify("My Task"), "my-task");
        assert_eq!(slugify("test"), "test");
    }

    #[test]
    fn test_slugify_special_chars() {
        assert_eq!(slugify("Hello! World?"), "hello-world");
        assert_eq!(slugify("Task (important)"), "task-important");
        assert_eq!(slugify("Fix: login bug"), "fix-login-bug");
    }

    #[test]
    fn test_slugify_multiple_spaces() {
        assert_eq!(slugify("Hello   World"), "hello-world");
        assert_eq!(slugify("A  B  C"), "a-b-c");
    }

    #[test]
    fn test_slugify_underscores() {
        assert_eq!(slugify("hello_world"), "hello-world");
        assert_eq!(slugify("my_task_name"), "my-task-name");
    }

    #[test]
    fn test_slugify_empty() {
        assert_eq!(slugify(""), "untitled");
        assert_eq!(slugify("!!!"), "untitled");
    }

    #[test]
    fn test_slugify_long_title() {
        let long_title = "a".repeat(150);
        let slug = slugify(&long_title);
        assert!(slug.len() <= 100);
    }

    #[test]
    fn test_unique_filename_no_conflict() {
        let temp = TempDir::new().unwrap();
        let filename = unique_filename(temp.path(), "my-task");
        assert_eq!(filename, "my-task.md");
    }

    #[test]
    fn test_unique_filename_with_conflict() {
        let temp = TempDir::new().unwrap();
        fs::write(temp.path().join("my-task.md"), "existing").unwrap();

        let filename = unique_filename(temp.path(), "my-task");
        assert_eq!(filename, "my-task-1.md");
    }

    #[test]
    fn test_unique_filename_multiple_conflicts() {
        let temp = TempDir::new().unwrap();
        fs::write(temp.path().join("my-task.md"), "existing").unwrap();
        fs::write(temp.path().join("my-task-1.md"), "existing").unwrap();
        fs::write(temp.path().join("my-task-2.md"), "existing").unwrap();

        let filename = unique_filename(temp.path(), "my-task");
        assert_eq!(filename, "my-task-3.md");
    }

    #[test]
    fn test_create_task_minimal() {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().to_string_lossy().to_string();

        let options = CreateTaskOptions {
            title: Some("Test Task".to_string()),
            ..Default::default()
        };

        let task = create_task_file(&tasks_dir, options).unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, TaskStatus::Inbox);
        assert!(task.created_at.is_some());
        assert!(task.updated_at.is_some());
    }

    #[test]
    fn test_create_task_with_fields() {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().to_string_lossy().to_string();

        let options = CreateTaskOptions {
            title: Some("Full Task".to_string()),
            status: Some(TaskStatus::Ready),
            project_id: Some("Q1 Planning".to_string()),
            area_id: Some("Work".to_string()),
            due: Some("2025-01-15".to_string()),
            ..Default::default()
        };

        let task = create_task_file(&tasks_dir, options).unwrap();

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.status, TaskStatus::Ready);
        assert_eq!(task.project, Some("[[Q1 Planning]]".to_string()));
        assert_eq!(task.area, Some("[[Work]]".to_string()));
        assert_eq!(task.due, Some("2025-01-15".to_string()));
    }

    #[test]
    fn test_preserves_unknown_fields() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        let content = r#"---
title: Test Task
status: ready
priority: high
my-custom-field: some value
---
Body content here.
"#;
        fs::write(&file_path, content).unwrap();

        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("in-progress".to_string()),
        }];
        update_file_fields(file_path.to_str().unwrap(), updates).unwrap();

        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(updated_content.contains("priority: high"));
        assert!(updated_content.contains("my-custom-field: some value"));
        assert!(updated_content.contains("status: in-progress"));
        assert!(updated_content.contains("Body content here."));
    }

    #[test]
    fn test_preserves_body_content() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        let body = r#"## Notes

- Point 1
- Point 2

### Details

Some **bold** and _italic_ text.
"#;

        let content = format!(
            r#"---
title: Test Task
status: ready
---
{body}"#
        );
        fs::write(&file_path, content).unwrap();

        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("done".to_string()),
        }];
        update_file_fields(file_path.to_str().unwrap(), updates).unwrap();

        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(updated_content.contains("## Notes"));
        assert!(updated_content.contains("- Point 1"));
        assert!(updated_content.contains("### Details"));
    }

    #[test]
    fn test_update_sets_completed_at_for_done() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        let content = r#"---
title: Test Task
status: ready
---
"#;
        fs::write(&file_path, content).unwrap();

        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("done".to_string()),
        }];
        update_file_fields(file_path.to_str().unwrap(), updates).unwrap();

        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(updated_content.contains("completed-at:"));
    }

    #[test]
    fn test_update_removes_field() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        let content = r#"---
title: Test Task
status: ready
due: 2025-01-15
---
"#;
        fs::write(&file_path, content).unwrap();

        let updates = vec![FieldUpdate {
            field: "due".to_string(),
            value: None,
        }];
        update_file_fields(file_path.to_str().unwrap(), updates).unwrap();

        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(!updated_content.contains("due:"));
        assert!(updated_content.contains("title: Test Task"));
    }

    #[test]
    fn test_atomic_write_creates_file() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("new-file.md");

        atomic_write(&file_path, "test content").unwrap();

        assert!(file_path.exists());
        assert_eq!(fs::read_to_string(&file_path).unwrap(), "test content");
    }

    #[test]
    fn test_atomic_write_creates_parent_dirs() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("nested/subdir/file.md");

        atomic_write(&file_path, "nested content").unwrap();

        assert!(file_path.exists());
        assert_eq!(fs::read_to_string(&file_path).unwrap(), "nested content");
    }
}
