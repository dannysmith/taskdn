/**
 * TanStack Query hooks for reading vault data.
 */

import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { filterActiveAreas, filterActiveProjects } from '@/lib/entity-filters'
import { matchesWikilinkTitle } from '@/lib/wikilink'
import {
  commands,
  type Task,
  type Project,
  type Area,
} from '@/lib/tauri-bindings'
import { vaultQueryKeys } from './keys'
import { handleVaultError } from './utils'

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
    // Note: Wikilinks use TITLES (e.g., "[[Finance]]"), not hash IDs.
    getProjectsByAreaId: (areaId: string) => {
      const area = areasById.get(areaId)
      if (!area) return []
      return projects.filter(p => matchesWikilinkTitle(p.area, area.title))
    },

    getOrphanProjects: () => projects.filter(p => !p.area),

    getTasksByProjectId: (projectId: string) => {
      const project = projectsById.get(projectId)
      if (!project) return []
      return tasks.filter(t => matchesWikilinkTitle(t.project, project.title))
    },

    getAreaDirectTasks: (areaId: string) => {
      const area = areasById.get(areaId)
      if (!area) return []
      return tasks.filter(
        t => matchesWikilinkTitle(t.area, area.title) && !t.project
      )
    },

    getOrphanTasks: () => tasks.filter(t => !t.project && !t.area),

    getActiveProjects: () => filterActiveProjects(projects),

    getActiveAreas: () => filterActiveAreas(areas),

    // Stats helpers
    getProjectCompletion: (projectId: string) => {
      const project = projectsById.get(projectId)
      if (!project) return 0
      const projectTasks = tasks.filter(t =>
        matchesWikilinkTitle(t.project, project.title)
      )
      if (projectTasks.length === 0) return 0

      const completedCount = projectTasks.filter(
        t => t.status === 'done' || t.status === 'dropped'
      ).length

      return Math.round((completedCount / projectTasks.length) * 100)
    },

    getTaskCounts: (projectId: string) => {
      const project = projectsById.get(projectId)
      if (!project) return { taskCount: 0, completedTaskCount: 0 }
      const projectTasks = tasks.filter(t =>
        matchesWikilinkTitle(t.project, project.title)
      )
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
