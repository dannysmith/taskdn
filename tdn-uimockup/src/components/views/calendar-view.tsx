import * as React from 'react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { MonthCalendar } from '@/components/calendar/month-calendar'
import type { TaskStatus } from '@/types/data'

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
 * Tasks are displayed using TaskCard (small variant) to fit within day cells.
 * This is a read-only overview - for detailed task editing, click to open
 * the DetailSideBar.
 */
export function CalendarView() {
  const {
    data,
    getTaskById,
    createTask,
    updateTaskStatus,
    updateTaskScheduled,
  } = useAppData()
  const { openTask } = useTaskDetailStore()

  const handleScheduleChange = React.useCallback(
    (taskId: string, newDate: string | undefined) => {
      updateTaskScheduled(taskId, newDate)
    },
    [updateTaskScheduled]
  )

  const handleStatusChange = React.useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      updateTaskStatus(taskId, newStatus)
    },
    [updateTaskStatus]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  return (
    <div className="h-full flex flex-col">
      <MonthCalendar
        tasks={data.tasks}
        getTaskById={getTaskById}
        onTaskScheduleChange={handleScheduleChange}
        onTaskStatusChange={handleStatusChange}
        onTaskOpenDetail={handleOpenDetail}
        onCreateTask={(scheduledDate) =>
          createTask({ scheduled: scheduledDate })
        }
        className="flex-1"
      />
    </div>
  )
}
