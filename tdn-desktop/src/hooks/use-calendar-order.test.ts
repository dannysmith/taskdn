import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCalendarOrder } from './use-calendar-order'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task } from '@/lib/tauri-bindings'

describe('useCalendarOrder', () => {
  beforeEach(() => {
    resetFactoryCounters()
  })

  const createOptions = (overrides?: {
    tasks?: Task[]
    dates?: string[]
    tasksByDate?: Record<string, Task[]>
  }) => {
    const dates = overrides?.dates ?? ['2025-01-13', '2025-01-14', '2025-01-15']
    const tasks = overrides?.tasks ?? []
    const tasksByDate = overrides?.tasksByDate ?? {}

    return {
      tasks,
      dates,
      getTasksForDate: (date: string) => tasksByDate[date] ?? [],
    }
  }

  describe('initial order', () => {
    it('returns natural order from getTasksForDate', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })
      const task3 = createTestTask({ id: 'task-3', scheduled: '2025-01-14' })

      const options = createOptions({
        tasks: [task1, task2, task3],
        dates: ['2025-01-13', '2025-01-14'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
          '2025-01-14': [task3],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-1',
        'task-2',
      ])
      expect(result.current.getOrderedTaskIds('2025-01-14')).toEqual(['task-3'])
    })

    it('returns empty array for date with no tasks', () => {
      const options = createOptions({
        tasks: [],
        dates: ['2025-01-13'],
        tasksByDate: {},
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([])
    })
  })

  describe('getOrderedTaskIds', () => {
    it('returns task IDs for a date in order', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-1',
        'task-2',
      ])
    })

    it('returns empty array for unknown date', () => {
      const options = createOptions({
        tasks: [],
        dates: ['2025-01-13'],
        tasksByDate: {},
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getOrderedTaskIds('2025-01-20')).toEqual([])
    })
  })

  describe('getOrderedTasks', () => {
    it('returns Task objects in display order', () => {
      const task1 = createTestTask({
        id: 'task-1',
        title: 'First',
        scheduled: '2025-01-13',
      })
      const task2 = createTestTask({
        id: 'task-2',
        title: 'Second',
        scheduled: '2025-01-13',
      })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      const orderedTasks = result.current.getOrderedTasks('2025-01-13', [task1, task2])
      expect(orderedTasks[0].title).toBe('First')
      expect(orderedTasks[1].title).toBe('Second')
    })

    it('filters out tasks not in provided array', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      // Only pass task1 to getOrderedTasks
      const orderedTasks = result.current.getOrderedTasks('2025-01-13', [task1])
      expect(orderedTasks).toHaveLength(1)
      expect(orderedTasks[0].id).toBe('task-1')
    })
  })

  describe('reorderTasksInDay', () => {
    it('updates order within a day', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })
      const task3 = createTestTask({ id: 'task-3', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1, task2, task3],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2, task3],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        // Move task-3 before task-1
        result.current.reorderTasksInDay('2025-01-13', 'task-3', 'task-1')
      })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-3',
        'task-1',
        'task-2',
      ])
    })

    it('does nothing if activeId not found', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        result.current.reorderTasksInDay('2025-01-13', 'nonexistent', 'task-1')
      })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual(['task-1'])
    })

    it('does nothing if overId not found', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        result.current.reorderTasksInDay('2025-01-13', 'task-1', 'nonexistent')
      })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual(['task-1'])
    })
  })

  describe('moveTaskToDay', () => {
    it('moves task from one day to another', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-14' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13', '2025-01-14'],
        tasksByDate: {
          '2025-01-13': [task1],
          '2025-01-14': [task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        result.current.moveTaskToDay('task-1', '2025-01-13', '2025-01-14')
      })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([])
      expect(result.current.getOrderedTaskIds('2025-01-14')).toEqual([
        'task-2',
        'task-1',
      ])
    })

    it('inserts at specified index', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-14' })
      const task3 = createTestTask({ id: 'task-3', scheduled: '2025-01-14' })

      const options = createOptions({
        tasks: [task1, task2, task3],
        dates: ['2025-01-13', '2025-01-14'],
        tasksByDate: {
          '2025-01-13': [task1],
          '2025-01-14': [task2, task3],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        // Insert task-1 at index 1 (between task-2 and task-3)
        result.current.moveTaskToDay('task-1', '2025-01-13', '2025-01-14', 1)
      })

      expect(result.current.getOrderedTaskIds('2025-01-14')).toEqual([
        'task-2',
        'task-1',
        'task-3',
      ])
    })

    it('handles moving task that is not in source day order', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-14' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13', '2025-01-14'],
        tasksByDate: {
          '2025-01-13': [task1],
          '2025-01-14': [task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      act(() => {
        // Try to move a task from wrong day
        result.current.moveTaskToDay('task-1', '2025-01-14', '2025-01-13')
      })

      // Task should still be added to target day
      expect(result.current.getOrderedTaskIds('2025-01-13')).toContain('task-1')
    })
  })

  describe('getInsertIndex', () => {
    it('returns index of task in day order', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getInsertIndex('2025-01-13', 'task-1')).toBe(0)
      expect(result.current.getInsertIndex('2025-01-13', 'task-2')).toBe(1)
    })

    it('returns day length for nonexistent task', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.getInsertIndex('2025-01-13', 'nonexistent')).toBe(1)
    })
  })

  describe('order property', () => {
    it('contains taskOrderByDate', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      expect(result.current.order).toHaveProperty('taskOrderByDate')
      expect(result.current.order.taskOrderByDate['2025-01-13']).toEqual(['task-1'])
    })
  })

  describe('sync behavior', () => {
    it('adds new tasks to end when tasks change', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const initialOptions = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result, rerender } = renderHook(
        ({ options }) => useCalendarOrder(options),
        { initialProps: { options: initialOptions } }
      )

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual(['task-1'])

      // Add task2
      const newOptions = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      rerender({ options: newOptions })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-1',
        'task-2',
      ])
    })

    it('removes deleted tasks from order', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const initialOptions = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result, rerender } = renderHook(
        ({ options }) => useCalendarOrder(options),
        { initialProps: { options: initialOptions } }
      )

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-1',
        'task-2',
      ])

      // Remove task1
      const newOptions = createOptions({
        tasks: [task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task2],
        },
      })

      rerender({ options: newOptions })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual(['task-2'])
    })

    it('preserves order when tasks remain unchanged', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-13' })

      const options = createOptions({
        tasks: [task1, task2],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1, task2],
        },
      })

      const { result } = renderHook(() => useCalendarOrder(options))

      // Reorder
      act(() => {
        result.current.reorderTasksInDay('2025-01-13', 'task-2', 'task-1')
      })

      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([
        'task-2',
        'task-1',
      ])
    })

    it('reinitializes when dates change', () => {
      const task1 = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const task2 = createTestTask({ id: 'task-2', scheduled: '2025-01-14' })

      const initialOptions = createOptions({
        tasks: [task1],
        dates: ['2025-01-13'],
        tasksByDate: {
          '2025-01-13': [task1],
        },
      })

      const { result, rerender } = renderHook(
        ({ options }) => useCalendarOrder(options),
        { initialProps: { options: initialOptions } }
      )

      // Reorder task
      act(() => {
        // Simulate custom order (not applicable with one task, but set state)
      })

      // Navigate to different week
      const newOptions = createOptions({
        tasks: [task2],
        dates: ['2025-01-14'],
        tasksByDate: {
          '2025-01-14': [task2],
        },
      })

      rerender({ options: newOptions })

      // Should have new dates initialized
      expect(result.current.getOrderedTaskIds('2025-01-13')).toEqual([])
      expect(result.current.getOrderedTaskIds('2025-01-14')).toEqual(['task-2'])
    })
  })
})
