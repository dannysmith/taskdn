import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createTaskOrderHook, createKeyedTaskOrderHook } from './use-task-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task } from '@/lib/tauri-bindings'

describe('createTaskOrderHook (non-keyed factory)', () => {
  // Create a test hook using the factory
  const useTestOrder = createTaskOrderHook({
    getStoredOrder: state => state.inboxOrder,
    setStoredOrder: ids => {
      useDisplayOrderStore.getState().setInboxOrder(ids)
    },
  })

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
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useTestOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('returns stored order when it exists', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      useDisplayOrderStore.setState({
        inboxOrder: ['task-3', 'task-1', 'task-2'],
      })

      const { result } = renderHook(() => useTestOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1', 'task-2'])
    })

    it('filters out deleted tasks from stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-3' }),
      ]

      useDisplayOrderStore.setState({
        inboxOrder: ['task-3', 'task-2', 'task-1'],
      })

      const { result } = renderHook(() => useTestOrder(tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1'])
    })

    it('appends new tasks to end of stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
        createTestTask({ id: 'task-4' }),
      ]

      useDisplayOrderStore.setState({
        inboxOrder: ['task-2', 'task-1', 'task-3'],
      })

      const { result } = renderHook(() => useTestOrder(tasks))

      expect(result.current.orderedIds).toEqual([
        'task-2',
        'task-1',
        'task-3',
        'task-4',
      ])
    })

    it('handles empty task list', () => {
      const tasks: Task[] = []

      const { result } = renderHook(() => useTestOrder(tasks))

      expect(result.current.orderedIds).toEqual([])
    })
  })

  describe('setOrder', () => {
    it('updates store with reordered task IDs', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useTestOrder(tasks))

      act(() => {
        result.current.setOrder([tasks[2]!, tasks[0]!, tasks[1]!])
      })

      expect(useDisplayOrderStore.getState().inboxOrder).toEqual([
        'task-3',
        'task-1',
        'task-2',
      ])
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

      const { result } = renderHook(() => useTestOrder(tasks))
      const orderedTasks = result.current.getOrderedTasks()

      expect(orderedTasks).toHaveLength(3)
      expect(orderedTasks[0]!.id).toBe('task-3')
      expect(orderedTasks[1]!.id).toBe('task-1')
      expect(orderedTasks[2]!.id).toBe('task-2')
    })
  })
})

describe('createKeyedTaskOrderHook (keyed factory)', () => {
  // Create a test hook using the keyed factory
  const useTestKeyedOrder = createKeyedTaskOrderHook({
    getOrderMap: state => state.projectTaskOrder,
    setStoredOrder: (key, ids) => {
      useDisplayOrderStore.getState().setProjectTaskOrder(key, ids)
    },
  })

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
    it('returns natural order when no stored order exists for key', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2', 'task-3'])
    })

    it('returns stored order for specific key', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-1': ['task-3', 'task-1', 'task-2'],
          'project-2': ['task-1', 'task-2', 'task-3'],
        },
      })

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1', 'task-2'])
    })

    it('isolates order between different keys', () => {
      const tasks1 = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]
      const tasks2 = [
        createTestTask({ id: 'task-3' }),
        createTestTask({ id: 'task-4' }),
      ]

      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-1': ['task-2', 'task-1'],
          'project-2': ['task-4', 'task-3'],
        },
      })

      const { result: result1 } = renderHook(() =>
        useTestKeyedOrder('project-1', tasks1)
      )
      const { result: result2 } = renderHook(() =>
        useTestKeyedOrder('project-2', tasks2)
      )

      expect(result1.current.orderedIds).toEqual(['task-2', 'task-1'])
      expect(result2.current.orderedIds).toEqual(['task-4', 'task-3'])
    })

    it('filters out deleted tasks from stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-3' }),
      ]

      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-1': ['task-3', 'task-2', 'task-1'],
        },
      })

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-3', 'task-1'])
    })

    it('appends new tasks to end of stored order', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
        createTestTask({ id: 'task-4' }),
      ]

      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-1': ['task-2', 'task-1', 'task-3'],
        },
      })

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      expect(result.current.orderedIds).toEqual([
        'task-2',
        'task-1',
        'task-3',
        'task-4',
      ])
    })
  })

  describe('setOrder', () => {
    it('updates store with reordered task IDs for specific key', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
        createTestTask({ id: 'task-3' }),
      ]

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      act(() => {
        result.current.setOrder([tasks[2]!, tasks[0]!, tasks[1]!])
      })

      expect(useDisplayOrderStore.getState().projectTaskOrder).toEqual({
        'project-1': ['task-3', 'task-1', 'task-2'],
      })
    })

    it('does not affect other keys when updating', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      // Set up existing order for project-2
      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-2': ['task-a', 'task-b'],
        },
      })

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      act(() => {
        result.current.setOrder([tasks[1]!, tasks[0]!])
      })

      const state = useDisplayOrderStore.getState().projectTaskOrder
      expect(state).toEqual({
        'project-1': ['task-2', 'task-1'],
        'project-2': ['task-a', 'task-b'],
      })
    })
  })

  describe('getOrderedTasks', () => {
    it('returns Task objects in display order', () => {
      const task1 = createTestTask({ id: 'task-1', title: 'First Task' })
      const task2 = createTestTask({ id: 'task-2', title: 'Second Task' })
      const task3 = createTestTask({ id: 'task-3', title: 'Third Task' })
      const tasks = [task1, task2, task3]

      useDisplayOrderStore.setState({
        projectTaskOrder: {
          'project-1': ['task-3', 'task-1', 'task-2'],
        },
      })

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))
      const orderedTasks = result.current.getOrderedTasks()

      expect(orderedTasks).toHaveLength(3)
      expect(orderedTasks[0]!.id).toBe('task-3')
      expect(orderedTasks[1]!.id).toBe('task-1')
      expect(orderedTasks[2]!.id).toBe('task-2')
    })
  })

  describe('reactivity', () => {
    it('updates orderedIds when store changes for specific key', () => {
      const tasks = [
        createTestTask({ id: 'task-1' }),
        createTestTask({ id: 'task-2' }),
      ]

      const { result } = renderHook(() => useTestKeyedOrder('project-1', tasks))

      expect(result.current.orderedIds).toEqual(['task-1', 'task-2'])

      act(() => {
        useDisplayOrderStore
          .getState()
          .setProjectTaskOrder('project-1', ['task-2', 'task-1'])
      })

      expect(result.current.orderedIds).toEqual(['task-2', 'task-1'])
    })
  })
})
