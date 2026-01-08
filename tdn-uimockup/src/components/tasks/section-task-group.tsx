import * as React from 'react'
import { useDroppable } from '@dnd-kit/core'

import { cn } from '@/lib/utils'
import type { Task } from '@/types/data'
import type { HeadingColor } from '@/types/headings'
import type { ResolvedOrderedItem } from '@/hooks/use-today-order'
import { SectionHeader } from './section-header'
import { DraggableTaskList, TaskList } from './task-list'
import { OrderedItemList } from './ordered-item-list'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * SectionTaskGroup - Collapsible section with a task list (and optional headings).
 *
 * Used in TodayView for sections like "Scheduled for Today", "Overdue", etc.
 * Also used in AreaView/NoAreaView for the "Loose Tasks" section.
 *
 * Two modes:
 * 1. Task-only: Pass `tasks` + `onTasksReorder` for simple task list
 * 2. Mixed items: Pass `orderedItems` + `onItemsReorder` to support inline
 *    headings for manual organization within the section
 *
 * The section header shows expand/collapse chevron, optional icon, title,
 * task count, and optional "+ Task" / "+ Heading" buttons.
 */
interface BaseSectionProps {
  /** Unique identifier for this section (used for drag IDs) */
  sectionId: string
  /** Display title for the section header */
  title: string
  /** Optional icon to display in the header */
  icon?: React.ReactNode
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  /** Called when a task's open-detail button is clicked */
  onTaskOpenDetail?: (taskId: string) => void
  /** Called when Cmd/Ctrl+N is pressed to create a task */
  onCreateTask?: (afterTaskId: string | null) => string | void
  /** Function to get context name for a task (project/area name) */
  getContextName?: (task: Task) => string | undefined
  /** Whether to show scheduled dates (default: true) */
  showScheduled?: boolean
  /** Whether to show due dates (default: true) */
  showDue?: boolean
  /** Initial expanded state (default: true) */
  defaultExpanded?: boolean
  /**
   * When true, uses TaskList instead of DraggableTaskList.
   * Use this when a parent TaskDndContext handles cross-section dragging.
   */
  useExternalDnd?: boolean
  /** Called when the "+ Task" header button is clicked */
  onAddTask?: () => void
  /**
   * Item ID to auto-select and focus for editing.
   * Used when a new task/heading is created via header buttons.
   */
  autoEditItemId?: string | null
  /** Called when auto-edit is consumed (to clear the pending ID) */
  onAutoEditConsumed?: () => void
  className?: string
}

// Props for task-only mode (no headings)
interface TaskOnlyProps extends BaseSectionProps {
  tasks: Task[]
  onTasksReorder: (reorderedTasks: Task[]) => void
  // Heading-related props must not be provided
  orderedItems?: never
  onItemsReorder?: never
  onAddHeading?: never
  onHeadingTitleChange?: never
  onHeadingColorChange?: never
  onHeadingDelete?: never
}

// Props for mixed items mode (tasks + headings)
interface MixedItemsProps extends BaseSectionProps {
  orderedItems: ResolvedOrderedItem[]
  onItemsReorder: (orderedIds: string[]) => void
  /** Called when the "+ Heading" header button is clicked */
  onAddHeading?: () => void
  onHeadingTitleChange: (headingId: string, newTitle: string) => void
  onHeadingColorChange: (headingId: string, color: HeadingColor) => void
  onHeadingDelete: (headingId: string) => void
  // Task-only props must not be provided
  tasks?: never
  onTasksReorder?: never
}

type SectionTaskGroupProps = TaskOnlyProps | MixedItemsProps

/**
 * A section header with a collapsible list of tasks (and optionally headings) underneath.
 * Used for grouping tasks by criteria (e.g., "Scheduled Today", "Overdue").
 *
 * Two modes:
 * 1. Task-only mode: Pass `tasks` and `onTasksReorder`
 * 2. Mixed items mode: Pass `orderedItems` and `onItemsReorder` with heading callbacks
 */
