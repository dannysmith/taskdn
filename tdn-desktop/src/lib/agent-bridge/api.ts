/**
 * The main window's dev-only `window.__agentBridge` API, which the agent bridge
 * CLI (`bun run app`) calls through the bridge's `/eval` endpoint. It extends
 * the page API (`page.ts`) with Taskdn actions, built on the same command
 * context, stores and services the UI uses. Installed by the `AgentBridge`
 * component; React-side dependencies are passed in so this stays testable.
 */
import type { QueryClient } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { getAllCommands } from '@/lib/commands'
import { commandContext } from '@/hooks/use-command-context'
import { commands, type AppPreferences } from '@/lib/tauri-bindings'
import type { Theme } from '@/lib/theme-context'
import { preferencesQueryKeys } from '@/services/preferences'
import { reinitializeVault, vaultQueryKeys } from '@/services/vault'
import { useNavigationStore } from '@/store/navigation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
import { useUIStore } from '@/store/ui-store'
import type { NavId } from '@/types/navigation'
import { createPageApi } from './page'
import { labelOf } from './ui-tree'

export interface AgentApiDeps {
  queryClient: QueryClient
  getTheme: () => Theme
  setTheme: (theme: Theme) => void
}

/** A vault's three folders, as in its `.taskdn.json`. */
export interface VaultDirs {
  tasksDir: string
  projectsDir: string
  areasDir: string
}

const NAV_IDS: NavId[] = ['today', 'this-week', 'inbox', 'calendar']

/**
 * The item whose title matches `query`: an exact id, then an exact title
 * (ignoring case), then a title containing it. Throws if none or several match.
 */
export function findByTitle<T extends { id: string; title: string }>(
  items: T[],
  query: string,
  kind: string
): T {
  const wanted = query.toLowerCase()
  const byId = items.find(item => item.id === query)
  if (byId) return byId
  const exact = items.filter(item => item.title.toLowerCase() === wanted)
  const matches = exact.length
    ? exact
    : items.filter(item => item.title.toLowerCase().includes(wanted))
  const [only, ...others] = matches
  if (!only) throw new Error(`No ${kind} matches "${query}"`)
  if (others.length === 0) return only
  const titles = matches
    .slice(0, 10)
    .map(item => `"${item.title}"`)
    .join(', ')
  throw new Error(`${matches.length} ${kind}s match "${query}": ${titles}`)
}

async function loadPreferences(): Promise<AppPreferences> {
  const result = await commands.loadPreferences()
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

export function createAgentApi(deps: AgentApiDeps) {
  const page = createPageApi(deps)
  const { idle } = page

  async function state() {
    const { selection } = useNavigationStore.getState()
    const ui = useUIStore.getState()
    const task = commandContext.getSelectedTask()
    // From disk: switching vault clears the query cache
    const prefs = await loadPreferences()
    return {
      view: selection,
      task: task && { id: task.id, title: task.title, status: task.status },
      sidebars: { left: ui.leftSidebarVisible, right: ui.rightSidebarVisible },
      open: {
        commandPalette: ui.commandPaletteOpen,
        quickSearch: ui.quickSearchOpen,
        preferences: ui.preferencesOpen,
      },
      theme: {
        setting: deps.getTheme(),
        resolved: document.documentElement.classList.contains('dark')
          ? 'dark'
          : 'light',
      },
      vault: prefs && {
        tasks: prefs.tasksDir,
        projects: prefs.projectsDir,
        areas: prefs.areasDir,
      },
      counts: {
        tasks: commandContext.getTasks().length,
        projects: commandContext.getProjects().length,
        areas: commandContext.getAreas().length,
      },
      // Closed popups stay mounted, marked data-closed, during their exit animation
      dialogs: [
        ...document.querySelectorAll(
          ':is([role="dialog"], [role="alertdialog"]):not([data-closed])'
        ),
      ].map(el => labelOf(el)),
      toasts: [...document.querySelectorAll('[data-sonner-toast]')].map(el =>
        labelOf(el)
      ),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    }
  }

  function available() {
    return getAllCommands(commandContext)
  }

  return {
    ...page,
    state,

    /** Command palette commands available right now, with their labels. */
    commands() {
      return available().map(c => ({
        id: c.id,
        label: c.labelKey.startsWith('_dynamic:')
          ? c.labelKey.slice('_dynamic:'.length)
          : i18n.t(c.labelKey),
      }))
    },

    /** Runs a command palette command by id. */
    async run(id: string) {
      const command = available().find(c => c.id === id)
      if (!command) {
        throw new Error(
          `"${id}" isn't available right now. \`run --list\` shows the ids`
        )
      }
      await command.execute(commandContext)
      await idle()
    },

    /**
     * Shows a view: today, this-week, inbox, calendar, no-area, or an area or
     * project by title or id. Areas win over projects with the same title.
     */
    async view(name: string) {
      const { navigate } = useNavigationStore.getState()
      if ((NAV_IDS as string[]).includes(name)) {
        navigate({ type: 'nav', id: name as NavId })
      } else if (name === 'no-area') {
        navigate({ type: 'no-area' })
      } else {
        const areas = commandContext.getAreas()
        const area = areas.find(
          a => a.id === name || a.title.toLowerCase() === name.toLowerCase()
        )
        if (area) {
          navigate({ type: 'area', id: area.id })
        } else {
          const project = findByTitle(
            [...areas, ...commandContext.getProjects()],
            name,
            'area or project'
          )
          const isArea = areas.some(a => a.id === project.id)
          navigate({ type: isArea ? 'area' : 'project', id: project.id })
        }
      }
      await idle()
      return useNavigationStore.getState().selection
    },

    /** Opens a task in the detail panel, by title or id. */
    async task(query: string) {
      const task = findByTitle(commandContext.getTasks(), query, 'task')
      useTaskDetailStore.getState().openTask(task.id)
      await idle()
      return { id: task.id, title: task.title, status: task.status }
    },

    /** Shows the quick entry pane, which has its own window (`--window=quick-pane`). */
    async quickEntry() {
      const result = await commands.showQuickPane()
      if (result.status === 'error') throw new Error(result.error)
    },

    /** Rescans the vault from disk, e.g. after its files were replaced. */
    async refreshVault() {
      const result = await commands.refreshVault()
      if (result.status === 'error')
        throw new Error(JSON.stringify(result.error))
      await deps.queryClient.invalidateQueries({ queryKey: vaultQueryKeys.all })
      await idle()
      return (await state()).counts
    },

    /** Saves a vault's folders as the dev app's vault and opens it. */
    async openVault(dirs: VaultDirs) {
      const prefs = await loadPreferences()
      const saved = await commands.savePreferences({ ...prefs, ...dirs })
      if (saved.status === 'error') throw new Error(saved.error)
      await reinitializeVault(
        dirs.tasksDir,
        dirs.projectsDir,
        dirs.areasDir,
        prefs.ignore ?? null
      )
      await deps.queryClient.invalidateQueries({
        queryKey: preferencesQueryKeys.preferences(),
      })
      await idle()
      return state()
    },
  }
}
