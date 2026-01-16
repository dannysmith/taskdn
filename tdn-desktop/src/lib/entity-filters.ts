/**
 * Pure filter functions for active areas and projects.
 *
 * These are extracted here to be shared across:
 * - React hooks (useVaultHelpers in vault.ts)
 * - Command registry (getDynamicNavigationCommands)
 * - Menu builder (buildGoMenu)
 */

import type { Area, Project } from '@/lib/tauri-bindings'

/**
 * Filter areas to only include active (non-archived) ones.
 */
export function filterActiveAreas(areas: Area[]): Area[] {
  return areas.filter(a => a.status !== 'archived')
}

/**
 * Filter projects to only include active ones (not done or paused).
 */
export function filterActiveProjects(projects: Project[]): Project[] {
  return projects.filter(p => p.status !== 'done' && p.status !== 'paused')
}
