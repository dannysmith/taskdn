//! File writing with field preservation.
//!
//! This module handles writing task/project/area files while preserving
//! unknown frontmatter fields and the markdown body.

use crate::error::Result;
use crate::types::{
    Area, DateTimeValue, ParsedArea, ParsedProject, ParsedTask, Project, Task, TaskStatus,
};
use std::collections::HashMap;
use std::fmt::{self, Display, Write as FmtWrite};
use std::fs;
use std::path::Path;

/// Helper to format a YAML string value with proper quoting.
///
/// Quotes the value if it contains special characters that would be
/// interpreted by YAML parsers.
fn yaml_string(value: &str) -> String {
    // Check if the value needs quoting
    let needs_quoting = value.is_empty()
        || value.contains(':')
        || value.contains('#')
        || value.contains('\n')
        || value.contains('"')
        || value.contains('\'')
        || value.contains('[')
        || value.contains(']')
        || value.contains('{')
        || value.contains('}')
        || value.contains('|')
        || value.contains('>')
        || value.contains('*')
        || value.contains('&')
        || value.contains('!')
        || value.contains('%')
        || value.contains('@')
        || value.contains('`')
        || value.starts_with(' ')
        || value.ends_with(' ')
        || value.starts_with('-')
        || value.starts_with('?')
        || value == "true"
        || value == "false"
        || value == "null"
        || value == "yes"
        || value == "no"
        || value == "on"
        || value == "off"
        // Check if it looks like a number
        || value.parse::<f64>().is_ok();

    if needs_quoting {
        // Use double quotes and escape internal double quotes
        let escaped = value.replace('\\', "\\\\").replace('"', "\\\"");
        format!("\"{escaped}\"")
    } else {
        value.to_string()
    }
}

/// Helper to serialize a `serde_yaml::Value` to a YAML string.
fn yaml_value_to_string(value: &serde_yaml::Value, indent: usize) -> String {
    match value {
        serde_yaml::Value::Null => "null".to_string(),
        serde_yaml::Value::Bool(b) => b.to_string(),
        serde_yaml::Value::Number(n) => n.to_string(),
        serde_yaml::Value::String(s) => yaml_string(s),
        serde_yaml::Value::Sequence(seq) => {
            if seq.is_empty() {
                return "[]".to_string();
            }
            let mut result = String::new();
            for item in seq {
                result.push('\n');
                for _ in 0..indent {
                    result.push(' ');
                }
                result.push_str("- ");
                let item_str = yaml_value_to_string(item, indent + 2);
                result.push_str(&item_str);
            }
            result
        }
        serde_yaml::Value::Mapping(map) => {
            if map.is_empty() {
                return "{}".to_string();
            }
            let mut result = String::new();
            for (k, v) in map {
                result.push('\n');
                for _ in 0..indent {
                    result.push(' ');
                }
                if let serde_yaml::Value::String(key) = k {
                    result.push_str(key);
                } else {
                    result.push_str(&yaml_value_to_string(k, indent));
                }
                result.push_str(": ");
                result.push_str(&yaml_value_to_string(v, indent + 2));
            }
            result
        }
        serde_yaml::Value::Tagged(tagged) => yaml_value_to_string(&tagged.value, indent),
    }
}

/// Serialize extra fields to YAML lines.
fn serialize_extra_fields(extra: &HashMap<String, serde_yaml::Value>) -> String {
    if extra.is_empty() {
        return String::new();
    }

    let mut result = String::new();

    // Sort keys for consistent output
    let mut keys: Vec<_> = extra.keys().collect();
    keys.sort();

    for key in keys {
        if let Some(value) = extra.get(key) {
            let value_str = yaml_value_to_string(value, 2);
            // Handle multiline values (sequences, mappings)
            if value_str.starts_with('\n') {
                let _ = writeln!(result, "{key}:{value_str}");
            } else {
                let _ = writeln!(result, "{key}: {value_str}");
            }
        }
    }

    result
}

