import { Sidebar, PanelRight, Settings } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import type { AppCommand } from './types'

export const navigationCommands: AppCommand[] = [
  {
    id: 'toggle-left-sidebar',
    labelKey: 'commands.toggleLeftSidebar.label',
    descriptionKey: 'commands.toggleLeftSidebar.description',
    icon: Sidebar,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+1',
    keywords: ['sidebar', 'left', 'panel', 'toggle', 'show', 'hide'],

    execute: () => {
      useUIStore.getState().toggleLeftSidebar()
    },
  },

  {
    id: 'toggle-right-sidebar',
    labelKey: 'commands.toggleRightSidebar.label',
    descriptionKey: 'commands.toggleRightSidebar.description',
    icon: PanelRight,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+2',
    keywords: ['sidebar', 'right', 'panel', 'toggle', 'show', 'hide'],

    execute: () => {
      useUIStore.getState().toggleRightSidebar()
    },
  },

  {
    id: 'open-preferences',
    labelKey: 'commands.openPreferences.label',
    descriptionKey: 'commands.openPreferences.description',
    icon: Settings,
    group: 'settings',
    shortcut: 'CmdOrCtrl+,',
    keywords: ['preferences', 'settings', 'config', 'options'],

    execute: context => {
      context.openPreferences()
    },
  },
]
