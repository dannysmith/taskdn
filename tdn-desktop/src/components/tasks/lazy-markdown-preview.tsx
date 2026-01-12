import * as React from 'react'
import { lazy, Suspense, Component } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * LazyMarkdownPreview - Code-split wrapper for read-only markdown rendering.
 *
 * Uses Milkdown under the hood, loaded lazily to improve initial page load.
 * Provides:
 * - React.lazy loading with Suspense fallback (skeleton UI)
 * - Error boundary for graceful failure recovery
 *
 * Used in CollapsibleNotesSection for displaying task notes in collapsed view.
 * For editing, use LazyMarkdownEditor from @/components/ui/lazy-markdown-editor.
 */

const MilkdownPreview = lazy(() =>
  import('./milkdown-editor').then(mod => ({ default: mod.MilkdownPreview }))
)

// Error boundary to catch rendering errors
interface ErrorBoundaryState {
  hasError: boolean
}

class PreviewErrorBoundary extends Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="text-sm text-muted-foreground">
          Unable to load preview.
        </div>
      )
    }
    return this.props.children
  }
}

interface LazyMarkdownPreviewProps {
  content: string
  className?: string
}

export function LazyMarkdownPreview(props: LazyMarkdownPreviewProps) {
  return (
    <PreviewErrorBoundary>
      <Suspense fallback={<PreviewSkeleton />}>
        <MilkdownPreview {...props} />
      </Suspense>
    </PreviewErrorBoundary>
  )
}

function PreviewSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
