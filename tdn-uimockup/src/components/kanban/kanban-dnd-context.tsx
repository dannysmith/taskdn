import * as React from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  defaultDropAnimationSideEffects,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DropAnimation,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'

import type { Task, TaskStatus } from '@/types/data'
import { TaskCard } from '@/components/cards/task-card'

/**
 * KanbanDndContext - Drag-and-drop context for Kanban boards.
 *
 * Wraps KanbanBoard/AreaKanbanBoard to handle:
 * - Status changes: Dropping a task in a different column updates its status
 * - Reordering: Dropping a task on another task in the same column reorders
 * - Swimlane changes: For AreaKanbanBoard, moving between project swimlanes
 *
 * Uses dnd-kit with PointerSensor. Shows TaskCard as DragOverlay during drag.
 * Visual column highlighting uses dragPreview state exposed via context.
 *
 * Also exports helper functions for creating drag data:
 * - createKanbanTaskData, createEmptyColumnData, createEmptySwimlaneData
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface KanbanDragData {
  type: 'kanban-task'
  taskId: string
  status: TaskStatus
  /** Optional swimlane ID (e.g., projectId for area kanban) */
  swimlaneId?: string
}

interface EmptyColumnData {
  type: 'empty-column'
  status: TaskStatus
}

interface EmptySwimlaneData {
  type: 'empty-swimlane'
  status: TaskStatus
  swimlaneId: string
}

type DropTargetData = KanbanDragData | EmptyColumnData | EmptySwimlaneData

interface DragPreviewState {
  taskId: string
  task: Task
  sourceStatus: TaskStatus
  currentStatus: TaskStatus
  sourceSwimlaneId?: string
  currentSwimlaneId?: string
  overTaskId: string | null
}

interface KanbanDndContextValue {
  dragPreview: DragPreviewState | null
}

const KanbanDndReactContext = React.createContext<KanbanDndContextValue>({
  dragPreview: null,
})

// eslint-disable-next-line react-refresh/only-export-components
export function useKanbanDragPreview() {
  return React.useContext(KanbanDndReactContext)
}

// -----------------------------------------------------------------------------
// Props
// -----------------------------------------------------------------------------

interface KanbanDndContextProps {
  children: React.ReactNode
  /** All tasks organized by status */
  tasksByStatus: Map<TaskStatus, Task[]>
  /** Called when a task is moved to a different status */
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  /** Called when tasks are reordered within the same status column (and same swimlane if applicable) */
  onTasksReorder: (
    status: TaskStatus,
    reorderedTasks: Task[],
    swimlaneId?: string
  ) => void
  /** Get a task by its ID */
  getTaskById: (taskId: string) => Task | undefined
  /** Optional: called when task moves between swimlanes (for area kanban) */
  onSwimlaneChange?: (taskId: string, newSwimlaneId: string) => void
}

// -----------------------------------------------------------------------------
// KanbanDndContext
// -----------------------------------------------------------------------------

