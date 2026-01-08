import * as React from 'react'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'

import { cn } from '@/lib/utils'
import type { Task } from '@/types/data'
import type { HeadingColor } from '@/types/headings'
import { toHeadingId } from '@/types/headings'
import type { ResolvedOrderedItem } from '@/hooks/use-today-order'
import { TaskListItem } from './task-list-item'
import { HeadingListItem } from '@/components/headings'
import { useTaskDragPreview } from './task-dnd-context'

/**
 * OrderedItemList - Mixed list of tasks and inline headings with drag-and-drop.
 *
 * Used in TodayView's "Scheduled for Today" section where users can add
 * headings to organize their daily tasks into groups.
 *
 * Items come from useTodayOrder hook which maintains a separate display order
 * that includes both tasks and heading IDs. The order is persisted separately
 * from task entity data.
 *
 * Keyboard shortcuts:
 * - Arrow keys: Navigate selection
 * - Enter: Edit selected item (title for tasks/headings)
 * - Space: Toggle task status (tasks only)
 * - Delete/Backspace: Delete heading (headings only)
 * - Cmd/Ctrl+N: Create new task after selection
 * - Cmd/Ctrl+Arrow: Reorder selected item
 */
interface OrderedItemListProps {
  /** Ordered items (tasks and headings) from getOrderedItems() */
  items: ResolvedOrderedItem[]
  /** Container ID for drag operations */
  containerId: string
  /** Called when items are reordered - returns new order of IDs (with heading: prefix) */
  onItemsReorder: (orderedIds: string[]) => void

  // Task handlers
  onTaskTitleChange: (taskId: string, newTitle: string) => void
  onTaskStatusToggle: (taskId: string) => void
  onTaskOpenDetail?: (taskId: string) => void
  onCreateTask?: (afterItemId: string | null) => string | void

  // Heading handlers
  onHeadingTitleChange: (headingId: string, newTitle: string) => void
  onHeadingColorChange: (headingId: string, color: HeadingColor) => void
  onHeadingDelete: (headingId: string) => void

  // Optional: external state control
  selectedIndex?: number | null
  onSelectedIndexChange?: (index: number | null) => void
  editingItemId?: string | null
  onEditingItemIdChange?: (itemId: string | null) => void

  /** Function to get context name for a task (project/area name) */
  getContextName?: (task: Task) => string | undefined
  /** Whether to show scheduled dates (default: true) */
  showScheduled?: boolean
  /** Whether to show due dates (default: true) */
  showDue?: boolean

  /**
   * Item ID to auto-select and focus for editing.
   * Used when a new task/heading is created.
   */
  autoEditItemId?: string | null
  /** Called when auto-edit is consumed (to clear the pending ID) */
  onAutoEditConsumed?: () => void

  className?: string
}

/**
 * A keyboard-navigable list that renders both tasks and headings.
 * Uses SortableContext for drag-and-drop reordering.
 *
 * Keyboard shortcuts:
 * - Arrow Up/Down: Move selection
 * - Enter: Start editing selected item
 * - Escape: Cancel editing, or deselect
 * - Cmd/Ctrl + Arrow Up/Down: Reorder selected item
 * - Space: Toggle task status (only for tasks)
 * - Delete/Backspace: Delete heading (only for headings)
 */
