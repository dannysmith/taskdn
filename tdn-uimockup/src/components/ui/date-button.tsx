import * as React from 'react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

/**
 * DateButton - Compact date display with calendar popover for editing.
 *
 * Used in TaskDetailPanel for scheduled, due, and deferUntil dates.
 * Shows an icon + formatted date (or placeholder when empty). Click opens
 * a calendar picker. Has a "Clear date" button when a date is set.
 *
 * Three visual variants with different color schemes:
 * - scheduled: Neutral gray (most common, non-urgent)
 * - due: Red-tinted (deadline indicator)
 * - defer: Blue-tinted (matches icebox/deferred styling)
 *
 * Uses container queries for responsive sizing (height, padding, text size).
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type DateButtonVariant = 'scheduled' | 'due' | 'defer'

export interface DateButtonProps {
  /** Icon to display in the button */
  icon: React.ReactNode
  /** Current date value (ISO date string) */
  value: string | undefined
  /** Callback when date changes */
  onChange: (date: string | undefined) => void
  /** Tooltip/label shown when no date is set */
  tooltip: string
  /** Visual variant affecting colors */
  variant: DateButtonVariant
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export const dateButtonStyles = {
  scheduled: {
    base: 'text-muted-foreground bg-muted/50 hover:bg-muted',
    active: 'text-muted-foreground bg-muted/80',
  },
  due: {
    base: 'text-destructive/70 bg-destructive/5 hover:bg-destructive/10',
    active: 'text-destructive bg-destructive/10',
  },
  defer: {
    base: 'text-status-icebox/70 bg-status-icebox/5 hover:bg-status-icebox/10',
    active: 'text-status-icebox bg-status-icebox/10',
  },
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function DateButton({
  icon,
  value,
  onChange,
  tooltip,
  variant,
}: DateButtonProps) {
  const [open, setOpen] = React.useState(false)
  const styles = dateButtonStyles[variant]

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, 'yyyy-MM-dd'))
    } else {
      onChange(undefined)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-6 @[280px]:h-7 gap-0.5 @[280px]:gap-1 px-1.5 @[280px]:px-2 text-2xs @[280px]:text-xs font-normal border-0',
              value ? styles.active : styles.base
            )}
            title={tooltip}
          />
        }
      >
        {icon}
        <span className="truncate">{value ? format(new Date(value), 'MMM d') : tooltip}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <CalendarComponent
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={handleSelect}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined)
                setOpen(false)
              }}
            >
              Clear date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
