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
import {
  AREA_ICON,
  OVERDUE_ICON,
  DUE_TODAY_ICON,
  TASK_STATUS_EMOJI,
  getProjectStatusEmoji,
  getTaskStatusEmoji,
  getToday,
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
  isInProgress,
  formatBlockquoteExcerpt,
  toKebabCase,
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

  // Required fields per S1 spec Section 3.3
  lines.push(`- **created-at:** ${task.createdAt || '(missing)'}`);
  lines.push(`- **updated-at:** ${task.updatedAt || '(missing)'}`);

  // Optional fields - only show if present
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);
  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.deferUntil) lines.push(`- **defer-until:** ${task.deferUntil}`);
  if (task.project) lines.push(`- **project:** ${task.project}`);
  if (task.area) lines.push(`- **area:** ${task.area}`);

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
  if (project.description) lines.push(`- **description:** ${project.description}`);
  if (project.startDate) lines.push(`- **start-date:** ${project.startDate}`);
  if (project.endDate) lines.push(`- **end-date:** ${project.endDate}`);
  if (project.uniqueId) lines.push(`- **unique-id:** ${project.uniqueId}`);
  if (project.blockedBy && project.blockedBy.length > 0) {
    lines.push(`- **blocked-by:** ${project.blockedBy.join(', ')}`);
  }

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

  // Required fields per S1 spec Section 3.3
  lines.push(`- **created-at:** ${task.createdAt || '(missing)'}`);
  lines.push(`- **updated-at:** ${task.updatedAt || '(missing)'}`);

  // Optional fields - show if present
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);
  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.deferUntil) lines.push(`- **defer-until:** ${task.deferUntil}`);

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
 * Format area context result for AI mode
 * Per ai-context.md Section 5
 */
