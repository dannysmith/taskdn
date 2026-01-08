import * as React from 'react'
import { Sun, Flag, Sunrise } from 'lucide-react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useTodayOrder, type TodaySectionId } from '@/hooks/use-today-order'
import { SectionTaskGroup } from '@/components/tasks/section-task-group'
import { TaskDndContext } from '@/components/tasks/task-dnd-context'
import { isOverdue, isToday } from '@/lib/date-utils'
import type { Task } from '@/types/data'
import { EmptyState } from '@/components/ui/empty-state'
import { toHeadingId, type HeadingColor } from '@/types/headings'
import { arrayMove } from '@dnd-kit/sortable'

/**
 * TodayView - Shows tasks that need attention today.
 *
 * This is the primary "daily focus" view. It displays three sections:
 * 1. "Scheduled for Today" - Tasks explicitly scheduled for today's date
 * 2. "Overdue or Due Today" - Tasks whose due date has passed or is today
 * 3. "Became Available Today" - Tasks whose deferUntil date is today
 *
 * The "Scheduled for Today" section supports inline headings for manual
 * organization. Tasks can be dragged between sections (only TO scheduled).
 * Tasks can also be reordered within sections.
 *
 * Display order is managed by useTodayOrder hook, separate from entity data.
 */
interface TodayViewProps {
  onNavigateToProject?: (projectId: string) => void
  onNavigateToArea?: (areaId: string) => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TodayView(_props: TodayViewProps) {
  const {
    data,
    createTask,
    updateTaskTitle,
    updateTaskScheduled,
    toggleTaskStatus,
    getTaskContextName,
    getTaskById,
  } = useAppData()
  const { openTask } = useTaskDetailStore()

  // State for auto-editing newly created items
  const [pendingEditItemId, setPendingEditItemId] = React.useState<
    string | null
  >(null)

  // Get today's date in ISO format (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0]

  // Helper to check if task is active (not done/dropped)
  const isActiveTask = (task: Task) =>
    task.status !== 'done' && task.status !== 'dropped'

  // Section 1: Tasks scheduled for today
  const scheduledToday = React.useMemo(() => {
    return data.tasks.filter((t) => t.scheduled === today && isActiveTask(t))
  }, [data.tasks, today])

  // Section 2: Tasks overdue or due today (but NOT scheduled for today)
  const overdueOrDueToday = React.useMemo(() => {
    return data.tasks.filter((t) => {
      if (!isActiveTask(t)) return false
      // Skip if already in scheduled today section
      if (t.scheduled === today) return false
      // Include if due and (overdue or due today)
      if (t.due && (isOverdue(t.due) || isToday(t.due))) return true
      return false
    })
  }, [data.tasks, today])

  // Section 3: Tasks that became available today (deferUntil passed)
  const becameAvailableToday = React.useMemo(() => {
    return data.tasks.filter((t) => {
      if (!isActiveTask(t)) return false
      // Skip if already in other sections
      if (t.scheduled === today) return false
      if (t.due && (isOverdue(t.due) || isToday(t.due))) return false
      // Include if deferUntil is today (task became available)
      if (t.deferUntil && isToday(t.deferUntil)) return true
      return false
    })
  }, [data.tasks, today])

  // Manage display order for each section (with heading support)
  const {
    headings,
    setSectionTaskOrder,
    setSectionItemOrder,
    getOrderedTasks,
    getOrderedItems,
    createHeading,
    updateHeading,
    deleteHeading,
  } = useTodayOrder({
    scheduledToday,
    overdueOrDueToday,
    becameAvailableToday,
  })

  // Get heading by ID for drag preview
  const getHeadingById = React.useCallback(
    (headingId: string) => headings[headingId],
    [headings]
  )

  // Get ordered items for "Scheduled for Today" (supports headings)
  const orderedScheduledItems = getOrderedItems('scheduled-today')
  // Get ordered tasks for other sections (task-only mode)
  const orderedOverdueOrDueToday = getOrderedTasks('overdue-due-today')
  const orderedBecameAvailableToday = getOrderedTasks('became-available-today')

  // Also need task-only version for TaskDndContext compatibility
  const orderedScheduledTasks = React.useMemo(
    () =>
      orderedScheduledItems
        .filter((item) => item.type === 'task')
        .map((item) => item.data as Task),
    [orderedScheduledItems]
  )

  // Create tasksByProject map for TaskDndContext (sections act as "projects")
  const tasksBySection = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    map.set('scheduled-today', orderedScheduledTasks)
    map.set('overdue-due-today', orderedOverdueOrDueToday)
    map.set('became-available-today', orderedBecameAvailableToday)
    return map
  }, [
    orderedScheduledTasks,
    orderedOverdueOrDueToday,
    orderedBecameAvailableToday,
  ])

  // Handler for cross-section task move (TaskDndContext callback)
  const handleTaskMove = React.useCallback(
    (
      taskId: string,
      _fromSectionId: string,
      toSectionId: string,
      insertBeforeTaskId: string | null
    ) => {
      // Only allow moving TO "scheduled-today"
      if (toSectionId !== 'scheduled-today') return

      // Update the scheduled date
      updateTaskScheduled(taskId, today)

      // Build current order IDs (preserving headings with their prefix)
      const currentOrderIds = orderedScheduledItems.map((item) =>
        item.type === 'heading' ? toHeadingId(item.id) : item.id
      )

      let newOrderIds: string[]

      if (insertBeforeTaskId) {
        // Find where to insert (insertBeforeTaskId is a task ID without prefix)
        const insertIndex = currentOrderIds.indexOf(insertBeforeTaskId)
        if (insertIndex !== -1) {
          newOrderIds = [
            ...currentOrderIds.slice(0, insertIndex),
            taskId,
            ...currentOrderIds.slice(insertIndex),
          ]
        } else {
          newOrderIds = [...currentOrderIds, taskId]
        }
      } else {
        // Append to end
        newOrderIds = [...currentOrderIds, taskId]
      }

      // Use setSectionItemOrder to preserve headings
      setSectionItemOrder('scheduled-today', newOrderIds)
    },
    [updateTaskScheduled, today, orderedScheduledItems, setSectionItemOrder]
  )

  // Handler for same-section reordering (TaskDndContext callback)
  const handleTasksReorder = React.useCallback(
    (sectionId: string, reorderedTasks: Task[]) => {
      setSectionTaskOrder(sectionId as TodaySectionId, reorderedTasks)
    },
    [setSectionTaskOrder]
  )

  // Factory for reorder handlers (for task-only sections)
  const makeReorderHandler = React.useCallback(
    (sectionId: TodaySectionId) => (reorderedTasks: Task[]) => {
      setSectionTaskOrder(sectionId, reorderedTasks)
    },
    [setSectionTaskOrder]
  )

  // Handler for mixed items reorder (Scheduled for Today section)
  const handleScheduledItemsReorder = React.useCallback(
    (orderedIds: string[]) => {
      setSectionItemOrder('scheduled-today', orderedIds)
    },
    [setSectionItemOrder]
  )

  // Handler for drag-based reordering (TaskDndContext callback)
  // Converts drag IDs back to order IDs and applies the reorder
  const handleDragItemsReorder = React.useCallback(
    (containerId: string, activeDragId: string, overDragId: string) => {
      // Parse drag ID to extract type and item ID
      // Drag ID format: "type-containerId-itemId"
      const parseDragId = (
        dragId: string
      ): { type: 'heading' | 'task'; id: string } | null => {
        const headingPrefix = `heading-${containerId}-`
        if (dragId.startsWith(headingPrefix)) {
          return { type: 'heading', id: dragId.slice(headingPrefix.length) }
        }
        const taskPrefix = `task-${containerId}-`
        if (dragId.startsWith(taskPrefix)) {
          return { type: 'task', id: dragId.slice(taskPrefix.length) }
        }
        return null
      }

      // Convert parsed drag ID to order ID format
      const toOrderId = (parsed: {
        type: 'heading' | 'task'
        id: string
      }): string => {
        return parsed.type === 'heading' ? toHeadingId(parsed.id) : parsed.id
      }

      const activeParsed = parseDragId(activeDragId)
      const overParsed = parseDragId(overDragId)

      if (!activeParsed || !overParsed) return

      const activeOrderId = toOrderId(activeParsed)
      const overOrderId = toOrderId(overParsed)

      // Get current order for the section
      const currentItems =
        containerId === 'scheduled-today'
          ? orderedScheduledItems
          : containerId === 'overdue-due-today'
            ? orderedOverdueOrDueToday.map((t) => ({
                type: 'task' as const,
                id: t.id,
                data: t,
              }))
            : orderedBecameAvailableToday.map((t) => ({
                type: 'task' as const,
                id: t.id,
                data: t,
              }))

      // Build current order IDs
      const currentOrderIds = currentItems.map((item) =>
        item.type === 'heading' ? toHeadingId(item.id) : item.id
      )

      // Find indices and apply arrayMove
      const oldIndex = currentOrderIds.indexOf(activeOrderId)
      const newIndex = currentOrderIds.indexOf(overOrderId)

      if (oldIndex === -1 || newIndex === -1) return

      const newOrderIds = arrayMove(currentOrderIds, oldIndex, newIndex)
      setSectionItemOrder(containerId as TodaySectionId, newOrderIds)
    },
    [
      orderedScheduledItems,
      orderedOverdueOrDueToday,
      orderedBecameAvailableToday,
      setSectionItemOrder,
    ]
  )

  const handleTitleChange = React.useCallback(
    (taskId: string, newTitle: string) => {
      updateTaskTitle(taskId, newTitle)
    },
    [updateTaskTitle]
  )

  const handleStatusToggle = React.useCallback(
    (taskId: string) => {
      toggleTaskStatus(taskId)
    },
    [toggleTaskStatus]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  // Create task handler for "Scheduled for Today" section
  const handleCreateScheduledTask = React.useCallback(
    (afterItemId: string | null) => {
      return createTask({
        scheduled: today,
        insertAfterId: afterItemId ?? undefined,
      })
    },
    [createTask, today]
  )

  // Add task from header button
  const handleAddScheduledTask = React.useCallback(() => {
    const newTaskId = createTask({ scheduled: today })
    // Trigger auto-edit for the new task
    setPendingEditItemId(newTaskId)
    return newTaskId
  }, [createTask, today])

  // Heading handlers for Scheduled section
  const handleAddHeading = React.useCallback(() => {
    const headingId = createHeading('scheduled-today')
    // Trigger auto-edit for the new heading
    setPendingEditItemId(headingId)
  }, [createHeading])

  // Clear pending edit after it's consumed
  const handleAutoEditConsumed = React.useCallback(() => {
    setPendingEditItemId(null)
  }, [])

  const handleHeadingTitleChange = React.useCallback(
    (headingId: string, newTitle: string) => {
      updateHeading(headingId, { title: newTitle })
    },
    [updateHeading]
  )

  const handleHeadingColorChange = React.useCallback(
    (headingId: string, color: HeadingColor) => {
      updateHeading(headingId, { color })
    },
    [updateHeading]
  )

  const handleHeadingDelete = React.useCallback(
    (headingId: string) => {
      deleteHeading('scheduled-today', headingId)
    },
    [deleteHeading]
  )

  // Create task handler for due/overdue section (set due date to today)
  const handleCreateDueTask = React.useCallback(
    (afterTaskId: string | null) => {
      return createTask({
        due: today,
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask, today]
  )

  // Create task handler for "became available" section (schedule for today)
  const handleCreateAvailableTask = React.useCallback(
    (afterTaskId: string | null) => {
      return createTask({
        scheduled: today,
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask, today]
  )

  // Check if there are any tasks to show
  const hasAnyItems =
    orderedScheduledItems.length > 0 ||
    orderedOverdueOrDueToday.length > 0 ||
    orderedBecameAvailableToday.length > 0

  return (
    <TaskDndContext
      tasksByProject={tasksBySection}
      onTaskMove={handleTaskMove}
      onTasksReorder={handleTasksReorder}
      onItemsReorder={handleDragItemsReorder}
      getTaskById={getTaskById}
      getHeadingById={getHeadingById}
    >
      <div className="space-y-6">
        {/* Scheduled for Today - with heading support */}
        <SectionTaskGroup
          sectionId="scheduled-today"
          title="Scheduled for Today"
          icon={<Sun className="size-4" />}
          orderedItems={orderedScheduledItems}
          onItemsReorder={handleScheduledItemsReorder}
          onTaskTitleChange={handleTitleChange}
          onTaskStatusToggle={handleStatusToggle}
          onTaskOpenDetail={handleOpenDetail}
          onCreateTask={handleCreateScheduledTask}
          onAddTask={handleAddScheduledTask}
          onAddHeading={handleAddHeading}
          onHeadingTitleChange={handleHeadingTitleChange}
          onHeadingColorChange={handleHeadingColorChange}
          onHeadingDelete={handleHeadingDelete}
          getContextName={getTaskContextName}
          showScheduled={false}
          showDue={true}
          defaultExpanded={true}
          autoEditItemId={pendingEditItemId}
          onAutoEditConsumed={handleAutoEditConsumed}
        />

        {/* Overdue or Due Today - task only */}
        {orderedOverdueOrDueToday.length > 0 && (
          <SectionTaskGroup
            sectionId="overdue-due-today"
            title="Overdue or Due Today"
            icon={<Flag className="size-4" />}
            tasks={orderedOverdueOrDueToday}
            onTasksReorder={makeReorderHandler('overdue-due-today')}
            onTaskTitleChange={handleTitleChange}
            onTaskStatusToggle={handleStatusToggle}
            onTaskOpenDetail={handleOpenDetail}
            onCreateTask={handleCreateDueTask}
            getContextName={getTaskContextName}
            showScheduled={true}
            showDue={true}
            defaultExpanded={true}
            useExternalDnd={true}
          />
        )}

        {/* Became Available Today - task only */}
        {orderedBecameAvailableToday.length > 0 && (
          <SectionTaskGroup
            sectionId="became-available-today"
            title="Became Available Today"
            icon={<Sunrise className="size-4" />}
            tasks={orderedBecameAvailableToday}
            onTasksReorder={makeReorderHandler('became-available-today')}
            onTaskTitleChange={handleTitleChange}
            onTaskStatusToggle={handleStatusToggle}
            onTaskOpenDetail={handleOpenDetail}
            onCreateTask={handleCreateAvailableTask}
            getContextName={getTaskContextName}
            showScheduled={true}
            showDue={true}
            defaultExpanded={true}
            useExternalDnd={true}
          />
        )}

        {/* Empty state */}
        {!hasAnyItems && (
          <EmptyState
            title="Nothing scheduled for today."
            description="Schedule tasks to see them here."
          />
        )}
      </div>
    </TaskDndContext>
  )
}
