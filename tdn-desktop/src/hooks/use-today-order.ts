import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
import {
  useDisplayOrderStore,
  type TodaySectionId,
} from '@/store/display-order-store'

// Re-export for convenience
export type { TodaySectionId }

interface TodaySections {
  scheduledToday: Task[]
  overdueOrDueToday: Task[]
  becameAvailableToday: Task[]
}

/**
 * Manages Today view task display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks within each Today section,
 * allowing drag-and-drop reordering. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when section task lists change
 * - Adding new tasks to the end of their sections
 * - Removing deleted tasks from the order
 *
 * @param sections - The current tasks for each Today section
 * @returns Object with ordered data and manipulation functions per section
 */
export function useTodayOrder(sections: TodaySections) {
  // Get order state from Zustand (using selector syntax for performance)
  const todaySectionOrder = useDisplayOrderStore(
    state => state.todaySectionOrder
  )

  // Map section ID to tasks
  const sectionToTasks: Record<TodaySectionId, Task[]> = useMemo(
    () => ({
      'scheduled-today': sections.scheduledToday,
      'overdue-due-today': sections.overdueOrDueToday,
      'became-available-today': sections.becameAvailableToday,
    }),
    [sections.scheduledToday, sections.overdueOrDueToday, sections.becameAvailableToday]
  )

  // Derive effective ordered IDs by syncing stored order with current tasks
  const getEffectiveOrder = useCallback(
    (sectionId: TodaySectionId): string[] => {
      const tasks = sectionToTasks[sectionId]
      const currentTaskIds = new Set(tasks.map(t => t.id))
      const storedOrder = todaySectionOrder?.[sectionId] ?? null

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
    },
    [sectionToTasks, todaySectionOrder]
  )

  // Set section order from reordered tasks array
  const setSectionOrder = useCallback(
    (sectionId: TodaySectionId, reorderedTasks: Task[]) => {
      const { setTodaySectionOrder } = useDisplayOrderStore.getState()
      setTodaySectionOrder(sectionId, reorderedTasks.map(t => t.id))
    },
    []
  )

  // Get ordered tasks for a section (returns Task objects in display order)
  const getOrderedTasks = useCallback(
    (sectionId: TodaySectionId): Task[] => {
      const tasks = sectionToTasks[sectionId]
      const orderedIds = getEffectiveOrder(sectionId)
      const taskMap = new Map(tasks.map(t => [t.id, t]))

      return orderedIds
        .map(id => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    },
    [sectionToTasks, getEffectiveOrder]
  )

  return {
    setSectionOrder,
    getOrderedTasks,
  }
}
