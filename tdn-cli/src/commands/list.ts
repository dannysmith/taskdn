import { Command } from '@commander-js/extra-typings';
import { scanTasks } from '@bindings';
import type { Task } from '@bindings';
import { formatOutput } from '@/output/index.ts';
import type { GlobalOptions, TaskListResult } from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';

/**
 * Check if a task is "active" per CLI spec:
 * - Status NOT IN (done, dropped, icebox)
 * - defer-until is unset or <= today
 * - Not in archive/ subdirectory
 */
function isActiveTask(task: Task, today: string): boolean {
  // Exclude done, dropped, icebox
  const inactiveStatuses = ['Done', 'Dropped', 'Icebox'];
  if (inactiveStatuses.includes(task.status)) {
    return false;
  }

  // Exclude deferred tasks (defer-until > today)
  if (task.deferUntil && task.deferUntil > today) {
    return false;
  }

  // Exclude archived tasks (path contains /archive/)
  if (task.path.includes('/archive/')) {
    return false;
  }

  return true;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface ListOptions {
  status?: string;
  project?: string;
  area?: string;
  due?: string;
  overdue?: boolean;
  query?: string;
  sort?: string;
  desc?: boolean;
  limit?: string;
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
  .option('--query <text>', 'Search in title and body')
  .option('--sort <field>', 'Sort by field (due, created, updated, title)')
  .option('--desc', 'Sort descending')
  .option('--limit <n>', 'Limit number of results')
  .action((entityType, options: ListOptions, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();
    const today = getToday();

    // For now, only handle tasks
    if (entityType !== 'tasks') {
      // TODO: Implement projects and areas in Phase 3
      const result: TaskListResult = {
        type: 'task-list',
        tasks: [],
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Scan all tasks from the vault
    let tasks = scanTasks(config);

    // Filter for active tasks by default
    tasks = tasks.filter((task) => isActiveTask(task, today));

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

    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(result, globalOpts));
  });
