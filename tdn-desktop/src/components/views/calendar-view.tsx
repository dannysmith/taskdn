import * as React from 'react'

import { useVaultData, useUpdateTask, useCreateTask } from '@/services/vault'
import type { TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { MonthCalendar } from '@/components/calendar'

/**
 * CalendarView - Full-month calendar showing scheduled tasks.
 *
 * Displays a traditional month grid with tasks positioned on their scheduled
 * dates. Supports:
 * - Drag-and-drop to reschedule tasks to different days
 * - Month navigation (previous/next)
 * - Click on task to open detail panel
 * - Click on day to create a new task scheduled for that date
 *
 * Tasks are displayed using TaskCard (compact variant) to fit within day cells.
 * This is a read-only overview - for detailed task editing, click to open
 * the TaskDetailPanel.
 */
export function CalendarView() {
  const { tasks } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)

  // Get task by ID for drag preview
  const getTaskById = React.useCallback(
    (taskId: string) => tasks.find(t => t.id === taskId),
    [tasks]
  )

  const handleScheduleChange = React.useCallback(
    (taskId: string, newDate: string | undefined) => {
      updateTask.mutate({
        id: taskId,
        title: null,
        status: null,
        project: null,
        area: null,
        scheduled: newDate ?? null,
        due: null,
        deferUntil: null,
        body: null,
      })
    },
    [updateTask]
  )

  const handleStatusChange = React.useCallback(
    (taskId: string, newStatus: TaskStatus) => {
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
    [updateTask]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  const handleCreateTask = React.useCallback(
    (scheduledDate: string): string => {
      // Generate temp ID for optimistic updates
      const tempId = crypto.randomUUID()
      createTask.mutate({
        tempId,
        title: '',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: scheduledDate,
        due: null,
        deferUntil: null,
      })
      return tempId
    },
    [createTask]
  )

  return (
    <div className="h-full flex flex-col">
      <MonthCalendar
        tasks={tasks}
        getTaskById={getTaskById}
        onTaskScheduleChange={handleScheduleChange}
        onTaskStatusChange={handleStatusChange}
        onTaskOpenDetail={handleOpenDetail}
        onCreateTask={handleCreateTask}
        className="flex-1"
      />
    </div>
  )
}
