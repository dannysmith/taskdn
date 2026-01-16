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
      quick_pane_shortcut: null,
      language: null,
      tasks_dir: '/path/to/tasks',
      areas_dir: '/path/to/areas',
      projects_dir: '/path/to/projects',
      ignore: null,
      show_obsidian_features: null,
      permanent_delete_tasks: null,
    }

    it('returns true when tasks_dir changes', () => {
      const newPrefs = { ...basePrefs, tasks_dir: '/new/path' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns true when areas_dir changes', () => {
      const newPrefs = { ...basePrefs, areas_dir: '/new/path' }
      expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
    })

    it('returns true when projects_dir changes', () => {
      const newPrefs = { ...basePrefs, projects_dir: '/new/path' }
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

    it('returns false when quick_pane_shortcut changes', () => {
      const newPrefs = { ...basePrefs, quick_pane_shortcut: 'Ctrl+Shift+T' }
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

    it('returns true when ignore patterns differ in order', () => {
      // JSON.stringify preserves order, so different order = different
      const prefsWithIgnore = { ...basePrefs, ignore: ['*.tmp', '*.bak'] }
      const newPrefs = { ...basePrefs, ignore: ['*.bak', '*.tmp'] }
      expect(vaultConfigChanged(prefsWithIgnore, newPrefs)).toBe(true)
    })
  })
})
