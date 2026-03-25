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

/// A project with its area relationship for richer AI context.
#[derive(Debug, Clone, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectContext {
    pub id: String,
    pub name: String,
    /// The area name this project belongs to (if any)
    pub area_name: Option<String>,
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
/// projects (with area relationships) and areas for context.
#[tauri::command]
#[specta::specta]
pub fn process_quick_entry_text(
    text: String,
    projects: Vec<ProjectContext>,
    areas: Vec<NameIdPair>,
) -> Result<ParsedQuickEntry, String> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err("No text to process".to_string());
    }

    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    {
        let today = chrono::Local::now();
        let date_str = today.format("%Y-%m-%d").to_string();
        let day_of_week = today.format("%A").to_string();

        let projects_with_areas: Vec<super::ai_prompts::ProjectWithArea> = projects
            .iter()
            .map(|p| super::ai_prompts::ProjectWithArea {
                name: p.name.clone(),
                area_name: p.area_name.clone(),
            })
            .collect();

        let system_prompt =
            super::ai_prompts::build_system_prompt(&projects_with_areas, &areas, &date_str, &day_of_week);

        log::info!("── AI Quick Entry ──────────────────────────────────");
        log::info!("Input: {trimmed:?}");
        log::debug!("System prompt:\n{system_prompt}");

        let response = crate::apple_intelligence::process_text(&system_prompt, trimmed, 0)?;

        log::info!("Raw response: {response}");

        let result = parse_ai_response(&response, trimmed, &projects, &areas)?;

        log::info!("Mapped result:");
        log::info!("  title:     {:?}", result.title);
        log::info!(
            "  body:      {:?}",
            if result.body.is_empty() {
                "(empty)"
            } else {
                &result.body
            }
        );
        log::info!("  status:    {:?}", result.status);
        log::info!("  due:       {:?}", result.due);
        log::info!("  scheduled: {:?}", result.scheduled);
        log::info!("  defer:     {:?}", result.defer_until);
        log::info!("  project:   {:?}", result.project_id);
        log::info!("  area:      {:?}", result.area_id);
        log::info!("────────────────────────────────────────────────────");

        Ok(result)
    }

    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        let _ = (projects, areas);
        Err("Apple Intelligence is not available on this platform".to_string())
    }
}

/// Parse the AI response JSON into a `ParsedQuickEntry`, resolving project/area names to IDs.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn parse_ai_response(
    response: &str,
    original_text: &str,
    projects: &[ProjectContext],
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
            // But only use AI body if it adds new information
            if is_essentially_same(&body_from_ai, original_text.trim()) {
                String::new()
            } else {
                body_from_ai
            }
        } else {
            // Title was transformed — preserve original text in body
            // Don't append AI body if it's just parroting the input
            if body_from_ai.is_empty()
                || is_essentially_same(&body_from_ai, original_text.trim())
            {
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
        let project_id = match_project_name_to_id(project_name, projects);

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

/// Check if two strings are essentially the same (ignoring case, trailing punctuation, whitespace).
/// Used to avoid duplicating content when the AI parrots back the input.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn is_essentially_same(a: &str, b: &str) -> bool {
    if a.is_empty() || b.is_empty() {
        return a.is_empty() && b.is_empty();
    }
    let normalize = |s: &str| {
        s.trim()
            .trim_end_matches(|c: char| c == '.' || c == '!' || c == '?')
            .to_lowercase()
    };
    normalize(a) == normalize(b)
}

/// Case-insensitive exact match of a project name to its ID.
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn match_project_name_to_id(name: &str, projects: &[ProjectContext]) -> Option<String> {
    if name.is_empty() {
        return None;
    }
    projects
        .iter()
        .find(|p| p.name.eq_ignore_ascii_case(name))
        .map(|p| p.id.clone())
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
