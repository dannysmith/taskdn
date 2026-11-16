/**
 * Makes a folder a usable vault for every Taskdn tool: entity folders, the
 * shared Obsidian config with the taskdn plugin enabled, links to the local
 * plugin build with per-vault settings, and a `.taskdn.json` so `tdn` run from the vault root
 * uses it. Safe to run again on an existing vault.
 */

import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, join, relative } from 'node:path'
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
  cpSync(OBSIDIAN_BASE_DIR, obsidianDir, {
    recursive: true,
    filter: (src) => basename(src) !== '.claude',
  })

  // Link the plugin's build files rather than its folder, so each vault keeps
  // its own data.json (settings) instead of writing into the plugin repo
  const pluginSource = obsidianPluginSource()
  const pluginDir = join(obsidianDir, 'plugins', 'taskdn')
  if (existsSync(join(pluginSource, 'manifest.json'))) {
    mkdirSync(pluginDir, { recursive: true })
    for (const file of ['main.js', 'manifest.json', 'styles.css']) {
      const link = join(pluginDir, file)
      rmSync(link, { force: true })
      symlinkSync(join(pluginSource, file), link)
    }
    const settings = {
      tasksDirectory: relative(vaultDir, dirs.tasksDir),
      useTaskTitleAsInlineTitle: true,
    }
    writeFileSync(join(pluginDir, 'data.json'), JSON.stringify(settings, null, 2) + '\n')
    if (!existsSync(join(pluginSource, 'main.js'))) {
      notes.push(`The Obsidian plugin at ${pluginSource} isn't built (no main.js)`)
    }
  } else {
    notes.push(`No Obsidian plugin at ${pluginSource}; set TASKDN_OBSIDIAN_PLUGIN_DIR to link one`)
  }

  writeFileSync(join(vaultDir, '.taskdn.json'), JSON.stringify(dirs, null, 2) + '\n')
  return notes
}
