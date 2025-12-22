import { Command } from '@commander-js/extra-typings';
import { formatOutput } from '@/output/index.ts';
import type { GlobalOptions } from '@/output/index.ts';

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
  .action((entityType, _options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;

    // Stub implementation - will call Rust for actual listing
    const result = {
      type: 'task-list',
      entityType,
      count: 0,
      items: [],
    };

    console.log(formatOutput(result, globalOpts));
  });
