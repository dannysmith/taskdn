import * as React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Minus } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Heading, HeadingColor } from '@/types/headings'
import { headingColorConfig } from '@/config/heading-colors'
import { HeadingColorPicker } from './heading-color-picker'

/**
 * HeadingListItem - Inline heading row for organizing tasks in lists.
 *
 * Used in TodayView's "Scheduled for Today" section via OrderedItemList.
 * Headings help users visually group their daily tasks into categories.
 *
 * Features:
 * - Click to select, double-click to edit title
 * - Color picker dot on the right (6 accent colors)
 * - Colored bottom border matching the accent color
 * - Delete button (minus icon) on hover/selection
 * - Drag-and-drop for reordering among tasks
 *
 * Keyboard: Enter commits edit, Escape cancels, Delete removes heading.
 */
export interface HeadingListItemProps {
  heading: Heading
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onStartEdit: () => void
  onEndEdit: () => void
  onTitleChange: (newTitle: string) => void
  onColorChange: (color: HeadingColor) => void
  onDelete: () => void
  /** Used for dnd-kit sortable */
  dragId: string
  /** Container ID for drag detection */
  containerId: string
}

export function HeadingListItem({
  heading,
  isSelected,
  isEditing,
  onSelect,
  onStartEdit,
  onEndEdit,
  onTitleChange,
  onColorChange,
  onDelete,
  dragId,
  containerId,
}: HeadingListItemProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [editValue, setEditValue] = React.useState(heading.title)

  const colorConfig = headingColorConfig[heading.color]

  // Sync editValue with heading.title when heading changes
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(heading.title)
    }
  }, [heading.title, isEditing])

  // Focus input when entering edit mode
  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Sortable setup
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
      type: 'heading',
      headingId: heading.id,
      containerId: containerId,
    },
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't select if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button')) return
    if ((e.target as HTMLElement).closest('input')) return
    onSelect()
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    onStartEdit()
  }

  const handleInputBlur = () => {
    if (editValue.trim() !== heading.title) {
      onTitleChange(editValue.trim())
    }
    onEndEdit()
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()

    if (e.key === 'Enter') {
      e.preventDefault()
      if (editValue.trim() !== heading.title) {
        onTitleChange(editValue.trim())
      }
      onEndEdit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setEditValue(heading.title)
      onEndEdit()
    }
  }

  // Only apply drag listeners when NOT editing
  const dragProps = isEditing ? {} : { ...attributes, ...listeners }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-default transition-all select-none',
        // Selected but not editing
        isSelected && !isEditing && !isDragging && 'bg-primary/10',
        // Hover state
        !isSelected && !isEditing && 'hover:bg-muted/30',
        // Dragging
        isDragging && 'opacity-50 shadow-lg bg-card z-50 ring-1 ring-border'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      data-selected={isSelected}
      data-editing={isEditing}
      data-heading-id={heading.id}
      {...dragProps}
    >
      {/* Content row */}
      <div className="flex items-center gap-2 px-2 pt-3 pb-1.5">
        {/* Title - editable or display */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className={cn(
              'flex-1 bg-transparent outline-none text-sm font-semibold',
              'placeholder:text-muted-foreground',
              colorConfig.textClass
            )}
            placeholder="Heading title..."
          />
        ) : (
          <span
            className={cn(
              'flex-1 text-sm font-semibold truncate',
              colorConfig.textClass
            )}
          >
            {heading.title || (
              <span className="text-muted-foreground italic">Untitled</span>
            )}
          </span>
        )}

        {/* Delete button - visible on hover/selection */}
        {!isEditing && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className={cn(
              'shrink-0 p-1 -m-0.5 rounded text-muted-foreground',
              'hover:text-destructive hover:bg-destructive/10',
              'transition-opacity duration-100',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            title="Delete heading"
          >
            <Minus className="size-3.5" />
          </button>
        )}

        {/* Color picker dot - on the right */}
        <HeadingColorPicker
          color={heading.color}
          onColorChange={onColorChange}
          disabled={isEditing}
        />
      </div>

      {/* Bottom border - aligned with content (inside padding) */}
      <div
        className={cn(
          'mx-2 border-b',
          isEditing ? 'border-primary' : colorConfig.borderClass
        )}
      />
    </div>
  )
}
