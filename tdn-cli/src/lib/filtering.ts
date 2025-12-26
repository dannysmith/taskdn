/**
 * Generic filtering and sorting utilities for list command
 *
 * These utilities eliminate duplication across task, project, and area listing.
 */

/**
 * Filter entities by status field.
 *
 * Handles comma-separated status values and normalizes both kebab-case and PascalCase.
 *
 * @example
 * filterByStatus(tasks, "done,in-progress")
 * filterByStatus(projects, "active")
 */
export function filterByStatus<T extends { status?: string }>(
  entities: T[],
  statusFilter: string
): T[] {
  const statuses = statusFilter.split(',').map((s) => s.trim().toLowerCase());

  return entities.filter((entity) => {
    if (!entity.status) return false;

    const entityStatus = entity.status.toLowerCase().replaceAll('-', '');

    return statuses.some((s) => {
      // Handle kebab-case and pascal-case matching
      const normalized = s.replaceAll('-', '');
      return entityStatus === normalized || entity.status!.toLowerCase() === s;
    });
  });
}

/**
 * Sort entities by a given field.
 *
 * - Undefined values are placed last regardless of sort direction
 * - String comparisons are case-insensitive
 *
 * @example
 * sortEntities(tasks, "due", false)  // ascending
 * sortEntities(tasks, "title", true) // descending
 */
export function sortEntities<T>(entities: T[], field: keyof T, descending: boolean = false): T[] {
  return entities.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    // Items without the sort field go last, regardless of direction
    if (aVal === undefined && bVal === undefined) return 0;
    if (aVal === undefined) return 1;
    if (bVal === undefined) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      // Case-insensitive comparison for strings
      comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
    } else if (aVal !== null && bVal !== null) {
      comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    }

    return descending ? -comparison : comparison;
  });
}

/**
 * Filter entities by query string across specified fields.
 *
 * Performs case-insensitive substring match.
 *
 * @example
 * filterByQuery(tasks, "urgent", ["title", "body"])
 * filterByQuery(projects, "Q1", ["title", "description"])
 */
export function filterByQuery<T>(entities: T[], query: string, fields: (keyof T)[]): T[] {
  const queryLower = query.toLowerCase();

  return entities.filter((entity) => {
    return fields.some((field) => {
      const value = entity[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(queryLower);
      }
      return false;
    });
  });
}

/**
 * Limit the number of results.
 *
 * Parses limit string, validates it, and slices the array.
 *
 * @example
 * limitResults(tasks, "10")
 * limitResults(projects, "5")
 */
export function limitResults<T>(entities: T[], limitStr: string): T[] {
  const limit = Number.parseInt(limitStr, 10);
  if (!Number.isNaN(limit) && limit > 0) {
    return entities.slice(0, limit);
  }
  return entities;
}
