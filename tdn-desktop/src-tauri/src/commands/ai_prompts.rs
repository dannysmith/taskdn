//! AI prompt templates for Apple Intelligence quick entry processing.
//!
//! All prompt text is centralized here for easy iteration.
//! Edit this file to refine how the on-device model parses task input.

use super::ai::NameIdPair;

/// A project with its area relationship, for richer context in the prompt.
pub struct ProjectWithArea {
    pub name: String,
    pub area_name: Option<String>,
}

/// Build the complete system prompt for quick entry processing.
pub fn build_system_prompt(
    projects_with_areas: &[ProjectWithArea],
    areas: &[NameIdPair],
    today: &str,
    day_of_week: &str,
) -> String {
    let context_block = build_context_block(projects_with_areas, areas);
    let examples_block = build_examples_block(today);

    format!(
        "{ROLE}\n\
         \n\
         Today is {today} ({day_of_week}).\n\
         \n\
         {context_block}\n\
         \n\
         {FIELD_INSTRUCTIONS}\n\
         \n\
         {examples_block}"
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt constants
// ─────────────────────────────────────────────────────────────────────────────

const ROLE: &str = "\
You are a task field extractor. Given free-form text, populate structured task fields. \
Return empty string for any field where the input provides no clear value. \
Empty string is always the safe choice.";

const FIELD_INSTRUCTIONS: &str = "\
Field instructions:

title: Rewrite the input as a concise, actionable task title.

body: Include only if the input has meaningful detail beyond what the title captures. \
Otherwise empty string.

status: Use 'inbox' unless the input clearly indicates otherwise. \
Use 'ready' only for explicit immediacy ('today', 'this afternoon', 'right now'). \
Use 'blocked' only if the input says something is blocked or waiting. \
Use 'icebox' only for explicit maybe/someday language. \
Use 'inProgress' only if the input says work has already started.

project: Set only if the input explicitly names a project from the list above. \
Empty string if no project is mentioned by name.

area: Set only if the input explicitly names an area from the list above. \
Empty string if no area is mentioned by name.

due: Set only if the input contains deadline language ('due by', 'deadline', \
'must be done by', 'no later than'). YYYY-MM-DD format. Empty string otherwise.

scheduled: Set only if the input specifies when to do the task ('tomorrow', \
'on Monday', 'this Friday', 'schedule for next week'). YYYY-MM-DD format. \
Empty string otherwise. Vague time references ('for the week', 'soon') are \
NOT scheduled dates — use empty string.

deferUntil: Set only if the input explicitly mentions deferring ('not until', \
'defer until', 'start after'). This is rare. YYYY-MM-DD format. \
Empty string otherwise.";

/// Build few-shot examples. These are the highest-impact technique for small models.
fn build_examples_block(today: &str) -> String {
    // Compute tomorrow for the example
    let tomorrow = chrono::NaiveDate::parse_from_str(today, "%Y-%m-%d")
        .ok()
        .and_then(|d| d.succ_opt())
        .map(|d| d.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| "tomorrow".to_string());

    format!(
        "Examples:\n\
         \n\
         Input: \"Buy groceries for the week\"\n\
         Output: {{\"title\":\"Buy groceries\",\"body\":\"\",\"status\":\"inbox\",\
         \"due\":\"\",\"scheduled\":\"\",\"deferUntil\":\"\",\"project\":\"\",\"area\":\"\"}}\n\
         \n\
         Input: \"Call the dentist tomorrow about that crown\"\n\
         Output: {{\"title\":\"Call dentist about crown\",\"body\":\"\",\"status\":\"ready\",\
         \"due\":\"\",\"scheduled\":\"{tomorrow}\",\"deferUntil\":\"\",\"project\":\"\",\"area\":\"\"}}\n\
         \n\
         Input: \"I need to submit the Q1 tax return by April 15th, gather all the receipts first\"\n\
         Output: {{\"title\":\"Submit Q1 tax return\",\"body\":\"Gather all receipts first.\",\
         \"status\":\"inbox\",\"due\":\"2026-04-15\",\"scheduled\":\"\",\"deferUntil\":\"\",\
         \"project\":\"Q1 Tax Preparation\",\"area\":\"\"}}"
    )
}

/// Build the structured context block showing areas and their projects.
fn build_context_block(
    projects_with_areas: &[ProjectWithArea],
    areas: &[NameIdPair],
) -> String {
    // Group projects by area
    let mut area_projects: std::collections::HashMap<String, Vec<String>> =
        std::collections::HashMap::new();
    let mut unassigned_projects: Vec<String> = Vec::new();

    for project in projects_with_areas {
        if let Some(area_name) = &project.area_name {
            area_projects
                .entry(area_name.clone())
                .or_default()
                .push(project.name.clone());
        } else {
            unassigned_projects.push(project.name.clone());
        }
    }

    let mut lines = vec!["Areas and projects:".to_string()];

    for area in areas {
        let projects = area_projects.get(&area.name);
        match projects {
            Some(p) if !p.is_empty() => {
                lines.push(format!("- {}: {}", area.name, p.join(", ")));
            }
            _ => {
                lines.push(format!("- {}", area.name));
            }
        }
    }

    if !unassigned_projects.is_empty() {
        lines.push(format!(
            "- (no area): {}",
            unassigned_projects.join(", ")
        ));
    }

    lines.join("\n")
}
