import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'
import { useCommandContext } from './use-command-context'
import { useGlobalShortcuts } from './use-global-shortcuts'
import { logger } from '@/lib/logger'
import { addTaskToCache } from '@/services/vault'
import type { Task } from '@/lib/tauri-bindings'

/**
 * Main window event listeners - handles global keyboard shortcuts and cross-window events.
 *
 * This hook composes specialized hooks for different event types:
 * - useGlobalShortcuts: Command-driven keyboard shortcuts
 * - Task created listener: Cross-window communication from quick pane
 */
export function useMainWindowEventListeners() {
  const commandContext = useCommandContext()

  useGlobalShortcuts(commandContext)

  // Listen for task creation from quick pane (cross-window event)
  useEffect(() => {
    let isMounted = true
    let unlisten: (() => void) | null = null

    listen<Task>('task-created', event => {
      logger.debug('Task created event received', {
        taskId: event.payload.id,
        title: event.payload.title,
      })

      // Add the task to the TanStack Query cache
      addTaskToCache(event.payload)
    })
      .then(unlistenFn => {
        if (!isMounted) {
          unlistenFn()
        } else {
          unlisten = unlistenFn
        }
      })
      .catch(error => {
        logger.error('Failed to setup task-created listener', { error })
      })

    return () => {
      isMounted = false
      if (unlisten) {
        unlisten()
      }
    }
  }, [])
}
