import * as React from 'react'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/data'
import { KanbanColumn } from './kanban-column'
import { KanbanDndContext } from './kanban-dnd-context'

/**
 * KanbanBoard - Horizontal board with status columns for task management.
 *
 * Used in ProjectView and WeekView (kanban mode). Displays tasks grouped by
 * status, with drag-and-drop to change task status or reorder within a column.
 *
 * Columns can be collapsed into thin strips to save horizontal space.
 * By default, "inbox" and "icebox" are collapsed since they're less common.
 *
 * Also exports:
 * - DEFAULT_STATUS_ORDER: Standard column ordering
 * - DEFAULT_EXPANDED_STATUSES: Which columns start expanded
 * - useCollapsedColumns hook: Manages column collapse state
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Default column order for task status Kanban boards */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_STATUS_ORDER: TaskStatus[] = [
  'inbox',
  'icebox',
  'ready',
  'in-progress',
  'blocked',
  'done',
  'dropped',
]

/** Columns to show expanded by default */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_EXPANDED_STATUSES: TaskStatus[] = [
  'ready',
  'in-progress',
  'blocked',
]

interface KanbanBoardProps {
  tasks: Task[]
  /** Which columns are collapsed (by status) */
  collapsedColumns: Set<TaskStatus>
  /** Called when a column's collapse state changes */
  onColumnCollapseChange: (status: TaskStatus, collapsed: boolean) => void
  /** Called when a task's status changes */
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => void
  /** Called when tasks are reordered within a column (and swimlane if applicable) */
  onTasksReorder?: (
    status: TaskStatus,
    reorderedTasks: Task[],
    swimlaneId?: string
  ) => void
  /** Get a task by ID */
  getTaskById: (taskId: string) => Task | undefined
  /** Get project name for a task */
  getProjectName?: (projectId: string) => string | undefined
  /** Get area name for a task */
  getAreaName?: (areaId: string) => string | undefined
  /** Called when task title changes */
  onTaskTitleChange?: (taskId: string, newTitle: string) => void
  /** Called when task scheduled date changes */
  onTaskScheduledChange?: (taskId: string, date: string | undefined) => void
  /** Called when task due date changes */
  onTaskDueChange?: (taskId: string, date: string | undefined) => void
  /** Called when edit button is clicked */
  onTaskEditClick?: (taskId: string) => void
  /** Called when project name is clicked */
  onProjectClick?: (projectId: string) => void
  /** Called when area name is clicked */
  onAreaClick?: (areaId: string) => void
  /** Called when + button is clicked to create a task. Returns the new task ID. */
  onCreateTask?: (status: TaskStatus) => string | void
  /** Column order - defaults to DEFAULT_STATUS_ORDER */
  columnOrder?: TaskStatus[]
  /** Which statuses to display - defaults to all in columnOrder */
  visibleStatuses?: TaskStatus[]
  className?: string
}

// -----------------------------------------------------------------------------
// KanbanBoard
// -----------------------------------------------------------------------------

export function KanbanBoard({
  tasks,
  collapsedColumns,
  onColumnCollapseChange,
  onTaskStatusChange,
  onTasksReorder,
  getTaskById,
  getProjectName,
  getAreaName,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
  onProjectClick,
  onAreaClick,
  onCreateTask,
  columnOrder = DEFAULT_STATUS_ORDER,
  visibleStatuses,
  className,
}: KanbanBoardProps) {
  // Track newly created task ID for auto-focus
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)

  // Handle creating a task in a column
  const handleCreateTask = React.useCallback(
    (status: TaskStatus) => {
      if (!onCreateTask) return
      const newTaskId = onCreateTask(status)
      if (newTaskId) {
        setEditingTaskId(newTaskId)
      }
    },
    [onCreateTask]
  )

  // Clear editing state when task title is changed (user finished editing)
  const handleTaskTitleChange = React.useCallback(
    (taskId: string, newTitle: string) => {
      onTaskTitleChange?.(taskId, newTitle)
      if (taskId === editingTaskId) {
        setEditingTaskId(null)
      }
    },
    [onTaskTitleChange, editingTaskId]
  )
  // Build tasks by status map
  const tasksByStatus = React.useMemo(() => {
    const map = new Map<TaskStatus, Task[]>()
    // Initialize all statuses with empty arrays
    for (const status of columnOrder) {
      map.set(status, [])
    }
    // Group tasks by status
    for (const task of tasks) {
      const existing = map.get(task.status) ?? []
      existing.push(task)
      map.set(task.status, existing)
    }
    return map
  }, [tasks, columnOrder])

  // Determine which statuses to show
  const displayStatuses = visibleStatuses ?? columnOrder

  // Handle task reordering
  const handleTasksReorder = (
    status: TaskStatus,
    reorderedTasks: Task[],
    swimlaneId?: string
  ) => {
    onTasksReorder?.(status, reorderedTasks, swimlaneId)
  }

  return (
    <KanbanDndContext
      tasksByStatus={tasksByStatus}
      onStatusChange={onTaskStatusChange}
      onTasksReorder={handleTasksReorder}
      getTaskById={getTaskById}
    >
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-4 min-h-[400px]',
          className
        )}
      >
        {displayStatuses.map((status) => {
          const statusTasks = tasksByStatus.get(status) ?? []
          const isCollapsed = collapsedColumns.has(status)

          return (
            <KanbanColumn
              key={status}
              status={status}
              tasks={statusTasks}
              isCollapsed={isCollapsed}
              onCollapseChange={(collapsed) =>
                onColumnCollapseChange(status, collapsed)
              }
              getProjectName={getProjectName}
              getAreaName={getAreaName}
              onTaskStatusChange={onTaskStatusChange}
              onTaskTitleChange={handleTaskTitleChange}
              onTaskScheduledChange={onTaskScheduledChange}
              onTaskDueChange={onTaskDueChange}
              onTaskEditClick={onTaskEditClick}
              onProjectClick={onProjectClick}
              onAreaClick={onAreaClick}
              onCreateTask={
                onCreateTask ? () => handleCreateTask(status) : undefined
              }
              editingTaskId={editingTaskId}
            />
          )
        })}
      </div>
    </KanbanDndContext>
  )
}

// -----------------------------------------------------------------------------
// Hook: useCollapsedColumns
// -----------------------------------------------------------------------------

/**
 * Hook to manage collapsed column state for a Kanban board.
 * Initializes with sensible defaults (common columns expanded).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCollapsedColumns(
  initialExpanded: TaskStatus[] = DEFAULT_EXPANDED_STATUSES
) {
  const [collapsedColumns, setCollapsedColumns] = React.useState<
    Set<TaskStatus>
  >(() => {
    // Start with all columns collapsed except the initial expanded ones
    const collapsed = new Set<TaskStatus>(DEFAULT_STATUS_ORDER)
    for (const status of initialExpanded) {
      collapsed.delete(status)
    }
    return collapsed
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
