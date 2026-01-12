import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * MarkdownSourceTextarea - Raw markdown editing textarea.
 *
 * Used in source mode of the MarkdownEditor. Styled with monospace font
 * and matched to the Milkdown editor dimensions for seamless switching.
 */

interface MarkdownSourceTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function MarkdownSourceTextarea({
  value,
  onChange,
  placeholder,
  className,
}: MarkdownSourceTextareaProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      spellCheck={false}
      className={cn(
        // Base styling
        'w-full h-full resize-none outline-none border-none',
        // Padding to match Milkdown editor
        'p-4',
        // Subtle background to differentiate from preview mode
        'bg-muted/20',
        // Focus styling - subtle since it's full-height
        'focus:outline-none',
        // Placeholder
        'placeholder:text-muted-foreground',
        className
      )}
      style={{
        // Explicit monospace font stack
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.8125rem',
        lineHeight: '1.6',
        tabSize: 2,
      }}
    />
  )
}

export { MarkdownSourceTextarea }
