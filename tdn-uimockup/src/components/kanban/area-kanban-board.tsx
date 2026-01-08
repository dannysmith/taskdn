import * as React from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus, Project } from '@/types/data'
import { taskStatusConfig } from '@/config/status'
import { SortableKanbanCard } from './kanban-column'
import {
  KanbanDndContext,
  createEmptySwimlaneData,
  useKanbanDragPreview,
} from './kanban-dnd-context'
import { DEFAULT_STATUS_ORDER } from './kanban-board'

/**
 * AreaKanbanBoard - Kanban board with project swimlanes for area views.
 *
 * Unlike KanbanBoard which just has status columns, this adds horizontal
 * swimlanes within each column - one per project plus a "Loose Tasks" lane
 * for tasks directly under the area (no project).
 *
 * Used in AreaView (kanban mode). Supports:
 * - Drag between swimlanes to change task's project
 * - Drag between columns to change status
 * - Reorder within a swimlane
 *
 * Hides "done" and "dropped" columns by default to reduce clutter.
 *
 * Also exports:
 * - LOOSE_TASKS_SWIMLANE_ID: Pseudo-project ID for area-direct tasks
 * - useAreaCollapsedColumns: Hook with area-specific default collapsed columns
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Special ID for the "Loose Tasks" swim lane (area-direct tasks with no project) */
export const LOOSE_TASKS_SWIMLANE_ID = '__loose-tasks__'

interface AreaKanbanBoardProps {
  projects: Project[]
  /** All tasks for the area organized by project */
  tasksByProject: Map<string, Task[]>
  /** Tasks that belong to the area directly (no project) */
  areaDirectTasks?: Task[]
  /** Which columns are collapsed (by status) */
  collapsedColumns: Set<TaskStatus>
  /** Called when a column's collapse state changes */
  onColumnCollapseChange: (status: TaskStatus, collapsed: boolean) => void
  /** Called when a task's status changes */
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  /** Called when a task moves to a different project */
  onTaskProjectChange: (taskId: string, newProjectId: string) => void
  /** Called when tasks are reordered within a swimlane (project or loose tasks) */
  onTasksReorder?: (
    swimlaneId: string,
    status: TaskStatus,
    reorderedTasks: Task[]
  ) => void
  /** Get a task by ID */
  getTaskById: (taskId: string) => Task | undefined
  /** Called when task title changes */
  onTaskTitleChange?: (taskId: string, newTitle: string) => void
  /** Called when task scheduled date changes */
  onTaskScheduledChange?: (taskId: string, date: string | undefined) => void
  /** Called when task due date changes */
  onTaskDueChange?: (taskId: string, date: string | undefined) => void
  /** Called when edit button is clicked */
  onTaskEditClick?: (taskId: string) => void
  /** Called when project name is clicked (to navigate) */
  onProjectClick?: (projectId: string) => void
  className?: string
}

// -----------------------------------------------------------------------------
// AreaKanbanBoard - Kanban with project swim lanes
// -----------------------------------------------------------------------------

