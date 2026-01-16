/**
 * Vault initialization and event handling.
 */

import { useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { logger } from '@/lib/logger'
import { queryClient } from '@/lib/query-client'
import { commands, type AppPreferences } from '@/lib/tauri-bindings'
import { useNavigationStore } from '@/store/navigation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { vaultQueryKeys } from './keys'
import {
  handleVaultError,
  isRecentMutation,
  getTimeSinceLastMutation,
} from './utils'

// =============================================================================
// Vault Event Handling
// =============================================================================

/**
 * Hook to initialize the vault and set up event listeners.
 * Should be called once at the app root level.
 */
export function useVaultInitialization() {
  const queryClient = useQueryClient()

  // Set up vault-changed event listener
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      unlisten = await listen('vault-changed', () => {
        // Skip if we just did a mutation (our own write triggered this)
        if (isRecentMutation()) {
          logger.debug('Ignoring vault-changed event (recent mutation)', {
            timeSinceMutation: getTimeSinceLastMutation(),
          })
          // Still refresh the Rust index, but don't invalidate React Query cache
          commands.refreshVault().catch(err => {
            logger.error('Failed to refresh vault after recent mutation', {
              error: err,
            })
          })
          return
        }

        logger.info(
          'Vault changed event received (external), refreshing queries'
        )

        // Refresh the vault data from disk
        commands.refreshVault().then(result => {
          if (result.status === 'error') {
            logger.error('Failed to refresh vault', { error: result.error })
          }
        })

        // Invalidate all vault queries to trigger refetches
        queryClient.invalidateQueries({ queryKey: vaultQueryKeys.all })
      })
    }

    setupListener()

    return () => {
      unlisten?.()
    }
  }, [queryClient])
}

// =============================================================================
// Vault Initialization Functions
// =============================================================================

/**
 * Initialize the vault with the given directories.
 * Returns a promise that resolves when initialization is complete.
 */
export async function initializeVault(
  tasksDir: string,
  projectsDir: string,
  areasDir: string,
  ignore: string[] | null
): Promise<void> {
  logger.info('Initializing vault', { tasksDir, projectsDir, areasDir })

  const result = await commands.initVault(
    tasksDir,
    projectsDir,
    areasDir,
    ignore
  )

  if (result.status === 'error') {
    throw new Error(handleVaultError(result.error, 'Initializing vault'))
  }

  logger.info('Vault initialized successfully')
}

/**
 * Reinitialize the vault with new configuration.
 * Clears all session state and reloads data - equivalent to a fresh app start.
 *
 * Call this when vault directory settings change in preferences.
 */
export async function reinitializeVault(
  tasksDir: string,
  projectsDir: string,
  areasDir: string,
  ignore: string[] | null
): Promise<void> {
  logger.info('Reinitializing vault with new configuration', {
    tasksDir,
    projectsDir,
    areasDir,
  })

  // 1. Clear ALL session state - equivalent to fresh app start
  // This prevents any stale IDs or cached data from causing issues
  useDisplayOrderStore.getState().resetAllOrder()
  useTaskDetailStore.getState().closeTask()
  useNavigationStore.getState().resetNavigation()
  queryClient.clear()

  // 2. Initialize vault in Rust (rescans directories, creates new file watchers)
  const result = await commands.initVault(
    tasksDir,
    projectsDir,
    areasDir,
    ignore
  )

  if (result.status === 'error') {
    throw new Error(handleVaultError(result.error, 'Reinitializing vault'))
  }

  // Components will refetch data naturally when they render

  logger.info('Vault reinitialized successfully')
}

// =============================================================================
// Vault Configuration Utilities
// =============================================================================

/**
 * Check if vault-related preferences have changed.
 */
export function vaultConfigChanged(
  oldPrefs: AppPreferences | undefined,
  newPrefs: AppPreferences
): boolean {
  if (!oldPrefs) return true

  return (
    oldPrefs.tasksDir !== newPrefs.tasksDir ||
    oldPrefs.areasDir !== newPrefs.areasDir ||
    oldPrefs.projectsDir !== newPrefs.projectsDir ||
    JSON.stringify(oldPrefs.ignore) !== JSON.stringify(newPrefs.ignore)
  )
}

/**
 * Check if the vault is configured.
 */
export async function isVaultConfigured(): Promise<boolean> {
  return commands.isVaultConfigured()
}
