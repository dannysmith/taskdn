import { bold, blue, dim, cyan, yellow, green, red, strikethrough } from 'ansis';
import boxen from 'boxen';
import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { log } from '@clack/prompts';
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
  FieldChange,
} from './types.ts';
import { toKebabCase } from './helpers/index.ts';

// Configure marked-terminal with our color palette
marked.use(
  markedTerminal({
    firstHeading: bold,
    heading: bold,
    strong: bold,
    em: (s: string) => s, // italic not well supported in all terminals
    codespan: cyan,
    code: dim,
    blockquote: dim,
    listitem: (s: string) => s,
    // Disable table borders for cleaner output
    tableOptions: {
      chars: {
        top: '',
        'top-mid': '',
        'top-left': '',
        'top-right': '',
        bottom: '',
        'bottom-mid': '',
        'bottom-left': '',
        'bottom-right': '',
        left: '',
        'left-mid': '',
        mid: '',
        'mid-mid': '',
        right: '',
        'right-mid': '',
        middle: ' ',
      },
    },
  })
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract filename from a full path
 */
function extractFilename(path: string): string {
  return path.split('/').pop() ?? path;
}

/**
 * Format a short date for list views (e.g., "Jan 20")
 */
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a long date for detail views (e.g., "20 January 2025")
 */
function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Create a horizontal separator line
 */
function formatSeparator(width: number = 60): string {
  return dim('─'.repeat(width));
}

/**
 * Get checkbox symbol for task status
 */
function formatTaskCheckbox(status: string): string {
  const symbols: Record<string, string> = {
    Done: dim('[✓]'),
    Dropped: dim('[✗]'),
    InProgress: yellow('[▸]'),
    Ready: '[ ]',
    Blocked: red('[!]'),
    Inbox: blue('[?]'),
    Icebox: dim('[❄]'),
  };
  return symbols[status] ?? '[ ]';
}

/**
 * Format task title with appropriate styling based on status.
 * Not bold - the checkbox provides visual distinction.
 */
function formatTaskTitle(title: string, status: string): string {
  if (status === 'Done' || status === 'Dropped') {
    return dim(strikethrough(title));
  }
  return title;
}

/**
 * Render markdown body with syntax highlighting
 */
function renderMarkdownBody(body: string): string {
  // marked.parse returns string when async is false (default)
  let rendered = marked.parse(body) as string;

  // Workaround for marked-terminal bug: it renders GFM checkboxes twice
  // (once in listitem, once from the checkbox token). Remove duplicates.
  rendered = rendered.replace(/\[[ X]\] {1,2}\[[ xX]\] /g, (match) => {
    // Keep just the first checkbox (the one from listitem)
    return match.slice(0, 4) + ' ';
  });

  // Remove trailing newlines that marked adds
  return rendered.trimEnd();
}

/**
 * Create a boxed header for entities
 */
function formatEntityHeader(
  title: string,
  filename: string,
  status?: string,
  checkbox?: string
): string {
  // Build the content line
  const leftPart = checkbox ? `${checkbox} ${bold(title)}` : bold(title);
  const rightPart = status ? formatStatus(status) : '';
  const filenamePart = dim(filename);

  // Calculate spacing for alignment
  // Note: We need to account for ANSI codes not taking up visual space
  const contentParts = [leftPart, filenamePart, rightPart].filter(Boolean);
  const content = contentParts.join('  ');

  return (
    '\n' +
    boxen(content, {
      borderStyle: 'single',
      padding: { left: 1, right: 1, top: 0, bottom: 0 },
      borderColor: 'gray',
    })
  );
}

/**
 * Log warnings using clack's log.warn
 */
function formatWarnings(warnings: string[]): void {
  for (const warning of warnings) {
    log.warn(warning);
  }
}

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
 * Format a single task for human output (show command)
 */
function formatTask(task: Task): string {
  const lines: string[] = [];

  // Boxed header with checkbox, title, filename, status
  const checkbox = formatTaskCheckbox(task.status);
  const titleText = task.status === 'Done' || task.status === 'Dropped' ? task.title : task.title;
  lines.push(formatEntityHeader(titleText, extractFilename(task.path), task.status, checkbox));
  lines.push('');

  // Metadata
  if (task.due) lines.push(`  ${dim('Due:')} ${formatLongDate(task.due)}`);
  if (task.scheduled) lines.push(`  ${dim('Scheduled:')} ${formatLongDate(task.scheduled)}`);
  if (task.project) lines.push(`  ${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`  ${dim('Area:')} ${cyan(task.area)}`);

  // Body with markdown rendering
  if (task.body) {
    lines.push('');
    lines.push(renderMarkdownBody(task.body));
  }

  return lines.join('\n');
}

/**
 * Format a single project for human output (show command)
 */
function formatProject(project: Project): string {
  const lines: string[] = [];

  // Boxed header with title, filename, status
  lines.push(
    formatEntityHeader(project.title, extractFilename(project.path), project.status ?? undefined)
  );
  lines.push('');

  // Metadata
  if (project.startDate) lines.push(`  ${dim('Start Date:')} ${formatLongDate(project.startDate)}`);
  if (project.endDate) lines.push(`  ${dim('End Date:')} ${formatLongDate(project.endDate)}`);
  if (project.area) lines.push(`  ${dim('Area:')} ${cyan(project.area)}`);
  if (project.description) lines.push(`  ${dim('Description:')} ${project.description}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`  ${dim('Blocked By:')} ${project.blockedBy.join(', ')}`);
  }

  // Body with markdown rendering
  if (project.body) {
    lines.push('');
    lines.push(renderMarkdownBody(project.body));
  }

  return lines.join('\n');
}

