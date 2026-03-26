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

project: Set only if the input explicitly names a project from the list above. \
Empty string if no project is mentioned by name.

area: Set only if the input explicitly names an area from the list above. \
Empty string if no area is mentioned by name.

dueRef: If the input contains deadline language ('due by', 'deadline', 'must be done by', \
'no later than', 'by [date]'), extract the date reference exactly as stated. \
Examples: 'Friday', 'April 15th', 'end of March', 'end of next week'. \
Empty string if no deadline is mentioned.

scheduledRef: If the input says when to do the task, extract the date reference exactly \
as stated. Examples: 'today', 'tomorrow', 'Monday', 'this Friday', 'next week'. \
Empty string if no timing is mentioned. Vague references ('for the week', 'soon') \
are NOT scheduled dates — use empty string.

deferUntilRef: If the input explicitly mentions deferring, extract the date reference. \
Examples: 'after Monday', 'not until April'. This is rare. Empty string otherwise.";

/// Build few-shot examples. These are the highest-impact technique for small models.
/// Examples use raw date expressions (not YYYY-MM-DD) — Rust resolves them later.
fn build_examples_block(_today: &str) -> String {
    "\
Examples:

Input: \"Buy groceries for the week\"
Output: {\"title\":\"Buy groceries\",\"body\":\"\",\"dueRef\":\"\",\"scheduledRef\":\"\",\"deferUntilRef\":\"\",\"project\":\"\",\"area\":\"\"}

Input: \"Call the dentist tomorrow about that crown\"
Output: {\"title\":\"Call dentist about crown\",\"body\":\"\",\"dueRef\":\"\",\"scheduledRef\":\"tomorrow\",\"deferUntilRef\":\"\",\"project\":\"\",\"area\":\"\"}

Input: \"Finish the Newsletter Setup landing page by end of March\"
Output: {\"title\":\"Finish Newsletter Setup landing page\",\"body\":\"\",\"dueRef\":\"end of March\",\"scheduledRef\":\"\",\"deferUntilRef\":\"\",\"project\":\"Newsletter Setup\",\"area\":\"\"}"
        .to_string()
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
