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

/// Strip markdown code fences from a response (e.g. ```json\n{...}\n```)
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
fn strip_code_fences(s: &str) -> &str {
    let trimmed = s.trim();
    if let Some(rest) = trimmed.strip_prefix("```") {
        // Skip the language tag (e.g. "json") on the first line
        let after_tag = rest.find('\n').map(|i| &rest[i + 1..]).unwrap_or(rest);
        // Strip trailing fence
        after_tag
            .strip_suffix("```")
            .unwrap_or(after_tag)
            .trim()
    } else {
        trimmed
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
    // Try to parse as JSON (structured output from @Generable).
    // Also handles fallback where model returns JSON wrapped in markdown code fences.
    let clean_response = strip_code_fences(response);
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_response) {
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

// =============================================================================
// Evaluation Harness
// =============================================================================
//
// A development tool for iterating on prompt quality. NOT part of the normal
// test suite — requires a live Apple Intelligence model on the device.
//
// Run with: cargo test -p taskdn-desktop eval_ai -- --ignored --nocapture
//
// Each test case sends real text through the full pipeline (prompt building →
// Apple Intelligence → response parsing) and compares against expectations.

#[cfg(test)]
#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
mod eval {
    use super::*;

    // ── Fixed context for reproducible evaluation ────────────────────────

    const EVAL_DATE: &str = "2026-03-25";
    const EVAL_DAY: &str = "Wednesday";

    fn eval_projects() -> Vec<ProjectContext> {
        vec![
            ProjectContext { id: "p-japan".into(), name: "Japan Trip 2025".into(), area_name: Some("Travel".into()) },
            ProjectContext { id: "p-acme".into(), name: "Acme Dashboard Redesign".into(), area_name: Some("Acme Corp".into()) },
            ProjectContext { id: "p-tax".into(), name: "Q1 Tax Preparation".into(), area_name: Some("Finance".into()) },
            ProjectContext { id: "p-blog".into(), name: "Tech Blog Relaunch".into(), area_name: Some("Writing".into()) },
            ProjectContext { id: "p-cli".into(), name: "Open Source CLI Tool".into(), area_name: Some("Coding".into()) },
            ProjectContext { id: "p-marathon".into(), name: "Half Marathon Training".into(), area_name: Some("Health".into()) },
            ProjectContext { id: "p-office".into(), name: "Home Office Setup".into(), area_name: Some("Home".into()) },
            ProjectContext { id: "p-garden".into(), name: "Garden Renovation".into(), area_name: Some("Home".into()) },
            ProjectContext { id: "p-newsletter".into(), name: "Newsletter Setup".into(), area_name: Some("Writing".into()) },
            ProjectContext { id: "p-rust".into(), name: "Learn Rust".into(), area_name: Some("Learning".into()) },
        ]
    }

    fn eval_areas() -> Vec<NameIdPair> {
        vec![
            NameIdPair { id: "a-travel".into(), name: "Travel".into() },
            NameIdPair { id: "a-acme".into(), name: "Acme Corp".into() },
            NameIdPair { id: "a-finance".into(), name: "Finance".into() },
            NameIdPair { id: "a-writing".into(), name: "Writing".into() },
            NameIdPair { id: "a-coding".into(), name: "Coding".into() },
            NameIdPair { id: "a-health".into(), name: "Health".into() },
            NameIdPair { id: "a-home".into(), name: "Home".into() },
            NameIdPair { id: "a-learning".into(), name: "Learning".into() },
            NameIdPair { id: "a-marketing".into(), name: "Marketing".into() },
        ]
    }

    // ── Expected output specification ────────────────────────────────────

    struct Expected {
        /// Substring that must appear in the title (case-insensitive)
        title_contains: &'static str,
        /// Expected status value
        status: &'static str,
        /// Expected project ID (None = must be empty)
        project: Option<&'static str>,
        /// Expected area ID (None = must be empty)
        area: Option<&'static str>,
        /// Expected scheduled date (None = must be empty)
        scheduled: Option<&'static str>,
        /// Expected due date (None = must be empty)
        due: Option<&'static str>,
        /// Expected defer date (None = must be empty)
        defer: Option<&'static str>,
        /// If true, body must be empty
        body_empty: bool,
    }

    // ── Test runner ──────────────────────────────────────────────────────

    fn run_eval(input: &str, expected: &Expected) -> (ParsedQuickEntry, Vec<String>) {
        let projects = eval_projects();
        let areas = eval_areas();

        let projects_with_areas: Vec<super::super::ai_prompts::ProjectWithArea> = projects
            .iter()
            .map(|p| super::super::ai_prompts::ProjectWithArea {
                name: p.name.clone(),
                area_name: p.area_name.clone(),
            })
            .collect();

        let system_prompt = super::super::ai_prompts::build_system_prompt(
            &projects_with_areas,
            &areas,
            EVAL_DATE,
            EVAL_DAY,
        );

        let response = crate::apple_intelligence::process_text(&system_prompt, input, 0)
            .expect("Apple Intelligence call failed");

        let result = parse_ai_response(&response, input, &projects, &areas)
            .expect("Response parsing failed");

        let mut failures = Vec::new();

        // Check title
        if !result.title.to_lowercase().contains(&expected.title_contains.to_lowercase()) {
            failures.push(format!(
                "title: expected to contain {:?}, got {:?}",
                expected.title_contains, result.title
            ));
        }

        // Check status
        if result.status != expected.status {
            failures.push(format!(
                "status: expected {:?}, got {:?}",
                expected.status, result.status
            ));
        }

        // Check project
        match expected.project {
            Some(id) => {
                if result.project_id.as_deref() != Some(id) {
                    failures.push(format!(
                        "project: expected Some({:?}), got {:?}",
                        id, result.project_id
                    ));
                }
            }
            None => {
                if result.project_id.is_some() {
                    failures.push(format!(
                        "project: expected None, got {:?}",
                        result.project_id
                    ));
                }
            }
        }

        // Check area
        match expected.area {
            Some(id) => {
                if result.area_id.as_deref() != Some(id) {
                    failures.push(format!(
                        "area: expected Some({:?}), got {:?}",
                        id, result.area_id
                    ));
                }
            }
            None => {
                if result.area_id.is_some() {
                    failures.push(format!(
                        "area: expected None, got {:?}",
                        result.area_id
                    ));
                }
            }
        }

        // Check dates
        check_date_field("scheduled", &result.scheduled, expected.scheduled, &mut failures);
        check_date_field("due", &result.due, expected.due, &mut failures);
        check_date_field("defer", &result.defer_until, expected.defer, &mut failures);

        // Check body
        if expected.body_empty && !result.body.is_empty() {
            failures.push(format!("body: expected empty, got {:?}", result.body));
        }

        (result, failures)
    }

    fn check_date_field(
        name: &str,
        actual: &Option<String>,
        expected: Option<&str>,
        failures: &mut Vec<String>,
    ) {
        match expected {
            Some(date) => {
                if actual.as_deref() != Some(date) {
                    failures.push(format!(
                        "{name}: expected Some({date:?}), got {actual:?}"
                    ));
                }
            }
            None => {
                if actual.is_some() {
                    failures.push(format!(
                        "{name}: expected None, got {actual:?}"
                    ));
                }
            }
        }
    }

    // ── The eval suite ───────────────────────────────────────────────────

    #[test]
    #[ignore]
    fn eval_ai() {
        let cases: Vec<(&str, Expected)> = vec![
            // ── Simple inputs (should leave most fields empty) ───────
            (
                "Buy groceries for the week",
                Expected {
                    title_contains: "groceries",
                    status: "inbox",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: true,
                },
            ),
            (
                "Look into upgrading the database",
                Expected {
                    title_contains: "database",
                    status: "inbox",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: true,
                },
            ),
            (
                "Remember to water the plants",
                Expected {
                    title_contains: "water",
                    status: "inbox",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: true,
                },
            ),
            // ── Project/area matching ────────────────────────────────
            (
                "Review the Acme Dashboard Redesign mockups",
                Expected {
                    title_contains: "mockup",
                    status: "inbox",
                    project: Some("p-acme"),
                    area: None,   // area should come from project, not be set separately
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            (
                "Write a blog post for the Tech Blog Relaunch",
                Expected {
                    title_contains: "blog",
                    status: "inbox",
                    project: Some("p-blog"),
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            // ── Date extraction ──────────────────────────────────────
            (
                "Call the dentist tomorrow about that crown",
                Expected {
                    title_contains: "dentist",
                    status: "ready",
                    project: None,
                    area: None,
                    scheduled: Some("2026-03-26"),
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            (
                "Submit the Q1 tax return by April 15th",
                Expected {
                    title_contains: "tax",
                    status: "inbox",
                    project: Some("p-tax"),
                    area: None,
                    scheduled: None,
                    due: Some("2026-04-15"),
                    defer: None,
                    body_empty: false,
                },
            ),
            (
                "Schedule a team meeting for this Friday",
                Expected {
                    title_contains: "meeting",
                    status: "inbox",
                    project: None,
                    area: None,
                    scheduled: Some("2026-03-27"),
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            // ── Status detection ─────────────────────────────────────
            (
                "Buy milk this afternoon",
                Expected {
                    title_contains: "milk",
                    status: "ready",
                    project: None,
                    area: None,
                    scheduled: Some("2026-03-25"), // today
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            (
                "Maybe one day learn to play guitar",
                Expected {
                    title_contains: "guitar",
                    status: "icebox",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: true,
                },
            ),
            (
                "The API refactor is blocked waiting on the security review",
                Expected {
                    title_contains: "API",
                    status: "blocked",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            // ── Complex / dictation-style ────────────────────────────
            (
                "Email James about the Japan Trip, schedule for next Monday",
                Expected {
                    title_contains: "James",
                    status: "inbox",
                    project: Some("p-japan"),
                    area: None,
                    scheduled: Some("2026-03-30"),
                    due: None,
                    defer: None,
                    body_empty: false,
                },
            ),
            (
                "Book flights by the end of next week",
                Expected {
                    title_contains: "flight",
                    status: "inbox",
                    project: None,
                    area: None,
                    scheduled: None,
                    due: Some("2026-04-03"),
                    defer: None,
                    body_empty: false,
                },
            ),
        ];

        println!("\n======================================================================");
        println!("AI Quick Entry Evaluation — {} cases", cases.len());
        println!("Context date: {EVAL_DATE} ({EVAL_DAY})");
        println!("======================================================================\n");

        let mut total_pass = 0;
        let mut total_fail = 0;

        for (input, expected) in &cases {
            let (result, failures) = run_eval(input, expected);

            if failures.is_empty() {
                total_pass += 1;
                println!("  ✓ {input:?}");
            } else {
                total_fail += 1;
                println!("  ✗ {input:?}");
                println!("    Raw: title={:?} status={:?} project={:?} area={:?}",
                    result.title, result.status, result.project_id, result.area_id);
                println!("         due={:?} sched={:?} defer={:?}",
                    result.due, result.scheduled, result.defer_until);
                for f in &failures {
                    println!("    FAIL: {f}");
                }
            }
        }

        println!("\n----------------------------------------------------------------------");
        println!("Results: {total_pass} passed, {total_fail} failed out of {} cases",
            cases.len());
        println!("----------------------------------------------------------------------\n");

        // Don't assert — this is an eval tool, not a hard test.
        // Some failures are expected while iterating on prompts.
        if total_fail > 0 {
            println!("NOTE: {total_fail} cases failed. This is expected while iterating.");
            println!("      Review failures above and adjust ai_prompts.rs as needed.");
        }
    }
}
