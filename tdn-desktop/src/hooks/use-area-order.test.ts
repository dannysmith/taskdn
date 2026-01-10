import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAreaOrder } from './use-area-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'

describe('useAreaOrder', () => {
  beforeEach(() => {
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
  })

  describe('orderedIds', () => {
    it('returns natural order when no stored order exists', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2'])
    })

    it('returns stored order for specific area', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      useDisplayOrderStore.setState({
        areaTaskOrder: {
          'area-1': ['task-2', 'task-1'],
          'area-2': ['task-3'], // Different area
        },
      })

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-2', 'task-1'])
    })

    it('filters out deleted tasks', () => {
      const tasks = [createTestTask({ id: 'task-1' })]

      useDisplayOrderStore.setState({
        areaTaskOrder: {
          'area-1': ['task-2', 'task-1'], // task-2 no longer exists
        },
      })

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-1'])
    })

    it('appends new tasks to end', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }), // New task
      ]

      useDisplayOrderStore.setState({
        areaTaskOrder: {
          'area-1': ['task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-2', 'task-1', 'task-3'])
    })
  })

  describe('setOrder', () => {
    it('updates store for specific area', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      act(() => {
        result.current.setOrder([tasks[1], tasks[0]])
      })

      expect(useDisplayOrderStore.getState().areaTaskOrder).toEqual({
        'area-1': ['task-2', 'task-1'],
      })
    })

    it('preserves other area orders', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      useDisplayOrderStore.setState({
        areaTaskOrder: {
          'area-2': ['task-3', 'task-4'],
        },
      })

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))

      act(() => {
        result.current.setOrder([tasks[1], tasks[0]])
      })

      expect(useDisplayOrderStore.getState().areaTaskOrder).toEqual({
        'area-2': ['task-3', 'task-4'],
        'area-1': ['task-2', 'task-1'],
      })
    })
  })

  describe('getOrderedTasks', () => {
    it('returns Task objects in display order', () => {
      const task1 = createTestTask({ id: 'task-1', title: 'First' })
      const task2 = createTestTask({ id: 'task-2', title: 'Second' })
      const tasks = [task1, task2]

      useDisplayOrderStore.setState({
        areaTaskOrder: {
          'area-1': ['task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useAreaOrder('area-1', tasks))
      const orderedTasks = result.current.getOrderedTasks()

      expect(orderedTasks[0].title).toBe('Second')
      expect(orderedTasks[1].title).toBe('First')
    })
  })

  describe('multiple areas', () => {
    it('maintains separate order per area', () => {
      const tasks1 = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]
      const tasks2 = [
        createTestTask({ id: 'task-3' }),
        createTestTask({ id: 'task-4' }),
      ]

      const { result: result1 } = renderHook(() => useAreaOrder('area-1', tasks1))
      const { result: result2 } = renderHook(() => useAreaOrder('area-2', tasks2))

      act(() => {
        result1.current.setOrder([tasks1[1], tasks1[0]])
      })

      act(() => {
        result2.current.setOrder([tasks2[1], tasks2[0]])
      })

      expect(useDisplayOrderStore.getState().areaTaskOrder).toEqual({
        'area-1': ['task-2', 'task-1'],
        'area-2': ['task-4', 'task-3'],
      })
    })
  })
})
