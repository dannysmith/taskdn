import { cn } from '@/lib/utils'

/**
 * EmptyState - Centered placeholder for views with no content.
 *
 * Used across views (InboxView, TodayView, etc.) when there are no tasks
 * to display. Provides a consistent "empty" message with optional description.
 *
 * Note: This is a simpler alternative to the full Empty component from shadcn.
 * Use this for quick task view empty states; use Empty for more complex layouts.
 */
interface EmptyStateProps {
  title: string
  description?: string
  className?: string
}
export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('py-12 text-center', className)}>
      <p className="text-muted-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground/70">{description}</p>
      )}
    </div>
  )
}
