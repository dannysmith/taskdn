/**
 * Entity file operation commands - available for tasks, projects, and areas.
 *
 * These commands operate on the context menu target entity (set via setContextMenuTarget).
 * They provide common file operations like reveal in finder, open in apps, and copy to clipboard.
 */
import { FolderOpen, ExternalLink, Copy, Link, FileText } from 'lucide-react'
import { revealItemInDir, openPath, openUrl } from '@tauri-apps/plugin-opener'
import i18n from '@/i18n/config'
import { logger } from '@/lib/logger'
import { getPlatform } from '@/hooks/use-platform'
import { getPlatformStrings } from '@/lib/platform-strings'
import type { AppCommand, CommandContext } from './types'

const t = i18n.t.bind(i18n)

/**
 * Helper to get entity info from context menu target or selected task.
 *
 * Priority:
 * 1. Explicit context menu target (set when right-clicking)
 * 2. Currently selected task (for command palette usage)
 *
 * Returns null if neither is available.
 */
function getTargetEntity(context: CommandContext): {
  path: string
  title: string
  type: 'task' | 'project' | 'area'
} | null {
  // First check explicit context menu target
  const target = context.getContextMenuTarget()
  if (target) {
    return {
      path: target.entity.path,
      title: target.entity.title,
      type: target.type,
    }
  }

  // Fall back to selected task (for command palette usage)
  const selectedTask = context.getSelectedTask()
  if (selectedTask) {
    return {
      path: selectedTask.path,
      title: selectedTask.title,
      type: 'task',
    }
  }

  return null
}

/**
 * Check if an entity command is available.
 * Entity commands require either:
 * - A context menu target (for context menus)
 * - A selected task (for command palette)
 *
 * Additionally, when using via keyboard/command palette with a task selected,
 * we check that focus is not in an editable element (same as task commands).
 */
