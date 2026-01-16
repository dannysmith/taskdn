import { createKeyedTaskOrderHook } from './use-task-order'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Manages task display order within a specific area, separately from entity data.
 *
 * This hook tracks the visual ordering of loose tasks (area-direct tasks) in an area view,
 * allowing drag-and-drop reordering. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when the area task list changes
 * - Adding new tasks to the end
 * - Removing deleted tasks from the order
 *
 * @param areaId - The ID of the area
 * @param tasks - The current list of loose tasks for this area
 * @returns Object with ordered data and reorder functions
 */
export const useAreaOrder = createKeyedTaskOrderHook({
  getOrderMap: state => state.areaTaskOrder,
  setStoredOrder: (areaId, ids) => {
    useDisplayOrderStore.getState().setAreaTaskOrder(areaId, ids)
  },
})
