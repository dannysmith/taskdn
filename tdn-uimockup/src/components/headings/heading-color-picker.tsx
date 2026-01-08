import * as React from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { HeadingColor } from '@/types/headings'
import { headingColors, headingColorConfig } from '@/config/heading-colors'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

/**
 * HeadingColorPicker - Small colored dot that opens a color palette popover.
 *
 * Used in HeadingListItem to let users change the heading's accent color.
 * Shows available colors as clickable dots with a checkmark on the selected one.
 * There are 6 heading colors: stone, red, orange, green, blue, purple.
 */
interface HeadingColorPickerProps {
  color: HeadingColor
  onColorChange: (color: HeadingColor) => void
  /** Whether the picker is disabled */
  disabled?: boolean
}

export function HeadingColorPicker({
  color,
  onColorChange,
  disabled = false,
}: HeadingColorPickerProps) {
  const [open, setOpen] = React.useState(false)

  const handleColorSelect = (newColor: HeadingColor) => {
    onColorChange(newColor)
    setOpen(false)
  }

  const currentConfig = headingColorConfig[color]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          'size-2.5 rounded-full shrink-0 transition-transform',
          'hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          currentConfig.dotClass
        )}
        title={`Color: ${currentConfig.label}`}
      />
      <PopoverContent
        className="w-auto p-2"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="flex gap-1.5">
          {headingColors.map((c) => {
            const config = headingColorConfig[c]
            const isSelected = c === color
            return (
              <button
                key={c}
                type="button"
                onClick={() => handleColorSelect(c)}
                className={cn(
                  'size-6 rounded-full flex items-center justify-center',
                  'hover:ring-2 hover:ring-ring hover:ring-offset-1',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  config.dotClass
                )}
                title={config.label}
              >
                {isSelected && (
                  <Check className={cn('size-3.5', config.checkClass)} />
                )}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
