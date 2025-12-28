import type { Task, Project, Area } from '@bindings';
import { formatTaskListItem } from './task.ts';
import { formatProjectListItem } from './project.ts';
import { formatAreaListItem } from './area.ts';

/**
 * Format a list of tasks for AI mode
 */
export function formatTaskList(tasks: Task[]): string {
  const lines: string[] = [];

  lines.push(`## Tasks (${tasks.length})`);
  lines.push('');

  if (tasks.length === 0) {
    lines.push('No tasks match the specified criteria.');
    return lines.join('\n');
  }

  for (const task of tasks) {
    lines.push(formatTaskListItem(task));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of projects for AI mode
 */
export function formatProjectList(projects: Project[]): string {
  const lines: string[] = [];

  lines.push(`## Projects (${projects.length})`);
  lines.push('');

  if (projects.length === 0) {
    lines.push('No projects match the specified criteria.');
    return lines.join('\n');
  }

  for (const project of projects) {
    lines.push(formatProjectListItem(project));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of areas for AI mode
 */
export function formatAreaList(areas: Area[]): string {
  const lines: string[] = [];

  lines.push(`## Areas (${areas.length})`);
  lines.push('');

  if (areas.length === 0) {
    lines.push('No areas match the specified criteria.');
    return lines.join('\n');
  }

  for (const area of areas) {
    lines.push(formatAreaListItem(area));
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
