import { createKeyedTaskOrderHook } from './use-task-order'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Manages task display order within a specific project, separately from entity data.
 *
 * This hook tracks the visual ordering of tasks in a project view,
 * allowing drag-and-drop reordering. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when the project task list changes
 * - Adding new tasks to the end
 * - Removing deleted tasks from the order
 *
 * @param projectId - The ID of the project
 * @param tasks - The current list of tasks for this project
 * @returns Object with ordered data and reorder functions
 */
export const useProjectOrder = createKeyedTaskOrderHook({
  getOrderMap: state => state.projectTaskOrder,
  setStoredOrder: (projectId, ids) => {
    useDisplayOrderStore.getState().setProjectTaskOrder(projectId, ids)
  },
})
