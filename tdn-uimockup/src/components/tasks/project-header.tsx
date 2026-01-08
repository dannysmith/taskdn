import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  ProjectStatusIndicator,
  getProjectTitleClass,
} from '@/components/sidebar/draggable-project'
import type { Project } from '@/types/data'
import { projectStatusConfig } from '@/config/status'

/**
 * ProjectHeader - Collapsible header row for a project in list views.
 *
 * Used by ProjectTaskGroup in AreaView. Shows:
 * - Expand/collapse chevron
 * - Status indicator (progress circle or done/blocked icons)
 * - Project title
 * - Status badge
 *
 * Interactions:
 * - Single click: Toggle expand/collapse
 * - Double click: Navigate to full ProjectView
 */
interface ProjectHeaderProps {
  project: Project
  completion: number
  isExpanded: boolean
  onToggleExpand: () => void
  onOpenProject: () => void
}

/**
 * A section header for a project, showing status indicator, title, and status badge.
 * - Click to expand/collapse
 * - Double-click to open project view
 */
export function ProjectHeader({
  project,
  completion,
  isExpanded,
  onToggleExpand,
  onOpenProject,
}: ProjectHeaderProps) {
  const handleClick = () => {
    onToggleExpand()
  }

  const handleDoubleClick = () => {
    onOpenProject()
  }

  const status = project.status ?? 'planning'
  const config = projectStatusConfig[status]

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-1 cursor-pointer select-none',
        'border-b border-border/60',
        'hover:bg-muted/30 transition-colors'
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Expand/collapse chevron */}
      <ChevronRight
        className={cn(
          'size-4 text-muted-foreground shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-90'
        )}
      />

      {/* Status indicator (progress circle or icon) */}
      <ProjectStatusIndicator status={project.status} completion={completion} />

      {/* Project title */}
      <span
        className={cn(
          'font-semibold text-sm truncate flex-1',
          getProjectTitleClass(project.status)
        )}
      >
        {project.title}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          'shrink-0 text-2xs font-medium h-5 px-2 rounded-full inline-flex items-center',
          config.color
        )}
      >
        {config.label}
      </span>
    </div>
  )
}