export function AreaKanbanBoard({
  projects,
  tasksByProject,
  areaDirectTasks = [],
  collapsedColumns,
  onColumnCollapseChange,
  onTaskStatusChange,
  onTaskProjectChange,
  onTasksReorder,
  getTaskById,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
  onProjectClick,
  className,
}: AreaKanbanBoardProps) {
  // Build tasksByStatus from tasksByProject + areaDirectTasks (for DnD context)
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    for (const status of DEFAULT_STATUS_ORDER) {
      map.set(status, [])
    }

    // Add tasks from projects
    tasksByProject.forEach((tasks) => {
      for (const task of tasks) {
        const existing = map.get(task.status) ?? []
        existing.push(task)
        map.set(task.status, existing)
      }
    })

    // Add area-direct tasks
    for (const task of areaDirectTasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }

    return map
  }, [tasksByProject, areaDirectTasks])

  // Build a map of tasks by (status, projectId) for rendering swim lanes
  // Uses LOOSE_TASKS_SWIMLANE_ID for area-direct tasks
  const tasksByStatusAndProject = React.useMemo(() => {
    const map = new Map<string, Task[]>() // key: `${status}:${projectId}`

    tasksByProject.forEach((tasks, projectId) => {
      for (const task of tasks) {
        const key = `${task.status}:${projectId}`
        const existing = map.get(key) ?? []
        existing.push(task)
        map.set(key, existing)
      }
    })

    // Add area-direct tasks under the special swim lane ID
    for (const task of areaDirectTasks) {
      const key = `${task.status}:${LOOSE_TASKS_SWIMLANE_ID}`
      const existing = map.get(key) ?? []
      existing.push(task)
      map.set(key, existing)
    }

    return map
  }, [tasksByProject, areaDirectTasks])

  // Filter out done/dropped statuses from display but keep them in the model
  const displayStatuses = DEFAULT_STATUS_ORDER.filter(
    (s) => s !== 'done' && s !== 'dropped'
  )

  return (
    <KanbanDndContext
      tasksByStatus={tasksByStatus}
      onStatusChange={onTaskStatusChange}
      onTasksReorder={(status, reorderedTasks, swimlaneId) => {
        if (onTasksReorder && swimlaneId) {
          // Filter to only tasks in this swimlane and pass to handler
          const swimlaneTasks = reorderedTasks.filter((t) => {
            if (swimlaneId === LOOSE_TASKS_SWIMLANE_ID) {
              return !t.projectId
            }
            return t.projectId === swimlaneId
          })
          onTasksReorder(swimlaneId, status, swimlaneTasks)
        }
      }}
      getTaskById={getTaskById}
      onSwimlaneChange={onTaskProjectChange}
    >
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-4 min-h-[400px]',
          className
        )}
      >
        {displayStatuses.map((status) => {
          const isCollapsed = collapsedColumns.has(status)

          return (
            <AreaKanbanColumn
              key={status}
              status={status}
              projects={projects}
              tasksByStatusAndProject={tasksByStatusAndProject}
              hasLooseTasks={areaDirectTasks.length > 0}
              isCollapsed={isCollapsed}
              onCollapseChange={(collapsed) =>
                onColumnCollapseChange(status, collapsed)
              }
              onTaskStatusChange={onTaskStatusChange}
              onTaskTitleChange={onTaskTitleChange}
              onTaskScheduledChange={onTaskScheduledChange}
              onTaskDueChange={onTaskDueChange}
              onTaskEditClick={onTaskEditClick}
              onProjectClick={onProjectClick}
            />
          )
        })}
      </div>
    </KanbanDndContext>
  )
}

// -----------------------------------------------------------------------------
// AreaKanbanColumn - Column with project swim lanes
// -----------------------------------------------------------------------------

interface AreaKanbanColumnProps {
  status: TaskStatus
  projects: Project[]
  tasksByStatusAndProject: Map<string, Task[]>
  hasLooseTasks: boolean
  isCollapsed: boolean
  onCollapseChange: (collapsed: boolean) => void
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onTaskTitleChange?: (taskId: string, newTitle: string) => void
  onTaskScheduledChange?: (taskId: string, date: string | undefined) => void
  onTaskDueChange?: (taskId: string, date: string | undefined) => void
  onTaskEditClick?: (taskId: string) => void
  onProjectClick?: (projectId: string) => void
}

