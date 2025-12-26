/**
 * Field inclusion rules based on S1 spec
 * Determines which fields should be shown for each entity type
 */

import type { Task, Project, Area } from '@bindings';
import type { EntityType } from './field-ordering.ts';

/**
 * Get required fields for an entity type (must always be shown, even if missing)
 * Per tdn-specs/S1-core.md
 */
export function getRequiredFields(entityType: EntityType): string[] {
  switch (entityType) {
    case 'task':
      // S1 spec Section 3.3: title, status, created-at, updated-at are required
      return ['path', 'title', 'status', 'created-at', 'updated-at'];
    case 'project':
      // S1 spec Section 4.3: only title is required
      return ['path', 'title'];
    case 'area':
      // S1 spec Section 5.3: only title is required
      return ['path', 'title'];
  }
}

/**
 * Determine if a field should be shown based on the entity and field value.
 * Required fields are always shown. Optional fields only shown if present.
 */
export function shouldShowField(
  field: string,
  entity: Task | Project | Area,
  entityType: EntityType
): boolean {
  // Required fields always show (even if missing - will show as "(missing)")
  const required = getRequiredFields(entityType);
  if (required.includes(field)) {
    return true;
  }

  // Optional fields only show if they have a value
  const value = getFieldValue(field, entity);
  return value !== undefined && value !== null && value !== '';
}

/**
 * Get the value of a field from an entity
 * Handles both kebab-case and camelCase field names
 */
function getFieldValue(field: string, entity: Task | Project | Area): unknown {
  // Convert kebab-case to camelCase for property access
  const camelField = field.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  // Special cases
  if (field === 'created-at' || field === 'createdAt') {
    return (entity as Task).createdAt;
  }
  if (field === 'updated-at' || field === 'updatedAt') {
    return (entity as Task).updatedAt;
  }
  if (field === 'completed-at' || field === 'completedAt') {
    return (entity as Task).completedAt;
  }
  if (field === 'defer-until' || field === 'deferUntil') {
    return (entity as Task).deferUntil;
  }
  if (field === 'start-date' || field === 'startDate') {
    return (entity as Project).startDate;
  }
  if (field === 'end-date' || field === 'endDate') {
    return (entity as Project).endDate;
  }
  if (field === 'unique-id' || field === 'uniqueId') {
    return (entity as Project).uniqueId;
  }
  if (field === 'blocked-by' || field === 'blockedBy') {
    return (entity as Project).blockedBy;
  }
  if (field === 'type' || field === 'areaType') {
    return (entity as Area).areaType;
  }

  // Generic property access
  return (entity as unknown as Record<string, unknown>)[camelField];
}

/**
 * Get all fields that should be shown for an entity
 */
export function getFieldsToShow(entity: Task | Project | Area, entityType: EntityType): string[] {
  const allFields =
    entityType === 'task'
      ? [
          'path',
          'title',
          'status',
          'created-at',
          'updated-at',
          'completed-at',
          'due',
          'scheduled',
          'defer-until',
          'project',
          'area',
          'body',
        ]
      : entityType === 'project'
        ? [
            'path',
            'title',
            'status',
            'area',
            'description',
            'start-date',
            'end-date',
            'unique-id',
            'blocked-by',
            'body',
          ]
        : ['path', 'title', 'status', 'type', 'description', 'body'];

  return allFields.filter((field) => shouldShowField(field, entity, entityType));
}
