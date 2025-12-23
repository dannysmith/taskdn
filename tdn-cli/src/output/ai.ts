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

/**
 * Format vault overview result for AI mode
 */
function formatVaultOverview(result: VaultOverviewResult): string {
  const lines: string[] = [];

  lines.push('## Vault Overview');
  lines.push('');

  // Areas section
  lines.push(`### Areas (${result.areas.length})`);
  lines.push('');

  if (result.areas.length === 0) {
    lines.push('No areas defined.');
  } else {
    for (const areaSummary of result.areas) {
      lines.push(`#### ${areaSummary.area.title}`);
      lines.push('');
      lines.push(`- **path:** ${areaSummary.area.path}`);
      lines.push(`- **projects:** ${areaSummary.projectCount} active`);
      lines.push(`- **tasks:** ${areaSummary.activeTaskCount} active`);
      lines.push('');
    }
  }

  // Summary section
  lines.push('### Summary');
  lines.push('');
  lines.push(`- **total-active-tasks:** ${result.summary.totalActiveTasks}`);
  lines.push(`- **overdue:** ${result.summary.overdueCount}`);
  lines.push(`- **in-progress:** ${result.summary.inProgressCount}`);
  lines.push('');

  // This Week section
  lines.push('### This Week');
  lines.push('');

  lines.push(`#### Due (${result.thisWeek.dueTasks.length})`);
  lines.push('');
  if (result.thisWeek.dueTasks.length === 0) {
    lines.push('No tasks due this week.');
  } else {
    for (const task of result.thisWeek.dueTasks) {
      lines.push(`- ${task.title} — ${task.path} (due: ${task.due})`);
    }
  }
  lines.push('');

  lines.push(`#### Scheduled (${result.thisWeek.scheduledTasks.length})`);
  lines.push('');
  if (result.thisWeek.scheduledTasks.length === 0) {
    lines.push('No tasks scheduled this week.');
  } else {
    for (const task of result.thisWeek.scheduledTasks) {
      lines.push(`- ${task.title} — ${task.path} (scheduled: ${task.scheduled})`);
    }
  }

  return lines.join('\n').trimEnd();
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
