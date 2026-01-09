import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
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
export function useAreaOrder(areaId: string, tasks: Task[]) {
  // Get order state from Zustand (using selector syntax for performance)
  const areaTaskOrder = useDisplayOrderStore(state => state.areaTaskOrder)
  const storedOrder = areaTaskOrder?.[areaId] ?? null

  // Derive the effective ordered IDs by syncing stored order with current tasks
  const orderedIds = useMemo(() => {
    const currentTaskIds = new Set(tasks.map(t => t.id))

    if (storedOrder) {
      // Keep existing order for tasks that still exist
      const preservedOrder = storedOrder.filter(id => currentTaskIds.has(id))

      // Find new tasks not in order yet
      const existingIds = new Set(storedOrder)
      const newTaskIds = tasks
        .filter(t => !existingIds.has(t.id))
        .map(t => t.id)

      // Append new tasks to end
      return [...preservedOrder, ...newTaskIds]
    }

    // No stored order yet, use natural order
    return tasks.map(t => t.id)
  }, [tasks, storedOrder])

  // Set the new order directly (from reordered tasks array)
  const setOrder = useCallback(
    (reorderedTasks: Task[]) => {
      const { setAreaTaskOrder } = useDisplayOrderStore.getState()
      setAreaTaskOrder(
        areaId,
        reorderedTasks.map(t => t.id)
      )
    },
    [areaId]
  )

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
