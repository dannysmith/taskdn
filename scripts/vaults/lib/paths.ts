/**
 * Where templates and rendered vaults live. Rendered vaults always go inside
 * `demo-vaults/` (gitignored), so commands that delete or overwrite a vault
 * can refuse to touch anything else.
 */

import { isAbsolute, join, relative, resolve } from 'node:path'

export const REPO_ROOT = resolve(import.meta.dir, '../../..')
export const TEMPLATES_DIR = join(REPO_ROOT, 'demo-vault-templates')
export const VAULTS_DIR = join(REPO_ROOT, 'demo-vaults')
export const OBSIDIAN_BASE_DIR = resolve(import.meta.dir, '../obsidian-base')

/** A vault name (`demo`) means `demo-vaults/demo`; a path is used as given. */
export function resolveVaultDir(nameOrPath: string): string {
  return nameOrPath.includes('/') ? resolve(nameOrPath) : join(VAULTS_DIR, nameOrPath)
}

/** A template name (`demo`) means `demo-vault-templates/demo`. */
export function resolveTemplateDir(nameOrPath: string): string {
  return nameOrPath.includes('/') ? resolve(nameOrPath) : join(TEMPLATES_DIR, nameOrPath)
}

/** True if `dir` is strictly inside `demo-vaults/`. */
export function isInsideVaultsDir(dir: string): boolean {
  const rel = relative(VAULTS_DIR, resolve(dir))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}
