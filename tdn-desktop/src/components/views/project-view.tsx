import * as React from 'react'

import {
  useVaultData,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
} from '@/services/vault'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useCommandContext } from '@/hooks/use-command-context'
import { showTaskContextMenu } from '@/lib/context-menu'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { useViewMode } from '@/store/view-mode-store'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { useProjectOrder } from '@/hooks/use-project-order'
import { useKanbanOrder } from '@/hooks/use-kanban-order'
import { DraggableTaskList } from '@/components/tasks/task-list'
import { KanbanBoard, useCollapsedColumns } from '@/components/kanban'
import { EmptyState } from '@/components/ui/empty-state'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'

/**
 * ProjectView - Displays all tasks within a single project.
 *
 * Projects are finishable efforts with a clear outcome (e.g., "Launch website",
 * "Plan vacation"). This view displays:
 * 1. Project notes (collapsible) - goals, context, reference material
 * 2. Tasks section - all tasks belonging to this project
 *
 * Supports two view modes (toggled via ViewHeader):
 * - "list" → DraggableTaskList with inline editing and reordering
 * - "kanban" → KanbanBoard with tasks grouped by status columns
 *
 * The project status pill in ViewHeader allows changing project status
 * (planning, ready, in-progress, blocked, done, dropped).
 */
interface ProjectViewProps {
  projectId: string
}

