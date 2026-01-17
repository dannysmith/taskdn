import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Factory for creating task order hooks.
 *
 * This creates hooks that manage display order for task lists, supporting
 * drag-and-drop reordering with Zustand persistence.
 *
 * Two patterns are supported:
 * - Non-keyed: Direct state access (e.g., inboxOrder)
 * - Keyed: State accessed by key (e.g., projectTaskOrder[projectId])
 */

// -----------------------------------------------------------------------------
// Non-keyed factory (for hooks like useInboxOrder)
// -----------------------------------------------------------------------------

interface NonKeyedTaskOrderConfig {
  /** Selector to get stored order from display order store */
  getStoredOrder: (
    state: ReturnType<typeof useDisplayOrderStore.getState>
  ) => string[] | null
  /** Function to set order in display order store */
  setStoredOrder: (ids: string[]) => void
}

/**
 * Creates a non-keyed task order hook (e.g., inbox).
 * Usage: useInboxOrder(tasks)
 */
export function createTaskOrderHook(config: NonKeyedTaskOrderConfig) {
  return function useTaskOrder(tasks: Task[]) {
    // Get order state from Zustand (using selector syntax for performance)
    const storedOrder = useDisplayOrderStore(config.getStoredOrder)

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
    const setOrder = useCallback((reorderedTasks: Task[]) => {
      config.setStoredOrder(reorderedTasks.map(t => t.id))
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
}

// -----------------------------------------------------------------------------
// Keyed factory (for hooks like useAreaOrder, useProjectOrder)
// -----------------------------------------------------------------------------

interface KeyedTaskOrderConfig {
  /** Selector to get the order map from display order store */
  getOrderMap: (
    state: ReturnType<typeof useDisplayOrderStore.getState>
  ) => Record<string, string[]> | null
  /** Function to set order for a specific key */
  setStoredOrder: (key: string, ids: string[]) => void
}

/**
 * Creates a keyed task order hook (e.g., area, project).
 * Usage: useAreaOrder(areaId, tasks) or useProjectOrder(projectId, tasks)
 */
export function createKeyedTaskOrderHook(config: KeyedTaskOrderConfig) {
  return function useKeyedTaskOrder(key: string, tasks: Task[]) {
    // Get order map from Zustand (using selector syntax for performance)
    const orderMap = useDisplayOrderStore(config.getOrderMap)
    const storedOrder = orderMap?.[key] ?? null

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
        config.setStoredOrder(
          key,
          reorderedTasks.map(t => t.id)
        )
      },
      [key]
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
}