function formatAreaContext(result: AreaContextResultOutput): string {
  const sections: string[] = [];
  const area = result.area;

  // Header: # Area: {name}
  sections.push(`# Area: ${area.title}`);
  sections.push('');

  // Stats header
  const statsParts: string[] = [];
  statsParts.push(
    `${result.stats.projectCount} project${result.stats.projectCount !== 1 ? 's' : ''}`
  );
  statsParts.push(
    `${result.stats.activeTaskCount} active task${result.stats.activeTaskCount !== 1 ? 's' : ''}`
  );
  if (result.stats.overdueCount > 0) {
    statsParts.push(`${OVERDUE_ICON} ${result.stats.overdueCount} overdue`);
  }
  if (result.stats.dueTodayCount > 0) {
    statsParts.push(`${DUE_TODAY_ICON} ${result.stats.dueTodayCount} due today`);
  }
  if (result.stats.inProgressCount > 0) {
    statsParts.push(
      `${TASK_STATUS_EMOJI['in-progress']} ${result.stats.inProgressCount} in-progress`
    );
  }
  sections.push(`**Stats:** ${statsParts.join(' · ')}`);

  // Area Details section
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('## Area Details');
  sections.push('');

  // Metadata table
  const metadataRows: [string, string][] = [];
  if (area.status) metadataRows.push(['status', toKebabCase(area.status)]);
  if (area.areaType) metadataRows.push(['type', area.areaType]);
  if (area.description) metadataRows.push(['description', area.description]);
  metadataRows.push(['path', area.path]);

  sections.push('| Field | Value |');
  sections.push('| ----- | ----- |');
  for (const [key, value] of metadataRows) {
    sections.push(`| ${key} | ${value} |`);
  }

  // Body (full, no truncation for primary entity)
  if (area.body) {
    sections.push('');
    sections.push('### Body');
    sections.push('');
    sections.push(area.body);
  }

  // Projects by Status section
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push(`## Projects in ${area.title} (${result.projects.length})`);
  sections.push('');

  const { projectsByStatus, projectTasks } = result;

  // Helper to format a project group
  const formatProjectGroup = (groupName: string, projects: Project[]): string[] => {
    const groupLines: string[] = [];
    groupLines.push(`### ${groupName} (${projects.length})`);
    groupLines.push('');

    if (projects.length === 0) {
      groupLines.push('_None_');
    } else {
      for (const project of projects) {
        const tasks = projectTasks.get(project.path) ?? [];

        if (groupName === 'Done') {
          // Done projects: just title + completion date
          const completionInfo = project.endDate ? ` — completed ${project.endDate}` : '';
          groupLines.push(`✅ ${project.title} [done]${completionInfo}`);
        } else {
          // Active projects: tree structure with task counts
          const counts = countTasksByStatus(tasks);
          const shorthand = formatTaskCountShorthand(counts);
          const emoji = getProjectStatusEmoji(project.status);
          const statusBracket = project.status ? `[${toKebabCase(project.status)}]` : '';

          const parts: string[] = [];
          if (emoji) parts.push(emoji);
          parts.push(project.title);
          if (statusBracket) parts.push(statusBracket);
          parts.push('—');
          parts.push(`${tasks.length} task${tasks.length !== 1 ? 's' : ''}`);
          if (shorthand) parts.push(shorthand);

          groupLines.push(parts.join(' '));

          // Show in-progress tasks inline under the project
          const inProgressTasks = tasks.filter(isInProgress);
          inProgressTasks.forEach((task, i) => {
            const isLast = i === inProgressTasks.length - 1;
            const prefix = isLast ? '└── ' : '├── ';
            groupLines.push(`${prefix}▶️ ${task.title}`);
          });
        }
      }
    }
    groupLines.push('');
    return groupLines;
  };

  // Format each status group
  sections.push(...formatProjectGroup('In-Progress', projectsByStatus.inProgress));
  sections.push(...formatProjectGroup('Ready', projectsByStatus.ready));
  sections.push(...formatProjectGroup('Planning', projectsByStatus.planning));
  sections.push(...formatProjectGroup('Blocked', projectsByStatus.blocked));
  sections.push(...formatProjectGroup('Paused', projectsByStatus.paused));
  sections.push(...formatProjectGroup('Done', projectsByStatus.done));

  // Timeline section (scoped to this area)
  sections.push('---');
  sections.push('');
  sections.push('## Timeline');
  sections.push('');
  sections.push('_Scoped to tasks in ' + area.title + ' area_');
  sections.push('');

  const { timeline } = result;

  // Helper to find parent project for a task
  const getTaskProjectName = (task: Task): string => {
    if (task.project) {
      return task.project.replace(/^\[\[|\]\]$/g, '');
    }
    return '(direct)';
  };

  // Overdue
  sections.push(`### Overdue (${timeline.overdue.length})`);
  sections.push('');
  if (timeline.overdue.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.overdue) {
      sections.push(`- **${task.title}** — due ${task.due} — ${getTaskProjectName(task)}`);
    }
  }
  sections.push('');

  // Due Today
  sections.push(`### Due Today (${timeline.dueToday.length})`);
  sections.push('');
  if (timeline.dueToday.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.dueToday) {
      sections.push(`- **${task.title}** — ${getTaskProjectName(task)}`);
    }
  }
  sections.push('');

  // Scheduled Today
  sections.push(`### Scheduled Today (${timeline.scheduledToday.length})`);
  sections.push('');
  if (timeline.scheduledToday.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.scheduledToday) {
      sections.push(`- **${task.title}** — ${getTaskProjectName(task)}`);
    }
  }
  sections.push('');

  // Newly Actionable Today
  sections.push(`### Newly Actionable Today (${timeline.newlyActionable.length})`);
  sections.push('');
  if (timeline.newlyActionable.length === 0) {
    sections.push('_None_');
  } else {
    sections.push('_defer-until = today_');
    sections.push('');
    for (const task of timeline.newlyActionable) {
      sections.push(`- **${task.title}** — ${getTaskProjectName(task)}`);
    }
  }
  sections.push('');

  // Blocked
  sections.push(`### Blocked (${timeline.blocked.length})`);
  sections.push('');
  if (timeline.blocked.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.blocked) {
      sections.push(`- **${task.title}** — ${getTaskProjectName(task)}`);
    }
  }
  sections.push('');

  // Scheduled This Week
  if (timeline.scheduledThisWeek.size > 0) {
    sections.push('### Scheduled This Week');
    sections.push('');

    const sortedDates = [...timeline.scheduledThisWeek.keys()].sort();
    for (const date of sortedDates) {
      const tasks = timeline.scheduledThisWeek.get(date) ?? [];
      const dayLabel = formatDayWithDate(date);
      sections.push(`**${dayLabel}**`);
      sections.push('');
      for (const task of tasks) {
        sections.push(`- ${task.title} — ${getTaskProjectName(task)}`);
      }
      sections.push('');
    }
  }

  // In-Progress Tasks section (full details)
  const allTasks = [...result.directTasks];
  for (const tasks of projectTasks.values()) {
    allTasks.push(...tasks);
  }
  const inProgressTasks = allTasks.filter(isInProgress);

  if (inProgressTasks.length > 0) {
    sections.push('---');
    sections.push('');
    sections.push(`## In-Progress Tasks (${inProgressTasks.length})`);
    sections.push('');

    for (const task of inProgressTasks) {
      const projectName = getTaskProjectName(task);

      sections.push(`### ${task.title}`);
      sections.push('');

      // Parent chain + due date
      const metaParts: string[] = [projectName];
      if (task.due) {
        metaParts.push(`due ${task.due}`);
      }
      sections.push(metaParts.join(' · '));
      sections.push('');

      // Body excerpt
      const excerpt = truncateBody(task.body);
      if (excerpt) {
        sections.push(excerpt);
        sections.push('');
      }
    }
  }

  // Ready Tasks section (capped at 10)
  const readyTasks = allTasks.filter((t) => t.status.toLowerCase() === 'ready');

  if (readyTasks.length > 0) {
    sections.push('---');
    sections.push('');
    const showCount = Math.min(readyTasks.length, 10);
    if (readyTasks.length > 10) {
      sections.push(`## Ready Tasks (showing ${showCount} of ${readyTasks.length})`);
    } else {
      sections.push(`## Ready Tasks (${readyTasks.length})`);
    }
    sections.push('');

    for (const task of readyTasks.slice(0, showCount)) {
      sections.push(`- ${task.title} — ${getTaskProjectName(task)}`);
    }
    sections.push('');
  }

  // Project Excerpts section (from in-progress, ready, planning, blocked projects only)
  const projectsForExcerpts = [
    ...projectsByStatus.inProgress,
    ...projectsByStatus.ready,
    ...projectsByStatus.planning,
    ...projectsByStatus.blocked,
  ];

  const projectsWithExcerpts = projectsForExcerpts.filter((p) => p.body && p.body.trim());

  if (projectsWithExcerpts.length > 0) {
    sections.push('---');
    sections.push('');
    sections.push('## Project Excerpts');
    sections.push('');
    sections.push('_From in-progress, ready, planning, and blocked projects_');
    sections.push('');

    for (const project of projectsWithExcerpts) {
      const blockquote = formatBlockquoteExcerpt(project.body);
      if (blockquote) {
        sections.push(`### ${project.title}`);
        sections.push('');
        sections.push(blockquote);
        sections.push('');
      }
    }
  }

  // Reference section
  const references = collectReferences({
    areas: [area],
    projects: result.projects,
    tasks: allTasks,
  });

  if (references.length > 0) {
    sections.push('---');
    sections.push('');
    sections.push('## Reference');
    sections.push('');
    sections.push(buildReferenceTable(references));
  }

  return sections.join('\n').trimEnd();
}

