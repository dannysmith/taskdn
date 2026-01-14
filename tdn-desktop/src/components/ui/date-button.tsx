import * as React from 'react'
import { DatePicker } from '@dannysmith/datepicker'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * DateButton - Compact date display with natural language date picker.
 *
 * Used in TaskDetailPanel for scheduled, due, and deferUntil dates.
 * Shows an icon + formatted date (or placeholder when empty). Click opens
 * a natural language date picker with fuzzy matching and infinite scroll.
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
  /** Controlled open state (optional - uses internal state if not provided) */
  open?: boolean
  /** Callback when open state changes (required if open is controlled) */
  onOpenChange?: (open: boolean) => void
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

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
  open: controlledOpen,
  onOpenChange,
}: DateButtonProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)

  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(value)
    } else {
      setInternalOpen(value)
    }
  }

  const styles = dateButtonStyles[variant]

  // Convert ISO string to Date for the datepicker (null if no value)
  const dateValue = value ? new Date(value) : null

  // Handle explicit commit (click or Enter) - save and close popover
  const handleCommit = (date: Date | null) => {
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
              'h-6 gap-0.5 border-0 px-1.5 text-2xs font-normal @[280px]:h-7 @[280px]:gap-1 @[280px]:px-2 @[280px]:text-xs',
              value ? styles.active : styles.base
            )}
            title={tooltip}
          />
        }
      >
        {icon}
        <span className="truncate">
          {value ? format(new Date(value), 'MMM d') : tooltip}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 overflow-hidden border-0" align="end">
        <DatePicker
          value={dateValue}
          onCommit={handleCommit}
          placeholder={tooltip}
          showClearButton={!!value}
        />
      </PopoverContent>
    </Popover>
  )
}
