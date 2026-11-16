import type React from 'react'
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Theme } from '@/lib/theme-context'
import { useTheme } from '@/hooks/use-theme'
import { createPageApi } from '@/lib/agent-bridge/page'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import {
  AlertDialogSection,
  ButtonsSection,
  CommandSection,
  ContentSection,
  DateSection,
  DialogSection,
  InputsSection,
  LayoutSection,
  MenusSection,
  PopoversSection,
  ProjectsSection,
  SelectSection,
  TaskCardsSection,
  TasksSection,
  ToastsSection,
} from './sections'

interface Section {
  id: string
  title: string
  Component: React.FC
  /** Covers the page or opens portals, so it's only shown on its own page. */
  overlay?: boolean
}

/** Each section is sized to fit the dev window, so it can be screenshotted whole. */
const SECTIONS: Section[] = [
  { id: 'tasks', title: 'Task rows and status', Component: TasksSection },
  { id: 'task-cards', title: 'Task cards', Component: TaskCardsSection },
  {
    id: 'projects',
    title: 'Projects and areas',
    Component: ProjectsSection,
  },
  { id: 'layout', title: 'Headers and headings', Component: LayoutSection },
  {
    id: 'buttons',
    title: 'Buttons, badges and indicators',
    Component: ButtonsSection,
  },
  { id: 'inputs', title: 'Inputs and fields', Component: InputsSection },
  {
    id: 'content',
    title: 'Notes, empty states and collapsibles',
    Component: ContentSection,
  },
  { id: 'select', title: 'Select', Component: SelectSection, overlay: true },
  {
    id: 'date',
    title: 'Date button and project picker',
    Component: DateSection,
    overlay: true,
  },
  {
    id: 'menus',
    title: 'Dropdown menu',
    Component: MenusSection,
    overlay: true,
  },
  {
    id: 'popovers',
    title: 'Popover and tooltip',
    Component: PopoversSection,
    overlay: true,
  },
  { id: 'dialog', title: 'Dialog', Component: DialogSection, overlay: true },
  {
    id: 'alert-dialog',
    title: 'Alert dialog',
    Component: AlertDialogSection,
    overlay: true,
  },
  {
    id: 'command',
    title: 'Command palette',
    Component: CommandSection,
    overlay: true,
  },
  { id: 'toasts', title: 'Toasts', Component: ToastsSection, overlay: true },
]

const THEMES: Theme[] = ['light', 'dark', 'system']

/**
 * `?section=<id>` shows one section on its own; without it, every inline
 * section is listed. `?theme=light|dark` overrides the theme.
 */
export function Styleguide() {
  const params = new URLSearchParams(window.location.search)
  const section = SECTIONS.find(s => s.id === params.get('section'))
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  useEffect(() => {
    const requested = params.get('theme') as Theme | null
    if (requested && THEMES.includes(requested)) setTheme(requested)
    // Only on load
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The agent bridge CLI drives screenshots through the same API as the app
  const latest = useRef({ theme, setTheme })
  useEffect(() => {
    latest.current = { theme, setTheme }
  })
  useEffect(() => {
    window.__agentBridge = createPageApi({
      queryClient,
      getTheme: () => latest.current.theme,
      setTheme: theme => latest.current.setTheme(theme),
    })
    return () => {
      delete window.__agentBridge
    }
  }, [queryClient])

  return (
    <TooltipProvider>
      {/* App.css locks html, body and #root for the app, so this scrolls instead */}
      <div className="h-screen overflow-y-auto bg-background text-foreground">
        {section ? (
          <main className="p-8">
            <h1 className="mb-6 text-lg font-semibold">{section.title}</h1>
            <section.Component />
          </main>
        ) : (
          <main className="mx-auto max-w-5xl space-y-16 p-8">
            <header className="space-y-4">
              <h1 className="text-2xl font-semibold">Taskdn styleguide</h1>
              <div className="flex gap-2">
                {THEMES.map(t => (
                  <Button
                    key={t}
                    size="sm"
                    variant={t === theme ? 'default' : 'outline'}
                    onClick={() => setTheme(t)}
                  >
                    {t}
                  </Button>
                ))}
              </div>
              <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {SECTIONS.map(s => (
                  <a
                    key={s.id}
                    data-section={s.id}
                    href={`?section=${s.id}`}
                    className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </header>
            {SECTIONS.filter(s => !s.overlay).map(s => (
              <section key={s.id} className="space-y-6">
                <h2 className="border-b pb-2 text-lg font-semibold">
                  {s.title}
                </h2>
                <s.Component />
              </section>
            ))}
          </main>
        )}
      </div>
    </TooltipProvider>
  )
}
