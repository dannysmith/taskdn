import { Command } from '@commander-js/extra-typings';
import { scanTasks, scanProjects, scanAreas } from '@bindings';
import type { Task, Project, Area } from '@bindings';
import { formatOutput } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskListResult,
  ProjectListResult,
  AreaListResult,
} from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';

/**
 * Get today's date in YYYY-MM-DD format.
 * Supports TASKDN_MOCK_DATE env var for testing.
 */
function getToday(): string {
  // Support mocking for tests
  const mockDate = process.env.TASKDN_MOCK_DATE;
  if (mockDate && /^\d{4}-\d{2}-\d{2}$/.test(mockDate)) {
    return mockDate;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get tomorrow's date in YYYY-MM-DD format
 */
function getTomorrow(today: string): string {
  const date = new Date(today + 'T00:00:00');
  date.setDate(date.getDate() + 1);
  return formatDate(date);
}

/**
 * Get the end of week (Sunday) for the given date in YYYY-MM-DD format.
 * Week starts on Monday (day 1) and ends on Sunday (day 0).
 */
function getEndOfWeek(today: string): string {
  const date = new Date(today + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days until Sunday
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  return formatDate(date);
}

/**
 * Get the start of week (Monday) for the given date in YYYY-MM-DD format.
 * Week starts on Monday (day 1) and ends on Sunday (day 0).
 */
function getStartOfWeek(today: string): string {
  const date = new Date(today + 'T00:00:00');
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate days since Monday (Sunday = 6 days ago, Monday = 0)
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysSinceMonday);
  return formatDate(date);
}

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
 *   taskdn list projects                  # List projects
 *   taskdn list areas                     # List areas
 *   taskdn list --status ready            # Filter by status
 *   taskdn list --project "Q1"            # Filter by project
 */
export const listCommand = new Command('list')
  .description('List entities with optional filters')
  .argument('[entity-type]', 'Entity type: tasks, projects, or areas', 'tasks')
  .option('--status <status>', 'Filter by status (comma-separated for OR)')
  .option('--project <project>', 'Filter by project name')
  .option('--area <area>', 'Filter by area name')
  .option('--due <when>', 'Filter by due date (today, tomorrow, this-week)')
  .option('--overdue', 'Show overdue tasks')
  .option('--scheduled <when>', 'Filter by scheduled date (today)')
  .option('--query <text>', 'Search in title and body')
  .option('--sort <field>', 'Sort by field (due, created, updated, title)')
  .option('--desc', 'Sort descending')
  .option('--limit <n>', 'Limit number of results')
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

    // Handle projects
    if (entityType === 'projects') {
      let projects = scanProjects(config);

      // Filter for active projects by default
      projects = projects.filter((project) => isActiveProject(project));

      const result: ProjectListResult = {
        type: 'project-list',
        projects,
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Handle areas
    if (entityType === 'areas') {
      let areas = scanAreas(config);

      // Filter for active areas by default
      areas = areas.filter((area) => isActiveArea(area));

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
        tasksDir: `${config.tasksDir}/archive`,
      };
      tasks = scanTasks(archiveConfig);
    } else {
      // Scan main tasks directory
      tasks = scanTasks(config);

      // Apply active task filtering based on inclusion flags
      tasks = tasks.filter((task) => {
        // Build set of statuses to exclude (can be overridden by include flags)
        const excludedStatuses = new Set<string>();

        if (!options.includeDone && !options.includeClosed) {
          excludedStatuses.add('Done');
        }
        if (!options.includeDropped && !options.includeClosed) {
          excludedStatuses.add('Dropped');
        }
        if (!options.includeIcebox) {
          excludedStatuses.add('Icebox');
        }

        if (excludedStatuses.has(task.status)) {
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
      if (options.includeArchived) {
        const archiveConfig = {
          ...config,
          tasksDir: `${config.tasksDir}/archive`,
        };
        const archivedTasks = scanTasks(archiveConfig);
        tasks = [...tasks, ...archivedTasks];
      }
    }

    // Apply status filter if provided
    if (options.status) {
      const statuses = options.status.split(',').map((s) => s.trim().toLowerCase());
      tasks = tasks.filter((task) => {
        const taskStatus = task.status.toLowerCase().replace('-', '');
        return statuses.some((s) => {
          // Handle kebab-case and pascal-case matching
          const normalized = s.replace('-', '');
          return taskStatus === normalized || task.status.toLowerCase() === s;
        });
      });
    }

    // Apply project filter if provided (case-insensitive substring match)
    if (options.project) {
      const projectQuery = options.project.toLowerCase();
      tasks = tasks.filter((task) => {
        if (!task.project) return false;
        return task.project.toLowerCase().includes(projectQuery);
      });
    }

    // Apply area filter if provided (case-insensitive substring match)
    if (options.area) {
      const areaQuery = options.area.toLowerCase();
      tasks = tasks.filter((task) => {
        if (!task.area) return false;
        return task.area.toLowerCase().includes(areaQuery);
      });
    }

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

      if (scheduledValue === 'today') {
        targetDate = today;
      }

      if (targetDate) {
        tasks = tasks.filter((task) => {
          if (!task.scheduled) return false;
          return task.scheduled === targetDate;
        });
      }
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
        tasks = tasks.sort((a, b) => {
          const aVal = a[taskField];
          const bVal = b[taskField];

          // Items without the sort field go last, regardless of direction
          if (aVal === undefined && bVal === undefined) return 0;
          if (aVal === undefined) return 1;
          if (bVal === undefined) return -1;

          // Compare values (works for strings including dates)
          let comparison = 0;
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            // Case-insensitive comparison for title
            if (taskField === 'title') {
              comparison = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
            } else {
              comparison = aVal.localeCompare(bVal);
            }
          }

          return descending ? -comparison : comparison;
        });
      }
    }

    // Apply limit if --limit is provided
    if (options.limit) {
      const limit = parseInt(options.limit, 10);
      if (!isNaN(limit) && limit > 0) {
        tasks = tasks.slice(0, limit);
      }
    }

    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(result, globalOpts));
  });
