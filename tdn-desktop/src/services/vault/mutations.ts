/**
 * TanStack Query mutation hooks for writing vault data.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import {
  commands,
  type Task,
  type Project,
  type CreateTaskOptions,
  type CreateProjectOptions,
  type TaskUpdate,
  type ProjectUpdate,
} from '@/lib/tauri-bindings'
import { vaultQueryKeys } from './keys'
import {
  handleVaultError,
  markMutationStart,
  markMutationComplete,
} from './utils'

// =============================================================================
// Task Mutations
// =============================================================================

/**
 * Hook to create a new task.
 *
 * Uses simple async/await approach - the ~50ms backend latency is imperceptible.
 * No temp IDs or optimistic updates needed.
 *
 * Usage:
 * ```typescript
 * const createTask = useCreateTask()
 * const newTask = await createTask.mutateAsync({ title: '', status: 'ready', ... })
 * // newTask has real ID, update order store and trigger edit mode
 * ```
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

    onMutate: () => {
      markMutationStart()
    },

    onSuccess: newTask => {
      markMutationComplete()

      // Add real task to cache
      queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks =>
        oldTasks ? [...oldTasks, newTask] : [newTask]
      )

      // Set individual task cache
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
      // Mark mutation start to prevent file watcher from invalidating during mutation
      markMutationStart()

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
 * Hook to delete a task.
 * Used when canceling a newly created task (Escape pressed before confirming).
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      logger.debug('Deleting task (permanent - new task cancellation)', { id })
      // When canceling a newly created task (Escape pressed), use permanent deletion
      // since there's nothing meaningful to recover from an untitled/empty task
      const result = await commands.deleteTask(id, true)

      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Deleting task'))
      }

      logger.info('Task permanently deleted', { id })
    },
    onMutate: async id => {
      // Mark mutation start to prevent file watcher from invalidating during mutation
      markMutationStart()

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: vaultQueryKeys.tasks() })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(
        vaultQueryKeys.tasks()
      )

      // Optimistically remove the task
      queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), oldTasks => {
        if (!oldTasks) return oldTasks
        return oldTasks.filter(t => t.id !== id)
      })

      // Remove individual task cache
      queryClient.removeQueries({ queryKey: vaultQueryKeys.task(id) })

      return { previousTasks }
    },
    onError: (_error, _id, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(vaultQueryKeys.tasks(), context.previousTasks)
      }
    },
    onSuccess: () => {
      markMutationComplete()
    },
  })
}

// =============================================================================
// Project Mutations
// =============================================================================

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

    onMutate: () => {
      markMutationStart()
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
      // Mark mutation start to prevent file watcher from invalidating during mutation
      markMutationStart()

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
