import { dim, bold } from 'ansis';
import type { Task, Project, Area } from '@bindings';
import { formatShortDate, toKebabCase } from '../helpers/index.ts';
import { formatTaskCheckbox, formatTaskTitle } from './shared.ts';

/**
 * Format a list of tasks for human output
 */
export function formatTaskList(tasks: Task[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push('');
  lines.push(bold(`Tasks (${tasks.length})`));
  lines.push('');

  if (tasks.length === 0) {
    lines.push(dim('  No tasks match the specified criteria.'));
    return lines.join('\n');
  }

  // Group tasks by status
  const statusOrder = ['InProgress', 'Blocked', 'Ready', 'Inbox', 'Icebox', 'Done', 'Dropped'];
  const grouped = new Map<string, Task[]>();

  for (const task of tasks) {
    const status = task.status;
    if (!grouped.has(status)) {
      grouped.set(status, []);
    }
    grouped.get(status)!.push(task);
  }

  // Output groups in order
  for (const status of statusOrder) {
    const groupTasks = grouped.get(status);
    if (!groupTasks || groupTasks.length === 0) continue;

    // Status as section header (dim to distinguish from titles)
    lines.push(`  ${dim(toKebabCase(status))}`);

    for (const task of groupTasks) {
      const checkbox = formatTaskCheckbox(status);
      const title = formatTaskTitle(task.title, status);

      // Build context string (Area/Project or just Area)
      let context = '';
      if (task.area && task.project) {
        context = `${task.area}/${task.project}`;
      } else if (task.area) {
        context = task.area;
      } else if (task.project) {
        context = task.project;
      }

      // Build the line
      let taskLine = `    ${checkbox} ${title}`;
      if (context) {
        taskLine += `  ${dim(context)}`;
      }
      if (task.due) {
        taskLine += `  ${dim('due')} ${formatShortDate(task.due)}`;
      }
      lines.push(taskLine);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of projects for human output
 */
export function formatProjectList(projects: Project[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push('');
  lines.push(bold(`Projects (${projects.length})`));
  lines.push('');

  if (projects.length === 0) {
    lines.push(dim('  No projects match the specified criteria.'));
    return lines.join('\n');
  }

  // Group projects by status
  const statusOrder = ['InProgress', 'Planning', 'Blocked', 'Ready', 'Paused', 'Done'];
  const grouped = new Map<string, Project[]>();
  const noStatus: Project[] = [];

  for (const project of projects) {
    if (!project.status) {
      noStatus.push(project);
    } else {
      const status = project.status;
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)!.push(project);
    }
  }

  // Output groups in order
  for (const status of statusOrder) {
    const groupProjects = grouped.get(status);
    if (!groupProjects || groupProjects.length === 0) continue;

    // Status as section header (dim to distinguish from titles)
    lines.push(`  ${dim(toKebabCase(status))}`);

    for (const project of groupProjects) {
      let projectLine = `    ${bold(project.title)}`;
      if (project.area) {
        projectLine += `  ${dim(project.area)}`;
      }
      lines.push(projectLine);
    }
    lines.push('');
  }

  // Output projects without status at the end
  if (noStatus.length > 0) {
    lines.push(`  ${dim('(no status)')}`);
    for (const project of noStatus) {
      let projectLine = `    ${bold(project.title)}`;
      if (project.area) {
        projectLine += `  ${dim(project.area)}`;
      }
      lines.push(projectLine);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of areas for human output
 */
export function formatAreaList(areas: Area[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push('');
  lines.push(bold(`Areas (${areas.length})`));
  lines.push('');

  if (areas.length === 0) {
    lines.push(dim('  No areas match the specified criteria.'));
    return lines.join('\n');
  }

  // Group areas by status
  const statusOrder = ['Active', 'Archived'];
  const grouped = new Map<string, Area[]>();
  const noStatus: Area[] = [];

  for (const area of areas) {
    if (!area.status) {
      noStatus.push(area);
    } else {
      const status = area.status;
      if (!grouped.has(status)) {
        grouped.set(status, []);
      }
      grouped.get(status)!.push(area);
    }
  }

  // Output groups in order
  for (const status of statusOrder) {
    const groupAreas = grouped.get(status);
    if (!groupAreas || groupAreas.length === 0) continue;

    // Status as section header (dim to distinguish from titles)
    lines.push(`  ${dim(toKebabCase(status))}`);

    for (const area of groupAreas) {
      let areaLine = `    ${bold(area.title)}`;
      if (area.areaType) {
        areaLine += `  ${dim(area.areaType)}`;
      }
      lines.push(areaLine);
    }
    lines.push('');
  }

  // Output areas without status at the end
  if (noStatus.length > 0) {
    lines.push(`  ${dim('(no status)')}`);
    for (const area of noStatus) {
      let areaLine = `    ${bold(area.title)}`;
      if (area.areaType) {
        areaLine += `  ${dim(area.areaType)}`;
      }
      lines.push(areaLine);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
