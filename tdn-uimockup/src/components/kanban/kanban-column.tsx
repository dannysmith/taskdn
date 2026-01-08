import * as React from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/data'
import { taskStatusConfig } from '@/config/status'
import { TaskCard } from '@/components/cards/task-card'
import {
  createKanbanTaskData,
  createEmptyColumnData,
  useKanbanDragPreview,
} from './kanban-dnd-context'

/**
 * KanbanColumn - A single status column in a Kanban board.
 *
 * Two visual states:
 * - Expanded: Shows column header, task cards, and "Add task" button
 * - Collapsed: Thin vertical strip with rotated label and task count
 *
 * Tasks are rendered as TaskCards wrapped in SortableKanbanCard for drag-drop.
 * Empty columns show a dashed drop zone for visual feedback.
 *
 * Also exports SortableKanbanCard - the draggable TaskCard wrapper.
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  /** Whether the column is collapsed */
  isCollapsed: boolean
  /** Called when collapse state changes */
  onCollapseChange: (collapsed: boolean) => void
  /** Get project name for a task */
  getProjectName?: (projectId: string) => string | undefined
  /** Get area name for a task */
  getAreaName?: (areaId: string) => string | undefined
  /** Called when task status changes */
  onTaskStatusChange?: (taskId: string, newStatus: TaskStatus) => void
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
  /** Called when + button is clicked to create a task */
  onCreateTask?: () => void
  /** ID of task currently being edited (for auto-focus) */
  editingTaskId?: string | null
  className?: string
}

// -----------------------------------------------------------------------------
// KanbanColumn
// -----------------------------------------------------------------------------

export function KanbanColumn({
  status,
  tasks,
  isCollapsed,
  onCollapseChange,
  getProjectName,
  getAreaName,
  onTaskStatusChange,
  onTaskTitleChange,
  onTaskScheduledChange,
  onTaskDueChange,
  onTaskEditClick,
  onProjectClick,
  onAreaClick,
  onCreateTask,
  editingTaskId,
  className,
}: KanbanColumnProps) {
  const config = taskStatusConfig[status]
  const taskIds = tasks.map((t) => t.id)

  // Set up droppable for empty column
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: createEmptyColumnData(status),
  })

  const { dragPreview } = useKanbanDragPreview()
  const isDragTarget = dragPreview?.currentStatus === status

  // Collapsed state - thin strip
  if (isCollapsed) {
    return (
      <div
        className={cn(
          'flex flex-col items-center py-3 px-1 rounded-lg border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors',
          className
        )}
        onClick={() => onCollapseChange(false)}
        title={`Expand ${config.label} (${tasks.length})`}
      >
        <ChevronRight className="size-4 text-muted-foreground mb-2" />
        <span
          className="text-xs font-medium writing-mode-vertical"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {config.label}
        </span>
        {tasks.length > 0 && (
          <span
            className={cn(
              'mt-2 px-1.5 py-0.5 rounded-full text-2xs font-medium',
              config.color
            )}
          >
            {tasks.length}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        '@container flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30',
        isDragTarget && 'ring-2 ring-primary/30',
        className
      )}
    >
      {/* Column Header */}
      <button
        type="button"
        onClick={() => onCollapseChange(true)}
        className="flex items-center gap-2 px-3 py-2.5 border-b hover:bg-muted/50 transition-colors min-w-0"
      >
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
            config.color
          )}
        >
          {config.label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums shrink-0">{tasks.length}</span>
        <ChevronRight className="size-4 text-muted-foreground ms-auto rotate-90 shrink-0" />
      </button>

      {/* Column Content */}
      <div
        ref={setDroppableRef}
        className={cn(
          'flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] flex flex-col',
          isOver && tasks.length === 0 && 'bg-primary/5'
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableKanbanCard
              key={task.id}
              task={task}
              status={status}
              projectName={
                task.projectId ? getProjectName?.(task.projectId) : undefined
              }
              areaName={task.areaId ? getAreaName?.(task.areaId) : undefined}
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
              onProjectClick={
                task.projectId && onProjectClick
                  ? () => onProjectClick(task.projectId!)
                  : undefined
              }
              onAreaClick={
                task.areaId && onAreaClick
                  ? () => onAreaClick(task.areaId!)
                  : undefined
              }
              autoFocusEdit={task.id === editingTaskId}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {tasks.length === 0 && (
          <div
            className={cn(
              'flex items-center justify-center h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 text-xs text-muted-foreground',
              isOver && 'border-primary/50 bg-primary/5'
            )}
          >
            Drop tasks here
          </div>
        )}

        {/* Add task button */}
        {onCreateTask && (
          <button
            type="button"
            onClick={onCreateTask}
            className="mt-auto flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
          >
            <Plus className="size-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// SortableKanbanCard - Draggable wrapper for TaskCard
// -----------------------------------------------------------------------------

interface SortableKanbanCardProps {
  task: Task
  status: TaskStatus
  swimlaneId?: string
  projectName?: string
  areaName?: string
  onStatusChange?: (newStatus: TaskStatus) => void
  onTitleChange?: (newTitle: string) => void
  onScheduledChange?: (date: string | undefined) => void
  onDueChange?: (date: string | undefined) => void
  onEditClick?: () => void
  onProjectClick?: () => void
  onAreaClick?: () => void
  autoFocusEdit?: boolean
}

export function SortableKanbanCard({
  task,
  status,
  swimlaneId,
  projectName,
  areaName,
  onStatusChange,
  onTitleChange,
  onScheduledChange,
  onDueChange,
  onEditClick,
  onProjectClick,
  onAreaClick,
  autoFocusEdit,
}: SortableKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: createKanbanTaskData(task.id, status, swimlaneId),
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Determine variant based on task state
  let variant: 'default' | 'overdue' | 'deferred' | 'done' = 'default'
  if (task.status === 'done' || task.status === 'dropped') {
    variant = 'done'
  } else if (task.deferUntil && new Date(task.deferUntil) > new Date()) {
    variant = 'deferred'
  } else if (task.due && new Date(task.due) < new Date()) {
    variant = 'overdue'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn('touch-manipulation', isDragging && 'opacity-50')}
    >
      <TaskCard
        task={task}
        variant={variant}
        projectName={projectName}
        areaName={areaName}
        onStatusChange={onStatusChange}
        onTitleChange={onTitleChange}
        onScheduledChange={onScheduledChange}
        onDueChange={onDueChange}
        onEditClick={onEditClick}
        onProjectClick={onProjectClick}
        onAreaClick={onAreaClick}
        autoFocusEdit={autoFocusEdit}
      />
    </div>
  )
}
