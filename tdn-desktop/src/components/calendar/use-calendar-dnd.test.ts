import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { useCalendarDnd } from './use-calendar-dnd'
import { createTestTask, resetFactoryCounters } from '@/test/helpers/vault'
import type { Task } from '@/lib/tauri-bindings'

describe('useCalendarDnd', () => {
  beforeEach(() => {
    resetFactoryCounters()
  })

  const createOptions = (overrides?: {
    tasks?: Task[]
    getTaskById?: (id: string) => Task | undefined
  }) => {
    const tasks = overrides?.tasks ?? []
    const taskMap = new Map(tasks.map(t => [t.id, t]))

    return {
      getTaskById: overrides?.getTaskById ?? ((id: string) => taskMap.get(id)),
      onTaskScheduleChange: vi.fn(),
      reorderTasksInDay: vi.fn(),
      moveTaskToDay: vi.fn(),
      getInsertIndex: vi.fn().mockReturnValue(0),
    }
  }

  const createDragStartEvent = (
    taskId: string,
    sourceDate: string
  ): DragStartEvent =>
    ({
      active: {
        id: `calendar-task-${sourceDate}-${taskId}`,
        data: {
          current: {
            type: 'calendar-task',
            taskId,
            sourceDate,
          },
        },
      },
    }) as unknown as DragStartEvent

  const createDragOverEvent = (
    overId: string | null,
    overData:
      | { type: 'day'; date: string }
      | { type: 'calendar-task'; taskId: string; sourceDate: string }
      | null
  ): DragOverEvent =>
    ({
      over: overId
        ? {
            id: overId,
            data: { current: overData },
          }
        : null,
    }) as unknown as DragOverEvent

  const createDragEndEvent = (
    activeId: string,
    overId: string | null,
    overData:
      | { type: 'day'; date: string }
      | { type: 'calendar-task'; taskId: string; sourceDate: string }
      | null
  ): DragEndEvent =>
    ({
      active: {
        id: activeId,
      },
      over: overId
        ? {
            id: overId,
            data: { current: overData },
          }
        : null,
    }) as unknown as DragEndEvent

  describe('initial state', () => {
    it('starts with null dragState', () => {
      const options = createOptions()
      const { result } = renderHook(() => useCalendarDnd(options))

      expect(result.current.dragState).toBeNull()
    })

    it('provides sensors', () => {
      const options = createOptions()
      const { result } = renderHook(() => useCalendarDnd(options))

      expect(result.current.sensors).toBeDefined()
      expect(result.current.sensors.length).toBeGreaterThan(0)
    })

    it('provides dropAnimation', () => {
      const options = createOptions()
      const { result } = renderHook(() => useCalendarDnd(options))

      expect(result.current.dropAnimation).toBeDefined()
    })
  })

  describe('handleDragStart', () => {
    it('sets dragState when data is valid', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      expect(result.current.dragState).toEqual({
        taskId: 'task-1',
        task,
        sourceDate: '2025-01-13',
        currentOverDate: null,
      })
    })

    it('does nothing when task not found', () => {
      const options = createOptions({ tasks: [] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('nonexistent', '2025-01-13')
        )
      })

      expect(result.current.dragState).toBeNull()
    })

    it('does nothing when data type is not calendar-task', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      const event = {
        active: {
          id: 'some-id',
          data: {
            current: {
              type: 'other-type',
            },
          },
        },
      } as unknown as DragStartEvent

      act(() => {
        result.current.handleDragStart(event)
      })

      expect(result.current.dragState).toBeNull()
    })
  })

  describe('handleDragOver', () => {
    it('does nothing when no active drag', () => {
      const options = createOptions()
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragOver(
          createDragOverEvent('day-2025-01-13', {
            type: 'day',
            date: '2025-01-13',
          })
        )
      })

      expect(result.current.dragState).toBeNull()
    })

    it('updates currentOverDate when over a day', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragOver(
          createDragOverEvent('day-2025-01-14', {
            type: 'day',
            date: '2025-01-14',
          })
        )
      })

      expect(result.current.dragState?.currentOverDate).toBe('2025-01-14')
    })

    it('updates currentOverDate when over a task', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragOver(
          createDragOverEvent('calendar-task-2025-01-14-task-2', {
            type: 'calendar-task',
            taskId: 'task-2',
            sourceDate: '2025-01-14',
          })
        )
      })

      expect(result.current.dragState?.currentOverDate).toBe('2025-01-14')
    })

    it('clears currentOverDate when over is null', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragOver(
          createDragOverEvent('day-2025-01-14', {
            type: 'day',
            date: '2025-01-14',
          })
        )
      })

      act(() => {
        result.current.handleDragOver(createDragOverEvent(null, null))
      })

      expect(result.current.dragState?.currentOverDate).toBeNull()
    })
  })

  describe('handleDragEnd', () => {
    it('does nothing when no active drag', () => {
      const options = createOptions()
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'day-2025-01-14',
            { type: 'day', date: '2025-01-14' }
          )
        )
      })

      expect(options.onTaskScheduleChange).not.toHaveBeenCalled()
    })

    it('resets dragState when over is null', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent('calendar-task-2025-01-13-task-1', null, null)
        )
      })

      expect(result.current.dragState).toBeNull()
    })

    it('moves task to different day when dropped on day container', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'day-2025-01-14',
            {
              type: 'day',
              date: '2025-01-14',
            }
          )
        )
      })

      expect(options.moveTaskToDay).toHaveBeenCalledWith(
        'task-1',
        '2025-01-13',
        '2025-01-14'
      )
      expect(options.onTaskScheduleChange).toHaveBeenCalledWith(
        'task-1',
        '2025-01-14'
      )
      expect(result.current.dragState).toBeNull()
    })

    it('does not call callbacks when dropped on same day container', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'day-2025-01-13',
            {
              type: 'day',
              date: '2025-01-13',
            }
          )
        )
      })

      expect(options.moveTaskToDay).not.toHaveBeenCalled()
      expect(options.onTaskScheduleChange).not.toHaveBeenCalled()
      expect(result.current.dragState).toBeNull()
    })

    it('reorders tasks when dropped on task in same day', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'calendar-task-2025-01-13-task-2',
            {
              type: 'calendar-task',
              taskId: 'task-2',
              sourceDate: '2025-01-13',
            }
          )
        )
      })

      expect(options.reorderTasksInDay).toHaveBeenCalledWith(
        '2025-01-13',
        'task-1',
        'task-2'
      )
      expect(options.onTaskScheduleChange).not.toHaveBeenCalled()
      expect(result.current.dragState).toBeNull()
    })

    it('does not reorder when dropped on self', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'calendar-task-2025-01-13-task-1',
            {
              type: 'calendar-task',
              taskId: 'task-1',
              sourceDate: '2025-01-13',
            }
          )
        )
      })

      expect(options.reorderTasksInDay).not.toHaveBeenCalled()
      expect(result.current.dragState).toBeNull()
    })

    it('moves task to specific position when dropped on task in different day', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      options.getInsertIndex.mockReturnValue(1)
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      act(() => {
        result.current.handleDragEnd(
          createDragEndEvent(
            'calendar-task-2025-01-13-task-1',
            'calendar-task-2025-01-14-task-2',
            {
              type: 'calendar-task',
              taskId: 'task-2',
              sourceDate: '2025-01-14',
            }
          )
        )
      })

      expect(options.getInsertIndex).toHaveBeenCalledWith(
        '2025-01-14',
        'task-2'
      )
      expect(options.moveTaskToDay).toHaveBeenCalledWith(
        'task-1',
        '2025-01-13',
        '2025-01-14',
        1
      )
      expect(options.onTaskScheduleChange).toHaveBeenCalledWith(
        'task-1',
        '2025-01-14'
      )
      expect(result.current.dragState).toBeNull()
    })
  })

  describe('handleDragCancel', () => {
    it('resets dragState', () => {
      const task = createTestTask({ id: 'task-1', scheduled: '2025-01-13' })
      const options = createOptions({ tasks: [task] })
      const { result } = renderHook(() => useCalendarDnd(options))

      act(() => {
        result.current.handleDragStart(
          createDragStartEvent('task-1', '2025-01-13')
        )
      })

      expect(result.current.dragState).not.toBeNull()

      act(() => {
        result.current.handleDragCancel()
      })

      expect(result.current.dragState).toBeNull()
    })
  })
})
