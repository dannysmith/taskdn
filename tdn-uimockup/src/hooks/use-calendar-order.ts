import { useState, useCallback, useEffect, useRef } from 'react'
import { arrayMove } from '@dnd-kit/sortable'
import type { Task } from '@/types/data'
import type { CalendarOrder } from '@/types/calendar-order'

interface UseCalendarOrderOptions {
  /** Tasks to derive initial order from */
  tasks: Task[]
  /** The dates to track order for (e.g., days of the week) */
  dates: string[]
  /** Function to get tasks for a specific date */
  getTasksForDate: (date: string) => Task[]
}

/**
 * Manages calendar task display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks within calendar days,
 * allowing drag-and-drop reordering without modifying task.scheduled directly.
 * Order is preserved when dragging within a day, and the hook handles:
 * - Syncing order when the visible date range changes
 * - Adding new tasks to the end of their respective days
 * - Removing deleted tasks from the order
 *
 * **Important:** This hook only manages display order. When moving a task
 * to a different day, the caller must also update the task's scheduled date
 * via the appropriate mutation (e.g., `updateTaskScheduled`).
 *
 * @returns Object with ordered data and reorder functions:
 *   - `reorderTasksInDay(date, activeId, overId)` - Reorder within a single day
 *   - `moveTaskToDay(taskId, fromDate, toDate, insertIndex?)` - Move task to new day
 *   - `getOrderedTaskIds(date)` - Get task IDs for a date in display order
 *   - `getOrderedTasks(date, allTasksForDate)` - Get Task objects for a date in display order
 *   - `getInsertIndex(date, overTaskId)` - Get index for drop insertion
 */
export function useCalendarOrder({
  tasks,
  dates,
  getTasksForDate,
}: UseCalendarOrderOptions) {
  // Initialize order from current data
  const [order, setOrder] = useState<CalendarOrder>(() => {
    const taskOrderByDate: Record<string, string[]> = {}
    for (const date of dates) {
      const dayTasks = getTasksForDate(date)
      taskOrderByDate[date] = dayTasks.map((t) => t.id)
    }
    return { taskOrderByDate }
  })

  // Track previous dates to detect date range changes
  const prevDatesRef = useRef<string>(dates.join(','))

  // Sync order when dates or tasks change
  // - On date change: reinitialize from scratch
  // - On task change only: preserve order, add new tasks to end, remove deleted
  useEffect(() => {
    const datesKey = dates.join(',')
    const datesChanged = datesKey !== prevDatesRef.current
    prevDatesRef.current = datesKey

    setOrder((prev) => {
      if (datesChanged) {
        // Full reinitialize when navigating to different date range
        const taskOrderByDate: Record<string, string[]> = {}
        for (const date of dates) {
          const dayTasks = getTasksForDate(date)
          taskOrderByDate[date] = dayTasks.map((t) => t.id)
        }
        return { taskOrderByDate }
      }

      // Incremental sync: preserve order, add/remove tasks
      const newOrderByDate: Record<string, string[]> = {}
      let changed = false

      for (const date of dates) {
        const currentTaskIds = getTasksForDate(date).map((t) => t.id)
        const existingOrder = prev.taskOrderByDate[date] ?? []

        // Keep existing order for tasks that still exist
        const preservedOrder = existingOrder.filter((id) =>
          currentTaskIds.includes(id)
        )

        // Find new tasks not in order yet
        const newTaskIds = currentTaskIds.filter(
          (id) => !existingOrder.includes(id)
        )

        // Append new tasks to end
        const finalOrder = [...preservedOrder, ...newTaskIds]

        newOrderByDate[date] = finalOrder

        if (
          finalOrder.length !== existingOrder.length ||
          !finalOrder.every((id, i) => id === existingOrder[i])
        ) {
          changed = true
        }
      }

      return changed ? { taskOrderByDate: newOrderByDate } : prev
    })
  }, [tasks, dates, getTasksForDate])

  // Reorder tasks within the same day
  const reorderTasksInDay = useCallback(
    (date: string, activeId: string, overId: string) => {
      setOrder((prev) => {
        const dayOrder = prev.taskOrderByDate[date] ?? []
        const oldIndex = dayOrder.indexOf(activeId)
        const newIndex = dayOrder.indexOf(overId)

        if (oldIndex === -1 || newIndex === -1) return prev

        return {
          ...prev,
          taskOrderByDate: {
            ...prev.taskOrderByDate,
            [date]: arrayMove(dayOrder, oldIndex, newIndex),
          },
        }
      })
    },
    []
  )

  // Move task to a different day (updates order only - caller handles entity update)
  const moveTaskToDay = useCallback(
    (
      taskId: string,
      fromDate: string,
      toDate: string,
      insertIndex?: number
    ) => {
      setOrder((prev) => {
        const fromOrder = [...(prev.taskOrderByDate[fromDate] ?? [])]
        const toOrder = [...(prev.taskOrderByDate[toDate] ?? [])]

        // Remove from source day
        const sourceIndex = fromOrder.indexOf(taskId)
        if (sourceIndex !== -1) {
          fromOrder.splice(sourceIndex, 1)
        }

        // Add to target day at specified index or end
        const targetIndex = insertIndex ?? toOrder.length
        toOrder.splice(targetIndex, 0, taskId)

        return {
          ...prev,
          taskOrderByDate: {
            ...prev.taskOrderByDate,
            [fromDate]: fromOrder,
            [toDate]: toOrder,
          },
        }
      })
    },
    []
  )

  // Get ordered task IDs for a date
  const getOrderedTaskIds = useCallback(
    (date: string): string[] => {
      return order.taskOrderByDate[date] ?? []
    },
    [order.taskOrderByDate]
  )

  // Get ordered tasks for a date (returns Task objects)
  const getOrderedTasks = useCallback(
    (date: string, allTasksForDate: Task[]): Task[] => {
      const orderedIds = order.taskOrderByDate[date] ?? []
      const taskMap = new Map(allTasksForDate.map((t) => [t.id, t]))

      // Return tasks in order, filtering out any IDs that don't have matching tasks
      return orderedIds
        .map((id) => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    },
    [order.taskOrderByDate]
  )

  // Get insert index when dropping on a task
  const getInsertIndex = useCallback(
    (date: string, overTaskId: string): number => {
      const dayOrder = order.taskOrderByDate[date] ?? []
      const index = dayOrder.indexOf(overTaskId)
      return index === -1 ? dayOrder.length : index
    },
    [order.taskOrderByDate]
  )

  return {
    order,
    reorderTasksInDay,
    moveTaskToDay,
    getOrderedTaskIds,
    getOrderedTasks,
    getInsertIndex,
  }
}
