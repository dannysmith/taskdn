/**
 * Task-specific commands - available when a task is selected.
 *
 * These commands enable keyboard-driven task management. They all share
 * the same availability check: task must be selected AND focus must NOT
 * be in an editable element (to preserve standard ⌘C/⌘V in inputs).
 */
import {
  Calendar,
  CalendarArrowUp,
  Copy,
  CopyPlus,
  Flag,
  Snowflake,
  CircleDot,
  Trash2,
} from 'lucide-react'
import i18n from '@/i18n/config'
import { commands } from '@/lib/tauri-bindings'
import { logger } from '@/lib/logger'
import { stripWikilink } from '@/lib/wikilink'
import { markMutationStart, markMutationComplete } from '@/services/vault'
import type { AppCommand } from './types'
import { isTaskCommandAvailable, getTargetTask } from './types'

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
      const task = getTargetTask(context)
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

  {
    id: 'edit-scheduled-date',
    labelKey: 'commands.editScheduledDate.label',
    descriptionKey: 'commands.editScheduledDate.description',
    icon: Calendar,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+D',
    keywords: ['schedule', 'date', 'when', 'edit'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: context => {
      context.focusField('scheduled')
    },
  },

  {
    id: 'edit-due-date',
    labelKey: 'commands.editDueDate.label',
    descriptionKey: 'commands.editDueDate.description',
    icon: Flag,
    group: 'tasks',
    shortcut: 'Shift+CmdOrCtrl+D',
    keywords: ['due', 'deadline', 'date', 'edit'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: context => {
      context.focusField('due')
    },
  },

  {
    id: 'edit-defer-date',
    labelKey: 'commands.editDeferDate.label',
    descriptionKey: 'commands.editDeferDate.description',
    icon: Snowflake,
    group: 'tasks',
    shortcut: 'Ctrl+Shift+CmdOrCtrl+D',
    keywords: ['defer', 'delay', 'snooze', 'date', 'edit'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: context => {
      context.focusField('defer')
    },
  },

  {
    id: 'edit-status',
    labelKey: 'commands.editStatus.label',
    descriptionKey: 'commands.editStatus.description',
    icon: CircleDot,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+S',
    keywords: ['status', 'state', 'edit'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    isAvailable: isTaskCommandAvailable,

    execute: context => {
      context.focusField('status')
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
      const task = getTargetTask(context)
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
    shortcut: "CmdOrCtrl+'",
    keywords: ['duplicate', 'copy', 'clone'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    supportsMultiSelect: true,
    isAvailable: isTaskCommandAvailable,

    execute: async context => {
      const task = getTargetTask(context)
      if (!task) return

      // Prevent file watcher from invalidating cache during our mutation
      markMutationStart()

      // Create a new task with the same data (excluding id, path, timestamps)
      const result = await commands.createTask({
        title: task.title,
        status: task.status,
        projectId: task.project ? stripWikilink(task.project) : null,
        areaId: task.area ? stripWikilink(task.area) : null,
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

  {
    id: 'delete-task',
    labelKey: 'commands.deleteTask.label',
    descriptionKey: 'commands.deleteTask.description',
    icon: Trash2,
    group: 'tasks',
    shortcut: 'CmdOrCtrl+Backspace',
    keywords: ['delete', 'trash', 'remove'],
    surfaces: { commandPalette: true, contextMenu: ['task'], appMenu: 'Edit' },
    supportsMultiSelect: true,
    isAvailable: isTaskCommandAvailable,

    execute: async context => {
      const task = getTargetTask(context)
      if (!task) return

      // Check if user prefers permanent deletion
      const permanent = context.isPermanentDeleteEnabled()

      // Prevent file watcher from invalidating cache during our mutation
      markMutationStart()

      const result = await commands.deleteTask(task.id, permanent)

      markMutationComplete()

      if (result.status === 'error') {
        logger.error('Failed to delete task', { error: result.error })
        context.showToast(t('commands.deleteTask.error'), 'error')
        return
      }

      // Remove from TanStack Query cache and close the detail panel
      context.deleteTaskFromCache(task.id)

      context.showToast(t('commands.deleteTask.success'), 'success')
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Bulk Operations
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'move-incomplete-to-today',
    labelKey: 'commands.moveIncompleteToToday.label',
    descriptionKey: 'commands.moveIncompleteToToday.description',
    icon: CalendarArrowUp,
    group: 'tasks',
    keywords: [
      'move',
      'incomplete',
      'overdue',
      'reschedule',
      'today',
      'catch up',
      'past',
    ],
    surfaces: { commandPalette: true, appMenu: 'Edit' },

    execute: async context => {
      const today = getTodayISO()
      const tasks = context.getTasks()

      const overdueTasks = tasks.filter(
        task =>
          task.scheduled &&
          task.scheduled < today &&
          task.status !== 'done' &&
          task.status !== 'dropped'
      )

      if (overdueTasks.length === 0) {
        context.showToast(t('commands.moveIncompleteToToday.noTasks'), 'info')
        return
      }

      markMutationStart()

      let results: Awaited<ReturnType<typeof commands.updateTask>>[]
      try {
        results = await Promise.all(
          overdueTasks.map(task =>
            commands.updateTask({
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
          )
        )
      } finally {
        markMutationComplete()
      }

      let successCount = 0
      for (const [i, task] of overdueTasks.entries()) {
        const result = results[i]
        if (!result) continue
        if (result.status === 'ok') {
          context.updateTaskInCache(task.id, result.data)
          successCount++
        } else {
          logger.error('Failed to reschedule task', {
            taskId: task.id,
            error: result.error,
          })
        }
      }

      if (successCount === 0) {
        context.showToast(t('commands.moveIncompleteToToday.error'), 'error')
      } else {
        context.showToast(
          t('commands.moveIncompleteToToday.success', {
            count: successCount,
          }),
          'success'
        )
      }
    },
  },
]