export function KanbanDndContext({
  children,
  tasksByStatus,
  onStatusChange,
  onTasksReorder,
  getTaskById,
  onSwimlaneChange,
}: KanbanDndContextProps) {
  const [dragPreview, setDragPreview] = React.useState<DragPreviewState | null>(
    null
  )

  // Sensors for drag and drop - PointerSensor with activation distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Drop animation
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as KanbanDragData | undefined
    if (data?.type === 'kanban-task') {
      const task = getTaskById(data.taskId)
      if (task) {
        setDragPreview({
          taskId: data.taskId,
          task,
          sourceStatus: data.status,
          currentStatus: data.status,
          sourceSwimlaneId: data.swimlaneId,
          currentSwimlaneId: data.swimlaneId,
          overTaskId: null,
        })
      }
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!dragPreview) return

    const { over } = event
    if (!over) return

    const overData = over.data.current as DropTargetData | undefined
    if (!overData) return

    // Determine new status and swimlane based on drop target
    let newStatus = dragPreview.sourceStatus
    let newSwimlaneId = dragPreview.sourceSwimlaneId
    let newOverTaskId: string | null = null

    if (overData.type === 'kanban-task') {
      newStatus = overData.status
      newSwimlaneId = overData.swimlaneId
      newOverTaskId = overData.taskId
    } else if (overData.type === 'empty-column') {
      newStatus = overData.status
    } else if (overData.type === 'empty-swimlane') {
      newStatus = overData.status
      newSwimlaneId = overData.swimlaneId
    }

    // Only update if something changed
    if (
      newStatus !== dragPreview.currentStatus ||
      newSwimlaneId !== dragPreview.currentSwimlaneId ||
      newOverTaskId !== dragPreview.overTaskId
    ) {
      setDragPreview((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: newStatus,
              currentSwimlaneId: newSwimlaneId,
              overTaskId: newOverTaskId,
            }
          : null
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!dragPreview) return

    const { active, over } = event

    if (!over) {
      setDragPreview(null)
      return
    }

    const activeData = active.data.current as KanbanDragData | undefined
    const overData = over.data.current as DropTargetData | undefined

    if (!activeData || activeData.type !== 'kanban-task') {
      setDragPreview(null)
      return
    }

    // Determine target status
    let targetStatus = dragPreview.sourceStatus
    let targetSwimlaneId = dragPreview.sourceSwimlaneId

    if (overData?.type === 'kanban-task') {
      targetStatus = overData.status
      targetSwimlaneId = overData.swimlaneId
    } else if (overData?.type === 'empty-column') {
      targetStatus = overData.status
    } else if (overData?.type === 'empty-swimlane') {
      targetStatus = overData.status
      targetSwimlaneId = overData.swimlaneId
    }

    // Handle swimlane change (for area kanban)
    if (
      targetSwimlaneId !== dragPreview.sourceSwimlaneId &&
      onSwimlaneChange &&
      targetSwimlaneId
    ) {
      onSwimlaneChange(dragPreview.taskId, targetSwimlaneId)
    }

    // Handle status change
    if (targetStatus !== dragPreview.sourceStatus) {
      onStatusChange(dragPreview.taskId, targetStatus)
    } else if (overData?.type === 'kanban-task' && active.id !== over.id) {
      // Same-status reorder - only if swimlane is also the same (or no swimlanes)
      const sameSwimlane =
        !dragPreview.sourceSwimlaneId ||
        targetSwimlaneId === dragPreview.sourceSwimlaneId

      if (sameSwimlane) {
        const statusTasks = tasksByStatus.get(targetStatus) ?? []
        const oldIndex = statusTasks.findIndex(
          (t) => t.id === activeData.taskId
        )
        const newIndex = statusTasks.findIndex((t) => t.id === overData.taskId)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTasks = arrayMove(statusTasks, oldIndex, newIndex)
          onTasksReorder(targetStatus, newTasks, targetSwimlaneId)
        }
      }
    }

    setDragPreview(null)
  }

  const handleDragCancel = () => {
    setDragPreview(null)
  }

  const contextValue: KanbanDndContextValue = {
    dragPreview,
  }

  return (
    <KanbanDndReactContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {children}

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {dragPreview && <TaskCard task={dragPreview.task} />}
        </DragOverlay>
      </DndContext>
    </KanbanDndReactContext.Provider>
  )
}

// -----------------------------------------------------------------------------
// Helper exports for data attributes
// -----------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function createKanbanTaskData(
  taskId: string,
  status: TaskStatus,
  swimlaneId?: string
): KanbanDragData {
  return {
    type: 'kanban-task',
    taskId,
    status,
    swimlaneId,
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function createEmptyColumnData(status: TaskStatus): EmptyColumnData {
  return {
    type: 'empty-column',
    status,
  }
}

// eslint-disable-next-line react-refresh/only-export-components
export function createEmptySwimlaneData(
  status: TaskStatus,
  swimlaneId: string
): EmptySwimlaneData {
  return {
    type: 'empty-swimlane',
    status,
    swimlaneId,
  }
}