/**
 * Format a single area for human output (show command)
 */
function formatArea(area: Area): string {
  const lines: string[] = [];

  // Boxed header with title, filename, status
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

  return lines.join('\n');
}

/**
 * Format a list of tasks for human output
 */
function formatTaskList(tasks: Task[]): string {
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
function formatProjectList(projects: Project[]): string {
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
function formatAreaList(areas: Area[]): string {
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

// ============================================================================
// Context Formatters
// ============================================================================

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
function formatAreaContext(result: AreaContextResultOutput): string {
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
function formatProjectContext(result: ProjectContextResultOutput): string {
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
function formatTaskContext(result: TaskContextResultOutput): string {
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
function formatVaultOverview(result: VaultOverviewResult): string {
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

// ============================================================================
// Create Result Formatters
// ============================================================================

/**
 * Format task created result for human output
 */
function formatTaskCreated(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task created`);
  lines.push('');

  // Title and status
  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${bold(task.title)}`);
  lines.push(`  ${dim(task.path)}`);

  // Key metadata
  if (task.due) lines.push(`  ${dim('Due:')} ${formatShortDate(task.due)}`);
  if (task.scheduled) lines.push(`  ${dim('Scheduled:')} ${formatShortDate(task.scheduled)}`);
  if (task.project) lines.push(`  ${dim('Project:')} ${cyan(task.project)}`);
  if (task.area) lines.push(`  ${dim('Area:')} ${cyan(task.area)}`);

  return lines.join('\n');
}

/**
 * Format project created result for human output
 */
function formatProjectCreated(project: Project): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Project created`);
  lines.push('');

  // Title and status
  lines.push(`  ${bold(project.title)}`);
  if (project.status) lines.push(`  ${formatStatus(project.status)}`);
  lines.push(`  ${dim(project.path)}`);

  // Key metadata
  if (project.area) lines.push(`  ${dim('Area:')} ${cyan(project.area)}`);
  if (project.startDate) lines.push(`  ${dim('Start:')} ${formatShortDate(project.startDate)}`);
  if (project.endDate) lines.push(`  ${dim('End:')} ${formatShortDate(project.endDate)}`);

  return lines.join('\n');
}

/**
 * Format area created result for human output
 */
function formatAreaCreated(area: Area): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Area created`);
  lines.push('');

  // Title and status
  lines.push(`  ${bold(area.title)}`);
  if (area.status) lines.push(`  ${formatStatus(area.status)}`);
  lines.push(`  ${dim(area.path)}`);

  // Key metadata
  if (area.areaType) lines.push(`  ${dim('Type:')} ${area.areaType}`);

  return lines.join('\n');
}

// ============================================================================
// Modify Result Formatters
// ============================================================================

/**
 * Format task completed result for human output
 */
function formatTaskCompletedHuman(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task completed`);
  lines.push('');

  lines.push(`  ${dim('[✓]')} ${dim(strikethrough(task.title))}`);
  lines.push(`  ${dim(task.path)}`);

  return lines.join('\n');
}

/**
 * Format task dropped result for human output
 */
function formatTaskDroppedHuman(task: Task): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${yellow('✗')} Task dropped`);
  lines.push('');

  lines.push(`  ${dim('[✗]')} ${dim(strikethrough(task.title))}`);
  lines.push(`  ${dim(task.path)}`);

  return lines.join('\n');
}

/**
 * Format task status changed result for human output
 */
function formatTaskStatusChangedHuman(task: Task, previousStatus: string): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task status changed`);
  lines.push('');

  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${task.title}`);
  lines.push(`  ${dim(task.path)}`);
  lines.push('');
  lines.push(`  ${dim('Status:')} ${previousStatus} → ${formatStatus(task.status)}`);

  return lines.join('\n');
}

/**
 * Format field changes for human output
 */
function formatFieldChangesHuman(changes: FieldChange[]): string {
  const lines: string[] = [];
  for (const change of changes) {
    if (change.oldValue && change.newValue) {
      lines.push(`  ${dim(change.field + ':')} ${change.oldValue} → ${change.newValue}`);
    } else if (change.newValue) {
      lines.push(`  ${dim(change.field + ':')} ${dim('(unset)')} → ${change.newValue}`);
    } else if (change.oldValue) {
      lines.push(`  ${dim(change.field + ':')} ${change.oldValue} → ${dim('(unset)')}`);
    }
  }
  return lines.join('\n');
}

/**
 * Format task updated result for human output
 */
function formatTaskUpdatedHuman(task: Task, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Task updated`);
  lines.push('');

  const checkbox = formatTaskCheckbox(task.status);
  lines.push(`  ${checkbox} ${task.title}`);
  lines.push(`  ${dim(task.path)}`);
  lines.push('');
  lines.push(formatFieldChangesHuman(changes));

  return lines.join('\n');
}

/**
 * Format project updated result for human output
 */
function formatProjectUpdatedHuman(project: Project, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Project updated`);
  lines.push('');

  lines.push(`  ${bold(project.title)}`);
  lines.push(`  ${dim(project.path)}`);
  lines.push('');
  lines.push(formatFieldChangesHuman(changes));

  return lines.join('\n');
}

