import { scanAreas, scanProjects, scanTasks } from '@bindings';
import type { Area, Project, Task, VaultConfig } from '@bindings';
import type { VaultOverviewResult, TimelineData, VaultStats } from './types.ts';
import {
  getToday,
  isOverdue,
  isDueToday,
  isScheduledToday,
  isNewlyActionable,
  isScheduledThisWeek,
  wasModifiedRecently,
  isActiveTask,
  isActiveProject,
  isActiveArea,
  isBlocked,
  isInProgress,
} from './helpers/index.ts';

/**
 * Normalize a wikilink reference to a comparable string
 * [[Project Name]] -> project name
 * Project Name -> project name
 */
function normalizeWikilink(ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  return ref.replace(/^\[\[|\]\]$/g, '').toLowerCase();
}

/**
 * Build the vault overview data structure
 */
export function buildVaultOverview(config: VaultConfig): VaultOverviewResult {
  const today = getToday();

  // Fetch all entities
  const allAreas = scanAreas(config);
  const allProjects = scanProjects(config);
  const allTasks = scanTasks(config);

  // Filter to active entities
  const areas = allAreas.filter(isActiveArea);
  const projects = allProjects.filter(isActiveProject);
  const tasks = allTasks.filter(isActiveTask);

  // Build area lookup by title (for matching wikilinks)
  const areaTitleToPath = new Map<string, string>();
  for (const area of areas) {
    areaTitleToPath.set(area.title.toLowerCase(), area.path);
  }

  // Build project lookup by title (for matching wikilinks)
  const projectTitleToPath = new Map<string, string>();
  for (const project of projects) {
    projectTitleToPath.set(project.title.toLowerCase(), project.path);
  }

  // Build relationships: area -> projects
  const areaProjects = new Map<string, Project[]>();
  const orphanProjects: Project[] = [];

  for (const area of areas) {
    areaProjects.set(area.path, []);
  }

  for (const project of projects) {
    const areaRef = normalizeWikilink(project.area);
    if (areaRef) {
      const areaPath = areaTitleToPath.get(areaRef);
      if (areaPath) {
        const arr = areaProjects.get(areaPath) ?? [];
        arr.push(project);
        areaProjects.set(areaPath, arr);
      } else {
        orphanProjects.push(project);
      }
    } else {
      orphanProjects.push(project);
    }
  }

  // Build relationships: project -> tasks
  const projectTasks = new Map<string, Task[]>();
  for (const project of projects) {
    projectTasks.set(project.path, []);
  }

  // Track which tasks are assigned to projects
  const taskInProject = new Set<string>();

  for (const task of tasks) {
    const projectRef = normalizeWikilink(task.project);
    if (projectRef) {
      const projectPath = projectTitleToPath.get(projectRef);
      if (projectPath) {
        const arr = projectTasks.get(projectPath) ?? [];
        arr.push(task);
        projectTasks.set(projectPath, arr);
        taskInProject.add(task.path);
      }
    }
  }

  // Build relationships: area -> direct tasks (not via project)
  const directAreaTasks = new Map<string, Task[]>();
  for (const area of areas) {
    directAreaTasks.set(area.path, []);
  }

  // Track which tasks are direct area tasks
  const taskInArea = new Set<string>();

  for (const task of tasks) {
    if (taskInProject.has(task.path)) continue; // Already in a project

    const areaRef = normalizeWikilink(task.area);
    if (areaRef) {
      const areaPath = areaTitleToPath.get(areaRef);
      if (areaPath) {
        const arr = directAreaTasks.get(areaPath) ?? [];
        arr.push(task);
        directAreaTasks.set(areaPath, arr);
        taskInArea.add(task.path);
      }
    }
  }

  // Find orphan tasks (no project, no area)
  const orphanTasks = tasks.filter(
    (task) => !taskInProject.has(task.path) && !taskInArea.has(task.path)
  );

  // Build timeline categorization
  const timeline = buildTimeline(tasks, today);

  // Calculate stats
  const stats = calculateStats(areas, projects, tasks, timeline, today);

  return {
    type: 'vault-overview',
    areas,
    projects,
    tasks,
    areaProjects,
    projectTasks,
    directAreaTasks,
    orphanProjects,
    orphanTasks,
    timeline,
    stats,
  };
}

/**
 * Build timeline categorization for tasks
 * Per ai-context.md Section 4
 */
function buildTimeline(tasks: Task[], today: string): TimelineData {
  const overdue: Task[] = [];
  const dueToday: Task[] = [];
  const scheduledToday: Task[] = [];
  const newlyActionable: Task[] = [];
  const blocked: Task[] = [];
  const scheduledThisWeek = new Map<string, Task[]>();
  const recentlyModified: Task[] = [];

  // Set for tracking tasks that appear in timeline sections
  const inTimeline = new Set<string>();

  for (const task of tasks) {
    // Check overdue
    if (isOverdue(task, today)) {
      overdue.push(task);
      inTimeline.add(task.path);
      continue;
    }

    // Check due today
    if (isDueToday(task, today)) {
      dueToday.push(task);
      inTimeline.add(task.path);
      continue;
    }

    // Check scheduled today
    if (isScheduledToday(task, today)) {
      scheduledToday.push(task);
      inTimeline.add(task.path);
      continue;
    }

    // Check newly actionable
    if (isNewlyActionable(task, today)) {
      newlyActionable.push(task);
      inTimeline.add(task.path);
      continue;
    }

    // Check blocked
    if (isBlocked(task)) {
      blocked.push(task);
      inTimeline.add(task.path);
      continue;
    }

    // Check scheduled this week (but not today)
    if (isScheduledThisWeek(task, today)) {
      const date = task.scheduled!;
      const arr = scheduledThisWeek.get(date) ?? [];
      arr.push(task);
      scheduledThisWeek.set(date, arr);
      inTimeline.add(task.path);
    }
  }

  // Find recently modified tasks (last 24h, not already in timeline)
  // Per ai-context.md: if >20 tasks, omit section entirely
  const recentlyModifiedCandidates = tasks.filter(
    (task) => !inTimeline.has(task.path) && wasModifiedRecently(task, 24)
  );

  if (recentlyModifiedCandidates.length <= 20) {
    recentlyModified.push(...recentlyModifiedCandidates);
  }

  return {
    overdue,
    dueToday,
    scheduledToday,
    newlyActionable,
    blocked,
    scheduledThisWeek,
    recentlyModified,
  };
}

/**
 * Calculate vault statistics
 */
function calculateStats(
  areas: Area[],
  projects: Project[],
  tasks: Task[],
  timeline: TimelineData,
  _today: string
): VaultStats {
  return {
    areaCount: areas.length,
    projectCount: projects.length,
    taskCount: tasks.length,
    overdueCount: timeline.overdue.length,
    dueTodayCount: timeline.dueToday.length,
    inProgressCount: tasks.filter(isInProgress).length,
  };
}
