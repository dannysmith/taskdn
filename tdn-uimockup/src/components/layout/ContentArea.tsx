import type { ReactNode } from 'react'

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
}

export function ContentArea({ children }: ContentAreaProps) {
  return <main className="flex-1 overflow-y-auto p-6">{children}</main>
}
