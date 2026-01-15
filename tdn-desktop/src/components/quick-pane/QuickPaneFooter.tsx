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
 * Styled with subtle background like Things 3.
 */
export function QuickPaneFooter({
  onCancel,
  onSave,
  saveDisabled,
}: QuickPaneFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 rounded-b-2xl bg-muted/30 px-5 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="font-medium"
      >
        Cancel
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={saveDisabled}
        className="font-medium"
      >
        Save
      </Button>
    </div>
  )
}
