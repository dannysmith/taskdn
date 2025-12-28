import { dim, cyan } from 'ansis';
import type { Task } from '@bindings';
import { formatLongDate } from '../helpers/index.ts';
import {
  extractFilename,
  formatTaskCheckbox,
  formatEntityHeader,
  renderMarkdownBody,
} from './shared.ts';

/**
 * Format a single task for human output (show command)
 */
export function formatTask(task: Task): string {
  const lines: string[] = [];

  // Boxed header with checkbox, title, filename, status
  const checkbox = formatTaskCheckbox(task.status);
  const titleText = task.status === 'Done' || task.status === 'Dropped' ? task.title : task.title;
  lines.push(formatEntityHeader(titleText, extractFilename(task.path), task.status, checkbox));
  lines.push('');

  // Metadata
  if (task.due) lines.push(`  ${dim('Due:')} ${formatLongDate(task.due)}`);
  if (task.scheduled) lines.push(`  ${dim('Scheduled:')} ${formatLongDate(task.scheduled)}`);
  if (task.project) lines.push(`  ${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`  ${dim('Area:')} ${cyan(task.area)}`);

  // Body with markdown rendering
  if (task.body) {
    lines.push('');
    lines.push(renderMarkdownBody(task.body));
  }

  return lines.join('\n');
}
