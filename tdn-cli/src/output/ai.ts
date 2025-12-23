import type { Task, Project, Area } from '@bindings';
import type {
  Formatter,
  FormattableResult,
  TaskResult,
  ProjectResult,
  AreaResult,
} from './types.ts';
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
 * Format a single project for AI mode (structured Markdown)
 */
function formatProject(project: Project): string {
  const lines: string[] = [];

  lines.push(`## ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);

  // Status is optional for projects
  if (project.status) {
    lines.push(`- **status:** ${toKebabCase(project.status)}`);
  }

  if (project.area) lines.push(`- **area:** ${project.area}`);
  if (project.startDate) lines.push(`- **start-date:** ${project.startDate}`);
  if (project.endDate) lines.push(`- **end-date:** ${project.endDate}`);
  if (project.description) lines.push(`- **description:** ${project.description}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`- **blocked-by:** ${project.blockedBy.join(', ')}`);
  }
  if (project.uniqueId) lines.push(`- **unique-id:** ${project.uniqueId}`);

  if (project.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(project.body);
  }

  return lines.join('\n');
}

/**
 * Format a single area for AI mode (structured Markdown)
 */
function formatArea(area: Area): string {
  const lines: string[] = [];

  lines.push(`## ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);

  // Status is optional for areas
  if (area.status) {
    lines.push(`- **status:** ${toKebabCase(area.status)}`);
  }

  if (area.areaType) lines.push(`- **type:** ${area.areaType}`);
  if (area.description) lines.push(`- **description:** ${area.description}`);

  if (area.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(area.body);
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
      case 'project': {
        const projectResult = result as ProjectResult;
        return formatProject(projectResult.project);
      }
      case 'area': {
        const areaResult = result as AreaResult;
        return formatArea(areaResult.area);
      }
      case 'context':
        return '## Context\n\n(stub output)';
      default:
        return `## ${result.type}\n\n(stub output)`;
    }
  },
};
