import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useKanbanOrder } from './use-kanban-order'
import { useDisplayOrderStore } from '@/store/display-order-store'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task, TaskStatus } from '@/lib/tauri-bindings'

describe('useKanbanOrder', () => {
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

  const createTasksByStatus = (
    overrides?: Partial<Record<TaskStatus, Task[]>>
  ): Map<TaskStatus, Task[]> => {
    const map = new Map<TaskStatus, Task[]>()
    map.set('ready', overrides?.ready ?? [])
    map.set('in-progress', overrides?.['in-progress'] ?? [])
    map.set('blocked', overrides?.blocked ?? [])
    map.set('done', overrides?.done ?? [])
    return map
  }

  describe('orderedIdsByStatus', () => {
    it('returns natural order when no stored order exists', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2],
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual([
        'task-1',
        'task-2',
      ])
    })

    it('returns stored order for a column', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-2', 'task-1'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual([
        'task-2',
        'task-1',
      ])
    })

    it('filters out deleted tasks from stored order', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1], // task-2 removed
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-2', 'task-1'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual(['task-1'])
    })

    it('appends new tasks to end of stored order', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const task3 = createTestTask({ id: 'task-3', status: 'ready' }) // New task
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2, task3],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-2', 'task-1'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual([
        'task-2',
        'task-1',
        'task-3',
      ])
    })

    it('handles multiple columns independently', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'in-progress' })
      const task3 = createTestTask({ id: 'task-3', status: 'in-progress' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1],
        'in-progress': [task2, task3],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-1'],
            'in-progress': ['task-3', 'task-2'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual(['task-1'])
      expect(result.current.orderedIdsByStatus.get('in-progress')).toEqual([
        'task-3',
        'task-2',
      ])
    })
  })

  describe('setColumnOrder', () => {
    it('updates store for specific column', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2],
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      act(() => {
        result.current.setColumnOrder('ready', [task2, task1])
      })

      expect(
        useDisplayOrderStore.getState().kanbanColumnOrder?.['project-1']?.ready
      ).toEqual(['task-2', 'task-1'])
    })

    it('preserves other column orders', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'in-progress' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1],
        'in-progress': [task2],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            'in-progress': ['task-2'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      act(() => {
        result.current.setColumnOrder('ready', [task1])
      })

      const columns = useDisplayOrderStore.getState().kanbanColumnOrder?.[
        'project-1'
      ]
      expect(columns?.ready).toEqual(['task-1'])
      expect(columns?.['in-progress']).toEqual(['task-2'])
    })

    it('preserves other view orders', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-2': {
            ready: ['task-other'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      act(() => {
        result.current.setColumnOrder('ready', [task1])
      })

      const store = useDisplayOrderStore.getState().kanbanColumnOrder
      expect(store?.['project-1']?.ready).toEqual(['task-1'])
      expect(store?.['project-2']?.ready).toEqual(['task-other'])
    })
  })

  describe('getOrderedTaskIds', () => {
    it('returns ordered IDs for a status', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-2', 'task-1'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.getOrderedTaskIds('ready')).toEqual([
        'task-2',
        'task-1',
      ])
    })

    it('returns empty array for status with no tasks', () => {
      const tasksByStatus = createTasksByStatus({
        ready: [],
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      expect(result.current.getOrderedTaskIds('ready')).toEqual([])
    })
  })

  describe('getOrderedTasks', () => {
    it('returns Task objects in display order', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready', title: 'First' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready', title: 'Second' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1, task2],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-2', 'task-1'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      const orderedTasks = result.current.getOrderedTasks('ready')
      expect(orderedTasks[0].title).toBe('Second')
      expect(orderedTasks[1].title).toBe('First')
    })

    it('handles missing tasks gracefully', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const tasksByStatus = createTasksByStatus({
        ready: [task1],
      })

      // Stored order references non-existent task
      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            ready: ['task-1', 'task-nonexistent'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      const orderedTasks = result.current.getOrderedTasks('ready')
      expect(orderedTasks).toHaveLength(1)
      expect(orderedTasks[0].id).toBe('task-1')
    })
  })

  describe('getOrderedTasksByStatus', () => {
    it('returns all columns with ordered tasks', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready', title: 'Ready1' })
      const task2 = createTestTask({
        id: 'task-2',
        status: 'in-progress',
        title: 'InProgress1',
      })
      const task3 = createTestTask({
        id: 'task-3',
        status: 'in-progress',
        title: 'InProgress2',
      })
      const tasksByStatus = createTasksByStatus({
        ready: [task1],
        'in-progress': [task2, task3],
      })

      useDisplayOrderStore.setState({
        kanbanColumnOrder: {
          'project-1': {
            'in-progress': ['task-3', 'task-2'],
          },
        },
      })

      const { result } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus)
      )

      const allOrdered = result.current.getOrderedTasksByStatus()

      expect(allOrdered.get('ready')?.map(t => t.title)).toEqual(['Ready1'])
      expect(allOrdered.get('in-progress')?.map(t => t.title)).toEqual([
        'InProgress2',
        'InProgress1',
      ])
    })
  })

  describe('multiple views', () => {
    it('maintains separate order per view ID', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })

      const tasksByStatus1 = createTasksByStatus({ ready: [task1, task2] })
      const tasksByStatus2 = createTasksByStatus({ ready: [task1, task2] })

      const { result: result1 } = renderHook(() =>
        useKanbanOrder('project-1', tasksByStatus1)
      )
      const { result: result2 } = renderHook(() =>
        useKanbanOrder('project-2', tasksByStatus2)
      )

      act(() => {
        result1.current.setColumnOrder('ready', [task2, task1])
      })

      act(() => {
        result2.current.setColumnOrder('ready', [task1, task2])
      })

      const store = useDisplayOrderStore.getState().kanbanColumnOrder
      expect(store?.['project-1']?.ready).toEqual(['task-2', 'task-1'])
      expect(store?.['project-2']?.ready).toEqual(['task-1', 'task-2'])
    })
  })

  describe('reactivity', () => {
    it('updates when tasks change', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const initialTasksByStatus = createTasksByStatus({ ready: [task1] })

      const { result, rerender } = renderHook(
        ({ tasksByStatus }) => useKanbanOrder('project-1', tasksByStatus),
        { initialProps: { tasksByStatus: initialTasksByStatus } }
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual(['task-1'])

      // Add a new task
      const task2 = createTestTask({ id: 'task-2', status: 'ready' })
      const newTasksByStatus = createTasksByStatus({ ready: [task1, task2] })
      rerender({ tasksByStatus: newTasksByStatus })

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual([
        'task-1',
        'task-2',
      ])
    })

    it('handles task moving between columns', () => {
      const task1 = createTestTask({ id: 'task-1', status: 'ready' })
      const initialTasksByStatus = createTasksByStatus({ ready: [task1] })

      const { result, rerender } = renderHook(
        ({ tasksByStatus }) => useKanbanOrder('project-1', tasksByStatus),
        { initialProps: { tasksByStatus: initialTasksByStatus } }
      )

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual(['task-1'])
      expect(result.current.orderedIdsByStatus.get('in-progress')).toEqual([])

      // Move task to in-progress
      const task1Moved = { ...task1, status: 'in-progress' as TaskStatus }
      const newTasksByStatus = createTasksByStatus({
        ready: [],
        'in-progress': [task1Moved],
      })
      rerender({ tasksByStatus: newTasksByStatus })

      expect(result.current.orderedIdsByStatus.get('ready')).toEqual([])
      expect(result.current.orderedIdsByStatus.get('in-progress')).toEqual([
        'task-1',
      ])
    })
  })
})
