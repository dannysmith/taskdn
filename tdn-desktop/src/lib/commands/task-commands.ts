/**
 * Task-specific commands - available when a task is selected.
 *
 * These commands enable keyboard-driven task management. They all share
 * the same availability check: task must be selected AND focus must NOT
 * be in an editable element (to preserve standard ⌘C/⌘V in inputs).
 */
import { Calendar, Copy, CopyPlus } from 'lucide-react'
import i18n from '@/i18n/config'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { markMutationStart, markMutationComplete } from '@/services/vault'
import type { AppCommand } from './types'
import { isTaskCommandAvailable } from './types'

const t = i18n.t.bind(i18n)

/**
 * Gets today's date in ISO format (YYYY-MM-DD).
 */
function getTodayISO(): string {
  const iso = new Date().toISOString()
  return iso.slice(0, 10) // YYYY-MM-DD is always first 10 characters
}

export const taskCommands: AppCommand[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // Date Commands
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'set-scheduled-today',
    labelKey: 'commands.setScheduledToday.label',
    descriptionKey: 'commands.setScheduledToday.description',
    icon: Calendar,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+T',
    keywords: ['schedule', 'today', 'date', 'when'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: async context => {
      const task = context.getSelectedTask()
      if (!task) return

      const today = getTodayISO()

      // Prevent file watcher from invalidating cache during our mutation
      markMutationStart()

      const result = await commands.updateTask({
        id: task.id,
        title: null,
        status: null,
        project: null,
        area: null,
        scheduled: today,
        due: null,
        deferUntil: null,
        body: null,
      })

      markMutationComplete()

      if (result.status === 'error') {
        logger.error('Failed to set scheduled date', { error: result.error })
        context.showToast(t('commands.setScheduledToday.error'), 'error')
        return
      }

      // Update TanStack Query cache with the returned task data
      context.updateTaskInCache(task.id, result.data)

      context.showToast(t('commands.setScheduledToday.success'), 'success')
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Clipboard Commands
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'copy-task-title',
    labelKey: 'commands.copyTaskTitle.label',
    descriptionKey: 'commands.copyTaskTitle.description',
    icon: Copy,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+C',
    keywords: ['copy', 'title', 'clipboard'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: async context => {
      const task = context.getSelectedTask()
      if (!task) return

      try {
        await navigator.clipboard.writeText(task.title)
        context.showToast(t('commands.copyTaskTitle.success'), 'success')
      } catch (error) {
        logger.error('Failed to copy task title', { error })
        context.showToast(t('commands.copyTaskTitle.error'), 'error')
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Task Operations
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'duplicate-task',
    labelKey: 'commands.duplicateTask.label',
    descriptionKey: 'commands.duplicateTask.description',
    icon: CopyPlus,
    group: 'tasks',
    shortcut: 'Shift+CmdOrCtrl+D',
    keywords: ['duplicate', 'copy', 'clone'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    supportsMultiSelect: true,
    isAvailable: isTaskCommandAvailable,

    execute: async context => {
      const task = context.getSelectedTask()
      if (!task) return

      // Prevent file watcher from invalidating cache during our mutation
      markMutationStart()

      // Create a new task with the same data (excluding id, path, timestamps)
      const result = await commands.createTask({
        title: task.title,
        status: task.status,
        projectId: task.project ? extractIdFromWikilink(task.project) : null,
        areaId: task.area ? extractIdFromWikilink(task.area) : null,
        scheduled: task.scheduled,
        due: task.due,
        deferUntil: task.deferUntil,
      })

      markMutationComplete()

      if (result.status === 'error') {
        logger.error('Failed to duplicate task', { error: result.error })
        context.showToast(t('commands.duplicateTask.error'), 'error')
        return
      }

      // Add the new task to TanStack Query cache
      context.addTaskToCache(result.data)

      // Open the new task in the detail panel
      context.openTask(result.data.id)
      context.showToast(t('commands.duplicateTask.success'), 'success')
    },
  },
]

/**
 * Extracts the ID from a wikilink format string.
 * e.g., "[[Work]]" -> "Work", "[[My Project]]" -> "My Project"
 */
function extractIdFromWikilink(wikilink: string): string {
  const match = wikilink.match(/^\[\[(.+)\]\]$/)
  return match?.[1] ?? wikilink
}
