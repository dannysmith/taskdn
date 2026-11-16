/**
 * Creating vaults in `demo-vaults/`: an empty one, or a copy of a template
 * with its dates shifted to a target day.
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { daysBetween } from './dates.ts'
import { readMeta, writeMeta, type VaultMeta } from './meta.ts'
import { isInsideVaultsDir } from './paths.ts'
import { setUpVault } from './setup.ts'
import { shiftVault } from './shift.ts'

const COPY_SKIP = new Set(['.obsidian', '.claude'])

/** Create an empty vault whose reference date is `referenceDate`. */
export function newVault(vaultDir: string, referenceDate: string): string[] {
  const kept = clearVault(vaultDir)
  const meta: VaultMeta = { referenceDate }
  writeMeta(vaultDir, meta)
  restore(vaultDir, kept)
  return setUpVault(vaultDir, meta)
}

/**
 * Copy a template into `vaultDir`, replacing what's there, and shift its dates
 * so the template's reference date lands on `targetDate`.
 */
export function renderTemplate(
  templateDir: string,
  vaultDir: string,
  targetDate: string,
): string[] {
  const templateMeta = readMeta(templateDir)
  const [from, to] = [resolve(templateDir), resolve(vaultDir)]
  if (from === to || to.startsWith(from + sep) || from.startsWith(to + sep)) {
    throw new Error(`can't render ${templateDir} into ${vaultDir}: they overlap`)
  }
  const kept = clearVault(vaultDir)
  cpSync(templateDir, vaultDir, {
    recursive: true,
    // A template opened in Obsidian gets its own .obsidian, which the shared base
    // replaces. Claude Code leaves empty .claude folders behind; git ignores them.
    filter: (src) => !COPY_SKIP.has(basename(src)),
  })
  shiftVault(vaultDir, daysBetween(templateMeta.referenceDate, targetDate))
  restore(vaultDir, kept)
  return setUpVault(vaultDir, readMeta(vaultDir))
}

/** Obsidian's per-vault UI state, kept across re-renders. */
const KEEP = /^workspace.*\.json$/

/**
 * Empty `vaultDir` (creating it if needed) and return the Obsidian state files
 * worth putting back. Refuses to touch anything outside `demo-vaults/`.
 */
function clearVault(vaultDir: string): Map<string, string> {
  if (!isInsideVaultsDir(vaultDir)) {
    throw new Error(`Refusing to write ${vaultDir}: vaults live inside demo-vaults/`)
  }
  const kept = new Map<string, string>()
  const obsidianDir = join(vaultDir, '.obsidian')
  if (existsSync(obsidianDir)) {
    for (const name of readdirSync(obsidianDir)) {
      if (KEEP.test(name)) kept.set(name, readFileSync(join(obsidianDir, name), 'utf8'))
    }
  }
  rmSync(vaultDir, { recursive: true, force: true })
  mkdirSync(vaultDir, { recursive: true })
  return kept
}

function restore(vaultDir: string, kept: Map<string, string>): void {
  if (kept.size === 0) return
  const obsidianDir = join(vaultDir, '.obsidian')
  mkdirSync(obsidianDir, { recursive: true })
  for (const [name, content] of kept) writeFileSync(join(obsidianDir, name), content)
}
