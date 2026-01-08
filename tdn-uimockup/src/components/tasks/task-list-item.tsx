/**
 * Task list item components.
 *
 * - TaskItem: Pure presentational component (no DnD)
 * - TaskListItem: Basic sortable wrapper (this file)
 * - SortableTaskItem: Advanced sortable with cross-container gap animations
 *
 * Use TaskListItem for simple list contexts. Use SortableTaskItem when you need
 * visual feedback for cross-container drag operations.
 */

import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import { TaskItem, type TaskItemProps } from './task-item'

export interface TaskListItemProps extends Omit<TaskItemProps, 'className'> {
  /** Used for dnd-kit sortable */
  dragId: string
  /** Project ID for cross-container drag detection */
  projectId: string
  className?: string
}

/**
 * A sortable task list item for use within a SortableContext.
 * This is a wrapper around TaskItem that adds drag-and-drop support.
 *
 * For cross-container drag scenarios with gap animations, use SortableTaskItem instead.
 */
export function TaskListItem({
  task,
  dragId,
  projectId,
  className,
  isEditing,
  ...taskItemProps
}: TaskListItemProps) {
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
      projectId: projectId,
    },
  })

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
      className={cn('touch-manipulation', isDragging && 'opacity-50', className)}
    >
      <TaskItem task={task} isEditing={isEditing} {...taskItemProps} />
    </div>
  )
}

// Re-export TaskItem for cases where only the presentational component is needed
export { TaskItem } from './task-item'
export type { TaskItemProps } from './task-item'