impl Display for ParsedTask {
    /// Serialize to file content (frontmatter + body).
    ///
    /// The output is a valid markdown file with YAML frontmatter.
    /// Field order is consistent and deterministic.
    /// Unknown fields from `extra` are preserved.
    /// The `projects_count` field is NOT serialized (validation metadata only).
    #[allow(clippy::too_many_lines)]
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "---")?;

        // Required fields in spec order
        writeln!(f, "title: {}", yaml_string(&self.title))?;
        writeln!(f, "status: {}", self.status)?;
        writeln!(f, "created-at: {}", self.created_at)?;
        writeln!(f, "updated-at: {}", self.updated_at)?;

        // Optional fields in spec order
        if let Some(ref completed_at) = self.completed_at {
            writeln!(f, "completed-at: {completed_at}")?;
        }

        if let Some(ref due) = self.due {
            writeln!(f, "due: {due}")?;
        }

        if let Some(scheduled) = self.scheduled {
            writeln!(f, "scheduled: {}", scheduled.format("%Y-%m-%d"))?;
        }

        if let Some(defer_until) = self.defer_until {
            writeln!(f, "defer-until: {}", defer_until.format("%Y-%m-%d"))?;
        }

        // Project - use "projects" array format per spec
        if let Some(ref project) = self.project {
            writeln!(f, "projects:")?;
            writeln!(f, "  - {}", yaml_string(&project.to_string()))?;
        }

        if let Some(ref area) = self.area {
            writeln!(f, "area: {}", yaml_string(&area.to_string()))?;
        }

        // Extra fields (sorted for consistency)
        write!(f, "{}", serialize_extra_fields(&self.extra))?;

        writeln!(f, "---")?;

        // Add body if present
        if !self.body.is_empty() {
            write!(f, "{}", self.body)?;
        }

        Ok(())
    }
}

impl Display for Task {
    /// Serialize to file content (frontmatter + body).
    ///
    /// This delegates to `ParsedTask`'s Display since the path is not
    /// included in the file content.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parsed = ParsedTask {
            title: self.title.clone(),
            status: self.status,
            created_at: self.created_at.clone(),
            updated_at: self.updated_at.clone(),
            completed_at: self.completed_at.clone(),
            due: self.due.clone(),
            scheduled: self.scheduled,
            defer_until: self.defer_until,
            project: self.project.clone(),
            area: self.area.clone(),
            body: self.body.clone(),
            extra: self.extra.clone(),
            projects_count: self.projects_count,
        };
        write!(f, "{parsed}")
    }
}

impl Display for ParsedProject {
    /// Serialize to file content (frontmatter + body).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "---")?;

        // Required field
        writeln!(f, "title: {}", yaml_string(&self.title))?;

        // Optional fields in logical order
        if let Some(ref unique_id) = self.unique_id {
            writeln!(f, "unique-id: {}", yaml_string(unique_id))?;
        }

        if let Some(status) = self.status {
            writeln!(f, "status: {status}")?;
        }

        if let Some(ref description) = self.description {
            writeln!(f, "description: {}", yaml_string(description))?;
        }

        if let Some(ref area) = self.area {
            writeln!(f, "area: {}", yaml_string(&area.to_string()))?;
        }

        if let Some(start_date) = self.start_date {
            writeln!(f, "start-date: {}", start_date.format("%Y-%m-%d"))?;
        }

        if let Some(end_date) = self.end_date {
            writeln!(f, "end-date: {}", end_date.format("%Y-%m-%d"))?;
        }

        if !self.blocked_by.is_empty() {
            writeln!(f, "blocked-by:")?;
            for blocked in &self.blocked_by {
                writeln!(f, "  - {}", yaml_string(&blocked.to_string()))?;
            }
        }

        // Extra fields
        write!(f, "{}", serialize_extra_fields(&self.extra))?;

