import { join } from 'path';
import { scanTasks, scanProjects, scanAreas, createVaultSession, getTasksInArea } from '@bindings';
import type { Task, Project, Area, VaultConfig } from '@bindings';
import { getToday, getTomorrow, getEndOfWeek, getStartOfWeek } from '@/output/helpers/index.ts';
import { filterByStatus, sortEntities, filterByQuery, limitResults } from './filtering.ts';

/**
 * Check if a project is "active" per CLI spec:
 * - Status is unset OR status NOT IN (done)
 */
function isActiveProject(project: Project): boolean {
  // If no status, treat as active
  if (!project.status) {
    return true;
  }

  // Exclude done projects
  return project.status !== 'Done';
}

/**
 * Check if an area is "active" per CLI spec:
 * - Status is unset OR status = 'active'
 */
function isActiveArea(area: Area): boolean {
  // If no status, treat as active
  if (!area.status) {
    return true;
  }

  // Only include if status is 'Active'
  return area.status === 'Active';
}

export interface ListOptions {
  status?: string;
  project?: string;
  area?: string;
  due?: string;
  overdue?: boolean;
  scheduled?: string;
  query?: string;
  sort?: string;
  desc?: boolean;
  limit?: string;
  // Inclusion flags
  includeDone?: boolean;
  includeDropped?: boolean;
  includeClosed?: boolean;
  includeIcebox?: boolean;
  includeDeferred?: boolean;
  includeArchived?: boolean;
  onlyArchived?: boolean;
  // Completed date filters
  completedAfter?: string;
  completedBefore?: string;
  completedToday?: boolean;
  completedThisWeek?: boolean;
}

/**
 * List tasks with filtering and sorting
 */
export function listTasks(config: VaultConfig, options: ListOptions): Task[] {
  const today = getToday();
  let tasks: Task[] = [];

  // Scan tasks based on archive/area options
  if (options.onlyArchived) {
    // Only scan archive directory
    const archiveConfig = {
      ...config,
      tasksDir: join(config.tasksDir, 'archive'),
    };
    tasks = scanTasks(archiveConfig);
  } else if (options.area) {
    // Use relationship-aware query for area filtering
    const session = createVaultSession(config);
    const result = getTasksInArea(session, options.area);
    tasks = result.tasks;
  } else {
    // Scan main tasks directory
    tasks = scanTasks(config);
  }

  // Apply active task filtering based on inclusion flags
  if (!options.onlyArchived) {
    tasks = tasks.filter((task) => {
      const excludedStatuses = new Set<string>();

      if (!options.includeDone && !options.includeClosed) {
        excludedStatuses.add('done');
      }
      if (!options.includeDropped && !options.includeClosed) {
        excludedStatuses.add('dropped');
      }
      if (!options.includeIcebox) {
        excludedStatuses.add('icebox');
      }

      if (excludedStatuses.has(task.status.toLowerCase())) {
        return false;
      }

      // Handle deferred tasks
      if (!options.includeDeferred) {
        if (task.deferUntil && task.deferUntil > today) {
          return false;
        }
      }

      // Exclude archived tasks unless --include-archived is set
      if (!options.includeArchived && task.path.includes('/archive/')) {
        return false;
      }

      return true;
    });

    // Also scan archive if --include-archived is set
    if (options.includeArchived && !options.area) {
      const archiveConfig = {
        ...config,
        tasksDir: join(config.tasksDir, 'archive'),
      };
      const archivedTasks = scanTasks(archiveConfig);
      tasks = [...tasks, ...archivedTasks];
    }
  }

  // Apply status filter
  if (options.status) {
    tasks = filterByStatus(tasks, options.status);
  }

  // Apply project filter
  if (options.project) {
    const projectQuery = options.project.toLowerCase();
    tasks = tasks.filter((task) => {
      if (!task.project) return false;
      return task.project.toLowerCase().includes(projectQuery);
    });
  }

  // Apply due date filter
  if (options.due) {
    const dueValue = options.due.toLowerCase();
    let targetDate: string | null = null;
    let endDate: string | null = null;

    if (dueValue === 'today') {
      targetDate = today;
    } else if (dueValue === 'tomorrow') {
      targetDate = getTomorrow(today);
    } else if (dueValue === 'this-week') {
      targetDate = today;
      endDate = getEndOfWeek(today);
    }

    if (targetDate) {
      tasks = tasks.filter((task) => {
        if (!task.due) return false;
        if (endDate) {
          return task.due >= targetDate && task.due <= endDate;
        }
        return task.due === targetDate;
      });
    }
  }

  // Apply overdue filter
  if (options.overdue) {
    tasks = tasks.filter((task) => {
      if (!task.due) return false;
      return task.due < today;
    });
  }

  // Apply scheduled filter
  if (options.scheduled) {
    const scheduledValue = options.scheduled.toLowerCase();
    let targetDate: string | null = null;
    let endDate: string | null = null;

    if (scheduledValue === 'today') {
      targetDate = today;
    } else if (scheduledValue === 'tomorrow') {
      targetDate = getTomorrow(today);
    } else if (scheduledValue === 'this-week') {
      targetDate = today;
      endDate = getEndOfWeek(today);
    }

    if (targetDate) {
      tasks = tasks.filter((task) => {
        if (!task.scheduled) return false;
        if (endDate) {
          return task.scheduled >= targetDate && task.scheduled <= endDate;
        }
        return task.scheduled === targetDate;
      });
    }
  }

  // Apply query filter
  if (options.query) {
    tasks = filterByQuery(tasks, options.query, ['title', 'body']);
  }

  // Apply completed date filters
  if (options.completedAfter) {
    tasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return task.completedAt >= options.completedAfter!;
    });
  }

  if (options.completedBefore) {
    tasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return task.completedAt < options.completedBefore!;
    });
  }

  if (options.completedToday) {
    tasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      return task.completedAt.substring(0, 10) === today;
    });
  }

  if (options.completedThisWeek) {
    const endOfWeek = getEndOfWeek(today);
    const startOfWeek = getStartOfWeek(today);
    tasks = tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedDate = task.completedAt.substring(0, 10);
      return completedDate >= startOfWeek && completedDate <= endOfWeek;
    });
  }

  // Apply sorting
  if (options.sort) {
    const sortField = options.sort.toLowerCase();
    const descending = options.desc === true;

    const fieldMap: Record<string, keyof Task> = {
      due: 'due',
      created: 'createdAt',
      updated: 'updatedAt',
      title: 'title',
    };

    const taskField = fieldMap[sortField];
    if (taskField) {
      tasks = sortEntities(tasks, taskField, descending);
    }
  }

  // Apply limit
  if (options.limit) {
    tasks = limitResults(tasks, options.limit);
  }

  return tasks;
}

