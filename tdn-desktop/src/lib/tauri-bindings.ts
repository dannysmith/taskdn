/**
 * Re-export generated Tauri bindings with project conventions
 *
 * This file provides type-safe access to all Tauri commands.
 * Types are auto-generated from Rust by tauri-specta.
 *
 * @example
 * ```typescript
 * import { commands, unwrapResult } from '@/lib/tauri-bindings'
 *
 * // In TanStack Query - let errors propagate
 * const prefs = unwrapResult(await commands.loadPreferences())
 *
 * // In event handlers - explicit error handling
 * const result = await commands.savePreferences(prefs)
 * if (result.status === 'error') {
 *   toast.error(result.error)
 * }
 * ```
 *
 * @see docs/developer/tauri-commands.md for full documentation
 */

export { commands } from './bindings'
export type {
  AppPreferences,
  Area,
  AreaStatus,
  CliConfig,
  CliConfigError,
  CreateProjectOptions,
  CreateTaskOptions,
  DemoVaultPaths,
  Value as JsonValue,
  Project,
  ProjectStatus,
  ProjectUpdate,
  RecoveryError,
  Task,
  TaskStatus,
  TaskUpdate,
  VaultError,
} from './bindings'

/** What a command that returns a Rust `Result` resolves to. */
export type Result<T, E> =
  { status: 'ok'; data: T } | { status: 'error'; error: E }

/**
 * Helper to unwrap a Result type, throwing on error
 */
export function unwrapResult<T, E>(result: Result<T, E>): T {
  if (result.status === 'ok') {
    return result.data
  }
  throw result.error
}
