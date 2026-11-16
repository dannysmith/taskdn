import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useToday } from './use-today'

describe('useToday', () => {
  const originalTZ = process.env.TZ

  beforeEach(() => {
    // London in summer is UTC+1, so just after midnight the UTC date is still
    // yesterday, on any machine
    process.env.TZ = 'Europe/London'
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = originalTZ
  })

  it('returns the local date, not the UTC one', () => {
    vi.setSystemTime(new Date('2026-06-14T23:30:00Z')) // 00:30 BST on the 15th
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-06-15')
  })

  it('moves to the next day at midnight', () => {
    vi.setSystemTime(new Date(2026, 5, 15, 23, 59))
    const { result } = renderHook(() => useToday())
    expect(result.current).toBe('2026-06-15')

    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(result.current).toBe('2026-06-16')

    // And again the following midnight
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
    })
    expect(result.current).toBe('2026-06-17')
  })

  it('keeps checking when the clock moves back before midnight', () => {
    vi.setSystemTime(new Date(2026, 5, 15, 23, 59))
    const { result } = renderHook(() => useToday())

    // The clock jumps back to the morning, so the check finds the same date
    vi.setSystemTime(new Date(2026, 5, 15, 10, 0))
    act(() => {
      vi.advanceTimersByTime(2 * 60 * 1000)
    })
    expect(result.current).toBe('2026-06-15')

    // The next midnight still updates it
    act(() => {
      vi.advanceTimersByTime(14 * 60 * 60 * 1000)
    })
    expect(result.current).toBe('2026-06-16')
  })
})
