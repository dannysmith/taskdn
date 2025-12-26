//! File writing infrastructure with round-trip fidelity.
//!
//! This module handles creating and updating task, project, and area files
//! while preserving unknown frontmatter fields, date formats, and body content.
//!
//! Key design principle: Don't round-trip through typed structs. Instead,
//! manipulate raw YAML to preserve structure the typed structs would discard.

use crate::{Area, Project, Task, TdnError, parse_area_file, parse_project_file, parse_task_file};
use gray_matter::{Matter, engine::YAML};
use napi::bindgen_prelude::*;
use serde::Deserialize;
use std::fs;
use std::path::Path;

// ============================================================================
// NAPI-Exposed Types
// ============================================================================

/// Fields for creating a new task
#[derive(Debug, Clone)]
#[napi(object)]
pub struct TaskCreateFields {
    pub status: Option<String>,
    pub project: Option<String>,
    pub area: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
}

/// Fields for creating a new project
#[derive(Debug, Clone)]
#[napi(object)]
pub struct ProjectCreateFields {
    pub status: Option<String>,
    pub area: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

/// Fields for creating a new area
#[derive(Debug, Clone)]
#[napi(object)]
pub struct AreaCreateFields {
    pub status: Option<String>,
    pub area_type: Option<String>,
    pub description: Option<String>,
}

/// A single field update for targeted file modifications
#[derive(Debug, Clone)]
#[napi(object)]
pub struct FieldUpdate {
    /// The frontmatter field name (e.g., "status", "due")
    pub field: String,
    /// The new value, or None to remove the field
    pub value: Option<String>,
}

// ============================================================================
// Helper Utilities
// ============================================================================

/// Convert a title to a filename-safe slug.
///
/// Rules:
/// - Convert to lowercase
/// - Replace spaces and underscores with hyphens
/// - Remove special characters except hyphens
/// - Collapse multiple hyphens
/// - Trim leading/trailing hyphens
/// - Truncate to reasonable length (100 chars)
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
        // Don't end on a hyphen after truncation
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
///
/// Given "my-task" and a directory, returns:
/// - "my-task.md" if it doesn't exist
/// - "my-task-1.md" if my-task.md exists
/// - "my-task-2.md" if both exist, etc.
pub fn unique_filename(dir: &Path, base_slug: &str) -> String {
    let base_path = dir.join(format!("{}.md", base_slug));
    if !base_path.exists() {
        return format!("{}.md", base_slug);
    }

    let mut counter = 1;
    loop {
        let filename = format!("{}-{}.md", base_slug, counter);
        let path = dir.join(&filename);
        if !path.exists() {
            return filename;
        }
        counter += 1;
        // Safety limit to avoid infinite loops
        if counter > 10000 {
            return format!("{}-{}.md", base_slug, uuid_simple());
        }
    }
}

/// Generate a simple UUID-like string for edge cases.
fn uuid_simple() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{:x}", duration.as_nanos())
}

/// Get current timestamp in ISO 8601 format (UTC).
/// Format: YYYY-MM-DDTHH:MM:SSZ
/// TODO: Consider using chrono for production if more timezone flexibility is needed.
pub fn now_iso8601() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();

    let secs = now.as_secs();

    // Calculate UTC components
    let days = secs / 86400;
    let remaining = secs % 86400;
    let hours = remaining / 3600;
    let minutes = (remaining % 3600) / 60;
    let seconds = remaining % 60;

    // Calculate date from days since epoch (1970-01-01)
    let (year, month, day) = days_to_ymd(days);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

