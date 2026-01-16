/**
 * QuickSearchResult - Displays a single task in Quick Search results.
 *
 * Shows task title with metadata row containing:
 * - Status pill
 * - Project/area name (text)
 * - Scheduled date (Calendar icon, gray)
 * - Due date (Flag icon, red if overdue)
 * - Defer-until date (Snowflake icon, blue)
 */

import { Calendar, Flag, Snowflake } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatRelativeDate, isOverdue } from '@/lib/date-utils'
import { taskStatusConfig } from '@/config/status'
import type { Task } from '@/lib/tauri-bindings'

interface QuickSearchResultProps {
  task: Task
  projectName: string | null
  areaName: string | null
}

export function QuickSearchResult({
  task,
  projectName,
  areaName,
}: QuickSearchResultProps) {
  const statusConfig = taskStatusConfig[task.status]
  const isDone = task.status === 'done' || task.status === 'dropped'

  // Context: show project if set, otherwise area
  const contextName = projectName ?? areaName

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {/* Title */}
      <span className="truncate font-medium">{task.title}</span>

      {/* Metadata row */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {/* Status pill */}
        <span
          className={cn(
            'px-1.5 py-0.5 rounded-full text-2xs font-medium shrink-0',
            statusConfig.color
          )}
        >
          {statusConfig.label}
        </span>

        {/* Context name (project or area) */}
        {contextName && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="truncate max-w-32">{contextName}</span>
          </>
        )}

        {/* Scheduled date - gray Calendar icon */}
        {task.scheduled && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1 shrink-0 text-muted-foreground">
              <Calendar className="size-3" />
              {formatRelativeDate(task.scheduled)}
            </span>
          </>
        )}

        {/* Due date - red Flag icon (darker if overdue) */}
        {task.due && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span
              className={cn(
                'flex items-center gap-1 shrink-0',
                isOverdue(task.due) && !isDone
                  ? 'text-date-overdue'
                  : 'text-date-due/80'
              )}
            >
              <Flag className="size-3" />
              {formatRelativeDate(task.due)}
            </span>
          </>
        )}

        {/* Defer date - blue Snowflake icon */}
        {task.deferUntil && (
          <>
            <span className="text-muted-foreground/50">·</span>
            <span className="flex items-center gap-1 shrink-0 text-status-icebox">
              <Snowflake className="size-3" />
              {formatRelativeDate(task.deferUntil)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
