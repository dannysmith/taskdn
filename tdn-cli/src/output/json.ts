import type {
  Formatter,
  FormattableResult,
  TaskResult,
  TaskListResult,
  ProjectResult,
  ProjectListResult,
  AreaResult,
  AreaListResult,
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
  VaultOverviewResult,
  TaskCreatedResult,
  ProjectCreatedResult,
  AreaCreatedResult,
  TaskCompletedResult,
  TaskDroppedResult,
  TaskStatusChangedResult,
  TaskUpdatedResult,
  ProjectUpdatedResult,
  AreaUpdatedResult,
  ArchivedResult,
  BatchResult,
  DryRunResult,
  BodyAppendedResult,
} from './types.ts';
import type { Task, Project, Area } from '@bindings';
import { toKebabCase } from './helpers/index.ts';

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
 * Convert a Project to a JSON-serializable object
 */
function projectToJson(project: Project, includeBody = true) {
  return {
    path: project.path,
    title: project.title,
    ...(project.status && { status: toKebabCase(project.status) }),
    ...(project.area && { area: project.area }),
    ...(project.startDate && { startDate: project.startDate }),
    ...(project.endDate && { endDate: project.endDate }),
    ...(project.description && { description: project.description }),
    ...(project.blockedBy && project.blockedBy.length > 0 && { blockedBy: project.blockedBy }),
    ...(project.uniqueId && { uniqueId: project.uniqueId }),
    ...(includeBody && project.body && { body: project.body }),
  };
}

/**
 * Convert an Area to a JSON-serializable object
 */
