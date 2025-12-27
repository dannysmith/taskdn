import { join } from 'path';
import { Command } from '@commander-js/extra-typings';
import { scanTasks, scanProjects, scanAreas, createVaultSession, getTasksInArea } from '@bindings';
import type { Task, Project, Area } from '@bindings';
import { formatOutput } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskListResult,
  ProjectListResult,
  AreaListResult,
} from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';
import { getToday, getTomorrow, getEndOfWeek, getStartOfWeek } from '@/output/helpers/index.ts';
import { filterByStatus, sortEntities, filterByQuery, limitResults } from '@/lib/filtering.ts';
import { normalizeEntityType } from '@/lib/entity-type.ts';

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

interface ListOptions {
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
 * List command - list entities with optional filters
 *
 * Usage:
 *   taskdn list                           # List tasks (default)
 *   taskdn list tasks                     # List tasks (explicit)
 *   taskdn list task                      # Singular form also supported
 *   taskdn list projects                  # List projects
 *   taskdn list project                   # Singular form also supported
 *   taskdn list areas                     # List areas
 *   taskdn list --status ready            # Filter by status
 *   taskdn list --project "Q1"            # Filter by project
 */
export const listCommand = new Command('list')
  .description('List entities with optional filters')
  .argument('[entity-type]', 'Entity type: task(s), project(s), or area(s)', 'tasks')
  .option('-s, --status <status>', 'Filter by status (comma-separated for OR)')
  .option('-p, --project <project>', 'Filter by project name')
  .option('-a, --area <area>', 'Filter by area name')
  .option('-d, --due <when>', 'Filter by due date (today, tomorrow, this-week)')
  .option('--overdue', 'Show overdue tasks')
  .option('--scheduled <when>', 'Filter by scheduled date (today, tomorrow, this-week)')
  .option('--query <text>', 'Search in title and body')
  .option('--sort <field>', 'Sort by field (due, created, updated, title)')
  .option('--desc', 'Sort descending')
  .option('-l, --limit <n>', 'Limit number of results')
  .option('--include-done', 'Include completed tasks')
  .option('--include-dropped', 'Include dropped tasks')
  .option('--include-closed', 'Include done and dropped tasks')
  .option('--include-icebox', 'Include icebox tasks')
  .option('--include-deferred', 'Include deferred tasks')
  .option('--include-archived', 'Include archived tasks')
  .option('--only-archived', 'Show only archived tasks')
  .option('--completed-after <date>', 'Filter by completion date (after)')
  .option('--completed-before <date>', 'Filter by completion date (before)')
  .option('--completed-today', 'Filter for tasks completed today')
  .option('--completed-this-week', 'Filter for tasks completed this week')
  .action((entityType, options: ListOptions, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();
    const today = getToday();

    // Normalize entity type to support both singular and plural forms
    const normalizedType = normalizeEntityType(entityType, 'plural');

    // Handle projects
    if (normalizedType === 'projects') {
      let projects = scanProjects(config);

      // Filter for active projects by default
      projects = projects.filter((project) => isActiveProject(project));

      // Apply status filter if provided
      if (options.status) {
        projects = filterByStatus(projects, options.status);
      }

      // Apply area filter if provided (case-insensitive substring match)
      if (options.area) {
        const areaQuery = options.area.toLowerCase();
        projects = projects.filter((project) => {
          if (!project.area) return false;
          return project.area.toLowerCase().includes(areaQuery);
        });
      }

      // Apply --query filter if provided (search in title and description)
      if (options.query) {
        projects = filterByQuery(projects, options.query, ['title', 'description']);
      }

      // Apply sorting if --sort is provided
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

      // Apply limit if provided
      if (options.limit) {
        projects = limitResults(projects, options.limit);
      }

      const result: ProjectListResult = {
        type: 'project-list',
        projects,
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Handle areas
    if (normalizedType === 'areas') {
      let areas = scanAreas(config);

      // Filter for active areas by default
      areas = areas.filter((area) => isActiveArea(area));

      // Apply status filter if provided
      if (options.status) {
        areas = filterByStatus(areas, options.status);
      }

      // Apply --query filter if provided (search in title and description)
      if (options.query) {
        areas = filterByQuery(areas, options.query, ['title', 'description']);
      }

      // Apply sorting if --sort is provided
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

      // Apply limit if provided
      if (options.limit) {
        areas = limitResults(areas, options.limit);
      }

      const result: AreaListResult = {
        type: 'area-list',
        areas,
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Handle tasks (default)
    // Scan all tasks from the vault
    let tasks: Task[] = [];

    if (options.onlyArchived) {
      // Only scan archive directory
      const archiveConfig = {
        ...config,
        tasksDir: join(config.tasksDir, 'archive'),
      };
      tasks = scanTasks(archiveConfig);
    } else if (options.area) {
      // Use relationship-aware query for area filtering
      // This finds tasks with direct area assignment AND tasks via projects
      const session = createVaultSession(config);
      const result = getTasksInArea(session, options.area);
      tasks = result.tasks;
      // Note: result.warnings could be displayed if needed
    } else {
      // Scan main tasks directory
      tasks = scanTasks(config);
    }

    // Apply active task filtering based on inclusion flags
    // (Skip for --only-archived since those have different semantics)
    if (!options.onlyArchived) {
      tasks = tasks.filter((task) => {
        // Build set of statuses to exclude (can be overridden by include flags)
        // Use lowercase for consistent comparison since task.status may vary in case
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
        // (this check is for tasks that might have /archive/ in path from main scan)
        if (!options.includeArchived && task.path.includes('/archive/')) {
          return false;
        }

        return true;
      });

      // Also scan archive if --include-archived is set (after main filtering)
      // Archived tasks are included regardless of their status
      // Note: When --area is used, we don't scan archive (getTasksInArea handles main dir only)
      if (options.includeArchived && !options.area) {
        const archiveConfig = {
          ...config,
          tasksDir: join(config.tasksDir, 'archive'),
        };
        const archivedTasks = scanTasks(archiveConfig);
        tasks = [...tasks, ...archivedTasks];
      }
    }

    // Apply status filter if provided
    if (options.status) {
      tasks = filterByStatus(tasks, options.status);
    }

    // Apply project filter if provided (case-insensitive substring match)
    if (options.project) {
      const projectQuery = options.project.toLowerCase();
      tasks = tasks.filter((task) => {
        if (!task.project) return false;
        return task.project.toLowerCase().includes(projectQuery);
      });
    }

    // Note: --area filter is handled earlier via getTasksInArea() which
    // properly resolves relationships (tasks via projects + direct area assignment)

    // Apply --due filter if provided
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
            // Range filter: today through end of week
            return task.due >= targetDate && task.due <= endDate;
          }
          // Exact date match
          return task.due === targetDate;
        });
      }
    }

    // Apply --overdue filter if provided
    if (options.overdue) {
      tasks = tasks.filter((task) => {
        if (!task.due) return false;
        // Task is overdue if due date is before today
        return task.due < today;
      });
    }

    // Apply --scheduled filter if provided
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
            // Range filter: today through end of week
            return task.scheduled >= targetDate && task.scheduled <= endDate;
          }
          // Exact date match
          return task.scheduled === targetDate;
        });
      }
    }

    // Apply --query filter if provided (search in title and body)
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
        // Compare just the date portion (first 10 chars of YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)
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

    // Apply sorting if --sort is provided
    if (options.sort) {
      const sortField = options.sort.toLowerCase();
      const descending = options.desc === true;

      // Map CLI sort values to task field names
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

    // Apply limit if --limit is provided
    if (options.limit) {
      tasks = limitResults(tasks, options.limit);
    }

    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(result, globalOpts));
  });
