import {
  Command,
  Plus,
  Maximize,
  HelpCircle,
  Sidebar,
  PanelRight,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useUIStore } from '@/store/ui-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { AppCommand } from './types'

const HELP_URL = 'https://tdn.danny.is/desktop/overview/'

export const appCommands: AppCommand[] = [
  {
    id: 'toggle-command-palette',
    labelKey: 'commands.toggleCommandPalette.label',
    descriptionKey: 'commands.toggleCommandPalette.description',
    icon: Command,
    group: 'app',
    shortcut: 'CmdOrCtrl+K',
    keywords: ['command', 'palette', 'search', 'quick', 'actions'],
    surfaces: { commandPalette: false, appMenu: 'View' }, // Hidden from palette (it IS the palette)

    execute: () => {
      useUIStore.getState().toggleCommandPalette()
    },
  },

  {
    id: 'create-task',
    labelKey: 'commands.createTask.label',
    descriptionKey: 'commands.createTask.description',
    icon: Plus,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+N',
    keywords: ['task', 'new', 'create', 'add'],
    surfaces: { commandPalette: true, appMenu: 'File' },

    execute: async () => {
      // Route through the task creation store to preserve the two-layer handler system
      await useTaskCreationStore.getState().triggerCreate()
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // View Commands (UI state toggles)
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'toggle-left-sidebar',
    labelKey: 'commands.toggleLeftSidebar.label',
    descriptionKey: 'commands.toggleLeftSidebar.description',
    icon: Sidebar,
    group: 'view',
    shortcut: 'CmdOrCtrl+1',
    keywords: ['sidebar', 'left', 'panel', 'toggle', 'show', 'hide'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: () => {
      useUIStore.getState().toggleLeftSidebar()
    },
  },

  {
    id: 'toggle-right-sidebar',
    labelKey: 'commands.toggleRightSidebar.label',
    descriptionKey: 'commands.toggleRightSidebar.description',
    icon: PanelRight,
    group: 'view',
    shortcut: 'CmdOrCtrl+2',
    keywords: ['sidebar', 'right', 'panel', 'toggle', 'show', 'hide'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: () => {
      useUIStore.getState().toggleRightSidebar()
    },
  },

  {
    id: 'collapse-all-areas',
    labelKey: 'commands.collapseAllAreas.label',
    descriptionKey: 'commands.collapseAllAreas.description',
    icon: ChevronsDownUp,
    group: 'view',
    keywords: ['collapse', 'areas', 'sidebar', 'fold'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.collapseAllAreas()
    },
  },

  {
    id: 'expand-all-areas',
    labelKey: 'commands.expandAllAreas.label',
    descriptionKey: 'commands.expandAllAreas.description',
    icon: ChevronsUpDown,
    group: 'view',
    keywords: ['expand', 'areas', 'sidebar', 'unfold'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.expandAllAreas()
    },
  },

  {
    id: 'toggle-fullscreen',
    labelKey: 'commands.toggleFullscreen.label',
    descriptionKey: 'commands.toggleFullscreen.description',
    icon: Maximize,
    group: 'view',
    shortcut: 'Ctrl+CmdOrCtrl+F',
    keywords: ['fullscreen', 'full', 'screen', 'maximize', 'window'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: async () => {
      const window = getCurrentWindow()
      const isFullscreen = await window.isFullscreen()
      await window.setFullscreen(!isFullscreen)
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Help
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'open-help',
    labelKey: 'commands.openHelp.label',
    descriptionKey: 'commands.openHelp.description',
    icon: HelpCircle,
    group: 'help',
    keywords: ['help', 'documentation', 'docs', 'guide', 'manual'],
    surfaces: { commandPalette: true, appMenu: 'Help' },

    execute: context => {
      context.openExternalUrl(HELP_URL)
    },
  },
]
