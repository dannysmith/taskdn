import * as React from 'react'
import { matchesKeyboardEvent, type ParsedShortcut } from '@/lib/shortcuts'

import type { PopoverType } from './QuickPaneApp'

interface UseQuickPaneKeyboardOptions {
  /** Called when Escape pressed with no popover open */
  onDismiss: () => Promise<void>
  /** Called when Cmd+Enter pressed */
  onSubmit: () => Promise<void>
  /** Called when Cmd+Shift+Enter pressed */
  onToggleBody: (show: boolean) => void
  /** Called when Cmd+T pressed */
  onSetScheduledToday: () => void
  /** Called when a popover shortcut is pressed */
  onOpenPopover: (popover: PopoverType) => void
  /** Called when Escape pressed with a popover open */
  onClosePopover: () => void
  /** Called before opening a popover to capture current focus */
  captureCurrentFocus: () => void
  /** Current open popover (null if none) */
  openPopover: PopoverType
  /** Whether body section is currently visible */
  showBody: boolean
  /** Parsed shortcut definitions */
  shortcuts: {
    setScheduledToday: ParsedShortcut
    openScheduled: ParsedShortcut
    openDue: ParsedShortcut
    openDefer: ParsedShortcut
    openStatus: ParsedShortcut
  }
}

/**
 * Handles all keyboard shortcuts for the quick pane.
 * Uses capture phase to intercept events before popovers.
 */
export function useQuickPaneKeyboard({
  onDismiss,
  onSubmit,
  onToggleBody,
  onSetScheduledToday,
  onOpenPopover,
  onClosePopover,
  captureCurrentFocus,
  openPopover,
  showBody,
  shortcuts,
}: UseQuickPaneKeyboardOptions): void {
  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Escape - close popover or dismiss pane
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()

        if (openPopover) {
          onClosePopover()
        } else {
          await onDismiss()
        }
        return
      }

      // Cmd+T - set scheduled to today
      if (matchesKeyboardEvent(shortcuts.setScheduledToday, e)) {
        e.preventDefault()
        onSetScheduledToday()
        return
      }

      // Cmd+D - open scheduled date picker
      if (matchesKeyboardEvent(shortcuts.openScheduled, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('scheduled')
        return
      }

      // Cmd+Shift+D - open due date picker
      if (matchesKeyboardEvent(shortcuts.openDue, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('due')
        return
      }

      // Ctrl+Shift+Cmd+D - open defer date picker
      if (matchesKeyboardEvent(shortcuts.openDefer, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('defer')
        return
      }

      // Cmd+S - open status picker
      if (matchesKeyboardEvent(shortcuts.openStatus, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('status')
        return
      }

      // Cmd+Shift+Enter - toggle body
      if (e.key === 'Enter' && e.metaKey && e.shiftKey) {
        e.preventDefault()
        onToggleBody(!showBody)
        return
      }

      // Cmd+Enter - submit
      if (e.key === 'Enter' && e.metaKey && !e.shiftKey) {
        e.preventDefault()
        await onSubmit()
        return
      }
    }

    // Capture phase to handle before any popover gets the event
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    onDismiss,
    onSubmit,
    onToggleBody,
    onSetScheduledToday,
    onOpenPopover,
    onClosePopover,
    captureCurrentFocus,
    openPopover,
    showBody,
    shortcuts,
  ])
}
