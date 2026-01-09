import * as React from 'react'
import { ListTodo } from 'lucide-react'

import {
  useVaultData,
  useVaultHelpers,
  useUpdateTask,
  useCreateTask,
} from '@/services/vault'
import { useDisplayOrderStore } from '@/store/display-order-store'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'
import { useTaskDetailStore } from '@/store/task-detail-store'
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
import { ProjectCard } from '@/components/cards/project-card'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AreaKanbanBoard,
  useAreaCollapsedColumns,
  LOOSE_TASKS_SWIMLANE_ID,
} from '@/components/kanban'

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
 * AreaView - Shows all projects and tasks within a life area.
 *
 * Areas represent ongoing life responsibilities (e.g., "Health", "Finance",
 * "Work"). This view displays:
 * 1. Area notes (collapsible) - background info about this life area
 * 2. Active Projects grid - cards for in-progress/ready/planning/blocked projects
 * 3. All Projects list OR Kanban - depends on view mode toggle
 *
 * Supports two view modes (toggled via ViewHeader):
 * - "list" → Collapsible project groups with task lists + loose tasks section
 * - "kanban" → AreaKanbanBoard with swimlanes per project, tasks by status
 *
 * Tasks can be dragged between projects in list mode. "Loose tasks" are tasks
 * directly under the area without a project.
 */

/** Active statuses for project cards grid */
const ACTIVE_STATUSES = ['in-progress', 'ready', 'planning', 'blocked'] as const

interface AreaViewProps {
  areaId: string
}

