import * as React from 'react'
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'

import { useVaultData, useUpdateTask, useCreateTask } from '@/services/vault'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useViewMode } from '@/store/view-mode-store'
import { useKanbanOrder } from '@/hooks/use-kanban-order'
import { WeekCalendar } from '@/components/calendar'
import { KanbanBoard, useCollapsedColumns } from '@/components/kanban'

/**
 * WeekView - Shows tasks scheduled or due within the current week.
 *
 * Supports two view modes (toggled via ViewHeader):
 * - "calendar" → WeekCalendar (7-day column layout with drag-drop scheduling)
 * - "kanban" → KanbanBoard (tasks grouped by status)
 *
 * In calendar mode, tasks can be dragged to different days to reschedule.
 * In kanban mode, tasks can be moved between status columns.
 *
 * Filters tasks where scheduled OR due date falls within Monday-Sunday of
 * the current week.
 */
export function WeekView() {
  const { tasks, projects, areas } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)
  const setSelection = useNavigationStore(state => state.setSelection)
  const { viewMode } = useViewMode('this-week')
  const { collapsedColumns, toggleColumn } = useCollapsedColumns()

  // Filter tasks for this week (scheduled or due within the week) - used for kanban
  const thisWeekTasks = React.useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
    const interval = { start: weekStart, end: weekEnd }

    return tasks.filter(task => {
      // Check if scheduled date is within this week
      if (task.scheduled) {
        try {
          const scheduledDate = parseISO(task.scheduled)
          if (isWithinInterval(scheduledDate, interval)) {
            return true
          }
        } catch {
          // Invalid date, skip
        }
      }

      // Check if due date is within this week
      if (task.due) {
        try {
          const dueDate = parseISO(task.due)
          if (isWithinInterval(dueDate, interval)) {
            return true
          }
        } catch {
          // Invalid date, skip
        }
      }

      return false
    })
  }, [tasks])

  // Build tasksByStatus map for kanban view
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    for (const task of thisWeekTasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }
    return map
  }, [thisWeekTasks])

  // Manage kanban column order
  const { setColumnOrder, getOrderedTasks: getKanbanOrderedTasks } =
    useKanbanOrder('this-week', tasksByStatus)

  // Get task by ID for drag preview
  const getTaskById = React.useCallback(
    (taskId: string) => tasks.find(t => t.id === taskId),
    [tasks]
  )

  // Helper: extract title from WikiLink format [[Title]]
  const extractTitle = React.useCallback((wikilink: string): string => {
    if (wikilink.startsWith('[[') && wikilink.endsWith(']]')) {
      return wikilink.slice(2, -2)
    }
    return wikilink
  }, [])

  // Helper: get project name from WikiLink
  const getProjectName = React.useCallback(
    (wikilink: string): string | undefined => {
      const title = extractTitle(wikilink)
      const project = projects.find(p => p.title === title)
      return project?.title
    },
    [projects, extractTitle]
  )

  // Helper: get area name from WikiLink
  const getAreaName = React.useCallback(
    (wikilink: string): string | undefined => {
      const title = extractTitle(wikilink)
      const area = areas.find(a => a.title === title)
      return area?.title
    },
    [areas, extractTitle]
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

  const handleKanbanCreateTask = React.useCallback(
    (status: TaskStatus): string | undefined => {
      createTask.mutate({
        title: '',
        status,
        projectId: null,
        areaId: null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })
      return undefined
    },
    [createTask]
  )

  const handleKanbanReorder = React.useCallback(
    (status: TaskStatus, reorderedTasks: Task[]) => {
      setColumnOrder(status, reorderedTasks)
    },
    [setColumnOrder]
  )

  // Handle clicking on project name in kanban cards - navigate to project
  // The WikiLink format is passed directly, need to find the project by title
  const handleKanbanProjectClick = React.useCallback(
    (wikilink: string) => {
      const title = extractTitle(wikilink)
      const project = projects.find(p => p.title === title)
      if (project) {
        setSelection({ type: 'project', id: project.id })
      }
    },
    [projects, extractTitle, setSelection]
  )

  // Handle clicking on area name in kanban cards - navigate to area
  const handleKanbanAreaClick = React.useCallback(
    (wikilink: string) => {
      const title = extractTitle(wikilink)
      const area = areas.find(a => a.title === title)
      if (area) {
        setSelection({ type: 'area', id: area.id })
      }
    },
    [areas, extractTitle, setSelection]
  )

  // Build ordered tasks for kanban (applying column ordering)
  const kanbanTasks = React.useMemo(() => {
    const result: Task[] = []
    for (const [status] of tasksByStatus) {
      result.push(...getKanbanOrderedTasks(status))
    }
    return result
  }, [tasksByStatus, getKanbanOrderedTasks])

  return (
    <div className="h-full flex flex-col">
      {viewMode === 'calendar' ? (
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
      ) : (
        <KanbanBoard
          tasks={kanbanTasks}
          collapsedColumns={collapsedColumns}
          onColumnCollapseChange={toggleColumn}
          onTaskStatusChange={handleStatusChange}
          onTasksReorder={handleKanbanReorder}
          getTaskById={getTaskById}
          getProjectName={getProjectName}
          getAreaName={getAreaName}
          onTaskTitleChange={handleTitleChange}
          onTaskScheduledChange={handleScheduleChange}
          onTaskDueChange={handleDueChange}
          onTaskEditClick={handleOpenDetail}
          onProjectClick={handleKanbanProjectClick}
          onAreaClick={handleKanbanAreaClick}
          onCreateTask={handleKanbanCreateTask}
          className="flex-1"
        />
      )}
    </div>
  )
}
