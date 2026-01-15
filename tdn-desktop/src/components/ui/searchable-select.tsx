import * as React from 'react'
import { ChevronsUpDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SearchableSelectOption {
  value: string
  label: string
}

export interface SearchableSelectProps {
  /** Currently selected value */
  value: string | undefined
  /** Available options */
  options: SearchableSelectOption[]
  /** Placeholder text when nothing is selected */
  placeholder: string
  /** Text to display for the selected value (defaults to the option label) */
  displayValue?: string
  /** Icon to show before the label (ReactNode for flexibility) */
  icon?: React.ReactNode
  /** Callback when selection changes */
  onChange: (value: string | undefined) => void
  /** Text shown when no options match the search */
  emptyText: string
  /** Additional classes for the trigger button */
  className?: string
  /** Controlled open state (optional - uses internal state if not provided) */
  open?: boolean
  /** Callback when open state changes (required if open is controlled) */
  onOpenChange?: (open: boolean) => void
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Sentinel value for the "clear selection" option */
const CLEAR_SELECTION_VALUE = '__searchable_select_clear__'

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

/**
 * SearchableSelect - Combobox-style dropdown with search filtering.
 *
 * Follows the standard shadcn combobox pattern using Popover + Command.
 * cmdk handles keyboard navigation natively (Arrow keys, Enter, Escape).
 *
 * Features:
 * - Type to filter options (cmdk handles filtering)
 * - Keyboard navigation (cmdk handles this)
 * - Checkmark on selected option (via data-checked attribute)
 * - "Clear selection" option when a value is selected
 * - Customizable empty state text
 */
export function SearchableSelect({
  value,
  options,
  placeholder,
  displayValue,
  icon,
  onChange,
  emptyText,
  className,
  open: controlledOpen,
  onOpenChange,
}: SearchableSelectProps) {
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className={cn('h-8 min-w-0 flex-1 justify-between', className)}
          />
        }
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon}
          <span
            className={cn('truncate', !displayValue && 'text-muted-foreground')}
          >
            {displayValue || placeholder}
          </span>
        </span>
        <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value={CLEAR_SELECTION_VALUE}
                  onSelect={() => {
                    onChange(undefined)
                    setOpen(false)
                  }}
                >
                  <span className="text-muted-foreground">Clear selection</span>
                </CommandItem>
              )}
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={value === option.value}
                  onSelect={selectedLabel => {
                    // cmdk passes the value prop (label) to onSelect
                    // Find the option by label to get the actual value
                    const selected = options.find(
                      o => o.label === selectedLabel
                    )
                    if (selected) {
                      onChange(selected.value)
                    }
                    setOpen(false)
                  }}
                >
                  {icon}
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
