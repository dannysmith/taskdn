import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Task Detail Store - Controls which task is open in the detail panel.
 *
 * This store manages the state of the right sidebar detail panel.
 * It works in conjunction with ui-store.rightSidebarVisible:
 * - task-detail-store.openTaskId: WHAT is shown (which task)
 * - ui-store.rightSidebarVisible: WHETHER it's shown (panel visibility)
 *
 * When a task is opened, both stores are typically updated together:
 * 1. Call openTask(taskId) to set the task
 * 2. The RightSideBar component shows TaskDetailPanel based on openTaskId
 */

interface TaskDetailState {
  /** The ID of the task currently open in the detail panel, or null if closed */
  openTaskId: string | null
  /** Open the detail panel for a specific task */
  openTask: (taskId: string) => void
  /** Close the detail panel */
  closeTask: () => void
}

export const useTaskDetailStore = create<TaskDetailState>()(
  devtools(
    set => ({
      openTaskId: null,
      openTask: taskId => set({ openTaskId: taskId }, undefined, 'openTask'),
      closeTask: () => set({ openTaskId: null }, undefined, 'closeTask'),
    }),
    { name: 'task-detail-store' }
  )
)

/** Convenience selector for checking if the detail panel is open */
export const useIsTaskDetailOpen = () =>
  useTaskDetailStore(state => state.openTaskId !== null)
