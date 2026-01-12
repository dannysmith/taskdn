import * as React from 'react'
import { Eye, Code } from 'lucide-react'

import { cn } from '@/lib/utils'
import { MilkdownEditor } from '@/components/tasks/milkdown-editor'
import { MarkdownSourceTextarea } from '@/components/ui/markdown-source-textarea'

/**
 * MarkdownEditor - Unified markdown editor with preview/source toggle.
 *
 * Wraps MilkdownEditor (WYSIWYG) and MarkdownSourceTextarea (raw markdown)
 * with a toggle to switch between modes. Content is kept in React state
 * and synced between views.
 *
 * Key behaviors:
 * - Preview → Source: Instant (state already has markdown)
 * - Source → Preview: Remounts Milkdown with current state
 * - editorKey changes: Resets to defaultValue
 */

type ViewMode = 'preview' | 'source'

interface MarkdownEditorProps {
  /** Unique key to reset editor (e.g., task ID) - remounts on change */
  editorKey: string

  /** Initial markdown content */
  defaultValue: string

  /** Called when content changes (fires in both modes) */
  onChange: (value: string) => void

  /** Initial view mode (default: 'preview') */
  defaultMode?: ViewMode

  /** Show the view toggle? (default: true) */
  showToggle?: boolean

  /** Placeholder text when empty */
  placeholder?: string

  className?: string
}

function MarkdownEditor({
  editorKey,
  defaultValue,
  onChange,
  defaultMode = 'preview',
  showToggle = true,
  placeholder,
  className,
}: MarkdownEditorProps) {
  // Track current view mode
  const [mode, setMode] = React.useState<ViewMode>(defaultMode)

  // Track content in React state - single source of truth
  const [content, setContent] = React.useState(defaultValue)

  // Key to force Milkdown remount when switching to preview mode
  const [milkdownKey, setMilkdownKey] = React.useState(0)

  // Ref to track if this is the initial mount or an editorKey change
  const prevEditorKey = React.useRef(editorKey)

  // Reset content when editorKey changes (switching tasks)
  React.useEffect(() => {
    if (prevEditorKey.current !== editorKey) {
      setContent(defaultValue)
      setMilkdownKey(k => k + 1)
      prevEditorKey.current = editorKey
    }
  }, [editorKey, defaultValue])

  // Handle content changes from either editor
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    onChange(newContent)
  }

  // Handle mode toggle
  const switchToPreview = () => {
    if (mode === 'preview') return
    setMilkdownKey(k => k + 1)
    setMode('preview')
  }

  const switchToSource = () => {
    if (mode === 'source') return
    setMode('source')
  }

  return (
    <div className={cn('relative flex flex-col', className)}>
      {/* View toggle - small icons in bottom-right corner */}
      {showToggle && (
        <div className="absolute bottom-1.5 right-2 z-10 flex gap-0.5">
          <button
            type="button"
            onClick={switchToPreview}
            aria-label="Preview mode"
            aria-pressed={mode === 'preview'}
            className={cn(
              'p-1 rounded transition-colors',
              mode === 'preview'
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Eye className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={switchToSource}
            aria-label="Source mode"
            aria-pressed={mode === 'source'}
            className={cn(
              'p-1 rounded transition-colors',
              mode === 'source'
                ? 'text-foreground bg-muted'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Code className="size-3.5" />
          </button>
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {mode === 'preview' ? (
          <MilkdownEditor
            key={`${editorKey}-${milkdownKey}`}
            editorKey={`${editorKey}-${milkdownKey}`}
            defaultValue={content}
            onChange={handleContentChange}
            className="h-full"
          />
        ) : (
          <MarkdownSourceTextarea
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder}
            className="h-full"
          />
        )}
      </div>
    </div>
  )
}

export { MarkdownEditor }
export type { MarkdownEditorProps, ViewMode }
