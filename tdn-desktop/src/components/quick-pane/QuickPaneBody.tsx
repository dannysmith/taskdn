import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface QuickPaneBodyProps {
  value: string
  onChange: (value: string) => void
  visible: boolean
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

/**
 * QuickPaneBody - Collapsible notes textarea.
 *
 * Hidden by default, toggled with Cmd+Shift+Enter.
 * Uses CSS animations for smooth expand/collapse.
 */
export function QuickPaneBody({
  value,
  onChange,
  visible,
  inputRef,
}: QuickPaneBodyProps) {
  const [shouldRender, setShouldRender] = React.useState(visible)

  // Handle visibility changes with animation
  // Exit delay must match --quick-pane-exit-duration in quick-pane.css
  React.useEffect(() => {
    if (visible) {
      setShouldRender(true)
    } else if (shouldRender) {
      // Wait for exit animation to complete before unmounting (100ms)
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [visible, shouldRender])

  if (!shouldRender) return null

  return (
    <div
      className={cn(
        'border-t border-border',
        visible ? 'quick-pane-body-enter' : 'quick-pane-body-exit'
      )}
    >
      <Textarea
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="min-h-[80px] border-none shadow-none resize-none focus-visible:ring-0 bg-transparent dark:bg-transparent text-foreground px-4 py-3"
        placeholder="Notes..."
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}