/// Convert days since Unix epoch to (year, month, day).
fn days_to_ymd(days: u64) -> (i32, u32, u32) {
    // Simplified algorithm - days since 1970-01-01
    let mut remaining_days = days as i64;
    let mut year = 1970i32;

    // Find the year
    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    // Find the month and day
    let days_in_months: [i64; 12] = if is_leap_year(year) {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut month = 1u32;
    for &days_in_month in &days_in_months {
        if remaining_days < days_in_month {
            break;
        }
        remaining_days -= days_in_month;
        month += 1;
    }

    let day = (remaining_days + 1) as u32;

    (year, month, day)
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

/// Atomically write content to a file.
///
/// Writes to a temporary file first, then renames to avoid partial writes.
pub fn atomic_write(path: &Path, content: &str) -> Result<()> {
    let path_str = path.display().to_string();
    let parent = path.parent().ok_or_else(|| {
        TdnError::validation_error(&path_str, "path", "Invalid path - no parent directory")
    })?;

    // Create parent directory if it doesn't exist
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| {
            TdnError::write_error(&path_str, format!("Failed to create directory: {}", e))
        })?;
    }

    // Generate temp file name in same directory
    let temp_filename = format!(".tmp-{}", uuid_simple());
    let temp_path = parent.join(temp_filename);

    // Write to temp file
    fs::write(&temp_path, content).map_err(|e| {
        TdnError::write_error(&path_str, format!("Failed to write temp file: {}", e))
    })?;

    // Sync to disk (fsync) to ensure durability before rename
    let file = fs::File::open(&temp_path).map_err(|e| {
        TdnError::write_error(&path_str, format!("Failed to open temp file for sync: {}", e))
    })?;
    file.sync_all().map_err(|e| {
        TdnError::write_error(&path_str, format!("Failed to sync file to disk: {}", e))
    })?;

    // Rename temp file to target (atomic on most filesystems)
    fs::rename(&temp_path, path).map_err(|e| {
        // Clean up temp file on failure
        let _ = fs::remove_file(&temp_path);
        TdnError::write_error(&path_str, format!("Failed to rename file: {}", e))
    })?;

    Ok(())
}

// ============================================================================
// YAML Manipulation Helpers
// ============================================================================

/// Minimal struct for gray_matter parsing - we just need the raw matter string
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct MinimalFrontmatter {
    #[serde(default)]
    title: Option<String>,
}

/// Parse file content into (raw YAML mapping, body content).
fn parse_file_parts(content: &str) -> Result<(serde_yaml::Mapping, String)> {
    let matter = Matter::<YAML>::new();
    // Parse with a minimal struct - we only need access to .matter and .content
    let parsed = matter.parse::<MinimalFrontmatter>(content).map_err(|e| {
        TdnError::parse_error("(content)", None, e.to_string())
    })?;

    // Get the raw YAML string from between the --- delimiters
    let yaml_str = parsed.matter;

    // Parse as a generic mapping to preserve structure
    let mapping: serde_yaml::Mapping = if yaml_str.is_empty() {
        serde_yaml::Mapping::new()
    } else {
        serde_yaml::from_str(&yaml_str).map_err(|e| {
            TdnError::parse_error("(content)", None, format!("Failed to parse YAML: {}", e))
        })?
    };

    Ok((mapping, parsed.content.to_string()))
}

/// Set a field in a YAML mapping, preserving existing field order where possible.
fn set_yaml_field(mapping: &mut serde_yaml::Mapping, key: &str, value: serde_yaml::Value) {
    let yaml_key = serde_yaml::Value::String(key.to_string());
    mapping.insert(yaml_key, value);
}

/// Remove a field from a YAML mapping.
fn remove_yaml_field(mapping: &mut serde_yaml::Mapping, key: &str) {
    let yaml_key = serde_yaml::Value::String(key.to_string());
    mapping.remove(&yaml_key);
}

/// Serialize a YAML mapping to string with proper formatting.
fn serialize_yaml(mapping: &serde_yaml::Mapping) -> Result<String> {
    serde_yaml::to_string(mapping).map_err(|e| {
        TdnError::write_error("(content)", format!("Failed to serialize YAML: {}", e)).into()
    })
}

/// Reconstruct a complete file from frontmatter and body.
fn reconstruct_file(frontmatter: &str, body: &str) -> String {
    if body.is_empty() {
        format!("---\n{}---\n", frontmatter)
    } else {
        format!("---\n{}---\n{}", frontmatter, body)
    }
}