/**
 * Format project context result for AI mode
 * Per ai-context.md Section 6
 */
function formatProjectContext(result: ProjectContextResultOutput): string {
  const sections: string[] = [];
  const project = result.project;

  // Header: # Project: {name}
  sections.push(`# Project: ${project.title}`);
  sections.push('');

  // Stats header (includes blocked count per Section 2.6)
  const statsParts: string[] = [];
  statsParts.push(
    `${result.stats.activeTaskCount} active task${result.stats.activeTaskCount !== 1 ? 's' : ''}`
  );
  if (result.stats.overdueCount > 0) {
    statsParts.push(`${OVERDUE_ICON} ${result.stats.overdueCount} overdue`);
  }
  if (result.stats.dueTodayCount > 0) {
    statsParts.push(`${DUE_TODAY_ICON} ${result.stats.dueTodayCount} due today`);
  }
  if (result.stats.inProgressCount > 0) {
    statsParts.push(
      `${TASK_STATUS_EMOJI['in-progress']} ${result.stats.inProgressCount} in-progress`
    );
  }
  if (result.stats.blockedCount > 0) {
    statsParts.push(`🚫 ${result.stats.blockedCount} blocked`);
  }
  sections.push(`**Stats:** ${statsParts.join(' · ')}`);

  // Project Details section
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('## Project Details');
  sections.push('');

  // Metadata table
  const metadataRows: [string, string][] = [];
  if (project.status) metadataRows.push(['status', toKebabCase(project.status)]);
  if (project.area) metadataRows.push(['area', project.area]);
  if (project.startDate) metadataRows.push(['start-date', project.startDate]);
  if (project.endDate) metadataRows.push(['end-date', project.endDate]);
  if (project.description) metadataRows.push(['description', project.description]);
  metadataRows.push(['path', project.path]);

  sections.push('| Field | Value |');
  sections.push('| ----- | ----- |');
  for (const [key, value] of metadataRows) {
    sections.push(`| ${key} | ${value} |`);
  }

  // Body (full, no truncation for primary entity)
  if (project.body) {
    sections.push('');
    sections.push('### Body');
    sections.push('');
    sections.push(project.body);
  }

  // Parent Area section
  sections.push('');
  sections.push('---');
  sections.push('');

  if (result.area) {
    const area = result.area;
    sections.push(`## Parent Area: ${area.title}`);
    sections.push('');

    // Area metadata table
    const areaRows: [string, string][] = [];
    if (area.status) areaRows.push(['status', toKebabCase(area.status)]);
    if (area.areaType) areaRows.push(['type', area.areaType]);
    areaRows.push(['path', area.path]);

    sections.push('| Field | Value |');
    sections.push('| ----- | ----- |');
    for (const [key, value] of areaRows) {
      sections.push(`| ${key} | ${value} |`);
    }

    // Area excerpt (blockquote format)
    const blockquote = formatBlockquoteExcerpt(area.body);
    if (blockquote) {
      sections.push('');
      sections.push(blockquote);
    }
  } else {
    sections.push('## Parent Area');
    sections.push('');
    sections.push('_None_');
  }

  // Timeline section (scoped to this project)
  sections.push('');
  sections.push('---');
  sections.push('');
  sections.push('## Timeline');
  sections.push('');
  sections.push(`_Scoped to tasks in ${project.title}_`);
  sections.push('');

  const { timeline } = result;

  // Overdue
  sections.push(`### Overdue (${timeline.overdue.length})`);
  sections.push('');
  if (timeline.overdue.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.overdue) {
      sections.push(`- **${task.title}** — due ${task.due}`);
    }
  }
  sections.push('');

  // Due Today
  sections.push(`### Due Today (${timeline.dueToday.length})`);
  sections.push('');
  if (timeline.dueToday.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.dueToday) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Scheduled Today
  sections.push(`### Scheduled Today (${timeline.scheduledToday.length})`);
  sections.push('');
  if (timeline.scheduledToday.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.scheduledToday) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Newly Actionable Today
  sections.push(`### Newly Actionable Today (${timeline.newlyActionable.length})`);
  sections.push('');
  if (timeline.newlyActionable.length === 0) {
    sections.push('_None_');
  } else {
    sections.push('_defer-until = today_');
    sections.push('');
    for (const task of timeline.newlyActionable) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Blocked
  sections.push(`### Blocked (${timeline.blocked.length})`);
  sections.push('');
  if (timeline.blocked.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of timeline.blocked) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Scheduled This Week
  if (timeline.scheduledThisWeek.size > 0) {
    sections.push('### Scheduled This Week');
    sections.push('');

    const sortedDates = [...timeline.scheduledThisWeek.keys()].sort();
    for (const date of sortedDates) {
      const tasks = timeline.scheduledThisWeek.get(date) ?? [];
      const dayLabel = formatDayWithDate(date);
      sections.push(`**${dayLabel}**`);
      sections.push('');
      for (const task of tasks) {
        sections.push(`- ${task.title}`);
      }
      sections.push('');
    }
  }

  // Tasks by Status section
  sections.push('---');
  sections.push('');
  sections.push('## Tasks by Status');
  sections.push('');

  const { tasksByStatus } = result;

  // In-Progress (full detail with body excerpt)
  sections.push(`### In-Progress (${tasksByStatus.inProgress.length})`);
  sections.push('');
  if (tasksByStatus.inProgress.length === 0) {
    sections.push('_None_');
    sections.push('');
  } else {
    for (const task of tasksByStatus.inProgress) {
      sections.push(`#### ${task.title}`);
      sections.push('');
      if (task.due) {
        sections.push(`due ${task.due}`);
        sections.push('');
      }
      const excerpt = truncateBody(task.body);
      if (excerpt) {
        sections.push(excerpt);
        sections.push('');
      }
    }
  }

  // Blocked (title only - block reason would need to be extracted from body)
  sections.push(`### Blocked (${tasksByStatus.blocked.length})`);
  sections.push('');
  if (tasksByStatus.blocked.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of tasksByStatus.blocked) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Ready (title + due date if set)
  sections.push(`### Ready (${tasksByStatus.ready.length})`);
  sections.push('');
  if (tasksByStatus.ready.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of tasksByStatus.ready) {
      const dueInfo = task.due ? ` — due ${task.due}` : '';
      sections.push(`- **${task.title}**${dueInfo}`);
    }
  }
  sections.push('');

  // Inbox (title only)
  sections.push(`### Inbox (${tasksByStatus.inbox.length})`);
  sections.push('');
  if (tasksByStatus.inbox.length === 0) {
    sections.push('_None_');
  } else {
    for (const task of tasksByStatus.inbox) {
      sections.push(`- **${task.title}**`);
    }
  }
  sections.push('');

  // Reference section
  const references = collectReferences({
    areas: result.area ? [result.area] : [],
    projects: [project],
    tasks: result.tasks,
  });

  if (references.length > 0) {
    sections.push('---');
    sections.push('');
    sections.push('## Reference');
    sections.push('');
    sections.push(buildReferenceTable(references));
  }

  return sections.join('\n').trimEnd();
}

