/**
 * TanStack Query hooks for vault data (tasks, projects, areas).
 *
 * These hooks provide the primary data access layer for the frontend,
 * wrapping Tauri commands with proper caching and optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listen } from '@tauri-apps/api/event'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { logger } from '@/lib/logger'
import {
  commands,
  type Task,
  type Project,
  type Area,
  type CreateTaskOptions,
  type CreateProjectOptions,
  type TaskUpdate,
  type ProjectUpdate,
  type VaultError,
} from '@/lib/tauri-bindings'

// =============================================================================
// Query Keys
// =============================================================================

export const vaultQueryKeys = {
  all: ['vault'] as const,
  tasks: () => [...vaultQueryKeys.all, 'tasks'] as const,
  task: (id: string) => [...vaultQueryKeys.tasks(), id] as const,
  projects: () => [...vaultQueryKeys.all, 'projects'] as const,
  project: (id: string) => [...vaultQueryKeys.projects(), id] as const,
  areas: () => [...vaultQueryKeys.all, 'areas'] as const,
  area: (id: string) => [...vaultQueryKeys.areas(), id] as const,
}

// =============================================================================
// Error Handling
// =============================================================================

function handleVaultError(error: VaultError, operation: string): string {
  const message = formatVaultError(error)
  logger.error(`Vault ${operation} failed`, { error })
  toast.error(`${operation} failed`, { description: message })
  return message
}

function formatVaultError(error: VaultError): string {
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
// Query Hooks
// =============================================================================

/**
 * Hook to get all tasks from the vault.
 */
