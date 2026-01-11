import type { LucideIcon } from 'lucide-react'
import type { Area, Project, Task } from '@/lib/tauri-bindings'
import type { NavId } from '@/types/navigation'

/** Entity types that can appear in context menus */
export type EntityType = 'task' | 'project' | 'area'

/** Defines where a command appears in the UI */
export interface CommandSurfaces {
  /** Show in command palette (default: true) */
  commandPalette?: boolean
  /** Entity types whose context menus should include this command */
  contextMenu?: EntityType[]
  /** App menu location (e.g., 'Edit', 'View', 'File') */
  appMenu?: string
}

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
  /**
   * Defines where this command appears in the UI.
   * If not specified, defaults to showing in command palette only.
   */
  surfaces?: CommandSurfaces
  /**
   * Whether this command supports multi-select (for future).
   * When true, the command can operate on multiple selected items.
   */
  supportsMultiSelect?: boolean
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

  // Navigation
  navigateToView: (view: NavId) => void
  navigateToArea: (areaId: string) => void
  navigateToProject: (projectId: string) => void
  navigateToNoArea: () => void

  // Data access (for dynamic commands)
  getAreas: () => Area[]
  getProjects: () => Project[]

  // Sidebar management
  collapseAllAreas: () => void
  expandAllAreas: () => void

  // External
  openExternalUrl: (url: string) => void

  // Task selection (reads from task-detail-store.openTaskId)
  selectedTaskId: string | null
  getSelectedTask: () => Task | null

  // Task operations
  openTask: (taskId: string) => void
}

/**
 * Checks if a task command should be available.
 * Task commands require:
 * 1. A task to be selected (open in detail panel)
 * 2. Focus NOT in an editable element (input, textarea, select, contenteditable)
 *
 * This ensures standard keyboard shortcuts (⌘C, ⌘V) work normally in inputs.
 */
export function isTaskCommandAvailable(context: CommandContext): boolean {
  // Must have a selected task
  if (!context.selectedTaskId) return false

  // Must not be in an editable element
  const activeEl = document.activeElement
  if (
    activeEl instanceof HTMLInputElement ||
    activeEl instanceof HTMLTextAreaElement ||
    activeEl instanceof HTMLSelectElement ||
    (activeEl instanceof HTMLElement && activeEl.isContentEditable)
  ) {
    return false
  }

  return true
}
