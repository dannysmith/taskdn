import { Command } from '@commander-js/extra-typings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type {
  GlobalOptions,
  TaskStatusChangedResult,
  BatchResult,
  DryRunResult,
  FieldChange,
} from '@/output/types.ts';
import { updateFileFields, parseTaskFile, type FieldUpdate, type Task } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { toKebabCase } from '@/output/helpers/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';

/**
 * Set command - parent command for setting entity fields
 *
 * Currently only implements 'set status', which consolidates the old
 * complete, drop, and status commands.
 *
 * Usage:
 *   taskdn set status ~/tasks/foo.md done
 *   taskdn set status ~/tasks/foo.md ready
 *   taskdn set status ~/tasks/a.md ~/tasks/b.md blocked    # Batch
 */

/**
 * Valid task statuses (kebab-case)
 */
const VALID_STATUSES = ['inbox', 'icebox', 'ready', 'in-progress', 'blocked', 'done', 'dropped'];

/**
 * Statuses that represent completion (need completed-at)
 */
const COMPLETION_STATUSES = ['done', 'dropped'];

/**
 * Validate a status value against allowed values.
 */
function validateStatus(status: string): void {
  const normalized = status.toLowerCase();
  if (!VALID_STATUSES.includes(normalized)) {
    throw createError.invalidStatus(status, VALID_STATUSES);
  }
}

/**
 * Change a task's status.
 * Handles completed-at logic for done/dropped transitions.
 * Supports both path-based and fuzzy title-based lookup.
 */
function changeTaskStatus(
  taskQuery: string,
  newStatus: string
): { task: Task; previousStatus: string } {
  // Look up the task (supports both paths and fuzzy matching)
  const lookupResult = lookupTask(taskQuery);

  // Handle lookup results
  if (lookupResult.type === 'none') {
    throw createError.notFound('task', taskQuery);
  }

  if (lookupResult.type === 'multiple') {
    // Multiple matches - return ambiguous error with all match titles
    const matchTitles = lookupResult.matches.map((t) => t.title);
    throw createError.ambiguous(taskQuery, matchTitles);
  }

  // Single match (either exact path or single fuzzy match)
  const currentTask = lookupResult.matches[0]!;
  const fullPath = currentTask.path;
  const previousStatus = toKebabCase(currentTask.status);
  const normalizedNewStatus = newStatus.toLowerCase();

  // Build the updates
  const updates: FieldUpdate[] = [{ field: 'status', value: normalizedNewStatus }];

  // Handle completed-at transitions
  const wasCompleted = COMPLETION_STATUSES.includes(previousStatus);
  const willBeCompleted = COMPLETION_STATUSES.includes(normalizedNewStatus);

  if (!wasCompleted && willBeCompleted) {
    // Moving TO a completion status: completed-at will be set automatically by updateFileFields
    // Nothing extra needed - Rust handles this
  } else if (wasCompleted && !willBeCompleted) {
    // Moving FROM a completion status to a non-completion status: clear completed-at
    updates.push({ field: 'completed-at', value: undefined });
  }

  // Update the file
  updateFileFields(fullPath, updates);

  // Re-read the updated task
  const updatedTask = parseTaskFile(fullPath);

  return { task: updatedTask, previousStatus };
}

/**
 * Preview status change (for dry-run mode).
 * Supports both path-based and fuzzy title-based lookup.
 */
function previewStatusChange(taskQuery: string, newStatus: string): DryRunResult {
  // Look up the task (supports both paths and fuzzy matching)
  const lookupResult = lookupTask(taskQuery);

  // Handle lookup results
  if (lookupResult.type === 'none') {
    throw createError.notFound('task', taskQuery);
  }

  if (lookupResult.type === 'multiple') {
    // Multiple matches - return ambiguous error with all match titles
    const matchTitles = lookupResult.matches.map((t) => t.title);
    throw createError.ambiguous(taskQuery, matchTitles);
  }

  // Single match (either exact path or single fuzzy match)
  const task = lookupResult.matches[0]!;
  const previousStatus = toKebabCase(task.status);
  const normalizedNewStatus = newStatus.toLowerCase();

  const wasCompleted = COMPLETION_STATUSES.includes(previousStatus);
  const willBeCompleted = COMPLETION_STATUSES.includes(normalizedNewStatus);

  const changes: FieldChange[] = [
    { field: 'status', oldValue: previousStatus, newValue: normalizedNewStatus },
  ];

  if (!wasCompleted && willBeCompleted) {
    const now = new Date().toISOString().slice(0, 19);
    changes.push({ field: 'completed-at', oldValue: task.completedAt, newValue: now });
  } else if (wasCompleted && !willBeCompleted) {
    changes.push({ field: 'completed-at', oldValue: task.completedAt, newValue: undefined });
  }

  return {
    type: 'dry-run',
    operation: 'set-status',
    entityType: 'task',
    title: task.title,
    path: task.path,
    changes,
  };
}

// Create the 'set status' subcommand
const setStatusCommand = new Command('status')
  .description('Change task status (auto-manages completed-at field)')
  .argument('<args...>', 'Path(s) followed by status value')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (args, options, command) => {
    const globalOpts = command.optsWithGlobals() as GlobalOptions;
    const mode = getOutputMode(globalOpts);
    const dryRun = options.dryRun ?? false;

    // The last argument is the status, everything before is paths
    if (args.length < 2) {
      console.error('Error: set status command requires at least one path and a status');
      process.exit(2);
    }

    const newStatus = args[args.length - 1]!;
    const paths = args.slice(0, -1);

    // Validate status upfront
    try {
      validateStatus(newStatus);
    } catch (error) {
      if (isCliError(error)) {
        console.error(formatError(error, mode));
      } else {
        console.error(String(error));
      }
      process.exit(1);
    }

    // Single path case
    if (paths.length === 1) {
      const singlePath = paths[0]!;
      try {
        if (dryRun) {
          const result = previewStatusChange(singlePath, newStatus);
          console.log(formatOutput(result, globalOpts));
        } else {
          const { task, previousStatus } = changeTaskStatus(singlePath, newStatus);
          const result: TaskStatusChangedResult = {
            type: 'task-status-changed',
            task,
            previousStatus,
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

    // Batch case - for dry-run, output previews for each
    if (dryRun) {
      for (const taskPath of paths) {
        try {
          const result = previewStatusChange(taskPath, newStatus);
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
        const { task } = changeTaskStatus(taskPath, newStatus);
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
      operation: 'status-changed',
      successes,
      failures,
    };

    console.log(formatOutput(result, globalOpts));

    // Exit code 1 if any failed
    if (failures.length > 0) {
      process.exit(1);
    }
  });

// Create the parent 'set' command
export const setCommand = new Command('set')
  .description('Set entity fields')
  .addCommand(setStatusCommand);
