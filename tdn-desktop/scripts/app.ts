// Drives the running dev app through its debug-only agent bridge
// (src-tauri/src/agent_bridge) and the `window.__agentBridge` API it calls in the webview
// (src/lib/agent-bridge). Needs `bun run tauri:dev` to be running.
//
//   bun run app shot today                    # light + dark PNGs in docs/tasks-todo/temporary
//   bun run app view inbox                    # show a view, area or project
//   bun run app task "Call Dad"               # open a task in the detail panel
//   bun run app tree                          # outline of the visible UI, with refs to click
//
// Run `bun run app help` for every command.
import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import type { Target } from '../src/lib/agent-bridge/page'
import type { VaultDirs } from '../src/lib/agent-bridge/api'
import { diffShots } from './app-diff'
import { devIdentity } from './dev-slot'
import { parseDuration, parseLevel, readCrashes, readLogs } from './app-logs'

const USAGE = `Usage: bun run app <command> [args] [flags]

--window=quick-pane makes tree, click, fill, key, type, shot and eval act on the
quick entry pane instead of the main window.

Looking
  status                  App name, version, window size and theme, and the
                          checkout, branch and dev slot it belongs to
  state                   View, open task, sidebars, theme, vault, counts, dialogs and toasts
  tree                    Outline of the visible UI. Controls get [n] refs for click/fill
  shot [name]             PNGs of the window, light then dark, in docs/tasks-todo/temporary
                          --theme=light|dark|both  --size=<W>x<H>  --out=<dir>

Doing
  view <name>             Show today, this-week, inbox, calendar, no-area, or an area or
                          project by title or id
  task <title|id>         Open a task in the detail panel. A unique part of the title will do
  run <command-id>        Run a command palette command. --list shows the ids
  quick-entry             Open the quick entry pane (then use --window=quick-pane)
  type <text>             Type into the focused field or editor
  key <combo>             Send a key combo to the focused element, e.g. mod+k, escape
  click <target>          Click @<ref>, a CSS selector, or --text=<label>
  fill <target> <value>   Set an input's value. Target as for click
  resize <W>x<H>          Resize the window, in logical pixels
  reload                  Reload the webview, e.g. when HMR hasn't picked up a change
  goto <path>             Load another dev-server page in the window, e.g. /styleguide.html.
                          \`goto /\` returns to the app
  styleguide [section...] Screenshot styleguide sections (all by default) with shot's
                          flags, then return to the app
  eval <js>               Run JS in the webview and print the result. An expression,
                          or a function body if it contains "return". --timeout=<ms>

Test vaults
  reset                   Re-render this checkout's demo vault (demo-vaults/demo) to today
                          and rescan it
  vault [name|path]       Switch the dev app to a rendered vault in demo-vaults/ (e.g.
                          edge-cases, a persona vault) or any folder with a .taskdn.json.
                          No argument switches back to the demo vault

Logs (don't need the app running)
  logs                    Recent warnings and errors from Rust, the webview (including
                          console.*) and the tauri:dev terminal, repeats collapsed
                          --source=rust|js|dev  --level=debug|info|warn|error (warn)
                          --since=<30s|5m|2h|1d> (30m)  --grep=<regex>  --limit=<n> (50)
                          --full (don't truncate)
  logs --crashes          Recent crash reports, and a summary of the newest

Comparing (doesn't need the app running)
  diff <a> <b>            Pixel diff of two PNGs, or of every shot in folder a against the
                          newest shot with the same name in folder b (timestamps ignored),
                          e.g. diff docs/tasks-todo/temporary/baseline docs/tasks-todo/temporary.
                          Any changed pixel counts. Boxes are in image pixels (2x on retina).
                          Writes a diff image for each pair that differs
                          --out=<dir> (docs/tasks-todo/temporary/diff)`

interface BridgeInfo {
  port: number
  token: string
  pid: number
}
interface WindowInfo {
  width: number
  height: number
  scale: number
  theme: string
  visible: boolean
}
type Selection =
  | { type: 'nav'; id: string }
  | { type: 'area' | 'project'; id: string }
  | { type: 'no-area' }
interface AppState {
  view: Selection | null
  task: { id: string; title: string } | null
  vault: { tasks: string | null } | null
}

const root = path.join(import.meta.dir, '..')
const SHOT_DIR = 'docs/tasks-todo/temporary'
// Long enough for opening a large vault
const API_TIMEOUT_MS = 30_000

