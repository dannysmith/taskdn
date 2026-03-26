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
///
/// This command is async to avoid blocking the main thread — the Swift FFI call
/// uses a DispatchSemaphore which blocks for 2-3 seconds during inference.
#[tauri::command]
#[specta::specta]
pub async fn process_quick_entry_text(
    text: String,
    projects: Vec<ProjectContext>,
    areas: Vec<NameIdPair>,
) -> Result<ParsedQuickEntry, String> {
    // Move the blocking FFI work off the main thread
    tauri::async_runtime::spawn_blocking(move || {
        process_quick_entry_text_sync(&text, &projects, &areas)
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
}

/// Synchronous implementation — called from spawn_blocking and from the eval harness.
pub(crate) fn process_quick_entry_text_sync(
    text: &str,
    projects: &[ProjectContext],
    areas: &[NameIdPair],
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

        let system_prompt = super::ai_prompts::build_system_prompt(
            &projects_with_areas,
            areas,
            &date_str,
            &day_of_week,
        );

        log::info!("AI Quick Entry: processing input");
        log::debug!("── AI Quick Entry ──────────────────────────────────");
        log::debug!("Input: {trimmed:?}");
        log::debug!("System prompt:\n{system_prompt}");

        let response = crate::apple_intelligence::process_text(&system_prompt, trimmed, 0)?;

        log::debug!("Raw response: {response}");

        let mut result =
            parse_ai_response(&response, trimmed, projects, areas, today.date_naive())?;

        // Determine status via keyword detection (not LLM)
        result.status = detect_status_from_keywords(trimmed).to_string();

        log::debug!("Mapped result:");
        log::debug!("  title:     {:?}", result.title);
        log::debug!("  status:    {:?}", result.status);
        log::debug!("  due:       {:?}", result.due);
        log::debug!("  scheduled: {:?}", result.scheduled);
        log::debug!("  defer:     {:?}", result.defer_until);
        log::debug!("  project:   {:?}", result.project_id);
        log::debug!("  area:      {:?}", result.area_id);
        log::debug!("────────────────────────────────────────────────────");
        log::info!("AI Quick Entry: complete");

        Ok(result)
    }

    #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
    {
        let _ = (projects, areas);
        Err("Apple Intelligence is not available on this platform".to_string())
    }
}

/// Strip markdown code fences from a response (e.g. ```json\n{...}\n```)
fn strip_code_fences(s: &str) -> &str {
    let trimmed = s.trim();
    if let Some(rest) = trimmed.strip_prefix("```") {
        // Skip the language tag (e.g. "json") on the first line
        let after_tag = rest.find('\n').map(|i| &rest[i + 1..]).unwrap_or(rest);
        // Strip trailing fence
        after_tag.strip_suffix("```").unwrap_or(after_tag).trim()
    } else {
        trimmed
    }
}

/// Parse the AI response JSON into a `ParsedQuickEntry`, resolving project/area names to IDs.
/// `today` is used for resolving relative date expressions.
fn parse_ai_response(
    response: &str,
    original_text: &str,
    projects: &[ProjectContext],
    areas: &[NameIdPair],
    today: chrono::NaiveDate,
) -> Result<ParsedQuickEntry, String> {
    // Try to parse as JSON (structured output from @Generable).
    // Also handles fallback where model returns JSON wrapped in markdown code fences.
    let clean_response = strip_code_fences(response);
    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(clean_response) {
        let raw_title = parsed["title"].as_str().unwrap_or("").trim();
        let title = if raw_title.is_empty() {
            original_text.trim().to_string()
        } else {
            raw_title.to_string()
        };

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
            if body_from_ai.is_empty() || is_essentially_same(&body_from_ai, original_text.trim()) {
                original_text.trim().to_string()
            } else {
                let original_trimmed = original_text.trim();
                format!("{original_trimmed}\n\n{body_from_ai}")
            }
        };

        // Status is determined by keyword detection, not the LLM
        let status = "inbox".to_string();

        // Resolve date expressions deterministically
        let due_ref = parsed["dueRef"].as_str().unwrap_or("").trim();
        let scheduled_ref = parsed["scheduledRef"].as_str().unwrap_or("").trim();
        let defer_ref = parsed["deferUntilRef"].as_str().unwrap_or("").trim();

        let due = super::ai_resolve::resolve_date_expression(due_ref, today);
        let scheduled = super::ai_resolve::resolve_date_expression(scheduled_ref, today);
        let defer_until = super::ai_resolve::resolve_date_expression(defer_ref, today);

        // Match project/area names with fuzzy (substring) matching
        let project_name = parsed["project"].as_str().unwrap_or("").trim();
        let project_id = super::ai_resolve::match_project_fuzzy(project_name, projects);

        let area_name = parsed["area"].as_str().unwrap_or("").trim();
        let area_id = super::ai_resolve::match_area_fuzzy(area_name, areas);

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

/// Check if two strings are essentially the same (ignoring case, trailing punctuation, whitespace).
/// Used to avoid duplicating content when the AI parrots back the input.
fn is_essentially_same(a: &str, b: &str) -> bool {
    if a.is_empty() || b.is_empty() {
        return a.is_empty() && b.is_empty();
    }
    let normalize = |s: &str| s.trim().trim_end_matches(['.', '!', '?']).to_lowercase();
    normalize(a) == normalize(b)
}

// =============================================================================
// Keyword-Based Status Detection
// =============================================================================

/// Detect task status from explicit keywords in the input text.
/// Only matches unambiguous, explicit status language. Returns "inbox" by default.
///
/// This is intentionally narrow — false negatives (missing an icebox intent) are
/// harmless since the user can change the status dropdown in half a second.
/// False positives (wrongly setting blocked/icebox) are more disruptive.
pub fn detect_status_from_keywords(input: &str) -> &'static str {
    let lower = input.to_lowercase();

    // Use word-boundary matching to avoid false positives like "unblocked"
    let has_word = |word: &str| {
        lower
            .find(word)
            .map(|pos| {
                let before = if pos == 0 {
                    true
                } else {
                    !lower.as_bytes()[pos - 1].is_ascii_alphanumeric()
                };
                let after_pos = pos + word.len();
                let after = if after_pos >= lower.len() {
                    true
                } else {
                    !lower.as_bytes()[after_pos].is_ascii_alphanumeric()
                };
                before && after
            })
            .unwrap_or(false)
    };

    // Check for blocked — explicit blocking language
    if has_word("blocked") || lower.contains("waiting on") || lower.contains("waitingon") {
        return "blocked";
    }

    // Check for icebox — only very explicit mentions
    if has_word("icebox") || lower.contains("ice box") || lower.contains("ice-box") {
        return "icebox";
    }

    // Check for in-progress — explicit mentions only
    if lower.contains("in progress")
        || lower.contains("in-progress")
        || lower.contains("inprogress")
    {
        return "in-progress";
    }

    "inbox"
}

// =============================================================================
// Unit Tests (deterministic, runs in normal test suite)
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keyword_default_is_inbox() {
        assert_eq!(detect_status_from_keywords("Buy groceries"), "inbox");
        assert_eq!(
            detect_status_from_keywords("Call the dentist tomorrow"),
            "inbox"
        );
        assert_eq!(detect_status_from_keywords("Review the mockups"), "inbox");
    }

    #[test]
    fn keyword_detects_blocked() {
        assert_eq!(
            detect_status_from_keywords("This is blocked by the security review"),
            "blocked"
        );
        assert_eq!(
            detect_status_from_keywords("Waiting on the client to respond"),
            "blocked"
        );
        assert_eq!(
            detect_status_from_keywords("waitingon client response"),
            "blocked"
        );
    }

    #[test]
    fn keyword_blocked_is_narrow() {
        assert_eq!(
            detect_status_from_keywords("Can't proceed until we get approval"),
            "inbox"
        );
        assert_eq!(
            detect_status_from_keywords("Stuck on the API migration"),
            "inbox"
        );
    }

    #[test]
    fn keyword_detects_icebox() {
        assert_eq!(
            detect_status_from_keywords("Icebox task to learn piano"),
            "icebox"
        );
        assert_eq!(
            detect_status_from_keywords("Put this in the ice box"),
            "icebox"
        );
        assert_eq!(
            detect_status_from_keywords("ice-box this for later"),
            "icebox"
        );
    }

    #[test]
    fn keyword_icebox_is_narrow() {
        assert_eq!(detect_status_from_keywords("Maybe call the bank"), "inbox");
        assert_eq!(
            detect_status_from_keywords("I might need to do this"),
            "inbox"
        );
        assert_eq!(detect_status_from_keywords("One day learn guitar"), "inbox");
        assert_eq!(
            detect_status_from_keywords("Eventually get around to it"),
            "inbox"
        );
    }

    #[test]
    fn keyword_detects_in_progress() {
        assert_eq!(
            detect_status_from_keywords("This is in progress"),
            "in-progress"
        );
        assert_eq!(
            detect_status_from_keywords("Mark as in-progress"),
            "in-progress"
        );
        assert_eq!(
            detect_status_from_keywords("inprogress task"),
            "in-progress"
        );
    }

    #[test]
    fn keyword_in_progress_is_narrow() {
        assert_eq!(
            detect_status_from_keywords("Already started the refactor"),
            "inbox"
        );
        assert_eq!(
            detect_status_from_keywords("Working on the dashboard"),
            "inbox"
        );
    }

    #[test]
    fn keyword_case_insensitive() {
        assert_eq!(detect_status_from_keywords("This is BLOCKED"), "blocked");
        assert_eq!(detect_status_from_keywords("ICEBOX this task"), "icebox");
        assert_eq!(
            detect_status_from_keywords("IN PROGRESS refactor"),
            "in-progress"
        );
    }

    #[test]
    fn keyword_no_false_positive_on_unblocked() {
        assert_eq!(
            detect_status_from_keywords("This task is now unblocked"),
            "inbox"
        );
    }

    // ── Parsing helper tests ─────────────────────────────────────────────

    #[test]
    fn strip_code_fences_plain_json() {
        let json = r#"{"title":"Buy milk"}"#;
        assert_eq!(strip_code_fences(json), json);
    }

    #[test]
    fn strip_code_fences_markdown_wrapped() {
        let input = "```json\n{\"title\":\"Buy milk\"}\n```";
        assert_eq!(strip_code_fences(input), r#"{"title":"Buy milk"}"#);
    }

    #[test]
    fn strip_code_fences_no_language_tag() {
        let input = "```\n{\"title\":\"Buy milk\"}\n```";
        assert_eq!(strip_code_fences(input), r#"{"title":"Buy milk"}"#);
    }

    #[test]
    fn is_essentially_same_basic() {
        assert!(is_essentially_same("hello", "hello"));
        assert!(is_essentially_same("Hello", "hello"));
        assert!(is_essentially_same("hello.", "hello"));
        assert!(is_essentially_same("hello!", "Hello"));
        assert!(!is_essentially_same("hello", "world"));
    }

    #[test]
    fn is_essentially_same_empty() {
        assert!(is_essentially_same("", ""));
        assert!(!is_essentially_same("hello", ""));
        assert!(!is_essentially_same("", "hello"));
    }

    #[test]
    fn parse_ai_response_empty_title_falls_back() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 3, 25).unwrap();
        let response = r#"{"title":"","body":"","project":"","area":"","scheduledRef":"","dueRef":"","deferUntilRef":""}"#;
        let result = parse_ai_response(response, "Buy milk", &[], &[], today).unwrap();
        assert_eq!(result.title, "Buy milk");
    }

    #[test]
    fn parse_ai_response_non_json_fallback() {
        let today = chrono::NaiveDate::from_ymd_opt(2026, 3, 25).unwrap();
        let response = "This is not JSON at all";
        let result = parse_ai_response(response, "Buy milk", &[], &[], today).unwrap();
        assert_eq!(result.title, "Buy milk");
        assert_eq!(result.body, "This is not JSON at all");
    }
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
            ProjectContext {
                id: "p-japan".into(),
                name: "Japan Trip 2025".into(),
                area_name: Some("Travel".into()),
            },
            ProjectContext {
                id: "p-acme".into(),
                name: "Acme Dashboard Redesign".into(),
                area_name: Some("Acme Corp".into()),
            },
            ProjectContext {
                id: "p-tax".into(),
                name: "Q1 Tax Preparation".into(),
                area_name: Some("Finance".into()),
            },
            ProjectContext {
                id: "p-blog".into(),
                name: "Tech Blog Relaunch".into(),
                area_name: Some("Writing".into()),
            },
            ProjectContext {
                id: "p-cli".into(),
                name: "Open Source CLI Tool".into(),
                area_name: Some("Coding".into()),
            },
            ProjectContext {
                id: "p-marathon".into(),
                name: "Half Marathon Training".into(),
                area_name: Some("Health".into()),
            },
            ProjectContext {
                id: "p-office".into(),
                name: "Home Office Setup".into(),
                area_name: Some("Home".into()),
            },
            ProjectContext {
                id: "p-garden".into(),
                name: "Garden Renovation".into(),
                area_name: Some("Home".into()),
            },
            ProjectContext {
                id: "p-newsletter".into(),
                name: "Newsletter Setup".into(),
                area_name: Some("Writing".into()),
            },
            ProjectContext {
                id: "p-rust".into(),
                name: "Learn Rust".into(),
                area_name: Some("Learning".into()),
            },
        ]
    }

    fn eval_areas() -> Vec<NameIdPair> {
        vec![
            NameIdPair {
                id: "a-travel".into(),
                name: "Travel".into(),
            },
            NameIdPair {
                id: "a-acme".into(),
                name: "Acme Corp".into(),
            },
            NameIdPair {
                id: "a-finance".into(),
                name: "Finance".into(),
            },
            NameIdPair {
                id: "a-writing".into(),
                name: "Writing".into(),
            },
            NameIdPair {
                id: "a-coding".into(),
                name: "Coding".into(),
            },
            NameIdPair {
                id: "a-health".into(),
                name: "Health".into(),
            },
            NameIdPair {
                id: "a-home".into(),
                name: "Home".into(),
            },
            NameIdPair {
                id: "a-learning".into(),
                name: "Learning".into(),
            },
            NameIdPair {
                id: "a-marketing".into(),
                name: "Marketing".into(),
            },
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
        /// Body check: Some(true) = must be empty, Some(false) = must have content, None = don't check.
        /// Note: body is populated by deterministic Rust code (original text preserved when title
        /// is transformed), so this mostly tests our code, not the LLM. Use None for most cases.
        body_empty: Option<bool>,
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

        let eval_today = chrono::NaiveDate::parse_from_str(EVAL_DATE, "%Y-%m-%d").unwrap();
        let mut result = parse_ai_response(&response, input, &projects, &areas, eval_today)
            .expect("Response parsing failed");

        // Apply keyword detection (same as production code path)
        result.status = detect_status_from_keywords(input).to_string();

        let mut failures = Vec::new();

        // Check title
        if !result
            .title
            .to_lowercase()
            .contains(&expected.title_contains.to_lowercase())
        {
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
                    failures.push(format!("area: expected None, got {:?}", result.area_id));
                }
            }
        }

        // Check dates
        check_date_field(
            "scheduled",
            &result.scheduled,
            expected.scheduled,
            &mut failures,
        );
        check_date_field("due", &result.due, expected.due, &mut failures);
        check_date_field("defer", &result.defer_until, expected.defer, &mut failures);

        // Check body
        match expected.body_empty {
            Some(true) if !result.body.is_empty() => {
                failures.push(format!("body: expected empty, got {:?}", result.body));
            }
            Some(false) if result.body.is_empty() => {
                failures.push("body: expected content, got empty".to_string());
            }
            _ => {} // None = don't check
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
                    failures.push(format!("{name}: expected Some({date:?}), got {actual:?}"));
                }
            }
            None => {
                if actual.is_some() {
                    failures.push(format!("{name}: expected None, got {actual:?}"));
                }
            }
        }
    }

    // ── The eval suite ───────────────────────────────────────────────────

    #[test]
    #[ignore]
    fn eval_ai() {
        // Note: EVAL_DATE is 2026-03-25, a Wednesday.
        // Thu=26, Fri=27, Sat=28, Sun=29, Mon=30, Tue=31, Wed Apr 1, Thu=2, Fri=3
        //
        // body_empty: None means "don't check body" — body content is determined by
        // deterministic Rust code (if title differs from input, original text goes in
        // body), so it's not testing LLM quality. Use Some(true) only when the title
        // is very likely to be identical to input (i.e. input is already a clean title).
        let cases: Vec<(&str, Expected)> =
            vec![

            // =============================================================
            // SIMPLE INPUTS — no metadata expected
            // =============================================================

            (
                "Buy groceries for the week",
                Expected {
                    title_contains: "groceries", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,  // title may or may not be shortened
                },
            ),
            (
                "Look into upgrading the database",
                Expected {
                    title_contains: "database", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Remember to water the plants",
                Expected {
                    title_contains: "water", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Think about what to get mum for her birthday",
                Expected {
                    title_contains: "mum", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // PROJECT MATCHING — explicit project names in input
            // =============================================================

            (
                "Review the Acme Dashboard Redesign mockups",
                Expected {
                    title_contains: "mockup", status: "inbox",
                    project: Some("p-acme"), area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Write a blog post for the Tech Blog Relaunch",
                Expected {
                    title_contains: "blog", status: "inbox",
                    project: Some("p-blog"), area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Check the Open Source CLI Tool issue tracker",
                Expected {
                    title_contains: "CLI", status: "inbox",
                    project: Some("p-cli"), area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            // Partial name — "Japan Trip" should match "Japan Trip 2025"
            // (currently fails with exact matching — tests fuzzy matching improvement)
            (
                "Email James about the Japan Trip",
                Expected {
                    title_contains: "James", status: "inbox",
                    project: Some("p-japan"), area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // AREA MATCHING — explicit area names in input
            // =============================================================

            (
                "Send the January invoice to Acme Corp",
                Expected {
                    title_contains: "invoice", status: "inbox",
                    project: None, area: Some("a-acme"),
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // SCHEDULED DATES — "tomorrow" variations
            // =============================================================

            (
                "Call the dentist tomorrow about that crown",
                Expected {
                    title_contains: "dentist", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-26"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Pick up the dry cleaning tomorrow",
                Expected {
                    title_contains: "dry cleaning", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-26"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Send that email to Sarah tomorrow morning",
                Expected {
                    title_contains: "Sarah", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-26"), due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // SCHEDULED DATES — "this Friday" / "next Monday" / specific days
            // =============================================================

            (
                "Schedule a team meeting for this Friday",
                Expected {
                    title_contains: "meeting", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-27"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Lunch with Tom on Thursday",
                Expected {
                    title_contains: "Tom", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-26"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Schedule the Half Marathon Training run for next Monday",
                Expected {
                    title_contains: "run", status: "inbox",
                    project: Some("p-marathon"), area: None,
                    scheduled: Some("2026-03-30"), due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // SCHEDULED DATES — "today" / "this afternoon"
            // =============================================================

            (
                "Buy milk this afternoon",
                Expected {
                    title_contains: "milk", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-25"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Call the bank today about that charge",
                Expected {
                    title_contains: "bank", status: "inbox",
                    project: None, area: None,
                    scheduled: Some("2026-03-25"), due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // DUE DATES — deadline language
            // =============================================================

            (
                "Submit the Q1 tax return by April 15th",
                Expected {
                    title_contains: "tax", status: "inbox",
                    project: Some("p-tax"), area: None,
                    scheduled: None, due: Some("2026-04-15"), defer: None,
                    body_empty: None,
                },
            ),
            (
                "The report is due by Friday",
                Expected {
                    title_contains: "report", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: Some("2026-03-27"), defer: None,
                    body_empty: None,
                },
            ),
            (
                "Book flights by the end of next week",
                Expected {
                    title_contains: "flight", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: Some("2026-04-03"), defer: None,
                    body_empty: None,
                },
            ),
            (
                "Renew passport, deadline is June 1st",
                Expected {
                    title_contains: "passport", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: Some("2026-06-01"), defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // STATUS — icebox (someday/maybe)
            // =============================================================

            (
                "Maybe one day learn to play guitar",
                Expected {
                    title_contains: "guitar", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "I might eventually look into getting a motorbike licence",
                Expected {
                    title_contains: "motorbike", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // STATUS — blocked
            // =============================================================

            (
                "The API refactor is blocked waiting on the security review",
                Expected {
                    title_contains: "API", status: "blocked",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Can't finish the Garden Renovation until the quote comes back",
                Expected {
                    title_contains: "Garden", status: "inbox",  // no explicit "blocked" keyword
                    project: Some("p-garden"), area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // COMPLEX / DICTATION — multiple fields
            // =============================================================

            (
                "Email James about the Japan Trip, schedule for next Monday",
                Expected {
                    title_contains: "James", status: "inbox",
                    project: Some("p-japan"), area: None,
                    scheduled: Some("2026-03-30"), due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "I need to send that invoice to Acme Corp by the end of the month",
                Expected {
                    title_contains: "invoice", status: "inbox",
                    project: None, area: Some("a-acme"),
                    scheduled: None, due: Some("2026-03-31"), defer: None,
                    body_empty: None,
                },
            ),
            (
                "Review the Newsletter Setup project tomorrow, we need to get it done before April",
                Expected {
                    title_contains: "Newsletter", status: "inbox",
                    project: Some("p-newsletter"), area: None,
                    scheduled: Some("2026-03-26"), due: Some("2026-03-31"), defer: None,
                    body_empty: None,
                },
            ),

            // =============================================================
            // NO HALLUCINATION — words that look like area names but aren't
            // =============================================================

            (
                "Check if my health insurance covers this procedure",
                Expected {
                    title_contains: "insurance", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "Pick up something on the way home",
                Expected {
                    title_contains: "home", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
                },
            ),
            (
                "I'm learning a lot from this course",
                Expected {
                    title_contains: "course", status: "inbox",
                    project: None, area: None,
                    scheduled: None, due: None, defer: None,
                    body_empty: None,
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
                println!(
                    "    Raw: title={:?} status={:?} project={:?} area={:?}",
                    result.title, result.status, result.project_id, result.area_id
                );
                println!(
                    "         due={:?} sched={:?} defer={:?}",
                    result.due, result.scheduled, result.defer_until
                );
                for f in &failures {
                    println!("    FAIL: {f}");
                }
            }
        }

        println!("\n----------------------------------------------------------------------");
        println!(
            "Results: {total_pass} passed, {total_fail} failed out of {} cases",
            cases.len()
        );
        println!("----------------------------------------------------------------------\n");

        // Don't assert — this is an eval tool, not a hard test.
        // Some failures are expected while iterating on prompts.
        if total_fail > 0 {
            println!("NOTE: {total_fail} cases failed. This is expected while iterating.");
            println!("      Review failures above and adjust ai_prompts.rs as needed.");
        }
    }
}
