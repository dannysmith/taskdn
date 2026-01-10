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

interface TaskDetailState {
  /** The ID of the task currently open in the detail panel, or null if closed */
  openTaskId: string | null
  /** Set which task is shown in the detail panel (does NOT auto-show sidebar) */
  setOpenTaskId: (taskId: string | null) => void
  /** Open the detail panel for a specific task (also shows right sidebar) */
  openTask: (taskId: string) => void
  /** Close the detail panel */
  closeTask: () => void
}

export const useTaskDetailStore = create<TaskDetailState>()(
  devtools(
    set => ({
      openTaskId: null,
      setOpenTaskId: taskId =>
        set({ openTaskId: taskId }, undefined, 'setOpenTaskId'),
      openTask: taskId => {
        set({ openTaskId: taskId }, undefined, 'openTask')
        // Also ensure the right sidebar is visible
        useUIStore.getState().setRightSidebarVisible(true)
      },
      closeTask: () => set({ openTaskId: null }, undefined, 'closeTask'),
    }),
    { name: 'task-detail-store' }
  )
)
