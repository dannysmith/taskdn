import { Command } from '@commander-js/extra-typings';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskUpdatedResult,
  ProjectUpdatedResult,
  AreaUpdatedResult,
  FieldChange,
} from '@/output/types.ts';
import {
  updateFileFields,
  parseTaskFile,
  parseProjectFile,
  parseAreaFile,
  type FieldUpdate,
  type Task,
  type Project,
  type Area,
} from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { toKebabCase } from '@/output/helpers/index.ts';
import {
  detectEntityType,
  lookupTask,
  lookupProject,
  lookupArea,
  type EntityType,
} from '@/lib/entity-lookup.ts';

/**
 * Update command - programmatic field updates
 *
 * Supports both path-based and fuzzy title-based lookup.
 *
 * Usage:
 *   taskdn update ~/tasks/foo.md --set status=ready
 *   taskdn update "my task" --set status=ready
 *   taskdn update ~/tasks/foo.md --set "title=New Title" --set due=2025-12-20
 *   taskdn update ~/tasks/foo.md --unset project
 *   taskdn update ~/tasks/foo.md --set project="[[Q1 Planning]]"
 */

/**
 * Resolve an entity query to a path and entity type.
 * Tries fuzzy matching across all entity types if not a path.
 */
function resolveEntityQuery(
  query: string
): { path: string; entityType: EntityType } | { error: string; matches?: string[] } {
  // Check if query looks like a path - if so, use traditional path-based lookup
  const looksLikePath =
    query.startsWith('/') ||
    query.startsWith('./') ||
    query.startsWith('../') ||
    query.startsWith('~') ||
    query.includes('/') ||
    query.endsWith('.md');

  if (looksLikePath) {
    const fullPath = resolve(query);
    const entityType = detectEntityType(fullPath);
    return { path: fullPath, entityType };
  }

  // Fuzzy lookup - try each entity type in order of likelihood
  const taskResult = lookupTask(query);
  if (taskResult.type === 'exact' || taskResult.type === 'single') {
    return { path: taskResult.matches[0]!.path, entityType: 'task' };
  }
  if (taskResult.type === 'multiple') {
    const matchTitles = taskResult.matches.map((t) => t.title);
    return { error: `Multiple tasks match "${query}"`, matches: matchTitles };
  }

  const projectResult = lookupProject(query);
  if (projectResult.type === 'exact' || projectResult.type === 'single') {
    return { path: projectResult.matches[0]!.path, entityType: 'project' };
  }
  if (projectResult.type === 'multiple') {
    const matchTitles = projectResult.matches.map((p) => p.title);
    return { error: `Multiple projects match "${query}"`, matches: matchTitles };
  }

  const areaResult = lookupArea(query);
  if (areaResult.type === 'exact' || areaResult.type === 'single') {
    return { path: areaResult.matches[0]!.path, entityType: 'area' };
  }
  if (areaResult.type === 'multiple') {
    const matchTitles = areaResult.matches.map((a) => a.title);
    return { error: `Multiple areas match "${query}"`, matches: matchTitles };
  }

  // No matches in any entity type
  return { error: `No entity found matching "${query}"` };
}

/**
 * Valid task statuses (kebab-case)
 */
const VALID_TASK_STATUSES = [
  'inbox',
  'icebox',
  'ready',
  'in-progress',
  'blocked',
  'done',
  'dropped',
];

/**
 * Valid project statuses (kebab-case)
 */
const VALID_PROJECT_STATUSES = ['planning', 'ready', 'in-progress', 'blocked', 'paused', 'done'];

/**
 * Valid area statuses (kebab-case)
 */
const VALID_AREA_STATUSES = ['active', 'archived'];

/**
 * Date fields that need validation (for tasks)
 */
const TASK_DATE_FIELDS = [
  'due',
  'scheduled',
  'defer-until',
  'created-at',
  'updated-at',
  'completed-at',
];

/**
 * Date fields that need validation (for projects)
 */
const PROJECT_DATE_FIELDS = ['start-date', 'end-date'];

/**
 * Get valid statuses for an entity type
 */
function getValidStatuses(entityType: EntityType): string[] {
  switch (entityType) {
    case 'task':
      return VALID_TASK_STATUSES;
    case 'project':
      return VALID_PROJECT_STATUSES;
    case 'area':
      return VALID_AREA_STATUSES;
  }
}

