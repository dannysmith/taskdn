/**
 * Canonical field ordering for entity output
 * Per task-1-standardise-cli-output.md specification
 */

export type EntityType = 'task' | 'project' | 'area';

/**
 * Returns the canonical field order for an entity type.
 * Fields are returned in the order they should appear in output.
 *
 * Note: This is the logical order. Some fields may not be present for all entities.
 */
export function getCanonicalFieldOrder(entityType: EntityType): string[] {
  switch (entityType) {
    case 'task':
      return [
        'path',
        'title',
        'status',
        'created-at', // Required per S1 spec Section 3.3
        'updated-at', // Required per S1 spec Section 3.3
        'completed-at', // Optional
        'due', // Optional
        'scheduled', // Optional
        'defer-until', // Optional
        'project', // Optional (singular, from projects array)
        'area', // Optional
        'body', // Optional
      ];

    case 'project':
      return [
        'path',
        'title',
        'status', // Optional per S1 spec Section 4.4
        'area', // Optional
        'description', // Optional
        'start-date', // Optional
        'end-date', // Optional
        'unique-id', // Optional
        'blocked-by', // Optional
        'body', // Optional
      ];

    case 'area':
      return [
        'path',
        'title',
        'status', // Optional per S1 spec Section 5.4
        'type', // Optional
        'description', // Optional
        'body', // Optional
      ];
  }
}

/**
 * Get fields in camelCase for JSON output
 */
export function getCamelCaseFieldOrder(entityType: EntityType): string[] {
  return getCanonicalFieldOrder(entityType).map(toCamelCase);
}

function toCamelCase(kebabCase: string): string {
  return kebabCase.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}
