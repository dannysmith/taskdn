import * as React from 'react'
import { format } from 'date-fns'

const todayString = () => format(new Date(), 'yyyy-MM-dd')

/**
 * Today's local date as YYYY-MM-DD. Re-renders when the date changes at
 * midnight, so date-based views (Today, This Week, overdue styling) stay
 * current in a window that's left open overnight.
 */
export function useToday(): string {
  const [today, setToday] = React.useState(todayString)

  React.useEffect(() => {
    const now = new Date()
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    )
    // A second past midnight, so the new date is definitely in effect
    const timer = setTimeout(
      () => setToday(todayString()),
      midnight.getTime() - now.getTime() + 1000
    )
    return () => clearTimeout(timer)
  }, [today])

  return today
}
