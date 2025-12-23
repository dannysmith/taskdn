import type { Task, Project, Area } from '@bindings';

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

export interface ProjectResult {
  type: 'project';
  project: Project;
}

export interface AreaResult {
  type: 'area';
  area: Area;
}

export interface StubResult {
  type: string;
  [key: string]: unknown;
}

export type FormattableResult =
  | TaskResult
  | TaskListResult
  | ProjectResult
  | AreaResult
  | StubResult;

/**
 * Formatter interface - all output formatters implement this
 */
export interface Formatter {
  format(result: FormattableResult): string;
}

/**
 * Convert PascalCase to kebab-case (e.g., "InProgress" -> "in-progress")
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}
