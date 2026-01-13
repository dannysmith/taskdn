/**
 * Hook to handle taskdn:// deep link URLs.
 *
 * Listens for deep link events from the Tauri deep-link plugin and:
 * - Parses the URL to determine the command
 * - Looks up entities by file path
 * - Navigates to the appropriate view
 * - Opens tasks in the detail panel
 * - Brings the window to the foreground
 */

import { useEffect } from 'react'
import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { logger } from '@/lib/logger'
import { queryClient } from '@/lib/query-client'
import { vaultQueryKeys, markMutationStart, markMutationComplete } from '@/services/vault'
import {
  parseDeepLinkUrl,
  type DeepLinkCommand,
  type CreateTaskFromUrlOptions,
} from '@/lib/deep-link'
import { useNavigationStore } from '@/store/navigation-store'
import { validTaskStatusSet } from '@/config/status'
import { useTaskDetailStore } from '@/store/task-detail-store'
import {
  commands,
  type Task,
  type Project,
  type Area,
  type TaskStatus,
  type CreateTaskOptions,
} from '@/lib/tauri-bindings'
import type { NavId, Selection } from '@/types/navigation'

// =============================================================================
// Types
// =============================================================================

interface VaultData {
  tasks: Task[]
  projects: Project[]
  areas: Area[]
}

// =============================================================================
// Data Access
// =============================================================================

/**
 * Get current vault data from the query cache.
 */
function getVaultData(): VaultData {
  const tasks = queryClient.getQueryData<Task[]>(vaultQueryKeys.tasks()) ?? []
  const projects = queryClient.getQueryData<Project[]>(vaultQueryKeys.projects()) ?? []
  const areas = queryClient.getQueryData<Area[]>(vaultQueryKeys.areas()) ?? []
  return { tasks, projects, areas }
}

// =============================================================================
// Entity Lookup
// =============================================================================

/**
 * Find an entity by its file path.
 */
function findEntityByPath(
  path: string,
  data: VaultData
): { type: 'task'; entity: Task } | { type: 'project'; entity: Project } | { type: 'area'; entity: Area } | null {
  // Check tasks first (most common case)
  const task = data.tasks.find(t => t.path === path)
  if (task) {
    return { type: 'task', entity: task }
  }

  // Check projects
  const project = data.projects.find(p => p.path === path)
  if (project) {
    return { type: 'project', entity: project }
  }

  // Check areas
  const area = data.areas.find(a => a.path === path)
  if (area) {
    return { type: 'area', entity: area }
  }

  return null
}

/**
 * Determine which view to navigate to for a task.
 */
function getViewForTask(
  task: Task,
  data: VaultData
): Selection {
  // Inbox tasks always go to inbox view
  if (task.status === 'inbox') {
    return { type: 'nav', id: 'inbox' }
  }

  // If task has a project, find the project and navigate to it
  if (task.project) {
    // task.project is a wikilink like "[[Project Name]]"
    const projectTitle = task.project.replace(/^\[\[|\]\]$/g, '')
    const project = data.projects.find(
      p => p.title.toLowerCase() === projectTitle.toLowerCase()
    )
    if (project) {
      return { type: 'project', id: project.id }
    }
  }

  // If task has an area (but no project), navigate to area view
  if (task.area) {
    // task.area is a wikilink like "[[Area Name]]"
    const areaTitle = task.area.replace(/^\[\[|\]\]$/g, '')
    const area = data.areas.find(
      a => a.title.toLowerCase() === areaTitle.toLowerCase()
    )
    if (area) {
      return { type: 'area', id: area.id }
    }
  }

  // No project or area - go to No Area view
  return { type: 'no-area' }
}

/**
 * Find a project by ID and return the appropriate selection.
 */
function getSelectionForProject(project: Project): Selection {
  return { type: 'project', id: project.id }
}

/**
 * Find an area by ID and return the appropriate selection.
 */
function getSelectionForArea(area: Area): Selection {
  return { type: 'area', id: area.id }
}

// =============================================================================
// Command Handlers
// =============================================================================

/**
 * Handle the open-path command.
 */
async function handleOpenPath(path: string): Promise<boolean> {
  const data = getVaultData()
  const result = findEntityByPath(path, data)

  if (!result) {
    logger.warn('Deep link: entity not found for path', { path })
    return false
  }

  const { setSelection } = useNavigationStore.getState()
  const { openTask } = useTaskDetailStore.getState()

  switch (result.type) {
    case 'task': {
      const selection = getViewForTask(result.entity, data)
      setSelection(selection)
      openTask(result.entity.id)
      break
    }
    case 'project': {
      const selection = getSelectionForProject(result.entity)
      setSelection(selection)
      break
    }
    case 'area': {
      const selection = getSelectionForArea(result.entity)
      setSelection(selection)
      break
    }
  }

  return true
}

/**
 * Handle the open-view command.
 */
async function handleOpenView(view: string): Promise<boolean> {
  const { setSelection } = useNavigationStore.getState()

  if (view === 'no-area') {
    setSelection({ type: 'no-area' })
  } else {
    setSelection({ type: 'nav', id: view as NavId })
  }

  return true
}

/**
 * Find a project by title (case-insensitive).
 */
