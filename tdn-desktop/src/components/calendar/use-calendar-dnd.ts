import { useState } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from '@dnd-kit/core'

import type { Task } from '@/lib/tauri-bindings'
import {
  parseCalendarTaskDragId,
  type CalendarTaskDragData,
  type DayDropData,
} from '@/types/calendar-order'

/**
 * Drag state for calendar task drag-and-drop.
 */
export interface CalendarDragState {
  taskId: string
  task: Task
  sourceDate: string
  currentOverDate: string | null
}

/**
 * Options for useCalendarDnd hook.
 */
interface UseCalendarDndOptions {
  /** Get task by ID (from props) */
  getTaskById: (taskId: string) => Task | undefined
  /** Called when a task's scheduled date changes */
  onTaskScheduleChange: (taskId: string, newDate: string | undefined) => void
  /** Reorder tasks within a day (from useCalendarOrder) */
  reorderTasksInDay: (date: string, activeId: string, overId: string) => void
  /** Move task to a different day (from useCalendarOrder) */
  moveTaskToDay: (
    taskId: string,
    sourceDate: string,
    targetDate: string,
    insertIndex?: number
  ) => void
  /** Get insert index for a task (from useCalendarOrder) */
  getInsertIndex: (date: string, taskId: string) => number
}

/**
 * Hook for calendar drag-and-drop functionality.
 *
 * Extracts common DnD logic shared between WeekCalendar and MonthCalendar:
 * - Drag state management
 * - Sensor configuration
 * - Drop animation
 * - Drag event handlers
 *
 * Both calendars use the same DnD patterns:
 * - Tasks can be dragged between days to reschedule
 * - Tasks can be reordered within a day by dragging onto another task
 * - Dropping on a day container adds to end of that day
 * - Dropping on a specific task inserts at that position
 */
export function useCalendarDnd({
  getTaskById,
  onTaskScheduleChange,
  reorderTasksInDay,
  moveTaskToDay,
  getInsertIndex,
}: UseCalendarDndOptions) {
  const [dragState, setDragState] = useState<CalendarDragState | null>(null)

  // Sensors - pointer with small distance threshold to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Drop animation with fade effect
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

  // Handle drag start - initialize drag state with task info
  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as CalendarTaskDragData | undefined
    if (data?.type === 'calendar-task') {
      const task = getTaskById(data.taskId)
      if (task) {
        setDragState({
          taskId: data.taskId,
          task,
          sourceDate: data.sourceDate,
          currentOverDate: null,
        })
      }
    }
  }

  // Handle drag over - track which date we're hovering over
  const handleDragOver = (event: DragOverEvent) => {
    if (!dragState) return

    const { over } = event
    if (!over) {
      setDragState(prev => (prev ? { ...prev, currentOverDate: null } : null))
      return
    }

    const overData = over.data.current as
      | DayDropData
      | CalendarTaskDragData
      | undefined
    if (!overData) return

    // Determine which date we're over
    let overDate: string | null = null
    if (overData.type === 'day') {
      overDate = overData.date
    } else if (overData.type === 'calendar-task') {
      // If hovering over another task, use its date
      overDate = overData.sourceDate
    }

    if (overDate !== dragState.currentOverDate) {
      setDragState(prev =>
        prev ? { ...prev, currentOverDate: overDate } : null
      )
    }
  }

  // Handle drag end - apply the move/reorder
  const handleDragEnd = (event: DragEndEvent) => {
    if (!dragState) return

    const { active, over } = event
    if (!over) {
      setDragState(null)
      return
    }

    const overData = over.data.current as
      | DayDropData
      | CalendarTaskDragData
      | undefined
    if (!overData) {
      setDragState(null)
      return
    }

    // Parse the active item to get taskId
    const activeId = active.id as string
    const parsedActive = parseCalendarTaskDragId(activeId)
    if (!parsedActive) {
      setDragState(null)
      return
    }

    const { taskId: activeTaskId } = parsedActive
    const sourceDate = dragState.sourceDate

    // Determine target date and handling based on drop target type
    if (overData.type === 'day') {
      // Dropped on a day container (not on a specific task)
      const targetDate = overData.date

      if (targetDate !== sourceDate) {
        // Cross-day move: update scheduled date and add to end of target day
        moveTaskToDay(activeTaskId, sourceDate, targetDate)
        onTaskScheduleChange(activeTaskId, targetDate)
      }
      // If same day and dropped on container, no reorder needed
    } else if (overData.type === 'calendar-task') {
      // Dropped on another task
      const targetDate = overData.sourceDate
      const overTaskId = overData.taskId

      if (targetDate === sourceDate) {
        // Within-day reorder: just update order
        if (activeTaskId !== overTaskId) {
          reorderTasksInDay(sourceDate, activeTaskId, overTaskId)
        }
      } else {
        // Cross-day move with specific position
        const insertIndex = getInsertIndex(targetDate, overTaskId)
        moveTaskToDay(activeTaskId, sourceDate, targetDate, insertIndex)
        onTaskScheduleChange(activeTaskId, targetDate)
      }
    }

    setDragState(null)
  }

  // Handle drag cancel - reset state
  const handleDragCancel = () => {
    setDragState(null)
  }

  return {
    dragState,
    sensors,
    dropAnimation,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  }
}
