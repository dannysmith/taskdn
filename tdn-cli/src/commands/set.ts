import { Command } from '@commander-js/extra-typings';
import { formatOutput, getOutputMode } from '@/output/index.ts';
import type { GlobalOptions, TaskStatusChangedResult, OutputMode } from '@/output/types.ts';
import { updateFileFields, parseTaskFile, type FieldUpdate, type Task, createVaultSession, type VaultSession } from '@bindings';
import { createError, formatError, isCliError } from '@/errors/index.ts';
import { toKebabCase } from '@/output/helpers/index.ts';
import { lookupTask } from '@/lib/entity-lookup.ts';
import { processBatch } from '@/lib/batch.ts';
import { disambiguateTasks } from '@/lib/disambiguation.ts';
import { VALID_TASK_STATUSES, COMPLETION_STATUSES } from '@/lib/constants.ts';
import { getVaultConfig } from '@/config/index.ts';

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
 * Validate a status value against allowed values.
 */
function validateStatus(status: string): void {
  const normalized = status.toLowerCase();
  // Type assertion needed because VALID_TASK_STATUSES is readonly
  const validStatuses = VALID_TASK_STATUSES as readonly string[];
  if (!validStatuses.includes(normalized)) {
    throw createError.invalidStatus(status, [...VALID_TASK_STATUSES]);
  }
}

/**
 * Change a task's status.
 * Handles completed-at logic for done/dropped transitions.
 * Supports both path-based and fuzzy title-based lookup.
 * In human mode, shows interactive disambiguation for multiple matches.
 */
async function changeTaskStatus(
  taskQuery: string,
  newStatus: string,
  mode: OutputMode,
  session: VaultSession
): Promise<{ task: Task; previousStatus: string }> {
  // Look up the task (supports both paths and fuzzy matching)
  const config = getVaultConfig();
  const lookupResult = lookupTask(session, taskQuery, config);

  // Handle lookup results
  if (lookupResult.type === 'none') {
    throw createError.notFound('task', taskQuery);
  }

  let currentTask: Task;
  if (lookupResult.type === 'multiple') {
    // In human mode, show interactive disambiguation
    if (mode === 'human') {
      currentTask = await disambiguateTasks(taskQuery, lookupResult.matches, mode);
    } else {
      // In AI/JSON mode, throw ambiguous error
      const matchTitles = lookupResult.matches.map((t) => t.title);
      throw createError.ambiguous(taskQuery, matchTitles);
    }
  } else {
    // Single match (either exact path or single fuzzy match)
    currentTask = lookupResult.matches[0]!;
  }
  const fullPath = currentTask.path;
  const previousStatus = toKebabCase(currentTask.status);
  const normalizedNewStatus = newStatus.toLowerCase();

  // Build the updates
  const updates: FieldUpdate[] = [{ field: 'status', value: normalizedNewStatus }];

  // Handle completed-at transitions
  const completionStatuses = COMPLETION_STATUSES as readonly string[];
  const wasCompleted = completionStatuses.includes(previousStatus);
  const willBeCompleted = completionStatuses.includes(normalizedNewStatus);

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
 * In human mode, shows interactive disambiguation for multiple matches.
 */
async function previewStatusChange(
  taskQuery: string,
  newStatus: string,
  mode: OutputMode,
  session: VaultSession
): Promise<TaskStatusChangedResult> {
  // Look up the task (supports both paths and fuzzy matching)
  const config = getVaultConfig();
  const lookupResult = lookupTask(session, taskQuery, config);

  // Handle lookup results
  if (lookupResult.type === 'none') {
    throw createError.notFound('task', taskQuery);
  }

  let task: Task;
  if (lookupResult.type === 'multiple') {
    // In human mode, show interactive disambiguation
    if (mode === 'human') {
      task = await disambiguateTasks(taskQuery, lookupResult.matches, mode);
    } else {
      // In AI/JSON mode, throw ambiguous error
      const matchTitles = lookupResult.matches.map((t) => t.title);
      throw createError.ambiguous(taskQuery, matchTitles);
    }
  } else {
    // Single match (either exact path or single fuzzy match)
    task = lookupResult.matches[0]!;
  }
  const previousStatus = toKebabCase(task.status);
  const normalizedNewStatus = newStatus.toLowerCase();

  const completionStatuses = COMPLETION_STATUSES as readonly string[];
  const wasCompleted = completionStatuses.includes(previousStatus);
  const willBeCompleted = completionStatuses.includes(normalizedNewStatus);

  // Create updated task with new status
  const updatedTask = { ...task, status: normalizedNewStatus as Task['status'] };

  // Update completed-at if needed
  if (!wasCompleted && willBeCompleted) {
    const now = new Date().toISOString().slice(0, 19);
    updatedTask.completedAt = now;
  } else if (wasCompleted && !willBeCompleted) {
    updatedTask.completedAt = undefined;
  }

  return {
    type: 'task-status-changed',
    task: updatedTask,
    previousStatus,
    dryRun: true,
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

    // Create session once for reuse across all lookups
    const config = getVaultConfig();
    const session = createVaultSession(config);

    // Single path case
    if (paths.length === 1) {
      const singlePath = paths[0]!;
      try {
        if (dryRun) {
          const result = await previewStatusChange(singlePath, newStatus, mode, session);
          console.log(formatOutput(result, globalOpts));
        } else {
          const { task, previousStatus } = await changeTaskStatus(singlePath, newStatus, mode, session);
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
          const result = await previewStatusChange(taskPath, newStatus, mode, session);
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
    const result = await processBatch(
      paths,
      'status-changed',
      async (taskPath) => {
        const { task } = await changeTaskStatus(taskPath, newStatus, mode, session);
        return {
          path: task.path,
          title: task.title,
          task,
        };
      },
      (taskPath) => taskPath
    );

    console.log(formatOutput(result, globalOpts));

    // Exit code 1 if any failed
    if (result.failures.length > 0) {
      process.exit(1);
    }
  });

// Create the parent 'set' command
export const setCommand = new Command('set')
  .description('Set entity fields')
  .addCommand(setStatusCommand);