/**
 * Get date fields for an entity type
 */
function getDateFields(entityType: EntityType): string[] {
  switch (entityType) {
    case 'task':
      return TASK_DATE_FIELDS;
    case 'project':
      return PROJECT_DATE_FIELDS;
    case 'area':
      return []; // Areas don't have date fields
  }
}

/**
 * Parse a --set argument into field and value.
 * Format: field=value
 */
function parseSetArg(arg: string): { field: string; value: string } {
  const eqIndex = arg.indexOf('=');
  if (eqIndex === -1) {
    throw new Error(`Invalid --set format: "${arg}". Expected field=value`);
  }

  const field = arg.slice(0, eqIndex).trim();
  const value = arg.slice(eqIndex + 1).trim();

  if (!field) {
    throw new Error(`Invalid --set format: "${arg}". Field name is empty`);
  }

  return { field, value };
}

/**
 * Validate a date string (basic ISO 8601 check).
 */
function isValidDate(value: string): boolean {
  // Allow ISO 8601 dates: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
  const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2})?$/;
  if (!dateRegex.test(value)) {
    return false;
  }
  // Also check if it parses to a valid date
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Validate field updates for a given entity type.
 */
function validateUpdates(updates: FieldUpdate[], entityType: EntityType): void {
  const validStatuses = getValidStatuses(entityType);
  const dateFields = getDateFields(entityType);

  for (const update of updates) {
    // Validate status
    if (update.field === 'status' && update.value) {
      const normalized = update.value.toLowerCase();
      if (!validStatuses.includes(normalized)) {
        throw createError.invalidStatus(update.value, validStatuses);
      }
    }

    // Validate date fields
    if (dateFields.includes(update.field) && update.value) {
      if (!isValidDate(update.value)) {
        throw createError.invalidDate(update.field, update.value, [
          'YYYY-MM-DD',
          'YYYY-MM-DDTHH:MM:SS',
        ]);
      }
    }
  }
}

/**
 * Get old values for task fields being updated.
 */
function getOldValuesForTask(task: Task, updates: FieldUpdate[]): Map<string, string | undefined> {
  const oldValues = new Map<string, string | undefined>();

  for (const update of updates) {
    const field = update.field;
    // Map field names to task properties
    switch (field) {
      case 'status':
        oldValues.set(field, toKebabCase(task.status));
        break;
      case 'title':
        oldValues.set(field, task.title);
        break;
      case 'due':
        oldValues.set(field, task.due);
        break;
      case 'scheduled':
        oldValues.set(field, task.scheduled);
        break;
      case 'defer-until':
        oldValues.set(field, task.deferUntil);
        break;
      case 'project':
        oldValues.set(field, task.project);
        break;
      case 'area':
        oldValues.set(field, task.area);
        break;
      case 'created-at':
        oldValues.set(field, task.createdAt);
        break;
      case 'updated-at':
        oldValues.set(field, task.updatedAt);
        break;
      case 'completed-at':
        oldValues.set(field, task.completedAt);
        break;
      default:
        // Unknown field - we don't have the old value
        oldValues.set(field, undefined);
    }
  }

  return oldValues;
}

/**
 * Get old values for project fields being updated.
 */
function getOldValuesForProject(
  project: Project,
  updates: FieldUpdate[]
): Map<string, string | undefined> {
  const oldValues = new Map<string, string | undefined>();

  for (const update of updates) {
    const field = update.field;
    switch (field) {
      case 'status':
        oldValues.set(field, project.status ? toKebabCase(project.status) : undefined);
        break;
      case 'title':
        oldValues.set(field, project.title);
        break;
      case 'area':
        oldValues.set(field, project.area);
        break;
      case 'start-date':
        oldValues.set(field, project.startDate);
        break;
      case 'end-date':
        oldValues.set(field, project.endDate);
        break;
      case 'description':
        oldValues.set(field, project.description);
        break;
      case 'unique-id':
        oldValues.set(field, project.uniqueId);
        break;
      default:
        oldValues.set(field, undefined);
    }
  }

  return oldValues;
}

/**
 * Get old values for area fields being updated.
 */
