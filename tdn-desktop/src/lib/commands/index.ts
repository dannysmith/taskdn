// Command system exports
export * from './registry'
export * from '../../hooks/use-command-context'
import { appCommands } from './app-commands'
import { navigationCommands } from './navigation-commands'
import { windowCommands } from './window-commands'
import { taskCommands } from './task-commands'
import { registerCommands } from './registry'
import { logger } from '@/lib/logger'

/**
 * Initialize the command system by registering all commands.
 * This should be called once during app initialization.
 */
export function initializeCommandSystem(): void {
  registerCommands(appCommands)
  registerCommands(navigationCommands)
  registerCommands(windowCommands)
  registerCommands(taskCommands)

  if (import.meta.env.DEV) {
    logger.debug('Command system initialized')
  }
}

export { appCommands, navigationCommands, windowCommands, taskCommands }
