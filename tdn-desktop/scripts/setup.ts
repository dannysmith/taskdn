// `bun run setup`: gets this checkout's desktop app ready to work on. Safe to rerun.
//
// Everywhere: installs dependencies and renders the demo vault the dev app opens
// (demo-vaults/demo at the repo root) if it's missing.
// In a git worktree it also:
//   - claims a dev slot (scripts/dev-slot.ts) and empties that slot's app data,
//     so the dev app doesn't start with the last branch's preferences or vault
//   - clones the main checkout's Rust build (copy-on-write), so the first
//     `tauri:dev` only rebuilds the app crate instead of every dependency
//
// worktrunk runs it when it creates a worktree (.config/wt.toml at the repo root).
import { readdir, rm, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import {
  APP_DIR,
  type Checkout,
  checkout,
  devIdentity,
  git,
  lowestFreeSlot,
  MAX_SLOT,
  readSlotFile,
  SLOT_FILE,
  slotIdentity,
} from './dev-slot'

// Gitignored folder cloned from the main checkout when a worktree doesn't have it
const RUST_TARGET = path.join(APP_DIR, 'src-tauri/target')

const exists = (p: string) =>
  stat(p).then(
    () => true,
    () => false
  )

function run(cmd: string[], cwd: string) {
  console.log(`$ ${cmd.join(' ')}`)
  const result = Bun.spawnSync(cmd, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })
  if (!result.success) throw new Error(`${cmd.join(' ')} failed`)
}

/** Paths of the other worktrees of this repo, main checkout included. */
function otherWorktrees(root: string): string[] {
  return git(root, 'worktree', 'list', '--porcelain')
    .split('\n')
    .filter(line => line.startsWith('worktree '))
    .map(line => line.slice('worktree '.length))
    .filter(p => p !== root)
}

/**
 * Whether anything listens on a localhost port. Vite listens on `localhost`,
 * which on macOS is IPv6 (::1), so both addresses are tried.
 */
async function portInUse(port: number): Promise<boolean> {
  for (const hostname of ['127.0.0.1', '::1']) {
    // Bun needs a data callback; nothing is read
    const socket = { data: () => undefined }
    const open = await Bun.connect({ hostname, port, socket })
      .then(socket => (socket.end(), true))
      .catch(() => false)
    if (open) return true
  }
  return false
}

/** The app data folder Tauri's `app_data_dir()` gives an identifier on macOS and Linux. */
function appDataDir(identifier: string): string {
  if (process.platform === 'darwin') {
    return path.join(homedir(), 'Library/Application Support', identifier)
  }
  const dataHome =
    process.env.XDG_DATA_HOME || path.join(homedir(), '.local/share')
  return path.join(dataHome, identifier)
}

/**
 * Picks the lowest free slot, empties its app data, then records it in the
 * slot file. Recording it last means an interrupted run empties it again.
 */
async function claimSlot(current: Checkout) {
  const recorded = (
    await Promise.all(otherWorktrees(current.root).map(readSlotFile))
  ).filter(slot => slot !== null)
  // A removed worktree's dev app can still be running on its slot
  const running: number[] = []
  for (let slot = 1; slot <= MAX_SLOT; slot++) {
    if (recorded.includes(slot)) continue
    const { port } = await slotIdentity(slot, current)
    if (await portInUse(port)) running.push(slot)
  }
  const slot = lowestFreeSlot([...recorded, ...running])
  if (slot === null) {
    throw new Error(
      `all ${MAX_SLOT} dev slots are taken (worktrees: ${recorded.join(', ') || 'none'}, ` +
        `still running: ${running.join(', ') || 'none'}). Remove a worktree or stop its tauri:dev first`
    )
  }

  const { identifier } = await slotIdentity(slot, current)
  const dataDir = appDataDir(identifier)
  const leftovers = await readdir(dataDir).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return []
      throw error
    }
  )
  await Promise.all(
    leftovers.map(name =>
      rm(path.join(dataDir, name), { recursive: true, force: true })
    )
  )
  await writeFile(path.join(current.root, APP_DIR, SLOT_FILE), `${slot}\n`)
}

const current = checkout()
const { root } = current

run(['bun', 'install'], path.join(root, APP_DIR))
if (!(await exists(path.join(root, 'demo-vaults/demo')))) {
  run(['bun', 'run', 'vault', 'render', 'demo'], root)
}

if (!current.isMain) {
  if ((await readSlotFile(root)) === null) await claimSlot(current)

  const from = path.join(current.mainRoot, RUST_TARGET)
  const to = path.join(root, RUST_TARGET)
  if (!(await exists(to)) && (await exists(from))) {
    // On macOS -c clones with APFS clonefile, so the copy shares disk until
    // files change. GNU cp has no clone flag, so elsewhere it's a full copy.
    const flags = process.platform === 'darwin' ? '-cR' : '-R'
    run(['cp', flags, from, to], root)
  }
}

const identity = await devIdentity(current)
console.log(
  `\nReady: slot ${identity.slot}, ${identity.productName} on port ${identity.port}. ` +
    'Start it with `bun run tauri:dev`.'
)
