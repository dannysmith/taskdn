/**
 * Core data types matching the Taskdn S1 specification.
 * These types represent the in-memory/JSON structure for UI exploration.
 *
 * NOTE: When integrating with tdn-desktop, these types will be replaced
 * by types generated via tauri-specta from the Rust backend. The shape
 * should remain similar, but source of truth moves to Rust.
 */

// -----------------------------------------------------------------------------
// Area
// -----------------------------------------------------------------------------

export type AreaStatus = 'active' | 'archived'

export interface Area {
  id: string
  title: string
  status?: AreaStatus
  type?: string // e.g., "client", "personal", "life-area"
  description?: string
  notes?: string // markdown body content
  // UI-only fields (not in spec, useful for exploration):
  icon?: string // emoji or lucide icon name
  color?: string // for visual grouping
}

// -----------------------------------------------------------------------------
// Project
// -----------------------------------------------------------------------------

export type ProjectStatus =
  | 'planning'
  | 'ready'
  | 'blocked'
  | 'in-progress'
  | 'paused'
  | 'done'

export interface Project {
  id: string
  title: string
  areaId?: string | null
  status?: ProjectStatus
  description?: string
  startDate?: string // ISO date
  endDate?: string // ISO date
  blockedBy?: string[] // array of Project IDs
  notes?: string // markdown body content
}

// -----------------------------------------------------------------------------
// Task
// -----------------------------------------------------------------------------

export type TaskStatus =
  | 'inbox'
  | 'icebox'
  | 'ready'
  | 'in-progress'
  | 'blocked'
  | 'dropped'
  | 'done'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  createdAt: string // ISO datetime
  updatedAt: string // ISO datetime
  completedAt?: string // ISO datetime
  areaId?: string // direct area reference (overrides project's area if set)
  projectId?: string // reference to a project
  due?: string // ISO date or datetime
  scheduled?: string // ISO date (for "today" / "upcoming" views)
  deferUntil?: string // ISO date (hide until this date)
  notes?: string // markdown body content
}

// -----------------------------------------------------------------------------
// App Data (top-level container)
// -----------------------------------------------------------------------------

export interface AppData {
  areas: Area[]
  projects: Project[]
  tasks: Task[]
}