// ============================================================================
// Create Operations
// ============================================================================

/// Create a new task file with the given title and optional fields.
///
/// Returns the created task after parsing (for validation and return to caller).
#[napi]
pub fn create_task_file(
    tasks_dir: String,
    title: String,
    fields: TaskCreateFields,
) -> Result<Task> {
    let dir = Path::new(&tasks_dir);

    // Generate filename
    let slug = slugify(&title);
    let filename = unique_filename(dir, &slug);
    let file_path = dir.join(&filename);

    // Build frontmatter
    let mut mapping = serde_yaml::Mapping::new();

    // Required fields
    set_yaml_field(
        &mut mapping,
        "title",
        serde_yaml::Value::String(title.clone()),
    );

    // Status (default to inbox)
    let status = fields.status.as_deref().unwrap_or("inbox");
    set_yaml_field(
        &mut mapping,
        "status",
        serde_yaml::Value::String(status.to_string()),
    );

    // Timestamps
    let now = now_iso8601();
    set_yaml_field(
        &mut mapping,
        "created-at",
        serde_yaml::Value::String(now.clone()),
    );
    set_yaml_field(&mut mapping, "updated-at", serde_yaml::Value::String(now));

    // Optional fields
    if let Some(project) = &fields.project {
        // Store as projects array with wikilink format
        let wikilink = if project.starts_with("[[") {
            project.clone()
        } else {
            format!("[[{}]]", project)
        };
        let projects_array = serde_yaml::Value::Sequence(vec![serde_yaml::Value::String(wikilink)]);
        set_yaml_field(&mut mapping, "projects", projects_array);
    }

    if let Some(area) = &fields.area {
        let wikilink = if area.starts_with("[[") {
            area.clone()
        } else {
            format!("[[{}]]", area)
        };
        set_yaml_field(&mut mapping, "area", serde_yaml::Value::String(wikilink));
    }

    if let Some(due) = &fields.due {
        set_yaml_field(&mut mapping, "due", serde_yaml::Value::String(due.clone()));
    }

    if let Some(scheduled) = &fields.scheduled {
        set_yaml_field(
            &mut mapping,
            "scheduled",
            serde_yaml::Value::String(scheduled.clone()),
        );
    }

    if let Some(defer_until) = &fields.defer_until {
        set_yaml_field(
            &mut mapping,
            "defer-until",
            serde_yaml::Value::String(defer_until.clone()),
        );
    }

    // Serialize and write
    let frontmatter = serialize_yaml(&mapping)?;
    let content = reconstruct_file(&frontmatter, "");

    atomic_write(&file_path, &content)?;

    // Parse and return the created task
    // If parsing fails, remove the orphaned file
    let path_str = file_path.to_string_lossy().to_string();
    match parse_task_file(path_str) {
        Ok(task) => Ok(task),
        Err(e) => {
            // Attempt to remove the file, but prioritize returning the original parse error
            let _ = std::fs::remove_file(&file_path);
            Err(e)
        }
    }
}

