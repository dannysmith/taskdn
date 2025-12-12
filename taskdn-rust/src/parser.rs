//! Frontmatter parsing using `gray_matter`.
//!
//! This module handles extraction and parsing of YAML frontmatter from markdown files.
//! The parser extracts data but does NOT validate against the spec (that's the validator's job).

use crate::error::Error;
use crate::types::{
    AreaStatus, DateTimeValue, FileReference, ParsedArea, ParsedProject, ParsedTask, ProjectStatus,
    TaskStatus,
};
use chrono::NaiveDate;
use gray_matter::{engine::YAML, Matter};
use serde::Deserialize;
use std::collections::HashMap;

/// Raw frontmatter for tasks - used for serde deserialization.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct RawTaskFrontmatter {
    title: String,
    status: String,
    created_at: String,
    updated_at: String,
    #[serde(default)]
    completed_at: Option<String>,
    #[serde(default)]
    due: Option<String>,
    #[serde(default)]
    scheduled: Option<String>,
    #[serde(default)]
    defer_until: Option<String>,
    #[serde(default)]
    project: Option<String>,
    #[serde(default)]
    projects: Option<Vec<String>>,
    #[serde(default)]
    area: Option<String>,
    #[serde(flatten)]
    extra: HashMap<String, serde_yaml::Value>,
}

/// Raw frontmatter for projects.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct RawProjectFrontmatter {
    title: String,
    #[serde(default)]
    unique_id: Option<String>,
    #[serde(default)]
    status: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    area: Option<String>,
    #[serde(default)]
    start_date: Option<String>,
    #[serde(default)]
    end_date: Option<String>,
    #[serde(default)]
    blocked_by: Option<Vec<String>>,
    #[serde(flatten)]
    extra: HashMap<String, serde_yaml::Value>,
}

/// Raw frontmatter for areas.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "kebab-case")]
struct RawAreaFrontmatter {
    title: String,
    #[serde(default)]
    status: Option<String>,
    #[serde(default, rename = "type")]
    area_type: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(flatten)]
    extra: HashMap<String, serde_yaml::Value>,
}

impl ParsedTask {
    /// Parse task content from a string.
    ///
    /// This extracts frontmatter using `gray_matter` and parses known fields.
    /// Unknown fields are preserved in the `extra` map.
    ///
    /// # Errors
    ///
    /// Returns `Error::ContentParse` if the content cannot be parsed.
    /// Returns `Error::ContentMissingField` if required fields are absent.
    /// Returns `Error::ContentInvalidField` if a field has an invalid value.
    pub fn parse(content: &str) -> Result<Self, Error> {
        let matter = Matter::<YAML>::new();
        let parsed =
            matter
                .parse::<RawTaskFrontmatter>(content)
                .map_err(|e| Error::ContentParse {
                    message: format!("failed to parse frontmatter: {e}"),
                })?;

        let body = parsed.content;
        let raw = parsed.data.ok_or_else(|| Error::ContentParse {
            message: "no frontmatter found".to_string(),
        })?;

        // Parse required fields
        let status = raw
            .status
            .parse::<TaskStatus>()
            .map_err(|e| Error::ContentInvalidField {
                field: "status",
                message: e,
            })?;

        let created_at =
            raw.created_at
                .parse::<DateTimeValue>()
                .map_err(|e| Error::ContentInvalidField {
                    field: "created-at",
                    message: e,
                })?;

        let updated_at =
            raw.updated_at
                .parse::<DateTimeValue>()
                .map_err(|e| Error::ContentInvalidField {
                    field: "updated-at",
                    message: e,
                })?;

        // Parse optional fields
        let completed_at = raw
            .completed_at
            .map(|s| s.parse::<DateTimeValue>())
            .transpose()
            .map_err(|e| Error::ContentInvalidField {
                field: "completed-at",
                message: e,
            })?;

        let due = raw
            .due
            .map(|s| s.parse::<DateTimeValue>())
            .transpose()
            .map_err(|e| Error::ContentInvalidField {
                field: "due",
                message: e,
            })?;

        let scheduled = raw
            .scheduled
            .as_deref()
            .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| Error::ContentInvalidField {
                field: "scheduled",
                message: "invalid date format".to_string(),
            })?;