/**
 * Determine the alert banner for a task.
 * Per ai-context.md Section 7, show most urgent first:
 * 1. Overdue → ⚠️ OVERDUE — due {date}
 * 2. Due today → 📅 DUE TODAY
 * 3. Scheduled today → 📆 SCHEDULED TODAY
 * 4. Newly actionable → 🔓 NEWLY ACTIONABLE — deferred until today
 */
function getTaskAlertBanner(task: Task): string | null {
  const today = getToday();

  // Check overdue (due < today)
  if (task.due && task.due < today) {
    return `⚠️ OVERDUE — due ${task.due}`;
  }

  // Check due today
  if (task.due && task.due === today) {
    return '📅 DUE TODAY';
  }

  // Check scheduled today
  if (task.scheduled && task.scheduled === today) {
    return '📆 SCHEDULED TODAY';
  }

  // Check newly actionable (defer-until = today)
  if (task.deferUntil && task.deferUntil === today) {
    return '🔓 NEWLY ACTIONABLE — deferred until today';
  }

  return null;
}

/**
 * Format task context result for AI mode.
 * Per ai-context.md Section 7:
 * - Alert banner (if applicable)
 * - Task details (metadata table + full body)
 * - Parent Project (summary table + excerpt)
 * - Parent Area (summary table + excerpt, with relationship clarity)
 * - Reference table
 */
