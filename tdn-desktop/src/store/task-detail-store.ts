import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useUIStore } from './ui-store'

/**
 * Task Detail Store - Controls which task is open in the detail panel.
 *
 * This store manages the state of the right sidebar detail panel.
 * It works in conjunction with ui-store.rightSidebarVisible:
 * - task-detail-store.openTaskId: WHAT is shown (which task)
 * - ui-store.rightSidebarVisible: WHETHER it's shown (panel visibility)
 *
 * When a task is opened via openTask():
 * 1. Sets openTaskId to the task
 * 2. Ensures the right sidebar is visible
 */

/** Fields that can be focused when opening a task */
export type FocusableField = 'scheduled' | 'due' | 'defer' | 'status' | null

interface TaskDetailState {
  /** The ID of the task currently open in the detail panel, or null if closed */
  openTaskId: string | null
  /** Field to focus/open when the panel renders (cleared after use) */
  pendingFocusField: FocusableField
  /** Set which task is shown in the detail panel (does NOT auto-show sidebar) */
  setOpenTaskId: (taskId: string | null) => void
  /** Open the detail panel for a specific task (also shows right sidebar) */
  openTask: (taskId: string, focusField?: FocusableField) => void
  /** Close the detail panel */
  closeTask: () => void
  /** Clear the pending focus field (called after focusing) */
  clearPendingFocus: () => void
  /** Focus a field in the already-open task (shows sidebar if hidden) */
  focusField: (field: FocusableField) => void
}

export const useTaskDetailStore = create<TaskDetailState>()(
  devtools(
    set => ({
      openTaskId: null,
      pendingFocusField: null,
      setOpenTaskId: taskId =>
        set({ openTaskId: taskId }, undefined, 'setOpenTaskId'),
      openTask: (taskId, focusField = null) => {
        set(
          { openTaskId: taskId, pendingFocusField: focusField },
          undefined,
          'openTask'
        )
        // Also ensure the right sidebar is visible
        useUIStore.getState().setRightSidebarVisible(true)
      },
      closeTask: () =>
        set(
          { openTaskId: null, pendingFocusField: null },
          undefined,
          'closeTask'
        ),
      clearPendingFocus: () =>
        set({ pendingFocusField: null }, undefined, 'clearPendingFocus'),
      focusField: field => {
        set({ pendingFocusField: field }, undefined, 'focusField')
        // Ensure the sidebar is visible so user can see the focused field
        useUIStore.getState().setRightSidebarVisible(true)
      },
    }),
    { name: 'task-detail-store' }
  )
)