function areaToJson(area: Area, includeBody = true) {
  return {
    path: area.path,
    title: area.title,
    ...(area.status && { status: toKebabCase(area.status) }),
    ...(area.areaType && { areaType: area.areaType }),
    ...(area.description && { description: area.description }),
    ...(includeBody && area.body && { body: area.body }),
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
          project: projectToJson(project),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'project-list': {
        const listResult = result as ProjectListResult;
        const count = listResult.projects.length;
        const summary =
          count === 0
            ? 'No projects match the specified criteria'
            : `Found ${count} project${count === 1 ? '' : 's'}`;
        const output = {
          summary,
          projects: listResult.projects.map((p) => projectToJson(p, false)),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'area': {
        const areaResult = result as AreaResult;
        const area = areaResult.area;
        const output = {
          summary: `Area: ${area.title}`,
          area: areaToJson(area),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'area-list': {
        const listResult = result as AreaListResult;
        const count = listResult.areas.length;
        const summary =
          count === 0
            ? 'No areas match the specified criteria'
            : `Found ${count} area${count === 1 ? '' : 's'}`;
        const output = {
          summary,
          areas: listResult.areas.map((a) => areaToJson(a, false)),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'area-context': {
        const contextResult = result as AreaContextResultOutput;
        const projectCount = contextResult.projects.length;
        const taskCount =
          contextResult.directTasks.length +
          Array.from(contextResult.projectTasks.values()).reduce(
            (sum, tasks) => sum + tasks.length,
            0
          );
        const output = {
          summary: `${contextResult.area.title} area with ${projectCount} project${projectCount === 1 ? '' : 's'} and ${taskCount} task${taskCount === 1 ? '' : 's'}`,
          area: areaToJson(contextResult.area, true),
          projects: contextResult.projects.map((p) => {
            const tasks = contextResult.projectTasks.get(p.path) ?? [];
            return {
              ...projectToJson(p, false),
              tasks: tasks.map((t) => taskToJson(t, false)),
            };
          }),
          directTasks: contextResult.directTasks.map((t) => taskToJson(t, false)),
          ...(contextResult.warnings.length > 0 && { warnings: contextResult.warnings }),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'project-context': {
        const contextResult = result as ProjectContextResultOutput;
        const taskCount = contextResult.tasks.length;
        const output = {
          summary: `${contextResult.project.title} project with ${taskCount} task${taskCount === 1 ? '' : 's'}`,
          project: projectToJson(contextResult.project, true),
          ...(contextResult.area && { area: areaToJson(contextResult.area, false) }),
          tasks: contextResult.tasks.map((t) => taskToJson(t, false)),
          ...(contextResult.warnings.length > 0 && { warnings: contextResult.warnings }),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-context': {
        const contextResult = result as TaskContextResultOutput;
        const output = {
          summary: `Task: ${contextResult.task.title}`,
          task: taskToJson(contextResult.task, true),
          ...(contextResult.project && { project: projectToJson(contextResult.project, false) }),
          ...(contextResult.area && { area: areaToJson(contextResult.area, false) }),
          ...(contextResult.warnings.length > 0 && { warnings: contextResult.warnings }),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'vault-overview': {
        const overviewResult = result as VaultOverviewResult;

        // Build area summaries with computed project/task counts
        const areaSummaries = overviewResult.areas.map((area) => {
          const projects = overviewResult.areaProjects.get(area.path) ?? [];
          const directTasks = overviewResult.directAreaTasks.get(area.path) ?? [];
          let taskCount = directTasks.length;
          for (const project of projects) {
            const projectTasks = overviewResult.projectTasks.get(project.path) ?? [];
            taskCount += projectTasks.length;
          }

          return {
            ...areaToJson(area, false),
            projectCount: projects.length,
            activeTaskCount: taskCount,
          };
        });

        const output = {
          summary: `Vault overview: ${overviewResult.stats.taskCount} active tasks, ${overviewResult.stats.overdueCount} overdue`,
          areas: areaSummaries,
          stats: {
            areaCount: overviewResult.stats.areaCount,
            projectCount: overviewResult.stats.projectCount,
            taskCount: overviewResult.stats.taskCount,
            overdueCount: overviewResult.stats.overdueCount,
            dueTodayCount: overviewResult.stats.dueTodayCount,
            inProgressCount: overviewResult.stats.inProgressCount,
          },
          timeline: {
            overdue: overviewResult.timeline.overdue.map((t) => taskToJson(t, false)),
            dueToday: overviewResult.timeline.dueToday.map((t) => taskToJson(t, false)),
            scheduledToday: overviewResult.timeline.scheduledToday.map((t) => taskToJson(t, false)),
            blocked: overviewResult.timeline.blocked.map((t) => taskToJson(t, false)),
          },
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-created': {
        const createdResult = result as TaskCreatedResult;
        const task = createdResult.task;
        const output = {
          summary: `Created task: ${task.title}`,
          created: true,
          task: taskToJson(task),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'project-created': {
        const createdResult = result as ProjectCreatedResult;
        const project = createdResult.project;
        const output = {
          summary: `Created project: ${project.title}`,
          created: true,
          project: projectToJson(project),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'area-created': {
        const createdResult = result as AreaCreatedResult;
        const area = createdResult.area;
        const output = {
          summary: `Created area: ${area.title}`,
          created: true,
          area: areaToJson(area),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-completed': {
        const completedResult = result as TaskCompletedResult;
        const task = completedResult.task;
        const output = {
          summary: `Completed task: ${task.title}`,
          completed: true,
          task: taskToJson(task),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-dropped': {
        const droppedResult = result as TaskDroppedResult;
        const task = droppedResult.task;
        const output = {
          summary: `Dropped task: ${task.title}`,
          dropped: true,
          task: taskToJson(task),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-status-changed': {
        const statusResult = result as TaskStatusChangedResult;
        const task = statusResult.task;
        const output = {
          summary: `Changed status: ${task.title}`,
          updated: true,
          task: taskToJson(task),
          previousStatus: statusResult.previousStatus,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'task-updated': {
        const updatedResult = result as TaskUpdatedResult;
        const task = updatedResult.task;
        const output = {
          summary: `Updated task: ${task.title}`,
          updated: true,
          task: taskToJson(task),
          changes: updatedResult.changes,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'project-updated': {
        const updatedResult = result as ProjectUpdatedResult;
        const project = updatedResult.project;
        const output = {
          summary: `Updated project: ${project.title}`,
          updated: true,
          project: projectToJson(project),
          changes: updatedResult.changes,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'area-updated': {
        const updatedResult = result as AreaUpdatedResult;
        const area = updatedResult.area;
        const output = {
          summary: `Updated area: ${area.title}`,
          updated: true,
          area: areaToJson(area),
          changes: updatedResult.changes,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'archived': {
        const archivedResult = result as ArchivedResult;
        const output = {
          summary: `Archived: ${archivedResult.title}`,
          archived: true,
          title: archivedResult.title,
          from: archivedResult.fromPath,
          to: archivedResult.toPath,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'batch-result': {
        const batchResult = result as BatchResult;
        const successCount = batchResult.successes.length;
        const failCount = batchResult.failures.length;
        const output = {
          summary: `${batchResult.operation}: ${successCount} succeeded, ${failCount} failed`,
          operation: batchResult.operation,
          successes: batchResult.successes.map((s) => ({
            path: s.path,
            title: s.title,
            ...(s.task && { task: taskToJson(s.task) }),
            ...(s.toPath && { to: s.toPath }),
          })),
          failures: batchResult.failures,
        };
        return JSON.stringify(output, null, 2);
      }
      case 'dry-run': {
        const dryRunResult = result as DryRunResult;
        const output = {
          summary: `Dry run: ${dryRunResult.operation} ${dryRunResult.title}`,
          dryRun: true,
          operation: dryRunResult.operation,
          entityType: dryRunResult.entityType,
          title: dryRunResult.title,
          path: dryRunResult.path,
          ...(dryRunResult.wouldCreate && { wouldCreate: true }),
          ...(dryRunResult.changes && { changes: dryRunResult.changes }),
          ...(dryRunResult.toPath && { to: dryRunResult.toPath }),
          ...(dryRunResult.appendText && { appendText: dryRunResult.appendText }),
        };
        return JSON.stringify(output, null, 2);
      }
      case 'body-appended': {
        const appendedResult = result as BodyAppendedResult;
        const output = {
          summary: `Body appended: ${appendedResult.title}`,
          appended: true,
          entityType: appendedResult.entityType,
          title: appendedResult.title,
          path: appendedResult.path,
          appendedText: appendedResult.appendedText,
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
