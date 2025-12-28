import type { Task, Project, Area } from '@bindings';

/**
 * Entity status predicates for context commands.
 *
 * These predicates determine whether entities are "active" or in specific
 * states. Used across context.ts, ai.ts, and vault-overview.ts.
 */

/**
 * Check if a task is in-progress.
 * Handles both 'InProgress' (from Rust enum) and 'in-progress' (kebab-case).
 */
export function isInProgress(task: Task): boolean {
  const status = task.status.toLowerCase();
  return status === 'inprogress' || status === 'in-progress';
}

/**
 * Check if a task is blocked.
 */
export function isBlocked(task: Task): boolean {
  return task.status.toLowerCase() === 'blocked';
}

/**
 * Check if a task is active (not done, dropped, or icebox).
 * Per ai-context.md Section 2.2
 */
export function isActiveTask(task: Task): boolean {
  const status = task.status.toLowerCase();
  return status !== 'done' && status !== 'dropped' && status !== 'icebox';
}

/**
 * Check if a project is active (not done).
 * Per ai-context.md Section 2.2
 */
export function isActiveProject(project: Project): boolean {
  if (!project.status) return true;
  return project.status.toLowerCase() !== 'done';
}

/**
 * Check if an area is active (status is 'Active' or unset).
 * Per ai-context.md Section 2.2 - excludes 'Archived' areas.
 */
export function isActiveArea(area: Area): boolean {
  if (!area.status) return true;
  return area.status.toLowerCase() === 'active';
}