function formatTaskContext(result: TaskContextResultOutput): string {
  const sections: string[] = [];
  const task = result.task;

  // Header: # Task: {name}
  sections.push(`# Task: ${task.title}`);
  sections.push('');

  // Alert banner (if applicable)
  const alertBanner = getTaskAlertBanner(task);
  if (alertBanner) {
    sections.push(alertBanner);
    sections.push('');
  }

  // Task Details section
  sections.push('---');
  sections.push('');
  sections.push('## Task Details');
  sections.push('');

  // Metadata table
  const metadataRows: [string, string | undefined][] = [];
  metadataRows.push(['status', toKebabCase(task.status)]);
  if (task.createdAt) metadataRows.push(['created-at', task.createdAt]);
  if (task.updatedAt) metadataRows.push(['updated-at', task.updatedAt]);
  if (task.due) metadataRows.push(['due', task.due]);
  if (task.scheduled) metadataRows.push(['scheduled', task.scheduled]);
  if (task.deferUntil) metadataRows.push(['defer-until', task.deferUntil]);
  // Show project as wikilink reference if present
  if (task.project) metadataRows.push(['project', task.project]);
  // Show area as wikilink reference if present (only if direct, not via project)
  if (task.area && !task.project) metadataRows.push(['area', task.area]);
  metadataRows.push(['path', task.path]);

  sections.push('| Field | Value |');
  sections.push('| ----- | ----- |');
  for (const [key, value] of metadataRows) {
    if (value !== undefined) {
      sections.push(`| ${key} | ${value} |`);
    }
  }

  // Body (full, no truncation for primary entity)
  if (task.body) {
    sections.push('');
    sections.push('### Body');
    sections.push('');
    sections.push(task.body);
  }

  // Parent Project section
  sections.push('');
  sections.push('---');
  sections.push('');

  if (result.project) {
    const project = result.project;
    sections.push(`## Parent Project: ${project.title}`);
    sections.push('');

    // Project metadata table
    const projectRows: [string, string | undefined][] = [];
    if (project.status) projectRows.push(['status', toKebabCase(project.status)]);
    if (project.area) projectRows.push(['area', project.area]);
    if (project.startDate) projectRows.push(['start-date', project.startDate]);
    if (project.endDate) projectRows.push(['end-date', project.endDate]);
    projectRows.push(['path', project.path]);

    sections.push('| Field | Value |');
    sections.push('| ----- | ----- |');
    for (const [key, value] of projectRows) {
      if (value !== undefined) {
        sections.push(`| ${key} | ${value} |`);
      }
    }

    // Project excerpt (blockquote format)
    const blockquote = formatBlockquoteExcerpt(project.body);
    if (blockquote) {
      sections.push('');
      sections.push(blockquote);
    }
  } else {
    sections.push('## Parent Project');
    sections.push('');
    sections.push('_None_');
  }

  // Parent Area section
  sections.push('');
  sections.push('---');
  sections.push('');

  if (result.area) {
    const area = result.area;
    sections.push(`## Parent Area: ${area.title}`);
    sections.push('');

    // Relationship clarity notation
    if (result.project) {
      // Area is via project
      sections.push(`_Via project ${result.project.title}_`);
    } else {
      // Direct relationship (task has area but no project)
      sections.push('_Direct relationship_');
    }
    sections.push('');

    // Area metadata table
    const areaRows: [string, string | undefined][] = [];
    if (area.status) areaRows.push(['status', toKebabCase(area.status)]);
    if (area.areaType) areaRows.push(['type', area.areaType]);
    areaRows.push(['path', area.path]);

    sections.push('| Field | Value |');
    sections.push('| ----- | ----- |');
    for (const [key, value] of areaRows) {
      if (value !== undefined) {
        sections.push(`| ${key} | ${value} |`);
      }
    }

    // Area excerpt (blockquote format)
    const areaBlockquote = formatBlockquoteExcerpt(area.body);
    if (areaBlockquote) {
      sections.push('');
      sections.push(areaBlockquote);
    }
  } else if (result.project && !result.area) {
    // Task has project but project has no area
    sections.push('## Parent Area');
    sections.push('');
    sections.push('_None (project has no area)_');
  } else {
    // Task has no project and no area
    sections.push('## Parent Area');
    sections.push('');
    sections.push('_None_');
  }

  // Reference section
  const references = collectReferences({
    areas: result.area ? [result.area] : [],
    projects: result.project ? [result.project] : [],
    tasks: [task],
  });

  if (references.length > 0) {
    sections.push('');
    sections.push('---');
    sections.push('');
    sections.push('## Reference');
    sections.push('');
    sections.push(buildReferenceTable(references));
  }

  return sections.join('\n').trimEnd();
}

