import * as React from 'react'
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import type { AppData, Area, Project, Task } from '@/types/data'
import { appData as initialAppData } from '@/data/app-data'

// -----------------------------------------------------------------------------
// Context Types
// -----------------------------------------------------------------------------

/** Options for creating a new task */
export interface CreateTaskOptions {
  title?: string
  status?: Task['status']
  projectId?: string
  areaId?: string
  scheduled?: string
  due?: string
  deferUntil?: string
  /** Insert after this task ID (for list views) */
  insertAfterId?: string
}

interface AppDataContextValue {
  data: AppData
  // Mutations
  createTask: (options?: CreateTaskOptions) => string // returns new task ID
  updateProjectArea: (projectId: string, newAreaId: string | null) => void
  updateProjectStatus: (projectId: string, newStatus: Project['status']) => void
  updateTaskTitle: (taskId: string, newTitle: string) => void
  updateTaskScheduled: (taskId: string, date: string | undefined) => void
  updateTaskDue: (taskId: string, date: string | undefined) => void
  updateTaskDeferUntil: (taskId: string, date: string | undefined) => void
  updateTaskStatus: (taskId: string, newStatus: Task['status']) => void
  updateTaskNotes: (taskId: string, notes: string | undefined) => void
  updateTaskProject: (taskId: string, projectId: string | undefined) => void
  updateTaskArea: (taskId: string, areaId: string | undefined) => void
  toggleTaskStatus: (taskId: string) => void
  reorderProjectTasks: (projectId: string, reorderedTaskIds: string[]) => void
  reorderAreaLooseTasks: (areaId: string, reorderedTaskIds: string[]) => void
  reorderTasksByIds: (reorderedTaskIds: string[]) => void
  moveTaskToProject: (
    taskId: string,
    newProjectId: string,
    insertBeforeTaskId?: string | null
  ) => void
  moveTaskToLooseTasks: (
    taskId: string,
    areaId: string,
    insertBeforeTaskId?: string | null
  ) => void
  // Lookups (derived from data)
  getAreaById: (id: string) => Area | undefined
  getProjectById: (id: string) => Project | undefined
  getTaskById: (id: string) => Task | undefined
  getProjectsByAreaId: (areaId: string) => Project[]
  getOrphanProjects: () => Project[]
  getTasksByProjectId: (projectId: string) => Task[]
  getProjectCompletion: (projectId: string) => number
  getTaskCounts: (projectId: string) => {
    taskCount: number
    completedTaskCount: number
  }
  getActiveProjects: () => Project[]
  getActiveAreas: () => Area[]
  getAreaDirectTasks: (areaId: string) => Task[]
  getOrphanTasks: () => Task[]
  getTaskContextName: (task: Task) => string | undefined
}

const AppDataContext = createContext<AppDataContextValue | null>(null)

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

