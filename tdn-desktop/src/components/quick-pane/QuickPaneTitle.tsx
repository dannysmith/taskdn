import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'

interface QuickPaneTitleProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}

/**
 * QuickPaneTitle - Title input row with visual checkbox.
 *
 * Features:
 * - Visual-only checkbox (always unchecked, non-interactive)
 * - Auto-resizing textarea that grows with content
 * - Prevents Enter from creating newlines (handled by parent)
 */
export function QuickPaneTitle({
  value,
  onChange,
  onKeyDown,
  inputRef,
}: QuickPaneTitleProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* Visual checkbox - always unchecked */}
      <div className="mt-1.5 size-5 shrink-0 rounded-full border-2 border-muted-foreground/40" />

      <Textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className="flex-1 text-lg font-medium border-none shadow-none p-1 min-h-0 h-auto resize-none overflow-hidden focus-visible:ring-1 focus-visible:ring-primary rounded-sm bg-transparent"
        placeholder="New task..."
        rows={1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
    </div>
  )
}
