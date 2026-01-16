/**
 * Date utility functions for formatting and comparing dates.
 */

import i18n from '@/i18n/config'

const t = i18n.t.bind(i18n)

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime())
}

/**
 * Day name keys in order from Sunday (0) to Saturday (6)
 */
const dayKeys = [
  'dates.days.sun',
  'dates.days.mon',
  'dates.days.tue',
  'dates.days.wed',
  'dates.days.thu',
  'dates.days.fri',
  'dates.days.sat',
] as const

/**
 * Month name keys in order from January (0) to December (11)
 */
const monthKeys = [
  'dates.months.jan',
  'dates.months.feb',
  'dates.months.mar',
  'dates.months.apr',
  'dates.months.may',
  'dates.months.jun',
  'dates.months.jul',
  'dates.months.aug',
  'dates.months.sep',
  'dates.months.oct',
  'dates.months.nov',
  'dates.months.dec',
] as const

/**
 * Format a date as "d MMM" (UK format), adding year suffix if not current year.
 * Examples: "4 Jan", "31 Dec 25"
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString)
  if (!isValidDate(date)) return dateString

  const today = new Date()
  const monthIndex = date.getMonth() as
    | 0
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
  const monthName = t(monthKeys[monthIndex])
  const day = date.getDate()

  // Add year suffix if not current year (e.g., "4 Jan 25")
  if (date.getFullYear() !== today.getFullYear()) {
    const yearSuffix = String(date.getFullYear()).slice(-2)
    return `${day} ${monthName} ${yearSuffix}`
  }

  return `${day} ${monthName}`
}

/**
 * Format a date string as relative natural language.
 * - "Today", "Yesterday", "Tomorrow"
 * - "Last Monday", "Next Friday" (within ~7 days)
 * - "4 Jan" or "4 Jan 25" (further out, UK format with year if not current)
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  if (!isValidDate(date)) return dateString

  const today = new Date()

  // Normalize to start of day for comparison
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  const diffTime = dateDay.getTime() - todayDay.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

  // Today, yesterday, tomorrow
  if (diffDays === 0) return t('dates.today')
  if (diffDays === 1) return t('dates.tomorrow')
  if (diffDays === -1) return t('dates.yesterday')

  const dayIndex = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  const dayName = t(dayKeys[dayIndex])

  // Within the past week
  if (diffDays < 0 && diffDays >= -6) {
    return t('dates.lastDay', { day: dayName })
  }

  // Within the next week
  if (diffDays > 0 && diffDays <= 6) {
    return dayName
  }

  // Further out - use UK short date format
  return formatShortDate(dateString)
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(dateString: string): boolean {
  const date = new Date(dateString)
  if (!isValidDate(date)) return false

  const today = new Date()

  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  return dateDay < todayDay
}

/**
 * Check if a date is today
 */
export function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  if (!isValidDate(date)) return false

  const today = new Date()

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}
