import { Folder, FolderKanban } from 'lucide-react'
import type { TFunction } from 'i18next'
import type { AppCommand, CommandContext } from './types'
import { filterActiveAreas, filterActiveProjects } from '@/lib/entity-filters'

const commandRegistry = new Map<string, AppCommand>()

export function registerCommands(commands: AppCommand[]): void {
  commands.forEach(cmd => commandRegistry.set(cmd.id, cmd))
}

/**
 * Clear all registered commands. Used for test isolation.
 */
export function clearCommandRegistry(): void {
  commandRegistry.clear()
}

/**
 * Generate dynamic navigation commands for areas and projects.
 * These are created on-the-fly based on current vault data.
 */
function getDynamicNavigationCommands(context: CommandContext): AppCommand[] {
  const areas = context.getAreas()
  const projects = context.getProjects()

  // Filter to active entities using shared filter functions
  const activeAreas = filterActiveAreas(areas)
  const activeProjects = filterActiveProjects(projects)

  const areaCommands: AppCommand[] = activeAreas.map(area => ({
    id: `navigate-area-${area.id}`,
    // Use a special prefix for dynamic labels that will be handled differently
    labelKey: `_dynamic:${area.title}`,
    icon: Folder,
    group: 'areas',
    keywords: ['area', 'navigate', 'go', area.title.toLowerCase()],
    surfaces: { commandPalette: true },

    execute: () => {
      context.navigateToArea(area.id)
    },
  }))

  const projectCommands: AppCommand[] = activeProjects.map(project => ({
    id: `navigate-project-${project.id}`,
    labelKey: `_dynamic:${project.title}`,
    icon: FolderKanban,
    group: 'projects',
    keywords: ['project', 'navigate', 'go', project.title.toLowerCase()],
    surfaces: { commandPalette: true },

    execute: () => {
      context.navigateToProject(project.id)
    },
  }))

  return [...areaCommands, ...projectCommands]
}

export function getAllCommands(
  context: CommandContext,
  searchValue = '',
  t?: TFunction
): AppCommand[] {
  // Combine static and dynamic commands
  const staticCommands = Array.from(commandRegistry.values())
  const dynamicCommands = getDynamicNavigationCommands(context)
  const allCommands = [...staticCommands, ...dynamicCommands].filter(
    command => !command.isAvailable || command.isAvailable(context)
  )

  if (searchValue.trim() && t) {
    const search = searchValue.toLowerCase()
    return allCommands.filter(cmd => {
      // Handle dynamic labels (prefixed with _dynamic:)
      const label = cmd.labelKey.startsWith('_dynamic:')
        ? cmd.labelKey.slice(9).toLowerCase()
        : t(cmd.labelKey).toLowerCase()
      const description = cmd.descriptionKey
        ? t(cmd.descriptionKey).toLowerCase()
        : ''
      const keywords = cmd.keywords?.join(' ').toLowerCase() ?? ''
      return (
        label.includes(search) ||
        description.includes(search) ||
        keywords.includes(search)
      )
    })
  }

  return allCommands
}

/**
 * Helper to get the display label for a command.
 * Handles both i18n keys and dynamic labels.
 */
export function getCommandLabel(cmd: AppCommand, t: TFunction): string {
  if (cmd.labelKey.startsWith('_dynamic:')) {
    return cmd.labelKey.slice(9)
  }
  return t(cmd.labelKey)
}
export async function executeCommand(
  commandId: string,
  context: CommandContext
): Promise<{ success: boolean; error?: string }> {
  try {
    // First check static registry
    let command: AppCommand | undefined = commandRegistry.get(commandId)

    // If not found, check dynamic commands (areas/projects)
    if (!command) {
      const dynamicCommands = getDynamicNavigationCommands(context)
      command = dynamicCommands.find(cmd => cmd.id === commandId)
    }

    if (!command) {
      return {
        success: false,
        error: `Command '${commandId}' not found`,
      }
    }

    if (command.isAvailable && !command.isAvailable(context)) {
      return {
        success: false,
        error: `Command '${commandId}' is not available`,
      }
    }

    await command.execute(context)

    return { success: true }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      error: `Failed to execute command '${commandId}': ${errorMessage}`,
    }
  }
}
