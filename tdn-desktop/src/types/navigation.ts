/**
 * Navigation types for sidebar/view routing.
 *
 * These types define the selection state for the sidebar and which view
 * is currently active. They are UI-specific and will remain after Task 2
 * (not replaced by tauri-specta types).
 */

export type NavId = 'today' | 'this-week' | 'inbox' | 'calendar'

/** Dev-only nav IDs - only available when import.meta.env.DEV is true */
export type DevNavId = 'component-reference'

export type Selection =
  | { type: 'nav'; id: NavId }
  | { type: 'dev-nav'; id: DevNavId }
  | { type: 'area'; id: string }
  | { type: 'project'; id: string }
  | { type: 'no-area' }
