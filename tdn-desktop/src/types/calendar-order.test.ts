import { describe, it, expect } from 'vitest'
import { getCalendarTaskDragId, parseCalendarTaskDragId } from './calendar-order'

describe('calendar-order', () => {
  describe('getCalendarTaskDragId', () => {
    it('creates composite drag ID from date and taskId', () => {
      expect(getCalendarTaskDragId('2025-06-15', 'task-1')).toBe(
        'calendar-task-2025-06-15-task-1'
      )
    })

    it('handles different date formats', () => {
      expect(getCalendarTaskDragId('2025-01-01', 'task-abc')).toBe(
        'calendar-task-2025-01-01-task-abc'
      )
      expect(getCalendarTaskDragId('2025-12-31', 'my-task-123')).toBe(
        'calendar-task-2025-12-31-my-task-123'
      )
    })

    it('handles task IDs with hyphens', () => {
      expect(getCalendarTaskDragId('2025-06-15', 'task-with-many-hyphens')).toBe(
        'calendar-task-2025-06-15-task-with-many-hyphens'
      )
    })
  })

  describe('parseCalendarTaskDragId', () => {
    it('extracts date and taskId from valid drag ID', () => {
      const result = parseCalendarTaskDragId(
        'calendar-task-2025-06-15-task-1'
      )

      expect(result).toEqual({
        date: '2025-06-15',
        taskId: 'task-1',
      })
    })

    it('handles task IDs with hyphens', () => {
      const result = parseCalendarTaskDragId(
        'calendar-task-2025-06-15-task-with-many-hyphens'
      )

      expect(result).toEqual({
        date: '2025-06-15',
        taskId: 'task-with-many-hyphens',
      })
    })

    it('returns null for invalid format', () => {
      expect(parseCalendarTaskDragId('invalid-id')).toBeNull()
      expect(parseCalendarTaskDragId('calendar-task')).toBeNull()
      expect(parseCalendarTaskDragId('')).toBeNull()
    })

    it('returns null for missing date', () => {
      expect(parseCalendarTaskDragId('calendar-task-task-1')).toBeNull()
    })

    it('returns null for invalid date format', () => {
      expect(parseCalendarTaskDragId('calendar-task-2025-6-15-task-1')).toBeNull()
      expect(parseCalendarTaskDragId('calendar-task-25-06-15-task-1')).toBeNull()
    })

    it('round-trips correctly', () => {
      const date = '2025-06-15'
      const taskId = 'my-complex-task-id-123'

      const dragId = getCalendarTaskDragId(date, taskId)
      const parsed = parseCalendarTaskDragId(dragId)

      expect(parsed).toEqual({ date, taskId })
    })

    it('handles different valid dates', () => {
      expect(parseCalendarTaskDragId('calendar-task-2024-02-29-leap-task')).toEqual({
        date: '2024-02-29',
        taskId: 'leap-task',
      })

      expect(parseCalendarTaskDragId('calendar-task-2025-01-01-new-year')).toEqual({
        date: '2025-01-01',
        taskId: 'new-year',
      })

      expect(parseCalendarTaskDragId('calendar-task-2025-12-31-end-of-year')).toEqual({
        date: '2025-12-31',
        taskId: 'end-of-year',
      })
    })
  })
})
