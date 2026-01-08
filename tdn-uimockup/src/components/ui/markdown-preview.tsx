import { cn } from '@/lib/utils'
import { LazyMilkdownPreview } from '@/components/tasks/lazy-milkdown-editor'

/**
 * MarkdownPreview - Read-only markdown renderer using Milkdown.
 *
 * Shares the same lazy-loaded chunk as MilkdownEditor (via LazyMilkdownPreview)
 * so there's no extra bundle cost. Used in CollapsibleNotesSection for
 * displaying area/project notes.
 */
interface MarkdownPreviewProps {
  content: string
  className?: string
}
export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  return (
    <LazyMilkdownPreview
      content={content}
      className={cn('markdown-preview text-sm', className)}
    />
  )
}