// ============================================================================
// Vault Overview Formatter (ai-context.md Section 4)
// ============================================================================

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
      const parentChain = formatParentChain(project, area);
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
      const parentChain = formatParentChain(project, area);
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
      const parentChain = formatParentChain(project, area);
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
      const parentChain = formatParentChain(project, area);
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
      const parentChain = formatParentChain(project, area);
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
        const parentChain = formatParentChain(project, area);
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
      const parentChain = formatParentChain(project, area);
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
    const parentChain = formatParentChain(project, area);

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
    const blockquote = formatBlockquoteExcerpt(area.body);
    if (blockquote) {
      lines.push(`### ${area.title} (Area)`);
      lines.push('');
      lines.push(blockquote);
      lines.push('');
    }
  }

  // Project excerpts (exclude paused)
  for (const project of result.projects) {
    const status = project.status?.toLowerCase();
    if (status === 'paused') continue;

    const blockquote = formatBlockquoteExcerpt(project.body);
    if (blockquote) {
      lines.push(`### ${project.title} (Project)`);
      lines.push('');
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

// ============================================================================
// Create Result Formatters
// ============================================================================

/**
 * Format task created result for AI mode
 */
function formatTaskCreated(task: Task): string {
  const lines: string[] = [];

  lines.push('## Task Created');
  lines.push('');
  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);

  // Required field per S1 spec Section 3.3
  lines.push(`- **created-at:** ${task.createdAt || '(missing)'}`);

  // Optional fields - only show if set during creation
  if (task.due) lines.push(`- **due:** ${task.due}`);
  if (task.scheduled) lines.push(`- **scheduled:** ${task.scheduled}`);
  if (task.project) lines.push(`- **project:** ${task.project}`);
  if (task.area) lines.push(`- **area:** ${task.area}`);

  return lines.join('\n');
}

/**
 * Format project created result for AI mode
 */
function formatProjectCreated(project: Project): string {
  const lines: string[] = [];

  lines.push('## Project Created');
  lines.push('');
  lines.push(`### ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);
  if (project.status) lines.push(`- **status:** ${toKebabCase(project.status)}`);
  if (project.area) lines.push(`- **area:** ${project.area}`);
  if (project.startDate) lines.push(`- **start-date:** ${project.startDate}`);
  if (project.endDate) lines.push(`- **end-date:** ${project.endDate}`);

  return lines.join('\n');
}

/**
 * Format area created result for AI mode
 */
function formatAreaCreated(area: Area): string {
  const lines: string[] = [];

  lines.push('## Area Created');
  lines.push('');
  lines.push(`### ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);
  if (area.status) lines.push(`- **status:** ${toKebabCase(area.status)}`);
  if (area.areaType) lines.push(`- **type:** ${area.areaType}`);

  return lines.join('\n');
}

// ============================================================================
// Modify Result Formatters
// ============================================================================

/**
 * Format task completed result for AI mode
 */
function formatTaskCompleted(task: Task): string {
  const lines: string[] = [];

  lines.push('## Task Completed');
  lines.push('');
  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);

  return lines.join('\n');
}

/**
 * Format task dropped result for AI mode
 */
function formatTaskDropped(task: Task): string {
  const lines: string[] = [];

  lines.push('## Task Dropped');
  lines.push('');
  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);

  return lines.join('\n');
}