function getOldValuesForArea(area: Area, updates: FieldUpdate[]): Map<string, string | undefined> {
  const oldValues = new Map<string, string | undefined>();

  for (const update of updates) {
    const field = update.field;
    switch (field) {
      case 'status':
        oldValues.set(field, area.status ? toKebabCase(area.status) : undefined);
        break;
      case 'title':
        oldValues.set(field, area.title);
        break;
      case 'type':
        oldValues.set(field, area.areaType);
        break;
      case 'description':
        oldValues.set(field, area.description);
        break;
      default:
        oldValues.set(field, undefined);
    }
  }

  return oldValues;
}

/**
 * Parse update arguments into FieldUpdate array.
 */
function parseUpdateArgs(setArgs: string[], unsetArgs: string[]): FieldUpdate[] {
  const updates: FieldUpdate[] = [];

  for (const arg of setArgs) {
    const { field, value } = parseSetArg(arg);
    updates.push({ field, value });
  }

  for (const field of unsetArgs) {
    updates.push({ field, value: undefined });
  }

  if (updates.length === 0) {
    throw new Error('No changes specified. Use --set or --unset.');
  }

  return updates;
}

/**
 * Normalize status values to lowercase.
 */
function normalizeStatusValues(updates: FieldUpdate[]): void {
  for (const update of updates) {
    if (update.field === 'status' && update.value) {
      update.value = update.value.toLowerCase();
    }
  }
}

/**
 * Build the changes list from updates and old values.
 */
function buildChanges(
  updates: FieldUpdate[],
  oldValues: Map<string, string | undefined>,
  entityType: EntityType,
  updatedStatus?: string
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const update of updates) {
    const oldValue = oldValues.get(update.field);
    let actualNewValue = update.value;

    // Get the new value from the updated entity for status field
    if (update.field === 'status' && updatedStatus) {
      actualNewValue = toKebabCase(updatedStatus);
    }

    changes.push({
      field: update.field,
      oldValue,
      newValue: actualNewValue,
    });
  }
  return changes;
}

/**
 * Update a task's fields.
 */
function updateTask(
  taskPath: string,
  setArgs: string[],
  unsetArgs: string[]
): { task: Task; changes: FieldChange[] } {
  const fullPath = resolve(taskPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'task');
  normalizeStatusValues(updates);

  const currentTask = parseTaskFile(fullPath);
  const oldValues = getOldValuesForTask(currentTask, updates);

  updateFileFields(fullPath, updates);

  const updatedTask = parseTaskFile(fullPath);
  const changes = buildChanges(updates, oldValues, 'task', updatedTask.status);

  return { task: updatedTask, changes };
}

/**
 * Update a project's fields.
 */
