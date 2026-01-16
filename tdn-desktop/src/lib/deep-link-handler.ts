/**
 * Deep link command handlers.
 *
 * This module processes parsed deep link commands by:
 * - Looking up entities in the query cache
 * - Navigating to appropriate views
 * - Creating tasks
 * - Managing window focus
 */

import { getCurrentWindow } from '@tauri-apps/api/window'
import { logger } from '@/lib/logger'
import { queryClient } from '@/lib/query-client'
import {
  vaultQueryKeys,
  markMutationStart,
  markMutationComplete,
} from '@/services/vault'
import type { DeepLinkCommand, CreateTaskFromUrlOptions } from '@/lib/deep-link'
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
import { getSelectionForTask } from '@/lib/task-navigation'

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
  const projects =
    queryClient.getQueryData<Project[]>(vaultQueryKeys.projects()) ?? []
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
):
  | { type: 'task'; entity: Task }
  | { type: 'project'; entity: Project }
  | { type: 'area'; entity: Area }
  | null {
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

  const { navigate } = useNavigationStore.getState()
  const { openTask } = useTaskDetailStore.getState()

  switch (result.type) {
    case 'task': {
      const selection = getSelectionForTask(
        result.entity,
        data.projects,
        data.areas
      )
      navigate(selection)
      openTask(result.entity.id)
      break
    }
    case 'project': {
      const selection = getSelectionForProject(result.entity)
      navigate(selection)
      break
    }
    case 'area': {
      const selection = getSelectionForArea(result.entity)
      navigate(selection)
      break
    }
  }

  return true
}

/**
 * Handle the open-view command.
 */
async function handleOpenView(view: string): Promise<boolean> {
  const { navigate } = useNavigationStore.getState()

  if (view === 'no-area') {
    navigate({ type: 'no-area' })
  } else {
    navigate({ type: 'nav', id: view as NavId })
  }

  return true
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
      logger.error('Failed to create task from deep link', {
        error: result.error,
      })
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
        queryClient.setQueryData(
          vaultQueryKeys.task(newTask.id),
          updateResult.data
        )
        queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
          if (!oldTasks) return oldTasks
          return oldTasks.map(t =>
            t.id === newTask.id ? updateResult.data : t
          )
        })
      }
    }

    // Navigate to appropriate view
    const { navigate } = useNavigationStore.getState()
    const selection = getViewForNewTask(status, projectId, areaId)
    navigate(selection)

    // Open task in detail panel with title focused
    const { openTask } = useTaskDetailStore.getState()
    openTask(newTask.id, 'title')

    logger.info('Task created from deep link', {
      taskId: newTask.id,
      title: newTask.title,
    })
    return true
  } catch (error) {
    logger.error('Exception creating task from deep link', { error })
    markMutationComplete()
    return false
  }
}

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Process a deep link command.
 * Returns true if the command was valid and handled.
 */
export async function processDeepLink(
  command: DeepLinkCommand
): Promise<boolean> {
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
export async function bringWindowToFront(): Promise<void> {
  try {
    const window = getCurrentWindow()
    await window.unminimize()
    await window.setFocus()
  } catch (error) {
    logger.error('Failed to bring window to front', { error })
  }
}
