import { Calendar, Flag, Snowflake } from 'lucide-react'

import type { TaskStatus } from '@/lib/tauri-bindings'
import { DateButton } from '@/components/ui/date-button'
import { TaskStatusPill } from '@/components/tasks/TaskStatusPill'

/** Controlled field state for popover-based inputs */
interface ControlledFieldState<T> {
  value: T
  onChange: (value: T) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface QuickPaneMetadataProps {
  status: ControlledFieldState<TaskStatus>
  scheduled: ControlledFieldState<string | undefined>
  due: ControlledFieldState<string | undefined>
  defer: ControlledFieldState<string | undefined>
}

/**
 * QuickPaneMetadata - Status and date selection row.
 *
 * All controls on the right: Status pill, then date buttons (scheduled, due, defer-until)
 */
export function QuickPaneMetadata({
  status,
  scheduled,
  due,
  defer,
}: QuickPaneMetadataProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3">
      {/* Status + Date buttons */}
      <div className="flex items-center gap-1.5">
        <TaskStatusPill
          status={status.value}
          onStatusChange={status.onChange}
          open={status.open}
          onOpenChange={status.onOpenChange}
        />

        <DateButton
          icon={<Calendar className="size-3" />}
          value={scheduled.value}
          onChange={scheduled.onChange}
          tooltip="Scheduled"
          variant="scheduled"
          align="center"
          open={scheduled.open}
          onOpenChange={scheduled.onOpenChange}
        />
        <DateButton
          icon={<Flag className="size-3" />}
          value={due.value}
          onChange={due.onChange}
          tooltip="Due"
          variant="due"
          align="center"
          open={due.open}
          onOpenChange={due.onOpenChange}
        />
        <DateButton
          icon={<Snowflake className="size-3" />}
          value={defer.value}
          onChange={defer.onChange}
          tooltip="Defer"
          variant="defer"
          align="center"
          open={defer.open}
          onOpenChange={defer.onOpenChange}
        />
      </div>
    </div>
  )
}
