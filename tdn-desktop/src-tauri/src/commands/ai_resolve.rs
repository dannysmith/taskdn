//! Deterministic resolution of date expressions and fuzzy project/area matching.
//!
//! The LLM extracts raw date references ("tomorrow", "next Monday", "end of March")
//! and project/area name strings. This module resolves them to concrete values:
//! - Date expressions → YYYY-MM-DD strings via the `fuzzydate` crate
//! - Project/area names → matched IDs via case-insensitive substring matching

use chrono::NaiveDate;

use super::ai::{NameIdPair, ProjectContext};

// =============================================================================
// Date Resolution
// =============================================================================

/// Resolve a natural language date expression to a YYYY-MM-DD string.
///
/// Uses `fuzzydate::parse_relative_to` for natural language parsing, with
/// preprocessing to handle patterns fuzzydate doesn't support natively.
/// Returns None if the expression is empty or unparseable.
///
/// Examples:
/// - "tomorrow" → "2026-03-27" (relative to 2026-03-26)
/// - "next Monday" → "2026-03-30"
/// - "April 15th" → "2026-04-15"
/// - "end of March" → "2026-03-31"
/// - "in 3 weeks" → 3 weeks from today
pub fn resolve_date_expression(expr: &str, today: NaiveDate) -> Option<String> {
    let trimmed = expr.trim();
    if trimmed.is_empty() {
        return None;
    }

    // If it's already a YYYY-MM-DD date (LLM might still output these), use it directly
    if NaiveDate::parse_from_str(trimmed, "%Y-%m-%d").is_ok() {
        return Some(trimmed.to_string());
    }

    // Try custom handlers first for patterns fuzzydate doesn't support
    if let Some(date) = resolve_end_of_month(trimmed, today) {
        return Some(date.format("%Y-%m-%d").to_string());
    }
    if let Some(date) = resolve_in_n_weeks(trimmed, today) {
        return Some(date.format("%Y-%m-%d").to_string());
    }

    // Preprocess: strip ordinal suffixes and "on" prefix that fuzzydate doesn't handle
    let cleaned = preprocess_date_expr(trimmed);

    // Use fuzzydate to parse the expression relative to today
    let reference = today.and_hms_opt(12, 0, 0)?; // noon to avoid edge cases
    match fuzzydate::parse_relative_to(&cleaned, reference) {
        Ok(parsed) => Some(parsed.date().format("%Y-%m-%d").to_string()),
        Err(_) => {
            log::debug!("Could not parse date expression: {trimmed:?}");
            None
        }
    }
}

/// Preprocess a date expression to handle patterns fuzzydate doesn't support:
/// - Strip ordinal suffixes: "15th" → "15", "1st" → "1", "2nd" → "2", "3rd" → "3"
/// - Strip leading "on": "on Thursday" → "Thursday"
/// - Strip leading "by": "by Friday" → "Friday"
fn preprocess_date_expr(expr: &str) -> String {
    let mut s = expr.to_string();

    // Strip leading "on " or "by "
    for prefix in &["on ", "by "] {
        if let Some(rest) = s.to_lowercase().strip_prefix(prefix) {
            s = expr[prefix.len()..].to_string();
            let _ = rest; // suppress unused warning
        }
    }

    // Strip ordinal suffixes from numbers: "15th" → "15"
    let ordinal_re = regex::Regex::new(r"(\d+)(st|nd|rd|th)\b").unwrap();
    s = ordinal_re.replace_all(&s, "$1").to_string();

    s
}

/// Handle "end of [month]" / "end of the month" expressions.
fn resolve_end_of_month(expr: &str, today: NaiveDate) -> Option<NaiveDate> {
    let lower = expr.to_lowercase();

    if lower == "end of the month" || lower == "end of month" {
        // Last day of the current month
        return last_day_of_month(today.year(), today.month());
    }

    // "end of March", "end of April", etc.
    let months = [
        ("january", 1), ("february", 2), ("march", 3), ("april", 4),
        ("may", 5), ("june", 6), ("july", 7), ("august", 8),
        ("september", 9), ("october", 10), ("november", 11), ("december", 12),
    ];

    if let Some(rest) = lower.strip_prefix("end of ") {
        let rest = rest.trim();
        for (name, num) in &months {
            if rest == *name {
                let year = if *num < today.month() {
                    today.year() + 1 // month already passed → next year
                } else {
                    today.year()
                };
                return last_day_of_month(year, *num);
            }
        }
    }

    None
}

