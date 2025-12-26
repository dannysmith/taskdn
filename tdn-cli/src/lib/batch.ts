/**
 * Generic batch operation utilities
 *
 * Provides a unified interface for batch processing operations with
 * success/failure tracking and error handling.
 */

import { isCliError } from '@/errors/index.ts';
import type { Task, Project } from '@bindings';

/**
 * Success info for batch operations.
 * Different operations may include different fields.
 */
export interface BatchSuccessInfo {
  path: string;
  title: string;
  task?: Task;
  project?: Project;
  toPath?: string; // for archive operations
}

/**
 * Failure info for batch operations.
 */
export interface BatchFailureInfo {
  path: string;
  code: string;
  message: string;
}

/**
 * Result of a batch operation.
 */
export interface BatchResult {
  type: 'batch-result';
  operation: 'completed' | 'dropped' | 'status-changed' | 'updated' | 'archived';
  successes: BatchSuccessInfo[];
  failures: BatchFailureInfo[];
}

/**
 * Process a batch of items with unified success/failure tracking.
 *
 * @param items - Array of items to process
 * @param operation - The operation type for the result
 * @param processor - Function that processes each item and returns success info
 * @param extractPath - Function to extract the path from an item (for error reporting)
 * @returns BatchResult with successes and failures
 *
 * @example
 * const result = processBatch(
 *   taskPaths,
 *   'status-changed',
 *   (path) => {
 *     const { task } = changeTaskStatus(path, 'Done');
 *     return { path: task.path, title: task.title, task };
 *   },
 *   (path) => path
 * );
 */
export function processBatch<TInput>(
  items: TInput[],
  operation: BatchResult['operation'],
  processor: (item: TInput) => BatchSuccessInfo,
  extractPath: (item: TInput) => string
): BatchResult {
  const successes: BatchSuccessInfo[] = [];
  const failures: BatchFailureInfo[] = [];

  for (const item of items) {
    try {
      const result = processor(item);
      successes.push(result);
    } catch (error) {
      const path = extractPath(item);
      if (isCliError(error)) {
        failures.push({
          path,
          code: error.code,
          message: error.message,
        });
      } else {
        failures.push({
          path,
          code: 'UNKNOWN',
          message: String(error),
        });
      }
    }
  }

  return {
    type: 'batch-result',
    operation,
    successes,
    failures,
  };
}
