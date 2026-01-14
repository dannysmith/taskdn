import * as React from 'react'
import { DatePicker } from '@dannysmith/datepicker'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * PopoverDatePicker - Wraps @dannysmith/datepicker in a popover pattern.
 *
 * This component provides natural language date input ("tomorrow", "next friday",
 * "in 3 weeks") inside a popover, matching the app's existing button-trigger UI.
 *
 * Key features:
 * - Natural language parsing with fuzzy matching
 * - Virtualized infinite scroll through dates
 * - Keyboard navigation (arrows, Page Up/Down, Enter, Escape)
 * - Converts between ISO date strings and Date objects
 * - Closes popover on explicit date selection
 */

export interface PopoverDatePickerProps {
  /** Current date value (ISO string yyyy-MM-dd or undefined) */
  value: string | undefined
  /** Callback when date changes */
  onChange: (date: string | undefined) => void
  /** Trigger element (typically a Button or icon+text) */
  children: React.ReactNode
  /** Optional min date constraint */
  minDate?: Date
  /** Optional max date constraint */
  maxDate?: Date
  /** Placeholder text for the input */
  placeholder?: string
  /** Popover alignment */
  align?: 'start' | 'center' | 'end'
  /** Controlled open state */
  open?: boolean
  /** Open state change callback */
  onOpenChange?: (open: boolean) => void
  /** Additional class for popover content */
  className?: string
}

export function PopoverDatePicker({
  value,
  onChange,
  children,
  minDate,
  maxDate,
  placeholder = 'Select date',
  align = 'end',
  open: controlledOpen,
  onOpenChange,
  className,
}: PopoverDatePickerProps) {
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
      <PopoverTrigger render={<>{children}</>} />
      <PopoverContent
        className={cn('w-auto p-0 overflow-hidden border-0', className)}
        align={align}
      >
        <DatePicker
          value={dateValue}
          onCommit={handleCommit}
          minDate={minDate}
          maxDate={maxDate}
          placeholder={placeholder}
          showClearButton={!!value}
        />
      </PopoverContent>
    </Popover>
  )
}
