/**
 * What a vault covers, relative to its reference date: counts by status, the
 * date buckets Taskdn's views care about (overdue, due today, newly available
 * and so on), unresolved links, and files that fail to parse. Used by
 * `vault report`, by tests that check a template's coverage, and to check
 * generated vaults.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { addDays, isIsoDate } from './dates.ts'
import { entityDirs, readMeta } from './meta.ts'

const TASK_STATUSES = ['inbox', 'icebox', 'ready', 'in-progress', 'blocked', 'dropped', 'done']
const PROJECT_STATUSES = ['planning', 'ready', 'blocked', 'in-progress', 'paused', 'done']
const AREA_STATUSES = ['active', 'archived']
const CLOSED = new Set(['done', 'dropped'])

export interface VaultReport {
  referenceDate: string
  tasks: {
    total: number
    archived: number
    byStatus: Record<string, number>
    /** Open tasks due before the reference date */
    overdue: number
    dueToday: number
    dueNext7Days: number
    scheduledToday: number
    /** Open tasks scheduled before the reference date */
    scheduledPast: number
    scheduledNext7Days: number
    deferredUntilToday: number
    deferredFuture: number
    completedLast7Days: number
    /** Tasks with neither a project nor an area */
    orphans: number
  }
  projects: {
    total: number
    byStatus: Record<string, number>
    /** Open projects whose end date has passed */
    pastEndDate: number
    endingNext7Days: number
    startingNext14Days: number
  }
  areas: { total: number; byStatus: Record<string, number> }
  links: { total: number; unresolved: string[] }
  problems: string[]
}

interface Entity {
  file: string
  name: string
  fm: Record<string, unknown>
}

export function reportVault(vaultDir: string): VaultReport {
  const meta = readMeta(vaultDir)
  const today = meta.referenceDate
  const dirs = entityDirs(vaultDir, meta)
  const problems: string[] = []

  const load = (dir: string) => readEntities(vaultDir, dir, problems)
  const active = load(dirs.tasksDir)
  const archived = load(join(dirs.tasksDir, 'archive'))
  const tasks = [...active, ...archived]
  const projects = load(dirs.projectsDir)
  const areas = load(dirs.areasDir)

  const d = (e: Entity, key: string) => dateOf(e.fm[key])
  const open = tasks.filter((t) => !CLOSED.has(String(t.fm.status)))
  const within = (date: string | undefined, from: number, to: number) =>
    date !== undefined && date >= addDays(today, from) && date <= addDays(today, to)

  checkStatuses(tasks, TASK_STATUSES, 'task', problems)
  checkStatuses(projects, PROJECT_STATUSES, 'project', problems)
  checkStatuses(areas, AREA_STATUSES, 'area', problems)

  const openProjects = projects.filter((p) => !CLOSED.has(String(p.fm.status)))

  return {
    referenceDate: today,
    tasks: {
      total: tasks.length,
      archived: archived.length,
      byStatus: countBy(tasks, 'status'),
      overdue: open.filter((t) => (d(t, 'due') ?? '9999') < today).length,
      dueToday: open.filter((t) => d(t, 'due') === today).length,
      dueNext7Days: open.filter((t) => within(d(t, 'due'), 1, 7)).length,
      scheduledToday: open.filter((t) => d(t, 'scheduled') === today).length,
      scheduledPast: open.filter((t) => (d(t, 'scheduled') ?? '9999') < today).length,
      scheduledNext7Days: open.filter((t) => within(d(t, 'scheduled'), 1, 7)).length,
      deferredUntilToday: open.filter((t) => d(t, 'defer-until') === today).length,
      deferredFuture: open.filter((t) => (d(t, 'defer-until') ?? '') > today).length,
      completedLast7Days: tasks.filter((t) => within(d(t, 'completed-at'), -7, 0)).length,
      orphans: tasks.filter((t) => !t.fm.projects && !t.fm.project && !t.fm.area).length,
    },
    projects: {
      total: projects.length,
      byStatus: countBy(projects, 'status'),
      pastEndDate: openProjects.filter((p) => (d(p, 'end-date') ?? '9999') < today).length,
      endingNext7Days: openProjects.filter((p) => within(d(p, 'end-date'), 0, 7)).length,
      startingNext14Days: projects.filter((p) => within(d(p, 'start-date'), 1, 14)).length,
    },
    areas: { total: areas.length, byStatus: countBy(areas, 'status') },
    links: checkLinks(tasks, projects, areas),
    problems,
  }
}

function readEntities(vaultDir: string, dir: string, problems: string[]): Entity[] {
  if (!existsSync(dir)) return []
  const entities: Entity[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const file = join(dir, entry.name)
    const where = relative(vaultDir, file)
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(file, 'utf8'))
    if (!match) {
      problems.push(`${where}: no frontmatter`)
      continue
    }
    try {
      const fm = (Bun.YAML.parse(match[1]!) ?? {}) as Record<string, unknown>
      if (typeof fm.title !== 'string' || fm.title === '') problems.push(`${where}: no title`)
      entities.push({ file: where, name: basename(entry.name, '.md'), fm })
    } catch (error) {
      problems.push(`${where}: invalid YAML (${(error as Error).message.split('\n')[0]})`)
    }
  }
  return entities
}

/** The date part of a date or datetime value, if it has one. */
function dateOf(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value !== 'string') return undefined
  const date = value.slice(0, 10)
  return isIsoDate(date) ? date : undefined
}

function countBy(entities: Entity[], key: string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const e of entities) {
    const value = String(e.fm[key] ?? '(none)')
    counts[value] = (counts[value] ?? 0) + 1
  }
  return counts
}

function checkStatuses(entities: Entity[], valid: string[], kind: string, problems: string[]) {
  for (const e of entities) {
    const status = e.fm.status
    if (status !== undefined && !valid.includes(String(status))) {
      problems.push(`${e.file}: unknown ${kind} status "${String(status)}"`)
    }
  }
}

/**
 * Project and area links, resolved by title or filename (S1 1.0 doesn't say
 * which, and the tools disagree), so this only flags links neither resolves.
 */
function checkLinks(tasks: Entity[], projects: Entity[], areas: Entity[]) {
  const names = (list: Entity[]) =>
    new Set(list.flatMap((e) => [String(e.fm.title ?? '').toLowerCase(), e.name.toLowerCase()]))
  const projectNames = names(projects)
  const areaNames = names(areas)
  const unresolved: string[] = []
  let total = 0

  const check = (from: Entity, value: unknown, targets: Set<string>) => {
    for (const raw of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      total++
      // An unquoted [[link]] is YAML for a nested list
      if (Array.isArray(raw)) {
        unresolved.push(`${from.file} → unquoted link [[${raw.flat().join(', ')}]]`)
        continue
      }
      const target = /^\[\[([^\]|#]+)/.exec(String(raw))?.[1]?.trim().toLowerCase()
      if (!target || !targets.has(target)) unresolved.push(`${from.file} → ${String(raw)}`)
    }
  }

  for (const t of tasks) {
    check(t, t.fm.projects ?? t.fm.project, projectNames)
    check(t, t.fm.area, areaNames)
  }
  for (const p of projects) check(p, p.fm.area, areaNames)
  return { total, unresolved }
}
