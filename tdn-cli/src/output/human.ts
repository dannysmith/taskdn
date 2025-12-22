import { bold, green, blue, dim, cyan, yellow } from 'ansis';
import type { Task, Project } from '@bindings';
import type { Formatter, FormattableResult, TaskResult, ProjectResult } from './types.ts';
import { toKebabCase } from './types.ts';

/**
 * Format a task status with appropriate color
 */
function formatStatus(status: string): string {
  const statusColors: Record<string, (s: string) => string> = {
    Inbox: (s) => dim(s),
    Icebox: (s) => dim(s),
    Ready: (s) => green(s),
    InProgress: (s) => blue(s),
    Blocked: (s) => yellow(s),
    Dropped: (s) => dim(s),
    Done: (s) => dim(s),
  };
  const colorFn = statusColors[status] ?? ((s: string) => s);
  return colorFn(toKebabCase(status));
}

/**
 * Format a single task for human output
 */
function formatTask(task: Task): string {
  const lines: string[] = [];

  // Title with status
  lines.push(bold(task.title) + '  ' + formatStatus(task.status));
  lines.push(dim(task.path));
  lines.push('');

  // Metadata
  if (task.due) lines.push(`${dim('Due:')} ${task.due}`);
  if (task.scheduled) lines.push(`${dim('Scheduled:')} ${task.scheduled}`);
  if (task.project) lines.push(`${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`${dim('Area:')} ${cyan(task.area)}`);

  // Body
  if (task.body) {
    lines.push('');
    lines.push(task.body);
  }

  return lines.join('\n');
}

/**
 * Format a single project for human output
 */
function formatProject(project: Project): string {
  const lines: string[] = [];

  // Title with status (status is optional for projects)
  if (project.status) {
    lines.push(bold(project.title) + '  ' + formatStatus(project.status));
  } else {
    lines.push(bold(project.title));
  }
  lines.push(dim(project.path));
  lines.push('');

  // Metadata
  if (project.startDate) lines.push(`${dim('Start Date:')} ${project.startDate}`);
  if (project.endDate) lines.push(`${dim('End Date:')} ${project.endDate}`);
  if (project.area) lines.push(`${dim('Area:')} ${cyan(project.area)}`);
  if (project.description) lines.push(`${dim('Description:')} ${project.description}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`${dim('Blocked By:')} ${project.blockedBy.join(', ')}`);
  }

  // Body
  if (project.body) {
    lines.push('');
    lines.push(project.body);
  }

  return lines.join('\n');
}

/**
 * Human-readable formatter with colors and styling
 */
export const humanFormatter: Formatter = {
  format(result: FormattableResult): string {
    switch (result.type) {
      case 'task': {
        const taskResult = result as TaskResult;
        return formatTask(taskResult.task);
      }
      case 'task-list':
        return bold(blue('Tasks')) + dim(' (stub output)');
      case 'project': {
        const projectResult = result as ProjectResult;
        return formatProject(projectResult.project);
      }
      case 'area':
        return bold(green('Area')) + dim(' (stub output)');
      case 'context':
        return bold(blue('Context')) + dim(' (stub output)');
      default:
        return dim(`[${result.type}] stub output`);
    }
  },
};
