import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/**
 * ContentArea - Scrollable container for the main view content.
 *
 * Provides consistent padding and scroll behavior for all views. This is the
 * inner wrapper inside the main content area, below ViewHeader.
 *
 * Usage:
 * - Wrap the body of each view component's content
 * - Handles overflow scrolling when content exceeds viewport height
 */
interface ContentAreaProps {
  children: ReactNode
  className?: string
}

export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <main className={cn('flex-1 overflow-y-auto p-6', className)}>
      {children}
    </main>
  )
}
