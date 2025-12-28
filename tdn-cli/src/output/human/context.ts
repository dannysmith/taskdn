import { dim, bold, cyan, red } from 'ansis';
import type { Task, Project, Area } from '@bindings';
import type {
  AreaContextResultOutput,
  ProjectContextResultOutput,
  TaskContextResultOutput,
  VaultOverviewResult,
} from '../types.ts';
import { formatLongDate, formatShortDate } from '../helpers/index.ts';
import {
  extractFilename,
  formatTaskCheckbox,
  formatTaskTitle,
  formatEntityHeader,
  renderMarkdownBody,
  formatSeparator,
  formatWarnings,
  formatStatus,
} from './shared.ts';

/**
 * Format a task for context output (compact, for lists)
 */
function formatContextTask(task: Task, indent: string = '    '): string {
  const checkbox = formatTaskCheckbox(task.status);
  const title = formatTaskTitle(task.title, task.status);

  let taskLine = `${indent}${checkbox} ${title}`;
  taskLine += `  ${formatStatus(task.status)}`;
  if (task.due) {
    taskLine += `  ${dim('due')} ${formatShortDate(task.due)}`;
  }

  return taskLine;
}

/**
 * Format a project for context output (compact)
 */
function formatContextProject(project: Project, taskCount: number, indent: string = '  '): string {
  const lines: string[] = [];

  // Project title line with status
  let titleLine = `${indent}${bold(project.title)}`;
  if (project.status) {
    titleLine += `  ${formatStatus(project.status)}`;
  }
  lines.push(titleLine);

  // Second line: filename and task count
  const taskCountStr = taskCount === 1 ? '1 task' : `${taskCount} tasks`;
  lines.push(`${indent}${dim(extractFilename(project.path))}  ${dim(taskCountStr)}`);

  return lines.join('\n');
}

/**
 * Format an area for context output (compact)
 */
function formatContextAreaCompact(area: Area, indent: string = '  '): string {
  const lines: string[] = [];

  let titleLine = `${indent}${bold(area.title)}`;
  if (area.status) {
    titleLine += `  ${formatStatus(area.status)}`;
  }
  lines.push(titleLine);
  lines.push(`${indent}${dim(extractFilename(area.path))}`);

  return lines.join('\n');
}

/**
 * Format area context result for human output
 */
