import type {
  Formatter,
  FormattableResult,
  TaskResult,
  TaskListResult,
  ProjectResult,
  AreaResult,
} from './types.ts';
import { toKebabCase } from './types.ts';
import type { Task } from '@bindings';

/**
 * Convert a Task to a JSON-serializable object
 */
function taskToJson(task: Task, includeBody = true) {
  return {
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
    ...(includeBody && task.body && { body: task.body }),
  };
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
          task: taskToJson(task),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-list': {
        const listResult = result as TaskListResult;
        const count = listResult.tasks.length;
        const summary =
          count === 0
            ? 'No tasks match the specified criteria'
            : `Found ${count} task${count === 1 ? '' : 's'}`;
        const output = {
          summary,
          tasks: listResult.tasks.map((t) => taskToJson(t, false)),
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
      case 'area': {
        const areaResult = result as AreaResult;
        const area = areaResult.area;
        const output = {
          summary: `Area: ${area.title}`,
          area: {
            path: area.path,
            title: area.title,
            ...(area.status && { status: toKebabCase(area.status) }),
            ...(area.areaType && { areaType: area.areaType }),
            ...(area.description && { description: area.description }),
            ...(area.body && { body: area.body }),
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