/// Create a new project file with the given title and optional fields.
#[napi]
pub fn create_project_file(
    projects_dir: String,
    title: String,
    fields: ProjectCreateFields,
) -> Result<Project> {
    let dir = Path::new(&projects_dir);

    // Generate filename
    let slug = slugify(&title);
    let filename = unique_filename(dir, &slug);
    let file_path = dir.join(&filename);

    // Build frontmatter
    let mut mapping = serde_yaml::Mapping::new();

    // Required fields
    set_yaml_field(
        &mut mapping,
        "title",
        serde_yaml::Value::String(title.clone()),
    );

    // Optional status
    if let Some(status) = &fields.status {
        set_yaml_field(
            &mut mapping,
            "status",
            serde_yaml::Value::String(status.clone()),
        );
    }

    // Optional area
    if let Some(area) = &fields.area {
        let wikilink = if area.starts_with("[[") {
            area.clone()
        } else {
            format!("[[{}]]", area)
        };
        set_yaml_field(&mut mapping, "area", serde_yaml::Value::String(wikilink));
    }

    // Optional description
    if let Some(description) = &fields.description {
        set_yaml_field(
            &mut mapping,
            "description",
            serde_yaml::Value::String(description.clone()),
        );
    }

    // Optional dates
    if let Some(start_date) = &fields.start_date {
        set_yaml_field(
            &mut mapping,
            "start-date",
            serde_yaml::Value::String(start_date.clone()),
        );
    }

    if let Some(end_date) = &fields.end_date {
        set_yaml_field(
            &mut mapping,
            "end-date",
            serde_yaml::Value::String(end_date.clone()),
        );
    }

    // Serialize and write
    let frontmatter = serialize_yaml(&mapping)?;
    let content = reconstruct_file(&frontmatter, "");

    atomic_write(&file_path, &content)?;

    // Parse and return the created project
    // If parsing fails, remove the orphaned file
    let path_str = file_path.to_string_lossy().to_string();
    match parse_project_file(path_str) {
        Ok(project) => Ok(project),
        Err(e) => {
            // Attempt to remove the file, but prioritize returning the original parse error
            let _ = std::fs::remove_file(&file_path);
            Err(e)
        }
    }
}

/// Create a new area file with the given title and optional fields.
#[napi]
pub fn create_area_file(
    areas_dir: String,
    title: String,
    fields: AreaCreateFields,
) -> Result<Area> {
    let dir = Path::new(&areas_dir);

    // Generate filename
    let slug = slugify(&title);
    let filename = unique_filename(dir, &slug);
    let file_path = dir.join(&filename);

    // Build frontmatter
    let mut mapping = serde_yaml::Mapping::new();

    // Required fields
    set_yaml_field(
        &mut mapping,
        "title",
        serde_yaml::Value::String(title.clone()),
    );

    // Status (default to active for areas)
    let status = fields.status.as_deref().unwrap_or("active");
    set_yaml_field(
        &mut mapping,
        "status",
        serde_yaml::Value::String(status.to_string()),
    );

    // Optional type
    if let Some(area_type) = &fields.area_type {
        set_yaml_field(
            &mut mapping,
            "type",
            serde_yaml::Value::String(area_type.clone()),
        );
    }

    // Optional description
    if let Some(description) = &fields.description {
        set_yaml_field(
            &mut mapping,
            "description",
            serde_yaml::Value::String(description.clone()),
        );
    }

    // Serialize and write
    let frontmatter = serialize_yaml(&mapping)?;
    let content = reconstruct_file(&frontmatter, "");

    atomic_write(&file_path, &content)?;

    // Parse and return the created area
    // If parsing fails, remove the orphaned file
    let path_str = file_path.to_string_lossy().to_string();
    match parse_area_file(path_str) {
        Ok(area) => Ok(area),
        Err(e) => {
            // Attempt to remove the file, but prioritize returning the original parse error
            let _ = std::fs::remove_file(&file_path);
            Err(e)
        }
    }
}

// ============================================================================
// Update Operations
// ============================================================================

