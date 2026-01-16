import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu'
import i18n from '@/i18n/config'
import type { Area, Project, Task } from '@/lib/tauri-bindings'
import type {
  AppCommand,
  CommandContext,
  ContextMenuEntity,
  EntityType,
} from '@/lib/commands/types'
import { executeCommand, getCommandLabel } from '@/lib/commands/registry'
import { logger } from '@/lib/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Context Menu Mutex
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Guards against concurrent context menu operations.
 * Only one context menu can be built/shown at a time.
 */
let contextMenuInProgress = false
let contextMenuAbortController: AbortController | null = null

/**
 * Log context menu events for debugging hangs.
 */
function logContextMenu(event: string, details?: Record<string, unknown>) {
  logger.debug(`[ContextMenu] ${event}`, details)
}

/**
 * Context menu utilities for native right-click menus.
 *
 * Uses Tauri's built-in Menu API (no plugin required).
 *
 * @example
 * ```typescript
 * // Custom context menu
 * await showContextMenu([
 *   { id: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C', action: handleCopy },
 *   { type: 'separator' },
 *   { id: 'delete', label: 'Delete', action: handleDelete },
 * ]);
 *
 * // Standard edit menu (Cut, Copy, Paste, Select All)
 * await showEditContextMenu();
 *
 * // Entity context menus
 * await showTaskContextMenu(task, commandContext);
 * await showProjectContextMenu(project, commandContext);
 * await showAreaContextMenu(area, commandContext);
 * ```
 */

export interface ContextMenuItem {
  id: string
  label: string
  accelerator?: string
  disabled?: boolean
  action?: () => void
}

