import * as React from 'react'
import { Sun, Flag, Sunrise } from 'lucide-react'

import { useVaultData, useUpdateTask, useCreateTask } from '@/services/vault'
import type { Task } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useTodayOrder, type TodaySectionId } from '@/hooks/use-today-order'
import { SectionTaskGroup } from '@/components/tasks/section-task-group'
import { EmptyState } from '@/components/ui/empty-state'
import { isOverdue, isToday } from '@/lib/date-utils'

/**
 * TodayView - Shows tasks that need attention today.
 *
 * This is the primary "daily focus" view. It displays three sections:
 * 1. "Scheduled for Today" - Tasks explicitly scheduled for today's date
 * 2. "Overdue or Due Today" - Tasks whose due date has passed or is today
 * 3. "Became Available Today" - Tasks whose deferUntil date is today
 *
 * Each section has its own drag-and-drop for reordering.
 * Display order is managed by useTodayOrder hook, separate from entity data.
 */
export function TodayView() {
  const { tasks } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)

  // Get today's date in ISO format (YYYY-MM-DD)
  const today = new Date().toISOString().slice(0, 10)

  // Helper to check if task is active (not done/dropped)
  const isActiveTask = (task: Task) =>
    task.status !== 'done' && task.status !== 'dropped'

  // Section 1: Tasks scheduled for today
  const scheduledToday = React.useMemo(() => {
    return tasks.filter(t => t.scheduled === today && isActiveTask(t))
  }, [tasks, today])

  // Section 2: Tasks overdue or due today (but NOT scheduled for today)
  const overdueOrDueToday = React.useMemo(() => {
    return tasks.filter(t => {
      if (!isActiveTask(t)) return false
      // Skip if already in scheduled today section
      if (t.scheduled === today) return false
      // Include if due and (overdue or due today)
      if (t.due && (isOverdue(t.due) || isToday(t.due))) return true
      return false
    })
  }, [tasks, today])

  // Section 3: Tasks that became available today (deferUntil passed)
  const becameAvailableToday = React.useMemo(() => {
    return tasks.filter(t => {
      if (!isActiveTask(t)) return false
      // Skip if already in other sections
      if (t.scheduled === today) return false
      if (t.due && (isOverdue(t.due) || isToday(t.due))) return false
      // Include if deferUntil is today (task became available)
      if (t.deferUntil && isToday(t.deferUntil)) return true
      return false
    })
  }, [tasks, today])

  // Manage display order for each section
  const { setSectionOrder, getOrderedTasks } = useTodayOrder({
    scheduledToday,
    overdueOrDueToday,
    becameAvailableToday,
  })

  // Get ordered tasks for each section
  const orderedScheduledToday = getOrderedTasks('scheduled-today')
  const orderedOverdueOrDueToday = getOrderedTasks('overdue-due-today')
  const orderedBecameAvailableToday = getOrderedTasks('became-available-today')

  // Handlers
  const handleReorder = React.useCallback(
    (sectionId: TodaySectionId) => (reorderedTasks: Task[]) => {
      setSectionOrder(sectionId, reorderedTasks)
    },
    [setSectionOrder]
  )

  const handleTitleChange = React.useCallback(
    (taskId: string, newTitle: string) => {
      updateTask.mutate({
        id: taskId,
        title: newTitle,
        status: null,
        project: null,
        area: null,
        scheduled: null,
        due: null,
        deferUntil: null,
        body: null,
      })
    },
    [updateTask]
  )

  const handleStatusToggle = React.useCallback(
    (taskId: string) => {
      const task = tasks.find(t => t.id === taskId)
      if (!task) return

      const newStatus = task.status === 'done' ? 'ready' : 'done'
      updateTask.mutate({
        id: taskId,
        title: null,
        status: newStatus,
        project: null,
        area: null,
        scheduled: null,
        due: null,
        deferUntil: null,
        body: null,
      })
    },
    [tasks, updateTask]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  // Create task handlers for each section
  const handleCreateScheduledTask = React.useCallback(
    async (_afterTaskId: string | null): Promise<string | undefined> => {
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: today,
        due: null,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask, today]
  )

  const handleCreateDueTask = React.useCallback(
    async (_afterTaskId: string | null): Promise<string | undefined> => {
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: null,
        due: today,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask, today]
  )

  // Check if there are any tasks to show
  const hasAnyItems =
    orderedScheduledToday.length > 0 ||
    orderedOverdueOrDueToday.length > 0 ||
    orderedBecameAvailableToday.length > 0

  return (
    <div className="space-y-6">
      {/* Scheduled for Today */}
      <SectionTaskGroup
        sectionId="scheduled-today"
        title="Scheduled for Today"
        icon={<Sun className="size-4" />}
        tasks={orderedScheduledToday}
        onTasksReorder={handleReorder('scheduled-today')}
        onTaskTitleChange={handleTitleChange}
        onTaskStatusToggle={handleStatusToggle}
        onTaskOpenDetail={handleOpenDetail}
        onCreateTask={handleCreateScheduledTask}
        showScheduled={false}
        showDue={true}
        defaultExpanded={true}
      />

      {/* Overdue or Due Today */}
      {orderedOverdueOrDueToday.length > 0 && (
        <SectionTaskGroup
          sectionId="overdue-due-today"
          title="Overdue or Due Today"
          icon={<Flag className="size-4" />}
          tasks={orderedOverdueOrDueToday}
          onTasksReorder={handleReorder('overdue-due-today')}
          onTaskTitleChange={handleTitleChange}
          onTaskStatusToggle={handleStatusToggle}
          onTaskOpenDetail={handleOpenDetail}
          onCreateTask={handleCreateDueTask}
          showScheduled={true}
          showDue={true}
          defaultExpanded={true}
        />
      )}

      {/* Became Available Today */}
      {orderedBecameAvailableToday.length > 0 && (
        <SectionTaskGroup
          sectionId="became-available-today"
          title="Became Available Today"
          icon={<Sunrise className="size-4" />}
          tasks={orderedBecameAvailableToday}
          onTasksReorder={handleReorder('became-available-today')}
          onTaskTitleChange={handleTitleChange}
          onTaskStatusToggle={handleStatusToggle}
          onTaskOpenDetail={handleOpenDetail}
          onCreateTask={handleCreateScheduledTask}
          showScheduled={true}
          showDue={true}
          defaultExpanded={true}
        />
      )}

      {/* Empty state */}
      {!hasAnyItems && (
        <EmptyState
          title="Nothing scheduled for today"
          description="Schedule tasks or set due dates to see them here."
        />
      )}
    </div>
  )
}
