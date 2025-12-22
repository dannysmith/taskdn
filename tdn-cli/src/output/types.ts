import type { Task } from '@bindings';

/**
 * Output mode enum
 */
export type OutputMode = 'human' | 'ai' | 'json';

/**
 * Global options available to all commands
 */
export interface GlobalOptions {
  ai?: boolean;
  json?: boolean;
}

/**
 * Determines the output mode from global flags
 */
export function getOutputMode(options: GlobalOptions): OutputMode {
  if (options.json) return 'json';
  if (options.ai) return 'ai';
  return 'human';
}

/**
 * Result types for formatting
 */
export interface TaskResult {
  type: 'task';
  task: Task;
}

export interface TaskListResult {
  type: 'task-list';
  tasks: Task[];
}

export interface StubResult {
  type: string;
  [key: string]: unknown;
}

export type FormattableResult = TaskResult | TaskListResult | StubResult;

/**
 * Formatter interface - all output formatters implement this
 */
export interface Formatter {
  format(result: FormattableResult): string;
}