function updateProject(
  projectPath: string,
  setArgs: string[],
  unsetArgs: string[]
): { project: Project; changes: FieldChange[] } {
  const fullPath = resolve(projectPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('project', projectPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'project');
  normalizeStatusValues(updates);

  const currentProject = parseProjectFile(fullPath);
  const oldValues = getOldValuesForProject(currentProject, updates);

  updateFileFields(fullPath, updates);

  const updatedProject = parseProjectFile(fullPath);
  const changes = buildChanges(updates, oldValues, 'project', updatedProject.status);

  return { project: updatedProject, changes };
}

/**
 * Update an area's fields.
 */
function updateArea(
  areaPath: string,
  setArgs: string[],
  unsetArgs: string[]
): { area: Area; changes: FieldChange[] } {
  const fullPath = resolve(areaPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('area', areaPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'area');
  normalizeStatusValues(updates);

  const currentArea = parseAreaFile(fullPath);
  const oldValues = getOldValuesForArea(currentArea, updates);

  updateFileFields(fullPath, updates);

  const updatedArea = parseAreaFile(fullPath);
  const changes = buildChanges(updates, oldValues, 'area', updatedArea.status);

  return { area: updatedArea, changes };
}

/**
 * Preview task update changes (for dry-run mode).
 */
function previewUpdateTask(
  taskPath: string,
  setArgs: string[],
  unsetArgs: string[]
): TaskUpdatedResult {
  const fullPath = resolve(taskPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'task');
  normalizeStatusValues(updates);

  const task = parseTaskFile(fullPath);
  const oldValues = getOldValuesForTask(task, updates);
  const changes = buildChanges(updates, oldValues, 'task');

  // For dry-run, return the current (unchanged) task with the changes that would be made
  return {
    type: 'task-updated',
    task,
    changes,
    dryRun: true,
  };
}

/**
 * Preview project update changes (for dry-run mode).
 */
function previewUpdateProject(
  projectPath: string,
  setArgs: string[],
  unsetArgs: string[]
): ProjectUpdatedResult {
  const fullPath = resolve(projectPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('project', projectPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'project');
  normalizeStatusValues(updates);

  const project = parseProjectFile(fullPath);
  const oldValues = getOldValuesForProject(project, updates);
  const changes = buildChanges(updates, oldValues, 'project');

  // For dry-run, return the current (unchanged) project with the changes that would be made
  return {
    type: 'project-updated',
    project,
    changes,
    dryRun: true,
  };
}

/**
 * Preview area update changes (for dry-run mode).
 */
function previewUpdateArea(
  areaPath: string,
  setArgs: string[],
  unsetArgs: string[]
): AreaUpdatedResult {
  const fullPath = resolve(areaPath);

  if (!existsSync(fullPath)) {
    throw createError.notFound('area', areaPath);
  }

  const updates = parseUpdateArgs(setArgs, unsetArgs);
  validateUpdates(updates, 'area');
  normalizeStatusValues(updates);

  const area = parseAreaFile(fullPath);
  const oldValues = getOldValuesForArea(area, updates);
  const changes = buildChanges(updates, oldValues, 'area');

  // For dry-run, return the current (unchanged) area with the changes that would be made
  return {
    type: 'area-updated',
    area,
    changes,
    dryRun: true,
  };
}

export const updateCommand = new Command('update')
  .description('Update task, project, or area fields')
  .argument('<query>', 'Path or title of task, project, or area')
  .option('--set <field=value...>', 'Set field to value (can be repeated)')
  .option('--unset <field...>', 'Remove field (can be repeated)')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (queryOrPath, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);
    const dryRun = options.dryRun ?? false;

    const setArgs = options.set ?? [];
    const unsetArgs = options.unset ?? [];

    if (setArgs.length === 0 && unsetArgs.length === 0) {
      console.error('Error: At least one --set or --unset option is required');
      process.exit(2);
    }

    try {
      // Resolve the query to a path and entity type (supports both paths and fuzzy matching)
      const resolved = resolveEntityQuery(queryOrPath);

      if ('error' in resolved) {
        // Lookup failed
        if (resolved.matches) {
          throw createError.ambiguous(queryOrPath, resolved.matches);
        } else {
          throw createError.notFound('task', queryOrPath);
        }
      }

      const { path: fullPath, entityType } = resolved;

      if (dryRun) {
        let result: TaskUpdatedResult | ProjectUpdatedResult | AreaUpdatedResult;
        switch (entityType) {
          case 'task':
            result = previewUpdateTask(fullPath, setArgs, unsetArgs);
            break;
          case 'project':
            result = previewUpdateProject(fullPath, setArgs, unsetArgs);
            break;
          case 'area':
            result = previewUpdateArea(fullPath, setArgs, unsetArgs);
            break;
        }
        console.log(formatOutput(result, globalOpts));
      } else {
        switch (entityType) {
          case 'task': {
            const { task, changes } = updateTask(fullPath, setArgs, unsetArgs);
            const result: TaskUpdatedResult = {
              type: 'task-updated',
              task,
              changes,
            };
            console.log(formatOutput(result, globalOpts));
            break;
          }
          case 'project': {
            const { project, changes } = updateProject(fullPath, setArgs, unsetArgs);
            const result: ProjectUpdatedResult = {
              type: 'project-updated',
              project,
              changes,
            };
            console.log(formatOutput(result, globalOpts));
            break;
          }
          case 'area': {
            const { area, changes } = updateArea(fullPath, setArgs, unsetArgs);
            const result: AreaUpdatedResult = {
              type: 'area-updated',
              area,
              changes,
            };
            console.log(formatOutput(result, globalOpts));
            break;
          }
        }
      }
    } catch (error) {
      if (isCliError(error)) {
        console.error(formatError(error, mode));
      } else {
        console.error(String(error));
      }
      process.exit(1);
    }
  });
