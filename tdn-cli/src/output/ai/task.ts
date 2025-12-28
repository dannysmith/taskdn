import type { Task } from '@bindings';
import { toKebabCase } from '../helpers/index.ts';

/**
 * Format a single task for AI mode (structured Markdown)
 */
export function formatTask(task: Task): string {
  const lines: string[] = [];

  lines.push(`## ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);

  // Required fields per S1 spec Section 3.3
  lines.push(`- **created-at:** ${task.createdAt || '(missing)'}`);
  lines.push(`- **updated-at:** ${task.updatedAt || '(missing)'}`);

  // Optional fields - only show if present
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);
  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.deferUntil) lines.push(`- **defer-until:** ${task.deferUntil}`);
  if (task.project) lines.push(`- **project:** ${task.project}`);
  if (task.area) lines.push(`- **area:** ${task.area}`);

  if (task.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(task.body);
  }

  return lines.join('\n');
}

/**
 * Format a task for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
export function formatTaskListItem(task: Task): string {
  const lines: string[] = [];

  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);

  // Required fields per S1 spec Section 3.3
  lines.push(`- **created-at:** ${task.createdAt || '(missing)'}`);
  lines.push(`- **updated-at:** ${task.updatedAt || '(missing)'}`);

  // Optional fields - show if present
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);
  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.deferUntil) lines.push(`- **defer-until:** ${task.deferUntil}`);

  // Per CLI spec: show project, or area if no project
  if (task.project) {
    lines.push(`- **project:** ${task.project}`);
  } else if (task.area) {
    lines.push(`- **area:** ${task.area}`);
  }

  return lines.join('\n');
}
