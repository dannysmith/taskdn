import type { Task } from '@bindings';
import type { Formatter, FormattableResult, TaskResult } from './types.ts';
import { toKebabCase } from './types.ts';

/**
 * Format a single task for AI mode (structured Markdown)
 */
function formatTask(task: Task): string {
  const lines: string[] = [];

  lines.push(`## ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);

  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.deferUntil) lines.push(`- **defer-until:** ${task.deferUntil}`);
  if (task.project) lines.push(`- **project:** ${task.project}`);
  if (task.area) lines.push(`- **area:** ${task.area}`);
  if (task.createdAt) lines.push(`- **created-at:** ${task.createdAt}`);
  if (task.updatedAt) lines.push(`- **updated-at:** ${task.updatedAt}`);
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);

  if (task.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(task.body);
  }

  return lines.join('\n');
}

/**
 * AI-mode formatter - structured Markdown optimized for LLM consumption
 */
export const aiFormatter: Formatter = {
  format(result: FormattableResult): string {
    switch (result.type) {
      case 'task': {
        const taskResult = result as TaskResult;
        return formatTask(taskResult.task);
      }
      case 'task-list':
        return '## Tasks\n\n(stub output)';
      case 'project':
        return '## Project\n\n- **status:** (stub)\n- **path:** (stub)';
      case 'area':
        return '## Area\n\n- **path:** (stub)';
      case 'context':
        return '## Context\n\n(stub output)';
      default:
        return `## ${result.type}\n\n(stub output)`;
    }
  },
};