/**
 * Format task status changed result for AI mode
 */
function formatTaskStatusChanged(task: Task, previousStatus: string): string {
  const lines: string[] = [];

  lines.push('## Task Status Changed');
  lines.push('');
  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);
  if (task.updatedAt) lines.push(`- **updated-at:** ${task.updatedAt}`);
  if (task.completedAt) lines.push(`- **completed-at:** ${task.completedAt}`);
  lines.push('');
  lines.push('### Changes');
  lines.push('');
  lines.push(`- **status:** ${previousStatus} → ${toKebabCase(task.status)}`);

  return lines.join('\n');
}

/**
 * Format field changes for AI mode
 */
function formatFieldChanges(changes: FieldChange[]): string {
  const lines: string[] = [];
  for (const change of changes) {
    if (change.oldValue && change.newValue) {
      lines.push(`- **${change.field}:** ${change.oldValue} → ${change.newValue}`);
    } else if (change.newValue) {
      lines.push(`- **${change.field}:** (unset) → ${change.newValue}`);
    } else if (change.oldValue) {
      lines.push(`- **${change.field}:** ${change.oldValue} → (unset)`);
    }
  }
  return lines.join('\n');
}

/**
 * Format task updated result for AI mode
 */
function formatTaskUpdated(task: Task, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('## Task Updated');
  lines.push('');
  lines.push(`### ${task.title}`);
  lines.push('');
  lines.push(`- **path:** ${task.path}`);
  lines.push(`- **status:** ${toKebabCase(task.status)}`);
  if (task.updatedAt) lines.push(`- **updated-at:** ${task.updatedAt}`);
  lines.push('');
  lines.push('### Changes');
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format project updated result for AI mode
 */
function formatProjectUpdated(project: Project, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('## Project Updated');
  lines.push('');
  lines.push(`### ${project.title}`);
  lines.push('');
  lines.push(`- **path:** ${project.path}`);
  if (project.status) lines.push(`- **status:** ${toKebabCase(project.status)}`);
  lines.push('');
  lines.push('### Changes');
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format area updated result for AI mode
 */
function formatAreaUpdated(area: Area, changes: FieldChange[]): string {
  const lines: string[] = [];

  lines.push('## Area Updated');
  lines.push('');
  lines.push(`### ${area.title}`);
  lines.push('');
  lines.push(`- **path:** ${area.path}`);
  if (area.status) lines.push(`- **status:** ${toKebabCase(area.status)}`);
  lines.push('');
  lines.push('### Changes');
  lines.push('');
  lines.push(formatFieldChanges(changes));

  return lines.join('\n');
}

/**
 * Format archived result for AI mode
 */
function formatArchived(title: string, fromPath: string, toPath: string): string {
  const lines: string[] = [];

  lines.push('## Archived');
  lines.push('');
  lines.push(`### ${title}`);
  lines.push('');
  lines.push(`- **from:** ${fromPath}`);
  lines.push(`- **to:** ${toPath}`);

  return lines.join('\n');
}

/**
 * Format batch result for AI mode
 */
function formatBatchResult(result: BatchResult): string {
  const lines: string[] = [];
  const opName =
    result.operation === 'completed'
      ? 'Completed'
      : result.operation === 'dropped'
        ? 'Dropped'
        : result.operation === 'status-changed'
          ? 'Status Changed'
          : result.operation === 'updated'
            ? 'Updated'
            : 'Archived';

  if (result.successes.length > 0) {
    lines.push(`## ${opName} (${result.successes.length})`);
    lines.push('');

    for (const success of result.successes) {
      lines.push(`### ${success.path}`);
      lines.push('');
      lines.push(`- **title:** ${success.title}`);
      if (success.task) {
        lines.push(`- **status:** ${toKebabCase(success.task.status)}`);
        if (success.task.completedAt) {
          lines.push(`- **completed-at:** ${success.task.completedAt}`);
        }
      }
      if (success.toPath) {
        lines.push(`- **to:** ${success.toPath}`);
      }
      lines.push('');
    }
  }

  if (result.failures.length > 0) {
    lines.push(`## Errors (${result.failures.length})`);
    lines.push('');

    for (const failure of result.failures) {
      lines.push(`### ${failure.path}`);
      lines.push('');
      lines.push(`- **code:** ${failure.code}`);
      lines.push(`- **message:** ${failure.message}`);
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

/**
 * Format dry run result for AI mode
 */
function formatDryRun(result: DryRunResult): string {
  const lines: string[] = [];

  const opName =
    result.operation === 'create'
      ? 'Would Be Created'
      : result.operation === 'complete'
        ? 'Would Be Completed'
        : result.operation === 'drop'
          ? 'Would Be Dropped'
          : result.operation === 'status'
            ? 'Would Be Updated'
            : result.operation === 'update'
              ? 'Would Be Updated'
              : result.operation === 'append-body'
                ? 'Would Be Appended'
                : 'Would Be Archived';

  const entityName =
    result.entityType === 'task' ? 'Task' : result.entityType === 'project' ? 'Project' : 'Area';

  lines.push(`## Dry Run: ${entityName} ${opName}`);
  lines.push('');
  lines.push(`### ${result.title}`);
  lines.push('');
  lines.push(`- **path:** ${result.path}${result.wouldCreate ? ' (would be created)' : ''}`);

  if (result.changes && result.changes.length > 0) {
    lines.push('');
    lines.push('### Changes');
    lines.push('');
    lines.push(formatFieldChanges(result.changes));
  }

  if (result.toPath) {
    lines.push(`- **to:** ${result.toPath}`);
  }

  if (result.appendText) {
    lines.push('');
    lines.push('### Text to Append');
    lines.push('');
    lines.push(result.appendText);
  }

  return lines.join('\n');
}

/**
 * Format body appended result for AI mode
 */
function formatBodyAppended(result: BodyAppendedResult): string {
  const lines: string[] = [];
  const entityName =
    result.entityType === 'task' ? 'Task' : result.entityType === 'project' ? 'Project' : 'Area';

  lines.push(`## ${entityName} Body Updated`);
  lines.push('');
  lines.push(`### ${result.title}`);
  lines.push('');
  lines.push(`- **path:** ${result.path}`);
  lines.push('');
  lines.push('### Appended Text');
  lines.push('');
  lines.push(result.appendedText);

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
        return formatTaskStatusChanged(statusResult.task, statusResult.previousStatus);
      }
      case 'task-updated': {
        const updatedResult = result as TaskUpdatedResult;
        return formatTaskUpdated(updatedResult.task, updatedResult.changes);
      }
      case 'project-updated': {
        const updatedResult = result as ProjectUpdatedResult;
        return formatProjectUpdated(updatedResult.project, updatedResult.changes);
      }
      case 'area-updated': {
        const updatedResult = result as AreaUpdatedResult;
        return formatAreaUpdated(updatedResult.area, updatedResult.changes);
      }
      case 'archived': {
        const archivedResult = result as ArchivedResult;
        return formatArchived(archivedResult.title, archivedResult.fromPath, archivedResult.toPath);
      }
      case 'batch-result': {
        const batchResult = result as BatchResult;
        return formatBatchResult(batchResult);
      }
      case 'dry-run': {
        const dryRunResult = result as DryRunResult;
        return formatDryRun(dryRunResult);
      }
      case 'body-appended': {
        const appendedResult = result as BodyAppendedResult;
        return formatBodyAppended(appendedResult);
      }
      default:
        return `## ${result.type}\n\n(stub output)`;
    }
  },
};
