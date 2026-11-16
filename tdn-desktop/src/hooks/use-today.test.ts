import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useToday } from './use-today'

describe('useToday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the local date, not the UTC one', () => {
    // 00:30 local time: in a timezone ahead of UTC, the UTC date is still yesterday
    vi.setSystemTime(new Date(2026, 5, 15, 0, 30))
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
})