        writeln!(f, "---")?;

        if !self.body.is_empty() {
            write!(f, "{}", self.body)?;
        }

        Ok(())
    }
}

impl Display for Project {
    /// Serialize to file content (frontmatter + body).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parsed = ParsedProject {
            title: self.title.clone(),
            unique_id: self.unique_id.clone(),
            status: self.status,
            description: self.description.clone(),
            area: self.area.clone(),
            start_date: self.start_date,
            end_date: self.end_date,
            blocked_by: self.blocked_by.clone(),
            body: self.body.clone(),
            extra: self.extra.clone(),
        };
        write!(f, "{parsed}")
    }
}

impl Display for ParsedArea {
    /// Serialize to file content (frontmatter + body).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        writeln!(f, "---")?;

        // Required field
        writeln!(f, "title: {}", yaml_string(&self.title))?;

        // Optional fields
        if let Some(status) = self.status {
            writeln!(f, "status: {status}")?;
        }

        if let Some(ref area_type) = self.area_type {
            writeln!(f, "type: {}", yaml_string(area_type))?;
        }

        if let Some(ref description) = self.description {
            writeln!(f, "description: {}", yaml_string(description))?;
        }

        // Extra fields
        write!(f, "{}", serialize_extra_fields(&self.extra))?;

        writeln!(f, "---")?;

        if !self.body.is_empty() {
            write!(f, "{}", self.body)?;
        }

        Ok(())
    }
}

impl Display for Area {
    /// Serialize to file content (frontmatter + body).
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let parsed = ParsedArea {
            title: self.title.clone(),
            status: self.status,
            area_type: self.area_type.clone(),
            description: self.description.clone(),
            body: self.body.clone(),
            extra: self.extra.clone(),
        };
        write!(f, "{parsed}")
    }
}

// =============================================================================
// Internal write functions
// =============================================================================

/// Write a task to disk.
///
/// This function:
/// - Automatically updates `updated_at` to the current time
/// - Automatically sets `completed_at` when status is `Done` or `Dropped`
/// - Preserves all other fields including `extra` and `body`
///
/// # Errors
///
/// Returns an error if the file cannot be written.
#[allow(dead_code)]
pub(crate) fn write_task(path: &Path, task: &Task) -> Result<()> {
    let content = task.to_string();
    fs::write(path, content)?;
    Ok(())
}

/// Write a task with automatic timestamp updates.
///
/// This is the preferred method for writing tasks as it handles:
/// - Updating `updated_at` to current time
/// - Setting `completed_at` when transitioning to `Done` or `Dropped`
///
/// # Arguments
///
/// * `path` - Path to write the task file
/// * `task` - The task to write (will be modified with updated timestamps)
/// * `previous_status` - The status before any updates (for detecting completion transitions)
///
/// # Errors
///
/// Returns an error if the file cannot be written.
#[allow(dead_code)]
pub(crate) fn write_task_with_updates(
    path: &Path,
    task: &mut Task,
    previous_status: Option<TaskStatus>,
) -> Result<()> {
    // Update updated_at to current time
    task.updated_at = DateTimeValue::now();

    // Set completed_at if transitioning to completed status
    let was_completed = previous_status.is_some_and(|s| s.is_completed());
    let is_completed = task.status.is_completed();

    if is_completed && !was_completed {
        task.completed_at = Some(DateTimeValue::now());
    }

    write_task(path, task)
}

/// Write a project to disk.
///
/// # Errors
///
/// Returns an error if the file cannot be written.
#[allow(dead_code)]
pub(crate) fn write_project(path: &Path, project: &Project) -> Result<()> {
    let content = project.to_string();
    fs::write(path, content)?;
    Ok(())
}

