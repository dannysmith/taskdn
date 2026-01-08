import * as React from 'react'
import { ListTodo } from 'lucide-react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useViewMode } from '@/store/view-mode-store'
import { ProjectTaskGroup } from '@/components/tasks/project-task-group'
import { SectionTaskGroup } from '@/components/tasks/section-task-group'
import { TaskDndContext } from '@/components/tasks/task-dnd-context'
import { AreaKanbanBoard, useAreaCollapsedColumns } from '@/components/kanban'
import type { Task } from '@/types/data'

/**
 * NoAreaView - Shows orphan projects and tasks that aren't assigned to any area.
 *
 * This view appears when clicking the "No Area" item in the sidebar. It displays:
 * - Projects that have no areaId set
 * - "Loose tasks" that have neither projectId nor areaId
 *
 * Supports the same view modes as AreaView (list and kanban). In list mode,
 * tasks can be dragged between orphan projects. This view helps users find
 * and organize items that haven't been assigned to a life area yet.
 */
interface NoAreaViewProps {
  onNavigateToProject: (projectId: string) => void
}

/**
 * View for orphan projects and tasks (items without an area).
 * Shows orphan projects with their tasks, plus any truly orphan tasks
 * (tasks with no project AND no area).
 */
export function NoAreaView({ onNavigateToProject }: NoAreaViewProps) {
  const { viewMode } = useViewMode('area')
  const { collapsedColumns, toggleColumn } = useAreaCollapsedColumns()

  const {
    getOrphanProjects,
    getOrphanTasks,
    getTasksByProjectId,
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
    moveTaskToProject,
  } = useAppData()
  const { openTask } = useTaskDetailStore()

  const projects = getOrphanProjects()
  const orphanTasks = getOrphanTasks()

  // Build tasksByProject map for TaskDndContext
  const tasksByProject = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const project of projects) {
      map.set(project.id, getTasksByProjectId(project.id))
    }
    return map
  }, [projects, getTasksByProjectId])

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

  // Handler for creating orphan tasks (no project, no area)
  const handleCreateOrphanTask = React.useCallback(
    (afterTaskId: string | null) => {
      return createTask({
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask]
  )

  const handleTasksReorder = (projectId: string, reorderedTasks: Task[]) => {
    reorderProjectTasks(
      projectId,
      reorderedTasks.map((t) => t.id)
    )
  }

  const handleTaskMove = (
    taskId: string,
    _fromProjectId: string,
    toProjectId: string
  ) => {
    moveTaskToProject(taskId, toProjectId)
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
            getTaskById={getTaskById}
          >
            <div className="space-y-4">
              {/* Orphan tasks (tasks with no project AND no area) */}
              {orphanTasks.length > 0 && (
                <SectionTaskGroup
                  sectionId="orphan-tasks"
                  title="Loose Tasks"
                  icon={<ListTodo className="size-4" />}
                  tasks={orphanTasks}
                  onTasksReorder={() => {
                    // Reordering orphan tasks not yet supported
                  }}
                  onTaskTitleChange={(taskId, newTitle) =>
                    updateTaskTitle(taskId, newTitle)
                  }
                  onTaskStatusToggle={(taskId) => toggleTaskStatus(taskId)}
                  onTaskOpenDetail={openTask}
                  onCreateTask={handleCreateOrphanTask}
                  showScheduled={true}
                  showDue={true}
                  defaultExpanded={true}
                />
              )}

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

              {projects.length === 0 && orphanTasks.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No projects or tasks without an area.
                </p>
              )}
            </div>
          </TaskDndContext>
        ) : (
          <AreaKanbanBoard
            projects={projects}
            tasksByProject={tasksByProject}
            areaDirectTasks={orphanTasks}
            collapsedColumns={collapsedColumns}
            onColumnCollapseChange={toggleColumn}
            onTaskStatusChange={updateTaskStatus}
            onTaskProjectChange={updateTaskProject}
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
