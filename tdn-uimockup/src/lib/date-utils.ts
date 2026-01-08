/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return !isNaN(date.getTime())
}

/**
 * Format a date string as relative natural language.
 * - "Today", "Yesterday", "Tomorrow"
 * - "Last Monday", "Next Friday" (within ~7 days)
 * - "Dec 31" (further out)
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
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays === -1) return 'Yesterday'

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[date.getDay()]

  // Within the past week
  if (diffDays < 0 && diffDays >= -6) {
    return `Last ${dayName}`
  }

  // Within the next week
  if (diffDays > 0 && diffDays <= 6) {
    return dayName
  }

  // Further out - use short month format
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[date.getMonth()]} ${date.getDate()}`
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