/**
 * List projects with filtering and sorting
 */
export function listProjects(config: VaultConfig, options: ListOptions): Project[] {
  let projects = scanProjects(config);

  // Filter for active projects by default
  projects = projects.filter((project) => isActiveProject(project));

  // Apply status filter
  if (options.status) {
    projects = filterByStatus(projects, options.status);
  }

  // Apply area filter
  if (options.area) {
    const areaQuery = options.area.toLowerCase();
    projects = projects.filter((project) => {
      if (!project.area) return false;
      return project.area.toLowerCase().includes(areaQuery);
    });
  }

  // Apply query filter
  if (options.query) {
    projects = filterByQuery(projects, options.query, ['title', 'description']);
  }

  // Apply sorting
  if (options.sort) {
    const sortField = options.sort.toLowerCase();
    const descending = options.desc === true;

    const fieldMap: Record<string, keyof Project> = {
      title: 'title',
      'start-date': 'startDate',
      'end-date': 'endDate',
    };

    const projectField = fieldMap[sortField];
    if (projectField) {
      projects = sortEntities(projects, projectField, descending);
    }
  }

  // Apply limit
  if (options.limit) {
    projects = limitResults(projects, options.limit);
  }

  return projects;
}

/**
 * List areas with filtering and sorting
 */
export function listAreas(config: VaultConfig, options: ListOptions): Area[] {
  let areas = scanAreas(config);

  // Filter for active areas by default
  areas = areas.filter((area) => isActiveArea(area));

  // Apply status filter
  if (options.status) {
    areas = filterByStatus(areas, options.status);
  }

  // Apply query filter
  if (options.query) {
    areas = filterByQuery(areas, options.query, ['title', 'description']);
  }

  // Apply sorting
  if (options.sort) {
    const sortField = options.sort.toLowerCase();
    const descending = options.desc === true;

    const fieldMap: Record<string, keyof Area> = {
      title: 'title',
    };

    const areaField = fieldMap[sortField];
    if (areaField) {
      areas = sortEntities(areas, areaField, descending);
    }
  }

  // Apply limit
  if (options.limit) {
    areas = limitResults(areas, options.limit);
  }

  return areas;
}