/// Handle "in N weeks" / "in N days" expressions.
fn resolve_in_n_weeks(expr: &str, today: NaiveDate) -> Option<NaiveDate> {
    let lower = expr.to_lowercase();

    // Word-to-number mapping for common cases
    let word_to_num = |w: &str| -> Option<i64> {
        match w {
            "one" | "a" => Some(1),
            "two" => Some(2),
            "three" => Some(3),
            "four" => Some(4),
            "five" => Some(5),
            "six" => Some(6),
            "seven" => Some(7),
            "eight" => Some(8),
            _ => w.parse().ok(),
        }
    };

    // "in N weeks" / "in N week"
    if let Some(rest) = lower.strip_prefix("in ") {
        let parts: Vec<&str> = rest.trim().split_whitespace().collect();
        if parts.len() == 2 {
            if let Some(n) = word_to_num(parts[0]) {
                if parts[1].starts_with("week") {
                    return Some(today + chrono::Duration::weeks(n));
                }
                if parts[1].starts_with("day") {
                    return Some(today + chrono::Duration::days(n));
                }
                if parts[1].starts_with("month") {
                    // Approximate: 30 days per month
                    return Some(today + chrono::Duration::days(n * 30));
                }
            }
        }
    }

    None
}

/// Get the last day of a given month.
fn last_day_of_month(year: i32, month: u32) -> Option<NaiveDate> {
    if month == 12 {
        NaiveDate::from_ymd_opt(year + 1, 1, 1)
            .and_then(|d| d.pred_opt())
    } else {
        NaiveDate::from_ymd_opt(year, month + 1, 1)
            .and_then(|d| d.pred_opt())
    }
}

use chrono::Datelike;

// =============================================================================
// Fuzzy Project/Area Matching
// =============================================================================

/// Match a project name from AI output against the available projects.
/// Uses case-insensitive substring matching with a minimum length guard.
/// Returns the project ID if matched, None otherwise.
pub fn match_project_fuzzy(name: &str, projects: &[ProjectContext]) -> Option<String> {
    let query = name.trim();
    if query.is_empty() {
        return None;
    }

    // Try exact match first (case-insensitive)
    if let Some(p) = projects.iter().find(|p| p.name.eq_ignore_ascii_case(query)) {
        return Some(p.id.clone());
    }

    // Substring match: query is a substring of a project name, or vice versa
    // Minimum 3 characters to prevent spurious short matches
    if query.len() >= 3 {
        let lower_query = query.to_lowercase();
        // Check if query is contained in any project name
        if let Some(p) = projects
            .iter()
            .find(|p| p.name.to_lowercase().contains(&lower_query))
        {
            return Some(p.id.clone());
        }
        // Check if any project name is contained in the query
        if let Some(p) = projects
            .iter()
            .find(|p| lower_query.contains(&p.name.to_lowercase()))
        {
            return Some(p.id.clone());
        }
    }

    None
}

/// Match an area name from AI output against the available areas.
/// Uses case-insensitive substring matching with a minimum length guard.
/// Returns the area ID if matched, None otherwise.
pub fn match_area_fuzzy(name: &str, areas: &[NameIdPair]) -> Option<String> {
    let query = name.trim();
    if query.is_empty() {
        return None;
    }

    // Try exact match first (case-insensitive)
    if let Some(a) = areas.iter().find(|a| a.name.eq_ignore_ascii_case(query)) {
        return Some(a.id.clone());
    }

    // Substring match with minimum length guard
    if query.len() >= 3 {
        let lower_query = query.to_lowercase();
        if let Some(a) = areas
            .iter()
            .find(|a| a.name.to_lowercase().contains(&lower_query))
        {
            return Some(a.id.clone());
        }
        if let Some(a) = areas
            .iter()
            .find(|a| lower_query.contains(&a.name.to_lowercase()))
        {
            return Some(a.id.clone());
        }
    }

    None
}

