/**
 * Application menu builder using Tauri's JavaScript API.
 *
 * This module creates native menus from JavaScript, enabling:
 * - i18n support through react-i18next
 * - Command-driven menu items from the registry
 * - Dynamic Go menu with areas/projects
 * - State-based enabled/disabled items
 *
 * Menus are rebuilt when language or data changes.
 */
import {
  Menu,
  MenuItem,
  Submenu,
  PredefinedMenuItem,
} from '@tauri-apps/api/menu'
import { check } from '@tauri-apps/plugin-updater'
import i18n from '@/i18n/config'
import { logger } from '@/lib/logger'
import { notifications } from '@/lib/notifications'
import {
  getAllCommands,
  executeCommand,
  getCommandLabel,
} from '@/lib/commands/registry'
import { commandContext } from '@/hooks/use-command-context'
import { useTaskDetailStore } from '@/store/task-detail-store'
import type { AppCommand, CommandContext } from '@/lib/commands/types'

const APP_NAME = 'Taskdn'

// ─────────────────────────────────────────────────────────────────────────────
// Menu Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build and set the application menu with translated labels.
 * This is called on app startup and when language/data changes.
 */
export async function buildAppMenu(): Promise<Menu> {
  const t = i18n.t.bind(i18n)
  const context = commandContext

  try {
    // Get all available commands
    const commands = getAllCommands(context)

    // Build each menu submenu
    const [
      appSubmenu,
      fileSubmenu,
      editSubmenu,
      viewSubmenu,
      goSubmenu,
      windowSubmenu,
      helpSubmenu,
    ] = await Promise.all([
      buildTaskdnMenu(t, context),
      buildFileMenu(t, commands, context),
      buildEditMenu(t, commands, context),
      buildViewMenu(t, commands, context),
      buildGoMenu(t, context),
      buildWindowMenu(t),
      buildHelpMenu(t, commands, context),
    ])

    // Build the complete menu
    const menu = await Menu.new({
      items: [
        appSubmenu,
        fileSubmenu,
        editSubmenu,
        viewSubmenu,
        goSubmenu,
        windowSubmenu,
        helpSubmenu,
      ],
    })

    // Set as the application menu
    await menu.setAsAppMenu()

    logger.info('Application menu built successfully')
    return menu
  } catch (error) {
    logger.error('Failed to build application menu', { error })
    throw error
  }
}

/**
 * Set up a listener to rebuild the menu when the language changes.
 * Returns an unsubscribe function for cleanup.
 */
export function setupMenuLanguageListener(): () => void {
  const handler = async () => {
    logger.info('Language changed, rebuilding menu')
    try {
      await buildAppMenu()
    } catch (error) {
      logger.error('Failed to rebuild menu on language change', { error })
    }
  }
  i18n.on('languageChanged', handler)
  return () => i18n.off('languageChanged', handler)
}

/**
 * Set up a listener to rebuild the menu when task selection changes.
 * This updates the enabled/disabled state of task-specific menu items.
 * Returns an unsubscribe function for cleanup.
 */
