import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
import type { Heading, HeadingColor } from '@/types/headings'
import { isHeadingId, toHeadingId, parseHeadingId } from '@/types/headings'
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

/** Resolved ordered item - either a task or a heading with full data */
export type ResolvedOrderedItem =
  | { type: 'task'; id: string; data: Task }
  | { type: 'heading'; id: string; data: Heading }

/**
 * Manages Today view task and heading display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks and headings within each Today
 * section, allowing drag-and-drop reordering. Order is stored in Zustand
 * (session-persistent, survives unmount).
 *
 * The hook handles:
 * - Syncing order when section task lists change (preserving headings)
 * - Adding new tasks to the end of their sections
 * - Removing deleted tasks from the order
 * - Managing headings (create, update, delete)
 *
 * @param sections - The current tasks for each Today section
 * @returns Object with ordered data and manipulation functions per section
 */
export function useTodayOrder(sections: TodaySections) {
  // Get order state from Zustand (using selector syntax for performance)
  const todaySectionOrder = useDisplayOrderStore(
    state => state.todaySectionOrder
  )
  const storedHeadings = useDisplayOrderStore(state => state.todayHeadings)
  const headings = useMemo(() => storedHeadings ?? {}, [storedHeadings])

  // Map section ID to tasks
  const sectionToTasks: Record<TodaySectionId, Task[]> = useMemo(
    () => ({
      'scheduled-today': sections.scheduledToday,
      'overdue-due-today': sections.overdueOrDueToday,
      'became-available-today': sections.becameAvailableToday,
    }),
    [
      sections.scheduledToday,
      sections.overdueOrDueToday,
      sections.becameAvailableToday,
    ]
  )

  // Derive effective ordered IDs by syncing stored order with current tasks
  // Preserves heading IDs - they don't come from the task list
  const getEffectiveOrder = useCallback(
    (sectionId: TodaySectionId): string[] => {
      const tasks = sectionToTasks[sectionId]
      const currentTaskIds = new Set(tasks.map(t => t.id))
      const storedOrder = todaySectionOrder?.[sectionId] ?? null

      if (storedOrder) {
        // Keep headings (always preserved) and tasks that still exist
        const preservedOrder = storedOrder.filter(
          id => isHeadingId(id) || currentTaskIds.has(id)
        )

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

  // Set section order from reordered IDs array (may include heading: prefixes)
  const setSectionItemOrder = useCallback(
    (sectionId: TodaySectionId, orderedIds: string[]) => {
      const { setTodaySectionOrder } = useDisplayOrderStore.getState()
      setTodaySectionOrder(sectionId, orderedIds)
    },
    []
  )

  // Legacy: Set section order from reordered tasks array (backwards compat)
  // Note: This strips headings. Use setSectionItemOrder for full control.
  const setSectionTaskOrder = useCallback(
    (sectionId: TodaySectionId, reorderedTasks: Task[]) => {
      const { setTodaySectionOrder } = useDisplayOrderStore.getState()
      setTodaySectionOrder(
        sectionId,
        reorderedTasks.map(t => t.id)
      )
    },
    []
  )

  // Get ordered tasks for a section (returns Task objects only, filters out headings)
  const getOrderedTasks = useCallback(
    (sectionId: TodaySectionId): Task[] => {
      const tasks = sectionToTasks[sectionId]
      const orderedIds = getEffectiveOrder(sectionId)
      const taskMap = new Map(tasks.map(t => [t.id, t]))

      return orderedIds
        .filter(id => !isHeadingId(id))
        .map(id => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    },
    [sectionToTasks, getEffectiveOrder]
  )

  // Get ordered items for a section (returns both tasks and headings with type info)
  const getOrderedItems = useCallback(
    (sectionId: TodaySectionId): ResolvedOrderedItem[] => {
      const tasks = sectionToTasks[sectionId]
      const orderedIds = getEffectiveOrder(sectionId)
      const taskMap = new Map(tasks.map(t => [t.id, t]))

      const items: ResolvedOrderedItem[] = []

      for (const id of orderedIds) {
        if (isHeadingId(id)) {
          const headingId = parseHeadingId(id)
          const heading = headings[headingId]
          if (heading) {
            items.push({ type: 'heading', id: headingId, data: heading })
          }
        } else {
          const task = taskMap.get(id)
          if (task) {
            items.push({ type: 'task', id: task.id, data: task })
          }
        }
      }

      return items
    },
    [sectionToTasks, getEffectiveOrder, headings]
  )

  // Create a new heading in a section
  const createHeading = useCallback(
    (sectionId: TodaySectionId, afterItemId?: string): string => {
      const headingId = crypto.randomUUID()
      const newHeading: Heading = {
        id: headingId,
        title: '',
        color: 'default',
      }

      // Add to headings storage
      const { setTodayHeading, setTodaySectionOrder } =
        useDisplayOrderStore.getState()
      setTodayHeading(headingId, newHeading)

      // Add to order array
      const prefixedId = toHeadingId(headingId)
      const currentOrder = todaySectionOrder?.[sectionId] ?? []

      if (afterItemId) {
        // Insert after the specified item
        const index = currentOrder.indexOf(afterItemId)
        if (index !== -1) {
          const newOrder = [...currentOrder]
          newOrder.splice(index + 1, 0, prefixedId)
          setTodaySectionOrder(sectionId, newOrder)
          return headingId
        }
      }

      // Default: append to end
      setTodaySectionOrder(sectionId, [...currentOrder, prefixedId])
      return headingId
    },
    [todaySectionOrder]
  )

  // Update a heading's properties
  const updateHeading = useCallback(
    (headingId: string, updates: Partial<Pick<Heading, 'title' | 'color'>>) => {
      const { todayHeadings, setTodayHeading } = useDisplayOrderStore.getState()
      const existing = todayHeadings?.[headingId]
      if (!existing) return

      setTodayHeading(headingId, { ...existing, ...updates })
    },
    []
  )

  // Delete a heading
  const deleteHeading = useCallback(
    (sectionId: TodaySectionId, headingId: string) => {
      const { deleteTodayHeading, setTodaySectionOrder, todaySectionOrder } =
        useDisplayOrderStore.getState()

      // Remove from headings storage
      deleteTodayHeading(headingId)

      // Remove from order array
      const prefixedId = toHeadingId(headingId)
      const currentOrder = todaySectionOrder?.[sectionId] ?? []
      setTodaySectionOrder(
        sectionId,
        currentOrder.filter(id => id !== prefixedId)
      )
    },
    []
  )

  return {
    // Headings data
    headings,

    // Order manipulation
    setSectionItemOrder,
    setSectionTaskOrder, // Legacy, for backwards compat

    // Getters
    getOrderedTasks, // Tasks only (backwards compat)
    getOrderedItems, // Tasks + headings with type info

    // Heading management
    createHeading,
    updateHeading,
    deleteHeading,
  }
}

/** Helper type for heading color changes */
export type { HeadingColor }
