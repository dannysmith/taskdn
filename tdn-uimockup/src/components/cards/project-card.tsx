import * as React from 'react'
import { Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatRelativeDate } from '@/lib/date-utils'
import type { Project, ProjectStatus } from '@/types/data'
import { projectStatusConfig } from '@/config/status'
import { ProgressCircle } from '@/components/ui/progress-circle'

/**
 * ProjectCard - Summary card showing project status and progress.
 *
 * Used in AreaView to display "Active Projects" as a grid of cards.
 * Shows project title, status badge, progress bar, task counts, and optional
 * end date. Clicking navigates to the ProjectView for that project.
 *
 * The progress bar visualizes completion percentage based on done/dropped
 * tasks. Uses container queries for responsive behavior in grid layouts.
 */
export interface ProjectCardProps {
  project: Project
  /** Completion percentage (0-100) */
  completion: number
  /** Total number of tasks */
  taskCount: number
  /** Number of completed tasks */
  completedTaskCount: number
  /** Area name if the project belongs to one */
  areaName?: string
  /** Click handler for the card */
  onClick?: () => void
  /** Click handler for the area name */
  onAreaClick?: () => void
  /** Whether the card is selected */
  isSelected?: boolean
  className?: string
}
export function ProjectCard({
  project,
  completion,
  taskCount,
  completedTaskCount,
  areaName,
  onClick,
  onAreaClick,
  isSelected,
  className,
}: ProjectCardProps) {
  const status = project.status ?? 'planning'
  const isDone = status === 'done'

  const handleAreaClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAreaClick?.()
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        '@container group bg-card rounded-xl border border-border/60 p-3 @7xs:p-4 transition-all',
        'hover:border-border hover:shadow-sm',
        onClick && 'cursor-pointer',
        isSelected && 'ring-2 ring-primary border-primary',
        isDone && 'opacity-60',
        className
      )}
    >
      {/* Header: Title + Status Badge */}
      <div className="flex items-start justify-between gap-1.5 @7xs:gap-2 mb-2">
        <h3
          className={cn(
            'font-medium text-xs @7xs:text-sm leading-snug flex-1 min-w-0',
            isDone && 'line-through text-muted-foreground'
          )}
        >
          {project.title}
        </h3>
        <ProjectStatusBadge status={status} />
      </div>

      {/* Description (if present) */}
      {project.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      {/* Progress bar (visual representation) */}
      {taskCount > 0 && (
        <div className="mb-3">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-entity-project transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer: Metadata - stacks on narrow, row on wider */}
      <div className="flex flex-col @8xs:flex-row @8xs:items-center @8xs:justify-between gap-1.5 @8xs:gap-2 text-2xs @7xs:text-xs text-muted-foreground">
        <div className="flex items-center gap-2 @7xs:gap-3">
          {/* Task count with progress circle */}
          <span className="flex items-center gap-1 @7xs:gap-1.5">
            <ProgressCircle value={completion} size={12} strokeWidth={2} className="@7xs:size-3.5" />
            <span className="tabular-nums">
              {completedTaskCount}/{taskCount}
            </span>
          </span>

          {/* End date if set */}
          {project.endDate && (
            <span className="flex items-center gap-1">
              <Calendar className="size-2.5 @7xs:size-3" />
              {formatRelativeDate(project.endDate)}
            </span>
          )}
        </div>

        {/* Area name - clickable */}
        {areaName && (
          <button
            type="button"
            onClick={handleAreaClick}
            className={cn(
              'truncate max-w-20 @8xs:max-w-24 @[280px]:max-w-[140px] transition-colors text-start',
              onAreaClick && 'hover:text-foreground hover:underline'
            )}
          >
            {areaName}
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * ProjectStatusBadge - Colored pill showing project status.
 * Internal component used within ProjectCard. For standalone status display,
 * use ProjectStatusPill from projects/project-status-pill.tsx instead.
 */
function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = projectStatusConfig[status]

  return (
    <span
      className={cn(
        'shrink-0 text-[9px] @7xs:text-2xs font-medium h-4 @7xs:h-5 px-1.5 @7xs:px-2 rounded-full inline-flex items-center',
        config.color
      )}
    >
      {config.label}
    </span>
  )
}