export function setupMenuSelectionListener(): () => void {
  // Track current selection to avoid unnecessary rebuilds
  let lastTaskId: string | null = null

  const unsubscribe = useTaskDetailStore.subscribe(state => {
    // Only rebuild if selection actually changed
    if (state.openTaskId !== lastTaskId) {
      lastTaskId = state.openTaskId
      buildAppMenu().catch(error => {
        logger.error('Failed to rebuild menu on selection change', { error })
      })
    }
  })

  return unsubscribe
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual Menu Builders
// ─────────────────────────────────────────────────────────────────────────────

type TFunc = typeof i18n.t

/**
 * Helper to create a menu item from a command.
 */
async function createCommandMenuItem(
  cmd: AppCommand,
  t: TFunc,
  context: CommandContext
): Promise<MenuItem> {
  const label = getCommandLabel(cmd, t)
  const enabled = !cmd.isAvailable || cmd.isAvailable(context)

  return MenuItem.new({
    id: cmd.id,
    text: label,
    accelerator: cmd.shortcut,
    enabled,
    action: async () => {
      const result = await executeCommand(cmd.id, context)
      if (!result.success) {
        logger.error('Menu command failed', {
          commandId: cmd.id,
          error: result.error,
        })
      }
    },
  })
}

/**
 * Filter commands by appMenu value.
 */
function getCommandsForMenu(
  commands: AppCommand[],
  menuName: string
): AppCommand[] {
  return commands.filter(cmd => cmd.surfaces?.appMenu === menuName)
}

/**
 * Build the Taskdn (app) menu.
 */
async function buildTaskdnMenu(
  t: TFunc,
  context: CommandContext
): Promise<Submenu> {
  // Get commands marked for Taskdn menu
  const commands = getAllCommands(context)
  const preferencesCmd = commands.find(cmd => cmd.id === 'open-preferences')

  const items: (MenuItem | PredefinedMenuItem)[] = [
    await MenuItem.new({
      id: 'about',
      text: t('menu.about', { appName: APP_NAME }),
      action: handleAbout,
    }),
    await PredefinedMenuItem.new({ item: 'Separator' }),
    await MenuItem.new({
      id: 'check-updates',
      text: t('menu.checkForUpdates'),
      action: handleCheckForUpdates,
    }),
    await PredefinedMenuItem.new({ item: 'Separator' }),
  ]

  // Add Preferences command if found
  if (preferencesCmd) {
    items.push(await createCommandMenuItem(preferencesCmd, t, context))
  } else {
    // Fallback if command not found
    items.push(
      await MenuItem.new({
        id: 'preferences',
        text: t('menu.preferences'),
        accelerator: 'CmdOrCtrl+,',
        action: () => context.openPreferences(),
      })
    )
  }

  items.push(
    await PredefinedMenuItem.new({ item: 'Separator' }),
    await PredefinedMenuItem.new({
      item: 'Hide',
      text: t('menu.hide', { appName: APP_NAME }),
    }),
    await PredefinedMenuItem.new({
      item: 'HideOthers',
      text: t('menu.hideOthers'),
    }),
    await PredefinedMenuItem.new({
      item: 'ShowAll',
      text: t('menu.showAll'),
    }),
    await PredefinedMenuItem.new({ item: 'Separator' }),
    await PredefinedMenuItem.new({
      item: 'Quit',
      text: t('menu.quit', { appName: APP_NAME }),
    })
  )

  return Submenu.new({
    text: APP_NAME,
    items,
  })
}

/**
 * Build the File menu.
 */
async function buildFileMenu(
  t: TFunc,
  commands: AppCommand[],
  context: CommandContext
): Promise<Submenu> {
  const fileCommands = getCommandsForMenu(commands, 'File')
  const hasEntitySelected = context.selectedTaskId !== null

  // Get specific commands
  const createTaskCmd = fileCommands.find(cmd => cmd.id === 'create-task')
  const revealCmd = commands.find(cmd => cmd.id === 'reveal-in-finder')
  const openDefaultCmd = commands.find(cmd => cmd.id === 'open-in-default-app')
  const openObsidianCmd = commands.find(cmd => cmd.id === 'open-in-obsidian')

  const items: (MenuItem | PredefinedMenuItem)[] = []

  // New Task
  if (createTaskCmd) {
    items.push(await createCommandMenuItem(createTaskCmd, t, context))
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // File operations (enabled when entity selected)
  if (revealCmd) {
    items.push(
      await MenuItem.new({
        id: revealCmd.id,
        text: getCommandLabel(revealCmd, t),
        enabled: hasEntitySelected,
        action: async () => {
          await executeCommand(revealCmd.id, context)
        },
      })
    )
  }

  if (openDefaultCmd) {
    items.push(
      await MenuItem.new({
        id: openDefaultCmd.id,
        text: getCommandLabel(openDefaultCmd, t),
        enabled: hasEntitySelected,
        action: async () => {
          await executeCommand(openDefaultCmd.id, context)
        },
      })
    )
  }

  // Open in Obsidian (only if setting enabled)
  if (openObsidianCmd && context.isObsidianEnabled()) {
    items.push(
      await MenuItem.new({
        id: openObsidianCmd.id,
        text: getCommandLabel(openObsidianCmd, t),
        enabled: hasEntitySelected,
        action: async () => {
          await executeCommand(openObsidianCmd.id, context)
        },
      })
    )
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Close Window
  items.push(
    await PredefinedMenuItem.new({
      item: 'CloseWindow',
      text: t('menu.closeWindow'),
    })
  )

  return Submenu.new({
    text: t('menu.file'),
    items,
  })
}

/**
 * Build the Edit menu.
 */
async function buildEditMenu(
  t: TFunc,
  commands: AppCommand[],
  context: CommandContext
): Promise<Submenu> {
  const hasTaskSelected = context.selectedTaskId !== null

  // Get task-specific commands from Edit menu
  const duplicateCmd = commands.find(cmd => cmd.id === 'duplicate-task')
  const editScheduledCmd = commands.find(
    cmd => cmd.id === 'edit-scheduled-date'
  )
  const setTodayCmd = commands.find(cmd => cmd.id === 'set-scheduled-today')
  const editDueCmd = commands.find(cmd => cmd.id === 'edit-due-date')
  const editDeferCmd = commands.find(cmd => cmd.id === 'edit-defer-date')
  const editStatusCmd = commands.find(cmd => cmd.id === 'edit-status')
  const copyPathCmd = commands.find(cmd => cmd.id === 'copy-file-path')

  const items: (MenuItem | PredefinedMenuItem)[] = [
    // Standard edit operations
    await PredefinedMenuItem.new({ item: 'Undo', text: t('menu.undo') }),
    await PredefinedMenuItem.new({ item: 'Redo', text: t('menu.redo') }),
    await PredefinedMenuItem.new({ item: 'Separator' }),
    await PredefinedMenuItem.new({ item: 'Cut', text: t('menu.cut') }),
    await PredefinedMenuItem.new({ item: 'Copy', text: t('menu.copy') }),
  ]

  // Copy Path (entity-specific)
  if (copyPathCmd) {
    items.push(
      await MenuItem.new({
        id: copyPathCmd.id,
        text: getCommandLabel(copyPathCmd, t),
        accelerator: copyPathCmd.shortcut,
        enabled: hasTaskSelected,
        action: async () => {
          await executeCommand(copyPathCmd.id, context)
        },
      })
    )
  }

  items.push(
    await PredefinedMenuItem.new({ item: 'Paste', text: t('menu.paste') })
  )
  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Duplicate
  if (duplicateCmd) {
    items.push(
      await MenuItem.new({
        id: duplicateCmd.id,
        text: getCommandLabel(duplicateCmd, t),
        accelerator: duplicateCmd.shortcut,
        enabled: hasTaskSelected,
        action: async () => {
          await executeCommand(duplicateCmd.id, context)
        },
      })
    )
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Date editing commands
  const dateCommands = [
    editScheduledCmd,
    setTodayCmd,
    editDueCmd,
    editDeferCmd,
    editStatusCmd,
  ]
  for (const cmd of dateCommands) {
    if (cmd) {
      items.push(
        await MenuItem.new({
          id: cmd.id,
          text: getCommandLabel(cmd, t),
          accelerator: cmd.shortcut,
          enabled: hasTaskSelected,
          action: async () => {
            await executeCommand(cmd.id, context)
          },
        })
      )
    }
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Move commands (future - not implemented yet)
  // These would be: move-task-up, move-task-down, move-task-to-top, move-task-to-bottom

  items.push(
    await PredefinedMenuItem.new({
      item: 'SelectAll',
      text: t('menu.selectAll'),
    })
  )

  return Submenu.new({
    text: t('menu.edit'),
    items,
  })
}

/**
 * Build the View menu.
 */
async function buildViewMenu(
  t: TFunc,
  commands: AppCommand[],
  context: CommandContext
): Promise<Submenu> {
  const viewCommands = getCommandsForMenu(commands, 'View')

  // Sort by ID to ensure consistent order
  const toggleLeftCmd = viewCommands.find(
    cmd => cmd.id === 'toggle-left-sidebar'
  )
  const toggleRightCmd = viewCommands.find(
    cmd => cmd.id === 'toggle-right-sidebar'
  )
  const todayCmd = viewCommands.find(cmd => cmd.id === 'navigate-today')
  const thisWeekCmd = viewCommands.find(cmd => cmd.id === 'navigate-this-week')
  const inboxCmd = viewCommands.find(cmd => cmd.id === 'navigate-inbox')
  const calendarCmd = viewCommands.find(cmd => cmd.id === 'navigate-calendar')
  const noAreaCmd = viewCommands.find(cmd => cmd.id === 'navigate-no-area')
  const collapseCmd = viewCommands.find(cmd => cmd.id === 'collapse-all-areas')
  const expandCmd = viewCommands.find(cmd => cmd.id === 'expand-all-areas')
  const fullscreenCmd = viewCommands.find(cmd => cmd.id === 'toggle-fullscreen')
  const paletteCmd = viewCommands.find(
    cmd => cmd.id === 'toggle-command-palette'
  )

  const items: (MenuItem | PredefinedMenuItem)[] = []

  // Sidebar toggles
  if (toggleLeftCmd) {
    items.push(await createCommandMenuItem(toggleLeftCmd, t, context))
  }
  if (toggleRightCmd) {
    items.push(await createCommandMenuItem(toggleRightCmd, t, context))
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Navigation views
  const navCommands = [todayCmd, thisWeekCmd, inboxCmd, calendarCmd, noAreaCmd]
  for (const cmd of navCommands) {
    if (cmd) {
      items.push(await createCommandMenuItem(cmd, t, context))
    }
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Area collapse/expand
  if (collapseCmd) {
    items.push(await createCommandMenuItem(collapseCmd, t, context))
  }
  if (expandCmd) {
    items.push(await createCommandMenuItem(expandCmd, t, context))
  }

  items.push(await PredefinedMenuItem.new({ item: 'Separator' }))

  // Fullscreen and Command Palette
  if (fullscreenCmd) {
    items.push(await createCommandMenuItem(fullscreenCmd, t, context))
  }
  if (paletteCmd) {
    items.push(await createCommandMenuItem(paletteCmd, t, context))
  }

  return Submenu.new({
    text: t('menu.view'),
    items,
  })
}

/**
 * Build the Go menu with dynamic Areas and Projects submenus.
 */
async function buildGoMenu(
  t: TFunc,
  context: CommandContext
): Promise<Submenu> {
  const areas = context.getAreas().filter(a => a.status !== 'archived')
  const projects = context
    .getProjects()
    .filter(p => p.status !== 'done' && p.status !== 'paused')

  // Build Areas submenu
  const areaItems = await Promise.all(
    areas.map(area =>
      MenuItem.new({
        id: `navigate-area-${area.id}`,
        text: area.title,
        action: async () => {
          await executeCommand(`navigate-area-${area.id}`, context)
        },
      })
    )
  )

  const areasSubmenu = await Submenu.new({
    text: t('menu.go.areas'),
    items:
      areaItems.length > 0
        ? areaItems
        : [
            await MenuItem.new({
              id: 'no-areas',
              text: t('menu.go.noAreas'),
              enabled: false,
            }),
          ],
  })

  // Build Projects submenu
  const projectItems = await Promise.all(
    projects.map(project =>
      MenuItem.new({
        id: `navigate-project-${project.id}`,
        text: project.title,
        action: async () => {
          await executeCommand(`navigate-project-${project.id}`, context)
        },
      })
    )
  )

  const projectsSubmenu = await Submenu.new({
    text: t('menu.go.projects'),
    items:
      projectItems.length > 0
        ? projectItems
        : [
            await MenuItem.new({
              id: 'no-projects',
              text: t('menu.go.noProjects'),
              enabled: false,
            }),
          ],
  })

  return Submenu.new({
    text: t('menu.go'),
    items: [areasSubmenu, projectsSubmenu],
  })
}

/**
 * Build the Window menu.
 */
async function buildWindowMenu(t: TFunc): Promise<Submenu> {
  return Submenu.new({
    text: t('menu.window'),
    items: [
      await PredefinedMenuItem.new({
        item: 'Minimize',
        text: t('menu.minimize'),
      }),
      await MenuItem.new({
        id: 'zoom',
        text: t('menu.zoom'),
        action: async () => {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const window = getCurrentWindow()
          await window.toggleMaximize()
        },
      }),
      await PredefinedMenuItem.new({ item: 'Separator' }),
      await MenuItem.new({
        id: 'bring-all-to-front',
        text: t('menu.bringAllToFront'),
        action: async () => {
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          const window = getCurrentWindow()
          await window.setFocus()
        },
      }),
    ],
  })
}

/**
 * Build the Help menu.
 */
async function buildHelpMenu(
  t: TFunc,
  commands: AppCommand[],
  context: CommandContext
): Promise<Submenu> {
  const helpCmd = commands.find(cmd => cmd.id === 'open-help')

  const items: MenuItem[] = []

  if (helpCmd) {
    items.push(await createCommandMenuItem(helpCmd, t, context))
  } else {
    // Fallback
    items.push(
      await MenuItem.new({
        id: 'help',
        text: t('menu.help'),
        action: () => {
          context.openExternalUrl('https://tdn.danny.is/desktop/overview/')
        },
      })
    )
  }

  return Submenu.new({
    text: t('menu.helpMenu'),
    items,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu Action Handlers (for items not from command registry)
// ─────────────────────────────────────────────────────────────────────────────

function handleAbout(): void {
  logger.info('About menu item clicked')
  alert(
    `${APP_NAME}\n\nVersion: ${__APP_VERSION__}\n\nBuilt with Tauri v2 + React + TypeScript`
  )
}

async function handleCheckForUpdates(): Promise<void> {
  logger.info('Check for Updates menu item clicked')
  try {
    const update = await check()
    if (update) {
      notifications.info(
        'Update Available',
        `Version ${update.version} is available`
      )
    } else {
      notifications.success('Up to Date', 'You are running the latest version')
    }
  } catch (error) {
    logger.error('Update check failed', { error })
    notifications.error('Update Check Failed', 'Could not check for updates')
  }
}
