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
    let examples_block = build_examples_block();

    format!(
        "{ROLE}\n\
         \n\
         Today is {today} ({day_of_week}).\n\
         \n\
         {context_block}\n\
         \n\
         {FIELD_DEFINITIONS}\n\
         \n\
         {examples_block}"
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt constants
// ─────────────────────────────────────────────────────────────────────────────

const ROLE: &str = "\
Extract structured task fields from free-form text. \
Return empty string for any field where the input provides no clear value. \
Empty string is always the safe choice.";

const FIELD_DEFINITIONS: &str = "\
Fields:

title: A concise, actionable task title. Rewrite the input to be short and scannable.

body: Extra detail from the input beyond the title. Empty string if the input is simple.

project: A project name from the projects list above. \
Set ONLY if the input explicitly names a project. Empty string otherwise.

area: An area name from the areas list above. \
Set ONLY if the input explicitly names an area AND no project was matched. \
When a project is set, leave area as empty string.

scheduledRef: WHEN to do this task. Extract the date reference as stated: \
'today', 'tomorrow', 'this afternoon', 'Monday', 'this Friday', 'next week'. \
Empty string if no timing is mentioned.

dueRef: A DEADLINE. Extract the date reference as stated: \
'by Friday', 'April 15th', 'end of March', 'end of next week'. \
Empty string if no deadline is mentioned.

deferUntilRef: When this task BECOMES AVAILABLE. \
'not until Monday', 'defer until April', 'start after next week'. \
This is rare. Empty string unless explicitly mentioned.";

/// Build few-shot examples. Apple guidance: <5 examples, written directly into the prompt.
/// Field order matches @Generable: title, body, project, area, scheduledRef, dueRef, deferUntilRef
fn build_examples_block() -> String {
    "\
Examples:

Input: \"Buy groceries for the week\"
Output: {\"title\":\"Buy groceries\",\"body\":\"\",\"project\":\"\",\"area\":\"\",\"scheduledRef\":\"\",\"dueRef\":\"\",\"deferUntilRef\":\"\"}

Input: \"Call the dentist tomorrow about that crown\"
Output: {\"title\":\"Call dentist about crown\",\"body\":\"\",\"project\":\"\",\"area\":\"\",\"scheduledRef\":\"tomorrow\",\"dueRef\":\"\",\"deferUntilRef\":\"\"}

Input: \"Review the Garden Renovation plans with the contractor\"
Output: {\"title\":\"Review Garden Renovation plans with contractor\",\"body\":\"\",\"project\":\"Garden Renovation\",\"area\":\"\",\"scheduledRef\":\"\",\"dueRef\":\"\",\"deferUntilRef\":\"\"}

Input: \"Submit the report by next Friday\"
Output: {\"title\":\"Submit report\",\"body\":\"\",\"project\":\"\",\"area\":\"\",\"scheduledRef\":\"\",\"dueRef\":\"next Friday\",\"deferUntilRef\":\"\"}

Input: \"Buy milk this afternoon\"
Output: {\"title\":\"Buy milk\",\"body\":\"\",\"project\":\"\",\"area\":\"\",\"scheduledRef\":\"today\",\"dueRef\":\"\",\"deferUntilRef\":\"\"}"
        .to_string()
}

/// Build the context block with separate area and project lists.
fn build_context_block(
    projects_with_areas: &[ProjectWithArea],
    areas: &[NameIdPair],
) -> String {
    let area_names: Vec<&str> = areas.iter().map(|a| a.name.as_str()).collect();
    let project_names: Vec<&str> = projects_with_areas.iter().map(|p| p.name.as_str()).collect();

    let areas_str = if area_names.is_empty() {
        "(none)".to_string()
    } else {
        area_names.join(", ")
    };

    let projects_str = if project_names.is_empty() {
        "(none)".to_string()
    } else {
        project_names.join(", ")
    };

    format!("Areas: {areas_str}\nProjects: {projects_str}")
}