export function formatAreaContext(result: AreaContextResultOutput): string {
  const lines: string[] = [];
  const area = result.area;

  // Boxed header for the area
  lines.push(formatEntityHeader(area.title, extractFilename(area.path), area.status ?? undefined));
  lines.push('');

  // Metadata
  if (area.areaType) lines.push(`  ${dim('Type:')} ${area.areaType}`);
  if (area.description) lines.push(`  ${dim('Description:')} ${area.description}`);

  // Body with markdown rendering
  if (area.body) {
    lines.push('');
    lines.push(renderMarkdownBody(area.body));
  }

  // Separator before projects
  lines.push('');
  lines.push(formatSeparator());
  lines.push('');

  // Projects section
  lines.push(bold(`Projects (${result.projects.length})`));
  lines.push('');

  if (result.projects.length === 0) {
    lines.push(dim('  No projects in this area.'));
  } else {
    for (const project of result.projects) {
      const projectTasks = result.projectTasks.get(project.path) ?? [];
      lines.push(formatContextProject(project, projectTasks.length));
      lines.push('');

      // Tasks under this project (indented further)
      for (const task of projectTasks) {
        lines.push(formatContextTask(task));
      }
      if (projectTasks.length > 0) lines.push('');
    }
  }

  // Direct tasks section
  if (result.directTasks.length > 0) {
    lines.push(formatSeparator());
    lines.push('');
    lines.push(bold(`Direct Tasks (${result.directTasks.length})`));
    lines.push('');

    for (const task of result.directTasks) {
      lines.push(formatContextTask(task, '  '));
    }
    lines.push('');
  }

  // Warnings using clack's log.warn
  if (result.warnings.length > 0) {
    lines.push(''); // Extra space before warnings
    formatWarnings(result.warnings);
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format project context result for human output
 */
export function formatProjectContext(result: ProjectContextResultOutput): string {
  const lines: string[] = [];
  const project = result.project;

  // Boxed header for the project
  lines.push(
    formatEntityHeader(project.title, extractFilename(project.path), project.status ?? undefined)
  );
  lines.push('');

  // Metadata
  if (project.startDate) lines.push(`  ${dim('Start Date:')} ${formatLongDate(project.startDate)}`);
  if (project.endDate) lines.push(`  ${dim('End Date:')} ${formatLongDate(project.endDate)}`);
  if (project.area) lines.push(`  ${dim('Area:')} ${cyan(project.area)}`);
  if (project.description) lines.push(`  ${dim('Description:')} ${project.description}`);

  // Body with markdown rendering
  if (project.body) {
    lines.push('');
    lines.push(renderMarkdownBody(project.body));
  }

  // Parent area section
  if (result.area) {
    lines.push('');
    lines.push(formatSeparator());
    lines.push('');
    lines.push(bold('Parent Area'));
    lines.push('');
    lines.push(formatContextAreaCompact(result.area));
  }

  // Separator before tasks
  lines.push('');
  lines.push(formatSeparator());
  lines.push('');

  // Tasks section
  lines.push(bold(`Tasks (${result.tasks.length})`));
  lines.push('');

  if (result.tasks.length === 0) {
    lines.push(dim('  No tasks in this project.'));
  } else {
    for (const task of result.tasks) {
      lines.push(formatContextTask(task, '  '));
    }
    lines.push('');
  }

  // Warnings using clack's log.warn
  if (result.warnings.length > 0) {
    lines.push(''); // Extra space before warnings
    formatWarnings(result.warnings);
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format task context result for human output
 */
export function formatTaskContext(result: TaskContextResultOutput): string {
  const lines: string[] = [];
  const task = result.task;

  // Boxed header with checkbox
  const checkbox = formatTaskCheckbox(task.status);
  lines.push(formatEntityHeader(task.title, extractFilename(task.path), task.status, checkbox));
  lines.push('');

  // Metadata
  if (task.due) lines.push(`  ${dim('Due:')} ${formatLongDate(task.due)}`);
  if (task.scheduled) lines.push(`  ${dim('Scheduled:')} ${formatLongDate(task.scheduled)}`);
  if (task.deferUntil) lines.push(`  ${dim('Defer Until:')} ${formatLongDate(task.deferUntil)}`);
  if (task.project) lines.push(`  ${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`  ${dim('Area:')} ${cyan(task.area)}`);

  // Body with markdown rendering
  if (task.body) {
    lines.push('');
    lines.push(renderMarkdownBody(task.body));
  }

  // Parent project section
  if (result.project) {
    lines.push('');
    lines.push(formatSeparator());
    lines.push('');
    lines.push(bold('Parent Project'));
    lines.push('');

    const project = result.project;
    let titleLine = `  ${bold(project.title)}`;
    if (project.status) {
      titleLine += `  ${formatStatus(project.status)}`;
    }
    lines.push(titleLine);
    lines.push(`  ${dim(extractFilename(project.path))}`);
  }

  // Parent area section
  if (result.area) {
    lines.push('');
    lines.push(formatSeparator());
    lines.push('');
    lines.push(bold('Parent Area'));
    lines.push('');
    lines.push(formatContextAreaCompact(result.area));
  }

  // Warnings using clack's log.warn
  if (result.warnings.length > 0) {
    lines.push(''); // Extra space before warnings
    formatWarnings(result.warnings);
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format vault overview result for human output
 */
export function formatVaultOverview(result: VaultOverviewResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(bold('Vault Overview'));
  lines.push('');

  // Areas section
  lines.push(bold(`Areas (${result.stats.areaCount})`));
  lines.push('');

  if (result.areas.length === 0) {
    lines.push(dim('  No areas defined.'));
  } else {
    for (const area of result.areas) {
      const projects = result.areaProjects.get(area.path) ?? [];
      const directTasks = result.directAreaTasks.get(area.path) ?? [];
      let taskCount = directTasks.length;
      for (const project of projects) {
        const projectTasks = result.projectTasks.get(project.path) ?? [];
        taskCount += projectTasks.length;
      }

      lines.push(`  ${bold(area.title)}`);
      lines.push(`    ${dim('Projects:')} ${projects.length} active`);
      lines.push(`    ${dim('Tasks:')} ${taskCount} active`);
    }
  }

  // Separator
  lines.push('');
  lines.push(formatSeparator());
  lines.push('');

  // Summary section
  lines.push(bold('Summary'));
  lines.push('');
  lines.push(`  ${dim('Total Active Tasks:')} ${result.stats.taskCount}`);
  if (result.stats.overdueCount > 0) {
    lines.push(`  ${dim('Overdue:')} ${red(String(result.stats.overdueCount))}`);
  } else {
    lines.push(`  ${dim('Overdue:')} ${result.stats.overdueCount}`);
  }
  lines.push(`  ${dim('In Progress:')} ${result.stats.inProgressCount}`);

  // Separator
  lines.push('');
  lines.push(formatSeparator());
  lines.push('');

  // Timeline section
  lines.push(bold('Timeline'));
  lines.push('');

  // Overdue
  if (result.timeline.overdue.length > 0) {
    lines.push(`  ${dim('Overdue:')} ${result.timeline.overdue.length} tasks`);
    for (const task of result.timeline.overdue) {
      const checkbox = formatTaskCheckbox(task.status);
      const dueDate = task.due ? formatShortDate(task.due) : '';
      lines.push(`    ${checkbox} ${task.title}  ${dim(dueDate)}`);
    }
    lines.push('');
  }

  // Due today
  if (result.timeline.dueToday.length > 0) {
    lines.push(`  ${dim('Due Today:')} ${result.timeline.dueToday.length} tasks`);
    for (const task of result.timeline.dueToday) {
      const checkbox = formatTaskCheckbox(task.status);
      lines.push(`    ${checkbox} ${task.title}`);
    }
    lines.push('');
  }

  // Scheduled today
  if (result.timeline.scheduledToday.length > 0) {
    lines.push(`  ${dim('Scheduled Today:')} ${result.timeline.scheduledToday.length} tasks`);
    for (const task of result.timeline.scheduledToday) {
      const checkbox = formatTaskCheckbox(task.status);
      lines.push(`    ${checkbox} ${task.title}`);
    }
    lines.push('');
  }

  // Blocked
  if (result.timeline.blocked.length > 0) {
    lines.push(`  ${dim('Blocked:')} ${result.timeline.blocked.length} tasks`);
    for (const task of result.timeline.blocked) {
      const checkbox = formatTaskCheckbox(task.status);
      lines.push(`    ${checkbox} ${task.title}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
