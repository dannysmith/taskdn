/**
 * String utilities for context commands.
 */

/**
 * Convert PascalCase or camelCase to kebab-case.
 * Also normalizes status strings for consistent comparison.
 *
 * Examples:
 *   "InProgress" -> "in-progress"
 *   "Done" -> "done"
 *   "ready" -> "ready"
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