export interface ContextMenuSeparator {
  type: 'separator'
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator

/**
 * Type guard to check if an entry is a separator.
 */
function isSeparator(item: ContextMenuEntry): item is ContextMenuSeparator {
  return 'type' in item && item.type === 'separator'
}

/**
 * Show a custom context menu at the current cursor position.
 */
export async function showContextMenu(
  items: ContextMenuEntry[]
): Promise<void> {
  const menuItems = await Promise.all(
    items.map(async item => {
      if (isSeparator(item)) {
        return PredefinedMenuItem.new({ item: 'Separator' })
      }
      return MenuItem.new({
        id: item.id,
        text: item.label,
        accelerator: item.accelerator,
        enabled: !item.disabled,
        action: item.action,
      })
    })
  )

  const menu = await Menu.new({ items: menuItems })
  await menu.popup()
}

/**
 * Show a standard edit context menu with Cut, Copy, Paste, Select All.
 * Uses native predefined menu items that work with the system clipboard.
 */
export async function showEditContextMenu(): Promise<void> {
  const menu = await Menu.new({
    items: [
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' }),
    ],
  })
  await menu.popup()
}

/**
 * Show a context menu for text input fields.
 * Includes Undo/Redo in addition to standard edit operations.
 */
export async function showTextInputContextMenu(): Promise<void> {
  const menu = await Menu.new({
    items: [
      await PredefinedMenuItem.new({ item: 'Undo' }),
      await PredefinedMenuItem.new({ item: 'Redo' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'Cut' }),
      await PredefinedMenuItem.new({ item: 'Copy' }),
      await PredefinedMenuItem.new({ item: 'Paste' }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await PredefinedMenuItem.new({ item: 'SelectAll' }),
    ],
  })
  await menu.popup()
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Context Menus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Group order for context menu commands.
 * Commands are grouped by their `group` property and ordered accordingly.
 */
const CONTEXT_MENU_GROUP_ORDER = [
  'file', // reveal, open, obsidian
  'tasks', // date commands, status (tasks only)
  'clipboard', // copy title, path, url, markdown
]

/**
 * Get all registered commands from the registry.
 * We import this dynamically to avoid circular dependencies.
 *
 * Note: We pass the real context because getAllCommands filters by isAvailable,
 * and entity commands check getContextMenuTarget() which must be set.
 */
async function getRegisteredCommands(
  context: CommandContext
): Promise<Map<string, AppCommand>> {
  const { getAllCommands } = await import('@/lib/commands/registry')
  const commands = getAllCommands(context, '', undefined)
  const map = new Map<string, AppCommand>()
  commands.forEach(cmd => map.set(cmd.id, cmd))
  return map
}

/**
 * Get commands that should appear in context menu for a given entity type.
 */
function getContextMenuCommands(
  allCommands: Map<string, AppCommand>,
  entityType: EntityType,
  context: CommandContext
): AppCommand[] {
  const commands: AppCommand[] = []

  for (const cmd of allCommands.values()) {
    // Check if command should appear in this entity's context menu
    const surfaces = cmd.surfaces
    if (!surfaces?.contextMenu?.includes(entityType)) continue

    // Check if command is available
    if (cmd.isAvailable && !cmd.isAvailable(context)) continue

    commands.push(cmd)
  }

  return commands
}

/**
 * Group commands by their group property, maintaining order.
 */
function groupCommands(commands: AppCommand[]): Map<string, AppCommand[]> {
  const groups = new Map<string, AppCommand[]>()

  // Initialize groups in order
  for (const groupName of CONTEXT_MENU_GROUP_ORDER) {
    groups.set(groupName, [])
  }
  groups.set('other', []) // Catch-all for ungrouped commands

  // Assign commands to groups
  for (const cmd of commands) {
    const group = cmd.group ?? 'other'
    let groupArray = groups.get(group)
    if (!groupArray) {
      groupArray = []
      groups.set(group, groupArray)
    }
    groupArray.push(cmd)
  }

  // Remove empty groups
  for (const [key, value] of groups) {
    if (value.length === 0) {
      groups.delete(key)
    }
  }

  return groups
}

/**
 * Build a native context menu from commands.
 */
async function buildEntityContextMenu(
  commands: AppCommand[],
  context: CommandContext
): Promise<Menu> {
  const t = i18n.t.bind(i18n)
  const groupedCommands = groupCommands(commands)
  const menuItems: (MenuItem | PredefinedMenuItem)[] = []

  // Log all commands being added to the menu for debugging
  const commandSummary = commands.map(cmd => ({
    id: cmd.id,
    shortcut: cmd.shortcut ?? 'none',
  }))
  logContextMenu('building-menu-items', { commands: commandSummary })

  let isFirstGroup = true
  for (const [groupName, groupCommands] of groupedCommands) {
    // Add separator between groups
    if (!isFirstGroup) {
      menuItems.push(await PredefinedMenuItem.new({ item: 'Separator' }))
    }
    isFirstGroup = false

    logContextMenu('adding-group', { groupName, count: groupCommands.length })

    // Add commands in this group
    for (const cmd of groupCommands) {
      const label = getCommandLabel(cmd, t)
      logContextMenu('adding-menu-item', {
        id: cmd.id,
        label,
        accelerator: cmd.shortcut ?? 'none',
      })

      try {
        // Note: We intentionally omit accelerators from context menus.
        // Context menus are accessed by right-click, not keyboard, so shortcuts
        // aren't useful here. More importantly, complex accelerator strings
        // can cause issues with native menu systems on some platforms.
        menuItems.push(
          await MenuItem.new({
            id: cmd.id,
            text: label,
            // accelerator intentionally omitted - see note above
            action: async () => {
              const result = await executeCommand(cmd.id, context)
              if (!result.success) {
                logger.error('Context menu command failed', {
                  commandId: cmd.id,
                  error: result.error,
                })
              }
            },
          })
        )
      } catch (error) {
        // Log but don't fail the entire menu for one bad item
        logContextMenu('menu-item-error', {
          id: cmd.id,
          error: String(error),
        })
      }
    }
  }

  logContextMenu('creating-menu', { itemCount: menuItems.length })
  return Menu.new({ items: menuItems })
}

/**
 * Show a context menu for a task.
 */
export async function showTaskContextMenu(
  task: Task,
  context: CommandContext
): Promise<void> {
  await showEntityContextMenu('task', task, context)
}

/**
 * Generic entity context menu handler with mutex protection.
 * Prevents concurrent context menus which can cause hangs.
 */
async function showEntityContextMenu(
  type: EntityType,
  entity: Task | Project | Area,
  context: CommandContext
): Promise<void> {
  const entityId = entity.id
  const entityTitle = entity.title

  logContextMenu('requested', { type, entityId, entityTitle })

  // If another context menu is in progress, abort it first
  if (contextMenuInProgress) {
    logContextMenu('aborting-previous', { type, entityId })
    contextMenuAbortController?.abort()
    // Give a brief moment for the previous menu to clean up
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  // Check again after the brief delay
  if (contextMenuInProgress) {
    logContextMenu('skipped-still-in-progress', { type, entityId })
    return
  }

  // Set up abort controller for this menu
  contextMenuAbortController = new AbortController()
  const abortSignal = contextMenuAbortController.signal

  // Acquire the mutex
  contextMenuInProgress = true
  logContextMenu('acquired-mutex', { type, entityId })

  // Set the context menu target
  const target: ContextMenuEntity = { type, entity } as ContextMenuEntity
  context.setContextMenuTarget(target)

  try {
    // Check for abort before expensive operations
    if (abortSignal.aborted) {
      logContextMenu('aborted-before-commands', { type, entityId })
      return
    }

    logContextMenu('fetching-commands', { type, entityId })
    const allCommands = await getRegisteredCommands(context)

    if (abortSignal.aborted) {
      logContextMenu('aborted-after-commands', { type, entityId })
      return
    }

    const commands = getContextMenuCommands(allCommands, type, context)

    if (commands.length === 0) {
      logContextMenu('no-commands-available', { type, entityId })
      return
    }

    logContextMenu('building-menu', {
      type,
      entityId,
      commandCount: commands.length,
    })
    const menu = await buildEntityContextMenu(commands, context)

    if (abortSignal.aborted) {
      logContextMenu('aborted-after-build', { type, entityId })
      return
    }

    logContextMenu('showing-popup', { type, entityId })
    await menu.popup()
    logContextMenu('popup-closed', { type, entityId })
  } catch (error) {
    logContextMenu('error', { type, entityId, error: String(error) })
    throw error
  } finally {
    // Clear the target after menu closes
    context.setContextMenuTarget(null)
    // Release the mutex
    contextMenuInProgress = false
    contextMenuAbortController = null
    logContextMenu('released-mutex', { type, entityId })
  }
}

/**
 * Show a context menu for a project.
 */
export async function showProjectContextMenu(
  project: Project,
  context: CommandContext
): Promise<void> {
  await showEntityContextMenu('project', project, context)
}

/**
 * Show a context menu for an area.
 */
export async function showAreaContextMenu(
  area: Area,
  context: CommandContext
): Promise<void> {
  await showEntityContextMenu('area', area, context)
}
