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
  const [animating, setAnimating] = React.useState(false)
  const [shouldRender, setShouldRender] = React.useState(visible)

  // Handle visibility changes with animation
  React.useEffect(() => {
    if (visible) {
      setShouldRender(true)
      setAnimating(true)
    } else if (shouldRender) {
      setAnimating(true)
      // Wait for exit animation to complete
      const timer = setTimeout(() => {
        setShouldRender(false)
        setAnimating(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [visible, shouldRender])

  // Clear animating state after enter animation
  React.useEffect(() => {
    if (visible && animating) {
      const timer = setTimeout(() => setAnimating(false), 150)
      return () => clearTimeout(timer)
    }
  }, [visible, animating])

  // Focus textarea when it becomes visible
  React.useEffect(() => {
    if (visible && inputRef?.current) {
      // Small delay to let animation start
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    }
  }, [visible, inputRef])

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
