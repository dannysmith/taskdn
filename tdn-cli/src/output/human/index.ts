import { dim } from 'ansis';
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
  BodyAppendedResult,
} from '../types.ts';
import { formatTask } from './task.ts';
import { formatProject } from './project.ts';
import { formatArea } from './area.ts';
import { formatTaskList, formatProjectList, formatAreaList } from './list.ts';
import {
  formatAreaContext,
  formatProjectContext,
  formatTaskContext,
  formatVaultOverview,
} from './context.ts';
import {
  formatTaskCreated,
  formatProjectCreated,
  formatAreaCreated,
  formatTaskCompleted,
  formatTaskDropped,
  formatTaskStatusChanged,
  formatTaskUpdated,
  formatProjectUpdated,
  formatAreaUpdated,
  formatArchived,
  formatBatchResult,
  formatBodyAppended,
} from './modify.ts';

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
      case 'task-list': {
        const listResult = result as TaskListResult;
        return formatTaskList(listResult.tasks);
      }
      case 'project': {
        const projectResult = result as ProjectResult;
        return formatProject(projectResult.project);
      }
      case 'project-list': {
        const listResult = result as ProjectListResult;
        return formatProjectList(listResult.projects);
      }
      case 'area': {
        const areaResult = result as AreaResult;
        return formatArea(areaResult.area);
      }
      case 'area-list': {
        const listResult = result as AreaListResult;
        return formatAreaList(listResult.areas);
      }
      case 'area-context': {
        const contextResult = result as AreaContextResultOutput;
        return formatAreaContext(contextResult);
      }
      case 'project-context': {
        const contextResult = result as ProjectContextResultOutput;
        return formatProjectContext(contextResult);
      }
      case 'task-context': {
        const contextResult = result as TaskContextResultOutput;
        return formatTaskContext(contextResult);
      }
      case 'vault-overview': {
        const overviewResult = result as VaultOverviewResult;
        return formatVaultOverview(overviewResult);
      }
      case 'task-created': {
        const createdResult = result as TaskCreatedResult;
        return formatTaskCreated(createdResult.task);
      }
      case 'project-created': {
        const createdResult = result as ProjectCreatedResult;
        return formatProjectCreated(createdResult.project);
      }
      case 'area-created': {
        const createdResult = result as AreaCreatedResult;
        return formatAreaCreated(createdResult.area);
      }
      case 'task-completed': {
        const completedResult = result as TaskCompletedResult;
        return formatTaskCompleted(completedResult.task);
      }
      case 'task-dropped': {
        const droppedResult = result as TaskDroppedResult;
        return formatTaskDropped(droppedResult.task);
      }
      case 'task-status-changed': {
        const statusResult = result as TaskStatusChangedResult;
        const output = formatTaskStatusChanged(statusResult.task, statusResult.previousStatus);
        return statusResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      case 'task-updated': {
        const updatedResult = result as TaskUpdatedResult;
        const output = formatTaskUpdated(updatedResult.task, updatedResult.changes);
        return updatedResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      case 'project-updated': {
        const updatedResult = result as ProjectUpdatedResult;
        const output = formatProjectUpdated(updatedResult.project, updatedResult.changes);
        return updatedResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      case 'area-updated': {
        const updatedResult = result as AreaUpdatedResult;
        const output = formatAreaUpdated(updatedResult.area, updatedResult.changes);
        return updatedResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      case 'archived': {
        const archivedResult = result as ArchivedResult;
        const output = formatArchived(
          archivedResult.title,
          archivedResult.fromPath,
          archivedResult.toPath
        );
        return archivedResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      case 'batch-result': {
        const batchResult = result as BatchResult;
        return formatBatchResult(batchResult);
      }
      case 'body-appended': {
        const appendedResult = result as BodyAppendedResult;
        const output = formatBodyAppended(appendedResult);
        return appendedResult.dryRun ? `${dim('Dry run - no changes made')}\n\n${output}` : output;
      }
      default:
        return dim(`[${result.type}] stub output`);
    }
  },
};
