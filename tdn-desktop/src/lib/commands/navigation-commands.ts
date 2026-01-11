import {
  Settings,
  Sun,
  Calendar,
  Inbox,
  CalendarDays,
  FolderX,
} from 'lucide-react'
import type { AppCommand } from './types'

export const navigationCommands: AppCommand[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // View Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'navigate-today',
    labelKey: 'commands.navigateToday.label',
    descriptionKey: 'commands.navigateToday.description',
    icon: Sun,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+3',
    keywords: ['today', 'view', 'go', 'navigate'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.navigateToView('today')
    },
  },

  {
    id: 'navigate-this-week',
    labelKey: 'commands.navigateThisWeek.label',
    descriptionKey: 'commands.navigateThisWeek.description',
    icon: CalendarDays,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+4',
    keywords: ['week', 'this week', 'view', 'go', 'navigate'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.navigateToView('this-week')
    },
  },

  {
    id: 'navigate-inbox',
    labelKey: 'commands.navigateInbox.label',
    descriptionKey: 'commands.navigateInbox.description',
    icon: Inbox,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+5',
    keywords: ['inbox', 'view', 'go', 'navigate'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.navigateToView('inbox')
    },
  },

  {
    id: 'navigate-calendar',
    labelKey: 'commands.navigateCalendar.label',
    descriptionKey: 'commands.navigateCalendar.description',
    icon: Calendar,
    group: 'navigation',
    shortcut: 'CmdOrCtrl+6',
    keywords: ['calendar', 'view', 'go', 'navigate'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.navigateToView('calendar')
    },
  },

  {
    id: 'navigate-no-area',
    labelKey: 'commands.navigateNoArea.label',
    descriptionKey: 'commands.navigateNoArea.description',
    icon: FolderX,
    group: 'navigation',
    keywords: ['no area', 'orphan', 'unassigned', 'view', 'go', 'navigate'],
    surfaces: { commandPalette: true, appMenu: 'View' },

    execute: context => {
      context.navigateToNoArea()
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Settings
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'open-preferences',
    labelKey: 'commands.openPreferences.label',
    descriptionKey: 'commands.openPreferences.description',
    icon: Settings,
    group: 'settings',
    shortcut: 'CmdOrCtrl+,',
    keywords: ['preferences', 'settings', 'config', 'options'],
    surfaces: { commandPalette: true, appMenu: 'Taskdn' },

    execute: context => {
      context.openPreferences()
    },
  },
]
