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

import type { Task } from '@/types/data'
import type { Heading } from '@/types/headings'
import { TaskDragPreview } from './task-list'
import { HeadingDragPreview } from '@/components/headings'

/**
 * TaskDndContext - Shared drag-and-drop context for cross-container task movement.
 *
 * Wraps multiple TaskList components to enable dragging tasks between them.
 * Used in AreaView and TodayView where tasks can move between projects/sections.
 *
 * Key behaviors:
 * - Cross-container drag: Moving a task from one project/section to another
 * - Same-container reorder: Reordering tasks within a single list
 * - Visual feedback: Shows gap where task will drop (via crossContainerHover state)
 * - Heading support: Can also drag headings within their container
 *
 * Each TaskList renders with a projectId/sectionId that becomes the container ID.
 * Drag IDs include the container prefix to ensure uniqueness across lists.
 */

// -----------------------------------------------------------------------------
// Loose Tasks Helpers
// -----------------------------------------------------------------------------

const LOOSE_TASKS_PREFIX = '__loose-tasks-'

/**
 * Creates a pseudo-project ID for loose tasks in an area.
 * Used to integrate loose tasks with the cross-project drag system.
 */
export function getLooseTasksProjectId(areaId: string): string {
  return `${LOOSE_TASKS_PREFIX}${areaId}__`
}

/**
 * Checks if a project ID is a loose tasks pseudo-project.
 */
export function isLooseTasksProjectId(projectId: string): boolean {
  return projectId.startsWith(LOOSE_TASKS_PREFIX)
}

/**
 * Extracts the area ID from a loose tasks pseudo-project ID.
 * Returns undefined if not a loose tasks project ID.
 */
