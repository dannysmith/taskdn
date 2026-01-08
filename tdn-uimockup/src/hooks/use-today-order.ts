import { useState, useCallback, useEffect } from 'react'
import type { Task } from '@/types/data'
import type { Heading } from '@/types/headings'
import { isHeadingId, toHeadingId, parseHeadingId } from '@/types/headings'

/** Section identifiers for Today view */
export type TodaySectionId =
  | 'scheduled-today'
  | 'overdue-due-today'
  | 'became-available-today'

interface TodaySections {
  scheduledToday: Task[]
  overdueOrDueToday: Task[]
  becameAvailableToday: Task[]
}

type SectionOrder = Record<TodaySectionId, string[]>

/** Resolved ordered item - either a task or a heading with full data */
export type ResolvedOrderedItem =
  | { type: 'task'; id: string; data: Task }
  | { type: 'heading'; id: string; data: Heading }

/**
 * Manages Today view task and heading display order separately from entity data.
 *
 * This hook tracks the visual ordering of tasks and headings within each Today section,
 * allowing drag-and-drop reordering. Order is preserved when tasks are reordered,
 * and the hook handles:
 * - Syncing order when task lists change (preserving headings)
 * - Adding new tasks to the end of their sections
 * - Removing deleted tasks from the order
 * - Managing headings (create, update, delete)
 *
 * @param sections - The current tasks for each Today section
 * @returns Object with ordered data and manipulation functions per section
 */
export function useTodayOrder(sections: TodaySections) {
  // Initialize order from current section data (no headings initially)
  const [sectionOrder, setSectionOrder] = useState<SectionOrder>(() => ({
    'scheduled-today': sections.scheduledToday.map((t) => t.id),
    'overdue-due-today': sections.overdueOrDueToday.map((t) => t.id),
    'became-available-today': sections.becameAvailableToday.map((t) => t.id),
  }))

  // Headings storage: headingId -> Heading data
  const [headings, setHeadings] = useState<Record<string, Heading>>({})

  // Sync order when tasks change (added/removed)
  // IMPORTANT: Preserve heading IDs - they don't come from the task list
  useEffect(() => {
    // Map section ID to tasks - defined inside effect to avoid stale closure
    const sectionToTasks: Record<TodaySectionId, Task[]> = {
      'scheduled-today': sections.scheduledToday,
      'overdue-due-today': sections.overdueOrDueToday,
      'became-available-today': sections.becameAvailableToday,
    }

    setSectionOrder((prev) => {
      let changed = false
      const newOrder: SectionOrder = { ...prev }

      for (const sectionId of Object.keys(sectionToTasks) as TodaySectionId[]) {
        const tasks = sectionToTasks[sectionId]
        const currentTaskIds = new Set(tasks.map((t) => t.id))
        const existingOrder = prev[sectionId] ?? []

        // Keep headings (always preserved) and tasks that still exist
        const preservedOrder = existingOrder.filter(
          (id) => isHeadingId(id) || currentTaskIds.has(id)
        )

        // Find new tasks not in order yet
        const existingIds = new Set(existingOrder)
        const newTaskIds = tasks
          .filter((t) => !existingIds.has(t.id))
          .map((t) => t.id)

        // Append new tasks to end
        const finalOrder = [...preservedOrder, ...newTaskIds]

        if (
          finalOrder.length !== existingOrder.length ||
          !finalOrder.every((id, i) => id === existingOrder[i])
        ) {
          changed = true
          newOrder[sectionId] = finalOrder
        }
      }

      return changed ? newOrder : prev
    })
  }, [sections.scheduledToday, sections.overdueOrDueToday, sections.becameAvailableToday])

  // Set section order directly (from reordered items array)
  // Now accepts an array of IDs which may include heading:* prefixed IDs
  const setSectionItemOrder = useCallback(
    (sectionId: TodaySectionId, orderedIds: string[]) => {
      setSectionOrder((prev) => ({
        ...prev,
        [sectionId]: orderedIds,
      }))
    },
    []
  )

  // Legacy: Set section order from reordered tasks array (backwards compat)
  const setSectionTaskOrder = useCallback(
    (sectionId: TodaySectionId, reorderedTasks: Task[]) => {
      setSectionOrder((prev) => {
        // Preserve headings in their relative positions isn't straightforward
        // when we only get tasks back. For now, this strips headings.
        // Use setSectionItemOrder for full control.
        return {
          ...prev,
          [sectionId]: reorderedTasks.map((t) => t.id),
        }
      })
    },
    []
  )

  // Helper to get tasks for a section
  const getTasksForSection = useCallback(
    (sectionId: TodaySectionId): Task[] => {
      switch (sectionId) {
        case 'scheduled-today':
          return sections.scheduledToday
        case 'overdue-due-today':
          return sections.overdueOrDueToday
        case 'became-available-today':
          return sections.becameAvailableToday
      }
    },
    [sections.scheduledToday, sections.overdueOrDueToday, sections.becameAvailableToday]
  )

  // Get ordered tasks for a section (returns Task objects only, filters out headings)
  const getOrderedTasks = useCallback(
    (sectionId: TodaySectionId): Task[] => {
      const tasks = getTasksForSection(sectionId)
      const orderedIds = sectionOrder[sectionId] ?? []
      const taskMap = new Map(tasks.map((t) => [t.id, t]))

      return orderedIds
        .filter((id) => !isHeadingId(id))
        .map((id) => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    },
    [getTasksForSection, sectionOrder]
  )

  // Get ordered items for a section (returns both tasks and headings with type info)
  const getOrderedItems = useCallback(
    (sectionId: TodaySectionId): ResolvedOrderedItem[] => {
      const tasks = getTasksForSection(sectionId)
      const orderedIds = sectionOrder[sectionId] ?? []
      const taskMap = new Map(tasks.map((t) => [t.id, t]))

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
    [getTasksForSection, sectionOrder, headings]
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
      setHeadings((prev) => ({
        ...prev,
        [headingId]: newHeading,
      }))

      // Add to order array
      const prefixedId = toHeadingId(headingId)
      setSectionOrder((prev) => {
        const currentOrder = prev[sectionId] ?? []

        if (afterItemId) {
          // Insert after the specified item
          const index = currentOrder.indexOf(afterItemId)
          if (index !== -1) {
            const newOrder = [...currentOrder]
            newOrder.splice(index + 1, 0, prefixedId)
            return { ...prev, [sectionId]: newOrder }
          }
        }

        // Default: append to end
        return {
          ...prev,
          [sectionId]: [...currentOrder, prefixedId],
        }
      })

      return headingId
    },
    []
  )

  // Update a heading's properties
  const updateHeading = useCallback(
    (headingId: string, updates: Partial<Pick<Heading, 'title' | 'color'>>) => {
      setHeadings((prev) => {
        const existing = prev[headingId]
        if (!existing) return prev

        return {
          ...prev,
          [headingId]: { ...existing, ...updates },
        }
      })
    },
    []
  )

  // Delete a heading
  const deleteHeading = useCallback(
    (sectionId: TodaySectionId, headingId: string) => {
      // Remove from headings storage
      setHeadings((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [headingId]: _removed, ...rest } = prev
        return rest
      })

      // Remove from order array
      const prefixedId = toHeadingId(headingId)
      setSectionOrder((prev) => ({
        ...prev,
        [sectionId]: (prev[sectionId] ?? []).filter((id) => id !== prefixedId),
      }))
    },
    []
  )

  return {
    // Order state
    sectionOrder,
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
