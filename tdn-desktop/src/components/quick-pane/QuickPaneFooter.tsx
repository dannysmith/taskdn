import { Button } from '@/components/ui/button'

interface QuickPaneFooterProps {
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
}

/**
 * QuickPaneFooter - Cancel and Save buttons.
 *
 * Save is disabled when title is empty.
 * Cancel dismisses without creating a task.
 */
export function QuickPaneFooter({
  onCancel,
  onSave,
  saveDisabled,
}: QuickPaneFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2.5">
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} disabled={saveDisabled}>
        Save
      </Button>
    </div>
  )
}
