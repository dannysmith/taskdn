/**
 * Types for calendar drag-and-drop ordering.
 * Display order is stored separately from entity data.
 */

// -----------------------------------------------------------------------------
// Order State
// -----------------------------------------------------------------------------

export interface CalendarOrder {
  // Order of tasks within each day (dateString -> array of taskIds)
  // Key format: "YYYY-MM-DD"
  taskOrderByDate: Record<string, string[]>
}

// -----------------------------------------------------------------------------
// Drag Item Types
// -----------------------------------------------------------------------------

export interface CalendarTaskDragData {
  type: 'calendar-task'
  taskId: string
  sourceDate: string
}

export interface DayDropData {
  type: 'day'
  date: string
}

// Prefixed IDs for dnd-kit to avoid collisions
export function getCalendarTaskDragId(date: string, taskId: string): string {
  return `calendar-task-${date}-${taskId}`
}

export function parseCalendarTaskDragId(
  dragId: string
): { date: string; taskId: string } | null {
  const match = dragId.match(/^calendar-task-(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!match) return null
  return { date: match[1], taskId: match[2] }
}