const args = process.argv.slice(2)
const flags = Object.fromEntries(
  args
    .filter(a => a.startsWith('--'))
    .map(a => {
      const [k, ...v] = a.slice(2).split('=')
      return [k, v.length ? v.join('=') : true]
    })
) as Record<string, string | true>
const [command, ...params] = args.filter(a => !a.startsWith('--'))
const targetWindow = typeof flags.window === 'string' ? flags.window : undefined

// The flags each command takes; anything else is rejected rather than ignored
const COMMAND_FLAGS: Record<string, string[]> = {
  shot: ['theme', 'size', 'out', 'window'],
  styleguide: ['theme', 'size', 'out'],
  tree: ['window'],
  key: ['window'],
  type: ['window'],
  click: ['text', 'window'],
  fill: ['text', 'window'],
  eval: ['timeout', 'window'],
  diff: ['out'],
  run: ['list'],
  logs: ['source', 'level', 'since', 'grep', 'limit', 'full', 'crashes'],
}
// The only flags that can be given without a value
const SWITCHES = ['list', 'full', 'crashes']

function print(value: unknown) {
  console.log(
    typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  )
}

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false
  )

// The bridge writes its port and token to the dev app's data dir on startup.
// The dev identity (from this checkout's dev slot) decides which app that is.
let bridge: BridgeInfo | undefined
async function bridgeInfo(): Promise<BridgeInfo> {
  if (bridge) return bridge
  const { identifier, root: checkoutRoot } = await devIdentity()
  const file = Bun.file(
    path.join(
      homedir(),
      'Library/Application Support',
      identifier,
      'agent-bridge.json'
    )
  )
  const notRunning = `the dev app isn't running. Start it with \`bun run tauri:dev\` in ${path.join(checkoutRoot, 'tdn-desktop')}`
  if (!(await file.exists())) throw new Error(notRunning)
  const info = (await file.json()) as BridgeInfo
  // A dev app that crashed or was killed leaves its file behind, and its port
  // may now belong to another app's bridge
  if (!isRunning(info.pid)) throw new Error(notRunning)
  bridge = info
  return bridge
}

/** Whether a process is alive. EPERM means it exists but belongs to someone else. */
function isRunning(pid: number) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM'
  }
}