/// Write an area to disk.
///
/// # Errors
///
/// Returns an error if the file cannot be written.
#[allow(dead_code)]
pub(crate) fn write_area(path: &Path, area: &Area) -> Result<()> {
    let content = area.to_string();
    fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{AreaStatus, FileReference, ProjectStatus, TaskStatus};
    use chrono::NaiveDate;
    use std::collections::HashMap;

    mod yaml_helpers {
        use super::*;

        #[test]
        fn yaml_string_simple() {
            assert_eq!(yaml_string("hello"), "hello");
            assert_eq!(yaml_string("Hello World"), "Hello World");
        }

        #[test]
        fn yaml_string_needs_quoting() {
            assert_eq!(yaml_string("hello: world"), "\"hello: world\"");
            assert_eq!(yaml_string("test#comment"), "\"test#comment\"");
            assert_eq!(yaml_string(""), "\"\"");
            assert_eq!(yaml_string("true"), "\"true\"");
            assert_eq!(yaml_string("123"), "\"123\"");
        }

        #[test]
        fn yaml_string_escapes_quotes() {
            assert_eq!(yaml_string("say \"hello\""), "\"say \\\"hello\\\"\"");
        }

        #[test]
        fn yaml_string_wikilink() {
            // WikiLinks contain [[ and ]] which need quoting
            assert_eq!(yaml_string("[[My Project]]"), "\"[[My Project]]\"");
        }
    }

    mod parsed_task_to_string {
        use super::*;

        fn sample_task() -> ParsedTask {
            ParsedTask {
                title: "Test Task".to_string(),
                status: TaskStatus::Ready,
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
        }

        #[test]
        fn minimal_task() {
            let task = sample_task();
            let output = task.to_string();

            assert!(output.starts_with("---\n"));
            assert!(output.contains("title: Test Task\n"));
            assert!(output.contains("status: ready\n"));
            assert!(output.contains("created-at: 2025-01-01\n"));
            assert!(output.contains("updated-at: 2025-01-02\n"));
            assert!(output.contains("---\n"));
        }

        #[test]
        fn task_with_all_fields() {
            let mut task = sample_task();
            task.status = TaskStatus::Done;
            task.completed_at = Some("2025-01-15".parse().unwrap());
            task.due = Some("2025-01-20T17:00:00".parse().unwrap());
            task.scheduled = Some(NaiveDate::from_ymd_opt(2025, 1, 14).unwrap());
            task.defer_until = Some(NaiveDate::from_ymd_opt(2025, 1, 10).unwrap());
            task.project = Some(FileReference::wiki_link("My Project"));
            task.area = Some(FileReference::wiki_link("Work"));
            task.body = "## Notes\n\nSome content.\n".to_string();

            let output = task.to_string();

            assert!(output.contains("status: done\n"));
            assert!(output.contains("completed-at: 2025-01-15\n"));
            assert!(output.contains("due: 2025-01-20T17:00:00\n"));
            assert!(output.contains("scheduled: 2025-01-14\n"));
            assert!(output.contains("defer-until: 2025-01-10\n"));
            assert!(output.contains("projects:\n  - \"[[My Project]]\"\n"));
            assert!(output.contains("area: \"[[Work]]\"\n"));
            assert!(output.contains("## Notes\n\nSome content.\n"));
        }

        #[test]
        fn task_with_extra_fields() {
            let mut task = sample_task();
            task.extra.insert(
                "custom-field".to_string(),
                serde_yaml::Value::String("custom value".to_string()),
            );
            task.extra.insert(
                "priority".to_string(),
                serde_yaml::Value::String("high".to_string()),
            );

            let output = task.to_string();

            assert!(output.contains("custom-field: custom value\n"));
            assert!(output.contains("priority: high\n"));
        }

        #[test]
        fn task_does_not_serialize_projects_count() {
            let mut task = sample_task();
            task.projects_count = Some(3);

            let output = task.to_string();

            // projects_count should NOT appear in output
            assert!(!output.contains("projects_count"));
            assert!(!output.contains("projects-count"));
        }

        #[test]
        fn task_preserves_datetime_format() {
            let mut task = sample_task();
            task.created_at = "2025-01-01T10:30:00".parse().unwrap();
            task.updated_at = "2025-01-02".parse().unwrap();

            let output = task.to_string();

            // DateTime should preserve T format
            assert!(output.contains("created-at: 2025-01-01T10:30:00\n"));
            // Date should stay as date
            assert!(output.contains("updated-at: 2025-01-02\n"));
        }

        #[test]
        fn task_preserves_file_reference_format() {
            let mut task = sample_task();
            task.project = Some(FileReference::wiki_link_with_display(
                "proj-001",
                "My Project",
            ));
            task.area = Some(FileReference::relative_path("./areas/work.md"));

            let output = task.to_string();

            assert!(output.contains("\"[[proj-001|My Project]]\""));
            assert!(output.contains("area: ./areas/work.md\n"));
        }
    }

    mod task_to_string {
        use super::*;
        use std::path::PathBuf;

        #[test]
        fn delegates_to_parsed_task() {
            let task = Task {
                path: PathBuf::from("/test/task.md"),
                title: "Test".to_string(),
                status: TaskStatus::Inbox,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            let output = task.to_string();

            // Path should NOT be in the output
            assert!(!output.contains("/test/task.md"));
            assert!(output.contains("title: Test\n"));
        }
    }

    mod parsed_project_to_string {
        use super::*;

        fn sample_project() -> ParsedProject {
            ParsedProject {
                title: "Test Project".to_string(),
                unique_id: None,
                status: None,
                description: None,
                area: None,
                start_date: None,
                end_date: None,
                blocked_by: Vec::new(),
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn minimal_project() {
            let project = sample_project();
            let output = project.to_string();

            assert!(output.starts_with("---\n"));
            assert!(output.contains("title: Test Project\n"));
            assert!(output.ends_with("---\n"));
        }

        #[test]
        fn project_with_all_fields() {
            let mut project = sample_project();
            project.unique_id = Some("proj-001".to_string());
            project.status = Some(ProjectStatus::InProgress);
            project.description = Some("A test project".to_string());
            project.area = Some(FileReference::wiki_link("Work"));
            project.start_date = Some(NaiveDate::from_ymd_opt(2025, 1, 1).unwrap());
            project.end_date = Some(NaiveDate::from_ymd_opt(2025, 3, 31).unwrap());
            project.blocked_by = vec![
                FileReference::wiki_link("Other Project"),
                FileReference::wiki_link("Another Project"),
            ];
            project.body = "## Overview\n\nProject details.\n".to_string();

            let output = project.to_string();

            assert!(output.contains("unique-id: proj-001\n"));
            assert!(output.contains("status: in-progress\n"));
            assert!(output.contains("description: A test project\n"));
            assert!(output.contains("area: \"[[Work]]\"\n"));
            assert!(output.contains("start-date: 2025-01-01\n"));
            assert!(output.contains("end-date: 2025-03-31\n"));
            assert!(output.contains("blocked-by:\n"));
            assert!(output.contains("  - \"[[Other Project]]\"\n"));
            assert!(output.contains("  - \"[[Another Project]]\"\n"));
            assert!(output.contains("## Overview\n\nProject details.\n"));
        }
    }

    mod parsed_area_to_string {
        use super::*;

        fn sample_area() -> ParsedArea {
            ParsedArea {
                title: "Test Area".to_string(),
                status: None,
                area_type: None,
                description: None,
                body: String::new(),
                extra: HashMap::new(),
            }
        }

        #[test]
        fn minimal_area() {
            let area = sample_area();
            let output = area.to_string();

            assert!(output.starts_with("---\n"));
            assert!(output.contains("title: Test Area\n"));
            assert!(output.ends_with("---\n"));
        }

        #[test]
        fn area_with_all_fields() {
            let mut area = sample_area();
            area.status = Some(AreaStatus::Active);
            area.area_type = Some("professional".to_string());
            area.description = Some("Work-related stuff".to_string());
            area.body = "## Context\n\nArea details.\n".to_string();

            let output = area.to_string();

            assert!(output.contains("status: active\n"));
            assert!(output.contains("type: professional\n"));
            assert!(output.contains("description: Work-related stuff\n"));
            assert!(output.contains("## Context\n\nArea details.\n"));
        }

        #[test]
        fn area_archived_status() {
            let mut area = sample_area();
            area.status = Some(AreaStatus::Archived);

            let output = area.to_string();

            assert!(output.contains("status: archived\n"));
        }
    }

    mod round_trip {
        use super::*;

        #[test]
        fn task_round_trip_preserves_values() {
            let original = r#"---
title: Test Task
status: ready
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            assert_eq!(parsed.title, reparsed.title);
            assert_eq!(parsed.status, reparsed.status);
            assert_eq!(parsed.created_at, reparsed.created_at);
            assert_eq!(parsed.updated_at, reparsed.updated_at);
        }

        #[test]
        fn task_round_trip_with_extra_fields() {
            let original = r#"---
title: Custom Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
custom-field: custom value
priority: high
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            assert!(reparsed.extra.contains_key("custom-field"));
            assert!(reparsed.extra.contains_key("priority"));
        }

        #[test]
        fn task_round_trip_preserves_body() {
            let original = r#"---
title: Body Test
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---

## Header

Paragraph with **bold** and *italic*.

- List item 1
- List item 2

```rust
fn main() {
    println!("Hello");
}
```
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            // Body should be preserved
            assert_eq!(parsed.body, reparsed.body);
            assert!(reparsed.body.contains("## Header"));
            assert!(reparsed.body.contains("```rust"));
        }

        #[test]
        fn task_round_trip_preserves_date_format() {
            let original = r#"---
title: DateTime Test
status: ready
created-at: 2025-01-01T10:30:00
updated-at: 2025-01-02
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            // DateTime should stay datetime
            assert!(!reparsed.created_at.is_date_only());
            // Date should stay date
            assert!(reparsed.updated_at.is_date_only());
        }

        #[test]
        fn project_round_trip() {
            let original = r#"---
title: Test Project
status: in-progress
area: "[[Work]]"
---

## Overview

Project content.
"#;
            let parsed = ParsedProject::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedProject::parse(&serialized).unwrap();

            assert_eq!(parsed.title, reparsed.title);
            assert_eq!(parsed.status, reparsed.status);
            assert_eq!(parsed.body, reparsed.body);
        }

        #[test]
        fn area_round_trip() {
            let original = r#"---
title: Work
status: active
type: professional
---

## Context

Area content.
"#;
            let parsed = ParsedArea::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedArea::parse(&serialized).unwrap();

            assert_eq!(parsed.title, reparsed.title);
            assert_eq!(parsed.status, reparsed.status);
            assert_eq!(parsed.area_type, reparsed.area_type);
            assert_eq!(parsed.body, reparsed.body);
        }
    }

    mod edge_cases {
        use super::*;

        #[test]
        fn task_with_complex_markdown() {
            let original = r#"---
title: Complex Markdown
status: ready
created-at: 2025-01-01
updated-at: 2025-01-01
---

## Headers

### Subheader

#### Deep header

**Bold text** and *italic* and ~~strikethrough~~.

> Blockquote with
> multiple lines

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

```rust
fn main() {
    let x = 42;
    println!("The answer is {}", x);
}
```

```yaml
---
key: value
nested:
  - item1
  - item2
---
```

- [ ] Task item 1
- [x] Task item 2 (done)
- [ ] Task item 3

1. Numbered list
2. Second item
3. Third item

Here's some inline `code` and a [link](https://example.com).

---

Horizontal rule above.
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            // Body should be preserved exactly
            assert_eq!(parsed.body, reparsed.body);
            assert!(reparsed.body.contains("| Column 1 |"));
            assert!(reparsed.body.contains("```rust"));
            assert!(reparsed.body.contains("```yaml"));
            assert!(reparsed.body.contains("- [x] Task item 2"));
        }

        #[test]
        fn task_empty_body() {
            let original = r#"---
title: Empty Body Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();

            // Should produce valid output
            assert!(serialized.starts_with("---\n"));
            assert!(serialized.contains("title: Empty Body Task\n"));
            assert!(serialized.ends_with("---\n"));

            // Round-trip
            let reparsed = ParsedTask::parse(&serialized).unwrap();
            assert_eq!(parsed.title, reparsed.title);
        }

        #[test]
        fn task_all_optional_fields_missing() {
            let original = r#"---
title: Minimal Task
status: ready
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();

            // Verify all optional fields are None/empty
            assert!(parsed.completed_at.is_none());
            assert!(parsed.due.is_none());
            assert!(parsed.scheduled.is_none());
            assert!(parsed.defer_until.is_none());
            assert!(parsed.project.is_none());
            assert!(parsed.area.is_none());
            assert!(parsed.extra.is_empty());

            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            // All should remain None after round-trip
            assert!(reparsed.completed_at.is_none());
            assert!(reparsed.due.is_none());
            assert!(reparsed.scheduled.is_none());
            assert!(reparsed.defer_until.is_none());
            assert!(reparsed.project.is_none());
            assert!(reparsed.area.is_none());
        }

        #[test]
        fn project_all_optional_fields_missing() {
            let original = r#"---
title: Minimal Project
---
"#;
            let parsed = ParsedProject::parse(original).unwrap();

            assert!(parsed.unique_id.is_none());
            assert!(parsed.status.is_none());
            assert!(parsed.description.is_none());
            assert!(parsed.area.is_none());
            assert!(parsed.start_date.is_none());
            assert!(parsed.end_date.is_none());
            assert!(parsed.blocked_by.is_empty());

            let serialized = parsed.to_string();
            let reparsed = ParsedProject::parse(&serialized).unwrap();

            assert!(reparsed.unique_id.is_none());
            assert!(reparsed.status.is_none());
        }

        #[test]
        fn area_all_optional_fields_missing() {
            let original = r#"---
title: Minimal Area
---
"#;
            let parsed = ParsedArea::parse(original).unwrap();

            assert!(parsed.status.is_none());
            assert!(parsed.area_type.is_none());
            assert!(parsed.description.is_none());

            let serialized = parsed.to_string();
            let reparsed = ParsedArea::parse(&serialized).unwrap();

            assert!(reparsed.status.is_none());
            assert!(reparsed.area_type.is_none());
        }

        #[test]
        fn task_with_special_characters_in_title() {
            let task = ParsedTask {
                title: "Task with: colons, #hashes, and \"quotes\"".to_string(),
                status: TaskStatus::Inbox,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            let serialized = task.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            assert_eq!(reparsed.title, task.title);
        }

        #[test]
        fn task_preserves_wikilink_with_display_text() {
            let original = r#"---
title: WikiLink Test
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
projects:
  - "[[project-slug|Display Name]]"
area: "[[area-slug|Area Display]]"
---
"#;
            let parsed = ParsedTask::parse(original).unwrap();
            let serialized = parsed.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            // Verify WikiLink format is preserved
            if let Some(FileReference::WikiLink { target, display }) = &reparsed.project {
                assert_eq!(target, "project-slug");
                assert_eq!(display.as_deref(), Some("Display Name"));
            } else {
                panic!("Expected WikiLink for project");
            }

            if let Some(FileReference::WikiLink { target, display }) = &reparsed.area {
                assert_eq!(target, "area-slug");
                assert_eq!(display.as_deref(), Some("Area Display"));
            } else {
                panic!("Expected WikiLink for area");
            }
        }

        #[test]
        fn task_preserves_relative_path_references() {
            let task = ParsedTask {
                title: "Path Test".to_string(),
                status: TaskStatus::Inbox,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: Some(FileReference::relative_path("./projects/my-project.md")),
                area: Some(FileReference::filename("work.md")),
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            let serialized = task.to_string();
            let reparsed = ParsedTask::parse(&serialized).unwrap();

            assert!(matches!(
                reparsed.project,
                Some(FileReference::RelativePath(ref p)) if p == "./projects/my-project.md"
            ));
            assert!(matches!(
                reparsed.area,
                Some(FileReference::Filename(ref n)) if n == "work.md"
            ));
        }
    }

    mod write_functions {
        use super::*;
        use tempfile::tempdir;

        #[test]
        fn write_task_creates_file() {
            let dir = tempdir().unwrap();
            let path = dir.path().join("test-task.md");

            let task = Task {
                path: path.clone(),
                title: "Test".to_string(),
                status: TaskStatus::Inbox,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            write_task(&path, &task).unwrap();

            assert!(path.exists());
            let content = fs::read_to_string(&path).unwrap();
            assert!(content.contains("title: Test\n"));
        }

        #[test]
        fn write_task_with_updates_sets_timestamps() {
            let dir = tempdir().unwrap();
            let path = dir.path().join("test-task.md");

            let mut task = Task {
                path: path.clone(),
                title: "Test".to_string(),
                status: TaskStatus::Done,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: None,
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            // Transition from Ready to Done should set completed_at
            write_task_with_updates(&path, &mut task, Some(TaskStatus::Ready)).unwrap();

            // Check that timestamps were updated
            assert!(!task.updated_at.is_date_only()); // Now should have time
            assert!(task.completed_at.is_some());
        }

        #[test]
        fn write_task_with_updates_no_completed_at_if_already_done() {
            let dir = tempdir().unwrap();
            let path = dir.path().join("test-task.md");

            let original_completed: DateTimeValue = "2025-01-10".parse().unwrap();

            let mut task = Task {
                path: path.clone(),
                title: "Test".to_string(),
                status: TaskStatus::Done,
                created_at: "2025-01-01".parse().unwrap(),
                updated_at: "2025-01-01".parse().unwrap(),
                completed_at: Some(original_completed.clone()),
                due: None,
                scheduled: None,
                defer_until: None,
                project: None,
                area: None,
                body: String::new(),
                extra: HashMap::new(),
                projects_count: None,
            };

            // Already Done, so completed_at should not change
            write_task_with_updates(&path, &mut task, Some(TaskStatus::Done)).unwrap();

            assert_eq!(task.completed_at, Some(original_completed));
        }

        #[test]
        fn write_project_creates_file() {
            let dir = tempdir().unwrap();
            let path = dir.path().join("test-project.md");

            let project = Project {
                path: path.clone(),
                title: "Test Project".to_string(),
                unique_id: None,
                status: Some(ProjectStatus::Planning),
                description: None,
                area: None,
                start_date: None,
                end_date: None,
                blocked_by: Vec::new(),
                body: String::new(),
                extra: HashMap::new(),
            };

            write_project(&path, &project).unwrap();

            assert!(path.exists());
            let content = fs::read_to_string(&path).unwrap();
            assert!(content.contains("title: Test Project\n"));
        }

        #[test]
        fn write_area_creates_file() {
            let dir = tempdir().unwrap();
            let path = dir.path().join("test-area.md");

            let area = Area {
                path: path.clone(),
                title: "Test Area".to_string(),
                status: Some(AreaStatus::Active),
                area_type: None,
                description: None,
                body: String::new(),
                extra: HashMap::new(),
            };

            write_area(&path, &area).unwrap();

            assert!(path.exists());
            let content = fs::read_to_string(&path).unwrap();
            assert!(content.contains("title: Test Area\n"));
        }
    }
}
