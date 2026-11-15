/**
 * Makes a folder a usable vault for every Taskdn tool: entity folders, the
 * shared Obsidian config with the taskdn plugin enabled, a symlink to the
 * local plugin build, and a `.taskdn.json` so `tdn` run from the vault root
 * uses it. Safe to run again on an existing vault.
 */

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { entityDirs, type VaultMeta } from './meta.ts'
import { OBSIDIAN_BASE_DIR } from './paths.ts'

/** The local build of the Obsidian plugin, linked into every vault. */
export function obsidianPluginSource(): string {
  return process.env.TASKDN_OBSIDIAN_PLUGIN_DIR ?? join(homedir(), 'dev', 'obsidian-taskdn')
}

/** Returns notes worth showing the user (e.g. a missing plugin build). */
export function setUpVault(vaultDir: string, meta: VaultMeta): string[] {
  const notes: string[] = []
  const dirs = entityDirs(vaultDir, meta)
  for (const dir of Object.values(dirs)) mkdirSync(dir, { recursive: true })

  // Shared config wins over whatever is there, except Obsidian's own state
  // files (workspace, cache), which the base doesn't include
  const obsidianDir = join(vaultDir, '.obsidian')
  cpSync(OBSIDIAN_BASE_DIR, obsidianDir, { recursive: true })

  const pluginSource = obsidianPluginSource()
  const pluginLink = join(obsidianDir, 'plugins', 'taskdn')
  if (existsSync(join(pluginSource, 'manifest.json'))) {
    mkdirSync(join(obsidianDir, 'plugins'), { recursive: true })
    if (existsSync(pluginLink) || isSymlink(pluginLink))
      rmSync(pluginLink, { recursive: true, force: true })
    symlinkSync(pluginSource, pluginLink, 'dir')
    if (!existsSync(join(pluginSource, 'main.js'))) {
      notes.push(`The Obsidian plugin at ${pluginSource} isn't built (no main.js)`)
    }
  } else {
    notes.push(`No Obsidian plugin at ${pluginSource}; set TASKDN_OBSIDIAN_PLUGIN_DIR to link one`)
  }

  writeFileSync(join(vaultDir, '.taskdn.json'), JSON.stringify(dirs, null, 2) + '\n')
  return notes
}

function isSymlink(path: string): boolean {
  try {
    return lstatSync(path).isSymbolicLink()
  } catch {
    return false
  }
}