/// Update specific fields in an existing file while preserving round-trip fidelity.
///
/// This function:
/// - Preserves unknown frontmatter fields
/// - Preserves date format choices (date vs datetime)
/// - Preserves body content exactly
/// - Updates the `updated-at` timestamp
/// - Uses atomic writes
#[napi]
pub fn update_file_fields(path: String, updates: Vec<FieldUpdate>) -> Result<()> {
    let file_path = Path::new(&path);

    // Check file exists
    if !file_path.exists() {
        return Err(TdnError::file_not_found(&path).into());
    }

    // Read original content
    let content = fs::read_to_string(file_path).map_err(|e| {
        TdnError::file_read_error(&path, e.to_string())
    })?;

    // Parse into parts
    let (mut mapping, body) = parse_file_parts(&content)?;

    // Apply updates
    for update in updates {
        match update.value {
            Some(value) => {
                // Handle special cases for array fields
                if update.field == "projects" || update.field == "project" {
                    // Convert project to projects array with wikilink
                    let wikilink = if value.starts_with("[[") {
                        value
                    } else {
                        format!("[[{}]]", value)
                    };
                    let projects_array =
                        serde_yaml::Value::Sequence(vec![serde_yaml::Value::String(wikilink)]);
                    set_yaml_field(&mut mapping, "projects", projects_array);
                } else if update.field == "area" && !value.starts_with("[[") {
                    // Wrap area in wikilink if needed
                    let wikilink = format!("[[{}]]", value);
                    set_yaml_field(
                        &mut mapping,
                        &update.field,
                        serde_yaml::Value::String(wikilink),
                    );
                } else {
                    set_yaml_field(
                        &mut mapping,
                        &update.field,
                        serde_yaml::Value::String(value),
                    );
                }
            }
            None => {
                // Remove the field (handle "project" -> "projects" alias)
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
        serde_yaml::Value::String(now_iso8601()),
    );

    // Handle completed-at for status changes to done/dropped
    let status_key = serde_yaml::Value::String("status".to_string());
    if let Some(serde_yaml::Value::String(status)) = mapping.get(&status_key)
        && (status == "done" || status == "dropped")
    {
        let completed_key = serde_yaml::Value::String("completed-at".to_string());
        if !mapping.contains_key(&completed_key) {
            set_yaml_field(
                &mut mapping,
                "completed-at",
                serde_yaml::Value::String(now_iso8601()),
            );
        }
    }

    // Serialize and write
    let frontmatter = serialize_yaml(&mapping)?;
    let new_content = reconstruct_file(&frontmatter, &body);

    atomic_write(file_path, &new_content)?;

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
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

        // Create existing file
        fs::write(temp.path().join("my-task.md"), "existing").unwrap();

        let filename = unique_filename(temp.path(), "my-task");
        assert_eq!(filename, "my-task-1.md");
    }

    #[test]
    fn test_unique_filename_multiple_conflicts() {
        let temp = TempDir::new().unwrap();

        // Create multiple existing files
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

        let fields = TaskCreateFields {
            status: None,
            project: None,
            area: None,
            due: None,
            scheduled: None,
            defer_until: None,
        };

        let task = create_task_file(tasks_dir, "Test Task".to_string(), fields).unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, crate::TaskStatus::Inbox);
        assert!(task.created_at.is_some());
        assert!(task.updated_at.is_some());
    }

    #[test]
    fn test_create_task_with_fields() {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().to_string_lossy().to_string();

        let fields = TaskCreateFields {
            status: Some("ready".to_string()),
            project: Some("Q1 Planning".to_string()),
            area: Some("Work".to_string()),
            due: Some("2025-01-15".to_string()),
            scheduled: None,
            defer_until: None,
        };

        let task = create_task_file(tasks_dir, "Full Task".to_string(), fields).unwrap();

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.status, crate::TaskStatus::Ready);
        assert_eq!(task.project, Some("[[Q1 Planning]]".to_string()));
        assert_eq!(task.area, Some("[[Work]]".to_string()));
        assert_eq!(task.due, Some("2025-01-15".to_string()));
    }

    #[test]
    fn test_create_project_minimal() {
        let temp = TempDir::new().unwrap();
        let projects_dir = temp.path().to_string_lossy().to_string();

        let fields = ProjectCreateFields {
            status: None,
            area: None,
            description: None,
            start_date: None,
            end_date: None,
        };

        let project =
            create_project_file(projects_dir, "Test Project".to_string(), fields).unwrap();

        assert_eq!(project.title, "Test Project");
        assert_eq!(project.status, None);
    }

    #[test]
    fn test_create_area_minimal() {
        let temp = TempDir::new().unwrap();
        let areas_dir = temp.path().to_string_lossy().to_string();

        let fields = AreaCreateFields {
            status: None,
            area_type: None,
            description: None,
        };

        let area = create_area_file(areas_dir, "Test Area".to_string(), fields).unwrap();

        assert_eq!(area.title, "Test Area");
        assert_eq!(area.status, Some(crate::AreaStatus::Active));
    }

    #[test]
    fn test_preserves_unknown_fields() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        // Create file with custom field
        let content = r#"---
