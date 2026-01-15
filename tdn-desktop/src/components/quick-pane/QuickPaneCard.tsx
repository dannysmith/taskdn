import * as React from 'react'
import { cn } from '@/lib/utils'

interface QuickPaneCardProps {
  children: React.ReactNode
  className?: string
  exiting?: boolean
}

/**
 * QuickPaneCard - The visible card container with animation support.
 *
 * Renders a rounded card with shadow that animates on show/hide.
 * Positioned at the top of the transparent window with padding below
 * for date picker popovers.
 */
export function QuickPaneCard({
  children,
  className,
  exiting = false,
}: QuickPaneCardProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center px-10 pt-10">
      <div
        className={cn(
          'quick-pane-card w-full max-w-[620px] rounded-xl border border-border bg-background shadow-lg',
          exiting && 'exiting',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