export function useTasks() {
  return useQuery({
    queryKey: vaultQueryKeys.tasks(),
    queryFn: async (): Promise<Task[]> => {
      logger.debug('Fetching tasks from vault')
      const result = await commands.listTasks()

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading tasks'))
      }

      logger.info('Tasks loaded', { count: result.data.length })
      return result.data
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to get a single task by ID.
 */
export function useTask(id: string) {
  return useQuery({
    queryKey: vaultQueryKeys.task(id),
    queryFn: async (): Promise<Task> => {
      const result = await commands.getTask(id)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading task'))
      }

      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to get all projects from the vault.
 */
export function useProjects() {
  return useQuery({
    queryKey: vaultQueryKeys.projects(),
    queryFn: async (): Promise<Project[]> => {
      logger.debug('Fetching projects from vault')
      const result = await commands.listProjects()

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading projects'))
      }

      logger.info('Projects loaded', { count: result.data.length })
      return result.data
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to get a single project by ID.
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: vaultQueryKeys.project(id),
    queryFn: async (): Promise<Project> => {
      const result = await commands.getProject(id)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading project'))
      }

      return result.data
    },
    enabled: !!id,
  })
}

/**
 * Hook to get all areas from the vault.
 */
export function useAreas() {
  return useQuery({
    queryKey: vaultQueryKeys.areas(),
    queryFn: async (): Promise<Area[]> => {
      logger.debug('Fetching areas from vault')
      const result = await commands.listAreas()

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading areas'))
      }

      logger.info('Areas loaded', { count: result.data.length })
      return result.data
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

/**
 * Hook to get a single area by ID.
 */
export function useArea(id: string) {
  return useQuery({
    queryKey: vaultQueryKeys.area(id),
    queryFn: async (): Promise<Area> => {
      const result = await commands.getArea(id)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Loading area'))
      }

      return result.data
    },
    enabled: !!id,
  })
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook to create a new task.
 */
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CreateTaskOptions): Promise<Task> => {
      logger.debug('Creating task', { options })
      const result = await commands.createTask(options)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Creating task'))
      }

      logger.info('Task created', {
        id: result.data.id,
        title: result.data.title,
      })
      return result.data
    },
    onSuccess: newTask => {
      markMutationComplete()

      // Update the tasks list cache with the new task
      queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
        if (!oldTasks) return [newTask]
        return [...oldTasks, newTask]
      })

      // Also set the individual task cache
      queryClient.setQueryData(vaultQueryKeys.task(newTask.id), newTask)
    },
  })
}

/**
 * Hook to update an existing task.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: TaskUpdate): Promise<Task> => {
      logger.debug('Updating task', { id: update.id })
      const result = await commands.updateTask(update)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Updating task'))
      }

      logger.info('Task updated', { id: result.data.id })
      return result.data
    },
    onMutate: async update => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: vaultQueryKeys.tasks() })
      await queryClient.cancelQueries({
        queryKey: vaultQueryKeys.task(update.id),
      })

      // Snapshot the previous values
      const previousTasks = queryClient.getQueryData<Task[]>(
        vaultQueryKeys.tasks()
      )
      const previousTask = queryClient.getQueryData<Task>(
        vaultQueryKeys.task(update.id)
      )

      // Optimistically update the task
      if (previousTask) {
        const optimisticTask: Task = {
          ...previousTask,
          ...(update.title !== null && { title: update.title }),
          ...(update.status !== null && { status: update.status }),
          ...(update.project !== null && {
            project: update.project || null,
          }),
          ...(update.area !== null && { area: update.area || null }),
          ...(update.scheduled !== null && {
            scheduled: update.scheduled || null,
          }),
          ...(update.due !== null && { due: update.due || null }),
          ...(update.deferUntil !== null && {
            deferUntil: update.deferUntil || null,
          }),
          ...(update.body !== null && { body: update.body }),
        }

        queryClient.setQueryData(vaultQueryKeys.task(update.id), optimisticTask)

        // Update the task in the list
        queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
          if (!oldTasks) return oldTasks
          return oldTasks.map(t => (t.id === update.id ? optimisticTask : t))
        })
      }

      return { previousTasks, previousTask }
    },
    onError: (_error, update, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(vaultQueryKeys.tasks(), context.previousTasks)
      }
      if (context?.previousTask) {
        queryClient.setQueryData(
          vaultQueryKeys.task(update.id),
          context.previousTask
        )
      }
    },
    onSuccess: updatedTask => {
      markMutationComplete()

      // Update with the actual server response
      queryClient.setQueryData(vaultQueryKeys.task(updatedTask.id), updatedTask)
      queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
        if (!oldTasks) return oldTasks
        return oldTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
      })
    },
  })
}

/**
 * Hook to create a new project.
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CreateProjectOptions): Promise<Project> => {
      logger.debug('Creating project', { options })
      const result = await commands.createProject(options)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Creating project'))
      }

      logger.info('Project created', {
        id: result.data.id,
        title: result.data.title,
      })
      return result.data
    },
    onSuccess: newProject => {
      markMutationComplete()

      queryClient.setQueryData<Project[]>(
        vaultQueryKeys.projects(),
        oldProjects => {
          if (!oldProjects) return [newProject]
          return [...oldProjects, newProject]
        }
      )
      queryClient.setQueryData(
        vaultQueryKeys.project(newProject.id),
        newProject
      )
    },
  })
}

/**
 * Hook to update an existing project.
 */
export function useUpdateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (update: ProjectUpdate): Promise<Project> => {
      logger.debug('Updating project', { id: update.id })
      const result = await commands.updateProject(update)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Updating project'))
      }

      logger.info('Project updated', { id: result.data.id })
      return result.data
    },
    onMutate: async update => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: vaultQueryKeys.projects() })
      await queryClient.cancelQueries({
        queryKey: vaultQueryKeys.project(update.id),
      })

      // Snapshot the previous values
      const previousProjects = queryClient.getQueryData<Project[]>(
        vaultQueryKeys.projects()
      )
      const previousProject = queryClient.getQueryData<Project>(
        vaultQueryKeys.project(update.id)
      )

      // Optimistically update the project
      if (previousProject) {
        const optimisticProject: Project = {
          ...previousProject,
          ...(update.title !== null && { title: update.title }),
          ...(update.status !== null && { status: update.status }),
          ...(update.area !== null && { area: update.area || null }),
          ...(update.description !== null && {
            description: update.description || null,
          }),
          ...(update.startDate !== null && {
            startDate: update.startDate || null,
          }),
          ...(update.endDate !== null && { endDate: update.endDate || null }),
          ...(update.body !== null && { body: update.body }),
        }

        queryClient.setQueryData(
          vaultQueryKeys.project(update.id),
          optimisticProject
        )

        // Update the project in the list
        queryClient.setQueryData<Project[]>(
          vaultQueryKeys.projects(),
          oldProjects => {
            if (!oldProjects) return oldProjects
            return oldProjects.map(p =>
              p.id === update.id ? optimisticProject : p
            )
          }
        )
      }

      return { previousProjects, previousProject }
    },
    onError: (_error, update, context) => {
      // Rollback on error
      if (context?.previousProjects) {
        queryClient.setQueryData(
          vaultQueryKeys.projects(),
          context.previousProjects
        )
      }
      if (context?.previousProject) {
        queryClient.setQueryData(
          vaultQueryKeys.project(update.id),
          context.previousProject
        )
      }
    },
    onSuccess: updatedProject => {
      markMutationComplete()

      // Update with the actual server response
      queryClient.setQueryData(
        vaultQueryKeys.project(updatedProject.id),
        updatedProject
      )
      queryClient.setQueryData<Project[]>(
        vaultQueryKeys.projects(),
        oldProjects => {
          if (!oldProjects) return oldProjects
          return oldProjects.map(p =>
            p.id === updatedProject.id ? updatedProject : p
          )
        }
      )
    },
  })
}

