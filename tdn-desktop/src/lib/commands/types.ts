import type { LucideIcon } from 'lucide-react'

export interface AppCommand {
  id: string
  /** Translation key for the command label (e.g., 'commands.showLeftSidebar.label') */
  labelKey: string
  /** Translation key for the command description (e.g., 'commands.showLeftSidebar.description') */
  descriptionKey?: string
  icon?: LucideIcon
  group?: string
  keywords?: string[]
  execute: (context: CommandContext) => void | Promise<void>
  isAvailable?: (context: CommandContext) => boolean
  /**
   * Keyboard shortcut in Tauri accelerator format.
   *
   * This is the single source of truth for shortcuts - used for:
   * - Keyboard event matching (via matchesKeyboardEvent)
   * - Display in command palette (via formatForDisplay)
   * - Menu accelerators (passed directly to Tauri)
   *
   * @example
   * 'CmdOrCtrl+1'      // Cmd on Mac, Ctrl on Windows/Linux
   * 'CmdOrCtrl+Shift+Z' // With shift modifier
   * 'F11'              // Function key (no modifier)
   * 'CmdOrCtrl+,'      // Special characters
   *
   * @see src/lib/shortcuts for parsing and formatting utilities
   */
  shortcut?: string
}

export interface CommandGroup {
  id: string
  label: string
  commands: AppCommand[]
}

export interface CommandContext {
  // Preferences
  openPreferences: () => void

  // Notifications
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}
