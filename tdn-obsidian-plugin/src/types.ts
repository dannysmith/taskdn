/**
 * Valid task statuses per S1 spec
 */
export type TaskStatus =
  | "inbox"
  | "icebox"
  | "ready"
  | "in-progress"
  | "blocked"
  | "dropped"
  | "done";

/**
 * Data extracted from a task file's frontmatter
 */
export interface TaskData {
  title: string;
  status: TaskStatus;
  due?: string;
  scheduled?: string;
  deferUntil?: string;
  projects?: string[];
  area?: string;
  completedAt?: string;
}

/**
 * Plugin settings
 */
export interface TaskdnSettings {
  tasksDirectory: string;
  defaultStatus: TaskStatus;
}

export const DEFAULT_SETTINGS: TaskdnSettings = {
  tasksDirectory: "tasks",
  defaultStatus: "inbox",
};
