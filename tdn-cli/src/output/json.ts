import type { Formatter, FormattableResult, TaskResult } from './types.ts';

/**
 * Convert status to kebab-case for JSON output
 */
function formatStatus(status: string): string {
  return status
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * JSON formatter - structured data for scripts and programmatic access
 */
export const jsonFormatter: Formatter = {
  format(result: FormattableResult): string {
    switch (result.type) {
      case 'task': {
        const taskResult = result as TaskResult;
        const task = taskResult.task;
        const output = {
          summary: `Task: ${task.title}`,
          task: {
            path: task.path,
            title: task.title,
            status: formatStatus(task.status),
            ...(task.due && { due: task.due }),
            ...(task.scheduled && { scheduled: task.scheduled }),
            ...(task.deferUntil && { 'defer-until': task.deferUntil }),
            ...(task.project && { project: task.project }),
            ...(task.area && { area: task.area }),
            ...(task.createdAt && { 'created-at': task.createdAt }),
            ...(task.updatedAt && { 'updated-at': task.updatedAt }),
            ...(task.completedAt && { 'completed-at': task.completedAt }),
            ...(task.body && { body: task.body }),
          },
        };
        return JSON.stringify(output, null, 2);
      }
      default: {
        // Stub for other types
        const output = {
          summary: `Stub output for ${result.type}`,
          ...result,
        };
        return JSON.stringify(output, null, 2);
      }
    }
  },
};