// Generate a unique ID for new tasks
function generateTaskId(): string {
  return `task-${crypto.randomUUID()}`
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(() =>
    structuredClone(initialAppData)
  )

  // Mutations
  const createTask = useCallback((options: CreateTaskOptions = {}): string => {
    const now = new Date().toISOString()
    const newId = generateTaskId()

    const newTask: Task = {
      id: newId,
      title: options.title ?? '',
      status: options.status ?? 'ready',
      createdAt: now,
      updatedAt: now,
      projectId: options.projectId,
      areaId: options.areaId,
      scheduled: options.scheduled,
      due: options.due,
      deferUntil: options.deferUntil,
    }

    setData((prev) => {
      let newTasks: Task[]

      if (options.insertAfterId) {
        // Insert after specific task
        const insertIndex = prev.tasks.findIndex(
          (t) => t.id === options.insertAfterId
        )
        if (insertIndex !== -1) {
          newTasks = [
            ...prev.tasks.slice(0, insertIndex + 1),
            newTask,
            ...prev.tasks.slice(insertIndex + 1),
          ]
        } else {
          newTasks = [...prev.tasks, newTask]
        }
      } else {
        // Append to end
        newTasks = [...prev.tasks, newTask]
      }

      return { ...prev, tasks: newTasks }
    })

    return newId
  }, [])

  const updateProjectArea = useCallback(
    (projectId: string, newAreaId: string | null) => {
      setData((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, areaId: newAreaId ?? undefined } : p
        ),
      }))
    },
    []
  )

  const updateProjectStatus = useCallback(
    (projectId: string, newStatus: Project['status']) => {
      setData((prev) => ({
        ...prev,
        projects: prev.projects.map((p) =>
          p.id === projectId ? { ...p, status: newStatus } : p
        ),
      }))
    },
    []
  )

  const updateTaskTitle = useCallback((taskId: string, newTitle: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, title: newTitle, updatedAt: new Date().toISOString() }
          : t
      ),
    }))
  }, [])

  const updateTaskScheduled = useCallback(
    (taskId: string, date: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, scheduled: date, updatedAt: new Date().toISOString() }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskDue = useCallback(
    (taskId: string, date: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, due: date, updatedAt: new Date().toISOString() }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskDeferUntil = useCallback(
    (taskId: string, date: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, deferUntil: date, updatedAt: new Date().toISOString() }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskNotes = useCallback(
    (taskId: string, notes: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                notes: notes || undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskProject = useCallback(
    (taskId: string, projectId: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                projectId: projectId || undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskArea = useCallback(
    (taskId: string, areaId: string | undefined) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                areaId: areaId || undefined,
                updatedAt: new Date().toISOString(),
              }
            : t
        ),
      }))
    },
    []
  )

  const updateTaskStatus = useCallback(
    (taskId: string, newStatus: Task['status']) => {
      setData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id !== taskId) return t
          const now = new Date().toISOString()
          const completedAt =
            newStatus === 'done' || newStatus === 'dropped' ? now : undefined
          return { ...t, status: newStatus, updatedAt: now, completedAt }
        }),
      }))
    },
    []
  )

  const toggleTaskStatus = useCallback((taskId: string) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t
        const now = new Date().toISOString()
        // Toggle between ready and done
        if (t.status === 'done') {
          return {
            ...t,
            status: 'ready' as const,
            updatedAt: now,
            completedAt: undefined,
          }
        } else {
          return {
            ...t,
            status: 'done' as const,
            updatedAt: now,
            completedAt: now,
          }
        }
      }),
    }))
  }, [])

  const reorderProjectTasks = useCallback(
    (projectId: string, reorderedTaskIds: string[]) => {
      setData((prev) => {
        // Get tasks for this project
        const projectTasks = prev.tasks.filter((t) => t.projectId === projectId)

        // Reorder the project tasks according to the new order
        const reorderedProjectTasks = reorderedTaskIds
          .map((id) => projectTasks.find((t) => t.id === id))
          .filter((t): t is Task => t !== undefined)

        // Combine: keep order of other tasks, insert reordered tasks in their original position
        // Simple approach: put other tasks first, then reordered tasks
        // Better: maintain relative positions
        const result: Task[] = []
        let projectTaskIndex = 0

        for (const task of prev.tasks) {
          if (task.projectId === projectId) {
            if (projectTaskIndex < reorderedProjectTasks.length) {
              result.push(reorderedProjectTasks[projectTaskIndex])
              projectTaskIndex++
            }
          } else {
            result.push(task)
          }
        }

        return { ...prev, tasks: result }
      })
    },
    []
  )

  const reorderAreaLooseTasks = useCallback(
    (areaId: string, reorderedTaskIds: string[]) => {
      setData((prev) => {
        // Get loose tasks for this area (tasks with areaId but no projectId)
        const looseTasks = prev.tasks.filter(
          (t) => t.areaId === areaId && !t.projectId
        )

        // Reorder the loose tasks according to the new order
        const reorderedLooseTasks = reorderedTaskIds
          .map((id) => looseTasks.find((t) => t.id === id))
          .filter((t): t is Task => t !== undefined)

        // Maintain relative positions in the main array
        const result: Task[] = []
        let looseTaskIndex = 0

        for (const task of prev.tasks) {
          if (task.areaId === areaId && !task.projectId) {
            if (looseTaskIndex < reorderedLooseTasks.length) {
              result.push(reorderedLooseTasks[looseTaskIndex])
              looseTaskIndex++
            }
          } else {
            result.push(task)
          }
        }

        return { ...prev, tasks: result }
      })
    },
    []
  )

  const reorderTasksByIds = useCallback((reorderedTaskIds: string[]) => {
    setData((prev) => {
      // Create a set of IDs being reordered for quick lookup
      const reorderSet = new Set(reorderedTaskIds)

      // Get the tasks being reordered in their new order
      const reorderedTasks = reorderedTaskIds
        .map((id) => prev.tasks.find((t) => t.id === id))
        .filter((t): t is Task => t !== undefined)

      // Rebuild the array: for each task in the original order,
      // if it's being reordered, take the next task from reorderedTasks instead
      const result: Task[] = []
      let reorderIndex = 0

      for (const task of prev.tasks) {
        if (reorderSet.has(task.id)) {
          if (reorderIndex < reorderedTasks.length) {
            result.push(reorderedTasks[reorderIndex])
            reorderIndex++
          }
        } else {
          result.push(task)
        }
      }

      return { ...prev, tasks: result }
    })
  }, [])

  const moveTaskToProject = useCallback(
    (
      taskId: string,
      newProjectId: string,
      insertBeforeTaskId?: string | null
    ) => {
      setData((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId)
        if (!task || task.projectId === newProjectId) return prev

        // Remove task from its current position
        const tasksWithoutMoved = prev.tasks.filter((t) => t.id !== taskId)

        // Update the task with new projectId
        const updatedTask: Task = {
          ...task,
          projectId: newProjectId,
          updatedAt: new Date().toISOString(),
        }

        // Find where to insert
        let insertIndex: number

        if (insertBeforeTaskId) {
          // Insert before the specified task
          const beforeIndex = tasksWithoutMoved.findIndex(
            (t) => t.id === insertBeforeTaskId
          )
          insertIndex =
            beforeIndex !== -1 ? beforeIndex : tasksWithoutMoved.length
        } else {
          // Append after the last task of the target project
          let lastTargetTaskIndex = -1
          for (let i = tasksWithoutMoved.length - 1; i >= 0; i--) {
            if (tasksWithoutMoved[i].projectId === newProjectId) {
              lastTargetTaskIndex = i
              break
            }
          }
          insertIndex =
            lastTargetTaskIndex === -1
              ? tasksWithoutMoved.length
              : lastTargetTaskIndex + 1
        }

        const newTasks = [
          ...tasksWithoutMoved.slice(0, insertIndex),
          updatedTask,
          ...tasksWithoutMoved.slice(insertIndex),
        ]

        return { ...prev, tasks: newTasks }
      })
    },
    []
  )

  const moveTaskToLooseTasks = useCallback(
    (taskId: string, areaId: string, insertBeforeTaskId?: string | null) => {
      setData((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId)
        if (!task) return prev

        // Already a loose task in this area
        if (!task.projectId && task.areaId === areaId) return prev

        // Remove task from its current position
        const tasksWithoutMoved = prev.tasks.filter((t) => t.id !== taskId)

        // Update the task: clear projectId, set areaId
        const updatedTask: Task = {
          ...task,
          projectId: undefined,
          areaId: areaId,
          updatedAt: new Date().toISOString(),
        }

        // Find where to insert
        let insertIndex: number

        if (insertBeforeTaskId) {
          // Insert before the specified task
          const beforeIndex = tasksWithoutMoved.findIndex(
            (t) => t.id === insertBeforeTaskId
          )
          insertIndex =
            beforeIndex !== -1 ? beforeIndex : tasksWithoutMoved.length
        } else {
          // Append after the last loose task in the target area
          let lastLooseTaskIndex = -1
          for (let i = tasksWithoutMoved.length - 1; i >= 0; i--) {
            const t = tasksWithoutMoved[i]
            if (t.areaId === areaId && !t.projectId) {
              lastLooseTaskIndex = i
              break
            }
          }
          insertIndex =
            lastLooseTaskIndex === -1
              ? tasksWithoutMoved.length
              : lastLooseTaskIndex + 1
        }

        const newTasks = [
          ...tasksWithoutMoved.slice(0, insertIndex),
          updatedTask,
          ...tasksWithoutMoved.slice(insertIndex),
        ]

        return { ...prev, tasks: newTasks }
      })
    },
    []
  )

  // Lookups
  const getAreaById = useCallback(
    (id: string): Area | undefined => {
      return data.areas.find((a) => a.id === id)
    },
    [data.areas]
  )

  const getProjectById = useCallback(
    (id: string): Project | undefined => {
      return data.projects.find((p) => p.id === id)
    },
    [data.projects]
  )

  const getTaskById = useCallback(
    (id: string): Task | undefined => {
      return data.tasks.find((t) => t.id === id)
    },
    [data.tasks]
  )

  const getProjectsByAreaId = useCallback(
    (areaId: string): Project[] => {
      return data.projects.filter((p) => p.areaId === areaId)
    },
    [data.projects]
  )

  const getOrphanProjects = useCallback((): Project[] => {
    return data.projects.filter((p) => !p.areaId)
  }, [data.projects])

  const getTasksByProjectId = useCallback(
    (projectId: string): Task[] => {
      return data.tasks.filter((t) => t.projectId === projectId)
    },
    [data.tasks]
  )

  // Pre-computed project stats - O(T) once when tasks change, O(1) per lookup
  const projectStats = useMemo(() => {
    const stats = new Map<string, { total: number; completed: number }>()

    for (const task of data.tasks) {
      if (!task.projectId) continue

      const existing = stats.get(task.projectId) ?? { total: 0, completed: 0 }
      existing.total++
      if (task.status === 'done' || task.status === 'dropped') {
        existing.completed++
      }
      stats.set(task.projectId, existing)
    }

    return stats
  }, [data.tasks])

  // O(1) lookup instead of O(T)
  const getProjectCompletion = useCallback(
    (projectId: string): number => {
      const stats = projectStats.get(projectId)
      if (!stats || stats.total === 0) return 0
      return Math.round((stats.completed / stats.total) * 100)
    },
    [projectStats]
  )

  const getTaskCounts = useCallback(
    (projectId: string): { taskCount: number; completedTaskCount: number } => {
      const stats = projectStats.get(projectId)
      return {
        taskCount: stats?.total ?? 0,
        completedTaskCount: stats?.completed ?? 0,
      }
    },
    [projectStats]
  )

  const getActiveProjects = useCallback((): Project[] => {
    return data.projects.filter(
      (p) => p.status !== 'done' && p.status !== 'paused'
    )
  }, [data.projects])

  const getActiveAreas = useCallback((): Area[] => {
    return data.areas.filter((a) => a.status !== 'archived')
  }, [data.areas])

  const getAreaDirectTasks = useCallback(
    (areaId: string): Task[] => {
      return data.tasks.filter((t) => t.areaId === areaId && !t.projectId)
    },
    [data.tasks]
  )

  const getOrphanTasks = useCallback((): Task[] => {
    return data.tasks.filter((t) => !t.projectId && !t.areaId)
  }, [data.tasks])

  const getTaskContextName = useCallback(
    (task: Task): string | undefined => {
      if (task.projectId) {
        const project = data.projects.find((p) => p.id === task.projectId)
        return project?.title
      }
      if (task.areaId) {
        const area = data.areas.find((a) => a.id === task.areaId)
        return area?.title
      }
      return undefined
    },
    [data.projects, data.areas]
  )

  const value: AppDataContextValue = {
    data,
    createTask,
    updateProjectArea,
    updateProjectStatus,
    updateTaskTitle,
    updateTaskScheduled,
    updateTaskDue,
    updateTaskDeferUntil,
    updateTaskStatus,
    updateTaskNotes,
    updateTaskProject,
    updateTaskArea,
    toggleTaskStatus,
    reorderProjectTasks,
    reorderAreaLooseTasks,
    reorderTasksByIds,
    moveTaskToProject,
    moveTaskToLooseTasks,
    getAreaById,
    getProjectById,
    getTaskById,
    getProjectsByAreaId,
    getOrphanProjects,
    getTasksByProjectId,
    getProjectCompletion,
    getTaskCounts,
    getActiveProjects,
    getActiveAreas,
    getAreaDirectTasks,
    getOrphanTasks,
    getTaskContextName,
  }

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  )
}

// -----------------------------------------------------------------------------
// Hook
// -----------------------------------------------------------------------------

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext)
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider')
  }
  return context
}