title: Test Task
status: ready
priority: high
my-custom-field: some value
---
Body content here.
"#;
        fs::write(&file_path, content).unwrap();

        // Update status
        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("in-progress".to_string()),
        }];
        update_file_fields(file_path.to_string_lossy().to_string(), updates).unwrap();

        // Read back and verify custom fields preserved
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

```rust
fn main() {
    println!("Hello");
}
```
"#;

        let content = format!(
            r#"---
title: Test Task
status: ready
---
{}"#,
            body
        );
        fs::write(&file_path, content).unwrap();

        // Update status
        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("done".to_string()),
        }];
        update_file_fields(file_path.to_string_lossy().to_string(), updates).unwrap();

        // Read back and verify body preserved
        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(updated_content.contains("## Notes"));
        assert!(updated_content.contains("- Point 1"));
        assert!(updated_content.contains("```rust"));
        assert!(updated_content.contains("println!(\"Hello\");"));
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

        // Update to done
        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("done".to_string()),
        }];
        update_file_fields(file_path.to_string_lossy().to_string(), updates).unwrap();

        // Verify completed-at is set
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

        // Remove due field
        let updates = vec![FieldUpdate {
            field: "due".to_string(),
            value: None,
        }];
        update_file_fields(file_path.to_string_lossy().to_string(), updates).unwrap();

        // Verify due is removed
        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(!updated_content.contains("due:"));
        assert!(updated_content.contains("title: Test Task"));
    }

    #[test]
    fn test_duplicate_filename_handling() {
        let temp = TempDir::new().unwrap();
        let tasks_dir = temp.path().to_string_lossy().to_string();

        let fields = TaskCreateFields {
            status: None,
            project: None,
            area: None,
            due: None,
            scheduled: None,
            defer_until: None,
        };

        // Create first task
        let task1 =
            create_task_file(tasks_dir.clone(), "Same Title".to_string(), fields.clone()).unwrap();
        assert!(task1.path.ends_with("same-title.md"));

        // Create second task with same title
        let task2 =
            create_task_file(tasks_dir.clone(), "Same Title".to_string(), fields.clone()).unwrap();
        assert!(task2.path.ends_with("same-title-1.md"));

        // Create third
        let task3 = create_task_file(tasks_dir, "Same Title".to_string(), fields).unwrap();
        assert!(task3.path.ends_with("same-title-2.md"));
    }

    #[test]
    fn test_preserves_date_format() {
        let temp = TempDir::new().unwrap();
        let file_path = temp.path().join("task.md");

        // Create file with date-only format (not datetime)
        let content = r#"---
title: Test Task
status: ready
due: 2025-01-15
scheduled: 2025-02-01
---
"#;
        fs::write(&file_path, content).unwrap();

        // Update status (should not affect date fields)
        let updates = vec![FieldUpdate {
            field: "status".to_string(),
            value: Some("in-progress".to_string()),
        }];
        update_file_fields(file_path.to_string_lossy().to_string(), updates).unwrap();

        // Read back and verify date format is preserved (date-only, not datetime)
        let updated_content = fs::read_to_string(&file_path).unwrap();
        assert!(
            updated_content.contains("due: 2025-01-15")
                || updated_content.contains("due: '2025-01-15'"),
            "Due date should be preserved as date-only format"
        );
        assert!(
            updated_content.contains("scheduled: 2025-02-01")
                || updated_content.contains("scheduled: '2025-02-01'"),
            "Scheduled date should be preserved as date-only format"
        );
        // Should NOT contain datetime format
        assert!(
            !updated_content.contains("2025-01-15T"),
            "Due date should not be converted to datetime"
        );
        assert!(
            !updated_content.contains("2025-02-01T"),
            "Scheduled date should not be converted to datetime"
        );
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
