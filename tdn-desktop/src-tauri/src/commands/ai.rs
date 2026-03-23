//! Tauri commands for Apple Intelligence integration.
//!
//! Provides AI-powered processing of free-form text input in the quick entry pane,
//! parsing dictated/typed text into structured task fields.

use serde::{Deserialize, Serialize};
use specta::Type;

/// Result of AI-processing free-form text into structured task fields.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ParsedQuickEntry {
    pub title: String,
    pub body: String,
    pub status: String,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
    /// Matched project ID (if a project name was recognised)
    pub project_id: Option<String>,
    /// Matched area ID (if an area name was recognised)
    pub area_id: Option<String>,
}

/// A name+ID pair for passing project/area context to the AI processor.
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NameIdPair {
    pub id: String,
    pub name: String,
}

/// Check if Apple Intelligence is available on this device.
#[tauri::command]
#[specta::specta]
pub fn check_apple_intelligence_available() -> bool {
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        crate::apple_intelligence::check_availability()
    }
    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        false
    }
}

/// Process free-form text input using Apple Intelligence to extract structured task fields.
///
/// Takes the raw text from the quick entry title field, plus lists of available
/// projects and areas for context, and returns a parsed result with all fields populated.
#[tauri::command]
#[specta::specta]
pub fn process_quick_entry_text(
    text: String,
    projects: Vec<NameIdPair>,
    areas: Vec<NameIdPair>,
) -> Result<ParsedQuickEntry, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("No text to process".to_string());
    }

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        let system_prompt = build_system_prompt(&projects, &areas);
        let response = crate::apple_intelligence::process_text(&system_prompt, trimmed, 0)?;
        parse_ai_response(&response, trimmed, &projects, &areas)
    }

    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        let _ = (projects, areas);
        Err("Apple Intelligence is not available on this platform".to_string())
    }
}

/// Build the system prompt with today's date and available projects/areas.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn build_system_prompt(projects: &[NameIdPair], areas: &[NameIdPair]) -> String {
    let today = chrono::Local::now();
    let date_str = today.format("%Y-%m-%d").to_string();
    let day_of_week = today.format("%A").to_string();

    let project_names: Vec<&str> = projects.iter().map(|p| p.name.as_str()).collect();
    let area_names: Vec<&str> = areas.iter().map(|a| a.name.as_str()).collect();

    let projects_list = if project_names.is_empty() {
        "(none)".to_string()
    } else {
        project_names.join(", ")
    };

    let areas_list = if area_names.is_empty() {
        "(none)".to_string()
    } else {
        area_names.join(", ")
    };

    format!(
        "You are a task parser. Extract structured task fields from free-form input.\n\
         Today is {date_str} ({day_of_week}).\n\
         \n\
         Available projects: {projects_list}\n\
         Available areas: {areas_list}\n\
         \n\
         Rules:\n\
         - Create a concise, actionable title (not the raw input verbatim)\n\
         - Match project/area names exactly from the lists above, or return empty string\n\
         - Convert any relative dates to YYYY-MM-DD format based on today's date\n\
         - Default status to inbox unless clearly stated otherwise\n\
         - Put any detail beyond the title into the body field"
    )
}

/// Parse the AI response JSON into a `ParsedQuickEntry`, resolving project/area names to IDs.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn parse_ai_response(
    response: &str,
    original_text: &str,
    projects: &[NameIdPair],
    areas: &[NameIdPair],
) -> Result<ParsedQuickEntry, String> {
    // Try to parse as JSON (structured output from @Generable)
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(response) {
        let title = parsed["title"]
            .as_str()
            .unwrap_or(original_text)
            .trim()
            .to_string();

        let body_from_ai = parsed["body"].as_str().unwrap_or("").trim().to_string();

        // Determine body: include original text unless title is identical to input
        let body = if title.eq_ignore_ascii_case(original_text.trim()) {
            // Title is the same as input — no need to duplicate in body
            body_from_ai
        } else {
            // Title was transformed — preserve original text in body
            if body_from_ai.is_empty() {
                original_text.trim().to_string()
            } else {
                format!("{}\n\n{}", original_text.trim(), body_from_ai)
            }
        };

        let status = parsed["status"]
            .as_str()
            .unwrap_or("inbox")
            .trim()
            .to_string();

        // Validate status is a known value
        let status = match status.as_str() {
            "inbox" | "icebox" | "ready" | "in-progress" | "blocked" => status,
            _ => "inbox".to_string(),
        };

        let due = non_empty_date(parsed["due"].as_str());
        let scheduled = non_empty_date(parsed["scheduled"].as_str());
        let defer_until = non_empty_date(parsed["deferUntil"].as_str());

        // Match project name to ID (case-insensitive exact match)
        let project_name = parsed["project"].as_str().unwrap_or("").trim();
        let project_id = match_name_to_id(project_name, projects);

        // Match area name to ID (case-insensitive exact match)
        let area_name = parsed["area"].as_str().unwrap_or("").trim();
        let area_id = match_name_to_id(area_name, areas);

        Ok(ParsedQuickEntry {
            title,
            body,
            status,
            due,
            scheduled,
            defer_until,
            project_id,
            area_id,
        })
    } else {
        // Fallback: structured output failed, model returned plain text.
        // Use the original text as title and the AI response as body context.
        log::warn!("AI returned non-JSON response, using fallback parsing");
        Ok(ParsedQuickEntry {
            title: original_text.trim().to_string(),
            body: response.trim().to_string(),
            status: "inbox".to_string(),
            due: None,
            scheduled: None,
            defer_until: None,
            project_id: None,
            area_id: None,
        })
    }
}

/// Validate a date string is in YYYY-MM-DD format and return Some, or None if empty/invalid.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn non_empty_date(s: Option<&str>) -> Option<String> {
    let s = s?.trim();
    if s.is_empty() {
        return None;
    }
    // Validate YYYY-MM-DD format
    if chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok() {
        Some(s.to_string())
    } else {
        log::warn!("AI returned invalid date format: {s}");
        None
    }
}

/// Case-insensitive exact match of a name to an ID from a list of name/ID pairs.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn match_name_to_id(name: &str, pairs: &[NameIdPair]) -> Option<String> {
    if name.is_empty() {
        return None;
    }
    pairs
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(name))
        .map(|p| p.id.clone())
}
