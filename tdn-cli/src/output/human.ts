import { bold, blue, dim, cyan, yellow, green } from 'ansis';
import type { Task, Project, Area } from '@bindings';
import type {
  Formatter,
  FormattableResult,
  TaskResult,
  TaskListResult,
  ProjectResult,
  ProjectListResult,
  AreaResult,
  AreaListResult,
} from './types.ts';
import { toKebabCase } from './types.ts';

/**
 * Format a status with appropriate color (works for tasks, projects, and areas)
 */
function formatStatus(status: string): string {
  const statusColors: Record<string, (s: string) => string> = {
    // Task statuses
    Inbox: (s) => dim(s),
    Icebox: (s) => dim(s),
    Ready: (s) => green(s),
    InProgress: (s) => blue(s),
    Blocked: (s) => yellow(s),
    Dropped: (s) => dim(s),
    Done: (s) => dim(s),
    // Project-specific statuses
    Planning: (s) => cyan(s),
    Paused: (s) => yellow(s),
    // Area-specific statuses
    Active: (s) => green(s),
    Archived: (s) => dim(s),
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
 * Format a single area for human output
 */
function formatArea(area: Area): string {
  const lines: string[] = [];

  // Title with status (status is optional for areas)
  if (area.status) {
    lines.push(bold(area.title) + '  ' + formatStatus(area.status));
  } else {
    lines.push(bold(area.title));
  }
  lines.push(dim(area.path));
  lines.push('');

  // Metadata
  if (area.areaType) lines.push(`${dim('Type:')} ${area.areaType}`);
  if (area.description) lines.push(`${dim('Description:')} ${area.description}`);

  // Body
  if (area.body) {
    lines.push('');
    lines.push(area.body);
  }

  return lines.join('\n');
}

/**
 * Format a list of tasks for human output
 */
function formatTaskList(tasks: Task[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push(bold(blue(`Tasks (${tasks.length})`)));
  lines.push('');

  if (tasks.length === 0) {
    lines.push(dim('No tasks match the specified criteria.'));
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

    lines.push(`  ${formatStatus(status)}`);
    for (const task of groupTasks) {
      let titleLine = `  ${bold(task.title)}`;
      if (task.due) {
        titleLine += `  ${dim('due:')} ${task.due}`;
      }
      lines.push(titleLine);
      lines.push(`    ${dim(task.path)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of projects for human output
 */
function formatProjectList(projects: Project[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push(bold(blue(`Projects (${projects.length})`)));
  lines.push('');

  if (projects.length === 0) {
    lines.push(dim('No projects match the specified criteria.'));
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

    lines.push(`  ${formatStatus(status)}`);
    for (const project of groupProjects) {
      let titleLine = `  ${bold(project.title)}`;
      if (project.area) {
        titleLine += `  ${dim('area:')} ${project.area}`;
      }
      lines.push(titleLine);
      lines.push(`    ${dim(project.path)}`);
    }
    lines.push('');
  }

  // Output projects without status at the end
  if (noStatus.length > 0) {
    lines.push(`  ${dim('(no status)')}`);
    for (const project of noStatus) {
      let titleLine = `  ${bold(project.title)}`;
      if (project.area) {
        titleLine += `  ${dim('area:')} ${project.area}`;
      }
      lines.push(titleLine);
      lines.push(`    ${dim(project.path)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format a list of areas for human output
 */
function formatAreaList(areas: Area[]): string {
  const lines: string[] = [];

  // Header with count
  lines.push(bold(blue(`Areas (${areas.length})`)));
  lines.push('');

  if (areas.length === 0) {
    lines.push(dim('No areas match the specified criteria.'));
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

    lines.push(`  ${formatStatus(status)}`);
    for (const area of groupAreas) {
      let titleLine = `  ${bold(area.title)}`;
      if (area.areaType) {
        titleLine += `  ${dim('type:')} ${area.areaType}`;
      }
      lines.push(titleLine);
      lines.push(`    ${dim(area.path)}`);
    }
    lines.push('');
  }

  // Output areas without status at the end
  if (noStatus.length > 0) {
    lines.push(`  ${dim('(no status)')}`);
    for (const area of noStatus) {
      let titleLine = `  ${bold(area.title)}`;
      if (area.areaType) {
        titleLine += `  ${dim('type:')} ${area.areaType}`;
      }
      lines.push(titleLine);
      lines.push(`    ${dim(area.path)}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
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
      case 'context':
        return bold(blue('Context')) + dim(' (stub output)');
      default:
        return dim(`[${result.type}] stub output`);
    }
  },
};
