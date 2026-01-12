import type { LucideIcon } from 'lucide-react'
import type { Area, Project, Task } from '@/lib/tauri-bindings'
import type { NavId } from '@/types/navigation'
import type { FocusableField } from '@/store/task-detail-store'

/** Entity types that can appear in context menus */
export type EntityType = 'task' | 'project' | 'area'

/** Union type for entities that can be targeted by context menu commands */
export type ContextMenuEntity =
  | { type: 'task'; entity: Task }
  | { type: 'project'; entity: Project }
  | { type: 'area'; entity: Area }

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
  /** Whether Obsidian features are enabled in preferences */
  isObsidianEnabled: () => boolean

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
  /** Focus a field in the task detail panel (shows sidebar if hidden) */
  focusField: (field: FocusableField) => void

  // Cache updates (for commands that modify data)
  // These update the TanStack Query cache after Tauri commands succeed
  updateTaskInCache: (taskId: string, updatedTask: Task) => void
  addTaskToCache: (task: Task) => void
  /** Remove a task from the cache and close the detail panel if it was open */
  deleteTaskFromCache: (taskId: string) => void

  // Preferences
  /** Check if permanent deletion is enabled in preferences */
  isPermanentDeleteEnabled: () => boolean

  // Context menu target (set before showing context menu, read by entity commands)
  /** Get the current context menu target entity */
  getContextMenuTarget: () => ContextMenuEntity | null
  /** Set the context menu target (called before showing context menu) */
  setContextMenuTarget: (target: ContextMenuEntity | null) => void
}

/**
 * Checks if a task command should be available.
 *
 * For context menus: checks if there's a task context menu target.
 * For command palette/keyboard: checks if a task is selected and focus isn't in an input.
 *
 * This ensures:
 * - Context menu commands work on the right-clicked task (via contextMenuTarget)
 * - Command palette/keyboard commands work on the selected task
 * - Standard keyboard shortcuts (⌘C, ⌘V) work normally in inputs
 */
export function isTaskCommandAvailable(context: CommandContext): boolean {
  // If there's a context menu target that's a task, always available
  const target = context.getContextMenuTarget()
  if (target !== null && target.type === 'task') {
    return true
  }

  // For command palette/keyboard: must have a selected task
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

/**
 * Get the target task for a command.
 *
 * Priority:
 * 1. Context menu target (if it's a task) - for right-click context menus
 * 2. Selected task - for command palette and keyboard shortcuts
 *
 * Use this in task command execute functions instead of getSelectedTask()
 * to ensure context menu commands operate on the right-clicked task.
 */
export function getTargetTask(context: CommandContext): Task | null {
  // First check context menu target
  const target = context.getContextMenuTarget()
  if (target !== null && target.type === 'task') {
    return target.entity
  }

  // Fall back to selected task
  return context.getSelectedTask()
}
