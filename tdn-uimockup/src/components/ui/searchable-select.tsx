import * as React from 'react'
import { ChevronsUpDown, Check } from 'lucide-react'

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

/**
 * SearchableSelect - Combobox-style dropdown with search filtering.
 *
 * Used in TaskDetailPanel for selecting project and area. Shows a trigger
 * button with icon + label, opens a searchable dropdown powered by cmdk.
 *
 * Features:
 * - Type to filter options
 * - Checkmark on selected option
 * - "Clear selection" option when a value is selected
 * - Customizable empty state text
 */

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Sentinel value for the "clear selection" option - namespaced to avoid collision */
const CLEAR_SELECTION_VALUE = '__searchable_select_clear_8f4a2b__'

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
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export function SearchableSelect({
  value,
  options,
  placeholder,
  displayValue,
  icon,
  onChange,
  emptyText,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-between min-w-0 h-8"
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
          <CommandInput placeholder={`Search...`} />
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
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  data-checked={value === option.value}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {icon}
                  {option.label}
                  {value === option.value && (
                    <Check className="ms-auto size-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
