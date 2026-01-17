/**
 * Vault utilities for cache management, error handling, and mutation timing.
 */

import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import { queryClient } from '@/lib/query-client'
import type { Task, VaultError } from '@/lib/tauri-bindings'
import { vaultQueryKeys } from './keys'

// =============================================================================
// Cache Utilities (for use outside React hooks)
// =============================================================================

/**
 * Add a task to the query cache.
 * Used by quick pane to add tasks without going through React hooks.
 */
export function addTaskToCache(task: Task): void {
  // Add to tasks list
  queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks =>
    oldTasks ? [...oldTasks, task] : [task]
  )
  // Set individual task cache
  queryClient.setQueryData(vaultQueryKeys.task(task.id), task)

  logger.debug('Added task to cache', { taskId: task.id })
}

// =============================================================================
// Error Handling
// =============================================================================

export function handleVaultError(error: VaultError, operation: string): string {
  const message = formatVaultError(error)
  logger.error(`Vault ${operation} failed`, { error })
  toast.error(`${operation} failed`, { description: message })
  return message
}

export function formatVaultError(error: VaultError): string {
  switch (error.type) {
    case 'notConfigured':
      return 'Vault not configured. Please set up your task directories in preferences.'
    case 'fileNotFound':
      return `File not found: ${error.path}`
    case 'entityNotFound':
      return `${error.entity_type} not found: ${error.id}`
    case 'readError':
      return `Failed to read file: ${error.message}`
    case 'writeError':
      return `Failed to write file: ${error.message}`
    case 'parseError':
      return `Failed to parse file: ${error.message}`
    case 'validationError':
      return `Validation error (${error.field}): ${error.message}`
    case 'watcherError':
      return `File watcher error: ${error.message}`
    case 'internal':
      return `Internal error: ${error.message}`
    default:
      return 'Unknown error occurred'
  }
}

// =============================================================================
// Mutation Timing
// =============================================================================

/**
 * Tracks when we last performed a mutation.
 * Used to debounce file watcher events caused by our own writes.
 */
let lastMutationTime = 0
export const MUTATION_DEBOUNCE_MS = 500

/** Call this when a mutation STARTS to prevent file watcher from invalidating during the mutation */
export function markMutationStart() {
  lastMutationTime = Date.now()
}

/** Call this when a mutation completes to extend the debounce window */
export function markMutationComplete() {
  lastMutationTime = Date.now()
}

/**
 * Check if a recent mutation occurred (within debounce window).
 * Used by vault initialization to ignore file watcher events from our own writes.
 */
export function isRecentMutation(): boolean {
  const timeSinceMutation = Date.now() - lastMutationTime
  return timeSinceMutation < MUTATION_DEBOUNCE_MS
}

/**
 * Get time since last mutation (for logging).
 */
export function getTimeSinceLastMutation(): number {
  return Date.now() - lastMutationTime
}
