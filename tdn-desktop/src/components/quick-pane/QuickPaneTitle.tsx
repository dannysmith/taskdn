import * as React from 'react'
import { Textarea } from '@/components/ui/textarea'

interface QuickPaneTitleProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  aiAvailable?: boolean
  aiProcessing?: boolean
  onProcessWithAI?: () => void
}

/**
 * QuickPaneTitle - Title input row with visual checkbox and optional AI button.
 *
 * Features:
 * - Visual-only checkbox (always unchecked, non-interactive)
 * - Auto-resizing textarea that grows with content
 * - Prevents Enter from creating newlines (handled by parent)
 * - AI processing button (visible only when Apple Intelligence is available)
 */
export function QuickPaneTitle({
  value,
  onChange,
  onKeyDown,
  inputRef,
  aiAvailable,
  aiProcessing,
  onProcessWithAI,
}: QuickPaneTitleProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  const showAIButton = aiAvailable && value.trim().length > 0

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      {/* Visual checkbox - vertically centered with first line of text-xl textarea */}
      <div className="mt-[10px] size-4 shrink-0 rounded-[4px] border-2 border-muted-foreground/40" />

      <Textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className="flex-1 text-lg md:text-lg font-medium border-none shadow-none p-1 min-h-0 h-auto resize-none overflow-hidden focus-visible:ring-0 rounded-sm bg-transparent dark:bg-transparent text-foreground placeholder:text-muted-foreground/50"
        placeholder="New task..."
        rows={1}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />

      {showAIButton && (
        <button
          type="button"
          onClick={onProcessWithAI}
          disabled={aiProcessing}
          className="mt-[7px] shrink-0 rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
          title="Process with AI (⇧⌘A)"
        >
          {aiProcessing ? (
            <SpinnerIcon className="size-4 animate-spin" />
          ) : (
            <SparklesIcon className="size-4" />
          )}
        </button>
      )}
    </div>
  )
}

/** Sparkles icon for the AI button */
function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
    </svg>
  )
}

/** Simple spinner icon for loading state */
function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
