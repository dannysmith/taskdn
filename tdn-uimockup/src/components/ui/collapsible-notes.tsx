import * as React from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { MarkdownPreview } from '@/components/ui/markdown-preview'

/**
 * CollapsibleNotesSection - Expandable notes panel for areas and projects.
 *
 * Used at the top of AreaView and ProjectView to show descriptive notes.
 * When collapsed, shows first 1-2 lines of content as a teaser. When
 * expanded, renders full markdown content.
 *
 * The collapse state is local (not persisted). Click the header to toggle.
 */
interface CollapsibleNotesSectionProps {
  notes: string
  title?: string
  defaultExpanded?: boolean
}

export function CollapsibleNotesSection({
  notes,
  title = 'Notes',
  defaultExpanded = false,
}: CollapsibleNotesSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded)

  // Generate collapsed preview from notes (first 1-2 non-heading lines)
  const collapsedPreview = React.useMemo(() => {
    return notes
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
      .slice(0, 2)
      .join(' ')
  }, [notes])

  return (
    <section className="bg-muted/30 rounded-lg border border-border/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 text-start hover:bg-muted/50 transition-colors rounded-lg"
      >
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground shrink-0 transition-transform duration-200',
            !isExpanded && '-rotate-90'
          )}
        />
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4">
          <MarkdownPreview content={notes} className="text-muted-foreground" />
        </div>
      </div>
      {/* Collapsed preview - show first line or two */}
      {!isExpanded && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-sm text-muted-foreground/70 line-clamp-2">
            {collapsedPreview}
          </p>
        </div>
      )}
    </section>
  )
}
