import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import { TaskItem, type TaskItemProps } from './task-item'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * SortableTaskItem - TaskItem wrapped with dnd-kit sortable for drag-and-drop.
 *
 * Used inside TaskList when TaskDndContext is the parent. Provides:
 * - Drag handle behavior (whole row is draggable)
 * - Transform/transition during drag
 * - Cross-container gap animation (shows space where item will land)
 *
 * The gap animation uses crossContainerHover from TaskDndContext to show a
 * margin-top when another container's task is being dragged above this item.
 */
export interface SortableTaskItemProps extends Omit<TaskItemProps, 'className'> {
  /** Unique drag ID for this item (should be unique across all containers) */
  dragId: string
  /** Container ID for cross-container drag detection */
  containerId: string
  /** Whether the dropped task has appeared in this container (suppresses gap) */
  droppedTaskInList?: boolean
  className?: string
}

/**
 * A sortable wrapper for TaskItem that provides drag-and-drop functionality.
 * Follows the SortableKanbanCard pattern for consistent, smooth DnD behavior.
 */
export function SortableTaskItem({
  task,
  dragId,
  containerId,
  droppedTaskInList,
  className,
  isEditing,
  ...taskItemProps
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      type: 'task',
      taskId: task.id,
      projectId: containerId,
    },
  })

  // Check if we should show a gap before this item (cross-container drag)
  // Don't show gap once the dropped task has appeared in this container
  const { crossContainerHover } = useTaskDragPreview()
  const showGapBefore =
    crossContainerHover?.targetContainerId === containerId &&
    crossContainerHover?.insertBeforeId === task.id &&
    !droppedTaskInList

  const style: React.CSSProperties = {
    // Always apply transforms - no suppression during cross-container drag
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Only apply drag listeners when NOT editing to prevent interference with input
  const dragProps = isEditing ? {} : { ...attributes, ...listeners }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragProps}
      className={cn(
        'touch-manipulation',
        isDragging && 'opacity-50',
        // CSS gap animation for cross-container drag
        showGapBefore && 'mt-10 transition-[margin] duration-150 ease-out',
        className
      )}
    >
      <TaskItem
        task={task}
        isEditing={isEditing}
        {...taskItemProps}
      />
    </div>
  )
}