export function OrderedItemList({
  items,
  containerId,
  onItemsReorder,
  onTaskTitleChange,
  onTaskStatusToggle,
  onTaskOpenDetail,
  onCreateTask,
  onHeadingTitleChange,
  onHeadingColorChange,
  onHeadingDelete,
  selectedIndex: externalSelectedIndex,
  onSelectedIndexChange,
  editingItemId: externalEditingItemId,
  onEditingItemIdChange,
  getContextName,
  showScheduled = true,
  showDue = true,
  autoEditItemId,
  onAutoEditConsumed,
  className,
}: OrderedItemListProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Internal state (used when not controlled externally)
  const [internalSelectedIndex, setInternalSelectedIndex] = React.useState<
    number | null
  >(null)
  const [internalEditingItemId, setInternalEditingItemId] = React.useState<
    string | null
  >(null)

  // Use external state if provided, otherwise internal
  const selectedIndex =
    externalSelectedIndex !== undefined
      ? externalSelectedIndex
      : internalSelectedIndex
  const setSelectedIndex = onSelectedIndexChange ?? setInternalSelectedIndex
  const editingItemId =
    externalEditingItemId !== undefined
      ? externalEditingItemId
      : internalEditingItemId
  const setEditingItemId = onEditingItemIdChange ?? setInternalEditingItemId

  // Get drag context to check for dropped task
  const { lastDroppedTaskId, clearLastDroppedTaskId } = useTaskDragPreview()

  // Select the dropped task after a drag ends
  React.useEffect(() => {
    if (lastDroppedTaskId) {
      const droppedIndex = items.findIndex(
        (item) => item.type === 'task' && item.id === lastDroppedTaskId
      )
      if (droppedIndex !== -1) {
        setSelectedIndex(droppedIndex)
        clearLastDroppedTaskId()
      } else {
        setSelectedIndex(null)
      }
    }
  }, [lastDroppedTaskId, items, setSelectedIndex, clearLastDroppedTaskId])

  // Keep selection valid when items change
  React.useEffect(() => {
    if (selectedIndex !== null && selectedIndex >= items.length) {
      setSelectedIndex(items.length > 0 ? items.length - 1 : null)
    }
  }, [items.length, selectedIndex, setSelectedIndex])

  // Focus container when selection changes (for keyboard events)
  React.useEffect(() => {
    if (selectedIndex !== null && !editingItemId && containerRef.current) {
      containerRef.current.focus()
    }
  }, [selectedIndex, editingItemId])

  // Auto-edit: when autoEditItemId is set, find the item and start editing
  React.useEffect(() => {
    if (!autoEditItemId) return

    // Find the item in the list
    const itemIndex = items.findIndex((item) => item.id === autoEditItemId)
    if (itemIndex !== -1) {
      // Select and edit the item
      setSelectedIndex(itemIndex)
      setEditingItemId(autoEditItemId)
      // Notify that we consumed the auto-edit
      onAutoEditConsumed?.()
    }
  }, [
    autoEditItemId,
    items,
    setSelectedIndex,
    setEditingItemId,
    onAutoEditConsumed,
  ])

  // Helper to get the order ID for an item (with prefix for headings)
  const getOrderId = (item: ResolvedOrderedItem): string => {
    return item.type === 'heading' ? toHeadingId(item.id) : item.id
  }

  // Helper to get the drag ID for an item
  const getDragId = (item: ResolvedOrderedItem): string => {
    return item.type === 'heading'
      ? `heading-${containerId}-${item.id}`
      : `task-${containerId}-${item.id}`
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingItemId) return

    const isMeta = e.metaKey || e.ctrlKey
    const selectedItem = selectedIndex !== null ? items[selectedIndex] : null

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (isMeta && selectedIndex !== null) {
          // Reorder: move item down
          if (selectedIndex < items.length - 1) {
            const newItems = arrayMove(items, selectedIndex, selectedIndex + 1)
            onItemsReorder(newItems.map(getOrderId))
            setSelectedIndex(selectedIndex + 1)
          }
        } else {
          // Navigate down
          if (selectedIndex === null) {
            setSelectedIndex(0)
          } else if (selectedIndex < items.length - 1) {
            setSelectedIndex(selectedIndex + 1)
          }
        }
        break

      case 'ArrowUp':
        e.preventDefault()
        if (isMeta && selectedIndex !== null) {
          // Reorder: move item up
          if (selectedIndex > 0) {
            const newItems = arrayMove(items, selectedIndex, selectedIndex - 1)
            onItemsReorder(newItems.map(getOrderId))
            setSelectedIndex(selectedIndex - 1)
          }
        } else {
          // Navigate up
          if (selectedIndex === null) {
            setSelectedIndex(items.length - 1)
          } else if (selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        if (selectedItem) {
          setEditingItemId(selectedItem.id)
        }
        break

      case 'Escape':
        e.preventDefault()
        if (selectedIndex !== null) {
          setSelectedIndex(null)
        }
        break

      case ' ':
        // Only toggle status for tasks
        if (selectedItem?.type === 'task') {
          e.preventDefault()
          onTaskStatusToggle(selectedItem.id)
        }
        break

      case 'Backspace':
      case 'Delete':
        // Only delete headings
        if (selectedItem?.type === 'heading') {
          e.preventDefault()
          onHeadingDelete(selectedItem.id)
          // Move selection to next item or clear
          if (selectedIndex !== null) {
            if (items.length > 1) {
              setSelectedIndex(
                selectedIndex >= items.length - 1
                  ? selectedIndex - 1
                  : selectedIndex
              )
            } else {
              setSelectedIndex(null)
            }
          }
        }
        break

      case 'n':
      case 'N':
        if (isMeta && onCreateTask) {
          e.preventDefault()
          const afterItemId = selectedItem ? getOrderId(selectedItem) : null
          const newTaskId = onCreateTask(afterItemId)
          if (newTaskId) {
            setEditingItemId(newTaskId)
            if (selectedIndex !== null) {
              setSelectedIndex(selectedIndex + 1)
            } else {
              setSelectedIndex(items.length)
            }
          }
        }
        break
    }
  }

  // Selection handlers
  const handleSelect = (index: number) => {
    setSelectedIndex(index)
    setEditingItemId(null)
  }

  const handleStartEdit = (itemId: string) => {
    setEditingItemId(itemId)
  }

  const handleEndEdit = () => {
    setEditingItemId(null)
    containerRef.current?.focus()
  }

  // Generate drag IDs for sortable context
  const dragIds = items.map(getDragId)

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'py-4 text-center text-muted-foreground text-sm',
          className
        )}
      >
        No tasks
      </div>
    )
  }

  // Clear selection when clicking outside
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setSelectedIndex(null)
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn('outline-none', className)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <SortableContext items={dragIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-0.5">
          {items.map((item, index) => {
            if (item.type === 'task') {
              return (
                <TaskListItem
                  key={`task-${item.id}`}
                  task={item.data}
                  dragId={getDragId(item)}
                  projectId={containerId}
                  isSelected={selectedIndex === index}
                  isEditing={editingItemId === item.id}
                  onSelect={() => handleSelect(index)}
                  onStartEdit={() => handleStartEdit(item.id)}
                  onEndEdit={handleEndEdit}
                  onTitleChange={(newTitle) =>
                    onTaskTitleChange(item.id, newTitle)
                  }
                  onStatusToggle={() => onTaskStatusToggle(item.id)}
                  onOpenDetail={
                    onTaskOpenDetail
                      ? () => onTaskOpenDetail(item.id)
                      : undefined
                  }
                  contextName={getContextName?.(item.data)}
                  showScheduled={showScheduled}
                  showDue={showDue}
                />
              )
            } else {
              return (
                <HeadingListItem
                  key={`heading-${item.id}`}
                  heading={item.data}
                  dragId={getDragId(item)}
                  containerId={containerId}
                  isSelected={selectedIndex === index}
                  isEditing={editingItemId === item.id}
                  onSelect={() => handleSelect(index)}
                  onStartEdit={() => handleStartEdit(item.id)}
                  onEndEdit={handleEndEdit}
                  onTitleChange={(newTitle) =>
                    onHeadingTitleChange(item.id, newTitle)
                  }
                  onColorChange={(color) =>
                    onHeadingColorChange(item.id, color)
                  }
                  onDelete={() => onHeadingDelete(item.id)}
                />
              )
            }
          })}
        </div>
      </SortableContext>
    </div>
  )
}
