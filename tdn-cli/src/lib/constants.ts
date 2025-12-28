/**
 * Shared constants for task, project, and area statuses.
 * Ensures consistency across all commands (doctor, set status, update, etc.)
 *
 * All values conform to tdn-specs/S1-core.md
 */

/**
 * Valid task statuses per S1 spec Section 3.3 (kebab-case for YAML/output)
 */
export const VALID_TASK_STATUSES = [
  'inbox',
  'ready',
  'in-progress',
  'blocked',
  'icebox',
  'done',
  'dropped',
] as const;

/**
 * Valid project statuses per S1 spec Section 4.4 (kebab-case for YAML/output)
 */
export const VALID_PROJECT_STATUSES = [
  'planning',
  'ready',
  'in-progress',
  'blocked',
  'paused',
  'done',
] as const;

/**
 * Valid area statuses per S1 spec Section 5.4 (kebab-case for YAML/output)
 */
export const VALID_AREA_STATUSES = ['active', 'archived'] as const;

/**
 * Task statuses as returned by Rust (PascalCase for validation)
 * These match the Rust enum variant names after NAPI conversion
 */
export const RUST_TASK_STATUSES = [
  'Inbox',
  'Ready',
  'InProgress',
  'Blocked',
  'Icebox',
  'Done',
  'Dropped',
] as const;

/**
 * Project statuses as returned by Rust (PascalCase for validation)
 * These match the Rust enum variant names after NAPI conversion
 */
export const RUST_PROJECT_STATUSES = [
  'Planning',
  'Ready',
  'Blocked',
  'InProgress',
  'Paused',
  'Done',
] as const;

/**
 * Area statuses as returned by Rust (PascalCase for validation)
 * These match the Rust enum variant names after NAPI conversion
 */
export const RUST_AREA_STATUSES = ['Active', 'Archived'] as const;

/**
 * Task statuses that represent completion (require completed-at field)
 */
export const COMPLETION_STATUSES = ['done', 'dropped'] as const;

/**
 * Type definitions derived from constants
 */
export type TaskStatus = (typeof VALID_TASK_STATUSES)[number];
export type ProjectStatus = (typeof VALID_PROJECT_STATUSES)[number];
export type AreaStatus = (typeof VALID_AREA_STATUSES)[number];
