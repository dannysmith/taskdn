import * as React from 'react'
import { ListTodo } from 'lucide-react'

import {
  useVaultData,
  useVaultHelpers,
  useUpdateTask,
  useCreateTask,
  useDeleteTask,
} from '@/services/vault'
import { useDisplayOrderStore } from '@/store/display-order-store'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import { useNavigationStore } from '@/store/navigation-store'
import { useViewMode } from '@/store/view-mode-store'
import { useAreaOrder } from '@/hooks/use-area-order'
import { useKanbanOrder } from '@/hooks/use-kanban-order'
import { ProjectTaskGroup } from '@/components/tasks/project-task-group'
import { SectionTaskGroup } from '@/components/tasks/section-task-group'
import {
  TaskDndContext,
  getLooseTasksProjectId,
  isLooseTasksProjectId,
} from '@/components/tasks/task-dnd-context'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AreaKanbanBoard,
  useAreaCollapsedColumns,
  LOOSE_TASKS_SWIMLANE_ID,
} from '@/components/kanban'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Special ID used for orphan tasks ordering (tasks with no project or area) */
const ORPHAN_AREA_ID = 'orphan'

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Pure function to apply stored order to a task list.
 * Same logic as useProjectOrder.getOrderedTasks() but usable for multiple projects.
 */
