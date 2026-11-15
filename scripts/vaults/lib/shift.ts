/**
 * Moves every date in a vault by the same number of days: dates in text files
 * and dates in file and folder names (e.g. day notes). Shifting everything
 * together keeps a consistent vault consistent.
 */

import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { addDays, shiftDatesInText } from './dates.ts'
import { META_FILE, readMeta, writeMeta } from './meta.ts'

const TEXT_EXTENSIONS = new Set(['.md', '.base', '.canvas'])

/** Entries the shift never looks inside. */
const SKIP = new Set(['.obsidian', '.git', 'node_modules', META_FILE])

export function shiftVault(vaultDir: string, days: number): void {
  if (days === 0) return
  shiftDir(vaultDir, days)
  const meta = readMeta(vaultDir)
  writeMeta(vaultDir, { ...meta, referenceDate: addDays(meta.referenceDate, days) })
}

function shiftDir(dir: string, days: number): void {
  const renames: Array<[from: string, to: string]> = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const path = join(dir, entry.name)

    if (entry.isDirectory()) {
      shiftDir(path, days)
    } else if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name))) {
      const text = readFileSync(path, 'utf8')
      const shifted = shiftDatesInText(text, days)
      if (shifted !== text) writeFileSync(path, shifted)
    }

    const newName = shiftDatesInText(entry.name, days)
    if (newName !== entry.name) renames.push([entry.name, newName])
  }

  // Rename via temporary names, so shifting 01-15 onto 01-25 can't overwrite
  // a 01-25 that hasn't moved yet
  for (const [from] of renames) renameSync(join(dir, from), join(dir, `${from}.shifting`))
  for (const [from, to] of renames) renameSync(join(dir, `${from}.shifting`), join(dir, to))
}
