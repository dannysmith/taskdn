import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '@/lib/utils'
import type { Task, TaskStatus } from '@/types/data'
import {
  getCalendarTaskDragId,
  type CalendarTaskDragData,
} from '@/types/calendar-order'
import {
  TaskCard,
  type TaskCardVariant,
  type TaskCardSize,
} from '@/components/cards/task-card'

/**
 * SortableTaskCard - TaskCard with dnd-kit sortable for calendar views.
 *
 * Wraps TaskCard with drag-and-drop capabilities. Used in both MonthDayCell
 * and DayColumn. The drag ID encodes both the date and task ID so the
 * calendar DnD context can determine source/target days.
 *
 * Also exports TaskCardDragPreview for use in DragOverlay.
 * DraggableTaskCard is a legacy alias for backwards compatibility.
 */
interface SortableTaskCardProps {
  task: Task
  date: string
  /** Visual variant for the card */
  variant?: TaskCardVariant
  /** Size variant - compact shows only checkbox + title */
  size?: TaskCardSize
  /** Project name for context */
  projectName?: string
  /** Area name for context */
  areaName?: string
  onStatusChange?: (newStatus: TaskStatus) => void
  onTitleChange?: (newTitle: string) => void
  onScheduledChange?: (date: string | undefined) => void
  onDueChange?: (date: string | undefined) => void
  onEditClick?: () => void
  onProjectClick?: () => void
  onAreaClick?: () => void
  /** Start in editing mode (for newly created tasks) */
  autoFocusEdit?: boolean
}

/**
 * A sortable wrapper around TaskCard for use in calendar views.
 * Enables drag-and-drop to reorder within a day or move between days.
 */
export function SortableTaskCard({
  task,
  date,
  variant,
  size,
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
}: SortableTaskCardProps) {
  const dragData: CalendarTaskDragData = {
    type: 'calendar-task',
    taskId: task.id,
    sourceDate: date,
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: getCalendarTaskDragId(date, task.id),
    data: dragData,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-50 z-50'
      )}
    >
      <TaskCard
        task={task}
        variant={variant}
        size={size}
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

// Keep the old name as an alias for backwards compatibility during migration
export const DraggableTaskCard = SortableTaskCard

interface TaskCardDragPreviewProps {
  task: Task
  size?: TaskCardSize
}

/**
 * Drag preview for TaskCard shown in the DragOverlay.
 * Uses the same TaskCard component for visual consistency.
 */
export function TaskCardDragPreview({ task, size }: TaskCardDragPreviewProps) {
  return (
    <div
      className={cn(
        'shadow-xl',
        size === 'compact' ? 'max-w-[200px]' : 'max-w-[280px]'
      )}
    >
      <TaskCard task={task} size={size} />
    </div>
  )
}