        let defer_until = raw
            .defer_until
            .as_deref()
            .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| Error::ContentInvalidField {
                field: "defer-until",
                message: "invalid date format".to_string(),
            })?;

        // Handle project: prefer "projects" array (per spec), fall back to "project"
        // Track the count for validation (spec says exactly one project per task)
        let (project, projects_count) = if let Some(projects) = raw.projects {
            let count = projects.len();
            let first_project = projects.first().map(|s| FileReference::parse(s));
            (first_project, Some(count))
        } else {
            (raw.project.as_deref().map(FileReference::parse), None)
        };

        let area = raw.area.as_deref().map(FileReference::parse);

        Ok(Self {
            title: raw.title,
            status,
            created_at,
            updated_at,
            completed_at,
            due,
            scheduled,
            defer_until,
            project,
            area,
            body,
            extra: raw.extra,
            projects_count,
        })
    }
}

impl ParsedProject {
    /// Parse project content from a string.
    ///
    /// # Errors
    ///
    /// Returns `Error::ContentParse` if the content cannot be parsed.
    /// Returns `Error::ContentMissingField` if required fields are absent.
    /// Returns `Error::ContentInvalidField` if a field has an invalid value.
    pub fn parse(content: &str) -> Result<Self, Error> {
        let matter = Matter::<YAML>::new();
        let parsed = matter
            .parse::<RawProjectFrontmatter>(content)
            .map_err(|e| Error::ContentParse {
                message: format!("failed to parse frontmatter: {e}"),
            })?;

        let body = parsed.content;
        let raw = parsed.data.ok_or_else(|| Error::ContentParse {
            message: "no frontmatter found".to_string(),
        })?;

        // Parse optional status
        let status = raw
            .status
            .as_deref()
            .map(str::parse::<ProjectStatus>)
            .transpose()
            .map_err(|e| Error::ContentInvalidField {
                field: "status",
                message: e,
            })?;

        let area = raw.area.as_deref().map(FileReference::parse);

        let start_date = raw
            .start_date
            .as_deref()
            .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| Error::ContentInvalidField {
                field: "start-date",
                message: "invalid date format".to_string(),
            })?;

        let end_date = raw
            .end_date
            .as_deref()
            .map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d"))
            .transpose()
            .map_err(|_| Error::ContentInvalidField {
                field: "end-date",
                message: "invalid date format".to_string(),
            })?;

        let blocked_by = raw
            .blocked_by
            .unwrap_or_default()
            .iter()
            .map(|s| FileReference::parse(s))
            .collect();

        Ok(Self {
            title: raw.title,
            unique_id: raw.unique_id,
            status,
            description: raw.description,
            area,
            start_date,
            end_date,
            blocked_by,
            body,
            extra: raw.extra,
        })
    }
}

