import { useCallback, useMemo } from 'react'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Manages task display order within Kanban columns, separately from entity data.
 *
 * This hook tracks the visual ordering of tasks in each status column of a Kanban board,
 * allowing drag-and-drop reordering within columns. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when the task list changes
 * - Adding new tasks to the end of their column
 * - Removing deleted tasks from the order
 *
 * @param viewId - The ID of the view (project or area ID)
 * @param tasksByStatus - Map of status to tasks in that status
 * @returns Object with ordered data and reorder functions
 */
export function useKanbanOrder(
  viewId: string,
  tasksByStatus: Map<TaskStatus, Task[]>
) {
  // Get order state from Zustand (using selector syntax for performance)
  const kanbanColumnOrder = useDisplayOrderStore(
    state => state.kanbanColumnOrder
  )
  const storedViewOrder = kanbanColumnOrder?.[viewId] ?? null

  // Derive the effective ordered IDs for each status column
  const orderedIdsByStatus = useMemo(() => {
    const result = new Map<TaskStatus, string[]>()

    for (const [status, tasks] of tasksByStatus) {
      const currentTaskIds = new Set(tasks.map(t => t.id))
      const storedColumnOrder = storedViewOrder?.[status] ?? null

      if (storedColumnOrder) {
        // Keep existing order for tasks that still exist
        const preservedOrder = storedColumnOrder.filter(id =>
          currentTaskIds.has(id)
        )

        // Find new tasks not in order yet
        const existingIds = new Set(storedColumnOrder)
        const newTaskIds = tasks
          .filter(t => !existingIds.has(t.id))
          .map(t => t.id)

        // Append new tasks to end
        result.set(status, [...preservedOrder, ...newTaskIds])
      } else {
        // No stored order yet, use natural order
        result.set(
          status,
          tasks.map(t => t.id)
        )
      }
    }

    return result
  }, [tasksByStatus, storedViewOrder])

  // Set the order for a specific column (from reordered tasks array)
  const setColumnOrder = useCallback(
    (status: TaskStatus, reorderedTasks: Task[]) => {
      const { setKanbanColumnOrder } = useDisplayOrderStore.getState()
      setKanbanColumnOrder(
        viewId,
        status,
        reorderedTasks.map(t => t.id)
      )
    },
    [viewId]
  )

  // Get ordered task IDs for a specific status column
  const getOrderedTaskIds = useCallback(
    (status: TaskStatus): string[] => {
      return orderedIdsByStatus.get(status) ?? []
    },
    [orderedIdsByStatus]
  )

  // Get ordered tasks for a specific status column
  const getOrderedTasks = useCallback(
    (status: TaskStatus): Task[] => {
      const tasks = tasksByStatus.get(status) ?? []
      const taskMap = new Map(tasks.map(t => [t.id, t]))
      const orderedIds = orderedIdsByStatus.get(status) ?? []
      return orderedIds
        .map(id => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    },
    [orderedIdsByStatus, tasksByStatus]
  )

  // Get all tasks organized by status with ordering applied
  const getOrderedTasksByStatus = useCallback((): Map<TaskStatus, Task[]> => {
    const result = new Map<TaskStatus, Task[]>()
    for (const [status] of tasksByStatus) {
      result.set(status, getOrderedTasks(status))
    }
    return result
  }, [tasksByStatus, getOrderedTasks])

  return {
    orderedIdsByStatus,
    setColumnOrder,
    getOrderedTaskIds,
    getOrderedTasks,
    getOrderedTasksByStatus,
  }
}
