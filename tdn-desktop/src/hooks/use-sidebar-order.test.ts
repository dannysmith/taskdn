import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarOrder } from './use-sidebar-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { ORPHAN_CONTAINER_ID } from '@/types/sidebar-order'
import {
  createTestArea,
  createTestProject,
  resetFactoryCounters,
} from '@/test/helpers/vault'
import type { Area, Project } from '@/lib/tauri-bindings'

// Mock the vault service
const mockUpdateProjectMutate = vi.fn()

vi.mock('@/services/vault', () => ({
  useVaultData: vi.fn(),
  useVaultHelpers: vi.fn(),
  useUpdateProject: vi.fn(() => ({
    mutate: mockUpdateProjectMutate,
  })),
}))

// Import after mocking to get the mocked versions
import { useVaultData, useVaultHelpers } from '@/services/vault'

const mockUseVaultData = vi.mocked(useVaultData)
const mockUseVaultHelpers = vi.mocked(useVaultHelpers)

describe('useSidebarOrder', () => {
  // Test data
  let area1: Area
  let area2: Area
  let archivedArea: Area
  let project1: Project
  let project2: Project
  let orphanProject: Project

  beforeEach(() => {
    // Reset all mocks and state
    vi.clearAllMocks()
    useDisplayOrderStore.setState({
      sidebarAreaOrder: null,
      sidebarProjectOrder: null,
      inboxOrder: null,
      projectTaskOrder: null,
      areaTaskOrder: null,
      todaySectionOrder: null,
      todayHeadings: null,
      kanbanColumnOrder: null,
    })
    resetFactoryCounters()

    // Create test data
    area1 = createTestArea({ id: 'area-1', title: 'Work', status: 'active' })
    area2 = createTestArea({
      id: 'area-2',
      title: 'Personal',
      status: 'active',
    })
    archivedArea = createTestArea({
      id: 'area-3',
      title: 'Archived',
      status: 'archived',
    })

    project1 = createTestProject({
      id: 'project-1',
      title: 'Project One',
      area: '[[Work]]',
    })
    project2 = createTestProject({
      id: 'project-2',
      title: 'Project Two',
      area: '[[Work]]',
    })
    orphanProject = createTestProject({
      id: 'orphan-project',
      title: 'Orphan Project',
      area: null,
    })

    // Setup default mocks
    mockUseVaultData.mockReturnValue({
      tasks: [],
      projects: [project1, project2, orphanProject],
      areas: [area1, area2, archivedArea],
      isLoading: false,
      isError: false,
      error: null,
    })

    mockUseVaultHelpers.mockReturnValue({
      getTaskById: vi.fn(),
      getProjectById: vi.fn(),
      getAreaById: vi.fn(),
      getProjectsByAreaId: vi.fn(),
      getOrphanProjects: vi.fn(),
      getTasksByProjectId: vi.fn(),
      getAreaDirectTasks: vi.fn(),
      getOrphanTasks: vi.fn(),
      getActiveProjects: vi.fn(),
      getActiveAreas: vi.fn(() => [area1, area2]),
      getProjectCompletion: vi.fn(),
      getTaskCounts: vi.fn(),
    })
  })

  describe('orderedAreas', () => {
    it('returns active areas in natural order when no stored order', () => {
      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedAreas).toHaveLength(2)
      expect(result.current.orderedAreas[0]!.id).toBe('area-1')
      expect(result.current.orderedAreas[1]!.id).toBe('area-2')
    })

    it('returns areas in stored order', () => {
      useDisplayOrderStore.setState({
        sidebarAreaOrder: ['area-2', 'area-1'],
      })

      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedAreas[0]!.id).toBe('area-2')
      expect(result.current.orderedAreas[1]!.id).toBe('area-1')
    })

    it('filters out deleted areas from stored order', () => {
      useDisplayOrderStore.setState({
        sidebarAreaOrder: ['area-nonexistent', 'area-1'],
      })

      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedAreas).toHaveLength(1)
      expect(result.current.orderedAreas[0]!.id).toBe('area-1')
    })

    it('excludes archived areas', () => {
      // getActiveAreas already filters archived areas
      const { result } = renderHook(() => useSidebarOrder())

      const areaIds = result.current.orderedAreas.map(a => a.id)
      expect(areaIds).not.toContain('area-3')
    })
  })

  describe('order property', () => {
    it('contains areaOrder and projectOrder', () => {
      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.order).toHaveProperty('areaOrder')
      expect(result.current.order).toHaveProperty('projectOrder')
    })

    it('builds projectOrder for all containers', () => {
      const { result } = renderHook(() => useSidebarOrder())

      // Should have entries for area-1, area-2, and orphan container
      expect(result.current.order.projectOrder).toHaveProperty('area-1')
      expect(result.current.order.projectOrder).toHaveProperty('area-2')
      expect(result.current.order.projectOrder).toHaveProperty(
        ORPHAN_CONTAINER_ID
      )
    })
  })

  describe('getOrderedProjects', () => {
    it('returns projects for an area in natural order', () => {
      const { result } = renderHook(() => useSidebarOrder())

      const projects = result.current.getOrderedProjects('area-1')

      // Natural order based on useVaultData projects filtered by area
      // (Projects with area containing area title)
      expect(projects.map(p => p.id)).toEqual(['project-1', 'project-2'])
    })

    it('returns projects in stored order', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-2', 'project-1'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      const projects = result.current.getOrderedProjects('area-1')
      expect(projects.map(p => p.id)).toEqual(['project-2', 'project-1'])
    })

    it('filters out deleted projects', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-nonexistent', 'project-1'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      const projects = result.current.getOrderedProjects('area-1')
      expect(projects.map(p => p.id)).toEqual(['project-1'])
    })
  })

  describe('orderedOrphanProjects', () => {
    it('returns projects without area', () => {
      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedOrphanProjects.map(p => p.id)).toContain(
        'orphan-project'
      )
    })

    it('respects stored order for orphan container', () => {
      // Add another orphan project for order testing
      const orphan2 = createTestProject({
        id: 'orphan-2',
        title: 'Orphan 2',
        area: null,
      })

      mockUseVaultData.mockReturnValue({
        tasks: [],
        projects: [project1, project2, orphanProject, orphan2],
        areas: [area1, area2],
        isLoading: false,
        isError: false,
        error: null,
      })

      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          [ORPHAN_CONTAINER_ID]: ['orphan-2', 'orphan-project'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedOrphanProjects.map(p => p.id)).toEqual([
        'orphan-2',
        'orphan-project',
      ])
    })
  })

  describe('reorderAreas', () => {
    it('updates store with new area order', () => {
      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.reorderAreas('area-2', 'area-1')
      })

      expect(useDisplayOrderStore.getState().sidebarAreaOrder).toEqual([
        'area-2',
        'area-1',
      ])
    })

    it('does nothing if area IDs are invalid', () => {
      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.reorderAreas('nonexistent', 'area-1')
      })

      // Should not have set any order
      expect(useDisplayOrderStore.getState().sidebarAreaOrder).toBeNull()
    })
  })

  describe('reorderProjectsInArea', () => {
    it('updates store with new project order within container', () => {
      // Set initial order so we have something to reorder
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1', 'project-2'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.reorderProjectsInArea('area-1', 'project-2', 'project-1')
      })

      expect(
        useDisplayOrderStore.getState().sidebarProjectOrder?.['area-1']
      ).toEqual(['project-2', 'project-1'])
    })

    it('preserves other container orders', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1', 'project-2'],
          'area-2': ['other-project'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.reorderProjectsInArea('area-1', 'project-2', 'project-1')
      })

      expect(
        useDisplayOrderStore.getState().sidebarProjectOrder?.['area-2']
      ).toEqual(['other-project'])
    })
  })

  describe('moveProjectToArea', () => {
    it('updates visual order in both containers', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1', 'project-2'],
          'area-2': [],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.moveProjectToArea('project-1', 'area-1', 'area-2')
      })

      const state = useDisplayOrderStore.getState().sidebarProjectOrder
      expect(state?.['area-1']).toEqual(['project-2'])
      expect(state?.['area-2']).toEqual(['project-1'])
    })

    it('calls mutation to update project area', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1'],
          'area-2': [],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.moveProjectToArea('project-1', 'area-1', 'area-2')
      })

      expect(mockUpdateProjectMutate).toHaveBeenCalledWith({
        id: 'project-1',
        area: 'Personal', // area-2's title
        title: null,
        status: null,
        description: null,
        startDate: null,
        endDate: null,
        body: null,
      })
    })

    it('clears area when moving to orphan container', () => {
      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1'],
          [ORPHAN_CONTAINER_ID]: [],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        result.current.moveProjectToArea(
          'project-1',
          'area-1',
          ORPHAN_CONTAINER_ID
        )
      })

      expect(mockUpdateProjectMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'project-1',
          area: '',
        })
      )
    })

    it('inserts at specified index', () => {
      const project3 = createTestProject({
        id: 'project-3',
        title: 'Project Three',
        area: '[[Personal]]',
      })

      mockUseVaultData.mockReturnValue({
        tasks: [],
        projects: [project1, project2, orphanProject, project3],
        areas: [area1, area2],
        isLoading: false,
        isError: false,
        error: null,
      })

      useDisplayOrderStore.setState({
        sidebarProjectOrder: {
          'area-1': ['project-1', 'project-2'],
          'area-2': ['project-3'],
        },
      })

      const { result } = renderHook(() => useSidebarOrder())

      act(() => {
        // Move project-1 to area-2 at index 0 (before project-3)
        result.current.moveProjectToArea('project-1', 'area-1', 'area-2', 0)
      })

      const state = useDisplayOrderStore.getState().sidebarProjectOrder
      expect(state?.['area-2']).toEqual(['project-1', 'project-3'])
    })
  })

  describe('data reactivity', () => {
    it('updates when vault data changes', () => {
      const { result, rerender } = renderHook(() => useSidebarOrder())

      expect(result.current.orderedAreas).toHaveLength(2)

      // Add a new area
      const area3 = createTestArea({
        id: 'area-3',
        title: 'New Area',
        status: 'active',
      })
      mockUseVaultHelpers.mockReturnValue({
        ...mockUseVaultHelpers(),
        getActiveAreas: vi.fn(() => [area1, area2, area3]),
      })

      rerender()

      expect(result.current.orderedAreas).toHaveLength(3)
    })
  })
})
