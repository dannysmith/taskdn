import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
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
export function useInboxOrder(tasks: Task[]) {
  // Get order state from Zustand (using selector syntax for performance)
  const inboxOrder = useDisplayOrderStore(state => state.inboxOrder)

  // Derive the effective ordered IDs by syncing stored order with current tasks
  const orderedIds = useMemo(() => {
    const currentTaskIds = new Set(tasks.map(t => t.id))

    if (inboxOrder) {
      // Keep existing order for tasks that still exist
      const preservedOrder = inboxOrder.filter(id => currentTaskIds.has(id))

      // Find new tasks not in order yet
      const existingIds = new Set(inboxOrder)
      const newTaskIds = tasks
        .filter(t => !existingIds.has(t.id))
        .map(t => t.id)

      // Append new tasks to end
      return [...preservedOrder, ...newTaskIds]
    }

    // No stored order yet, use natural order
    return tasks.map(t => t.id)
  }, [tasks, inboxOrder])

  // Set the new order directly (from reordered tasks array)
  const setOrder = useCallback((reorderedTasks: Task[]) => {
    const { setInboxOrder } = useDisplayOrderStore.getState()
    setInboxOrder(reorderedTasks.map(t => t.id))
  }, [])

  // Get ordered task IDs
  const getOrderedTaskIds = useCallback((): string[] => {
    return orderedIds
  }, [orderedIds])

  // Get ordered tasks (returns Task objects in display order)
  const getOrderedTasks = useCallback((): Task[] => {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    return orderedIds
      .map(id => taskMap.get(id))
      .filter((t): t is Task => t !== undefined)
  }, [orderedIds, tasks])

  return {
    orderedIds,
    setOrder,
    getOrderedTaskIds,
    getOrderedTasks,
  }
}