// =============================================================================
// Tests
// =============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn test_date() -> NaiveDate {
        // Wednesday, 2026-03-25 (matches eval harness)
        NaiveDate::from_ymd_opt(2026, 3, 25).unwrap()
    }

    // ── Date resolution tests ────────────────────────────────────────────

    #[test]
    fn date_empty_returns_none() {
        assert_eq!(resolve_date_expression("", test_date()), None);
        assert_eq!(resolve_date_expression("  ", test_date()), None);
    }

    #[test]
    fn date_today() {
        assert_eq!(
            resolve_date_expression("today", test_date()),
            Some("2026-03-25".into())
        );
    }

    #[test]
    fn date_tomorrow() {
        assert_eq!(
            resolve_date_expression("tomorrow", test_date()),
            Some("2026-03-26".into())
        );
    }

    #[test]
    fn date_this_friday() {
        // Wednesday March 25 → this Friday = March 27
        assert_eq!(
            resolve_date_expression("this Friday", test_date()),
            Some("2026-03-27".into())
        );
    }

    #[test]
    fn date_next_monday() {
        // Wednesday March 25 → next Monday = March 30
        assert_eq!(
            resolve_date_expression("next Monday", test_date()),
            Some("2026-03-30".into())
        );
    }

    #[test]
    fn date_specific_month_day() {
        assert_eq!(
            resolve_date_expression("April 15th", test_date()),
            Some("2026-04-15".into())
        );
    }

    #[test]
    fn date_end_of_march() {
        assert_eq!(
            resolve_date_expression("end of March", test_date()),
            Some("2026-03-31".into())
        );
    }

    #[test]
    fn date_passthrough_iso() {
        // Already YYYY-MM-DD → pass through
        assert_eq!(
            resolve_date_expression("2026-06-01", test_date()),
            Some("2026-06-01".into())
        );
    }

    #[test]
    fn date_nonsense_returns_none() {
        assert_eq!(resolve_date_expression("banana", test_date()), None);
    }

    #[test]
    #[ignore]
    fn date_explore_fuzzydate() {
        let today = test_date();
        let cases = vec![
            "April 15", "April 15th", "15 April", "15th April",
            "March 31", "March 31st", "end of March", "end of the month",
            "Friday", "this Friday", "next Friday",
            "in 3 weeks", "in two weeks", "in 2 weeks",
            "Thursday", "on Thursday",
        ];
        for c in cases {
            let result = resolve_date_expression(c, today);
            println!("  {:30} → {:?}", c, result);
        }
    }

    // ── Project fuzzy matching tests ─────────────────────────────────────

    fn test_projects() -> Vec<ProjectContext> {
        vec![
            ProjectContext {
                id: "p-japan".into(),
                name: "Japan Trip 2025".into(),
                area_name: Some("Travel".into()),
            },
            ProjectContext {
                id: "p-cli".into(),
                name: "Open Source CLI Tool".into(),
                area_name: Some("Coding".into()),
            },
            ProjectContext {
                id: "p-blog".into(),
                name: "Tech Blog Relaunch".into(),
                area_name: Some("Writing".into()),
            },
        ]
    }

    #[test]
    fn project_exact_match() {
        let projects = test_projects();
        assert_eq!(
            match_project_fuzzy("Japan Trip 2025", &projects),
            Some("p-japan".into())
        );
    }

    #[test]
    fn project_exact_case_insensitive() {
        let projects = test_projects();
        assert_eq!(
            match_project_fuzzy("japan trip 2025", &projects),
            Some("p-japan".into())
        );
    }

    #[test]
    fn project_substring_partial_name() {
        let projects = test_projects();
        // "Japan Trip" is a substring of "Japan Trip 2025"
        assert_eq!(
            match_project_fuzzy("Japan Trip", &projects),
            Some("p-japan".into())
        );
    }

    #[test]
    fn project_substring_middle() {
        let projects = test_projects();
        assert_eq!(
            match_project_fuzzy("CLI Tool", &projects),
            Some("p-cli".into())
        );
    }

    #[test]
    fn project_empty_returns_none() {
        let projects = test_projects();
        assert_eq!(match_project_fuzzy("", &projects), None);
    }

    #[test]
    fn project_no_match() {
        let projects = test_projects();
        assert_eq!(match_project_fuzzy("Nonexistent Project", &projects), None);
    }

    #[test]
    fn project_too_short_no_match() {
        let projects = test_projects();
        // "Ja" is only 2 chars — below minimum, should not match
        assert_eq!(match_project_fuzzy("Ja", &projects), None);
    }

    // ── Area fuzzy matching tests ────────────────────────────────────────

    fn test_areas() -> Vec<NameIdPair> {
        vec![
            NameIdPair { id: "a-acme".into(), name: "Acme Corp".into() },
            NameIdPair { id: "a-finance".into(), name: "Finance".into() },
            NameIdPair { id: "a-home".into(), name: "Home".into() },
        ]
    }

    #[test]
    fn area_exact_match() {
        let areas = test_areas();
        assert_eq!(
            match_area_fuzzy("Acme Corp", &areas),
            Some("a-acme".into())
        );
    }

    #[test]
    fn area_substring_match() {
        let areas = test_areas();
        assert_eq!(
            match_area_fuzzy("Acme", &areas),
            Some("a-acme".into())
        );
    }

    #[test]
    fn area_no_match() {
        let areas = test_areas();
        assert_eq!(match_area_fuzzy("Marketing", &areas), None);
    }
}
