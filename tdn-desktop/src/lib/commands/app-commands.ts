import { Command, Plus } from 'lucide-react'
import { useUIStore } from '@/store/ui-store'
import { useTaskCreationStore } from '@/store/task-creation-store'
import type { AppCommand } from './types'

export const appCommands: AppCommand[] = [
  {
    id: 'toggle-command-palette',
    labelKey: 'commands.toggleCommandPalette.label',
    descriptionKey: 'commands.toggleCommandPalette.description',
    icon: Command,
    group: 'app',
    shortcut: 'CmdOrCtrl+K',
    keywords: ['command', 'palette', 'search', 'quick', 'actions'],

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

    execute: async () => {
      // Route through the task creation store to preserve the two-layer handler system
      await useTaskCreationStore.getState().triggerCreate()
    },
  },
]