export function SectionTaskGroup(props: SectionTaskGroupProps) {
  const {
    sectionId,
    title,
    icon,
    onTaskTitleChange,
    onTaskStatusToggle,
    onTaskOpenDetail,
    onCreateTask,
    getContextName,
    showScheduled = true,
    showDue = true,
    defaultExpanded = true,
    useExternalDnd = false,
    onAddTask,
    autoEditItemId,
    onAutoEditConsumed,
    className,
  } = props

  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev)
  }

  // Determine which mode we're in
  const isMixedItemsMode =
    'orderedItems' in props && props.orderedItems !== undefined

  // Get item count for header
  const itemCount = isMixedItemsMode
    ? props.orderedItems.filter((item) => item.type === 'task').length
    : props.tasks.length

  // Check if we have any items (tasks or headings)
  const hasItems = isMixedItemsMode
    ? props.orderedItems.length > 0
    : props.tasks.length > 0

  return (
    <div className={cn('', className)}>
      <SectionHeader
        title={title}
        icon={icon}
        taskCount={itemCount}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onAddTask={onAddTask}
        onAddHeading={isMixedItemsMode ? props.onAddHeading : undefined}
      />

      {/* Collapsible content */}
      {isExpanded && (
        <div className="ps-6 pt-1">
          {hasItems ? (
            isMixedItemsMode ? (
              // Mixed items mode: use OrderedItemList
              <OrderedItemList
                items={props.orderedItems}
                containerId={sectionId}
                onItemsReorder={props.onItemsReorder}
                onTaskTitleChange={onTaskTitleChange}
                onTaskStatusToggle={onTaskStatusToggle}
                onTaskOpenDetail={onTaskOpenDetail}
                onCreateTask={onCreateTask}
                onHeadingTitleChange={props.onHeadingTitleChange}
                onHeadingColorChange={props.onHeadingColorChange}
                onHeadingDelete={props.onHeadingDelete}
                getContextName={getContextName}
                showScheduled={showScheduled}
                showDue={showDue}
                autoEditItemId={autoEditItemId}
                onAutoEditConsumed={onAutoEditConsumed}
              />
            ) : useExternalDnd ? (
              // Task-only mode with external DnD
              <TaskList
                tasks={props.tasks}
                projectId={sectionId}
                onTasksReorder={props.onTasksReorder}
                onTaskTitleChange={onTaskTitleChange}
                onTaskStatusToggle={onTaskStatusToggle}
                onTaskOpenDetail={onTaskOpenDetail}
                onCreateTask={onCreateTask}
                getContextName={getContextName}
                showScheduled={showScheduled}
                showDue={showDue}
              />
            ) : (
              // Task-only mode with internal DnD
              <DraggableTaskList
                tasks={props.tasks}
                projectId={sectionId}
                onTasksReorder={props.onTasksReorder}
                onTaskTitleChange={onTaskTitleChange}
                onTaskStatusToggle={onTaskStatusToggle}
                onTaskOpenDetail={onTaskOpenDetail}
                onCreateTask={onCreateTask}
                getContextName={getContextName}
                showScheduled={showScheduled}
                showDue={showDue}
              />
            )
          ) : useExternalDnd || isMixedItemsMode ? (
            <EmptySectionDropZone sectionId={sectionId} />
          ) : (
            <div className="text-sm text-muted-foreground py-2 px-2">
              No tasks
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * A droppable zone for empty sections.
 * Shows visual feedback when a task is dragged over it.
 */
function EmptySectionDropZone({ sectionId }: { sectionId: string }) {
  const { dragPreview } = useTaskDragPreview()

  const { setNodeRef, isOver } = useDroppable({
    id: `empty-section-${sectionId}`,
    data: {
      type: 'empty-project',
      projectId: sectionId,
    },
  })

  // Check if we're dragging a task from a different section
  const isDraggingFromOtherSection =
    dragPreview &&
    dragPreview.type === 'task' &&
    dragPreview.sourceContainerId !== sectionId

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'text-sm text-muted-foreground py-2 px-2 rounded-lg transition-colors',
        isOver && isDraggingFromOtherSection && 'bg-primary/10 text-primary'
      )}
    >
      {isOver && isDraggingFromOtherSection ? 'Drop here' : 'No tasks'}
    </div>
  )
}
