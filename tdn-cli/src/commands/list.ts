import { Command } from '@commander-js/extra-typings';
import { formatOutput } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskListResult,
  ProjectListResult,
  AreaListResult,
} from '@/output/index.ts';
import { getVaultConfig } from '@/config/index.ts';
import { normalizeEntityType } from '@/lib/entity-type.ts';
import { listTasks, listProjects, listAreas, type ListOptions } from '@/lib/list-entities.ts';

/**
 * List command - list entities with optional filters
 *
 * Usage:
 *   tdn list                           # List tasks (default)
 *   tdn list tasks                     # List tasks (explicit)
 *   tdn list task                      # Singular form also supported
 *   tdn list projects                  # List projects
 *   tdn list project                   # Singular form also supported
 *   tdn list areas                     # List areas
 *   tdn list --status ready            # Filter by status
 *   tdn list --project "Q1"            # Filter by project
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

    // Normalize entity type to support both singular and plural forms
    const normalizedType = normalizeEntityType(entityType, 'plural');

    // Dispatch to appropriate entity list function
    if (normalizedType === 'projects') {
      const projects = listProjects(config, options);
      const result: ProjectListResult = {
        type: 'project-list',
        projects,
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    if (normalizedType === 'areas') {
      const areas = listAreas(config, options);
      const result: AreaListResult = {
        type: 'area-list',
        areas,
      };
      console.log(formatOutput(result, globalOpts));
      return;
    }

    // Default to tasks
    const tasks = listTasks(config, options);
    const result: TaskListResult = {
      type: 'task-list',
      tasks,
    };
    console.log(formatOutput(result, globalOpts));
  });
