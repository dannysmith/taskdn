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
      const excerpt = truncateBody(project.body);
      if (excerpt) {
        sections.push(`### ${project.title}`);
        sections.push('');
        // Format as blockquote
        const blockquote = excerpt
          .split('\n')
          .map((line) => `> ${line}`)
          .join('\n');
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
    const areaExcerpt = truncateBody(area.body);
    if (areaExcerpt) {
      sections.push('');
      const blockquote = areaExcerpt
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
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
