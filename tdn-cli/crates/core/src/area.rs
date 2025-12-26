use crate::TdnError;
use gray_matter::{Matter, engine::YAML};
use napi::bindgen_prelude::*;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

/// Area status enum matching S1 spec Section 5.5
/// Note: Unlike tasks/projects, area status is for visibility only (active vs hidden)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
#[napi(string_enum)]
pub enum AreaStatus {
    Active,
    Archived,
}

/// Frontmatter structure for areas
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct AreaFrontmatter {
    title: String,
    #[serde(default)]
    status: Option<AreaStatus>,
    /// 'type' field in YAML - renamed to avoid Rust keyword conflict
    #[serde(default, rename = "type")]
    area_type: Option<String>,
    #[serde(default)]
    description: Option<String>,
}

/// Area struct exposed to TypeScript via NAPI
#[derive(Debug, Clone)]
#[napi(object)]
pub struct Area {
    /// File path to the area
    pub path: String,
    /// Area title from frontmatter
    pub title: String,
    /// Area status (optional per S1 spec)
    pub status: Option<AreaStatus>,
    /// Area type (e.g., "client", "life-area") - free-form string
    pub area_type: Option<String>,
    /// Short description
    pub description: Option<String>,
    /// Markdown body content (after frontmatter)
    pub body: String,
}

/// Parse an area file and return the Area struct
#[napi]
pub fn parse_area_file(file_path: String) -> Result<Area> {
    let path = Path::new(&file_path);

    // Check file exists
    if !path.exists() {
        return Err(TdnError::file_not_found(&file_path).into());
    }

    // Read file contents
    let content = fs::read_to_string(path).map_err(|e| {
        TdnError::file_read_error(&file_path, e.to_string())
    })?;

    // Parse frontmatter
    let matter = Matter::<YAML>::new();
    let parsed = matter.parse::<AreaFrontmatter>(&content).map_err(|e| {
        TdnError::parse_error(&file_path, None, e.to_string())
    })?;

    // Extract frontmatter data
    let frontmatter = parsed
        .data
        .ok_or_else(|| TdnError::parse_error(&file_path, None, "No frontmatter found"))?;

    Ok(Area {
        path: file_path,
        title: frontmatter.title,
        status: frontmatter.status,
        area_type: frontmatter.area_type,
        description: frontmatter.description,
        body: parsed.content.trim().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::helpers::create_temp_file;

    #[test]
    fn parse_minimal_area() {
        let content = r#"---
title: Test Area
---
Some body content.
"#;
        let file = create_temp_file(content);
        let area = parse_area_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(area.title, "Test Area");
        assert_eq!(area.status, None);
        assert_eq!(area.body, "Some body content.");
    }

    #[test]
    fn parse_area_with_all_fields() {
        let content = r#"---
title: Full Area
status: active
type: client
description: A test area
---
## Notes
Some notes here.
"#;
        let file = create_temp_file(content);
        let area = parse_area_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(area.title, "Full Area");
        assert_eq!(area.status, Some(AreaStatus::Active));
        assert_eq!(area.area_type, Some("client".to_string()));
        assert_eq!(area.description, Some("A test area".to_string()));
        assert!(area.body.contains("## Notes"));
    }

    #[test]
    fn parse_area_archived_status() {
        let content = r#"---
title: Archived Area
status: archived
---
"#;
        let file = create_temp_file(content);
        let area = parse_area_file(file.path().to_str().unwrap().to_string()).unwrap();

        assert_eq!(area.title, "Archived Area");
        assert_eq!(area.status, Some(AreaStatus::Archived));
    }

    #[test]
    fn parse_nonexistent_file() {
        let result = parse_area_file("/nonexistent/path.md".to_string());
        assert!(result.is_err());
    }
}
