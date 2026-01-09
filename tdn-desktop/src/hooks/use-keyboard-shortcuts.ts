import { useEffect } from 'react'
import { useUIStore } from '@/store/ui-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { CommandContext } from '@/lib/commands/types'

/**
 * Handles global keyboard shortcuts for the application.
 *
 * Currently handles:
 * - Cmd/Ctrl+, : Open preferences
 * - Cmd/Ctrl+1 : Toggle left sidebar
 * - Cmd/Ctrl+2 : Toggle right sidebar
 * - Cmd/Ctrl+N : Create new task in current view
 */
export function useKeyboardShortcuts(commandContext: CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case ',': {
            e.preventDefault()
            commandContext.openPreferences()
            break
          }
          case '1': {
            e.preventDefault()
            const { leftSidebarVisible, setLeftSidebarVisible } =
              useUIStore.getState()
            setLeftSidebarVisible(!leftSidebarVisible)
            break
          }
          case '2': {
            e.preventDefault()
            const { rightSidebarVisible, setRightSidebarVisible } =
              useUIStore.getState()
            setRightSidebarVisible(!rightSidebarVisible)
            break
          }
          case 'n':
          case 'N': {
            // Skip if already handled by a component (e.g., TaskList with focus)
            if (e.defaultPrevented) break

            // Check if we're in an input/textarea - don't override native behavior
            const activeEl = document.activeElement
            if (
              activeEl instanceof HTMLInputElement ||
              activeEl instanceof HTMLTextAreaElement ||
              (activeEl instanceof HTMLElement && activeEl.isContentEditable)
            ) {
              break
            }

            e.preventDefault()
            // Trigger task creation via the store
            useTaskCreationStore.getState().triggerCreate()
            break
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandContext])
}
