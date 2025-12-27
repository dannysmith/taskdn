/**
 * Entity type normalization utilities.
 *
 * Provides utilities for normalizing entity type strings (task/tasks, project/projects, area/areas)
 * to either singular or plural form. Used by commands that accept entity types as arguments.
 *
 * ## Design Decisions
 * - Case-insensitive matching
 * - Accepts both singular and plural forms as input
 * - Returns input unchanged if not recognized (graceful degradation)
 *
 * ## Usage
 * ```typescript
 * import { normalizeEntityType } from '@/lib/entity-type';
 *
 * normalizeEntityType('tasks', 'singular')  // => 'task'
 * normalizeEntityType('Task', 'plural')     // => 'tasks'
 * normalizeEntityType('project', 'plural')  // => 'projects'
 * ```
 */

/**
 * Normalize entity type to either singular or plural form.
 * Accepts both singular and plural forms as input.
 *
 * @param type - The entity type to normalize (case-insensitive)
 * @param form - Whether to return singular or plural form
 * @returns Normalized entity type in the requested form
 */
export function normalizeEntityType(type: string, form: 'singular' | 'plural'): string {
  const normalized = type.toLowerCase();

  if (normalized === 'task' || normalized === 'tasks') {
    return form === 'singular' ? 'task' : 'tasks';
  }
  if (normalized === 'project' || normalized === 'projects') {
    return form === 'singular' ? 'project' : 'projects';
  }
  if (normalized === 'area' || normalized === 'areas') {
    return form === 'singular' ? 'area' : 'areas';
  }

  // Return the input unchanged if it's not recognized
  return type;
}
