import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatRelativeDate,
  formatShortDate,
  isOverdue,
  isToday,
} from './date-utils'

describe('date-utils', () => {
  beforeEach(() => {
    // Set a fixed date for all tests: 2025-06-15 (a Sunday)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatRelativeDate', () => {
    it('returns "Today" for current date', () => {
      expect(formatRelativeDate('2025-06-15')).toBe('Today')
    })

    it('returns "Today" regardless of time of day', () => {
      expect(formatRelativeDate('2025-06-15T00:00:00')).toBe('Today')
      expect(formatRelativeDate('2025-06-15T23:59:59')).toBe('Today')
    })

    it('returns "Tomorrow" for next day', () => {
      expect(formatRelativeDate('2025-06-16')).toBe('Tomorrow')
    })

    it('returns "Yesterday" for previous day', () => {
      expect(formatRelativeDate('2025-06-14')).toBe('Yesterday')
    })

    it('returns day name for dates within next week (2-6 days)', () => {
      // June 15 is Sunday, so:
      // June 16 = Tomorrow (Mon)
      // June 17 = Tue
      // June 18 = Wed
      // June 19 = Thu
      // June 20 = Fri
      // June 21 = Sat
      expect(formatRelativeDate('2025-06-17')).toBe('Tue')
      expect(formatRelativeDate('2025-06-18')).toBe('Wed')
      expect(formatRelativeDate('2025-06-19')).toBe('Thu')
      expect(formatRelativeDate('2025-06-20')).toBe('Fri')
      expect(formatRelativeDate('2025-06-21')).toBe('Sat')
    })

    it('returns "Last <day>" for dates within past week (2-6 days)', () => {
      // June 15 is Sunday, so:
      // June 14 = Yesterday (Sat)
      // June 13 = Fri
      // June 12 = Thu
      // June 11 = Wed
      // June 10 = Tue
      // June 9 = Mon
      expect(formatRelativeDate('2025-06-13')).toBe('Last Fri')
      expect(formatRelativeDate('2025-06-12')).toBe('Last Thu')
      expect(formatRelativeDate('2025-06-11')).toBe('Last Wed')
      expect(formatRelativeDate('2025-06-10')).toBe('Last Tue')
      expect(formatRelativeDate('2025-06-09')).toBe('Last Mon')
    })

    it('returns "Day Mon" format for dates beyond a week in the future', () => {
      expect(formatRelativeDate('2025-06-22')).toBe('22 Jun')
      expect(formatRelativeDate('2025-07-04')).toBe('4 Jul')
      expect(formatRelativeDate('2025-12-25')).toBe('25 Dec')
    })

    it('returns "Day Mon" format for dates beyond a week in the past', () => {
      expect(formatRelativeDate('2025-06-08')).toBe('8 Jun')
      expect(formatRelativeDate('2025-05-01')).toBe('1 May')
      expect(formatRelativeDate('2025-01-15')).toBe('15 Jan')
    })

    it('returns original string for invalid dates', () => {
      expect(formatRelativeDate('invalid')).toBe('invalid')
      expect(formatRelativeDate('')).toBe('')
      expect(formatRelativeDate('not-a-date')).toBe('not-a-date')
    })

    it('handles different date formats', () => {
      // ISO format with time
      expect(formatRelativeDate('2025-06-15T10:30:00')).toBe('Today')
      // ISO format with timezone
      expect(formatRelativeDate('2025-06-15T10:30:00Z')).toBe('Today')
    })

    it('adds year suffix for dates not in current year', () => {
      // Current year is 2025
      expect(formatRelativeDate('2024-06-22')).toBe('22 Jun 24')
      expect(formatRelativeDate('2026-01-15')).toBe('15 Jan 26')
      expect(formatRelativeDate('2023-12-25')).toBe('25 Dec 23')
    })
  })

  describe('formatShortDate', () => {
    it('returns "Day Mon" format for dates in current year', () => {
      expect(formatShortDate('2025-06-15')).toBe('15 Jun')
      expect(formatShortDate('2025-01-01')).toBe('1 Jan')
      expect(formatShortDate('2025-12-31')).toBe('31 Dec')
    })

    it('adds year suffix for dates not in current year', () => {
      expect(formatShortDate('2024-06-15')).toBe('15 Jun 24')
      expect(formatShortDate('2026-01-01')).toBe('1 Jan 26')
      expect(formatShortDate('2023-12-25')).toBe('25 Dec 23')
    })

    it('returns original string for invalid dates', () => {
      expect(formatShortDate('invalid')).toBe('invalid')
      expect(formatShortDate('')).toBe('')
    })

    it('handles ISO format with time', () => {
      expect(formatShortDate('2025-06-15T10:30:00')).toBe('15 Jun')
      expect(formatShortDate('2024-06-15T10:30:00Z')).toBe('15 Jun 24')
    })
  })

  describe('isOverdue', () => {
    it('returns true for dates before today', () => {
      expect(isOverdue('2025-06-14')).toBe(true)
      expect(isOverdue('2025-06-01')).toBe(true)
      expect(isOverdue('2025-01-01')).toBe(true)
    })

    it('returns false for today', () => {
      expect(isOverdue('2025-06-15')).toBe(false)
    })

    it('returns false for dates after today', () => {
      expect(isOverdue('2025-06-16')).toBe(false)
      expect(isOverdue('2025-12-31')).toBe(false)
    })

    it('returns false for invalid dates', () => {
      expect(isOverdue('invalid')).toBe(false)
      expect(isOverdue('')).toBe(false)
      expect(isOverdue('not-a-date')).toBe(false)
    })

    it('handles different times on the same day correctly', () => {
      // Start of day should not be overdue (it's today)
      expect(isOverdue('2025-06-15T00:00:00')).toBe(false)
      // End of day should not be overdue (it's today)
      expect(isOverdue('2025-06-15T23:59:59')).toBe(false)
    })
  })

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday('2025-06-15')).toBe(true)
    })

    it('returns true for today with different times', () => {
      expect(isToday('2025-06-15T00:00:00')).toBe(true)
      expect(isToday('2025-06-15T12:30:00')).toBe(true)
      expect(isToday('2025-06-15T23:59:59')).toBe(true)
    })

    it('returns false for yesterday', () => {
      expect(isToday('2025-06-14')).toBe(false)
    })

    it('returns false for tomorrow', () => {
      expect(isToday('2025-06-16')).toBe(false)
    })

    it('returns false for dates further away', () => {
      expect(isToday('2025-06-01')).toBe(false)
      expect(isToday('2025-07-15')).toBe(false)
    })

    it('returns false for invalid dates', () => {
      expect(isToday('invalid')).toBe(false)
      expect(isToday('')).toBe(false)
      expect(isToday('not-a-date')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles year boundaries correctly', () => {
      // Set time to Dec 31
      vi.setSystemTime(new Date('2025-12-31T12:00:00'))

      expect(formatRelativeDate('2025-12-31')).toBe('Today')
      expect(formatRelativeDate('2026-01-01')).toBe('Tomorrow')
      expect(formatRelativeDate('2025-12-30')).toBe('Yesterday')
    })

    it('handles month boundaries correctly', () => {
      // Set time to June 30
      vi.setSystemTime(new Date('2025-06-30T12:00:00'))

      expect(formatRelativeDate('2025-06-30')).toBe('Today')
      expect(formatRelativeDate('2025-07-01')).toBe('Tomorrow')
      expect(formatRelativeDate('2025-06-29')).toBe('Yesterday')
    })

    it('handles leap year correctly', () => {
      // 2024 is a leap year
      vi.setSystemTime(new Date('2024-02-28T12:00:00'))

      expect(formatRelativeDate('2024-02-28')).toBe('Today')
      expect(formatRelativeDate('2024-02-29')).toBe('Tomorrow')
    })
  })
})
