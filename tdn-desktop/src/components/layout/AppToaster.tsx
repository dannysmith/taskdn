import { Toaster } from 'sonner'
import { useTheme } from '@/hooks/use-theme'

/**
 * The app's toast container, styled with its theme tokens. Also used by the
 * styleguide, which passes `expand` so every toast shows instead of a stack.
 */
export function AppToaster({ expand = false }: { expand?: boolean }) {
  const { theme } = useTheme()
  return (
    <Toaster
      expand={expand}
      position="bottom-right"
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
    />
  )
}
