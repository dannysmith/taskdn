use crate::TdnError;
use gray_matter::{Matter, engine::YAML};
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Project status enum matching S1 spec Section 4.5
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
#[napi(string_enum)]
pub enum ProjectStatus {
    Planning,
    Ready,
    Blocked,
    InProgress,
    Paused,
    Done,
}

/// Frontmatter structure for projects
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct ProjectFrontmatter {
    title: String,
    #[serde(default)]
    status: Option<ProjectStatus>,
    #[serde(default)]
    unique_id: Option<String>,
    #[serde(default)]
    area: Option<String>,
    #[serde(default)]
    start_date: Option<String>,
    #[serde(default)]
    end_date: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    blocked_by: Option<Vec<String>>,
}

/// Project struct exposed to TypeScript via NAPI
#[derive(Debug, Clone)]
#[napi(object)]
pub struct Project {
    /// File path to the project
    pub path: String,
    /// Project title from frontmatter
    pub title: String,
    /// Project status (optional per S1 spec)
    pub status: Option<ProjectStatus>,
    /// Unique identifier
    pub unique_id: Option<String>,
    /// Area reference (WikiLink)
    pub area: Option<String>,
    /// Start date (ISO 8601)
    pub start_date: Option<String>,
    /// End date (ISO 8601)
    pub end_date: Option<String>,
    /// Short description
    pub description: Option<String>,
    /// Projects that block this one
    pub blocked_by: Option<Vec<String>>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

/// Parse a project file and return the Project struct
#[napi]
pub fn parse_project_file(file_path: String) -> Result<Project> {
    let path = Path::new(&file_path);

    // Read file contents directly - no TOCTOU race condition
    let content = fs::read_to_string(path).map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            TdnError::file_not_found(&file_path)
        } else {
            TdnError::file_read_error(&file_path, e.to_string())
        }
    })?;

    // Parse frontmatter
    let matter = Matter::<YAML>::new();
    let parsed = matter
        .parse::<ProjectFrontmatter>(&content)
        .map_err(|e| TdnError::parse_error(&file_path, None, e.to_string()))?;

    // Extract frontmatter data
    let frontmatter = parsed
        .data
        .ok_or_else(|| TdnError::parse_error(&file_path, None, "No frontmatter found"))?;

    Ok(Project {
        path: file_path,
        title: frontmatter.title,
        status: frontmatter.status,
        unique_id: frontmatter.unique_id,
        area: frontmatter.area,
        start_date: frontmatter.start_date,
        end_date: frontmatter.end_date,
        description: frontmatter.description,
        blocked_by: frontmatter.blocked_by,
        body: parsed.content.trim().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::helpers::create_temp_file;

    #[test]
    fn parse_minimal_project() {
        let content = r#"---
title: Test Project
status: planning
---
Some body content.
"#;
        let file = create_temp_file(content);
        let project = parse_project_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(project.title, "Test Project");
        assert_eq!(project.status, Some(ProjectStatus::Planning));
        assert_eq!(project.body, "Some body content.");
    }

    #[test]
    fn parse_project_with_all_fields() {
        let content = r#"---
title: Full Project
status: in-progress
unique-id: proj-001
area: "[[Work]]"
start-date: 2025-01-01
end-date: 2025-03-31
description: A test project
blocked-by:
  - "[[Other Project]]"
---
## Notes
Some notes here.
"#;
        let file = create_temp_file(content);
        let project = parse_project_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(project.title, "Full Project");
        assert_eq!(project.status, Some(ProjectStatus::InProgress));
        assert_eq!(project.unique_id, Some("proj-001".to_string()));
        assert_eq!(project.area, Some("[[Work]]".to_string()));
        assert_eq!(project.start_date, Some("2025-01-01".to_string()));
        assert_eq!(project.end_date, Some("2025-03-31".to_string()));
        assert_eq!(project.description, Some("A test project".to_string()));
        assert_eq!(
            project.blocked_by,
            Some(vec!["[[Other Project]]".to_string()])
        );
        assert!(project.body.contains("## Notes"));
    }

    #[test]
    fn parse_project_without_status() {
        let content = r#"---
title: Statusless Project
area: "[[Personal]]"
---
"#;
        let file = create_temp_file(content);
        let project = parse_project_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(project.title, "Statusless Project");
        assert_eq!(project.status, None);
        assert_eq!(project.area, Some("[[Personal]]".to_string()));
    }

    #[test]
    fn parse_nonexistent_file() {
        let result = parse_project_file("/nonexistent/path.md".to_string());
        assert!(result.is_err());
    }

    #[test]
    fn parse_project_missing_title() {
        let content = r#"---
status: planning
area: "[[Work]]"
---
Body content.
"#;
        let file = create_temp_file(content);
        let result = parse_project_file(file.path().to_str().unwrap().to_string());
        assert!(result.is_err());
    }
}
