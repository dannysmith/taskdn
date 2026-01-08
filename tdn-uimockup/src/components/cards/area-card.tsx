import { Folder, FolderOpen } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Area } from '@/types/data'

/**
 * AreaCard - Summary card showing a life area.
 *
 * Areas are ongoing life responsibilities (e.g., "Health", "Career", "Family").
 * This card displays the area title, optional type badge, description, and
 * project counts.
 *
 * Currently not used in the main app views, but designed for a future
 * dashboard or "all areas" overview grid. Uses container queries for
 * responsive behavior.
 */
export interface AreaCardProps {
  area: Area
  /** Number of projects in this area */
  projectCount: number
  /** Number of active (non-done) projects */
  activeProjectCount: number
  onClick?: () => void
  /** Whether the card is selected */
  isSelected?: boolean
  className?: string
}
export function AreaCard({
  area,
  projectCount,
  activeProjectCount,
  onClick,
  isSelected,
  className,
}: AreaCardProps) {
  const isArchived = area.status === 'archived'

  return (
    <div
      onClick={onClick}
      className={cn(
        '@container group bg-card rounded-xl border border-border/60 p-3 @7xs:p-4 transition-all',
        'hover:border-border hover:shadow-sm',
        onClick && 'cursor-pointer',
        isSelected && 'ring-2 ring-primary border-primary',
        isArchived && 'opacity-50',
        className
      )}
    >
      {/* Header: Icon + Title + Type Badge */}
      <div className="flex items-start gap-2 @7xs:gap-3">
        {/* Folder icon */}
        <div
          className={cn(
            'shrink-0 size-6 @7xs:size-8 rounded-lg flex items-center justify-center',
            'bg-entity-area/10 text-entity-area'
          )}
        >
          {activeProjectCount > 0 ? (
            <FolderOpen className="size-3 @7xs:size-4" />
          ) : (
            <Folder className="size-3 @7xs:size-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5 @7xs:gap-2 mb-1">
            <h3 className="font-medium text-xs @7xs:text-sm leading-snug truncate flex-1 min-w-0">
              {area.title}
            </h3>
            {area.type && <AreaTypeBadge type={area.type} />}
          </div>

          {/* Description (if present) */}
          {area.description && (
            <p className="text-2xs @7xs:text-xs text-muted-foreground line-clamp-2">
              {area.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer: Project count - stacks on narrow */}
      <div className="mt-2 @7xs:mt-3 pt-2 @7xs:pt-3 border-t border-border/40 flex flex-col @8xs:flex-row @8xs:items-center @8xs:justify-between gap-0.5 @8xs:gap-2 text-2xs @7xs:text-xs text-muted-foreground">
        <span>
          {activeProjectCount} active project
          {activeProjectCount !== 1 ? 's' : ''}
        </span>
        {projectCount !== activeProjectCount && (
          <span>{projectCount} total</span>
        )}
      </div>
    </div>
  )
}

/**
 * AreaTypeBadge - Colored label for area categories.
 *
 * Area types are user-defined categories like "personal", "work", "family".
 * Colors are automatically assigned using a hash function, so the same type
 * string always gets the same color. There are 6 color slots that cycle.
 */

// 6 color slots for user-defined area types
const typeColorClasses = [
  'bg-area-type-1/15 text-area-type-1',
  'bg-area-type-2/15 text-area-type-2',
  'bg-area-type-3/15 text-area-type-3',
  'bg-area-type-4/15 text-area-type-4',
  'bg-area-type-5/15 text-area-type-5',
  'bg-area-type-6/15 text-area-type-6',
]

// Simple hash function to consistently map type strings to color indices
function getTypeColorIndex(type: string): number {
  let hash = 0
  for (let i = 0; i < type.length; i++) {
    hash = (hash << 5) - hash + type.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % typeColorClasses.length
}

function AreaTypeBadge({ type }: { type: string }) {
  const colorClass = typeColorClasses[getTypeColorIndex(type)]
  const displayType = type.replace(/-/g, ' ')

  return (
    <span
      className={cn(
        'shrink-0 text-[9px] @7xs:text-2xs font-medium px-1 @7xs:px-1.5 py-0.5 rounded capitalize',
        colorClass
      )}
    >
      {displayType}
    </span>
  )
}
