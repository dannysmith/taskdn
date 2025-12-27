import { dim, bold, green, yellow, red, cyan, strikethrough } from 'ansis';
import type { Task, Project, Area } from '@bindings';
import type { BatchResult, BodyAppendedResult, FieldChange } from '../types.ts';
import { formatShortDate } from '../helpers/index.ts';
import { formatTaskCheckbox, formatStatus } from './shared.ts';

/**
 * Format task created result for human output
 */
export function formatTaskCreated(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task created`);
  lines.push('');

  // Title and status
  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${bold(task.title)}`);
  lines.push(`  ${dim(task.path)}`);

  // Key metadata
  if (task.due) lines.push(`  ${dim('Due:')} ${formatShortDate(task.due)}`);
  if (task.scheduled) lines.push(`  ${dim('Scheduled:')} ${formatShortDate(task.scheduled)}`);
  if (task.project) lines.push(`  ${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`  ${dim('Area:')} ${cyan(task.area)}`);

  return lines.join('\n');
}

/**
 * Format project created result for human output
 */
export function formatProjectCreated(project: Project): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Project created`);
  lines.push('');

  // Title and status
  lines.push(`  ${bold(project.title)}`);
  if (project.status) lines.push(`  ${formatStatus(project.status)}`);
  lines.push(`  ${dim(project.path)}`);

  // Key metadata
  if (project.area) lines.push(`  ${dim('Area:')} ${cyan(project.area)}`);
  if (project.startDate) lines.push(`  ${dim('Start:')} ${formatShortDate(project.startDate)}`);
  if (project.endDate) lines.push(`  ${dim('End:')} ${formatShortDate(project.endDate)}`);

  return lines.join('\n');
}

/**
 * Format area created result for human output
 */
export function formatAreaCreated(area: Area): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Area created`);
  lines.push('');

  // Title and status
  lines.push(`  ${bold(area.title)}`);
  if (area.status) lines.push(`  ${formatStatus(area.status)}`);
  lines.push(`  ${dim(area.path)}`);

  // Key metadata
  if (area.areaType) lines.push(`  ${dim('Type:')} ${area.areaType}`);

  return lines.join('\n');
}

/**
 * Format task completed result for human output
 */
export function formatTaskCompleted(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task completed`);
  lines.push('');

  lines.push(`  ${dim('[✓]')} ${dim(strikethrough(task.title))}`);
  lines.push(`  ${dim(task.path)}`);

  return lines.join('\n');
}

/**
 * Format task dropped result for human output
 */
export function formatTaskDropped(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${yellow('✗')} Task dropped`);
  lines.push('');

  lines.push(`  ${dim('[✗]')} ${dim(strikethrough(task.title))}`);
  lines.push(`  ${dim(task.path)}`);

  return lines.join('\n');
}

/**
 * Format task status changed result for human output
 */
export function formatTaskStatusChanged(task: Task, previousStatus: string): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task status changed`);
  lines.push('');

  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${task.title}`);
  lines.push(`  ${dim(task.path)}`);
  lines.push('');
  lines.push(`  ${dim('Status:')} ${previousStatus} → ${formatStatus(task.status)}`);

  return lines.join('\n');
}

/**
 * Format field changes for human output
 */
export function formatFieldChanges(changes: FieldChange[]): string {
  const lines: string[] = [];
  for (const change of changes) {
    if (change.oldValue && change.newValue) {
      lines.push(`  ${dim(change.field + ':')} ${change.oldValue} → ${change.newValue}`);
    } else if (change.newValue) {
      lines.push(`  ${dim(change.field + ':')} ${dim('(unset)')} → ${change.newValue}`);
    } else if (change.oldValue) {
      lines.push(`  ${dim(change.field + ':')} ${change.oldValue} → ${dim('(unset)')}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format task updated result for human output
 */
export function formatTaskUpdated(task: Task, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task updated`);
  lines.push('');

  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${task.title}`);
  lines.push(`  ${dim(task.path)}`);
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format project updated result for human output
 */
export function formatProjectUpdated(project: Project, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Project updated`);
  lines.push('');

  lines.push(`  ${bold(project.title)}`);
  lines.push(`  ${dim(project.path)}`);
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format area updated result for human output
 */
export function formatAreaUpdated(area: Area, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Area updated`);
  lines.push('');

  lines.push(`  ${bold(area.title)}`);
  lines.push(`  ${dim(area.path)}`);
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format archived result for human output
 */
export function formatArchived(title: string, fromPath: string, toPath: string): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Archived`);
  lines.push('');

  lines.push(`  ${bold(title)}`);
  lines.push(`  ${dim('From:')} ${fromPath}`);
  lines.push(`  ${dim('To:')} ${toPath}`);

  return lines.join('\n');
}

/**
 * Format batch result for human output
 */
export function formatBatchResult(result: BatchResult): string {
  const lines: string[] = [];
  const opName =
    result.operation === 'completed'
      ? 'Completed'
      : result.operation === 'dropped'
        ? 'Dropped'
        : result.operation === 'status-changed'
          ? 'Status changed'
          : result.operation === 'updated'
            ? 'Updated'
            : 'Archived';

  lines.push('');

  if (result.successes.length > 0) {
    lines.push(
      `${green('✓')} ${opName} ${result.successes.length} item${result.successes.length !== 1 ? 's' : ''}`
    );
    lines.push('');

    for (const success of result.successes) {
      if (success.task) {
        const checkbox = formatTaskCheckbox(success.task.status);
        lines.push(`  ${checkbox} ${success.title}`);
      } else {
        lines.push(`  ${bold(success.title)}`);
      }
      lines.push(`  ${dim(success.path)}`);
      if (success.toPath) {
        lines.push(`  ${dim('→')} ${success.toPath}`);
      }
    }
    lines.push('');
  }

  if (result.failures.length > 0) {
    lines.push(`${red('✗')} Failed: ${result.failures.length}`);
    lines.push('');

    for (const failure of result.failures) {
      lines.push(`  ${red(failure.code)}: ${failure.message}`);
      lines.push(`  ${dim(failure.path)}`);
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format body appended result for human output
 */
export function formatBodyAppended(result: BodyAppendedResult): string {
  const lines: string[] = [];
  const entityLabel =
    result.entityType === 'task' ? 'Task' : result.entityType === 'project' ? 'Project' : 'Area';

  lines.push('');
  lines.push(`${green('✓')} ${entityLabel} body updated`);
  lines.push('');
  lines.push(`  ${bold(result.title)}`);
  lines.push(`  ${dim(result.path)}`);
  lines.push('');
  lines.push(`  ${dim('Appended:')}`);
  lines.push(`  ${result.appendedText}`);

  return lines.join('\n');
}
