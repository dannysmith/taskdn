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
 *
 * Uses a multi-layered shadow similar to Things 3 for a refined look.
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
          'quick-pane-card w-full max-w-[620px] rounded-2xl bg-background',
          // Multi-layered shadow for refined depth (Things 3 style)
          'shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.08)]',
          'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_1px_2px_rgba(0,0,0,0.2),0_4px_8px_rgba(0,0,0,0.2),0_12px_24px_rgba(0,0,0,0.25),0_24px_48px_rgba(0,0,0,0.3)]',
          exiting && 'exiting',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}
