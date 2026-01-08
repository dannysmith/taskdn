import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/data'
import {
  projectStatusConfig,
  projectPrimaryStatuses,
  projectSecondaryStatuses,
} from '@/config/status'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

/**
 * ProjectStatusPill - Colored badge showing project status with optional dropdown.
 *
 * Used in ViewHeader when viewing a project to show/change its status.
 * When onStatusChange is provided, shows a dropdown chevron and becomes
 * interactive. When read-only, just shows the colored badge.
 *
 * Statuses are split into primary (planning, ready, in-progress, blocked)
 * and secondary (paused, done) with a separator in the dropdown.
 */
export interface ProjectStatusPillProps {
  status: ProjectStatus
  onStatusChange?: (newStatus: ProjectStatus) => void
  className?: string
}

export function ProjectStatusPill({
  status,
  onStatusChange,
  className,
}: ProjectStatusPillProps) {
  const config = projectStatusConfig[status]

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!onStatusChange) {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
          config.color,
          className
        )}
      >
        {config.label}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={handleClick}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs font-medium shrink-0 inline-flex items-center gap-1 transition-opacity hover:opacity-80',
          config.color,
          className
        )}
      >
        {config.label}
        <ChevronDown className="size-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {projectPrimaryStatuses.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(s)
            }}
            className={cn('cursor-pointer', s === status && 'bg-accent')}
          >
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium',
                projectStatusConfig[s].color
              )}
            >
              {projectStatusConfig[s].label}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {projectSecondaryStatuses.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(s)
            }}
            className={cn('cursor-pointer', s === status && 'bg-accent')}
          >
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs font-medium',
                projectStatusConfig[s].color
              )}
            >
              {projectStatusConfig[s].label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
