import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

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
    (set) => ({
      openTaskId: null,
      openTask: (taskId) => set({ openTaskId: taskId }, undefined, 'openTask'),
      closeTask: () => set({ openTaskId: null }, undefined, 'closeTask'),
    }),
    { name: 'task-detail-store' }
  )
)

/** Convenience selector for checking if the detail panel is open */
export const useIsTaskDetailOpen = () =>
  useTaskDetailStore((state) => state.openTaskId !== null)
