import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInboxOrder } from './use-inbox-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task } from '@/lib/tauri-bindings'

describe('useInboxOrder', () => {
  beforeEach(() => {
    // Reset store and factory counters before each test
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
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('returns stored order when it exists', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      // Set a stored order
      useDisplayOrderStore.setState({
        inboxOrder: ['task-3', 'task-1', 'task-2'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1', 'task-2'])
    })

    it('filters out deleted tasks from stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-3' }),
      ]

      // Stored order includes task-2 which no longer exists
      useDisplayOrderStore.setState({
        inboxOrder: ['task-3', 'task-2', 'task-1'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1'])
    })

    it('appends new tasks to end of stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
        createTestTask({ id: 'task-4' }), // New task
      ]

      // Stored order only has first 3 tasks
      useDisplayOrderStore.setState({
        inboxOrder: ['task-2', 'task-1', 'task-3'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual([
        'task-2',
        'task-1',
        'task-3',
        'task-4',
      ])
    })

    it('handles empty task list', () => {
      const tasks: Task[] = []

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual([])
    })

    it('handles empty stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      useDisplayOrderStore.setState({
        inboxOrder: [],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))

      // Empty stored order preserves nothing, appends all as new
      expect(result.current.orderedIds).toEqual(['task-1', 'task-2'])
    })
  })

  describe('setOrder', () => {
    it('updates store with reordered task IDs', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useInboxOrder(tasks))

      act(() => {
        // Simulate reorder: move task-3 to front
        result.current.setOrder([tasks[2], tasks[0], tasks[1]])
      })

      expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
        'task-3',
        'task-1',
        'task-2',
      ])
    })

    it('can be called multiple times to update order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result } = renderHook(() => useInboxOrder(tasks))

      act(() => {
        result.current.setOrder([tasks[1], tasks[0]])
      })

      expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
        'task-2',
        'task-1',
      ])

      act(() => {
        result.current.setOrder([tasks[0], tasks[1]])
      })

      expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
        'task-1',
        'task-2',
      ])
    })
  })

  describe('getOrderedTaskIds', () => {
    it('returns the same as orderedIds', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      useDisplayOrderStore.setState({
        inboxOrder: ['task-2', 'task-1'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.getOrderedTaskIds()).toEqual(result.current.orderedIds)
      expect(result.current.getOrderedTaskIds()).toEqual(['task-2', 'task-1'])
    })
  })

  describe('getOrderedTasks', () => {
    it('returns Task objects in display order', () => {
      const task1 = createTestTask({ id: 'task-1', title: 'First Task' })
      const task2 = createTestTask({ id: 'task-2', title: 'Second Task' })
      const task3 = createTestTask({ id: 'task-3', title: 'Third Task' })
      const tasks = [task1, task2, task3]

      useDisplayOrderStore.setState({
        inboxOrder: ['task-3', 'task-1', 'task-2'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))
      const orderedTasks = result.current.getOrderedTasks()

      expect(orderedTasks).toHaveLength(3)
      expect(orderedTasks[0].id).toBe('task-3')
      expect(orderedTasks[0].title).toBe('Third Task')
      expect(orderedTasks[1].id).toBe('task-1')
      expect(orderedTasks[2].id).toBe('task-2')
    })

    it('handles tasks that dont exist in map gracefully', () => {
      const tasks = [createTestTask({ id: 'task-1' })]

      // Stored order references non-existent task
      useDisplayOrderStore.setState({
        inboxOrder: ['task-1', 'task-nonexistent'],
      })

      const { result } = renderHook(() => useInboxOrder(tasks))
      const orderedTasks = result.current.getOrderedTasks()

      // Non-existent task is filtered out by orderedIds, so getOrderedTasks only has task-1
      expect(orderedTasks).toHaveLength(1)
      expect(orderedTasks[0].id).toBe('task-1')
    })
  })

  describe('reactivity', () => {
    it('updates orderedIds when tasks change', () => {
      const initialTasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result, rerender } = renderHook(({ tasks }) => useInboxOrder(tasks), {
        initialProps: { tasks: initialTasks },
      })

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2'])

      // Add a new task
      const newTask = createTestTask({ id: 'task-3' })
      rerender({ tasks: [...initialTasks, newTask] })

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('updates orderedIds when store changes', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result } = renderHook(() => useInboxOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2'])

      act(() => {
        useDisplayOrderStore.getState().setInboxOrder(['task-2', 'task-1'])
      })

      expect(result.current.orderedIds).toEqual(['task-2', 'task-1'])
    })
  })
})
