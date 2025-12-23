use gray_matter::{Matter, engine::YAML};
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Task status enum matching the spec
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
#[napi(string_enum)]
pub enum TaskStatus {
    Inbox,
    Icebox,
    Ready,
    InProgress,
    Blocked,
    Dropped,
    Done,
}

/// Frontmatter structure for tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct TaskFrontmatter {
    title: String,
    status: TaskStatus,
    #[serde(default)]
    created_at: Option<String>,
    #[serde(default)]
    updated_at: Option<String>,
    #[serde(default)]
    completed_at: Option<String>,
    #[serde(default)]
    due: Option<String>,
    #[serde(default)]
    scheduled: Option<String>,
    #[serde(default)]
    defer_until: Option<String>,
    #[serde(default)]
    area: Option<String>,
    #[serde(default)]
    projects: Option<Vec<String>>,
}

/// Task struct exposed to TypeScript via NAPI
#[derive(Debug, Clone)]
#[napi(object)]
pub struct Task {
    /// File path to the task
    pub path: String,
    /// Task title from frontmatter
    pub title: String,
    /// Task status
    pub status: TaskStatus,
    /// Creation date (ISO 8601)
    pub created_at: Option<String>,
    /// Last update date (ISO 8601)
    pub updated_at: Option<String>,
    /// Completion date (ISO 8601)
    pub completed_at: Option<String>,
    /// Due date (ISO 8601)
    pub due: Option<String>,
    /// Scheduled date (ISO 8601)
    pub scheduled: Option<String>,
    /// Defer until date (ISO 8601)
    pub defer_until: Option<String>,
    /// Area reference (WikiLink)
    pub area: Option<String>,
    /// Project reference (WikiLink) - first element of projects array
    pub project: Option<String>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

/// Parse a task file and return the Task struct
/// Returns null if the file cannot be parsed
#[napi]
pub fn parse_task_file(file_path: String) -> Result<Task> {
    let path = Path::new(&file_path);

    // Check file exists
    if !path.exists() {
        return Err(Error::new(
            Status::GenericFailure,
            format!("File not found: {}", file_path),
        ));
    }

    // Read file contents
    let content = fs::read_to_string(path).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to read file: {}", e),
        )
    })?;

    // Parse frontmatter
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse::<TaskFrontmatter>(&content).map_err(|e| {
        Error::new(
            Status::GenericFailure,
            format!("Failed to parse frontmatter: {}", e),
        )
    })?;

    // Extract frontmatter data
    let frontmatter = parsed
        .data
        .ok_or_else(|| Error::new(Status::GenericFailure, "No frontmatter found"))?;

    // Extract project from projects array (first element)
    let project = frontmatter
        .projects
        .and_then(|p: Vec<String>| p.into_iter().next());

    Ok(Task {
        path: file_path,
        title: frontmatter.title,
        status: frontmatter.status,
        created_at: frontmatter.created_at,
        updated_at: frontmatter.updated_at,
        completed_at: frontmatter.completed_at,
        due: frontmatter.due,
        scheduled: frontmatter.scheduled,
        defer_until: frontmatter.defer_until,
        area: frontmatter.area,
        project,
        body: parsed.content.trim().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_temp_task(content: &str) -> NamedTempFile {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file
    }

    #[test]
    fn parse_minimal_task() {
        let content = r#"---
title: Test Task
status: ready
---
Some body content.
"#;
        let file = create_temp_task(content);
        let task = parse_task_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(task.title, "Test Task");
        assert_eq!(task.status, TaskStatus::Ready);
        assert_eq!(task.body, "Some body content.");
    }

    #[test]
    fn parse_task_with_all_fields() {
        let content = r#"---
title: Full Task
status: in-progress
created-at: 2025-01-10
updated-at: 2025-01-14
due: 2025-01-15
scheduled: 2025-01-14
projects:
  - "[[Q1 Planning]]"
area: "[[Work]]"
---
## Notes
Some notes here.
"#;
        let file = create_temp_task(content);
        let task = parse_task_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(task.title, "Full Task");
        assert_eq!(task.status, TaskStatus::InProgress);
        assert_eq!(task.due, Some("2025-01-15".to_string()));
        assert_eq!(task.project, Some("[[Q1 Planning]]".to_string()));
        assert_eq!(task.area, Some("[[Work]]".to_string()));
        assert!(task.body.contains("## Notes"));
    }

    #[test]
    fn parse_nonexistent_file() {
        let result = parse_task_file("/nonexistent/path.md".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn parse_task_missing_title() {
        let content = r#"---
status: ready
---
Body content.
"#;
        let file = create_temp_task(content);
        let result = parse_task_file(file.path().to_str().unwrap().to_string());
        assert!(result.is_err());
    }

    #[test]
    fn parse_task_invalid_status() {
        let content = r#"---
title: Test
status: invalid-status
---
Body.
"#;
        let file = create_temp_task(content);
        let result = parse_task_file(file.path().to_str().unwrap().to_string());
        assert!(result.is_err());
    }

    #[test]
    fn parse_task_malformed_yaml() {
        let content = r#"---
title: Test
status ready
---"#;
        let file = create_temp_task(content);
        let result = parse_task_file(file.path().to_str().unwrap().to_string());
        assert!(result.is_err());
    }
}
