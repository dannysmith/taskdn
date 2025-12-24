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
} from './types.ts';
import { toKebabCase } from './types.ts';
import {
  AREA_ICON,
  OVERDUE_ICON,
  DUE_TODAY_ICON,
  TASK_STATUS_EMOJI,
  getProjectStatusEmoji,
  getTaskStatusEmoji,
  formatDayWithDate,
  hoursAgo,
  truncateBody,
  collectReferences,
  buildReferenceTable,
  renderTree,
  buildAreaTree,
  calculateAreaTaskCount,
  countTasksByStatus,
  formatTaskCountShorthand,
  formatParentChain,
  type TreeNode,
} from './helpers/index.ts';

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
 * Format a task for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
function formatTaskListItem(task: Task): string {
  const lines: string[] = [];

  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);

  if (task.due) lines.push(`- **due:** ${task.due}`);
  // Per CLI spec: show project, or area if no project
  if (task.project) {
    lines.push(`- **project:** ${task.project}`);
  } else if (task.area) {
    lines.push(`- **area:** ${task.area}`);
  }

  return lines.join('\n');
}

/**
 * Format a list of tasks for AI mode
 */
function formatTaskList(tasks: Task[]): string {
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
 * Format a project for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
function formatProjectListItem(project: Project): string {
  const lines: string[] = [];

  lines.push(`### ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);

  if (project.status) {
    lines.push(`- **status:** ${toKebabCase(project.status)}`);
  }
  if (project.area) {
    lines.push(`- **area:** ${project.area}`);
  }

  return lines.join('\n');
}

/**
 * Format a list of projects for AI mode
 */
function formatProjectList(projects: Project[]): string {
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
 * Format an area for list output in AI mode (compact, no body)
 * Uses ### heading (one level below the section heading)
 */
function formatAreaListItem(area: Area): string {
  const lines: string[] = [];

  lines.push(`### ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);

  if (area.status) {
    lines.push(`- **status:** ${toKebabCase(area.status)}`);
  }
  if (area.areaType) {
    lines.push(`- **type:** ${area.areaType}`);
  }

  return lines.join('\n');
}

/**
 * Format a list of areas for AI mode
 */
function formatAreaList(areas: Area[]): string {
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

// ============================================================================
// Context Formatters
// ============================================================================

/**
 * Format a task for context output (related entity - compact, no body)
 * Uses #### heading (nested within project section)
 */
function formatContextTask(task: Task): string {
  const lines: string[] = [];

  lines.push(`#### Task: ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);
  if (task.project) lines.push(`- **project:** ${task.project}`);
  if (task.due) lines.push(`- **due:** ${task.due}`);

  return lines.join('\n');
}

/**
 * Format a project for context output (related entity - compact, no body)
 * Uses ### heading
 */
function formatContextProject(project: Project, taskCount: number): string {
  const lines: string[] = [];

  lines.push(`### Project: ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);
  if (project.status) {
    lines.push(`- **status:** ${toKebabCase(project.status)}`);
  }
  lines.push(`- **tasks:** ${taskCount}`);

  return lines.join('\n');
}

/**
 * Format an area for context output (related entity - compact, no body)
 * Uses ### heading
 */
function formatContextArea(area: Area): string {
  const lines: string[] = [];

  lines.push(`### ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);
  if (area.status) {
    lines.push(`- **status:** ${toKebabCase(area.status)}`);
  }

  return lines.join('\n');
}

/**
 * Format area context result for AI mode
 * Area (primary) + Projects with their Tasks
 */
function formatAreaContext(result: AreaContextResultOutput): string {
  const lines: string[] = [];
  const area = result.area;

  // Primary entity: Area with full details
  lines.push(`## Area: ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);
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

  // Projects section
  lines.push('');
  lines.push(`## Projects in ${area.title} (${result.projects.length})`);
  lines.push('');

  if (result.projects.length === 0) {
    lines.push('No projects in this area.');
  } else {
    for (const project of result.projects) {
      const projectTasks = result.projectTasks.get(project.path) ?? [];
      lines.push(formatContextProject(project, projectTasks.length));
      lines.push('');

      // Tasks under this project
      for (const task of projectTasks) {
        lines.push(formatContextTask(task));
        lines.push('');
      }
    }
  }

  // Direct tasks (tasks in area but not in any project)
  if (result.directTasks.length > 0) {
    lines.push(`## Tasks Directly in Area: ${area.title} (${result.directTasks.length})`);
    lines.push('');

    for (const task of result.directTasks) {
      lines.push(formatContextTask(task));
      lines.push('');
    }
  }

  // Warnings if any
  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format project context result for AI mode
 * Project (primary) + Parent Area + Tasks
 */
function formatProjectContext(result: ProjectContextResultOutput): string {
  const lines: string[] = [];
  const project = result.project;

  // Primary entity: Project with full details
  lines.push(`## Project: ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);
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

  if (project.body) {
    lines.push('');
    lines.push('### Body');
    lines.push('');
    lines.push(project.body);
  }

  // Parent area section
  if (result.area) {
    lines.push('');
    lines.push('## Parent Area');
    lines.push('');
    lines.push(formatContextArea(result.area));
  }

  // Tasks section
  lines.push('');
  lines.push(`## Tasks in ${project.title} (${result.tasks.length})`);
  lines.push('');

  if (result.tasks.length === 0) {
    lines.push('No tasks in this project.');
  } else {
    for (const task of result.tasks) {
      // Use ### for tasks in project context (not nested under projects)
      const taskLines: string[] = [];
      taskLines.push(`### ${task.title}`);
      taskLines.push('');
      taskLines.push(`- **path:** ${task.path}`);
      taskLines.push(`- **status:** ${toKebabCase(task.status)}`);
      if (task.due) taskLines.push(`- **due:** ${task.due}`);

      lines.push(taskLines.join('\n'));
      lines.push('');
    }
  }

  // Warnings if any
  if (result.warnings.length > 0) {
    lines.push('## Warnings');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format task context result for AI mode
 * Task (primary) + Parent Project + Parent Area
 */
function formatTaskContext(result: TaskContextResultOutput): string {
  const lines: string[] = [];
  const task = result.task;

  // Primary entity: Task with full details
  lines.push(`## Task: ${task.title}`);
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

  // Parent project section
  if (result.project) {
    lines.push('');
    lines.push('## Parent Project');
    lines.push('');

    const project = result.project;
    const projectLines: string[] = [];
    projectLines.push(`### ${project.title}`);
    projectLines.push('');
    projectLines.push(`- **path:** ${project.path}`);
    if (project.status) {
      projectLines.push(`- **status:** ${toKebabCase(project.status)}`);
    }

    lines.push(projectLines.join('\n'));
  }

  // Parent area section
  if (result.area) {
    lines.push('');
    lines.push('## Parent Area');
    lines.push('');
    lines.push(formatContextArea(result.area));
  }

  // Warnings if any
  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('## Warnings');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return lines.join('\n').trimEnd();
}

// ============================================================================
// Vault Overview Formatter (ai-context.md Section 4)
// ============================================================================

/**
 * Helper: Check if task is in-progress
 */
function isInProgress(task: Task): boolean {
  const status = task.status.toLowerCase();
  return status === 'inprogress' || status === 'in-progress';
}

/**
 * Helper: Get parent chain for a task
 */
function getTaskParentChain(
  task: Task,
  result: VaultOverviewResult
): { project: Project | null; area: Area | null } {
  let project: Project | null = null;
  let area: Area | null = null;

  // Find project
  if (task.project) {
    const projectRef = task.project.replace(/^\[\[|\]\]$/g, '').toLowerCase();
    project = result.projects.find((p) => p.title.toLowerCase() === projectRef) ?? null;
  }

  // Find area (via project or direct)
  if (project && project.area) {
    const areaRef = project.area.replace(/^\[\[|\]\]$/g, '').toLowerCase();
    area = result.areas.find((a) => a.title.toLowerCase() === areaRef) ?? null;
  } else if (task.area) {
    const areaRef = task.area.replace(/^\[\[|\]\]$/g, '').toLowerCase();
    area = result.areas.find((a) => a.title.toLowerCase() === areaRef) ?? null;
  }

  return { project, area };
}

/**
 * Format the stats header line
 */
function formatStatsHeader(result: VaultOverviewResult): string {
  const parts: string[] = [];
  parts.push(`${result.stats.areaCount} area${result.stats.areaCount !== 1 ? 's' : ''}`);
  parts.push(
    `${result.stats.projectCount} active project${result.stats.projectCount !== 1 ? 's' : ''}`
  );
  parts.push(`${result.stats.taskCount} active task${result.stats.taskCount !== 1 ? 's' : ''}`);

  if (result.stats.overdueCount > 0) {
    parts.push(`${OVERDUE_ICON} ${result.stats.overdueCount} overdue`);
  }
  if (result.stats.dueTodayCount > 0) {
    parts.push(`${DUE_TODAY_ICON} ${result.stats.dueTodayCount} due today`);
  }
  if (result.stats.inProgressCount > 0) {
    parts.push(`${TASK_STATUS_EMOJI['in-progress']} ${result.stats.inProgressCount} in-progress`);
  }

  return `**Stats:** ${parts.join(' · ')}`;
}

/**
 * Format structure section - tree view of areas → projects → in-progress tasks
 */
function formatStructureSection(result: VaultOverviewResult): string {
  const lines: string[] = [];
  lines.push('## Structure');
  lines.push('');

  // Areas with their projects
  for (const area of result.areas) {
    const areaProjects = result.areaProjects.get(area.path) ?? [];
    const directTasks = result.directAreaTasks.get(area.path) ?? [];

    // Build per-project task maps
    const projectTasksForArea = new Map<string, Task[]>();
    for (const project of areaProjects) {
      projectTasksForArea.set(project.path, result.projectTasks.get(project.path) ?? []);
    }

    // Calculate area task count
    const taskCount = calculateAreaTaskCount(projectTasksForArea, directTasks);

    // Area header
    lines.push(`### ${AREA_ICON} ${area.title}`);
    lines.push('');

    if (taskCount.total > 0) {
      if (taskCount.direct > 0 && taskCount.viaProjects > 0) {
        lines.push(
          `Tasks: ${taskCount.total} total (${taskCount.direct} direct, ${taskCount.viaProjects} via projects)`
        );
      } else if (taskCount.direct > 0) {
        lines.push(`Tasks: ${taskCount.total} total (${taskCount.direct} direct)`);
      } else {
        lines.push(`Tasks: ${taskCount.total} total`);
      }
    } else {
      lines.push('Tasks: 0');
    }

    // Build and render tree
    const tree = buildAreaTree(areaProjects, projectTasksForArea, directTasks);
    const treeLines = renderTree(tree);
    if (treeLines.length > 0) {
      lines.push(...treeLines);
    }

    lines.push('');
  }

  // Orphan projects (projects with no area)
  if (result.orphanProjects.length > 0) {
    lines.push('### Projects with no Area');
    lines.push('');

    const orphanTree: TreeNode = { content: '', children: [] };
    for (const project of result.orphanProjects) {
      const tasks = result.projectTasks.get(project.path) ?? [];
      const counts = countTasksByStatus(tasks);
      const shorthand = formatTaskCountShorthand(counts);

      // Format: {emoji} {title} [{status}] — {count} tasks ({shorthand})
      const emoji = getProjectStatusEmoji(project.status);
      const statusBracket = project.status ? `[${toKebabCase(project.status)}]` : '';
      const parts: string[] = [];
      if (emoji) parts.push(emoji);
      parts.push(project.title);
      if (statusBracket) parts.push(statusBracket);
      parts.push('—');
      parts.push(`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`);
      if (shorthand) parts.push(shorthand);

      orphanTree.children.push({ content: parts.join(' '), children: [] });
    }

    const treeLines = renderTree(orphanTree);
    lines.push(...treeLines);
    lines.push('');
  }

  // Orphan tasks (tasks with no project or area)
  if (result.orphanTasks.length > 0) {
    lines.push('### Tasks with no Project or Area');
    lines.push('');

    const counts = countTasksByStatus(result.orphanTasks);
    const shorthand = formatTaskCountShorthand(counts);
    lines.push(`Tasks: ${result.orphanTasks.length} total ${shorthand}`);

    // Build tree with all orphan tasks using proper tree connectors
    const orphanTaskTree: TreeNode = { content: '', children: [] };
    for (const task of result.orphanTasks) {
      const emoji = getTaskStatusEmoji(task.status);
      const content = emoji ? `${emoji} ${task.title}` : task.title;
      orphanTaskTree.children.push({ content, children: [] });
    }

    const treeLines = renderTree(orphanTaskTree);
    lines.push(...treeLines);
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format timeline section
 */
function formatTimelineSection(result: VaultOverviewResult): string {
  const lines: string[] = [];
  lines.push('## Timeline');
  lines.push('');

  const { timeline } = result;

  // Overdue
  if (timeline.overdue.length > 0) {
    lines.push(`### Overdue (${timeline.overdue.length})`);
    lines.push('');
    for (const task of timeline.overdue) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      lines.push(`- **${task.title}** — due ${task.due} — ${parentChain}`);
    }
    lines.push('');
  }

  // Due Today
  if (timeline.dueToday.length > 0) {
    lines.push(`### Due Today (${timeline.dueToday.length})`);
    lines.push('');
    for (const task of timeline.dueToday) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      lines.push(`- **${task.title}** — ${parentChain}`);
    }
    lines.push('');
  }

  // Scheduled Today
  if (timeline.scheduledToday.length > 0) {
    lines.push(`### Scheduled Today (${timeline.scheduledToday.length})`);
    lines.push('');
    for (const task of timeline.scheduledToday) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      lines.push(`- **${task.title}** — ${parentChain}`);
    }
    lines.push('');
  }

  // Newly Actionable Today
  if (timeline.newlyActionable.length > 0) {
    lines.push(`### Newly Actionable Today (${timeline.newlyActionable.length})`);
    lines.push('');
    lines.push('_defer-until = today_');
    lines.push('');
    for (const task of timeline.newlyActionable) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      lines.push(`- **${task.title}** — ${parentChain}`);
    }
    lines.push('');
  }

  // Blocked
  if (timeline.blocked.length > 0) {
    lines.push(`### Blocked (${timeline.blocked.length})`);
    lines.push('');
    for (const task of timeline.blocked) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      lines.push(`- **${task.title}** — ${parentChain}`);
    }
    lines.push('');
  }

  // Scheduled This Week (grouped by date)
  if (timeline.scheduledThisWeek.size > 0) {
    lines.push('### Scheduled This Week');
    lines.push('');

    // Sort dates
    const sortedDates = [...timeline.scheduledThisWeek.keys()].sort();

    for (const date of sortedDates) {
      const tasks = timeline.scheduledThisWeek.get(date) ?? [];
      const dayLabel = formatDayWithDate(date);
      lines.push(`**${dayLabel}**`);
      lines.push('');
      for (const task of tasks) {
        const { project, area } = getTaskParentChain(task, result);
        const parentChain = formatParentChain(task, project, area);
        lines.push(`- ${task.title} — ${parentChain}`);
      }
      lines.push('');
    }
  }

  // Recently Modified (last 24h, excluding above)
  if (timeline.recentlyModified.length > 0) {
    lines.push(`### Recently Modified (${timeline.recentlyModified.length})`);
    lines.push('');
    lines.push('_Last 24h, not shown above_');
    lines.push('');
    for (const task of timeline.recentlyModified) {
      const { project, area } = getTaskParentChain(task, result);
      const parentChain = formatParentChain(task, project, area);
      const hours = task.updatedAt ? hoursAgo(task.updatedAt) : 0;
      lines.push(`- **${task.title}** — ${parentChain} — ${hours}h ago`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format in-progress tasks section with full details
 */
function formatInProgressTasksSection(result: VaultOverviewResult): string {
  const inProgressTasks = result.tasks.filter(isInProgress);

  if (inProgressTasks.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push(`## In-Progress Tasks (${inProgressTasks.length})`);
  lines.push('');

  for (const task of inProgressTasks) {
    const { project, area } = getTaskParentChain(task, result);
    const parentChain = formatParentChain(task, project, area);

    lines.push(`### ${task.title}`);
    lines.push('');

    // Parent chain + due date
    const metaParts: string[] = [parentChain];
    if (task.due) {
      metaParts.push(`due ${task.due}`);
    }
    lines.push(metaParts.join(' · '));
    lines.push('');

    // Body excerpt
    const excerpt = truncateBody(task.body);
    if (excerpt) {
      lines.push(excerpt);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format excerpts section for active areas and non-paused projects
 */
function formatExcerptsSection(result: VaultOverviewResult): string {
  const lines: string[] = [];
  lines.push('## Excerpts');
  lines.push('');
  lines.push('_Active areas and projects (excludes archived areas, paused/done projects)_');
  lines.push('');

  // Area excerpts
  for (const area of result.areas) {
    const excerpt = truncateBody(area.body);
    if (excerpt) {
      lines.push(`### ${area.title} (Area)`);
      lines.push('');
      // Format as blockquote
      const blockquote = excerpt
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      lines.push(blockquote);
      lines.push('');
    }
  }

  // Project excerpts (exclude paused)
  for (const project of result.projects) {
    const status = project.status?.toLowerCase();
    if (status === 'paused') continue;

    const excerpt = truncateBody(project.body);
    if (excerpt) {
      lines.push(`### ${project.title} (Project)`);
      lines.push('');
      const blockquote = excerpt
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      lines.push(blockquote);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format reference section
 */
function formatReferenceSection(result: VaultOverviewResult): string {
  const references = collectReferences({
    areas: result.areas,
    projects: result.projects,
    tasks: result.tasks,
  });

  if (references.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('## Reference');
  lines.push('');
  lines.push(buildReferenceTable(references));

  return lines.join('\n');
}

/**
 * Format vault overview result for AI mode
 * Per ai-context.md Section 4
 */
function formatVaultOverview(result: VaultOverviewResult): string {
  const sections: string[] = [];

  // Header
  sections.push('# Overview');
  sections.push('');
  sections.push(formatStatsHeader(result));
  sections.push('_Excludes: done/dropped/icebox tasks, done projects, archived areas_');

  // Structure
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push(formatStructureSection(result));

  // Timeline (only non-empty sections)
  const timelineSection = formatTimelineSection(result);
  if (timelineSection.split('\n').length > 3) {
    // More than just header
    sections.push('---');
    sections.push('');
    sections.push(timelineSection);
  }

  // In-Progress Tasks
  const inProgressSection = formatInProgressTasksSection(result);
  if (inProgressSection) {
    sections.push('---');
    sections.push('');
    sections.push(inProgressSection);
  }

  // Excerpts
  const excerptsSection = formatExcerptsSection(result);
  if (excerptsSection.split('\n').length > 4) {
    // More than just header
    sections.push('---');
    sections.push('');
    sections.push(excerptsSection);
  }

  // Reference
  const referenceSection = formatReferenceSection(result);
  if (referenceSection) {
    sections.push('---');
    sections.push('');
    sections.push(referenceSection);
  }

  return sections.join('\n').trimEnd();
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
      default:
        return `## ${result.type}\n\n(stub output)`;
    }
  },
};
