import { useEffect } from 'react'
import { getAllCommands, executeCommand } from '@/lib/commands'
import { parseShortcut, matchesKeyboardEvent } from '@/lib/shortcuts'
import type { CommandContext } from '@/lib/commands/types'

/**
 * Global keyboard shortcut handler that routes through the command system.
 *
 * This is the single source of truth for keyboard shortcuts. All shortcuts
 * are defined in command definitions and matched here.
 *
 * Features:
 * - Commands are fetched fresh on each keypress (dynamic isAvailable check)
 * - Skips editable elements (input, textarea, select, contenteditable)
 * - Respects e.defaultPrevented for component-level handlers
 * - Executes through executeCommand() for consistent behavior
 */
export function useGlobalShortcuts(context: CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if component already handled (e.g., TaskList Cmd+N)
      if (e.defaultPrevented) return

      // Skip if focused on editable elements
      if (isEditableElement(document.activeElement)) return

      // Get fresh list of available commands (isAvailable filtering is dynamic)
      const commands = getAllCommands(context)

      // Find a command with a matching shortcut
      const match = commands.find(cmd => {
        if (!cmd.shortcut) return false
        const parsed = parseShortcut(cmd.shortcut)
        return matchesKeyboardEvent(parsed, e)
      })

      if (match) {
        e.preventDefault()
        executeCommand(match.id, context)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [context])
}

/**
 * Check if an element should exclude global shortcuts.
 */
function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}