export function ProjectView({ projectId }: ProjectViewProps) {
  const { tasks, projects, areas } = useVaultData()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const setOpenTaskId = useTaskDetailStore(state => state.setOpenTaskId)
  const commandContext = useCommandContext()
  const { viewMode } = useViewMode('project')
  const { collapsedColumns, toggleColumn } = useCollapsedColumns()

  // Context menu handler for tasks
  const handleTaskContextMenu = (task: Task) => {
    showTaskContextMenu(task, commandContext)
  }

  // State for auto-editing newly created tasks
  const [pendingEditItemId, setPendingEditItemId] = React.useState<
    string | null
  >(null)

  // Find the project
  const project = React.useMemo(() => {
    return projects.find(p => p.id === projectId)
  }, [projects, projectId])

  // Get all tasks for this project
  // Tasks reference projects via wikilink format [[Project Title]], not by hash ID
  // So we match using the project's title, not its ID
  const projectTasks = React.useMemo(() => {
    if (!project) return []
    return tasks.filter(t => t.project?.includes(project.title))
  }, [tasks, project])

  // Build tasksByStatus map for kanban view
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    for (const task of projectTasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }
    return map
  }, [projectTasks])

  // Manage display order for list view
  const { setOrder, getOrderedTasks } = useProjectOrder(projectId, projectTasks)
  const orderedTasks = getOrderedTasks()

  // Manage kanban column order
  const { setColumnOrder, getOrderedTasks: getKanbanOrderedTasks } =
    useKanbanOrder(`project-${projectId}`, tasksByStatus)

  // Helper: get task by ID
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

  // Helper: get area name from WikiLink
  const getAreaName = React.useCallback(
    (wikilink: string): string | undefined => {
      const title = extractTitle(wikilink)
      const area = areas.find(a => a.title === title)
      return area?.title
    },
    [areas, extractTitle]
  )

  const handleReorder = React.useCallback(
    (reorderedTasks: Task[]) => {
      setOrder(reorderedTasks)
    },
    [setOrder]
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

      // Toggle between done and ready
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

  const handleScheduledChange = React.useCallback(
    (taskId: string, date: string | undefined) => {
      updateTask.mutate({
        id: taskId,
        title: null,
        status: null,
        project: null,
        area: null,
        scheduled: date ?? null,
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
      setOpenTaskId(taskId)
    },
    [setOpenTaskId]
  )

  const handleCreateTask = React.useCallback(
    async (afterTaskId: string | null): Promise<string> => {
      // Create task and wait for real ID (~50ms, imperceptible)
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId: project?.title ?? null,
        areaId: project?.area ?? null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })

      // Update display order with REAL ID
      const currentOrder = orderedTasks.map(t => t.id)
      let newOrder: string[]

      if (afterTaskId) {
        const insertIndex = currentOrder.indexOf(afterTaskId)
        newOrder =
          insertIndex !== -1
            ? [
                ...currentOrder.slice(0, insertIndex + 1),
                newTask.id,
                ...currentOrder.slice(insertIndex + 1),
              ]
            : [...currentOrder, newTask.id]
      } else {
        newOrder = [...currentOrder, newTask.id]
      }

      useDisplayOrderStore.getState().setProjectTaskOrder(projectId, newOrder)

      // Trigger edit mode
      setPendingEditItemId(newTask.id)

      return newTask.id
    },
    [createTask, projectId, project?.area, orderedTasks, project?.title]
  )

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId)
    },
    [deleteTask]
  )

  // Clear pending edit after it's consumed
  const handleAutoEditConsumed = React.useCallback(() => {
    setPendingEditItemId(null)
  }, [])

  // Register view default handler for Cmd+N task creation
  // When no task is selected, Cmd+N creates a new task at the end
  React.useEffect(() => {
    useTaskCreationStore.getState().registerViewDefault({
      handler: handleCreateTask,
      onTaskCreated: taskId => {
        setPendingEditItemId(taskId)
      },
    })

    return () => {
      useTaskCreationStore.getState().registerViewDefault(null)
    }
  }, [handleCreateTask])

  const handleKanbanCreateTask = React.useCallback(
    async (status: TaskStatus): Promise<string> => {
      const newTask = await createTask.mutateAsync({
        title: '',
        status,
        projectId,
        areaId: project?.area ?? null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask, projectId, project?.area]
  )

  const handleKanbanReorder = React.useCallback(
    (status: TaskStatus, reorderedTasks: Task[]) => {
      setColumnOrder(status, reorderedTasks)
    },
    [setColumnOrder]
  )

  // Combine description and body for notes
  // (hoisted before early return to satisfy React hooks rules)
  const projectNotes = React.useMemo(() => {
    if (!project) return ''
    const parts: string[] = []
    if (project.description) parts.push(project.description)
    if (project.body) parts.push(project.body)
    return parts.join('\n\n')
  }, [project])

  // Build ordered tasksByStatus for kanban (applying column ordering)
  const orderedTasksByStatus = React.useMemo(() => {
    const result = new Map<TaskStatus, Task[]>()
    for (const [status] of tasksByStatus) {
      result.set(status, getKanbanOrderedTasks(status))
    }
    return result
  }, [tasksByStatus, getKanbanOrderedTasks])

  // Flatten ordered tasks for KanbanBoard (it builds its own map internally)
  const kanbanTasks = React.useMemo(() => {
    const result: Task[] = []
    for (const [, tasks] of orderedTasksByStatus) {
      result.push(...tasks)
    }
    return result
  }, [orderedTasksByStatus])

  if (!project) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Project not found"
          description="This project may have been deleted or moved."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Project Notes (collapsible) */}
      {projectNotes && <CollapsibleNotesSection notes={projectNotes} />}

      {/* Tasks Section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Tasks
        </h2>

        {viewMode === 'list' ? (
          orderedTasks.length > 0 ? (
            <DraggableTaskList
              tasks={orderedTasks}
              projectId={`project-${projectId}`}
              onTasksReorder={handleReorder}
              onTaskTitleChange={handleTitleChange}
              onTaskStatusToggle={handleStatusToggle}
              onTaskOpenDetail={handleOpenDetail}
              onCreateTask={handleCreateTask}
              onDeleteTask={handleDeleteTask}
              showScheduled={true}
              showDue={true}
              autoEditItemId={pendingEditItemId}
              onAutoEditConsumed={handleAutoEditConsumed}
            />
          ) : (
            <EmptyState
              title="No tasks yet"
              description="Press ⌘N to create a task in this project."
            />
          )
        ) : (
          <KanbanBoard
            tasks={kanbanTasks}
            collapsedColumns={collapsedColumns}
            onColumnCollapseChange={toggleColumn}
            onTaskStatusChange={handleStatusChange}
            onTasksReorder={handleKanbanReorder}
            getTaskById={getTaskById}
            getAreaName={getAreaName}
            onTaskTitleChange={handleTitleChange}
            onTaskScheduledChange={handleScheduledChange}
            onTaskDueChange={handleDueChange}
            onTaskEditClick={handleOpenDetail}
            onCreateTask={handleKanbanCreateTask}
            onTaskContextMenu={handleTaskContextMenu}
          />
        )}
      </section>
    </div>
  )
}
