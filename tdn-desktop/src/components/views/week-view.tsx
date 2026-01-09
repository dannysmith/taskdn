import * as React from 'react'

import { useVaultData, useUpdateTask, useCreateTask } from '@/services/vault'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useNavigationStore } from '@/store/navigation-store'
import { WeekCalendar } from '@/components/calendar'

/**
 * WeekView - Shows tasks scheduled or due within the current week.
 *
 * Displays a 7-day column layout (Mon-Sun) where:
 * - Each column shows tasks scheduled for that day
 * - Tasks can be dragged between days to reschedule
 * - Bottom of each column shows tasks DUE on that day
 * - Click + to create a task scheduled for that day
 *
 * Uses WeekCalendar component for the calendar layout with DnD support.
 */
export function WeekView() {
  const { tasks, projects, areas } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)
  const setSelection = useNavigationStore(state => state.setSelection)

  // Get task by ID for drag preview
  const getTaskById = React.useCallback(
    (taskId: string) => tasks.find(t => t.id === taskId),
    [tasks]
  )

  // Get context (project/area names and IDs) for a task
  // Note: task.project and task.area are WikiLink format (e.g., "[[My Project]]")
  const getTaskContext = React.useCallback(
    (task: Task) => {
      let projectName: string | undefined
      let areaName: string | undefined
      let projectId: string | undefined
      let areaId: string | undefined

      if (task.project) {
        const project = projects.find(p => task.project?.includes(p.title))
        if (project) {
          projectName = project.title
          projectId = project.id
          // Get area from project if not directly set on task
          if (project.area) {
            const area = areas.find(a => project.area?.includes(a.title))
            if (area) {
              areaName = area.title
              areaId = area.id
            }
          }
        }
      }

      // Direct area on task overrides project's area
      if (task.area) {
        const area = areas.find(a => task.area?.includes(a.title))
        if (area) {
          areaName = area.title
          areaId = area.id
        }
      }

      return { projectName, areaName, projectId, areaId }
    },
    [projects, areas]
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

  const handleDueChange = React.useCallback(
    (taskId: string, date: string | undefined) => {
      updateTask.mutate({
        id: taskId,
        title: null,
        status: null,
        project: null,
        area: null,
        scheduled: null,
        due: date ?? null,
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

  const handleNavigateToProject = React.useCallback(
    (projectId: string) => {
      setSelection({ type: 'project', id: projectId })
    },
    [setSelection]
  )

  const handleNavigateToArea = React.useCallback(
    (areaId: string) => {
      setSelection({ type: 'area', id: areaId })
    },
    [setSelection]
  )

  const handleCreateTask = React.useCallback(
    (scheduledDate: string): string | undefined => {
      createTask.mutate({
        title: '',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: scheduledDate,
        due: null,
        deferUntil: null,
      })
      return undefined
    },
    [createTask]
  )

  return (
    <div className="h-full flex flex-col">
      <WeekCalendar
        tasks={tasks}
        getTaskById={getTaskById}
        getTaskContext={getTaskContext}
        onTaskScheduleChange={handleScheduleChange}
        onTaskStatusChange={handleStatusChange}
        onTaskTitleChange={handleTitleChange}
        onTaskDueChange={handleDueChange}
        onTaskOpenDetail={handleOpenDetail}
        onNavigateToProject={handleNavigateToProject}
        onNavigateToArea={handleNavigateToArea}
        onCreateTask={handleCreateTask}
        className="flex-1"
      />
    </div>
  )
}