impl ParsedArea {
    /// Parse area content from a string.
    ///
    /// # Errors
    ///
    /// Returns `Error::ContentParse` if the content cannot be parsed.
    /// Returns `Error::ContentMissingField` if required fields are absent.
    /// Returns `Error::ContentInvalidField` if a field has an invalid value.
    pub fn parse(content: &str) -> Result<Self, Error> {
        let matter = Matter::<YAML>::new();
        let parsed =
            matter
                .parse::<RawAreaFrontmatter>(content)
                .map_err(|e| Error::ContentParse {
                    message: format!("failed to parse frontmatter: {e}"),
                })?;

        let body = parsed.content;
        let raw = parsed.data.ok_or_else(|| Error::ContentParse {
            message: "no frontmatter found".to_string(),
        })?;

        // Parse optional status
        let status = raw
            .status
            .as_deref()
            .map(str::parse::<AreaStatus>)
            .transpose()
            .map_err(|e| Error::ContentInvalidField {
                field: "status",
                message: e,
            })?;

        Ok(Self {
            title: raw.title,
            status,
            area_type: raw.area_type,
            description: raw.description,
            body,
            extra: raw.extra,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    mod parsed_task {
        use super::*;

        #[test]
        fn parse_minimal_task() {
            let content = r#"---
title: Test Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-02
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert_eq!(task.title, "Test Task");
            assert_eq!(task.status, TaskStatus::Inbox);
            assert!(task.body.is_empty() || task.body.trim().is_empty());
        }

        #[test]
        fn parse_task_with_all_fields() {
            let content = r#"---
title: Complete Task
status: in-progress
created-at: 2025-01-01T10:00:00
updated-at: 2025-01-10T15:30:00
completed-at: 2025-01-10
due: 2025-01-15T17:00
scheduled: 2025-01-14
defer-until: 2025-01-12
projects:
  - "[[My Project]]"
area: "[[Work]]"
---

## Notes

Some markdown content here.
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert_eq!(task.title, "Complete Task");
            assert_eq!(task.status, TaskStatus::InProgress);
            assert!(!task.created_at.is_date_only());
            assert!(task.completed_at.is_some());
            assert!(task.due.is_some());
            assert!(task.scheduled.is_some());
            assert!(task.defer_until.is_some());
            assert!(task.project.is_some());
            assert!(task.area.is_some());
            assert!(task.body.contains("## Notes"));
        }

        #[test]
        fn parse_task_with_extra_fields() {
            let content = r#"---
title: Custom Task
status: ready
created-at: 2025-01-01
updated-at: 2025-01-01
custom-field: custom value
priority: high
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert_eq!(task.title, "Custom Task");
            assert!(task.extra.contains_key("custom-field"));
            assert!(task.extra.contains_key("priority"));
        }

        #[test]
        fn parse_task_with_project_array() {
            let content = r#"---
title: Project Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
projects:
  - "[[Q1 Planning]]"
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(task.project.is_some());
            if let Some(FileReference::WikiLink { target, .. }) = &task.project {
                assert_eq!(target, "Q1 Planning");
            } else {
                panic!("expected WikiLink");
            }
            // Verify projects_count is tracked
            assert_eq!(task.projects_count, Some(1));
        }

        #[test]
        fn parse_task_with_project_single() {
            let content = r#"---
title: Project Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
project: "[[My Project]]"
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(task.project.is_some());
            // project field (not projects array) should have None for projects_count
            assert_eq!(task.projects_count, None);
        }

        #[test]
        fn parse_task_with_multiple_projects() {
            let content = r#"---
title: Multi Project Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
projects:
  - "[[Project A]]"
  - "[[Project B]]"
  - "[[Project C]]"
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            // Should take the first project
            assert!(task.project.is_some());
            if let Some(FileReference::WikiLink { target, .. }) = &task.project {
                assert_eq!(target, "Project A");
            } else {
                panic!("expected WikiLink");
            }
            // Should track count for validation
            assert_eq!(task.projects_count, Some(3));
        }

        #[test]
        fn parse_task_with_empty_projects_array() {
            let content = r#"---
title: Empty Projects Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
projects: []
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(task.project.is_none());
            assert_eq!(task.projects_count, Some(0));
        }

        #[test]
        fn parse_task_date_only() {
            let content = r#"---
title: Date Task
status: done
created-at: 2025-01-01
updated-at: 2025-01-15
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(task.created_at.is_date_only());
            assert!(task.updated_at.is_date_only());
        }

        #[test]
        fn parse_task_datetime_with_time() {
            let content = r#"---
title: DateTime Task
status: ready
created-at: 2025-01-01T09:00:00
updated-at: 2025-01-01T09:00
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(!task.created_at.is_date_only());
            assert!(!task.updated_at.is_date_only());
        }

        #[test]
        fn parse_task_space_separated_datetime() {
            let content = r#"---
title: Space DateTime Task
status: ready
created-at: "2025-01-01 09:00:00"
updated-at: "2025-01-01 09:00"
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(!task.created_at.is_date_only());
            assert!(!task.updated_at.is_date_only());
        }

        #[test]
        fn parse_task_no_frontmatter_fails() {
            let content = "# Just markdown content\n\nNo frontmatter here.";
            let result = ParsedTask::parse(content);
            assert!(result.is_err());
        }

        #[test]
        fn parse_task_invalid_status_fails() {
            let content = r#"---
title: Test
status: invalid-status
created-at: 2025-01-01
updated-at: 2025-01-01
---
"#;
            let result = ParsedTask::parse(content);
            assert!(matches!(
                result,
                Err(Error::ContentInvalidField {
                    field: "status",
                    ..
                })
            ));
        }

        #[test]
        fn parse_task_preserves_body() {
            let content = r#"---
title: Body Test
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
---

## Header

Paragraph text.

- List item 1
- List item 2

```code
block
```
"#;
            let task = ParsedTask::parse(content).unwrap();
            assert!(task.body.contains("## Header"));
            assert!(task.body.contains("Paragraph text."));
            assert!(task.body.contains("- List item 1"));
            assert!(task.body.contains("```code"));
        }

        #[test]
        fn parse_task_with_wikilink_display() {
            let content = r#"---
title: WikiLink Task
status: inbox
created-at: 2025-01-01
updated-at: 2025-01-01
area: "[[work-area|Work Area]]"
---
"#;
            let task = ParsedTask::parse(content).unwrap();
            if let Some(FileReference::WikiLink { target, display }) = task.area {
                assert_eq!(target, "work-area");
                assert_eq!(display, Some("Work Area".to_string()));
            } else {
                panic!("expected WikiLink with display text");
            }
        }
    }

    mod parsed_project {
        use super::*;

        #[test]
        fn parse_minimal_project() {
            let content = r#"---
title: Test Project
---
"#;
            let project = ParsedProject::parse(content).unwrap();
            assert_eq!(project.title, "Test Project");
            assert!(project.status.is_none());
        }

        #[test]
        fn parse_project_with_all_fields() {
            let content = r#"---
title: Full Project
unique-id: proj-001
status: in-progress
description: A test project description.
area: "[[Work]]"
start-date: 2025-01-01
end-date: 2025-03-31
blocked-by:
  - "[[Other Project]]"
  - "[[Another Project]]"
---

## Overview

Project content here.
"#;
            let project = ParsedProject::parse(content).unwrap();
            assert_eq!(project.title, "Full Project");
            assert_eq!(project.unique_id, Some("proj-001".to_string()));
            assert_eq!(project.status, Some(ProjectStatus::InProgress));
            assert!(project.description.is_some());
            assert!(project.area.is_some());
            assert!(project.start_date.is_some());
            assert!(project.end_date.is_some());
            assert_eq!(project.blocked_by.len(), 2);
            assert!(project.body.contains("## Overview"));
        }

        #[test]
        fn parse_project_with_extra_fields() {
            let content = r#"---
title: Custom Project
custom-field: value
---
"#;
            let project = ParsedProject::parse(content).unwrap();
            assert!(project.extra.contains_key("custom-field"));
        }

        #[test]
        fn parse_project_no_frontmatter_fails() {
            let content = "# Just a header";
            let result = ParsedProject::parse(content);
            assert!(result.is_err());
        }
    }

    mod parsed_area {
        use super::*;

        #[test]
        fn parse_minimal_area() {
            let content = r#"---
title: Test Area
---
"#;
            let area = ParsedArea::parse(content).unwrap();
            assert_eq!(area.title, "Test Area");
            assert!(area.status.is_none());
        }

        #[test]
        fn parse_area_with_all_fields() {
            let content = r#"---
title: Work
status: active
type: professional
description: Work-related tasks and projects.
---

## Context

Area content here.
"#;
            let area = ParsedArea::parse(content).unwrap();
            assert_eq!(area.title, "Work");
            assert_eq!(area.status, Some(AreaStatus::Active));
            assert_eq!(area.area_type, Some("professional".to_string()));
            assert!(area.description.is_some());
            assert!(area.body.contains("## Context"));
        }

        #[test]
        fn parse_area_archived_status() {
            let content = r#"---
title: Old Area
status: archived
---
"#;
            let area = ParsedArea::parse(content).unwrap();
            assert_eq!(area.status, Some(AreaStatus::Archived));
        }

        #[test]
        fn parse_area_with_extra_fields() {
            let content = r#"---
title: Custom Area
custom-field: value
---
"#;
            let area = ParsedArea::parse(content).unwrap();
            assert!(area.extra.contains_key("custom-field"));
        }

        #[test]
        fn parse_area_no_frontmatter_fails() {
            let content = "# Just markdown";
            let result = ParsedArea::parse(content);
            assert!(result.is_err());
        }
    }
}
