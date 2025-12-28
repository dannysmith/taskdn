import type { Task, Project, Area } from '@bindings';

/**
 * Output mode enum
 */
export type OutputMode = 'human' | 'ai' | 'json' | 'ai-json';

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
  // ai-json mode: both flags present, wraps AI markdown in JSON envelope
  if (options.json && options.ai) return 'ai-json';
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
 * Projects grouped by status for area context
 * Per ai-context.md Section 5
 */
export interface ProjectsByStatus {
  inProgress: Project[];
  ready: Project[];
  planning: Project[];
  blocked: Project[];
  paused: Project[];
  done: Project[];
}

/**
 * Area-specific statistics
 */
export interface AreaStats {
  projectCount: number;
  activeTaskCount: number;
  overdueCount: number;
  dueTodayCount: number;
  inProgressCount: number;
}

/**
 * Area context result (from context area command)
 * Primary entity is the area, with related projects and tasks
 * Per ai-context.md Section 5
 */
export interface AreaContextResultOutput {
  type: 'area-context';
  area: Area;
  // Projects grouped by status (ALL projects including done)
  projectsByStatus: ProjectsByStatus;
  // All projects in this area (for convenience)
  projects: Project[];
  projectTasks: Map<string, Task[]>; // Tasks grouped by project path
  directTasks: Task[]; // Tasks directly in area (no project)
  // Timeline scoped to this area
  timeline: TimelineData;
  // Stats for this area
  stats: AreaStats;
  warnings: string[];
}

/**
 * Tasks grouped by status for project context
 * Per ai-context.md Section 6
 */
export interface TasksByStatus {
  inProgress: Task[];
  blocked: Task[];
  ready: Task[];
  inbox: Task[];
}

/**
 * Project-specific statistics
 */
export interface ProjectStats {
  activeTaskCount: number;
  overdueCount: number;
  dueTodayCount: number;
  inProgressCount: number;
  blockedCount: number;
}

/**
 * Project context result (from context project command)
 * Primary entity is the project, with parent area and tasks
 * Per ai-context.md Section 6
 */
export interface ProjectContextResultOutput {
  type: 'project-context';
  project: Project;
  area: Area | null; // Parent area if any
  // Tasks grouped by status
  tasksByStatus: TasksByStatus;
  // All active tasks (for convenience)
  tasks: Task[];
  // Timeline scoped to this project
  timeline: TimelineData;
  // Stats for this project
  stats: ProjectStats;
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
 * Timeline categorization for tasks
 * Per ai-context.md Section 4
 */
export interface TimelineData {
  overdue: Task[];
  dueToday: Task[];
  scheduledToday: Task[];
  newlyActionable: Task[]; // defer-until = today
  blocked: Task[];
  scheduledThisWeek: Map<string, Task[]>; // date string -> tasks
  recentlyModified: Task[]; // last 24h, excluding above categories
}

/**
 * Vault overview statistics
 */
export interface VaultStats {
  areaCount: number;
  projectCount: number;
  taskCount: number;
  overdueCount: number;
  dueTodayCount: number;
  inProgressCount: number;
}

/**
 * Vault overview result (from context --ai with no args)
 * Per ai-context.md Section 4
 */
export interface VaultOverviewResult {
  type: 'vault-overview';
  // Raw data
  areas: Area[];
  projects: Project[];
  tasks: Task[];
  // Computed relationships
  areaProjects: Map<string, Project[]>; // area path -> projects
  projectTasks: Map<string, Task[]>; // project path -> tasks
  directAreaTasks: Map<string, Task[]>; // area path -> direct tasks
  orphanProjects: Project[]; // projects with no area
  orphanTasks: Task[]; // tasks with no project or area
  // Timeline categorization
  timeline: TimelineData;
  // Stats
  stats: VaultStats;
}

// ============================================================================
// Create Result Types
// ============================================================================

/**
 * Result of creating a new task
 */
export interface TaskCreatedResult {
  type: 'task-created';
  task: Task;
}

/**
 * Result of creating a new project
 */
export interface ProjectCreatedResult {
  type: 'project-created';
  project: Project;
}

/**
 * Result of creating a new area
 */
export interface AreaCreatedResult {
  type: 'area-created';
  area: Area;
}

// ============================================================================
// Modify Result Types
// ============================================================================

/**
 * A single field change (for showing what was updated)
 */
export interface FieldChange {
  field: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Result of completing a task
 */
export interface TaskCompletedResult {
  type: 'task-completed';
  task: Task;
}

/**
 * Result of dropping a task
 */
export interface TaskDroppedResult {
  type: 'task-dropped';
  task: Task;
}

/**
 * Result of updating a task's status
 */
export interface TaskStatusChangedResult {
  type: 'task-status-changed';
  task: Task;
  previousStatus: string;
  dryRun?: boolean;
}

/**
 * Result of updating task fields
 */
export interface TaskUpdatedResult {
  type: 'task-updated';
  task: Task;
  changes: FieldChange[];
  dryRun?: boolean;
}

/**
 * Result of updating a project
 */
export interface ProjectUpdatedResult {
  type: 'project-updated';
  project: Project;
  changes: FieldChange[];
  dryRun?: boolean;
}

/**
 * Result of updating an area
 */
export interface AreaUpdatedResult {
  type: 'area-updated';
  area: Area;
  changes: FieldChange[];
  dryRun?: boolean;
}

/**
 * Result of archiving a file
 */
export interface ArchivedResult {
  type: 'archived';
  title: string;
  fromPath: string;
  toPath: string;
  dryRun?: boolean;
}

/**
 * Result of a batch operation (multiple files)
 */
export interface BatchResult {
  type: 'batch-result';
  operation: 'completed' | 'dropped' | 'status-changed' | 'updated' | 'archived';
  successes: Array<{
    path: string;
    title: string;
    task?: Task;
    toPath?: string; // for archive
  }>;
  failures: Array<{
    path: string;
    code: string;
    message: string;
  }>;
}

/**
 * Result of appending to a body
 */
export interface BodyAppendedResult {
  type: 'body-appended';
  entityType: 'task' | 'project' | 'area';
  title: string;
  path: string;
  appendedText: string;
  dryRun?: boolean;
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
  | TaskCreatedResult
  | ProjectCreatedResult
  | AreaCreatedResult
  | TaskCompletedResult
  | TaskDroppedResult
  | TaskStatusChangedResult
  | TaskUpdatedResult
  | ProjectUpdatedResult
  | AreaUpdatedResult
  | ArchivedResult
  | BatchResult
  | BodyAppendedResult
  | StubResult;

/**
 * Formatter interface - all output formatters implement this
 */
export interface Formatter {
  format(result: FormattableResult): string;
}
