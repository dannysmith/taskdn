/**
 * Status emoji maps for AI context output.
 * Per ai-context.md Section 3.1
 */

/**
 * Project status to emoji mapping
 */
export const PROJECT_STATUS_EMOJI: Record<string, string> = {
  'in-progress': '🔵',
  ready: '🟢',
  planning: '🟡',
  blocked: '🚫',
  paused: '⏸️',
  done: '✅',
};

/**
 * Task status to emoji mapping (for count shorthand)
 */
export const TASK_STATUS_EMOJI: Record<string, string> = {
  'in-progress': '▶️',
  ready: '🟢',
  inbox: '📥',
  blocked: '🚫',
};

/**
 * Other indicator emojis
 */
export const AREA_ICON = '📁';
export const DIRECT_TASKS_ICON = '📋';
export const OVERDUE_ICON = '⚠️';
export const DUE_TODAY_ICON = '📅';
export const SCHEDULED_TODAY_ICON = '📆';
export const NEWLY_ACTIONABLE_ICON = '🔓';

/**
 * Get the emoji for a project status
 * Status can be PascalCase or kebab-case
 */
export function getProjectStatusEmoji(status: string | undefined): string {
  if (!status) return '';
  const normalized = normalizeStatus(status);
  return PROJECT_STATUS_EMOJI[normalized] ?? '';
}

/**
 * Get the emoji for a task status
 * Status can be PascalCase or kebab-case
 */
export function getTaskStatusEmoji(status: string | undefined): string {
  if (!status) return '';
  const normalized = normalizeStatus(status);
  return TASK_STATUS_EMOJI[normalized] ?? '';
}

/**
 * Normalize status to kebab-case for emoji lookup
 */
function normalizeStatus(status: string): string {
  // Convert PascalCase to kebab-case
  return status
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
