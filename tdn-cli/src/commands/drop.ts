import { Command } from '@commander-js/extra-typings';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskDroppedResult,
  BatchResult,
  DryRunResult,
} from '@/output/types.ts';
import { updateFileFields, parseTaskFile, type FieldUpdate, type Task } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { toKebabCase } from '@/output/helpers/index.ts';
import { detectEntityType } from '@/lib/entity-lookup.ts';

/**
 * Drop command - mark task(s) as dropped
 *
 * Usage:
 *   taskdn drop ~/tasks/foo.md                    # Drop single task
 *   taskdn drop ~/tasks/a.md ~/tasks/b.md         # Batch drop
 *   taskdn drop ~/tasks/foo.md --dry-run          # Preview without changes
 */

/**
 * Drop a single task.
 * Sets status to dropped and completed-at to now.
 */
function dropTask(taskPath: string): Task {
  const fullPath = resolve(taskPath);

  // Validate file exists
  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  // Validate this is a task (not a project or area)
  const entityType = detectEntityType(fullPath);
  if (entityType !== 'task') {
    throw createError.invalidEntityType('drop', entityType, ['task']);
  }

  // Build the updates
  const updates: FieldUpdate[] = [{ field: 'status', value: 'dropped' }];

  // updateFileFields handles completed-at automatically for done/dropped
  updateFileFields(fullPath, updates);

  // Re-read the updated task
  return parseTaskFile(fullPath);
}

/**
 * Preview dropping a task (for dry-run mode).
 */
function previewDropTask(taskPath: string): DryRunResult {
  const fullPath = resolve(taskPath);

  // Validate file exists
  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  // Validate this is a task (not a project or area)
  const entityType = detectEntityType(fullPath);
  if (entityType !== 'task') {
    throw createError.invalidEntityType('drop', entityType, ['task']);
  }

  // Read current task
  const task = parseTaskFile(fullPath);
  const now = new Date().toISOString().slice(0, 19);

  return {
    type: 'dry-run',
    operation: 'drop',
    entityType: 'task',
    title: task.title,
    path: fullPath,
    changes: [
      { field: 'status', oldValue: toKebabCase(task.status), newValue: 'dropped' },
      { field: 'completed-at', oldValue: task.completedAt, newValue: now },
    ],
  };
}

export const dropCommand = new Command('drop')
  .description('Mark task(s) as dropped')
  .argument('<paths...>', 'Path(s) to task file(s)')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (paths, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);
    const dryRun = options.dryRun ?? false;

    // Single path case
    if (paths.length === 1) {
      const singlePath = paths[0]!; // Commander guarantees at least one with <paths...>
      try {
        if (dryRun) {
          const result = previewDropTask(singlePath);
          console.log(formatOutput(result, globalOpts));
        } else {
          const task = dropTask(singlePath);
          const result: TaskDroppedResult = {
            type: 'task-dropped',
            task,
          };
          console.log(formatOutput(result, globalOpts));
        }
      } catch (error) {
        if (isCliError(error)) {
          console.error(formatError(error, mode));
        } else {
          const cliError = createError.parseError('', 0, String(error));
          console.error(formatError(cliError, mode));
        }
        process.exit(1);
      }
      return;
    }

    // Batch case - for dry-run, output previews
    if (dryRun) {
      for (const taskPath of paths) {
        try {
          const result = previewDropTask(taskPath);
          console.log(formatOutput(result, globalOpts));
        } catch (error) {
          if (isCliError(error)) {
            console.error(formatError(error, mode));
          }
        }
      }
      return;
    }

    // Batch case - process all, collect results
    const successes: BatchResult['successes'] = [];
    const failures: BatchResult['failures'] = [];

    for (const taskPath of paths) {
      try {
        const task = dropTask(taskPath);
        successes.push({
          path: task.path,
          title: task.title,
          task,
        });
      } catch (error) {
        if (isCliError(error)) {
          failures.push({
            path: taskPath,
            code: error.code,
            message: error.message,
          });
        } else {
          failures.push({
            path: taskPath,
            code: 'UNKNOWN',
            message: String(error),
          });
        }
      }
    }

    const result: BatchResult = {
      type: 'batch-result',
      operation: 'dropped',
      successes,
      failures,
    };

    console.log(formatOutput(result, globalOpts));

    // Exit code 1 if any failed
    if (failures.length > 0) {
      process.exit(1);
    }
  });
