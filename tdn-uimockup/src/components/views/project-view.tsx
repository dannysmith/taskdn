import * as React from 'react'

// TODO(tauri-integration): Migrate to TanStack Query
import { useAppData } from '@/context/app-data-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useViewMode } from '@/store/view-mode-store'
import { DraggableTaskList } from '@/components/tasks/task-list'
import { CollapsibleNotesSection } from '@/components/ui/collapsible-notes'
import { KanbanBoard, useCollapsedColumns } from '@/components/kanban'
import type { Task } from '@/types/data'

/**
 * ProjectView - Shows all tasks within a single project.
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
  const { viewMode } = useViewMode('project')
  const { collapsedColumns, toggleColumn } = useCollapsedColumns()

  const {
    getProjectById,
    getTaskById,
    getAreaById,
    getTasksByProjectId,
    createTask,
    updateTaskTitle,
    updateTaskStatus,
    updateTaskScheduled,
    updateTaskDue,
    toggleTaskStatus,
    reorderProjectTasks,
  } = useAppData()
  const { openTask } = useTaskDetailStore()

  const project = getProjectById(projectId)
  const tasks = getTasksByProjectId(projectId)

  const handleCreateTask = React.useCallback(
    (afterTaskId: string | null) => {
      return createTask({
        projectId,
        insertAfterId: afterTaskId ?? undefined,
      })
    },
    [createTask, projectId]
  )

  if (!project) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  const handleTasksReorder = (reorderedTasks: Task[]) => {
    reorderProjectTasks(
      projectId,
      reorderedTasks.map((t) => t.id)
    )
  }

  const handleTaskTitleChange = (taskId: string, newTitle: string) => {
    updateTaskTitle(taskId, newTitle)
  }

  const handleTaskStatusToggle = (taskId: string) => {
    toggleTaskStatus(taskId)
  }

  return (
    <div className="space-y-6">
      {/* Project Notes (collapsible) */}
      {project.notes && (
        <CollapsibleNotesSection
          notes={project.notes}
          title="About this project"
        />
      )}

      {/* Tasks Section */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground mb-3">
          Tasks
        </h2>

        {viewMode === 'list' ? (
          <>
            <DraggableTaskList
              tasks={tasks}
              projectId={projectId}
              onTasksReorder={handleTasksReorder}
              onTaskTitleChange={handleTaskTitleChange}
              onTaskStatusToggle={handleTaskStatusToggle}
              onTaskOpenDetail={openTask}
              onCreateTask={handleCreateTask}
            />
            {tasks.length === 0 && (
              <p className="text-muted-foreground text-sm">
                No tasks in this project yet.
              </p>
            )}
          </>
        ) : (
          <KanbanBoard
            tasks={tasks}
            collapsedColumns={collapsedColumns}
            onColumnCollapseChange={toggleColumn}
            onTaskStatusChange={updateTaskStatus}
            onTasksReorder={(_status, reorderedColumnTasks) => {
              // Merge the reordered column tasks back into the full project task list
              // to preserve the order of tasks in other status columns
              const reorderedIds = new Set(
                reorderedColumnTasks.map((t) => t.id)
              )
              const result: Task[] = []
              let columnIndex = 0

              for (const task of tasks) {
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

              reorderProjectTasks(
                projectId,
                result.map((t) => t.id)
              )
            }}
            getTaskById={getTaskById}
            getAreaName={(areaId) => getAreaById(areaId)?.title}
            onTaskTitleChange={updateTaskTitle}
            onTaskScheduledChange={updateTaskScheduled}
            onTaskDueChange={updateTaskDue}
            onTaskEditClick={openTask}
            onCreateTask={(status) => createTask({ projectId, status })}
          />
        )}
      </section>
    </div>
  )
}
