import * as React from 'react'
import { format } from 'date-fns'

const todayString = () => format(new Date(), 'yyyy-MM-dd')

/** Milliseconds until a second past the next local midnight */
function msUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1
  )
  return midnight.getTime() - now.getTime() + 1000
}

/**
 * Today's local date as YYYY-MM-DD. Re-renders when the date changes at
 * midnight, so date-based views (Today, This Week, overdue styling) stay
 * current in a window that's left open overnight.
 */
export function useToday(): string {
  const [today, setToday] = React.useState(todayString)

  React.useEffect(() => {
    // Each check schedules the next one, even when the date hasn't changed
    // (the clock or timezone moved), so updates never stop
    let timer: ReturnType<typeof setTimeout>
    const check = () => {
      setToday(todayString())
      timer = setTimeout(check, msUntilMidnight())
    }
    timer = setTimeout(check, msUntilMidnight())
    return () => clearTimeout(timer)
  }, [])

  return today
}
