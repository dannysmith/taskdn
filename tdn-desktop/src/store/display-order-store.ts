import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Display Order Store - Manages visual ordering of entities separate from data.
 *
 * This store tracks user-defined display order for:
 * - Sidebar areas and projects
 * - Inbox tasks
 * - (Future) Today view sections, calendar days, project/area task lists
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

interface DisplayOrderState {
  // Sidebar ordering
  sidebarAreaOrder: string[] | null
  sidebarProjectOrder: Record<string, string[]> | null

  // Inbox ordering
  inboxOrder: string[] | null

  // Actions for sidebar
  setSidebarAreaOrder: (order: string[]) => void
  setSidebarProjectOrder: (containerId: string, order: string[]) => void
  setSidebarProjectOrderBatch: (orders: Record<string, string[]>) => void

  // Actions for inbox
  setInboxOrder: (order: string[]) => void

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

      // Reset
      resetAllOrder: () =>
        set(
          {
            sidebarAreaOrder: null,
            sidebarProjectOrder: null,
            inboxOrder: null,
          },
          undefined,
          'resetAllOrder'
        ),
    }),
    { name: 'display-order-store' }
  )
)
