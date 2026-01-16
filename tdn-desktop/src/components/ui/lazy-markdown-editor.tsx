import * as React from 'react'
import { lazy, Suspense, Component } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

import type { MarkdownEditorProps } from './markdown-editor'

/**
 * LazyMarkdownEditor - Code-split wrapper for the unified MarkdownEditor.
 *
 * Milkdown is a heavyweight dependency, so the editor is loaded lazily
 * to improve initial page load. This component provides:
 * - React.lazy loading with Suspense fallback (skeleton UI)
 * - Error boundary for graceful failure recovery
 *
 * Used in TaskDetailPanel for the notes field.
 */
const MarkdownEditor = lazy(() =>
  import('./markdown-editor').then(mod => ({ default: mod.MarkdownEditor }))
)

// Error boundary to catch editor rendering errors
interface ErrorBoundaryState {
  hasError: boolean
}

class EditorErrorBoundary extends Component<
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
        <div className="p-4 text-sm text-muted-foreground">
          Unable to load editor. Try refreshing the page.
        </div>
      )
    }
    return this.props.children
  }
}

function EditorSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  )
}

function LazyMarkdownEditor(props: MarkdownEditorProps) {
  return (
    <EditorErrorBoundary>
      <Suspense fallback={<EditorSkeleton />}>
        <MarkdownEditor {...props} />
      </Suspense>
    </EditorErrorBoundary>
  )
}

export { LazyMarkdownEditor }
