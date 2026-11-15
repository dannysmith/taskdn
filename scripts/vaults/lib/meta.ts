/**
 * `.vault.json` at the root of every template and rendered vault. It records
 * the day the vault's dates are written relative to, and optionally where its
 * entity folders are when they aren't the default `tasks/`, `projects/` and
 * `areas/`.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { isIsoDate } from './dates.ts'

export interface VaultMeta {
  /** The vault's dates are written as if today were this date. */
  referenceDate: string
  /** Entity folders relative to the vault root, when not the defaults. */
  folders?: { tasks?: string; projects?: string; areas?: string }
}

export const META_FILE = '.vault.json'

export function readMeta(vaultDir: string): VaultMeta {
  const file = join(vaultDir, META_FILE)
  if (!existsSync(file)) throw new Error(`No ${META_FILE} in ${vaultDir}`)
  const meta = JSON.parse(readFileSync(file, 'utf8')) as VaultMeta
  if (!isIsoDate(meta.referenceDate)) {
    throw new Error(`${file}: referenceDate must be a YYYY-MM-DD date`)
  }
  return meta
}

export function writeMeta(vaultDir: string, meta: VaultMeta): void {
  writeFileSync(join(vaultDir, META_FILE), JSON.stringify(meta, null, 2) + '\n')
}

/** Absolute paths of the vault's three entity folders. */
export function entityDirs(vaultDir: string, meta: VaultMeta) {
  return {
    tasksDir: resolve(vaultDir, meta.folders?.tasks ?? 'tasks'),
    projectsDir: resolve(vaultDir, meta.folders?.projects ?? 'projects'),
    areasDir: resolve(vaultDir, meta.folders?.areas ?? 'areas'),
  }
}
