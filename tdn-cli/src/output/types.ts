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

export interface ProjectListResult {
  type: 'project-list';
  projects: Project[];
}

export interface AreaListResult {
  type: 'area-list';
  areas: Area[];
}

export interface StubResult {
  type: string;
  [key: string]: unknown;
}

// ============================================================================
// Context Result Types
// ============================================================================

/**
 * Area context result (from context area command)
 * Primary entity is the area, with related projects and tasks
 */
export interface AreaContextResultOutput {
  type: 'area-context';
  area: Area;
  projects: Project[]; // Projects in this area
  projectTasks: Map<string, Task[]>; // Tasks grouped by project path
  directTasks: Task[]; // Tasks directly in area (no project)
  warnings: string[];
}

/**
 * Project context result (from context project command)
 * Primary entity is the project, with parent area and tasks
 */
export interface ProjectContextResultOutput {
  type: 'project-context';
  project: Project;
  area: Area | null; // Parent area if any
  tasks: Task[]; // Tasks in this project
  warnings: string[];
}

/**
 * Task context result (from context task command)
 * Primary entity is the task, with parent project and area
 */
export interface TaskContextResultOutput {
  type: 'task-context';
  task: Task;
  project: Project | null; // Parent project if any
  area: Area | null; // Parent area (direct or via project)
  warnings: string[];
}

/**
 * Summary of an area for vault overview
 */
export interface AreaSummary {
  area: Area;
  projectCount: number;
  activeTaskCount: number;
}

/**
 * Overall vault statistics
 */
export interface VaultSummary {
  totalActiveTasks: number;
  overdueCount: number;
  inProgressCount: number;
}

/**
 * Tasks due/scheduled this week
 */
export interface ThisWeekSummary {
  dueTasks: Task[];
  scheduledTasks: Task[];
}

/**
 * Vault overview result (from context --ai with no args)
 */
export interface VaultOverviewResult {
  type: 'vault-overview';
  areas: AreaSummary[];
  summary: VaultSummary;
  thisWeek: ThisWeekSummary;
}

export type FormattableResult =
  | TaskResult
  | TaskListResult
  | ProjectResult
  | ProjectListResult
  | AreaResult
  | AreaListResult
  | AreaContextResultOutput
  | ProjectContextResultOutput
  | TaskContextResultOutput
  | VaultOverviewResult
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
