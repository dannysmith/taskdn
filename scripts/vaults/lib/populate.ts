/**
 * Fill a vault from a plan: JSON listing areas, projects, tasks and other
 * notes, with dates written relative to the vault's reference date. Claude
 * describes a vault as data; the writers take care of filenames and YAML.
 *
 * Relative dates: `D` is the reference date, `D+3` three days later, `D-10`
 * ten days earlier, and `D+1T17:00` a datetime. ISO dates pass through as is.
 * In titles, descriptions, bodies and note paths, `{{D+3}}` becomes the date.
 *
 * Each run adds to the vault, so a big vault can be written in several plans.
 * The whole plan is checked before anything is written.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, normalize } from 'node:path'
import { addDays, isIsoDate } from './dates.ts'
import { readMeta } from './meta.ts'
import { isInsideVaultsDir } from './paths.ts'
import {
  writeArea,
  writeProject,
  writeTask,
  type AreaInput,
  type ProjectInput,
  type TaskInput,
} from './writers.ts'

/** A task as written in a plan: `updatedAt` defaults to `completedAt`, then `createdAt`. */
export type PlanTask = Omit<TaskInput, 'updatedAt'> & { updatedAt?: string }

export interface VaultPlan {
  areas?: AreaInput[]
  projects?: ProjectInput[]
  tasks?: PlanTask[]
  /** Any other file, e.g. `{ "path": "day-notes/{{D-1}}.md", "body": "..." }` */
  notes?: Array<{ path: string; body: string }>
}

export interface PopulateResult {
  areas: number
  projects: number
  tasks: number
  notes: number
}

const RELATIVE = /^D(?:([+-])(\d+))?(T\S+)?$/
const TOKEN = /\{\{(D(?:[+-]\d+)?)\}\}/g

export function populateVault(vaultDir: string, plan: VaultPlan): PopulateResult {
  if (!isInsideVaultsDir(vaultDir)) {
    throw new Error(
      `refusing to write to ${vaultDir}: only vaults in demo-vaults/ can be populated`,
    )
  }
  const meta = readMeta(vaultDir)

  const date = (value: string | undefined, where: string): string | undefined => {
    if (value === undefined) return undefined
    const m = RELATIVE.exec(value)
    if (m) {
      const offset = m[2] ? Number(m[2]) * (m[1] === '-' ? -1 : 1) : 0
      return addDays(meta.referenceDate, offset) + (m[3] ?? '')
    }
    if (isIsoDate(value.slice(0, 10))) return value
    throw new Error(`${where}: "${value}" isn't a date (use D, D+3, D-10, D+1T17:00 or YYYY-MM-DD)`)
  }
  const text = (value: string | undefined): string | undefined =>
    value?.replace(TOKEN, (_, token: string) => date(token, `{{${token}}}`)!)

  const areas: AreaInput[] = (plan.areas ?? []).map((area, i) => {
    need(area.title, `areas[${i}].title`)
    return {
      ...area,
      title: text(area.title)!,
      description: text(area.description),
      body: text(area.body),
    }
  })

  const projects: ProjectInput[] = (plan.projects ?? []).map((project, i) => {
    const at = `projects[${i}]`
    need(project.title, `${at}.title`)
    return {
      ...project,
      title: text(project.title)!,
      description: text(project.description),
      body: text(project.body),
      startDate: date(project.startDate, `${at}.startDate`),
      endDate: date(project.endDate, `${at}.endDate`),
    }
  })

  const tasks: TaskInput[] = (plan.tasks ?? []).map((task, i) => {
    const at = `tasks[${i}]`
    need(task.title, `${at}.title`)
    need(task.status, `${at}.status`)
    need(task.createdAt, `${at}.createdAt`)
    const createdAt = date(task.createdAt, `${at}.createdAt`)!
    const completedAt = date(task.completedAt, `${at}.completedAt`)
    return {
      ...task,
      title: text(task.title)!,
      body: text(task.body),
      createdAt,
      updatedAt: date(task.updatedAt, `${at}.updatedAt`) ?? completedAt ?? createdAt,
      completedAt,
      due: date(task.due, `${at}.due`),
      scheduled: date(task.scheduled, `${at}.scheduled`),
      deferUntil: date(task.deferUntil, `${at}.deferUntil`),
    }
  })

  const notes = (plan.notes ?? []).map((note, i) => {
    need(note.path, `notes[${i}].path`)
    need(note.body, `notes[${i}].body`)
    const path = normalize(text(note.path)!)
    if (isAbsolute(path) || path.startsWith('..')) {
      throw new Error(`notes[${i}].path: "${note.path}" must be a relative path inside the vault`)
    }
    return { path: join(vaultDir, path), body: text(note.body)!.trimEnd() + '\n' }
  })

  for (const area of areas) writeArea(vaultDir, meta, area)
  for (const project of projects) writeProject(vaultDir, meta, project)
  for (const task of tasks) writeTask(vaultDir, meta, task)
  for (const note of notes) {
    mkdirSync(dirname(note.path), { recursive: true })
    writeFileSync(note.path, note.body)
  }

  return {
    areas: areas.length,
    projects: projects.length,
    tasks: tasks.length,
    notes: notes.length,
  }
}

/** Read a JSON plan file and populate the vault from it. */
export function populateFromFile(vaultDir: string, planFile: string): PopulateResult {
  return populateVault(vaultDir, JSON.parse(readFileSync(planFile, 'utf8')) as VaultPlan)
}

function need(value: unknown, where: string) {
  if (value === undefined || value === null || value === '') throw new Error(`${where} is required`)
}