function isEntityCommandAvailable(context: CommandContext): boolean {
  // If there's an explicit context menu target, always available
  if (context.getContextMenuTarget() !== null) {
    return true
  }

  // For command palette: check if task is selected and focus is not in input
  if (!context.selectedTaskId) return false

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
 * Build an Obsidian URI to open a file.
 * Format: obsidian://open?path=/absolute/path/to/file.md
 */
function buildObsidianUri(filePath: string): string {
  // URL-encode the path (handles spaces, special chars)
  const encodedPath = encodeURIComponent(filePath)
  return `obsidian://open?path=${encodedPath}`
}

export const entityCommands: AppCommand[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // File Operations
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'reveal-in-finder',
    // Label is set dynamically based on platform
    get labelKey() {
      const platform = getPlatform()
      const strings = getPlatformStrings(platform)
      // Return a special marker that will be replaced with the actual string
      return `_dynamic:${strings.revealInFileManager}`
    },
    descriptionKey: 'commands.revealInFinder.description',
    icon: FolderOpen,
    group: 'file',
    keywords: ['reveal', 'finder', 'explorer', 'show', 'folder', 'directory'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: isEntityCommandAvailable,

    execute: async context => {
      const entity = getTargetEntity(context)
      if (!entity) return

      try {
        await revealItemInDir(entity.path)
      } catch (error) {
        logger.error('Failed to reveal in file manager', { error, path: entity.path })
        context.showToast(t('commands.revealInFinder.error'), 'error')
      }
    },
  },

  {
    id: 'open-in-default-app',
    labelKey: 'commands.openInDefaultApp.label',
    descriptionKey: 'commands.openInDefaultApp.description',
    icon: ExternalLink,
    group: 'file',
    keywords: ['open', 'default', 'app', 'application', 'editor'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: isEntityCommandAvailable,

    execute: async context => {
      const entity = getTargetEntity(context)
      if (!entity) return

      try {
        await openPath(entity.path)
      } catch (error) {
        logger.error('Failed to open in default app', { error, path: entity.path })
        context.showToast(t('commands.openInDefaultApp.error'), 'error')
      }
    },
  },

  {
    id: 'open-in-obsidian',
    labelKey: 'commands.openInObsidian.label',
    descriptionKey: 'commands.openInObsidian.description',
    icon: ExternalLink,
    group: 'file',
    keywords: ['open', 'obsidian', 'vault', 'note'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: context => {
      // Must have a target AND Obsidian features enabled
      return isEntityCommandAvailable(context) && context.isObsidianEnabled()
    },

    execute: async context => {
      const entity = getTargetEntity(context)
      if (!entity) return

      try {
        const obsidianUri = buildObsidianUri(entity.path)
        await openUrl(obsidianUri)
      } catch (error) {
        logger.error('Failed to open in Obsidian', { error, path: entity.path })
        context.showToast(t('commands.openInObsidian.error'), 'error')
      }
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // Clipboard Operations
  // ─────────────────────────────────────────────────────────────────────────────

  {
    id: 'copy-file-path',
    labelKey: 'commands.copyFilePath.label',
    descriptionKey: 'commands.copyFilePath.description',
    icon: Copy,
    group: 'clipboard',
    shortcut: 'Alt+CmdOrCtrl+C',
    keywords: ['copy', 'path', 'file', 'location'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: isEntityCommandAvailable,

    execute: async context => {
      const entity = getTargetEntity(context)
      if (!entity) return

      try {
        await navigator.clipboard.writeText(entity.path)
        context.showToast(t('commands.copyFilePath.success'), 'success')
      } catch (error) {
        logger.error('Failed to copy file path', { error })
        context.showToast(t('commands.copyFilePath.error'), 'error')
      }
    },
  },

  {
    id: 'copy-local-url',
    labelKey: 'commands.copyLocalUrl.label',
    descriptionKey: 'commands.copyLocalUrl.description',
    icon: Link,
    group: 'clipboard',
    keywords: ['copy', 'url', 'link', 'local', 'taskdn'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: isEntityCommandAvailable,

    execute: async context => {
      // Get target from context menu or selected task
      const explicitTarget = context.getContextMenuTarget()
      const selectedTask = context.getSelectedTask()

      let type: 'task' | 'project' | 'area'
      let id: string

      if (explicitTarget) {
        type = explicitTarget.type
        id = explicitTarget.entity.id
      } else if (selectedTask) {
        type = 'task'
        id = selectedTask.id
      } else {
        return
      }

      // Build taskdn:// URL format: taskdn://{type}/{id}
      const localUrl = `taskdn://${type}/${encodeURIComponent(id)}`

      try {
        await navigator.clipboard.writeText(localUrl)
        context.showToast(t('commands.copyLocalUrl.success'), 'success')
      } catch (error) {
        logger.error('Failed to copy local URL', { error })
        context.showToast(t('commands.copyLocalUrl.error'), 'error')
      }
    },
  },

  {
    id: 'copy-as-markdown',
    labelKey: 'commands.copyAsMarkdown.label',
    descriptionKey: 'commands.copyAsMarkdown.description',
    icon: FileText,
    group: 'clipboard',
    keywords: ['copy', 'markdown', 'md', 'link', 'reference'],
    surfaces: {
      commandPalette: true,
      contextMenu: ['task', 'project', 'area'],
    },
    isAvailable: isEntityCommandAvailable,

    execute: async context => {
      const entity = getTargetEntity(context)
      if (!entity) return

      // Format as Obsidian-style wikilink: [[Title]]
      const markdown = `[[${entity.title}]]`

      try {
        await navigator.clipboard.writeText(markdown)
        context.showToast(t('commands.copyAsMarkdown.success'), 'success')
      } catch (error) {
        logger.error('Failed to copy as markdown', { error })
        context.showToast(t('commands.copyAsMarkdown.error'), 'error')
      }
    },
  },
]
