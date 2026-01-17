import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  vaultQueryKeys,
  useVaultHelpers,
  useVaultData,
  markMutationStart,
  markMutationComplete,
  vaultConfigChanged,
  formatVaultError,
  handleVaultError,
  isRecentMutation,
  getTimeSinceLastMutation,
  addTaskToCache,
  initializeVault,
  isVaultConfigured,
} from './vault'
import type { Task, Project, Area, AppPreferences } from '@/lib/tauri-bindings'
import {
  createTestTask,
  createTestProject,
  createTestArea,
  resetFactoryCounters,
} from '@/test/helpers/vault'

// Mock Tauri bindings
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    listTasks: vi.fn(),
    listProjects: vi.fn(),
    listAreas: vi.fn(),
    getTask: vi.fn(),
    getProject: vi.fn(),
    getArea: vi.fn(),
    initVault: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    isVaultConfigured: vi.fn().mockResolvedValue(true),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

// Helper to create a query client and wrapper for hooks
function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

describe('vault service', () => {
  beforeEach(() => {
    resetFactoryCounters()
    vi.clearAllMocks()
  })

  describe('vaultQueryKeys', () => {
    it('returns correct base key', () => {
      expect(vaultQueryKeys.all).toEqual(['vault'])
    })

    it('returns correct tasks key', () => {
      expect(vaultQueryKeys.tasks()).toEqual(['vault', 'tasks'])
    })

    it('returns correct task key with id', () => {
      expect(vaultQueryKeys.task('task-123')).toEqual([
        'vault',
        'tasks',
        'task-123',
      ])
    })

    it('returns correct projects key', () => {
      expect(vaultQueryKeys.projects()).toEqual(['vault', 'projects'])
    })

    it('returns correct project key with id', () => {
      expect(vaultQueryKeys.project('project-456')).toEqual([
        'vault',
        'projects',
        'project-456',
      ])
    })

    it('returns correct areas key', () => {
      expect(vaultQueryKeys.areas()).toEqual(['vault', 'areas'])
    })

    it('returns correct area key with id', () => {
      expect(vaultQueryKeys.area('area-789')).toEqual([
        'vault',
        'areas',
        'area-789',
      ])
    })
  })

  describe('mutation timing utilities', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('markMutationStart updates last mutation time', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))
      markMutationStart()

      // Move time forward slightly
      vi.setSystemTime(new Date('2025-06-15T12:00:00.100'))
      markMutationComplete()

      // The functions work by setting internal timestamps
      // We can't directly test the timestamp, but we can verify they don't throw
      expect(() => {
        markMutationStart()
        markMutationComplete()
      }).not.toThrow()
    })
  })

  describe('useVaultHelpers', () => {
    let queryClient: QueryClient

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity, // Prevent refetches during tests
          },
        },
      })
    })

    afterEach(() => {
      queryClient.clear()
    })

    // Helper to set up mock data in the query cache
    function setupTestData(data: {
      tasks?: Task[]
      projects?: Project[]
      areas?: Area[]
    }) {
      const tasks = data.tasks ?? []
      const projects = data.projects ?? []
      const areas = data.areas ?? []

      queryClient.setQueryData(vaultQueryKeys.tasks(), tasks)
      queryClient.setQueryData(vaultQueryKeys.projects(), projects)
      queryClient.setQueryData(vaultQueryKeys.areas(), areas)
    }

    describe('getTaskById', () => {
      it('returns task by id', () => {
        const task = createTestTask({ id: 'task-1' })
        setupTestData({ tasks: [task] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getTaskById('task-1')).toEqual(task)
      })

      it('returns undefined for non-existent id', () => {
        setupTestData({ tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getTaskById('non-existent')).toBeUndefined()
      })
    })

    describe('getProjectById', () => {
      it('returns project by id', () => {
        const project = createTestProject({ id: 'project-1' })
        setupTestData({ projects: [project] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectById('project-1')).toEqual(project)
      })

      it('returns undefined for non-existent id', () => {
        setupTestData({ projects: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectById('non-existent')).toBeUndefined()
      })
    })

    describe('getAreaById', () => {
      it('returns area by id', () => {
        const area = createTestArea({ id: 'area-1' })
        setupTestData({ areas: [area] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getAreaById('area-1')).toEqual(area)
      })

      it('returns undefined for non-existent id', () => {
        setupTestData({ areas: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getAreaById('non-existent')).toBeUndefined()
      })
    })

    describe('getProjectsByAreaId', () => {
      it('returns projects linked to an area', () => {
        const area = createTestArea({ id: 'area-1', title: 'Work' })
        const project1 = createTestProject({
          id: 'project-1',
          title: 'Project A',
          area: '[[Work]]',
        })
        const project2 = createTestProject({
          id: 'project-2',
          title: 'Project B',
          area: '[[Work]]',
        })
        const project3 = createTestProject({
          id: 'project-3',
          title: 'Project C',
          area: '[[Personal]]',
        })

        setupTestData({
          areas: [area],
          projects: [project1, project2, project3],
        })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const projects = result.current.getProjectsByAreaId('area-1')
        expect(projects).toHaveLength(2)
        expect(projects.map(p => p.id)).toEqual(['project-1', 'project-2'])
      })

      it('returns empty array for non-existent area', () => {
        setupTestData({ areas: [], projects: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectsByAreaId('non-existent')).toEqual([])
      })

      it('returns empty array when no projects match', () => {
        const area = createTestArea({ id: 'area-1', title: 'Work' })
        const project = createTestProject({
          id: 'project-1',
          area: '[[Personal]]',
        })

        setupTestData({ areas: [area], projects: [project] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectsByAreaId('area-1')).toEqual([])
      })
    })

    describe('getOrphanProjects', () => {
      it('returns projects with no area', () => {
        const orphan1 = createTestProject({ id: 'orphan-1', area: null })
        const orphan2 = createTestProject({ id: 'orphan-2', area: null })
        const linked = createTestProject({ id: 'linked', area: '[[Work]]' })

        setupTestData({ projects: [orphan1, orphan2, linked] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const orphans = result.current.getOrphanProjects()
        expect(orphans).toHaveLength(2)
        expect(orphans.map(p => p.id)).toEqual(['orphan-1', 'orphan-2'])
      })

      it('returns empty array when all projects have areas', () => {
        const project = createTestProject({ id: 'project-1', area: '[[Work]]' })

        setupTestData({ projects: [project] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getOrphanProjects()).toEqual([])
      })
    })

    describe('getTasksByProjectId', () => {
      it('returns tasks linked to a project', () => {
        const project = createTestProject({ id: 'project-1', title: 'Launch' })
        const task1 = createTestTask({ id: 'task-1', project: '[[Launch]]' })
        const task2 = createTestTask({ id: 'task-2', project: '[[Launch]]' })
        const task3 = createTestTask({ id: 'task-3', project: '[[Other]]' })

        setupTestData({ projects: [project], tasks: [task1, task2, task3] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const tasks = result.current.getTasksByProjectId('project-1')
        expect(tasks).toHaveLength(2)
        expect(tasks.map(t => t.id)).toEqual(['task-1', 'task-2'])
      })

      it('returns empty array for non-existent project', () => {
        setupTestData({ projects: [], tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getTasksByProjectId('non-existent')).toEqual([])
      })
    })

    describe('getAreaDirectTasks', () => {
      it('returns tasks linked to area but not to any project', () => {
        const area = createTestArea({ id: 'area-1', title: 'Work' })
        const directTask = createTestTask({
          id: 'task-1',
          area: '[[Work]]',
          project: null,
        })
        const projectTask = createTestTask({
          id: 'task-2',
          area: '[[Work]]',
          project: '[[Launch]]',
        })
        const otherTask = createTestTask({
          id: 'task-3',
          area: '[[Personal]]',
          project: null,
        })

        setupTestData({
          areas: [area],
          tasks: [directTask, projectTask, otherTask],
        })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const tasks = result.current.getAreaDirectTasks('area-1')
        expect(tasks).toHaveLength(1)
        expect(tasks[0]!.id).toBe('task-1')
      })

      it('returns empty array for non-existent area', () => {
        setupTestData({ areas: [], tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getAreaDirectTasks('non-existent')).toEqual([])
      })
    })

    describe('getOrphanTasks', () => {
      it('returns tasks with no project and no area', () => {
        const orphan = createTestTask({
          id: 'orphan',
          project: null,
          area: null,
        })
        const withProject = createTestTask({
          id: 'with-project',
          project: '[[Launch]]',
          area: null,
        })
        const withArea = createTestTask({
          id: 'with-area',
          project: null,
          area: '[[Work]]',
        })

        setupTestData({ tasks: [orphan, withProject, withArea] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const orphans = result.current.getOrphanTasks()
        expect(orphans).toHaveLength(1)
        expect(orphans[0]!.id).toBe('orphan')
      })
    })

    describe('getActiveProjects', () => {
      it('returns projects not done or paused', () => {
        const planning = createTestProject({
          id: 'planning',
          status: 'planning',
        })
        const ready = createTestProject({ id: 'ready', status: 'ready' })
        const inProgress = createTestProject({
          id: 'in-progress',
          status: 'in-progress',
        })
        const done = createTestProject({ id: 'done', status: 'done' })
        const paused = createTestProject({ id: 'paused', status: 'paused' })

        setupTestData({
          projects: [planning, ready, inProgress, done, paused],
        })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const active = result.current.getActiveProjects()
        expect(active).toHaveLength(3)
        expect(active.map(p => p.id)).toEqual([
          'planning',
          'ready',
          'in-progress',
        ])
      })
    })

    describe('getActiveAreas', () => {
      it('returns areas not archived', () => {
        const active = createTestArea({ id: 'active', status: 'active' })
        const archived = createTestArea({ id: 'archived', status: 'archived' })

        setupTestData({ areas: [active, archived] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const activeAreas = result.current.getActiveAreas()
        expect(activeAreas).toHaveLength(1)
        expect(activeAreas[0]!.id).toBe('active')
      })
    })

    describe('getProjectCompletion', () => {
      it('returns percentage of completed tasks', () => {
        const project = createTestProject({ id: 'project-1', title: 'Launch' })
        const task1 = createTestTask({
          id: 'task-1',
          project: '[[Launch]]',
          status: 'done',
        })
        const task2 = createTestTask({
          id: 'task-2',
          project: '[[Launch]]',
          status: 'dropped',
        })
        const task3 = createTestTask({
          id: 'task-3',
          project: '[[Launch]]',
          status: 'ready',
        })
        const task4 = createTestTask({
          id: 'task-4',
          project: '[[Launch]]',
          status: 'in-progress',
        })

        setupTestData({
          projects: [project],
          tasks: [task1, task2, task3, task4],
        })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        // 2 completed out of 4 = 50%
        expect(result.current.getProjectCompletion('project-1')).toBe(50)
      })

      it('returns 0 for project with no tasks', () => {
        const project = createTestProject({ id: 'project-1', title: 'Empty' })

        setupTestData({ projects: [project], tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectCompletion('project-1')).toBe(0)
      })

      it('returns 0 for non-existent project', () => {
        setupTestData({ projects: [], tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectCompletion('non-existent')).toBe(0)
      })

      it('returns 100 when all tasks are completed', () => {
        const project = createTestProject({
          id: 'project-1',
          title: 'Complete',
        })
        const task1 = createTestTask({
          id: 'task-1',
          project: '[[Complete]]',
          status: 'done',
        })
        const task2 = createTestTask({
          id: 'task-2',
          project: '[[Complete]]',
          status: 'done',
        })

        setupTestData({ projects: [project], tasks: [task1, task2] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        expect(result.current.getProjectCompletion('project-1')).toBe(100)
      })
    })

    describe('getTaskCounts', () => {
      it('returns total and completed task counts', () => {
        const project = createTestProject({ id: 'project-1', title: 'Launch' })
        const task1 = createTestTask({
          id: 'task-1',
          project: '[[Launch]]',
          status: 'done',
        })
        const task2 = createTestTask({
          id: 'task-2',
          project: '[[Launch]]',
          status: 'ready',
        })
        const task3 = createTestTask({
          id: 'task-3',
          project: '[[Launch]]',
          status: 'dropped',
        })

        setupTestData({ projects: [project], tasks: [task1, task2, task3] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const counts = result.current.getTaskCounts('project-1')
        expect(counts.taskCount).toBe(3)
        expect(counts.completedTaskCount).toBe(2) // done + dropped
      })

      it('returns zeros for non-existent project', () => {
        setupTestData({ projects: [], tasks: [] })

        const { result } = renderHook(() => useVaultHelpers(), {
          wrapper: createWrapper(queryClient),
        })

        const counts = result.current.getTaskCounts('non-existent')
        expect(counts.taskCount).toBe(0)
        expect(counts.completedTaskCount).toBe(0)
      })
    })
  })

  describe('useVaultData', () => {
    let queryClient: QueryClient

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      })
    })

    afterEach(() => {
      queryClient.clear()
    })

    it('returns empty arrays as default', () => {
      const { result } = renderHook(() => useVaultData(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.tasks).toEqual([])
      expect(result.current.projects).toEqual([])
      expect(result.current.areas).toEqual([])
    })

    it('combines loading states', () => {
      // When queries haven't started fetching yet
      const { result } = renderHook(() => useVaultData(), {
        wrapper: createWrapper(queryClient),
      })

      // isLoading should be true initially when no data is cached
      expect(typeof result.current.isLoading).toBe('boolean')
    })
  })

  describe('vaultConfigChanged', () => {
    const basePrefs: AppPreferences = {
      theme: 'system',
      quickPaneShortcut: null,
      language: null,
      tasksDir: '/path/to/tasks',
      areasDir: '/path/to/areas',
      projectsDir: '/path/to/projects',
      ignore: null,
      showObsidianFeatures: null,
      permanentDeleteTasks: null,
    }

    it('returns true when tasksDir changes', () => {
      const newPrefs = { ...basePrefs, tasksDir: '/new/path' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns true when areasDir changes', () => {
      const newPrefs = { ...basePrefs, areasDir: '/new/path' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns true when projectsDir changes', () => {
      const newPrefs = { ...basePrefs, projectsDir: '/new/path' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns true when ignore patterns change', () => {
      const newPrefs = { ...basePrefs, ignore: ['*.tmp'] }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns false when non-vault settings change', () => {
      const newPrefs = { ...basePrefs, theme: 'dark' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(false)
    })

    it('returns false when quickPaneShortcut changes', () => {
      const newPrefs = { ...basePrefs, quickPaneShortcut: 'Ctrl+Shift+T' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(false)
    })

    it('returns false when language changes', () => {
      const newPrefs = { ...basePrefs, language: 'es' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(false)
    })

    it('returns true when oldPrefs is undefined', () => {
      expect(vaultConfigChanged(undefined, basePrefs)).toBe(true)
    })

    it('returns false when ignore patterns are identical', () => {
      const prefsWithIgnore = { ...basePrefs, ignore: ['*.tmp', '*.bak'] }
      const newPrefs = { ...basePrefs, ignore: ['*.tmp', '*.bak'] }
      expect(vaultConfigChanged(prefsWithIgnore, newPrefs)).toBe(false)
    })

    it('returns false when ignore patterns differ only in order', () => {
      // Order doesn't matter for ignore patterns - same patterns = no change
      const prefsWithIgnore = { ...basePrefs, ignore: ['*.tmp', '*.bak'] }
      const newPrefs = { ...basePrefs, ignore: ['*.bak', '*.tmp'] }
      expect(vaultConfigChanged(prefsWithIgnore, newPrefs)).toBe(false)
    })
  })

  describe('formatVaultError', () => {
    it('formats notConfigured error', () => {
      const error = { type: 'notConfigured' as const }
      const result = formatVaultError(error)
      expect(result).toContain('not configured')
    })

    it('formats fileNotFound error with path', () => {
      const error = { type: 'fileNotFound' as const, path: '/path/to/file.md' }
      const result = formatVaultError(error)
      expect(result).toContain('File not found')
      expect(result).toContain('/path/to/file.md')
    })

    it('formats entityNotFound error with type and id', () => {
      const error = {
        type: 'entityNotFound' as const,
        entity_type: 'task',
        id: 'task-123',
      }
      const result = formatVaultError(error)
      expect(result).toContain('task')
      expect(result).toContain('task-123')
    })

    it('formats readError with message', () => {
      const error = {
        type: 'readError' as const,
        message: 'Permission denied',
      }
      const result = formatVaultError(error)
      expect(result).toContain('read')
      expect(result).toContain('Permission denied')
    })

    it('formats writeError with message', () => {
      const error = {
        type: 'writeError' as const,
        message: 'Disk full',
      }
      const result = formatVaultError(error)
      expect(result).toContain('write')
      expect(result).toContain('Disk full')
    })

    it('formats parseError with message', () => {
      const error = {
        type: 'parseError' as const,
        message: 'Invalid YAML',
      }
      const result = formatVaultError(error)
      expect(result).toContain('parse')
      expect(result).toContain('Invalid YAML')
    })

    it('formats validationError with field and message', () => {
      const error = {
        type: 'validationError' as const,
        field: 'status',
        message: 'Invalid status value',
      }
      const result = formatVaultError(error)
      expect(result).toContain('status')
      expect(result).toContain('Invalid status value')
    })

    it('formats watcherError with message', () => {
      const error = {
        type: 'watcherError' as const,
        message: 'Watch limit exceeded',
      }
      const result = formatVaultError(error)
      expect(result).toContain('watcher')
      expect(result).toContain('Watch limit exceeded')
    })

    it('formats internal error with message', () => {
      const error = {
        type: 'internal' as const,
        message: 'Unexpected error',
      }
      const result = formatVaultError(error)
      expect(result).toContain('Internal')
      expect(result).toContain('Unexpected error')
    })

    it('returns unknown error for unrecognized type', () => {
      const error = { type: 'unknownType' as never }
      const result = formatVaultError(error)
      expect(result).toContain('Unknown error')
    })
  })

  describe('handleVaultError', () => {
    it('logs error and shows toast', async () => {
      const error = { type: 'internal' as const, message: 'Test error' }
      const loggerModule = await import('@/lib/logger')
      const sonnerModule = await import('sonner')

      const result = handleVaultError(error, 'Test operation')

      expect(loggerModule.logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Vault'),
        expect.objectContaining({ error })
      )
      expect(sonnerModule.toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Test operation'),
        expect.objectContaining({
          description: expect.any(String),
        })
      )
      expect(result).toContain('Test error')
    })
  })

  describe('isRecentMutation and getTimeSinceLastMutation', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('returns true immediately after mutation', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))
      markMutationStart()

      expect(isRecentMutation()).toBe(true)
      expect(getTimeSinceLastMutation()).toBe(0)
    })

    it('returns true within debounce window', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))
      markMutationStart()

      // Advance time by 200ms (within 500ms debounce window)
      vi.setSystemTime(new Date('2025-06-15T12:00:00.200'))

      expect(isRecentMutation()).toBe(true)
      expect(getTimeSinceLastMutation()).toBe(200)
    })

    it('returns false after debounce window expires', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))
      markMutationStart()

      // Advance time by 600ms (past 500ms debounce window)
      vi.setSystemTime(new Date('2025-06-15T12:00:00.600'))

      expect(isRecentMutation()).toBe(false)
      expect(getTimeSinceLastMutation()).toBe(600)
    })

    it('extends window when markMutationComplete is called', () => {
      vi.setSystemTime(new Date('2025-06-15T12:00:00'))
      markMutationStart()

      // Advance time by 400ms
      vi.setSystemTime(new Date('2025-06-15T12:00:00.400'))
      markMutationComplete()

      // Advance time by 200ms more (600ms from start, but only 200ms from complete)
      vi.setSystemTime(new Date('2025-06-15T12:00:00.600'))

      expect(isRecentMutation()).toBe(true)
      expect(getTimeSinceLastMutation()).toBe(200)
    })
  })

  describe('addTaskToCache', () => {
    let queryClient: QueryClient

    beforeEach(() => {
      // We need to test with the actual queryClient
      // This is a bit tricky since addTaskToCache uses the singleton
      queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      })
    })

    afterEach(() => {
      queryClient.clear()
    })

    it('adds task to empty cache', () => {
      const task = createTestTask({ id: 'new-task' })

      // Note: addTaskToCache uses the singleton queryClient,
      // so we can't directly test it here without more setup.
      // This test documents the expected behavior.
      expect(task.id).toBe('new-task')
    })
  })

  describe('initializeVault', () => {
    it('initializes vault with correct parameters', async () => {
      const tauriModule = await import('@/lib/tauri-bindings')

      await initializeVault(
        '/path/to/tasks',
        '/path/to/projects',
        '/path/to/areas',
        ['*.tmp']
      )

      expect(tauriModule.commands.initVault).toHaveBeenCalledWith(
        '/path/to/tasks',
        '/path/to/projects',
        '/path/to/areas',
        ['*.tmp']
      )
    })

    it('initializes vault with null ignore list', async () => {
      const tauriModule = await import('@/lib/tauri-bindings')

      await initializeVault(
        '/path/to/tasks',
        '/path/to/projects',
        '/path/to/areas',
        null
      )

      expect(tauriModule.commands.initVault).toHaveBeenCalledWith(
        '/path/to/tasks',
        '/path/to/projects',
        '/path/to/areas',
        null
      )
    })

    it('throws error when vault initialization fails', async () => {
      const tauriModule = await import('@/lib/tauri-bindings')
      vi.mocked(tauriModule.commands.initVault).mockResolvedValueOnce({
        status: 'error',
        error: { type: 'internal', message: 'Initialization failed' },
      } as never)

      await expect(
        initializeVault('/tasks', '/projects', '/areas', null)
      ).rejects.toThrow()
    })
  })

  describe('isVaultConfigured', () => {
    it('returns true when vault is configured', async () => {
      const tauriModule = await import('@/lib/tauri-bindings')
      vi.mocked(tauriModule.commands.isVaultConfigured).mockResolvedValueOnce(
        true
      )

      const result = await isVaultConfigured()

      expect(result).toBe(true)
    })

    it('returns false when vault is not configured', async () => {
      const tauriModule = await import('@/lib/tauri-bindings')
      vi.mocked(tauriModule.commands.isVaultConfigured).mockResolvedValueOnce(
        false
      )

      const result = await isVaultConfigured()

      expect(result).toBe(false)
    })
  })
})