async function call<T>(
  method: 'GET' | 'POST',
  route: string,
  body?: unknown
): Promise<T> {
  const { port, token, pid } = await bridgeInfo()
  let response: Response
  try {
    response = await fetch(`http://127.0.0.1:${port}${route}`, {
      method,
      headers: {
        'x-agent-bridge-token': token,
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error(
      isRunning(pid)
        ? `can't reach the bridge on port ${port}. Is \`bun run tauri:dev\` still running?`
        : "the dev app isn't running (it stopped without cleaning up). Start it with `bun run tauri:dev`"
    )
  }
  const result = (await response.json()) as {
    ok: boolean
    value?: T
    error?: string
  }
  if (!result.ok) throw new Error(result.error ?? `HTTP ${response.status}`)
  return result.value as T
}

/** The window's size and theme. Defaults to the window `--window` names. */
function windowInfo(window = targetWindow) {
  return call<WindowInfo>(
    'GET',
    window ? `/window?window=${encodeURIComponent(window)}` : '/window'
  )
}

/**
 * A JavaScript literal for `value`. JSON is valid JS except for a few characters
 * that can end a script or a line, so those are escaped.
 */
function jsLiteral(value: unknown): string {
  return JSON.stringify(value).replace(
    /[<>/\u2028\u2029]/g,
    c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`
  )
}

/**
 * Calls a `window.__agentBridge` method in the webview, inside `withFrames` so
 * that UI waiting on animation frames still works while the window is hidden.
 * Acts on the window `--window` names, or the main window.
 */
function callApi<T = unknown>(
  method: string,
  ...methodArgs: unknown[]
): Promise<T> {
  const js =
    `if (!window.__agentBridge) throw new Error("window.__agentBridge isn't installed. Is the app's page loaded?")\n` +
    `if (!window.__agentBridge.${method}) throw new Error("${method} only works in the main window")\n` +
    `return await window.__agentBridge.withFrames(() => window.__agentBridge.${method}(...${jsLiteral(methodArgs)}))`
  return call<T>('POST', '/eval', {
    js,
    timeoutMs: API_TIMEOUT_MS,
    window: targetWindow,
  })
}

/** Reads a positive whole number from a flag's value. */
function parsePositiveInt(name: string, value: string): number {
  const number = Number(value)
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`--${name} must be a positive whole number, got "${value}"`)
  }
  return number
}

function parseSize(value: string | true | undefined) {
  const match = /^(\d+)x(\d+)$/.exec(typeof value === 'string' ? value : '')
  if (!match) throw new Error(`expected a size like 1200x800, got "${value}"`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

/** Reads a click/fill target from `--text=…` or the first param (`@12` or a selector). */
function parseTarget(): { target: Target; rest: string[] } {
  if (typeof flags.text === 'string')
    return { target: { text: flags.text }, rest: params }
  const [first, ...rest] = params
  if (!first)
    throw new Error('needs a target: @<ref>, a CSS selector, or --text=<label>')
  const ref = /^@(\d+)$/.exec(first)
  return { target: ref ? { ref: Number(ref[1]) } : { selector: first }, rest }
}

// A timestamp (YYYYMMDD-HHMMSS) shared by every shot in a run, so they sort together
function stamp() {
  return new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T-]/g, m => (m === 'T' ? '-' : ''))
}

/** The `view` argument that shows a selection again. */
function viewName(selection: Selection): string {
  return selection.type === 'no-area' ? 'no-area' : selection.id
}

/** Re-shows a view and task saved from `state`, after a page load reset them. */
async function restore(before: AppState | null) {
  if (before?.view) await callApi('view', viewName(before.view))
  if (before?.task) await callApi('task', before.task.id)
}

/**
 * Loads a dev-server page (`{ url: '/styleguide.html' }`) or reloads the current
 * one, then waits for the new page's API. The old page is marked first, so a
 * page without the mark is the new one.
 */
async function navigate(target: { url: string } | { reload: true }) {
  await call('POST', '/eval', { js: 'window.__agentBridgeReloading = true' })
  await call('POST', '/window', target)
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    await Bun.sleep(200)
    const fresh = await call<boolean>('POST', '/eval', {
      js: 'return Boolean(window.__agentBridge) && !window.__agentBridgeReloading',
    }).catch(() => false)
    if (fresh) {
      await callApi('idle')
      return
    }
  }
  throw new Error("the page didn't load within 15s")
}

/**
 * Screenshots the current page in each theme from `--theme`, at `--size` if
 * given, then restores the theme and size.
 */
async function takeShots(name: string) {
  const theme = flags.theme ?? 'both'
  if (theme !== 'light' && theme !== 'dark' && theme !== 'both') {
    throw new Error(`--theme must be light, dark or both, got "${theme}"`)
  }
  const themes = theme === 'both' ? ['light', 'dark'] : [theme]
  const out = typeof flags.out === 'string' ? flags.out : SHOT_DIR
  const runStamp = stamp()

  const before = await windowInfo()
  if (!before.visible) {
    throw new Error(
      `the ${targetWindow ?? 'main'} window is hidden${targetWindow === 'quick-pane' ? '. Open it with `app quick-entry`' : ''}`
    )
  }
  const pageTheme = await callApi<string>('getTheme')
  try {
    if (flags.size) {
      await call('POST', '/window', {
        window: targetWindow,
        ...parseSize(flags.size),
      })
    }
    await callApi('shotMode', true)
    for (const t of themes) {
      // The native appearance only affects vibrancy, which snapshots don't
      // capture. The page theme is set directly because a hidden window doesn't
      // get prefers-color-scheme changes until it renders again.
      await call('POST', '/window', { window: targetWindow, theme: t })
      await callApi('setTheme', t)
      await callApi('idle')
      const window = await windowInfo()
      const file = path.resolve(
        root,
        out,
        `${name}-${t}-${window.width}x${window.height}-${runStamp}.png`
      )
      const shot = await call<{ width: number; height: number }>(
        'POST',
        '/snapshot',
        { path: file, window: targetWindow }
      )
      print(`${path.relative(root, file)} (${shot.width}x${shot.height}px)`)
    }
  } finally {
    await callApi('shotMode', false)
    await call('POST', '/window', { window: targetWindow, theme: 'system' })
    await callApi('setTheme', pageTheme)
    if (flags.size) {
      await call('POST', '/window', {
        window: targetWindow,
        width: before.width,
        height: before.height,
      })
    }
  }
}

/** The rendered vaults in this checkout's demo-vaults/. */
async function renderedVaults(checkoutRoot: string): Promise<string[]> {
  const dir = path.join(checkoutRoot, 'demo-vaults')
  const names = await readdir(dir).catch(() => [])
  const vaults: string[] = []
  for (const name of names) {
    if (await exists(path.join(dir, name, '.taskdn.json'))) vaults.push(name)
  }
  return vaults
}

const commands: Record<string, () => Promise<void>> = {
  async status() {
    const health = await call<{ app: string; version: string; pid: number }>(
      'GET',
      '/health'
    )
    const window = await windowInfo()
    const identity = await devIdentity()
    print(
      `${health.app} ${health.version} (pid ${health.pid})\n` +
        `window ${window.width}x${window.height} @${window.scale}x, ${window.theme}\n` +
        `slot ${identity.slot}, port ${identity.port}, ${identity.branch} in ${identity.root}`
    )
  },

  async state() {
    print(await callApi('state'))
  },

  async tree() {
    print(await callApi('tree'))
  },

  async shot() {
    await takeShots(params[0] ?? targetWindow ?? 'app')
  },

  async view() {
    const name = params.join(' ')
    if (!name) throw new Error('view needs a name, e.g. inbox or an area title')
    print(await callApi('view', name))
  },

  async task() {
    const query = params.join(' ')
    if (!query) throw new Error('task needs a title or id')
    const task = await callApi<{ title: string; status: string }>('task', query)
    print(`opened "${task.title}" (${task.status})`)
  },

  async run() {
    if (flags.list) {
      const list = await callApi<{ id: string; label: string }[]>('commands')
      print(list.map(c => `${c.id.padEnd(40)} ${c.label}`).join('\n'))
      return
    }
    if (!params[0])
      throw new Error('run needs a command id. `run --list` shows them')
    await callApi('run', params[0])
    print(`ran ${params[0]}`)
  },

  async 'quick-entry'() {
    await callApi('quickEntry')
    print('opened the quick entry pane. Use --window=quick-pane to drive it')
  },

  async type() {
    const text = params.join(' ')
    if (!text) throw new Error('type needs some text')
    const into = await callApi<string>('type', text)
    print(`typed ${text.length} characters into ${into}`)
  },

  async key() {
    if (!params[0]) throw new Error('key needs a combo, e.g. mod+k')
    const result = await callApi<{ target: string; handled: boolean }>(
      'key',
      params[0]
    )
    print(
      `${params[0]} → ${result.target}${result.handled ? ' (handled)' : ''}`
    )
  },

  async click() {
    const { target } = parseTarget()
    print(`clicked ${await callApi<string>('click', target)}`)
  },

  async fill() {
    const { target, rest } = parseTarget()
    print(`filled ${await callApi<string>('fill', target, rest.join(' '))}`)
  },

  async reload() {
    const before = await callApi<AppState>('state').catch(() => null)
    await navigate({ reload: true })
    await restore(before)
    print('reloaded')
  },

  async goto() {
    const target = params[0]
    if (!target?.startsWith('/')) {
      throw new Error(
        'goto needs a path on the dev server, e.g. /styleguide.html'
      )
    }
    await navigate({ url: target })
    print(`at ${target}`)
  },

  async styleguide() {
    // Loading the styleguide reloads the app, so note what was open to restore it
    const before = await callApi<AppState>('state').catch(() => null)
    // The index page links to every section
    await navigate({ url: '/styleguide.html' })
    const all = await call<string[]>('POST', '/eval', {
      js: 'return [...document.querySelectorAll("[data-section]")].map(a => a.dataset.section)',
    })
    const unknown = params.filter(id => !all.includes(id))
    try {
      if (unknown.length) {
        throw new Error(
          `unknown sections: ${unknown.join(', ')}. Sections: ${all.join(', ')}`
        )
      }
      for (const id of params.length ? params : all) {
        await navigate({ url: `/styleguide.html?section=${id}` })
        await takeShots(`styleguide-${id}`)
      }
    } finally {
      await navigate({ url: '/' })
      await restore(before)
    }
  },

  async resize() {
    const window = await call<WindowInfo>(
      'POST',
      '/window',
      parseSize(params[0])
    )
    print(`window ${window.width}x${window.height}`)
  },

  async reset() {
    const { root: checkoutRoot } = await devIdentity()
    const render = Bun.spawnSync(['bun', 'run', 'vault', 'render', 'demo'], {
      cwd: checkoutRoot,
      stderr: 'inherit',
    })
    if (!render.success) throw new Error('`bun run vault render demo` failed')
    const demo = path.join(checkoutRoot, 'demo-vaults/demo')
    const state = await callApi<AppState>('state')
    if (state.vault?.tasks?.startsWith(demo)) {
      const counts = await callApi('refreshVault')
      print(
        `re-rendered demo-vaults/demo and rescanned it: ${JSON.stringify(counts)}`
      )
    } else {
      print(
        're-rendered demo-vaults/demo. The app has another vault open; `app vault` switches to it'
      )
    }
  },

  async vault() {
    const { root: checkoutRoot } = await devIdentity()
    const name = params[0] ?? 'demo'
    const dir =
      name.includes('/') || name.startsWith('.')
        ? path.resolve(name)
        : path.join(checkoutRoot, 'demo-vaults', name)
    const config = Bun.file(path.join(dir, '.taskdn.json'))
    if (!(await config.exists())) {
      const vaults = await renderedVaults(checkoutRoot)
      throw new Error(
        `${dir} has no .taskdn.json. Rendered vaults: ${vaults.join(', ') || 'none'}. ` +
          'Make one with `bun run vault render <template>` at the repo root'
      )
    }
    // Only the folders: the dev app keeps its own ignore patterns
    const { tasksDir, projectsDir, areasDir } =
      (await config.json()) as VaultDirs
    const dirs: VaultDirs = { tasksDir, projectsDir, areasDir }
    const state = await callApi<{ counts: Record<string, number> }>(
      'openVault',
      dirs
    )
    print(
      `opened ${path.relative(checkoutRoot, dir) || dir}: ${JSON.stringify(state.counts)}`
    )
  },

  async logs() {
    const { identifier, productName } = await devIdentity()
    if (flags.crashes) {
      print(await readCrashes([productName, 'Taskdn Desktop']))
      return
    }
    const value = (name: string) =>
      typeof flags[name] === 'string' ? flags[name] : undefined
    const source = value('source')
    if (source && source !== 'rust' && source !== 'js' && source !== 'dev') {
      throw new Error(`--source must be rust, js or dev, got "${source}"`)
    }
    const grep = value('grep')
    print(
      await readLogs(identifier, productName, {
        source,
        level: parseLevel(value('level') ?? 'warn'),
        sinceMs: parseDuration(value('since') ?? '30m'),
        grep: grep ? new RegExp(grep, 'i') : undefined,
        limit: parsePositiveInt('limit', value('limit') ?? '50'),
        full: Boolean(flags.full),
      })
    )
  },

  async diff() {
    const [a, b] = params
    if (!a || !b) {
      throw new Error(
        'diff needs two PNGs or two folders of shots, e.g. docs/tasks-todo/temporary/baseline docs/tasks-todo/temporary'
      )
    }
    const out = typeof flags.out === 'string' ? flags.out : `${SHOT_DIR}/diff`
    print(
      await diffShots(
        path.resolve(a),
        path.resolve(b),
        path.resolve(root, out),
        root
      )
    )
  },

  async eval() {
    const js = params.join(' ')
    if (!js)
      throw new Error(
        'eval needs some JS, e.g. `bun run app eval document.title`'
      )
    const timeoutMs =
      typeof flags.timeout === 'string'
        ? parsePositiveInt('timeout', flags.timeout)
        : undefined
    const body = /\breturn\b/.test(js) ? js : `return (${js})`
    print(
      await call('POST', '/eval', { js: body, timeoutMs, window: targetWindow })
    )
  },
}

const run = command ? commands[command] : undefined
if (!command || !run) {
  if (command && command !== 'help')
    console.error(`app: unknown command "${command}"\n`)
  console.log(USAGE)
  process.exit(command && command !== 'help' ? 1 : 0)
}
const unknownFlags = Object.keys(flags).filter(
  flag => !(COMMAND_FLAGS[command] ?? []).includes(flag)
)
if (unknownFlags.length) {
  const allowed = COMMAND_FLAGS[command]?.map(f => `--${f}`).join(', ')
  console.error(
    `app: ${command} doesn't take ${unknownFlags.map(f => `--${f}`).join(', ')}` +
      (allowed ? `. It takes ${allowed}` : '')
  )
  process.exit(1)
}
// `--grep=` counts as missing too
const bareFlags = Object.keys(flags).filter(
  flag =>
    (flags[flag] === true || flags[flag] === '') && !SWITCHES.includes(flag)
)
if (bareFlags.length) {
  console.error(
    `app: ${bareFlags.map(f => `--${f}`).join(', ')} needs a value, e.g. --${bareFlags[0]}=…`
  )
  process.exit(1)
}

try {
  await run()
} catch (error) {
  console.error(
    `app: ${error instanceof Error ? error.message : String(error)}`
  )
  process.exit(1)
}
