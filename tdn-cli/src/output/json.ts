import type { Formatter, FormattableResult, TaskResult, ProjectResult } from './types.ts';
import { toKebabCase } from './types.ts';

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
            status: toKebabCase(task.status),
            ...(task.due && { due: task.due }),
            ...(task.scheduled && { scheduled: task.scheduled }),
            ...(task.deferUntil && { deferUntil: task.deferUntil }),
            ...(task.project && { project: task.project }),
            ...(task.area && { area: task.area }),
            ...(task.createdAt && { createdAt: task.createdAt }),
            ...(task.updatedAt && { updatedAt: task.updatedAt }),
            ...(task.completedAt && { completedAt: task.completedAt }),
            ...(task.body && { body: task.body }),
          },
        };
        return JSON.stringify(output, null, 2);
      }
      case 'project': {
        const projectResult = result as ProjectResult;
        const project = projectResult.project;
        const output = {
          summary: `Project: ${project.title}`,
          project: {
            path: project.path,
            title: project.title,
            ...(project.status && { status: toKebabCase(project.status) }),
            ...(project.area && { area: project.area }),
            ...(project.startDate && { startDate: project.startDate }),
            ...(project.endDate && { endDate: project.endDate }),
            ...(project.description && { description: project.description }),
            ...(project.blockedBy &&
              project.blockedBy.length > 0 && { blockedBy: project.blockedBy }),
            ...(project.uniqueId && { uniqueId: project.uniqueId }),
            ...(project.body && { body: project.body }),
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