function findProjectByTitle(title: string, data: VaultData): Project | null {
  const lowerTitle = title.toLowerCase()
  return data.projects.find(p => p.title.toLowerCase() === lowerTitle) ?? null
}

/**
 * Find an area by title (case-insensitive).
 */
function findAreaByTitle(title: string, data: VaultData): Area | null {
  const lowerTitle = title.toLowerCase()
  return data.areas.find(a => a.title.toLowerCase() === lowerTitle) ?? null
}

/**
 * Determine the view to navigate to after creating a task.
 */
function getViewForNewTask(
  status: TaskStatus,
  projectId: string | null,
  areaId: string | null
): Selection {
  // Inbox tasks go to inbox view
  if (status === 'inbox') {
    return { type: 'nav', id: 'inbox' }
  }

  // If project is set, go to project view
  if (projectId) {
    return { type: 'project', id: projectId }
  }

  // If area is set (but no project), go to area view
  if (areaId) {
    return { type: 'area', id: areaId }
  }

  // Otherwise, go to No Area view
  return { type: 'no-area' }
}

/**
 * Handle the new command - create a task from URL parameters.
 */
async function handleNew(options: CreateTaskFromUrlOptions): Promise<boolean> {
  const data = getVaultData()

  // Resolve project by title
  let projectId: string | null = null
  if (options.project) {
    const project = findProjectByTitle(options.project, data)
    if (project) {
      projectId = project.id
    }
    // If not found, silently ignore (per spec)
  }

  // Resolve area by title
  let areaId: string | null = null
  if (options.area) {
    const area = findAreaByTitle(options.area, data)
    if (area) {
      areaId = area.id
    }
    // If not found, silently ignore (per spec)
  }

  // Determine status (default to inbox)
  let status: TaskStatus = 'inbox'
  if (options.status && validTaskStatusSet.has(options.status)) {
    status = options.status as TaskStatus
  }

  // Build create options
  const createOptions: CreateTaskOptions = {
    title: options.title ?? 'New Task',
    status,
    projectId,
    areaId,
    scheduled: options.scheduled ?? null,
    due: options.due ?? null,
    deferUntil: options.deferUntil ?? null,
  }

  logger.info('Creating task from deep link', { createOptions })

  // Mark mutation to prevent file watcher conflicts
  markMutationStart()

  try {
    const result = await commands.createTask(createOptions)

    if (result.status === 'error') {
      logger.error('Failed to create task from deep link', { error: result.error })
      markMutationComplete()
      return false
    }

    const newTask = result.data
    markMutationComplete()

    // Update query cache with new task
    queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks =>
      oldTasks ? [...oldTasks, newTask] : [newTask]
    )
    queryClient.setQueryData(vaultQueryKeys.task(newTask.id), newTask)

    // If body was provided, update it separately
    if (options.body) {
      const updateResult = await commands.updateTask({
        id: newTask.id,
        title: null,
        status: null,
        project: null,
        area: null,
        scheduled: null,
        due: null,
        deferUntil: null,
        body: options.body,
      })

      if (updateResult.status === 'ok') {
        // Update cache with body
        queryClient.setQueryData(vaultQueryKeys.task(newTask.id), updateResult.data)
        queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
          if (!oldTasks) return oldTasks
          return oldTasks.map(t => (t.id === newTask.id ? updateResult.data : t))
        })
      }
    }

    // Navigate to appropriate view
    const { setSelection } = useNavigationStore.getState()
    const selection = getViewForNewTask(status, projectId, areaId)
    setSelection(selection)

    // Open task in detail panel with title focused
    const { openTask } = useTaskDetailStore.getState()
    openTask(newTask.id, 'title')

    logger.info('Task created from deep link', { taskId: newTask.id, title: newTask.title })
    return true
  } catch (error) {
    logger.error('Exception creating task from deep link', { error })
    markMutationComplete()
    return false
  }
}

/**
 * Process a deep link command.
 * Returns true if the command was valid and handled.
 */
async function processDeepLink(command: DeepLinkCommand): Promise<boolean> {
  switch (command.type) {
    case 'open-path':
      return handleOpenPath(command.path)

    case 'open-view':
      return handleOpenView(command.view)

    case 'new':
      return handleNew(command.options)

    case 'invalid':
      logger.warn('Deep link: invalid URL received')
      return false
  }
}

/**
 * Bring the app window to the foreground.
 */
async function bringWindowToFront(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.unminimize()
    await window.setFocus()
  } catch (error) {
    logger.error('Failed to bring window to front', { error })
  }
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to listen for and handle deep link events.
 *
 * Should be called once at the app root level. Uses the query client
 * cache directly to look up entities, so no context needs to be passed.
 */
export function useDeepLink(): void {
  useEffect(() => {
    let unlisten: (() => void) | undefined

    const setupListener = async () => {
      try {
        unlisten = await onOpenUrl(async (urls: string[]) => {
          logger.info('Deep link received', { urls })

          for (const url of urls) {
            const command = parseDeepLinkUrl(url)
            logger.debug('Parsed deep link command', { url, command })

            const success = await processDeepLink(command)

            if (success) {
              // Only bring window to front if we successfully handled the URL
              await bringWindowToFront()
            }
          }
        })
      } catch (error) {
        logger.error('Failed to set up deep link listener', { error })
      }
    }

    setupListener()

    return () => {
      unlisten?.()
    }
  }, [])
}