/**
 * Format area updated result for human output
 */
function formatAreaUpdatedHuman(area: Area, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Area updated`);
  lines.push('');

  lines.push(`  ${bold(area.title)}`);
  lines.push(`  ${dim(area.path)}`);
  lines.push('');
  lines.push(formatFieldChangesHuman(changes));

  return lines.join('\n');
}

/**
 * Format archived result for human output
 */
function formatArchivedHuman(title: string, fromPath: string, toPath: string): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${green('✓')} Archived`);
  lines.push('');

  lines.push(`  ${bold(title)}`);
  lines.push(`  ${dim('From:')} ${fromPath}`);
  lines.push(`  ${dim('To:')} ${toPath}`);

  return lines.join('\n');
}

/**
 * Format batch result for human output
 */
function formatBatchResultHuman(result: BatchResult): string {
  const lines: string[] = [];
  const opName =
    result.operation === 'completed'
      ? 'Completed'
      : result.operation === 'dropped'
        ? 'Dropped'
        : result.operation === 'status-changed'
          ? 'Status changed'
          : result.operation === 'updated'
            ? 'Updated'
            : 'Archived';

  lines.push('');

  if (result.successes.length > 0) {
    lines.push(
      `${green('✓')} ${opName} ${result.successes.length} item${result.successes.length !== 1 ? 's' : ''}`
    );
    lines.push('');

    for (const success of result.successes) {
      if (success.task) {
        const checkbox = formatTaskCheckbox(success.task.status);
        lines.push(`  ${checkbox} ${success.title}`);
      } else {
        lines.push(`  ${bold(success.title)}`);
      }
      lines.push(`  ${dim(success.path)}`);
      if (success.toPath) {
        lines.push(`  ${dim('→')} ${success.toPath}`);
      }
    }
    lines.push('');
  }

  if (result.failures.length > 0) {
    lines.push(`${red('✗')} Failed: ${result.failures.length}`);
    lines.push('');

    for (const failure of result.failures) {
      lines.push(`  ${red(failure.code)}: ${failure.message}`);
      lines.push(`  ${dim(failure.path)}`);
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format dry run result for human output
 */
function formatDryRunHuman(result: DryRunResult): string {
  const lines: string[] = [];

  const opName =
    result.operation === 'create'
      ? 'would create'
      : result.operation === 'complete'
        ? 'would complete'
        : result.operation === 'drop'
          ? 'would drop'
          : result.operation === 'status'
            ? 'would update status'
            : result.operation === 'update'
              ? 'would update'
              : result.operation === 'append-body'
                ? 'would append to body'
                : 'would archive';

  lines.push('');
  lines.push(`${cyan('⊘')} Dry run: ${opName}`);
  lines.push('');

  lines.push(`  ${bold(result.title)}`);
  if (result.wouldCreate) {
    lines.push(`  ${dim(result.path)} ${dim('(would be created)')}`);
  } else {
    lines.push(`  ${dim(result.path)}`);
  }

  if (result.changes && result.changes.length > 0) {
    lines.push('');
    lines.push(formatFieldChangesHuman(result.changes));
  }

  if (result.toPath) {
    lines.push(`  ${dim('→')} ${result.toPath}`);
  }

  if (result.appendText) {
    lines.push('');
    lines.push(`  ${dim('Text to append:')}`);
    lines.push(`  ${result.appendText}`);
  }

  return lines.join('\n');
}

/**
 * Format body appended result for human output
 */
function formatBodyAppendedHuman(result: BodyAppendedResult): string {
  const lines: string[] = [];
  const entityLabel =
    result.entityType === 'task' ? 'Task' : result.entityType === 'project' ? 'Project' : 'Area';

  lines.push('');
  lines.push(`${green('✓')} ${entityLabel} body updated`);
  lines.push('');
  lines.push(`  ${bold(result.title)}`);
  lines.push(`  ${dim(result.path)}`);
  lines.push('');
  lines.push(`  ${dim('Appended:')}`);
  lines.push(`  ${result.appendedText}`);

  return lines.join('\n');
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
        return formatTaskCompletedHuman(completedResult.task);
      }
      case 'task-dropped': {
        const droppedResult = result as TaskDroppedResult;
        return formatTaskDroppedHuman(droppedResult.task);
      }
      case 'task-status-changed': {
        const statusResult = result as TaskStatusChangedResult;
        return formatTaskStatusChangedHuman(statusResult.task, statusResult.previousStatus);
      }
      case 'task-updated': {
        const updatedResult = result as TaskUpdatedResult;
        return formatTaskUpdatedHuman(updatedResult.task, updatedResult.changes);
      }
      case 'project-updated': {
        const updatedResult = result as ProjectUpdatedResult;
        return formatProjectUpdatedHuman(updatedResult.project, updatedResult.changes);
      }
      case 'area-updated': {
        const updatedResult = result as AreaUpdatedResult;
        return formatAreaUpdatedHuman(updatedResult.area, updatedResult.changes);
      }
      case 'archived': {
        const archivedResult = result as ArchivedResult;
        return formatArchivedHuman(
          archivedResult.title,
          archivedResult.fromPath,
          archivedResult.toPath
        );
      }
      case 'batch-result': {
        const batchResult = result as BatchResult;
        return formatBatchResultHuman(batchResult);
      }
      case 'dry-run': {
        const dryRunResult = result as DryRunResult;
        return formatDryRunHuman(dryRunResult);
      }
      case 'body-appended': {
        const appendedResult = result as BodyAppendedResult;
        return formatBodyAppendedHuman(appendedResult);
      }
      default:
        return dim(`[${result.type}] stub output`);
    }
  },
};
