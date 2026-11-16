/**
 * Generate a realistic vault of any size with the entity writers: areas,
 * projects in them, and tasks spread across statuses, projects, areas, the
 * archive and dates around the reference date. The same seed and reference
 * date always give the same vault; a later date gives the same vault shifted.
 */

import { addDays } from './dates.ts'
import { readMeta } from './meta.ts'
import { newVault } from './render.ts'
import { writeArea, writeProject, writeTask, type TaskInput } from './writers.ts'

/** Task counts for `--size` */
export const SIZES = { small: 100, medium: 1000, large: 5000 } as const

export interface GenerateOptions {
  tasks: number
  seed: number
  referenceDate: string
}

export interface GenerateResult {
  areas: number
  projects: number
  tasks: number
  /** From vault setup, e.g. a missing plugin build */
  notes: string[]
}

const AREAS: Array<{ title: string; type: string }> = [
  ...[
    'Health',
    'Finance',
    'Home',
    'Family',
    'Career',
    'Learning',
    'Writing',
    'Travel',
    'Garden',
    'Fitness',
    'Friends',
    'Side Projects',
    'Admin',
    'Music',
    'Photography',
    'Cooking',
    'Reading',
    'Volunteering',
    'Car',
    'Community',
  ].map((title) => ({ title, type: 'life-area' })),
  ...['Harbour & Hale', 'Bluefin Studio', 'Copperleaf', 'Tallow Labs', 'Marlow Bakery'].map(
    (title) => ({ title, type: 'client' }),
  ),
]

const PROJECT_SUBJECTS = [
  'Website',
  'Kitchen',
  'Garden',
  'Pension',
  'Newsletter',
  'Billing',
  'Bathroom',
  'Podcast',
  'Mobile App',
  'Photo Library',
  'Wardrobe',
  'Loft',
  'Blog',
  'Onboarding',
  'Analytics',
  'Home Network',
  'Budget',
  'Portfolio',
  'Bike',
  'Allotment',
  'Design System',
  'API',
  'Docs',
  'Course',
  'Conference Talk',
  'Shed',
  'Office',
  'Recipe Collection',
  'Wedding',
  'Garage',
]
const PROJECT_KINDS = [
  'Redesign',
  'Migration',
  'Launch',
  'Overhaul',
  'Review',
  'Setup',
  'Clear-out',
  'Refresh',
  'Research',
  'Rebuild',
  'Audit',
  'Plan',
  'Upgrade',
  'Tidy-up',
]
const PROJECT_BODIES = [
  '## Goal\n\nGet this finished and stop thinking about it.',
  '## Why\n\nIt has been on the list for too long.\n\n## Done when\n\n- Everything on the checklist is ticked\n- Nothing left half-finished',
  '## Notes\n\nStart small and see how it goes.',
  '## Budget\n\nKeep it modest. Check prices before committing to anything.',
]

const TASK_VERBS = [
  'Email',
  'Call',
  'Review',
  'Fix',
  'Write',
  'Book',
  'Buy',
  'Plan',
  'Research',
  'Update',
  'Draft',
  'Clean',
  'Schedule',
  'Pay',
  'Renew',
  'Order',
  'Prepare',
  'Organise',
  'Test',
  'Sort out',
  'Check',
  'Finish',
  'Read up on',
  'Compare',
  'Cancel',
]
const TASK_OBJECTS = [
  'the invoice',
  'the quote',
  'the dentist',
  'the plumber',
  'the landlord',
  'the accountant',
  'travel insurance',
  'the train tickets',
  'the hotel',
  'the gutters',
  'the boiler service',
  'the car insurance',
  'the gym membership',
  'the newsletter',
  'the slide deck',
  'the release notes',
  'the onboarding guide',
  'the login bug',
  'the search page',
  'the backups',
  'the passwords',
  'the photo backup',
  'the spare room',
  'the bookshelf',
  'the bike lights',
  'the running shoes',
  'the meal plan',
  'the shopping list',
  'the birthday present',
  'the thank-you cards',
  'the tax return',
  'the pension forms',
  'the budget spreadsheet',
  'the bank statements',
  'the broadband contract',
  'the phone contract',
  'the energy tariff',
  'the window cleaner',
  'the vet appointment',
  'the school forms',
  'the reading list',
  'the course notes',
  'the conference talk',
  'the blog post',
  'the podcast outline',
  'the client brief',
  'the project timeline',
  'the contract',
  'the proposal',
  'the design review',
  'the test plan',
  'the deploy script',
  'the analytics report',
  'the support tickets',
  'the team retro',
  'the garden fence',
  'the seed order',
  'the compost bin',
  'the loft boxes',
  'the recycling',
]
const TASK_SUFFIXES = [
  'before the weekend',
  'with Sam',
  'for next month',
  'again',
  'properly',
  'for the trip',
  'with the team',
  'for Mum',
  'before it expires',
  'once and for all',
]
const TASK_BODIES = [
  'Should only take ten minutes.',
  'Waiting to hear back before going further.',
  '- [ ] Find the details\n- [ ] Do the thing\n- [ ] Follow up',
  'Notes from last time are in the folder.',
  'Ask around first: someone probably knows a good option.',
  'Not urgent, but it keeps coming up.',
  '## Notes\n\n- Check what we did last year\n- Keep the receipt',
  'Blocked until the other side replies.',
]

type TaskStatus = 'inbox' | 'icebox' | 'ready' | 'in-progress' | 'blocked' | 'done' | 'dropped'
type ProjectStatus = 'planning' | 'ready' | 'in-progress' | 'paused' | 'blocked' | 'done'

