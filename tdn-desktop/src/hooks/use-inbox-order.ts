import { createTaskOrderHook } from './use-task-order'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Manages inbox task display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks in the inbox view,
 * allowing drag-and-drop reordering. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when the inbox task list changes
 * - Adding new tasks to the end
 * - Removing deleted tasks from the order
 *
 * @param tasks - The current list of inbox tasks
 * @returns Object with ordered data and reorder functions
 */
export const useInboxOrder = createTaskOrderHook({
  getStoredOrder: state => state.inboxOrder,
  setStoredOrder: ids => {
    useDisplayOrderStore.getState().setInboxOrder(ids)
  },
})
