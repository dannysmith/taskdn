/**
 * Write areas, projects and tasks as S1 files from plain objects. Used to
 * generate vaults programmatically, and by Claude when building persona
 * vaults. Links take a title (`Acme Corp`) or a ready-made `[[...]]` link and
 * are written quoted, as Taskdn's tools write them.
 *
 * Projects and areas are named after their titles (`Acme Corp.md`), so links
 * by title resolve in Obsidian too; tasks get slugs, as the CLI names them.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { entityDirs, type VaultMeta } from './meta.ts'

export interface AreaInput {
  title: string
  status?: 'active' | 'archived'
  type?: string
  description?: string
  body?: string
  /** Filename without `.md`; defaults to the title */
  filename?: string
}

export interface ProjectInput {
  title: string
  status?: string
  area?: string
  startDate?: string
  endDate?: string
  description?: string
  blockedBy?: string[]
  body?: string
  /** Filename without `.md`; defaults to the title */
  filename?: string
}

export interface TaskInput {
  title: string
  status: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  due?: string
  scheduled?: string
  deferUntil?: string
  /** Project title or link; written as a one-item `projects` list */
  project?: string
  area?: string
  body?: string
  /** Write to `tasks/archive/` */
  archived?: boolean
  /** Filename without `.md`; defaults to a slug of the title */
  filename?: string
}

/** Same rules as the CLI's slugify, so filenames match `tdn new`. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[ _]/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100)
    .replace(/-$/, '')
  return slug || 'untitled'
}

/** A title as a filename: drops characters that filesystems or Obsidian links can't take. */
export function titleFilename(title: string): string {
  const name = title
    .replace(/[\\/:*?"<>|#^[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return name || 'Untitled'
}

export function writeArea(vaultDir: string, meta: VaultMeta, area: AreaInput): string {
  const { areasDir } = entityDirs(vaultDir, meta)
  return writeEntity(areasDir, area.filename ?? titleFilename(area.title), area.body, [
    ['title', area.title],
    ['type', area.type],
    ['status', area.status ?? 'active'],
    ['description', area.description],
  ])
}

export function writeProject(vaultDir: string, meta: VaultMeta, project: ProjectInput): string {
  const { projectsDir } = entityDirs(vaultDir, meta)
  return writeEntity(projectsDir, project.filename ?? titleFilename(project.title), project.body, [
    ['title', project.title],
    ['status', project.status],
    ['area', link(project.area)],
    ['description', project.description],
    ['start-date', project.startDate],
    ['end-date', project.endDate],
    ['blocked-by', project.blockedBy?.map((p) => link(p)!)],
  ])
}

export function writeTask(vaultDir: string, meta: VaultMeta, task: TaskInput): string {
  const { tasksDir } = entityDirs(vaultDir, meta)
  const dir = task.archived ? join(tasksDir, 'archive') : tasksDir
  return writeEntity(dir, task.filename ?? slugify(task.title), task.body, [
    ['title', task.title],
    ['status', task.status],
    ['created-at', task.createdAt],
    ['updated-at', task.updatedAt],
    ['completed-at', task.completedAt],
    ['due', task.due],
    ['scheduled', task.scheduled],
    ['defer-until', task.deferUntil],
    ['projects', task.project ? [link(task.project)!] : undefined],
    ['area', link(task.area)],
  ])
}

/** `Acme Corp` becomes `[[Acme Corp]]`; an existing link is kept as is. */
function link(target: string | undefined): string | undefined {
  if (!target) return undefined
  return target.startsWith('[[') ? target : `[[${target}]]`
}

type Field = [key: string, value: string | string[] | undefined]

function writeEntity(
  dir: string,
  baseName: string,
  body: string | undefined,
  fields: Field[],
): string {
  mkdirSync(dir, { recursive: true })
  let name = baseName
  for (let n = 1; existsSync(join(dir, `${name}.md`)); n++) name = `${baseName}-${n}`

  const lines = ['---']
  for (const [key, value] of fields) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      lines.push(`${key}:`, ...value.map((v) => `  - ${yamlString(v)}`))
    } else {
      lines.push(`${key}: ${yamlString(value)}`)
    }
  }
  lines.push('---')

  const path = join(dir, `${name}.md`)
  writeFileSync(path, lines.join('\n') + '\n' + (body ? `\n${body.trim()}\n` : ''))
  return path
}

/** Plain scalars stay bare (titles, statuses, dates); anything YAML could misread is quoted. */
function yamlString(value: string): string {
  const plain =
    /^[A-Za-z0-9][\w .,'()/&+-]*$/.test(value) &&
    !/^(true|false|yes|no|null|~)$/i.test(value) &&
    !/^[\d.]+$/.test(value)
  const hasColonSpace = value.includes(': ') || value.endsWith(':')
  return plain && !hasColonSpace && value === value.trim() ? value : JSON.stringify(value)
}
