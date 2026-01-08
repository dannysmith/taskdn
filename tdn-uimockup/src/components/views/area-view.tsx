import * as React from 'react'
import { ListTodo } from 'lucide-react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useViewMode } from '@/store/view-mode-store'
import { ProjectTaskGroup } from '@/components/tasks/project-task-group'
import { SectionTaskGroup } from '@/components/tasks/section-task-group'
import {
  TaskDndContext,
  getLooseTasksProjectId,
  isLooseTasksProjectId,
} from '@/components/tasks/task-dnd-context'
import { ProjectCard } from '@/components/cards/project-card'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'
import {
  AreaKanbanBoard,
  useAreaCollapsedColumns,
  LOOSE_TASKS_SWIMLANE_ID,
} from '@/components/kanban'
import type { Task, Project } from '@/types/data'

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
const ACTIVE_STATUSES: Project['status'][] = [
  'in-progress',
  'ready',
  'planning',
  'blocked',
]

interface AreaViewProps {
  areaId: string
  onNavigateToProject: (projectId: string) => void
}

export function AreaView({ areaId, onNavigateToProject }: AreaViewProps) {
  const { viewMode } = useViewMode('area')
  const { collapsedColumns, toggleColumn } = useAreaCollapsedColumns()

  const {
    getAreaById,
    getProjectsByAreaId,
    getTasksByProjectId,
    getAreaDirectTasks,
    getProjectCompletion,
    getTaskById,
    createTask,
    updateTaskTitle,
    updateTaskStatus,
    updateTaskScheduled,
    updateTaskDue,
    updateTaskProject,
    toggleTaskStatus,
    reorderProjectTasks,
    reorderAreaLooseTasks,
    moveTaskToProject,
    moveTaskToLooseTasks,
  } = useAppData()
  const { openTask } = useTaskDetailStore()

  const area = getAreaById(areaId)
  const projects = getProjectsByAreaId(areaId)
  const areaDirectTasks = getAreaDirectTasks(areaId)

  // Split projects into active (for grid) and all (for task groups)
  const activeProjects = React.useMemo(() => {
    return projects.filter((p) => ACTIVE_STATUSES.includes(p.status))
  }, [projects])

  // Build tasksByProject map for TaskDndContext (includes loose tasks as pseudo-project)
  const looseTasksProjectId = getLooseTasksProjectId(areaId)
  const tasksByProject = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    // Add loose tasks with pseudo-project ID
    map.set(looseTasksProjectId, areaDirectTasks)
    // Add regular project tasks
    for (const project of projects) {
      map.set(project.id, getTasksByProjectId(project.id))
    }
    return map
  }, [projects, getTasksByProjectId, looseTasksProjectId, areaDirectTasks])

  // Get task counts for ProjectCard
  const getTaskCounts = React.useCallback(
    (projectId: string) => {
      const tasks = tasksByProject.get(projectId) ?? []
      const completedTaskCount = tasks.filter(
        (t) => t.status === 'done' || t.status === 'dropped'
      ).length
      return { taskCount: tasks.length, completedTaskCount }
    },
    [tasksByProject]
  )

  // Factory function to create task creation handlers for each project
  const makeCreateTaskHandler = React.useCallback(
    (projectId: string) => (afterTaskId: string | null) => {
      return createTask({
        projectId,
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask]
  )

  // Handler for creating area-direct tasks (no project)
  const handleCreateAreaDirectTask = React.useCallback(
    (afterTaskId: string | null) => {
      return createTask({
        areaId,
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask, areaId]
  )

  if (!area) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Area not found.</p>
      </div>
    )
  }

  const handleTasksReorder = (projectId: string, reorderedTasks: Task[]) => {
    if (isLooseTasksProjectId(projectId)) {
      // Reordering loose tasks within the area
      reorderAreaLooseTasks(
        areaId,
        reorderedTasks.map((t) => t.id)
      )
    } else {
      // Reordering tasks within a project
      reorderProjectTasks(
        projectId,
        reorderedTasks.map((t) => t.id)
      )
    }
  }

  const handleTaskMove = (
    taskId: string,
    _fromProjectId: string,
    toProjectId: string,
    insertBeforeTaskId: string | null
  ) => {
    if (isLooseTasksProjectId(toProjectId)) {
      // Moving to loose tasks: clear projectId and ensure areaId is set
      moveTaskToLooseTasks(taskId, areaId, insertBeforeTaskId)
    } else {
      // Moving to a project
      moveTaskToProject(taskId, toProjectId, insertBeforeTaskId)
    }
  }

  return (
    <div className="space-y-8">
      {/* Area Notes (collapsible) */}
      {area.notes && (
        <CollapsibleNotesSection notes={area.notes} title="About this area" />
      )}

      {/* Active Projects Grid */}
      {activeProjects.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Active Projects
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeProjects.map((project) => {
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
                  onClick={() => onNavigateToProject(project.id)}
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
            getTaskById={getTaskById}
          >
            <div className="space-y-4">
              {/* Area-direct tasks (tasks in this area but not in any project) */}
              <SectionTaskGroup
                sectionId={looseTasksProjectId}
                title="Loose Tasks"
                icon={<ListTodo className="size-4" />}
                tasks={areaDirectTasks}
                onTasksReorder={(reorderedTasks) =>
                  handleTasksReorder(looseTasksProjectId, reorderedTasks)
                }
                onTaskTitleChange={(taskId, newTitle) =>
                  updateTaskTitle(taskId, newTitle)
                }
                onTaskStatusToggle={(taskId) => toggleTaskStatus(taskId)}
                onTaskOpenDetail={openTask}
                onCreateTask={handleCreateAreaDirectTask}
                showScheduled={true}
                showDue={true}
                defaultExpanded={true}
                useExternalDnd={true}
              />

              {projects.map((project) => {
                const tasks = tasksByProject.get(project.id) ?? []
                const completion = getProjectCompletion(project.id)

                return (
                  <ProjectTaskGroup
                    key={project.id}
                    project={project}
                    tasks={tasks}
                    completion={completion}
                    onOpenProject={() => onNavigateToProject(project.id)}
                    onTasksReorder={(reordered) =>
                      handleTasksReorder(project.id, reordered)
                    }
                    onTaskTitleChange={(taskId, newTitle) =>
                      updateTaskTitle(taskId, newTitle)
                    }
                    onTaskStatusToggle={(taskId) => toggleTaskStatus(taskId)}
                    onTaskOpenDetail={openTask}
                    onCreateTask={makeCreateTaskHandler(project.id)}
                    showScheduled={true}
                    showDue={true}
                  />
                )
              })}

              {projects.length === 0 && areaDirectTasks.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No projects or tasks in this area yet.
                </p>
              )}
            </div>
          </TaskDndContext>
        ) : (
          <AreaKanbanBoard
            projects={projects}
            tasksByProject={tasksByProject}
            areaDirectTasks={areaDirectTasks}
            collapsedColumns={collapsedColumns}
            onColumnCollapseChange={toggleColumn}
            onTaskStatusChange={updateTaskStatus}
            onTaskProjectChange={updateTaskProject}
            onTasksReorder={(swimlaneId, _status, reorderedColumnTasks) => {
              // Merge the reordered column tasks back into the full task list
              // for this swimlane (project or loose tasks)
              const isLooseTasks = swimlaneId === LOOSE_TASKS_SWIMLANE_ID
              const allTasks = isLooseTasks
                ? areaDirectTasks
                : (tasksByProject.get(swimlaneId) ?? [])

              const reorderedIds = new Set(
                reorderedColumnTasks.map((t) => t.id)
              )
              const result: Task[] = []
              let columnIndex = 0

              for (const task of allTasks) {
                if (reorderedIds.has(task.id)) {
                  // This task is in the reordered column - use new order
                  if (columnIndex < reorderedColumnTasks.length) {
                    result.push(reorderedColumnTasks[columnIndex])
                    columnIndex++
                  }
                } else {
                  // Task from a different column - preserve position
                  result.push(task)
                }
              }

              // Append any remaining tasks from reorderedColumnTasks that weren't in allTasks
              // (e.g., tasks added during the drag operation)
              while (columnIndex < reorderedColumnTasks.length) {
                result.push(reorderedColumnTasks[columnIndex])
                columnIndex++
              }

              if (isLooseTasks) {
                reorderAreaLooseTasks(
                  areaId,
                  result.map((t) => t.id)
                )
              } else {
                reorderProjectTasks(
                  swimlaneId,
                  result.map((t) => t.id)
                )
              }
            }}
            getTaskById={getTaskById}
            onTaskTitleChange={updateTaskTitle}
            onTaskScheduledChange={updateTaskScheduled}
            onTaskDueChange={updateTaskDue}
            onTaskEditClick={openTask}
            onProjectClick={onNavigateToProject}
          />
        )}
      </section>
    </div>
  )
}