// =============================================================================
// Vault Initialization & Event Handling
// =============================================================================

/**
 * Tracks when we last performed a mutation.
 * Used to debounce file watcher events caused by our own writes.
 */
let lastMutationTime = 0
const MUTATION_DEBOUNCE_MS = 500

/** Call this when a mutation completes to prevent file watcher from re-invalidating */
export function markMutationComplete() {
  lastMutationTime = Date.now()
}

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
        const timeSinceMutation = Date.now() - lastMutationTime
        if (timeSinceMutation < MUTATION_DEBOUNCE_MS) {
          logger.debug('Ignoring vault-changed event (recent mutation)', {
            timeSinceMutation,
          })
          // Still refresh the Rust index, but don't invalidate React Query cache
          commands.refreshVault()
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
 * Check if the vault is configured.
 */
export async function isVaultConfigured(): Promise<boolean> {
  return commands.isVaultConfigured()
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Hook to get all vault data (tasks, projects, areas) together.
 * Useful for initial data loading.
 */
export function useVaultData() {
  const tasks = useTasks()
  const projects = useProjects()
  const areas = useAreas()

  return {
    tasks: tasks.data ?? [],
    projects: projects.data ?? [],
    areas: areas.data ?? [],
    isLoading: tasks.isLoading || projects.isLoading || areas.isLoading,
    isError: tasks.isError || projects.isError || areas.isError,
    error: tasks.error || projects.error || areas.error,
  }
}

/**
 * Hook to get derived data relationships.
 * Provides helpers similar to the mockup's AppDataContext.
 */
export function useVaultHelpers() {
  const { tasks, projects, areas } = useVaultData()

  // Build lookup maps
  const tasksById = new Map(tasks.map(t => [t.id, t]))
  const projectsById = new Map(projects.map(p => [p.id, p]))
  const areasById = new Map(areas.map(a => [a.id, a]))

  return {
    // Direct lookups
    getTaskById: (id: string) => tasksById.get(id),
    getProjectById: (id: string) => projectsById.get(id),
    getAreaById: (id: string) => areasById.get(id),

    // Relationship helpers
    getProjectsByAreaId: (areaId: string) =>
      projects.filter(p => p.area?.includes(areaId)),

    getOrphanProjects: () => projects.filter(p => !p.area),

    getTasksByProjectId: (projectId: string) =>
      tasks.filter(t => t.project?.includes(projectId)),

    getAreaDirectTasks: (areaId: string) =>
      tasks.filter(t => t.area?.includes(areaId) && !t.project),

    getOrphanTasks: () => tasks.filter(t => !t.project && !t.area),

    getActiveProjects: () =>
      projects.filter(p => p.status !== 'done' && p.status !== 'paused'),

    getActiveAreas: () => areas.filter(a => a.status !== 'archived'),

    // Stats helpers
    getProjectCompletion: (projectId: string) => {
      const projectTasks = tasks.filter(t => t.project?.includes(projectId))
      if (projectTasks.length === 0) return 0

      const completedCount = projectTasks.filter(
        t => t.status === 'done' || t.status === 'dropped'
      ).length

      return Math.round((completedCount / projectTasks.length) * 100)
    },

    getTaskCounts: (projectId: string) => {
      const projectTasks = tasks.filter(t => t.project?.includes(projectId))
      const completedCount = projectTasks.filter(
        t => t.status === 'done' || t.status === 'dropped'
      ).length

      return {
        taskCount: projectTasks.length,
        completedTaskCount: completedCount,
      }
    },
  }
}
