import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Minimal error boundary for quick pane.
 * Shows a simple error message - user can press Escape to dismiss.
 */
export class QuickPaneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in dev for debugging
    if (import.meta.env.DEV) {
      console.error('Quick pane error:', error, errorInfo)
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="text-center">
            <p className="text-destructive font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">
              Press Escape to close
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
