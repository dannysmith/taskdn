/**
 * Types for sidebar drag-and-drop ordering.
 * Display order is stored separately from entity data.
 */

// Special container ID for projects with no area
export const ORPHAN_CONTAINER_ID = '__orphan__'

// -----------------------------------------------------------------------------
// Order State
// -----------------------------------------------------------------------------

export interface SidebarOrder {
  // Order of areas in the sidebar (array of area IDs)
  areaOrder: string[]

  // Order of projects within each area (areaId -> array of projectIds)
  // Key "__orphan__" holds order for projects with no area
  projectOrder: Record<string, string[]>
}

// -----------------------------------------------------------------------------
// Drag Item Types
// -----------------------------------------------------------------------------

export type DragItemType = 'area' | 'project'

export interface DragItem {
  type: DragItemType
  id: string // Original entity ID (e.g., "health-1")
  containerId: string | null // Area ID, "__orphan__", or null for areas
}

// Prefixed IDs for dnd-kit to avoid collisions
export function getDragId(type: DragItemType, id: string): string {
  return `${type}-${id}`
}

export function parseDragId(
  dragId: string
): { type: DragItemType; id: string } | null {
  const match = dragId.match(/^(area|project)-(.+)$/)
  if (!match) return null
  return { type: match[1] as DragItemType, id: match[2] }
}