export function AreaView({ areaId }: AreaViewProps) {
  const { tasks, projects, areas } = useVaultData()
  const {
    getProjectsByAreaId,
    getAreaDirectTasks,
    getProjectCompletion,
    getTaskCounts,
    getTaskById,
  } = useVaultHelpers()
  const updateTask = useUpdateTask()
  const createTask = useCreateTask()
  const openTask = useTaskDetailStore(state => state.openTask)
  const setSelection = useNavigationStore(state => state.setSelection)
  const { viewMode } = useViewMode('area')
  const { collapsedColumns, toggleColumn } = useAreaCollapsedColumns()

  // Get project task order from Zustand (used to apply stored order in tasksByProject)
  const projectTaskOrder = useDisplayOrderStore(state => state.projectTaskOrder)

  // Find the area
  const area = React.useMemo(() => {
    return areas.find(a => a.id === areaId)
  }, [areas, areaId])

  // Get projects in this area
  const areaProjects = React.useMemo(() => {
    return getProjectsByAreaId(areaId)
  }, [getProjectsByAreaId, areaId])

  // Get area-direct tasks (tasks in this area but not in any project)
  const areaDirectTasks = React.useMemo(() => {
    return getAreaDirectTasks(areaId)
  }, [getAreaDirectTasks, areaId])

  // Split projects into active (for grid)
  // Note: projects with null status default to 'planning' per S1 spec
  const activeProjects = React.useMemo(() => {
    return areaProjects.filter(p => {
      const status = p.status ?? 'planning'
      return ACTIVE_STATUSES.includes(status as (typeof ACTIVE_STATUSES)[number])
    })
  }, [areaProjects])

  // Manage display order for loose tasks
  const {
    setOrder: setLooseTasksOrder,
    getOrderedTasks: getOrderedLooseTasks,
  } = useAreaOrder(areaId, areaDirectTasks)
  const orderedLooseTasks = getOrderedLooseTasks()

  // Build tasksByProject map for TaskDndContext (includes loose tasks as pseudo-project)
  const looseTasksProjectId = getLooseTasksProjectId(areaId)
  const tasksByProject = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    // Add loose tasks with pseudo-project ID (already ordered via useAreaOrder)
    map.set(looseTasksProjectId, orderedLooseTasks)
    // Add regular project tasks with stored order applied
    for (const project of areaProjects) {
      const rawProjectTasks = tasks.filter(t =>
        t.project?.includes(project.title)
      )
      const storedOrder = projectTaskOrder?.[project.id] ?? null
      const orderedProjectTasks = applyStoredOrder(rawProjectTasks, storedOrder)
      map.set(project.id, orderedProjectTasks)
    }
    return map
  }, [
    areaProjects,
    tasks,
    looseTasksProjectId,
    orderedLooseTasks,
    projectTaskOrder,
  ])

  // Build tasksByStatus map for kanban view
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    // Collect all tasks from projects and loose tasks
    const allTasks = [...orderedLooseTasks]
    for (const project of areaProjects) {
      const projectTasks = tasks.filter(t => t.project?.includes(project.title))
      allTasks.push(...projectTasks)
    }
    for (const task of allTasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }
    return map
  }, [orderedLooseTasks, areaProjects, tasks])

  // Manage kanban column order
  const { setColumnOrder } = useKanbanOrder(`area-${areaId}`, tasksByStatus)

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

  // Handler for creating loose tasks (no project)
  const handleCreateLooseTask = React.useCallback(
    async (_afterTaskId: string | null): Promise<string | undefined> => {
      const newTask = await createTask.mutateAsync({
        title: '',
        status: 'ready',
        projectId: null,
        areaId: areaId,
        scheduled: null,
        due: null,
        deferUntil: null,
      })
      return newTask.id
    },
    [createTask, areaId]
  )

  // Factory function to create task creation handlers for each project
  const makeCreateTaskHandler = React.useCallback(
    (projectId: string) =>
      async (_afterTaskId: string | null): Promise<string | undefined> => {
        const project = projects.find(p => p.id === projectId)
        const newTask = await createTask.mutateAsync({
          title: '',
          status: 'ready',
          projectId,
          areaId: project?.area ?? null,
          scheduled: null,
          due: null,
          deferUntil: null,
        })
        return newTask.id
      },
    [createTask, projects]
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
      // Find the project to get its WikiLink format
      if (newProjectId === LOOSE_TASKS_SWIMLANE_ID) {
        // Moving to loose tasks - clear project but keep area
        updateTask.mutate({
          id: taskId,
          title: null,
          status: null,
          project: '', // Empty string to clear
          area: area?.title ? `[[${area.title}]]` : null,
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
            area: null, // Area is inherited from project
            scheduled: null,
            due: null,
            deferUntil: null,
            body: null,
          })
        }
      }
    },
    [updateTask, area, projects]
  )

  const handleOpenDetail = React.useCallback(
    (taskId: string) => {
      openTask(taskId)
    },
    [openTask]
  )

  // Handler for reordering tasks within a container
  const handleTasksReorder = React.useCallback(
    (projectId: string, reorderedTasks: Task[]) => {
      if (isLooseTasksProjectId(projectId)) {
        // Reordering loose tasks within the area
        setLooseTasksOrder(reorderedTasks)
      } else {
        // Reordering tasks within a project - store in project order
        const { setProjectTaskOrder } = useDisplayOrderStore.getState()
        setProjectTaskOrder(
          projectId,
          reorderedTasks.map(t => t.id)
        )
      }
    },
    [setLooseTasksOrder]
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
        // Moving to loose tasks: clear project but keep area
        updateTask.mutate({
          id: taskId,
          title: null,
          status: null,
          project: '', // Empty string to clear
          area: area?.title ? `[[${area.title}]]` : null,
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
            area: null, // Area is inherited from project
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
        setAreaTaskOrder(areaId, newSourceOrder)
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
        setAreaTaskOrder(areaId, newTargetOrder)
      } else {
        setProjectTaskOrder(toProjectId, newTargetOrder)
      }
    },
    [updateTask, area, projects, tasksByProject, areaId]
  )

  // Combine description and body for notes
  const areaNotes = React.useMemo(() => {
    if (!area) return ''
    const parts: string[] = []
    if (area.description) parts.push(area.description)
    if (area.body) parts.push(area.body)
    return parts.join('\n\n')
  }, [area])

  // Handler for kanban task reorder
  const handleKanbanReorder = React.useCallback(
    (swimlaneId: string, status: TaskStatus, reorderedColumnTasks: Task[]) => {
      // Merge the reordered column tasks back into the full task list
      // for this swimlane (project or loose tasks)
      const isLooseTasks = swimlaneId === LOOSE_TASKS_SWIMLANE_ID
      const allTasks = isLooseTasks
        ? orderedLooseTasks
        : (tasksByProject.get(swimlaneId) ?? [])

      const reorderedIds = new Set(reorderedColumnTasks.map(t => t.id))
      const result: Task[] = []
      let columnIndex = 0

      for (const task of allTasks) {
        if (reorderedIds.has(task.id)) {
          // This task is in the reordered column - use new order
          const reorderedTask = reorderedColumnTasks[columnIndex]
          if (reorderedTask) {
            result.push(reorderedTask)
            columnIndex++
          }
        } else {
          // Task from a different column - preserve position
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
        setLooseTasksOrder(result)
      } else {
        setColumnOrder(status, reorderedColumnTasks)
      }
    },
    [orderedLooseTasks, tasksByProject, setLooseTasksOrder, setColumnOrder]
  )

  if (!area) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="Area not found"
          description="This area may have been deleted or moved."
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Area Notes (collapsible) */}
      {areaNotes && (
        <CollapsibleNotesSection notes={areaNotes} title="About this area" />
      )}

      {/* Active Projects Grid */}
      {activeProjects.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Active Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map(project => {
              const completion = getProjectCompletion(project.id)
              const { taskCount, completedTaskCount } = getTaskCounts(
                project.id
              )
              return (
                <ProjectCard
                  key={project.id}
                  project={project}
                  completion={completion}
                  taskCount={taskCount}
                  completedTaskCount={completedTaskCount}
                  onClick={() => handleNavigateToProject(project.id)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Projects/Tasks Content */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          {viewMode === 'list' ? 'All Projects' : 'Tasks by Status'}
        </h2>

        {viewMode === 'list' ? (
          <TaskDndContext
            tasksByProject={tasksByProject}
            onTaskMove={handleTaskMove}
            onTasksReorder={handleTasksReorder}
            getTaskById={getTaskByIdFn}
          >
            <div className="space-y-4">
              {/* Area-direct tasks (tasks in this area but not in any project) */}
              <SectionTaskGroup
                sectionId={looseTasksProjectId}
                title="Loose Tasks"
                icon={<ListTodo className="size-4" />}
                tasks={orderedLooseTasks}
                onTasksReorder={reorderedTasks =>
                  handleTasksReorder(looseTasksProjectId, reorderedTasks)
                }
                onTaskTitleChange={handleTitleChange}
                onTaskStatusToggle={handleStatusToggle}
                onTaskOpenDetail={handleOpenDetail}
                onCreateTask={handleCreateLooseTask}
                showScheduled={true}
                showDue={true}
                defaultExpanded={true}
                useExternalDnd={true}
              />

              {areaProjects.map(project => {
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
                    showScheduled={true}
                    showDue={true}
                  />
                )
              })}

              {areaProjects.length === 0 && orderedLooseTasks.length === 0 && (
                <EmptyState
                  title="No projects or tasks"
                  description="This area doesn't have any projects or tasks yet."
                />
              )}
            </div>
          </TaskDndContext>
        ) : (
          <AreaKanbanBoard
            projects={areaProjects}
            tasksByProject={tasksByProject}
            areaDirectTasks={orderedLooseTasks}
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
