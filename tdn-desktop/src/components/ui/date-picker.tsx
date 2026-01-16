import * as React from 'react'
import { DatePicker as DannyDatePicker } from '@dannysmith/datepicker'
import { ChevronDownIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * DatePicker - Generic date picker with natural language input.
 *
 * Wraps @dannysmith/datepicker in a popover with a button trigger.
 * Supports natural language input like "tomorrow", "next friday", "in 3 weeks".
 */

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  /** Optional min date constraint */
  minDate?: Date
  /** Optional max date constraint */
  maxDate?: Date
}

function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Handle explicit commit (click or Enter) - save and close popover
  const handleCommit = (date: Date | null) => {
    onChange?.(date ?? undefined)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={`w-full justify-between font-normal ${className || ''}`}
          />
        }
      >
        {value ? value.toLocaleDateString() : placeholder}
        <ChevronDownIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        className="w-auto overflow-hidden p-0 border-0"
        align="start"
      >
        <DannyDatePicker
          value={value ?? null}
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

export { DatePicker }
