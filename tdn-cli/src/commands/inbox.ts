import { Command } from '@commander-js/extra-typings';
import { scanTasks } from '@bindings';
import { formatOutput } from '@/output/index.ts';
import type { GlobalOptions, TaskListResult } from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';

/**
 * Inbox command - show tasks with inbox status
 *
 * Usage:
 *   taskdn inbox           # Human-readable output
 *   taskdn inbox --ai      # AI-friendly markdown
 *   taskdn inbox --json    # JSON output
 */
export const inboxCommand = new Command('inbox')
  .description('Show tasks with inbox status')
  .action((_options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const config = getVaultConfig();

    let tasks = scanTasks(config);

    // Filter for inbox status only
    tasks = tasks.filter((task) => task.status === 'Inbox');

    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };

    console.log(formatOutput(result, globalOpts));
  });
