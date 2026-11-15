import { describe, expect, test } from 'bun:test'
import { addDays, daysBetween, isIsoDate, shiftDatesInText } from './dates.ts'

describe('date maths', () => {
  test('crosses month, year and leap-day boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  test('counts days in either direction, ignoring DST', () => {
    expect(daysBetween('2026-01-15', '2026-11-15')).toBe(304)
    expect(daysBetween('2026-11-15', '2026-01-15')).toBe(-304)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })

  test('only accepts real calendar dates', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-1-01')).toBe(false)
  })
})

describe('shiftDatesInText', () => {
  test('shifts dates and the date part of datetimes, keeping times and offsets', () => {
    const before = [
      'due: 2026-01-15',
      'created-at: 2026-01-10T09:30:00+05:30',
      'updated-at: 2026-01-14T18:00:00Z',
      'completed-at: 2026-01-12 14:30',
      'started: "2026-01-01T08:00"',
    ].join('\n')
    expect(shiftDatesInText(before, 10)).toBe(
      [
        'due: 2026-01-25',
        'created-at: 2026-01-20T09:30:00+05:30',
        'updated-at: 2026-01-24T18:00:00Z',
        'completed-at: 2026-01-22 14:30',
        'started: "2026-01-11T08:00"',
      ].join('\n'),
    )
  })

  test('shifts dates in prose, links and slugs, and moves backwards too', () => {
    expect(shiftDatesInText('Call booked for 2026-01-20, see [[2026-01-15]].', -5)).toBe(
      'Call booked for 2026-01-15, see [[2026-01-10]].',
    )
    expect(shiftDatesInText('standup-2026-01-15-notes', 1)).toBe('standup-2026-01-16-notes')
  })

  test('leaves partial dates, years, versions and template placeholders alone', () => {
    const text = [
      'Started: 2024-06',
      'Write the 2025 review',
      'Version 1.2026-01',
      'ref 12026-01-15 and 2026-01-150',
      'created-at: {{date}}',
      'Not a date: 2026-02-30',
    ].join('\n')
    expect(shiftDatesInText(text, 30)).toBe(text)
  })

  test('does nothing for a zero shift', () => {
    expect(shiftDatesInText('due: 2026-01-15', 0)).toBe('due: 2026-01-15')
  })
})
