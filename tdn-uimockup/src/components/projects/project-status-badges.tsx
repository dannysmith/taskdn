import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/data'
import { projectStatusConfig } from '@/config/status'

/**
 * ProjectStatusBadges - Compact status breakdown for area views.
 *
 * Shows colored badges with counts for each project status in an area.
 * Used in ViewHeader when viewing an area to provide at-a-glance project
 * health information. Only shows badges for statuses with count > 0.
 *
 * Order is: blocked → in-progress → ready → planning → paused → done
 * (most urgent/active statuses first).
 */

// Display order for status badges
const statusOrder: ProjectStatus[] = [
  'blocked',
  'in-progress',
  'ready',
  'planning',
  'paused',
  'done',
]

interface ProjectStatusBadgesProps {
  counts: Record<string, number>
  className?: string
}
export function ProjectStatusBadges({
  counts,
  className,
}: ProjectStatusBadgesProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {statusOrder.map((status) => {
        const count = counts[status]
        if (!count) return null
        const config = projectStatusConfig[status]
        return (
          <span
            key={status}
            className={cn(
              'text-2xs font-medium h-5 px-1.5 rounded-full inline-flex items-center gap-1',
              config.color
            )}
          >
            <span>{count}</span>
            <span className="hidden sm:inline">{config.label}</span>
          </span>
        )
      })}
    </div>
  )
}
