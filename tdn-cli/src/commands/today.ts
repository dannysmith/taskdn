import { Command } from '@commander-js/extra-typings';
import { scanTasks } from '@bindings';
import { formatOutput } from '@/output/index.ts';
import type { GlobalOptions, TaskListResult } from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';
import {
  getToday,
  isOverdue,
  isDueToday,
  isScheduledToday,
  isNewlyActionable,
} from '@/output/helpers/index.ts';

/**
 * Today command - show tasks relevant for today
 *
 * Shows tasks that are:
 * - Due today
 * - Scheduled for today
 * - Overdue (due before today)
 * - Newly actionable (defer-until is today)
 * - In progress
 *
 * Usage:
 *   tdn today           # Human-readable output
 *   tdn today --ai      # AI-friendly markdown
 *   tdn today --json    # JSON output
 */
export const todayCommand = new Command('today')
  .description(
    "Show today's tasks: due/scheduled today, overdue, newly actionable, and in-progress"
  )
  .action((_options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();
    const today = getToday();

    let tasks = scanTasks(config);

    // First, filter for active tasks (exclude done, dropped, icebox, deferred, archived)
    tasks = tasks.filter((task) => {
      // Exclude closed statuses
      if (task.status === 'Done' || task.status === 'Dropped' || task.status === 'Icebox') {
        return false;
      }

      // Exclude deferred tasks (defer-until > today)
      // BUT keep tasks where defer-until === today (newly actionable)
      if (task.deferUntil && task.deferUntil > today) {
        return false;
      }

      // Exclude archived
      if (task.path.includes('/archive/')) {
        return false;
      }

      return true;
    });

    // Now filter for "today" criteria (OR logic)
    tasks = tasks.filter((task) => {
      // In-progress tasks are always shown
      if (task.status === 'InProgress') {
        return true;
      }

      // Overdue tasks
      if (isOverdue(task, today)) {
        return true;
      }

      // Due today
      if (isDueToday(task, today)) {
        return true;
      }

      // Scheduled today
      if (isScheduledToday(task, today)) {
        return true;
      }

      // Newly actionable (defer-until is today)
      if (isNewlyActionable(task, today)) {
        return true;
      }

      return false;
    });

    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(result, globalOpts));
  });
