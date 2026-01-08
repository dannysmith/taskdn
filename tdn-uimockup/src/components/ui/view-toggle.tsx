import { List, Columns3, Calendar } from 'lucide-react'

import { cn } from '@/lib/utils'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

/**
 * ViewToggle - Icon toggle group for switching between list/kanban/calendar views.
 *
 * Used in ViewHeader to let users choose how they want to see their tasks.
 * Available modes are configurable - not all views support all modes.
 *
 * View mode state is managed by view-mode-store (Zustand) with separate
 * state per view type (e.g., AreaView can be list while WeekView is calendar).
 */
export type ViewMode = 'list' | 'kanban' | 'calendar'

interface ViewToggleProps {
  value: ViewMode
  onChange: (value: ViewMode) => void
  /** Which view modes are available. Defaults to list + kanban */
  availableModes?: ViewMode[]
  className?: string
}

const modeConfig: Record<ViewMode, { icon: typeof List; label: string }> = {
  list: { icon: List, label: 'List view' },
  kanban: { icon: Columns3, label: 'Kanban view' },
  calendar: { icon: Calendar, label: 'Calendar view' },
}

export function ViewToggle({
  value,
  onChange,
  availableModes = ['list', 'kanban'],
  className,
}: ViewToggleProps) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(newValues) => {
        // base-ui uses arrays - take the last pressed value for single-select behavior
        // If user clicks the already-selected item, newValues will still contain it
        // If user clicks a different item, newValues will contain both old and new
        if (newValues.length > 0) {
          // Get the newly pressed value (the one that wasn't previously selected)
          const newValue = newValues.find((v) => v !== value) ?? newValues[0]
          if (newValue && newValue !== value) {
            onChange(newValue as ViewMode)
          }
        }
      }}
      variant="outline"
      size="sm"
      className={cn('bg-muted/50', className)}
    >
      {availableModes.map((mode) => {
        const config = modeConfig[mode]
        const Icon = config.icon
        return (
          <ToggleGroupItem
            key={mode}
            value={mode}
            aria-label={config.label}
            className="data-[pressed]:bg-muted data-[pressed]:shadow-inner"
          >
            <Icon className="size-4" />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