function AreaKanbanColumn({
  status,
  projects,
  tasksByStatusAndProject,
  hasLooseTasks,
  isCollapsed,
  onCollapseChange,
  onTaskStatusChange,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
  onProjectClick,
}: AreaKanbanColumnProps) {
  const config = taskStatusConfig[status]

  // Count total tasks in this column (including loose tasks)
  const totalTasks = React.useMemo(() => {
    let count = 0
    for (const project of projects) {
      const key = `${status}:${project.id}`
      const tasks = tasksByStatusAndProject.get(key) ?? []
      count += tasks.length
    }
    // Include loose tasks
    if (hasLooseTasks) {
      const looseKey = `${status}:${LOOSE_TASKS_SWIMLANE_ID}`
      const looseTasks = tasksByStatusAndProject.get(looseKey) ?? []
      count += looseTasks.length
    }
    return count
  }, [projects, status, tasksByStatusAndProject, hasLooseTasks])

  // Get loose tasks for this status
  const looseTasks = React.useMemo(() => {
    if (!hasLooseTasks) return []
    const key = `${status}:${LOOSE_TASKS_SWIMLANE_ID}`
    return tasksByStatusAndProject.get(key) ?? []
  }, [status, tasksByStatusAndProject, hasLooseTasks])

  const { dragPreview } = useKanbanDragPreview()
  const isDragTarget = dragPreview?.currentStatus === status

  // Collapsed state - thin strip
  if (isCollapsed) {
    return (
      <div
        className="flex flex-col items-center py-3 px-1 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onCollapseChange(false)}
        title={`Expand ${config.label} (${totalTasks})`}
      >
        <ChevronRight className="size-4 text-muted-foreground mb-2" />
        <span
          className="text-xs font-medium writing-mode-vertical"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {config.label}
        </span>
        {totalTasks > 0 && (
          <span
            className={cn(
              'mt-2 px-1.5 py-0.5 rounded-full text-2xs font-medium',
              config.color
            )}
          >
            {totalTasks}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col w-80 shrink-0 rounded-lg border bg-muted/30',
        isDragTarget && 'ring-2 ring-primary/30'
      )}
    >
      {/* Column Header */}
      <button
        type="button"
        onClick={() => onCollapseChange(true)}
        className="flex items-center gap-2 px-3 py-2.5 border-b hover:bg-muted/50 transition-colors"
      >
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            config.color
          )}
        >
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground">{totalTasks}</span>
        <ChevronRight className="size-4 text-muted-foreground ms-auto rotate-90" />
      </button>

      {/* Swim Lanes */}
      <div className="flex-1 overflow-y-auto">
        {/* Loose Tasks Swimlane (first if there are any) */}
        {hasLooseTasks && looseTasks.length > 0 && (
          <LooseTasksSwimlane
            status={status}
            tasks={looseTasks}
            onTaskStatusChange={onTaskStatusChange}
            onTaskTitleChange={onTaskTitleChange}
            onTaskScheduledChange={onTaskScheduledChange}
            onTaskDueChange={onTaskDueChange}
            onTaskEditClick={onTaskEditClick}
          />
        )}

        {projects.map((project) => {
          const key = `${status}:${project.id}`
          const tasks = tasksByStatusAndProject.get(key) ?? []

          return (
            <ProjectSwimlane
              key={project.id}
              project={project}
              status={status}
              tasks={tasks}
              onTaskStatusChange={onTaskStatusChange}
              onTaskTitleChange={onTaskTitleChange}
              onTaskScheduledChange={onTaskScheduledChange}
              onTaskDueChange={onTaskDueChange}
              onTaskEditClick={onTaskEditClick}
              onProjectClick={onProjectClick}
            />
          )
        })}

        {projects.length === 0 && !hasLooseTasks && (
          <div className="p-3 text-xs text-muted-foreground text-center">
            No projects
          </div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// ProjectSwimlane - A horizontal project section within a column
// -----------------------------------------------------------------------------

interface ProjectSwimlaneProps {
  project: Project
  status: TaskStatus
  tasks: Task[]
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onTaskTitleChange?: (taskId: string, newTitle: string) => void
  onTaskScheduledChange?: (taskId: string, date: string | undefined) => void
  onTaskDueChange?: (taskId: string, date: string | undefined) => void
  onTaskEditClick?: (taskId: string) => void
  onProjectClick?: (projectId: string) => void
}

function ProjectSwimlane({
  project,
  status,
  tasks,
  onTaskStatusChange,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
  onProjectClick,
}: ProjectSwimlaneProps) {
  const taskIds = tasks.map((t) => t.id)

  // Set up droppable for empty swimlane
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `swimlane-${status}-${project.id}`,
    data: createEmptySwimlaneData(status, project.id),
  })

  const { dragPreview } = useKanbanDragPreview()
  const isDragTarget =
    dragPreview?.currentStatus === status &&
    dragPreview?.currentSwimlaneId === project.id

  return (
    <div
      className={cn('border-b last:border-b-0', isDragTarget && 'bg-primary/5')}
    >
      {/* Swimlane Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <span className="text-xs font-medium text-muted-foreground truncate flex-1">
          {project.title}
        </span>
        {tasks.length > 0 && (
          <span className="text-2xs text-muted-foreground/70">
            {tasks.length}
          </span>
        )}
        {onProjectClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onProjectClick(project.id)
            }}
            className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
            title="Go to project"
          >
            <ExternalLink className="size-3" />
          </button>
        )}
      </div>

      {/* Tasks */}
      <div
        ref={setDroppableRef}
        className={cn(
          'p-2 space-y-2 min-h-12',
          isOver && tasks.length === 0 && 'bg-primary/5'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableKanbanCard
              key={task.id}
              task={task}
              status={status}
              swimlaneId={project.id}
              onStatusChange={
                onTaskStatusChange
                  ? (newStatus) => onTaskStatusChange(task.id, newStatus)
                  : undefined
              }
              onTitleChange={
                onTaskTitleChange
                  ? (newTitle) => onTaskTitleChange(task.id, newTitle)
                  : undefined
              }
              onScheduledChange={
                onTaskScheduledChange
                  ? (date) => onTaskScheduledChange(task.id, date)
                  : undefined
              }
              onDueChange={
                onTaskDueChange
                  ? (date) => onTaskDueChange(task.id, date)
                  : undefined
              }
              onEditClick={
                onTaskEditClick ? () => onTaskEditClick(task.id) : undefined
              }
            />
          ))}
        </SortableContext>

        {/* Empty swimlane drop target */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex items-center justify-center h-8 rounded border-2 border-dashed border-transparent text-2xs text-muted-foreground/50',
              isOver && 'border-primary/30'
            )}
          >
            {isOver ? 'Drop here' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// LooseTasksSwimlane - A swim lane for area-direct tasks (no project)
// -----------------------------------------------------------------------------

interface LooseTasksSwimlaneProps {
  status: TaskStatus
  tasks: Task[]
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onTaskTitleChange?: (taskId: string, newTitle: string) => void
  onTaskScheduledChange?: (taskId: string, date: string | undefined) => void
  onTaskDueChange?: (taskId: string, date: string | undefined) => void
  onTaskEditClick?: (taskId: string) => void
}

function LooseTasksSwimlane({
  status,
  tasks,
  onTaskStatusChange,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
}: LooseTasksSwimlaneProps) {
  const taskIds = tasks.map((t) => t.id)

  // Set up droppable for empty swimlane
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `swimlane-${status}-${LOOSE_TASKS_SWIMLANE_ID}`,
    data: createEmptySwimlaneData(status, LOOSE_TASKS_SWIMLANE_ID),
  })

  const { dragPreview } = useKanbanDragPreview()
  const isDragTarget =
    dragPreview?.currentStatus === status &&
    dragPreview?.currentSwimlaneId === LOOSE_TASKS_SWIMLANE_ID

  return (
    <div
      className={cn('border-b last:border-b-0', isDragTarget && 'bg-primary/5')}
    >
      {/* Swimlane Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/30">
        <span className="text-xs font-medium text-muted-foreground truncate flex-1 italic">
          Loose Tasks
        </span>
        {tasks.length > 0 && (
          <span className="text-2xs text-muted-foreground/70">
            {tasks.length}
          </span>
        )}
      </div>

      {/* Tasks */}
      <div
        ref={setDroppableRef}
        className={cn(
          'p-2 space-y-2 min-h-12',
          isOver && tasks.length === 0 && 'bg-primary/5'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableKanbanCard
              key={task.id}
              task={task}
              status={status}
              swimlaneId={LOOSE_TASKS_SWIMLANE_ID}
              onStatusChange={
                onTaskStatusChange
                  ? (newStatus) => onTaskStatusChange(task.id, newStatus)
                  : undefined
              }
              onTitleChange={
                onTaskTitleChange
                  ? (newTitle) => onTaskTitleChange(task.id, newTitle)
                  : undefined
              }
              onScheduledChange={
                onTaskScheduledChange
                  ? (date) => onTaskScheduledChange(task.id, date)
                  : undefined
              }
              onDueChange={
                onTaskDueChange
                  ? (date) => onTaskDueChange(task.id, date)
                  : undefined
              }
              onEditClick={
                onTaskEditClick ? () => onTaskEditClick(task.id) : undefined
              }
            />
          ))}
        </SortableContext>

        {/* Empty swimlane drop target */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex items-center justify-center h-8 rounded border-2 border-dashed border-transparent text-2xs text-muted-foreground/50',
              isOver && 'border-primary/30'
            )}
          >
            {isOver ? 'Drop here' : ''}
          </div>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Hook: useCollapsedColumns (re-export with area-specific defaults)
// -----------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useAreaCollapsedColumns() {
  const [collapsedColumns, setCollapsedColumns] = React.useState<
    Set<TaskStatus>
  >(() => {
    // Start with inbox and icebox collapsed for area view
    return new Set<TaskStatus>(['inbox', 'icebox'])
  })

  const toggleColumn = React.useCallback(
    (status: TaskStatus, collapsed: boolean) => {
      setCollapsedColumns((prev) => {
        const next = new Set(prev)
        if (collapsed) {
          next.add(status)
        } else {
          next.delete(status)
        }
        return next
      })
    },
    []
  )

  return { collapsedColumns, toggleColumn }
}
