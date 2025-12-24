import { Command } from '@commander-js/extra-typings';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskCompletedResult,
  BatchResult,
  DryRunResult,
} from '@/output/types.ts';
import { updateFileFields, parseTaskFile, type FieldUpdate, type Task } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { toKebabCase } from '@/output/helpers/index.ts';
import { detectEntityType } from '@/lib/entity-lookup.ts';

/**
 * Complete command - mark task(s) as done
 *
 * Usage:
 *   taskdn complete ~/tasks/foo.md                    # Complete single task
 *   taskdn complete ~/tasks/a.md ~/tasks/b.md         # Batch complete
 *   taskdn complete ~/tasks/foo.md --dry-run          # Preview without changes
 */

/**
 * Complete a single task.
 * Sets status to done and completed-at to now.
 */
function completeTask(taskPath: string): Task {
  const fullPath = resolve(taskPath);

  // Validate file exists
  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  // Validate this is a task (not a project or area)
  const entityType = detectEntityType(fullPath);
  if (entityType !== 'task') {
    throw createError.invalidEntityType('complete', entityType, ['task']);
  }

  // Build the updates
  const updates: FieldUpdate[] = [{ field: 'status', value: 'done' }];

  // updateFileFields handles completed-at automatically for done/dropped
  updateFileFields(fullPath, updates);

  // Re-read the updated task
  return parseTaskFile(fullPath);
}

/**
 * Preview completing a task (for dry-run mode).
 */
function previewCompleteTask(taskPath: string): DryRunResult {
  const fullPath = resolve(taskPath);

  // Validate file exists
  if (!existsSync(fullPath)) {
    throw createError.notFound('task', taskPath);
  }

  // Validate this is a task (not a project or area)
  const entityType = detectEntityType(fullPath);
  if (entityType !== 'task') {
    throw createError.invalidEntityType('complete', entityType, ['task']);
  }

  // Read current task
  const task = parseTaskFile(fullPath);
  const now = new Date().toISOString().slice(0, 19);

  return {
    type: 'dry-run',
    operation: 'complete',
    entityType: 'task',
    title: task.title,
    path: fullPath,
    changes: [
      { field: 'status', oldValue: toKebabCase(task.status), newValue: 'done' },
      { field: 'completed-at', oldValue: task.completedAt, newValue: now },
    ],
  };
}

export const completeCommand = new Command('complete')
  .description('Mark task(s) as done')
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
          const result = previewCompleteTask(singlePath);
          console.log(formatOutput(result, globalOpts));
        } else {
          const task = completeTask(singlePath);
          const result: TaskCompletedResult = {
            type: 'task-completed',
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

    // Batch case - process all, collect results
    // For dry-run, just output previews for each
    if (dryRun) {
      for (const taskPath of paths) {
        try {
          const result = previewCompleteTask(taskPath);
          console.log(formatOutput(result, globalOpts));
        } catch (error) {
          if (isCliError(error)) {
            console.error(formatError(error, mode));
          }
        }
      }
      return;
    }

    const successes: BatchResult['successes'] = [];
    const failures: BatchResult['failures'] = [];

    for (const taskPath of paths) {
      try {
        const task = completeTask(taskPath);
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
      operation: 'completed',
      successes,
      failures,
    };

    console.log(formatOutput(result, globalOpts));

    // Exit code 1 if any failed
    if (failures.length > 0) {
      process.exit(1);
    }
  });