function applyStoredOrder(tasks: Task[], storedOrder: string[] | null): Task[] {
  if (!storedOrder) return tasks

  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const currentTaskIds = new Set(tasks.map(t => t.id))

  // Keep existing order for tasks that still exist
  const preservedOrder = storedOrder.filter(id => currentTaskIds.has(id))

  // Find new tasks not in order yet
  const existingIds = new Set(storedOrder)
  const newTaskIds = tasks.filter(t => !existingIds.has(t.id)).map(t => t.id)

  // Build ordered task array
  const orderedIds = [...preservedOrder, ...newTaskIds]
  return orderedIds
    .map(id => taskMap.get(id))
    .filter((t): t is Task => t !== undefined)
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * NoAreaView - Shows orphan projects and tasks that aren't assigned to any area.
 *
 * This view appears when clicking the "No Area" item in the sidebar. It displays:
 * - Projects that have no area set
 * - "Loose tasks" that have neither project nor area
 *
 * Supports two view modes (toggled via ViewHeader):
 * - "list" → Collapsible project groups with task lists + loose tasks section
 * - "kanban" → AreaKanbanBoard with swimlanes per project, tasks by status
 *
 * Tasks can be dragged between orphan projects in list mode. This view helps
 * users find and organize items that haven't been assigned to a life area yet.
 */
export function NoAreaView() {
  const { tasks, projects } = useVaultData()
  const {
    getOrphanProjects,
    getOrphanTasks,
    getProjectCompletion,
    getTaskById,
  } = useVaultHelpers()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const deleteTask = useDeleteTask()
  const setOpenTaskId = useTaskDetailStore(state => state.setOpenTaskId)
  const setSelection = useNavigationStore(state => state.setSelection)
  const { viewMode } = useViewMode('area')
  const { collapsedColumns, toggleColumn } = useAreaCollapsedColumns()

  // State for auto-editing newly created items
  const [pendingEditItemId, setPendingEditItemId] = React.useState<
    string | null
  >(null)

  // Get project task order from Zustand (used to apply stored order in tasksByProject)
  const projectTaskOrder = useDisplayOrderStore(state => state.projectTaskOrder)

  // Get orphan projects (projects with no area)
  const orphanProjects = React.useMemo(() => {
    return getOrphanProjects()
  }, [getOrphanProjects])

  // Get orphan tasks (tasks with no project AND no area)
  const orphanTasks = React.useMemo(() => {
    return getOrphanTasks()
  }, [getOrphanTasks])

  // Manage display order for orphan tasks using special "orphan" area ID
  const {
    setOrder: setOrphanTasksOrder,
    getOrderedTasks: getOrderedOrphanTasks,
  } = useAreaOrder(ORPHAN_AREA_ID, orphanTasks)
  const orderedOrphanTasks = getOrderedOrphanTasks()

  // Build tasksByProject map for TaskDndContext (includes orphan tasks as pseudo-project)
  const orphanTasksProjectId = getLooseTasksProjectId(ORPHAN_AREA_ID)
  const tasksByProject = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    // Add orphan tasks with pseudo-project ID (already ordered via useAreaOrder)
    map.set(orphanTasksProjectId, orderedOrphanTasks)
    // Add regular project tasks with stored order applied
    for (const project of orphanProjects) {
      const rawProjectTasks = tasks.filter(t =>
        t.project?.includes(project.title)
      )
      const storedOrder = projectTaskOrder?.[project.id] ?? null
      const orderedProjectTasks = applyStoredOrder(rawProjectTasks, storedOrder)
      map.set(project.id, orderedProjectTasks)
    }
    return map
  }, [
    orphanProjects,
    tasks,
    orphanTasksProjectId,
    orderedOrphanTasks,
    projectTaskOrder,
  ])

  // Build tasksByStatus map for kanban view
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    // Collect all tasks from projects and orphan tasks
    const allTasks = [...orderedOrphanTasks]
    for (const project of orphanProjects) {
      const projectTasks = tasks.filter(t => t.project?.includes(project.title))
      allTasks.push(...projectTasks)
    }
    for (const task of allTasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }
    return map
  }, [orderedOrphanTasks, orphanProjects, tasks])

  // Manage kanban column order
  const { setColumnOrder } = useKanbanOrder('no-area', tasksByStatus)

  // Helper: get task by ID
  const getTaskByIdFn = React.useCallback(
    (taskId: string) => getTaskById(taskId),
    [getTaskById]
  )

  // Navigate to project
  const handleNavigateToProject = React.useCallback(
    (projectId: string) => {
      setSelection({ type: 'project', id: projectId })
    },
    [setSelection]
  )

  // Handler for creating orphan tasks (no project, no area)
  const handleCreateOrphanTask = React.useCallback(
    async (afterTaskId: string | null): Promise<string> => {
      // Create task and wait for real ID (~50ms, imperceptible)
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId: null,
        areaId: null,
        scheduled: null,
        due: null,
        deferUntil: null,
      })

      // Update display order with REAL ID
      const currentOrder = orderedOrphanTasks.map(t => t.id)
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

      useDisplayOrderStore.getState().setAreaTaskOrder(ORPHAN_AREA_ID, newOrder)

      // Trigger edit mode
      setPendingEditItemId(newTask.id)

      return newTask.id
    },
    [createTask, orderedOrphanTasks]
  )

  // Factory function to create task creation handlers for each project
  const makeCreateTaskHandler = React.useCallback(
    (projectId: string) =>
      async (afterTaskId: string | null): Promise<string> => {
        const project = projects.find(p => p.id === projectId)

        // Create task and wait for real ID
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
        const projectTasks = tasksByProject.get(projectId) ?? []
        const currentOrder = projectTasks.map(t => t.id)
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
    [createTask, projects, tasksByProject]
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

  const handleProjectChange = React.useCallback(
    (taskId: string, newProjectId: string) => {
      if (newProjectId === LOOSE_TASKS_SWIMLANE_ID) {
        // Moving to loose tasks - clear project (already no area)
        updateTask.mutate({
          id: taskId,
          title: null,
          status: null,
          project: '', // Empty string to clear
          area: null,
          scheduled: null,
          due: null,
          deferUntil: null,
          body: null,
        })
      } else {
        // Moving to a project
        const project = projects.find(p => p.id === newProjectId)
        if (project) {
          updateTask.mutate({
            id: taskId,
            title: null,
            status: null,
            project: `[[${project.title}]]`,
            area: null, // Orphan project has no area
            scheduled: null,
            due: null,
            deferUntil: null,
            body: null,
          })
        }
      }
    },
    [updateTask, projects]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      setOpenTaskId(taskId)
    },
    [setOpenTaskId]
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
  // When no task is selected, Cmd+N creates a new orphan task in "Loose Tasks"
  React.useEffect(() => {
    useTaskCreationStore.getState().registerViewDefault({
      handler: handleCreateOrphanTask,
      onTaskCreated: taskId => setPendingEditItemId(taskId),
    })

    return () => {
      useTaskCreationStore.getState().registerViewDefault(null)
    }
  }, [handleCreateOrphanTask])

  // Handler for reordering tasks within a container
  const handleTasksReorder = React.useCallback(
    (projectId: string, reorderedTasks: Task[]) => {
      if (isLooseTasksProjectId(projectId)) {
        // Reordering orphan tasks
        setOrphanTasksOrder(reorderedTasks)
      } else {
        // Reordering tasks within a project - store in project order
        const { setProjectTaskOrder } = useDisplayOrderStore.getState()
        setProjectTaskOrder(
          projectId,
          reorderedTasks.map(t => t.id)
        )
      }
    },
    [setOrphanTasksOrder]
  )

  // Handler for moving a task between projects
  // Updates both entity data (vault) and order arrays (Zustand)
  const handleTaskMove = React.useCallback(
    (
      taskId: string,
      fromProjectId: string,
      toProjectId: string,
      insertBeforeTaskId: string | null
    ) => {
      // 1. Update entity data (project WikiLink)
      if (isLooseTasksProjectId(toProjectId)) {
        // Moving to orphan tasks: clear project (already no area)
        updateTask.mutate({
          id: taskId,
          title: null,
          status: null,
          project: '', // Empty string to clear
          area: null,
          scheduled: null,
          due: null,
          deferUntil: null,
          body: null,
        })
      } else {
        // Moving to a project
        const project = projects.find(p => p.id === toProjectId)
        if (project) {
          updateTask.mutate({
            id: taskId,
            title: null,
            status: null,
            project: `[[${project.title}]]`,
            area: null, // Orphan project has no area
            scheduled: null,
            due: null,
            deferUntil: null,
            body: null,
          })
        }
      }

      // 2. Update order arrays (following TodayView's pattern)
      const { setProjectTaskOrder, setAreaTaskOrder } =
        useDisplayOrderStore.getState()

      // Get current ordered task IDs from tasksByProject
      const sourceTaskIds = (tasksByProject.get(fromProjectId) ?? []).map(
        t => t.id
      )
      const targetTaskIds = (tasksByProject.get(toProjectId) ?? []).map(
        t => t.id
      )

      // 2a. Remove from source order
      const newSourceOrder = sourceTaskIds.filter(id => id !== taskId)
      if (isLooseTasksProjectId(fromProjectId)) {
        setAreaTaskOrder(ORPHAN_AREA_ID, newSourceOrder)
      } else {
        setProjectTaskOrder(fromProjectId, newSourceOrder)
      }

      // 2b. Insert into target order at correct position
      let newTargetOrder: string[]
      if (insertBeforeTaskId) {
        const insertIndex = targetTaskIds.indexOf(insertBeforeTaskId)
        if (insertIndex !== -1) {
          newTargetOrder = [
            ...targetTaskIds.slice(0, insertIndex),
            taskId,
            ...targetTaskIds.slice(insertIndex),
          ]
        } else {
          // insertBeforeTaskId not found, append to end
          newTargetOrder = [...targetTaskIds, taskId]
        }
      } else {
        // No insertBeforeTaskId, append to end
        newTargetOrder = [...targetTaskIds, taskId]
      }

      if (isLooseTasksProjectId(toProjectId)) {
        setAreaTaskOrder(ORPHAN_AREA_ID, newTargetOrder)
      } else {
        setProjectTaskOrder(toProjectId, newTargetOrder)
      }
    },
    [updateTask, projects, tasksByProject]
  )

  // Handler for kanban task reorder
  const handleKanbanReorder = React.useCallback(
    (swimlaneId: string, status: TaskStatus, reorderedColumnTasks: Task[]) => {
      const isLooseTasks = swimlaneId === LOOSE_TASKS_SWIMLANE_ID
      const allTasks = isLooseTasks
        ? orderedOrphanTasks
        : (tasksByProject.get(swimlaneId) ?? [])

      const reorderedIds = new Set(reorderedColumnTasks.map(t => t.id))
      const result: Task[] = []
      let columnIndex = 0

      for (const task of allTasks) {
        if (reorderedIds.has(task.id)) {
          const reorderedTask = reorderedColumnTasks[columnIndex]
          if (reorderedTask) {
            result.push(reorderedTask)
            columnIndex++
          }
        } else {
          result.push(task)
        }
      }

      // Append any remaining tasks from reorderedColumnTasks
      while (columnIndex < reorderedColumnTasks.length) {
        const remainingTask = reorderedColumnTasks[columnIndex]
        if (remainingTask) {
          result.push(remainingTask)
        }
        columnIndex++
      }

      if (isLooseTasks) {
        setOrphanTasksOrder(result)
      } else {
        setColumnOrder(status, reorderedColumnTasks)
      }
    },
    [orderedOrphanTasks, tasksByProject, setOrphanTasksOrder, setColumnOrder]
  )

  // Empty state check
  const isEmpty = orphanProjects.length === 0 && orderedOrphanTasks.length === 0

  if (isEmpty) {
    return (
      <EmptyState
        title="Everything has a home"
        description="All your projects and tasks are assigned to areas. Nice work!"
      />
    )
  }

  return (
    <div className="space-y-8">
      {/* Projects/Tasks Content */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {viewMode === 'list' ? 'All Projects & Tasks' : 'Tasks by Status'}
        </h2>

        {viewMode === 'list' ? (
          <TaskDndContext
            tasksByProject={tasksByProject}
            onTaskMove={handleTaskMove}
            onTasksReorder={handleTasksReorder}
            getTaskById={getTaskByIdFn}
          >
            <div className="space-y-4">
              {/* Orphan tasks (tasks with no project AND no area) */}
              <SectionTaskGroup
                sectionId={orphanTasksProjectId}
                title="Loose Tasks"
                icon={<ListTodo className="size-4" />}
                tasks={orderedOrphanTasks}
                onTasksReorder={reorderedTasks =>
                  handleTasksReorder(orphanTasksProjectId, reorderedTasks)
                }
                onTaskTitleChange={handleTitleChange}
                onTaskStatusToggle={handleStatusToggle}
                onTaskOpenDetail={handleOpenDetail}
                onCreateTask={handleCreateOrphanTask}
                onDeleteTask={handleDeleteTask}
                showScheduled={true}
                showDue={true}
                defaultExpanded={true}
                useExternalDnd={true}
                autoEditItemId={pendingEditItemId}
                onAutoEditConsumed={handleAutoEditConsumed}
              />

              {orphanProjects.map(project => {
                const projectTasks = tasksByProject.get(project.id) ?? []
                const completion = getProjectCompletion(project.id)

                return (
                  <ProjectTaskGroup
                    key={project.id}
                    project={project}
                    tasks={projectTasks}
                    completion={completion}
                    onOpenProject={() => handleNavigateToProject(project.id)}
                    onTasksReorder={reordered =>
                      handleTasksReorder(project.id, reordered)
                    }
                    onTaskTitleChange={handleTitleChange}
                    onTaskStatusToggle={handleStatusToggle}
                    onTaskOpenDetail={handleOpenDetail}
                    onCreateTask={makeCreateTaskHandler(project.id)}
                    onDeleteTask={handleDeleteTask}
                    showScheduled={true}
                    showDue={true}
                  />
                )
              })}
            </div>
          </TaskDndContext>
        ) : (
          <AreaKanbanBoard
            projects={orphanProjects}
            tasksByProject={tasksByProject}
            areaDirectTasks={orderedOrphanTasks}
            collapsedColumns={collapsedColumns}
            onColumnCollapseChange={toggleColumn}
            onTaskStatusChange={handleStatusChange}
            onTaskProjectChange={handleProjectChange}
            onTasksReorder={handleKanbanReorder}
            getTaskById={getTaskByIdFn}
            onTaskTitleChange={handleTitleChange}
            onTaskScheduledChange={handleScheduledChange}
            onTaskDueChange={handleDueChange}
            onTaskEditClick={handleOpenDetail}
            onProjectClick={handleNavigateToProject}
          />
        )}
      </section>
    </div>
  )
}
