import { Calendar, Flag, Snowflake } from 'lucide-react'

import type { TaskStatus } from '@/lib/tauri-bindings'
import { DateButton } from '@/components/ui/date-button'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'

interface QuickPaneMetadataProps {
  // Status
  status: TaskStatus
  onStatusChange: (status: TaskStatus) => void

  // Dates
  scheduled: string | null
  onScheduledChange: (date: string | undefined) => void
  due: string | null
  onDueChange: (date: string | undefined) => void
  deferUntil: string | null
  onDeferUntilChange: (date: string | undefined) => void

  // Controlled popover state
  statusOpen: boolean
  onStatusOpenChange: (open: boolean) => void
  scheduledOpen: boolean
  onScheduledOpenChange: (open: boolean) => void
  dueOpen: boolean
  onDueOpenChange: (open: boolean) => void
  deferOpen: boolean
  onDeferOpenChange: (open: boolean) => void
}

/**
 * QuickPaneMetadata - Status and date selection row.
 *
 * All controls on the right: Status pill, then date buttons (scheduled, due, defer-until)
 */
export function QuickPaneMetadata({
  status,
  onStatusChange,
  scheduled,
  onScheduledChange,
  due,
  onDueChange,
  deferUntil,
  onDeferUntilChange,
  statusOpen,
  onStatusOpenChange,
  scheduledOpen,
  onScheduledOpenChange,
  dueOpen,
  onDueOpenChange,
  deferOpen,
  onDeferOpenChange,
}: QuickPaneMetadataProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3">
      {/* Status + Date buttons */}
      <div className="flex items-center gap-1.5">
        <TaskStatusPill
          status={status}
          onStatusChange={onStatusChange}
          open={statusOpen}
          onOpenChange={onStatusOpenChange}
        />

        <DateButton
          icon={<Calendar className="size-3" />}
          value={scheduled ?? undefined}
          onChange={onScheduledChange}
          tooltip="Scheduled"
          variant="scheduled"
          align="center"
          open={scheduledOpen}
          onOpenChange={onScheduledOpenChange}
        />
        <DateButton
          icon={<Flag className="size-3" />}
          value={due ?? undefined}
          onChange={onDueChange}
          tooltip="Due"
          variant="due"
          align="center"
          open={dueOpen}
          onOpenChange={onDueOpenChange}
        />
        <DateButton
          icon={<Snowflake className="size-3" />}
          value={deferUntil ?? undefined}
          onChange={onDeferUntilChange}
          tooltip="Defer"
          variant="defer"
          align="center"
          open={deferOpen}
          onOpenChange={onDeferOpenChange}
        />
      </div>
    </div>
  )
}