export function getAreaIdFromLooseTasksProjectId(
  projectId: string
): string | undefined {
  if (!isLooseTasksProjectId(projectId)) return undefined
  return projectId.slice(LOOSE_TASKS_PREFIX.length, -2) // Remove prefix and trailing __
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TaskDragData {
  type: 'task'
  taskId: string
  projectId: string
}

interface HeadingDragData {
  type: 'heading'
  headingId: string
  containerId: string
}

interface EmptyProjectData {
  type: 'empty-project'
  projectId: string
}

type DragItemData = TaskDragData | HeadingDragData
type DropTargetData = TaskDragData | HeadingDragData | EmptyProjectData

interface TaskDragPreviewState {
  type: 'task'
  taskId: string
  task: Task
  sourceContainerId: string
}

interface HeadingDragPreviewState {
  type: 'heading'
  headingId: string
  heading: Heading
  containerId: string
}

type DragPreviewState = TaskDragPreviewState | HeadingDragPreviewState

/**
 * Cross-container hover state for CSS gap animation.
 * Only set when dragging over a DIFFERENT container than the source.
 */
interface CrossContainerHoverState {
  /** The container being hovered over */
  targetContainerId: string
  /** Insert before this task ID, or null to append at end */
  insertBeforeId: string | null
}

interface TaskDndContextValue {
  dragPreview: DragPreviewState | null
  lastDroppedTaskId: string | null
  clearLastDroppedTaskId: () => void
  /**
   * Cross-container hover state for CSS gap animation.
   * Only set when hovering over a different container than the source.
   */
  crossContainerHover: CrossContainerHoverState | null
  /**
   * Clear the cross-container hover state.
   * Called by TaskList when drop completes (task appears in target list).
   */
  clearCrossContainerHover: () => void
}

// Exported for reuse by other DnD contexts (e.g., TodayDndContext)
export const TaskDndReactContext = React.createContext<TaskDndContextValue>({
  dragPreview: null,
  lastDroppedTaskId: null,
  clearLastDroppedTaskId: () => {},
  crossContainerHover: null,
  clearCrossContainerHover: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export function useTaskDragPreview() {
  return React.useContext(TaskDndReactContext)
}

interface TaskDndContextProps {
  children: React.ReactNode
  /** All tasks organized by projectId */
  tasksByProject: Map<string, Task[]>
  /**
   * Called when a task is moved to a different project.
   * @param insertBeforeTaskId - Insert before this task, or null to append at end
   */
  onTaskMove: (
    taskId: string,
    fromProjectId: string,
    toProjectId: string,
    insertBeforeTaskId: string | null
  ) => void
  /** Called when tasks are reordered within the same project */
  onTasksReorder: (projectId: string, reorderedTasks: Task[]) => void
  /**
   * Called when items (tasks or headings) are reordered within a container.
   * Passes the drag IDs so the caller can calculate the new order.
   */
  onItemsReorder?: (
    containerId: string,
    activeId: string,
    overId: string
  ) => void
  /** Get a task by its ID */
  getTaskById: (taskId: string) => Task | undefined
  /** Get a heading by its ID (optional, for heading drag preview) */
  getHeadingById?: (headingId: string) => Heading | undefined
}

// -----------------------------------------------------------------------------
// TaskDndContext - Shared context for cross-project drag
// -----------------------------------------------------------------------------

/**
 * A shared DndContext for multiple project task lists.
 * Handles both same-project reordering and cross-project moves.
 *
 * Follows the Kanban pattern: uses over.data.current directly to determine
 * the drop target, rather than maintaining complex visual state during drag.
 * This provides reliable drop behavior at the cost of not showing items
 * shifting between containers during drag (use container highlighting instead).
 */
export function TaskDndContext({
  children,
  tasksByProject,
  onTaskMove,
  onTasksReorder,
  onItemsReorder,
  getTaskById,
  getHeadingById,
}: TaskDndContextProps) {
  const [dragPreview, setDragPreview] = React.useState<DragPreviewState | null>(
    null
  )
  const [lastDroppedTaskId, setLastDroppedTaskId] = React.useState<
    string | null
  >(null)
  const [crossContainerHover, setCrossContainerHover] =
    React.useState<CrossContainerHoverState | null>(null)

  const clearLastDroppedTaskId = React.useCallback(() => {
    setLastDroppedTaskId(null)
  }, [])

  const clearCrossContainerHover = React.useCallback(() => {
    setCrossContainerHover(null)
  }, [])

  // Sensors for drag and drop - only PointerSensor
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
    const data = event.active.data.current as DragItemData | undefined

    if (data?.type === 'task') {
      const task = getTaskById(data.taskId)
      if (task) {
        setDragPreview({
          type: 'task',
          taskId: data.taskId,
          task,
          sourceContainerId: data.projectId,
        })
      }
    } else if (data?.type === 'heading' && getHeadingById) {
      const heading = getHeadingById(data.headingId)
      if (heading) {
        setDragPreview({
          type: 'heading',
          headingId: data.headingId,
          heading,
          containerId: data.containerId,
        })
      }
    }
  }

  // Track cross-container hover for CSS gap animation
  const handleDragOver = (event: DragOverEvent) => {
    if (!dragPreview || dragPreview.type !== 'task') {
      return
    }

    const { over } = event

    if (!over) {
      // Not over anything - clear hover state
      setCrossContainerHover(null)
      return
    }

    const overData = over.data.current as DropTargetData | undefined

    // Determine which container we're hovering over
    const targetContainerId =
      overData?.type === 'heading'
        ? overData.containerId
        : overData?.type === 'empty-project'
          ? overData.projectId
          : overData?.type === 'task'
            ? overData.projectId
            : null

    if (!targetContainerId) {
      setCrossContainerHover(null)
      return
    }

    // Only track cross-container hover (not same-container)
    if (targetContainerId === dragPreview.sourceContainerId) {
      setCrossContainerHover(null)
      return
    }

    // Determine insertion point
    const insertBeforeId =
      overData?.type === 'task' ? overData.taskId : null

    // Only update if changed (avoid unnecessary re-renders)
    setCrossContainerHover((prev) => {
      if (
        prev?.targetContainerId === targetContainerId &&
        prev?.insertBeforeId === insertBeforeId
      ) {
        return prev
      }
      return { targetContainerId, insertBeforeId }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    if (!dragPreview) {
      return
    }

    const { active, over } = event

    if (!over) {
      setDragPreview(null)
      return
    }

    // Handle heading drags
    if (dragPreview.type === 'heading') {
      const overData = over.data.current as DropTargetData | undefined

      // Determine target container from the element we dropped on
      const targetContainerId =
        overData?.type === 'heading'
          ? overData.containerId
          : (overData?.projectId ?? dragPreview.containerId)

      // Headings can only reorder within their own container
      if (
        targetContainerId === dragPreview.containerId &&
        active.id !== over.id &&
        onItemsReorder
      ) {
        onItemsReorder(
          dragPreview.containerId,
          String(active.id),
          String(over.id)
        )
      }

      setDragPreview(null)
      return
    }

    // Handle task drags
    const activeData = active.data.current as TaskDragData | undefined
    const overData = over.data.current as DropTargetData | undefined

    if (!activeData || activeData.type !== 'task') {
      setDragPreview(null)
      return
    }

    // Determine target container directly from over.data.current
    // This is the key simplification: we trust the collision detection result
    // rather than maintaining complex visual state during drag
    const targetContainerId =
      overData?.type === 'heading'
        ? overData.containerId
        : overData?.type === 'empty-project'
          ? overData.projectId
          : overData?.type === 'task'
            ? overData.projectId
            : dragPreview.sourceContainerId

    if (targetContainerId !== dragPreview.sourceContainerId) {
      // Cross-project move
      // Insert before the task we dropped on, or null to append at end
      const insertBeforeTaskId =
        overData?.type === 'task' ? overData.taskId : null

      onTaskMove(
        dragPreview.taskId,
        dragPreview.sourceContainerId,
        targetContainerId,
        insertBeforeTaskId
      )
      setLastDroppedTaskId(dragPreview.taskId)
      // DON'T clear crossContainerHover here - let TaskList do it when the
      // dropped task appears in the target list. This prevents the visual jump
      // where the gap disappears before the item appears.
      setDragPreview(null)
    } else {
      // Same-container operation
      if (active.id !== over.id) {
        // Same-container reorder
        if (onItemsReorder) {
          // Use items reorder callback (for mixed containers with headings)
          onItemsReorder(targetContainerId, String(active.id), String(over.id))
          setLastDroppedTaskId(activeData.taskId)
        } else if (overData?.type === 'task') {
          // Fall back to task-only reorder using entity data
          const projectTasks = tasksByProject.get(targetContainerId) ?? []
          const oldIndex = projectTasks.findIndex(
            (t) => t.id === activeData.taskId
          )
          const newIndex = projectTasks.findIndex(
            (t) => t.id === overData.taskId
          )

          if (oldIndex !== -1 && newIndex !== -1) {
            const newTasks = arrayMove(projectTasks, oldIndex, newIndex)
            onTasksReorder(targetContainerId, newTasks)
            setLastDroppedTaskId(activeData.taskId)
          }
        }
      }
      setDragPreview(null)
      setCrossContainerHover(null)
    }
  }

  const handleDragCancel = () => {
    setDragPreview(null)
    setCrossContainerHover(null)
  }

  const contextValue: TaskDndContextValue = {
    dragPreview,
    lastDroppedTaskId,
    clearLastDroppedTaskId,
    crossContainerHover,
    clearCrossContainerHover,
  }

  return (
    <TaskDndReactContext.Provider value={contextValue}>
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
          {dragPreview &&
            (dragPreview.type === 'task' ? (
              <TaskDragPreview task={dragPreview.task} />
            ) : (
              <HeadingDragPreview heading={dragPreview.heading} />
            ))}
        </DragOverlay>
      </DndContext>
    </TaskDndReactContext.Provider>
  )
}
