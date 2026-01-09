import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Heading } from '@/types/headings'
import type { TaskStatus } from '@/lib/tauri-bindings'

/**
 * Display Order Store - Manages visual ordering of entities separate from data.
 *
 * This store tracks user-defined display order for:
 * - Sidebar areas and projects
 * - Inbox tasks
 * - Today view sections
 * - Project/area task lists
 * - Kanban column ordering (per-view, per-status)
 *
 * Order is session-persistent (survives component unmount, lost on app restart).
 * Disk persistence will be added later via Rust commands + TanStack Query.
 *
 * Design:
 * - null means "use natural order from data"
 * - non-null array means "use this explicit order"
 * - hooks filter out deleted IDs and append new IDs automatically
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Section identifiers for Today view */
export type TodaySectionId =
  | 'scheduled-today'
  | 'overdue-due-today'
  | 'became-available-today'

/**
 * Kanban column order storage.
 * Structure: { viewId: { status: taskIds[] } }
 * - viewId is the project or area ID the kanban is showing
 * - status is the column (ready, in-progress, etc.)
 * - taskIds is the ordered list of task IDs in that column
 */
export type KanbanColumnOrder = Record<
  string,
  Partial<Record<TaskStatus, string[]>>
>

interface DisplayOrderState {
  // Sidebar ordering
  sidebarAreaOrder: string[] | null
  sidebarProjectOrder: Record<string, string[]> | null

  // Inbox ordering
  inboxOrder: string[] | null

  // Project task ordering (per-project)
  projectTaskOrder: Record<string, string[]> | null

  // Area task ordering (per-area, for loose tasks and per-project within area)
  areaTaskOrder: Record<string, string[]> | null

  // Today view section ordering (per-section)
  todaySectionOrder: Partial<Record<TodaySectionId, string[]>> | null

  // Today view headings (UI-only, session-persistent)
  todayHeadings: Record<string, Heading> | null

  // Kanban column ordering (per-view, per-status)
  kanbanColumnOrder: KanbanColumnOrder | null

  // Actions for sidebar
  setSidebarAreaOrder: (order: string[]) => void
  setSidebarProjectOrder: (containerId: string, order: string[]) => void
  setSidebarProjectOrderBatch: (orders: Record<string, string[]>) => void

  // Actions for inbox
  setInboxOrder: (order: string[]) => void

  // Actions for project tasks
  setProjectTaskOrder: (projectId: string, order: string[]) => void

  // Actions for area tasks
  setAreaTaskOrder: (areaId: string, order: string[]) => void

  // Actions for today sections
  setTodaySectionOrder: (sectionId: TodaySectionId, order: string[]) => void

  // Actions for today headings
  setTodayHeading: (headingId: string, heading: Heading) => void
  deleteTodayHeading: (headingId: string) => void

  // Actions for kanban columns
  setKanbanColumnOrder: (
    viewId: string,
    status: TaskStatus,
    order: string[]
  ) => void

  // Reset (for testing or clearing)
  resetAllOrder: () => void
}

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

export const useDisplayOrderStore = create<DisplayOrderState>()(
  devtools(
    set => ({
      // Initial state: null = use natural order
      sidebarAreaOrder: null,
      sidebarProjectOrder: null,
      inboxOrder: null,
      projectTaskOrder: null,
      areaTaskOrder: null,
      todaySectionOrder: null,
      todayHeadings: null,
      kanbanColumnOrder: null,

      // Sidebar actions
      setSidebarAreaOrder: order =>
        set({ sidebarAreaOrder: order }, undefined, 'setSidebarAreaOrder'),

      setSidebarProjectOrder: (containerId, order) =>
        set(
          state => ({
            sidebarProjectOrder: {
              ...state.sidebarProjectOrder,
              [containerId]: order,
            },
          }),
          undefined,
          'setSidebarProjectOrder'
        ),

      setSidebarProjectOrderBatch: orders =>
        set(
          state => ({
            sidebarProjectOrder: {
              ...state.sidebarProjectOrder,
              ...orders,
            },
          }),
          undefined,
          'setSidebarProjectOrderBatch'
        ),

      // Inbox actions
      setInboxOrder: order =>
        set({ inboxOrder: order }, undefined, 'setInboxOrder'),

      // Project task actions
      setProjectTaskOrder: (projectId, order) =>
        set(
          state => ({
            projectTaskOrder: {
              ...state.projectTaskOrder,
              [projectId]: order,
            },
          }),
          undefined,
          'setProjectTaskOrder'
        ),

      // Area task actions
      setAreaTaskOrder: (areaId, order) =>
        set(
          state => ({
            areaTaskOrder: {
              ...state.areaTaskOrder,
              [areaId]: order,
            },
          }),
          undefined,
          'setAreaTaskOrder'
        ),

      // Today section actions
      setTodaySectionOrder: (sectionId, order) =>
        set(
          state => ({
            todaySectionOrder: {
              ...state.todaySectionOrder,
              [sectionId]: order,
            },
          }),
          undefined,
          'setTodaySectionOrder'
        ),

      // Today heading actions
      setTodayHeading: (headingId, heading) =>
        set(
          state => ({
            todayHeadings: {
              ...state.todayHeadings,
              [headingId]: heading,
            },
          }),
          undefined,
          'setTodayHeading'
        ),

      deleteTodayHeading: headingId =>
        set(
          state => {
            if (!state.todayHeadings) return state
            const { [headingId]: _, ...rest } = state.todayHeadings
            return { todayHeadings: Object.keys(rest).length > 0 ? rest : null }
          },
          undefined,
          'deleteTodayHeading'
        ),

      // Kanban column actions
      setKanbanColumnOrder: (viewId, status, order) =>
        set(
          state => ({
            kanbanColumnOrder: {
              ...state.kanbanColumnOrder,
              [viewId]: {
                ...(state.kanbanColumnOrder?.[viewId] ?? {}),
                [status]: order,
              },
            },
          }),
          undefined,
          'setKanbanColumnOrder'
        ),

      // Reset
      resetAllOrder: () =>
        set(
          {
            sidebarAreaOrder: null,
            sidebarProjectOrder: null,
            inboxOrder: null,
            projectTaskOrder: null,
            areaTaskOrder: null,
            todaySectionOrder: null,
            todayHeadings: null,
            kanbanColumnOrder: null,
          },
          undefined,
          'resetAllOrder'
        ),
    }),
    { name: 'display-order-store' }
  )
)
