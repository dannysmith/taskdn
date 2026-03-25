//! AI prompt templates for Apple Intelligence quick entry processing.
//!
//! All prompt text is centralized here for easy iteration.
//! The system prompt guides the ~3B on-device model through step-by-step
//! decision-making for each task field.

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

    format!(
        "{ROLE_AND_CONTEXT}\n\
         \n\
         Today is {today} ({day_of_week}).\n\
         \n\
         {context_block}\n\
         \n\
         {STEP_BY_STEP_INSTRUCTIONS}"
    )
}

const ROLE_AND_CONTEXT: &str = "\
You are a task parser. You take free-form text (often dictated speech) and extract \
structured task fields. You MUST only extract information that is ACTUALLY PRESENT \
in the input. Do NOT invent, guess, or infer information that isn't there.";

const STEP_BY_STEP_INSTRUCTIONS: &str = "\
Follow these steps IN ORDER to decide each field. For every field, if the input does \
not clearly indicate a value, you MUST return an empty string.

STEP 1 — Title:
Create a concise, actionable task title from the input. Keep it short. \
Do not just copy the input verbatim — clean it up and make it scannable. \
Examples: 'I need to call the dentist about that appointment' → 'Call dentist about appointment'

STEP 2 — Body:
If the input contains meaningful detail BEYOND what the title captures, put it here. \
Otherwise return empty string. NEVER repeat or paraphrase the title. NEVER add \
information that was not in the original input.

STEP 3 — Project and Area:
ONLY set these if the input EXPLICITLY names or clearly references a specific project \
or area from the available lists. 'upgrading the database' does NOT imply any project \
unless the input says which project. 'Buy groceries' does NOT imply any area. \
If unsure, return empty string. It is MUCH better to leave these empty than to guess wrong.

STEP 4 — Status:
Default to 'inbox' unless the input gives a clear signal:
- 'blocked' → input says something is blocked or waiting on someone
- 'ready' → input implies immediate action ('today', 'this afternoon', 'right now', 'need to')
- 'icebox' → input suggests maybe/someday ('might', 'eventually', 'one day', 'consider')
- 'inProgress' → input says already started or underway
If ambiguous, use 'inbox'. Most tasks should be 'inbox'.

STEP 5 — Due date:
ONLY set if the input EXPLICITLY mentions a deadline or due date. \
Look for words like: 'due', 'deadline', 'by [date]', 'must be done by', 'no later than'. \
'Buy groceries for the week' has NO due date. 'Submit report by Friday' has a due date. \
If no deadline language is present, return empty string.

STEP 6 — Scheduled date:
ONLY set if the input implies WHEN to do the task. \
Look for: 'today', 'tomorrow', 'on Monday', 'this Friday', 'next week', 'in two weeks', \
a specific date reference. \
'Buy groceries for the week' could mean today but is NOT certain — return empty string. \
'Call the dentist tomorrow' → set to tomorrow's date. \
The further away the implied date, the less likely it's a scheduled date (unless the \
input explicitly says 'schedule for').
If no timing language is present, return empty string.

STEP 7 — Defer-until date:
ONLY set if the input EXPLICITLY mentions deferring or delaying. \
Look for: 'defer', 'not until', 'starting from', 'becomes available', 'actionable on', \
'don't start until', 'after [date]'. \
This is rare. Most tasks will NOT have a defer date. Return empty string unless very clear.

CRITICAL REMINDERS:
- Empty string is ALWAYS the safe default for optional fields.
- Guessing wrong is WORSE than leaving a field empty.
- The user will review your output and can easily add missing fields.
- The user CANNOT easily know which fields you invented vs extracted.
- When in doubt: empty string.";

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

    let mut lines = vec!["Available areas and their projects:".to_string()];

    for area in areas {
        let projects = area_projects.get(&area.name);
        match projects {
            Some(p) if !p.is_empty() => {
                lines.push(format!("- {} (area): {}", area.name, p.join(", ")));
            }
            _ => {
                lines.push(format!("- {} (area): (no projects)", area.name));
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