/** Create (or replace) a generated vault at `vaultDir`. */
export function generateVault(vaultDir: string, options: GenerateOptions): GenerateResult {
  const notes = newVault(vaultDir, options.referenceDate)
  const meta = readMeta(vaultDir)
  const random = seededRandom(options.seed)
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const chance = (p: number) => random() < p
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
  const weighted = <T extends string>(weights: Record<T, number>): T => {
    const entries = Object.entries(weights) as Array<[T, number]>
    let r = random() * entries.reduce((sum, [, w]) => sum + w, 0)
    for (const [value, w] of entries) if ((r -= w) < 0) return value
    return entries[0]![0]
  }
  const day = (offset: number) => addDays(options.referenceDate, offset)

  // Areas
  const areaCount = clamp(Math.round(Math.sqrt(options.tasks) / 1.5), 4, AREAS.length)
  // About one in ten archived, and always at least one
  const archivedAreas = Math.max(1, Math.round(areaCount / 10))
  const areas = shuffle(AREAS, random)
    .slice(0, areaCount)
    .map((area, i) => ({ ...area, archived: i >= areaCount - archivedAreas }))
  for (const area of areas) {
    writeArea(vaultDir, meta, {
      title: area.title,
      type: area.type,
      status: area.archived ? 'archived' : 'active',
    })
  }
  const activeAreas = areas.filter((a) => !a.archived).map((a) => a.title)

  // Projects
  const projectNames = shuffle(
    PROJECT_SUBJECTS.flatMap((subject) => PROJECT_KINDS.map((kind) => `${subject} ${kind}`)),
    random,
  )
  const projectCount = clamp(Math.round(options.tasks / 12), 3, projectNames.length)
  const projects = projectNames.slice(0, projectCount).map((title) => ({
    title,
    status: weighted<ProjectStatus>({
      'in-progress': 30,
      planning: 15,
      ready: 10,
      paused: 10,
      blocked: 5,
      done: 30,
    }),
    area: chance(0.9) ? pick(activeAreas) : undefined,
  }))
  for (const project of projects) {
    const dates = projectDates(project.status)
    const others = projects.filter((p) => p !== project && p.status !== 'done')
    writeProject(vaultDir, meta, {
      ...project,
      startDate: dates.start === undefined ? undefined : day(dates.start),
      endDate: dates.end === undefined ? undefined : day(dates.end),
      blockedBy: project.status === 'blocked' && others.length ? [pick(others).title] : undefined,
      body: chance(0.5) ? pick(PROJECT_BODIES) : undefined,
    })
  }

  function projectDates(status: ProjectStatus): { start?: number; end?: number } {
    switch (status) {
      case 'done': {
        const start = -int(60, 400)
        return { start, end: Math.min(-1, start + int(14, 120)) }
      }
      case 'in-progress': {
        const start = -int(1, 120)
        return { start, end: chance(0.7) ? int(-14, 90) : undefined }
      }
      case 'planning':
      case 'ready': {
        if (!chance(0.6)) return {}
        const start = int(1, 60)
        return { start, end: start + int(14, 120) }
      }
      default:
        return { start: chance(0.7) ? -int(10, 200) : undefined }
    }
  }

  // Tasks
  const usedTitles = new Set<string>()
  function taskTitle(): string {
    for (let attempt = 0; ; attempt++) {
      let title = `${pick(TASK_VERBS)} ${pick(TASK_OBJECTS)}`
      if (attempt > 0 || chance(0.25)) title += ` ${pick(TASK_SUFFIXES)}`
      if (attempt > 5) title += ` (${usedTitles.size})`
      if (!usedTitles.has(title)) {
        usedTitles.add(title)
        return title
      }
    }
  }

  for (let i = 0; i < options.tasks; i++) {
    const belongs = random()
    const project = belongs < 0.6 ? pick(projects) : undefined
    const area = !project && belongs < 0.85 ? pick(activeAreas) : undefined
    const status = taskStatus(project?.status)
    const closed = status === 'done' || status === 'dropped'

    // Offsets from the reference date: created ≤ updated ≤ 0. Open tasks lean
    // recent; closed ones spread evenly so completions don't bunch up near today
    const created = closed ? -int(0, 400) : -Math.floor(random() ** 2 * 365)
    const task: TaskInput = {
      title: taskTitle(),
      status,
      createdAt: day(created),
      updatedAt: day(created),
      project: project?.title,
      area,
      body: chance(0.25) ? pick(TASK_BODIES) : undefined,
    }

    if (closed) {
      const completed = int(created, 0)
      task.completedAt = task.updatedAt = day(completed)
      task.archived = completed < -14 && chance(0.8)
      if (chance(0.15)) task.due = day(completed + int(-3, 10))
    } else {
      const updated = status === 'in-progress' ? Math.max(created, -int(0, 7)) : int(created, 0)
      task.updatedAt = day(updated)
      if (chance(0.3)) task.due = day(int(-15, 45)) + (chance(0.05) ? 'T17:00' : '')
      if (chance(0.2)) task.scheduled = day(int(-7, 21))
      if ((status === 'ready' || status === 'inbox') && chance(0.08))
        task.deferUntil = day(chance(0.1) ? 0 : int(1, 120))
    }
    writeTask(vaultDir, meta, task)
  }

  function taskStatus(projectStatus: ProjectStatus | undefined): TaskStatus {
    if (projectStatus === 'done') return chance(0.9) ? 'done' : 'dropped'
    if (projectStatus === 'planning') return weighted({ inbox: 40, icebox: 20, ready: 40 })
    return weighted<TaskStatus>({
      done: 33,
      dropped: 5,
      inbox: 8,
      icebox: 8,
      ready: 26,
      'in-progress': 12,
      blocked: 8,
    })
  }

  return { areas: areas.length, projects: projects.length, tasks: options.tasks, notes }
}

/** mulberry32: a small, fast PRNG that's deterministic for a 32-bit seed. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
