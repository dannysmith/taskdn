import { useState, useCallback, useMemo } from 'react'
import type { Task } from '@/types/data'

/**
 * Manages inbox task display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks in the inbox view,
 * allowing drag-and-drop reordering. Order is preserved when tasks
 * are reordered, and the hook handles:
 * - Syncing order when the inbox task list changes
 * - Adding new tasks to the end
 * - Removing deleted tasks from the order
 *
 * @param tasks - The current list of inbox tasks
 * @returns Object with ordered data and reorder functions
 */
export function useInboxOrder(tasks: Task[]) {
  // Track manual reorder state - stores user's preferred order
  const [manualOrder, setManualOrder] = useState<string[]>(() =>
    tasks.map((t) => t.id)
  )

  // Derive the effective ordered IDs by syncing manualOrder with current tasks
  const orderedIds = useMemo(() => {
    const currentTaskIds = new Set(tasks.map((t) => t.id))

    // Keep existing order for tasks that still exist
    const preservedOrder = manualOrder.filter((id) => currentTaskIds.has(id))

    // Find new tasks not in order yet
    const existingIds = new Set(manualOrder)
    const newTaskIds = tasks
      .filter((t) => !existingIds.has(t.id))
      .map((t) => t.id)

    // Append new tasks to end
    return [...preservedOrder, ...newTaskIds]
  }, [tasks, manualOrder])

  // Set the new order directly (from reordered tasks array)
  const setOrder = useCallback((reorderedTasks: Task[]) => {
    setManualOrder(reorderedTasks.map((t) => t.id))
  }, [])

  // Get ordered task IDs
  const getOrderedTaskIds = useCallback((): string[] => {
    return orderedIds
  }, [orderedIds])

  // Get ordered tasks (returns Task objects in display order)
  const getOrderedTasks = useCallback((): Task[] => {
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    return orderedIds
      .map((id) => taskMap.get(id))
      .filter((t): t is Task => t !== undefined)
  }, [orderedIds, tasks])

  return {
    orderedIds,
    setOrder,
    getOrderedTaskIds,
    getOrderedTasks,
  }
}
