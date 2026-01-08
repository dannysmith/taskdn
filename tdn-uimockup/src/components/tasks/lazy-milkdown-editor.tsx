import * as React from 'react'
import { lazy, Suspense, Component } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * LazyMilkdownEditor - Code-split wrapper for the Milkdown markdown editor.
 *
 * Milkdown is a heavyweight dependency, so it's loaded lazily to improve
 * initial page load. This component provides:
 * - React.lazy loading with Suspense fallback (skeleton UI)
 * - Error boundary for graceful failure recovery
 *
 * Used in TaskDetailPanel for the notes field. The editorKey prop ensures
 * the editor remounts when switching between tasks (necessary because
 * Milkdown doesn't support controlled value changes well).
 */
const MilkdownEditor = lazy(() =>
  import('./milkdown-editor').then((mod) => ({ default: mod.MilkdownEditor }))
)

// Error boundary to catch Milkdown rendering errors
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

  render() {
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

const MilkdownPreview = lazy(() =>
  import('./milkdown-editor').then((mod) => ({ default: mod.MilkdownPreview }))
)

interface LazyMilkdownEditorProps {
  editorKey: string
  defaultValue: string
  onChange: (value: string) => void
  className?: string
}

export function LazyMilkdownEditor(props: LazyMilkdownEditorProps) {
  return (
    <EditorErrorBoundary>
      <Suspense fallback={<EditorSkeleton />}>
        <MilkdownEditor {...props} />
      </Suspense>
    </EditorErrorBoundary>
  )
}

interface LazyMilkdownPreviewProps {
  content: string
  className?: string
}

export function LazyMilkdownPreview(props: LazyMilkdownPreviewProps) {
  return (
    <EditorErrorBoundary>
      <Suspense fallback={<PreviewSkeleton />}>
        <MilkdownPreview {...props} />
      </Suspense>
    </EditorErrorBoundary>
  )
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

function PreviewSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  )
}
