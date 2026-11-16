import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { generateVault } from './generate.ts'
import { readMeta, writeMeta } from './meta.ts'
import { populateVault } from './populate.ts'
import { VAULTS_DIR } from './paths.ts'
import { newVault, renderTemplate } from './render.ts'
import { reportVault } from './report.ts'
import { shiftVault } from './shift.ts'
import { slugify, writeArea, writeProject, writeTask } from './writers.ts'

let templateDir: string
let vaultDir: string

beforeEach(() => {
  // No plugin linking in tests
  process.env.TASKDN_OBSIDIAN_PLUGIN_DIR = join(tmpdir(), 'no-such-plugin')
  templateDir = mkdtempSync(join(tmpdir(), 'vault-template-'))
  vaultDir = join(VAULTS_DIR, `.test-${crypto.randomUUID()}`)
})

afterEach(() => {
  rmSync(templateDir, { recursive: true, force: true })
  rmSync(vaultDir, { recursive: true, force: true })
})

function write(dir: string, path: string, content: string) {
  mkdirSync(join(dir, path, '..'), { recursive: true })
  writeFileSync(join(dir, path), content)
}

describe('renderTemplate', () => {
  beforeEach(() => {
    writeMeta(templateDir, { referenceDate: '2026-01-15' })
    write(
      templateDir,
      'tasks/a.md',
      '---\ntitle: A\nstatus: ready\ndue: 2026-01-16\n---\nSee [[2026-01-15]].\n',
    )
    write(templateDir, 'day-notes/2026-01-15.md', '# Day\n')
    write(templateDir, 'day-notes/2026-01-25.md', '# Later day\n')
    write(templateDir, '.obsidian/workspace.json', '{"from":"template"}')
  })

  test('shifts dates in files and filenames so the reference date lands on the target', () => {
    renderTemplate(templateDir, vaultDir, '2026-01-25')

    expect(readMeta(vaultDir).referenceDate).toBe('2026-01-25')
    expect(readFileSync(join(vaultDir, 'tasks/a.md'), 'utf8')).toContain('due: 2026-01-26')
    expect(readFileSync(join(vaultDir, 'tasks/a.md'), 'utf8')).toContain('[[2026-01-25]]')
    // 01-15 moved onto 01-25 without overwriting the note that was already there
    expect(readFileSync(join(vaultDir, 'day-notes/2026-01-25.md'), 'utf8')).toBe('# Day\n')
    expect(readFileSync(join(vaultDir, 'day-notes/2026-02-04.md'), 'utf8')).toBe('# Later day\n')
  })

  test('sets the vault up for every tool and leaves the template alone', () => {
    renderTemplate(templateDir, vaultDir, '2026-02-01')

    expect(JSON.parse(readFileSync(join(vaultDir, '.taskdn.json'), 'utf8'))).toEqual({
      tasksDir: join(vaultDir, 'tasks'),
      projectsDir: join(vaultDir, 'projects'),
      areasDir: join(vaultDir, 'areas'),
    })
    expect(existsSync(join(vaultDir, 'areas'))).toBe(true)
    expect(
      JSON.parse(readFileSync(join(vaultDir, '.obsidian/community-plugins.json'), 'utf8')),
    ).toEqual(['taskdn'])
    // The template's own Obsidian state isn't copied
    expect(existsSync(join(vaultDir, '.obsidian/workspace.json'))).toBe(false)
    expect(readMeta(templateDir).referenceDate).toBe('2026-01-15')
    expect(readFileSync(join(templateDir, 'tasks/a.md'), 'utf8')).toContain('due: 2026-01-16')
  })

  test('re-rendering keeps the vault’s Obsidian layout', () => {
    renderTemplate(templateDir, vaultDir, '2026-02-01')
    writeFileSync(join(vaultDir, '.obsidian/workspace.json'), '{"mine":true}')
    renderTemplate(templateDir, vaultDir, '2026-03-01')
    expect(readFileSync(join(vaultDir, '.obsidian/workspace.json'), 'utf8')).toBe('{"mine":true}')
  })

  test('links the plugin build and gives the vault its own plugin settings', () => {
    const pluginSource = join(templateDir, '..', `plugin-${crypto.randomUUID()}`)
    for (const file of ['main.js', 'manifest.json', 'styles.css', 'data.json'])
      write(pluginSource, file, file)
    // Relative, as someone might set it; links must still resolve from inside the vault
    process.env.TASKDN_OBSIDIAN_PLUGIN_DIR = relative(process.cwd(), pluginSource)
    try {
      renderTemplate(templateDir, vaultDir, '2026-02-01')
      const pluginDir = join(vaultDir, '.obsidian/plugins/taskdn')
      expect(lstatSync(pluginDir).isSymbolicLink()).toBe(false)
      expect(realpathSync(join(pluginDir, 'main.js'))).toBe(
        realpathSync(join(pluginSource, 'main.js')),
      )
      expect(JSON.parse(readFileSync(join(pluginDir, 'data.json'), 'utf8'))).toEqual({
        tasksDirectory: 'tasks',
        useTaskTitleAsInlineTitle: true,
      })
      expect(readFileSync(join(pluginSource, 'data.json'), 'utf8')).toBe('data.json')
    } finally {
      rmSync(pluginSource, { recursive: true, force: true })
    }
  })

  test('refuses to write outside demo-vaults/', () => {
    expect(() => renderTemplate(templateDir, join(tmpdir(), 'elsewhere'), '2026-02-01')).toThrow(
      /demo-vaults/,
    )
  })

  test('refuses to render a vault into or over its own source', () => {
    renderTemplate(templateDir, vaultDir, '2026-02-01')
    expect(() => renderTemplate(vaultDir, vaultDir, '2026-03-01')).toThrow(/overlap/)
    expect(() => renderTemplate(vaultDir, join(vaultDir, 'inner'), '2026-03-01')).toThrow(/overlap/)
    expect(readMeta(vaultDir).referenceDate).toBe('2026-02-01')
  })

  test('honours custom entity folders', () => {
    writeMeta(templateDir, { referenceDate: '2026-01-15', folders: { tasks: 'work/todo' } })
    renderTemplate(templateDir, vaultDir, '2026-01-15')
    const config = JSON.parse(readFileSync(join(vaultDir, '.taskdn.json'), 'utf8'))
    expect(config.tasksDir).toBe(join(vaultDir, 'work/todo'))
  })
})

describe('shiftVault', () => {
  test('moves dates and the reference date, and can move back again', () => {
    newVault(vaultDir, '2026-01-15')
    write(vaultDir, 'tasks/a.md', '---\ntitle: A\nstatus: ready\nscheduled: 2026-01-15\n---\n')
    shiftVault(vaultDir, -20)
    expect(readMeta(vaultDir).referenceDate).toBe('2025-12-26')
    shiftVault(vaultDir, 20)
    expect(readFileSync(join(vaultDir, 'tasks/a.md'), 'utf8')).toContain('scheduled: 2026-01-15')
  })
})

describe('writers', () => {
  test('slugify matches the CLI', () => {
    expect(slugify('Book JR Pass for Japan trip!')).toBe('book-jr-pass-for-japan-trip')
    expect(slugify('  __Café  -- plans__ ')).toBe('caf-plans')
    expect(slugify('???')).toBe('untitled')
  })

  test('write valid S1 files, quoting links and anything YAML could misread', () => {
    newVault(vaultDir, '2026-01-15')
    const meta = readMeta(vaultDir)
    writeArea(vaultDir, meta, { title: 'Work', type: 'life-area' })
    writeProject(vaultDir, meta, { title: 'Launch: v2', status: 'in-progress', area: 'Work' })
    const path = writeTask(vaultDir, meta, {
      title: '2025',
      status: 'done',
      createdAt: '2026-01-10',
      updatedAt: '2026-01-14T09:30:00+00:00',
      completedAt: '2026-01-14',
      project: 'Launch: v2',
      archived: true,
      body: 'Notes',
    })

    expect(path).toBe(join(vaultDir, 'tasks/archive/2025.md'))
    expect(readFileSync(path, 'utf8')).toBe(
      [
        '---',
        'title: "2025"',
        'status: done',
        'created-at: 2026-01-10',
        'updated-at: "2026-01-14T09:30:00+00:00"',
        'completed-at: 2026-01-14',
        'projects:',
        '  - "[[Launch: v2]]"',
        '---',
        '',
        'Notes',
        '',
      ].join('\n'),
    )
    // Projects and areas are named after their titles, minus what a filename can't hold
    expect(readFileSync(join(vaultDir, 'projects/Launch v2.md'), 'utf8')).toContain(
      'title: "Launch: v2"',
    )
    // Titles YAML would read as numbers stay strings
    for (const title of ['1e3', '0x10', '1_000', '.5']) {
      const file = writeTask(vaultDir, meta, {
        title,
        status: 'ready',
        createdAt: '2026-01-10',
        updatedAt: '2026-01-10',
      })
      expect(readFileSync(file, 'utf8')).toContain(`title: "${title}"`)
    }
    // Same title again gets a numbered filename
    expect(writeArea(vaultDir, meta, { title: 'Work' })).toBe(join(vaultDir, 'areas/Work-1.md'))
  })
})

describe('generateVault', () => {
  function snapshot(dir: string): Record<string, string> {
    const files: Record<string, string> = {}
    for (const path of new Bun.Glob('**/*.md').scanSync(dir)) {
      files[path] = readFileSync(join(dir, path), 'utf8')
    }
    return files
  }

  test('builds a valid vault of the requested size', () => {
    const result = generateVault(vaultDir, { tasks: 300, seed: 7, referenceDate: '2026-01-15' })
    const r = reportVault(vaultDir)

    expect(r.tasks.total).toBe(300)
    expect(r.projects.total).toBe(result.projects)
    expect(r.areas.total).toBe(result.areas)
    expect(r.problems).toEqual([])
    expect(r.links.unresolved).toEqual([])
    expect(r.tasks.archived).toBeGreaterThan(0)
    expect(r.tasks.orphans).toBeGreaterThan(0)
    expect(r.areas.byStatus.archived).toBeGreaterThan(0)
  })

  test('is deterministic for a seed, and a later date gives the same vault shifted', () => {
    const otherDir = join(VAULTS_DIR, `.test-${crypto.randomUUID()}`)
    try {
      generateVault(vaultDir, { tasks: 50, seed: 3, referenceDate: '2026-01-15' })
      generateVault(otherDir, { tasks: 50, seed: 3, referenceDate: '2026-01-15' })
      expect(snapshot(otherDir)).toEqual(snapshot(vaultDir))

      generateVault(otherDir, { tasks: 50, seed: 4, referenceDate: '2026-01-15' })
      expect(snapshot(otherDir)).not.toEqual(snapshot(vaultDir))

      generateVault(otherDir, { tasks: 50, seed: 3, referenceDate: '2026-02-14' })
      shiftVault(vaultDir, 30)
      expect(snapshot(otherDir)).toEqual(snapshot(vaultDir))
    } finally {
      rmSync(otherDir, { recursive: true, force: true })
    }
  })
})

describe('populateVault', () => {
  test('writes a plan with relative dates and date tokens, in batches', () => {
    newVault(vaultDir, '2026-01-15')
    populateVault(vaultDir, {
      areas: [{ title: 'Home' }],
      projects: [{ title: 'Kitchen', status: 'in-progress', area: 'Home', startDate: 'D-30' }],
    })
    const result = populateVault(vaultDir, {
      tasks: [
        {
          title: 'Order tiles',
          status: 'done',
          createdAt: 'D-20',
          completedAt: 'D-2',
          project: 'Kitchen',
          body: 'Delivery on {{D+3}}.',
        },
        { title: 'Call plumber', status: 'ready', createdAt: 'D-1', due: 'D+1T17:00' },
      ],
      notes: [{ path: 'day-notes/{{D-1}}.md', body: 'Picked tiles. Plumber on {{D}}.' }],
    })

    expect(result).toEqual({ areas: 0, projects: 0, tasks: 2, notes: 1 })
    expect(readFileSync(join(vaultDir, 'projects/Kitchen.md'), 'utf8')).toContain(
      'start-date: 2025-12-16',
    )
    const tiles = readFileSync(join(vaultDir, 'tasks/order-tiles.md'), 'utf8')
    expect(tiles).toContain('created-at: 2025-12-26')
    // updated-at falls back to completed-at
    expect(tiles).toContain('updated-at: 2026-01-13')
    expect(tiles).toContain('Delivery on 2026-01-18.')
    expect(readFileSync(join(vaultDir, 'tasks/call-plumber.md'), 'utf8')).toContain(
      'due: "2026-01-16T17:00"',
    )
    expect(readFileSync(join(vaultDir, 'day-notes/2026-01-14.md'), 'utf8')).toBe(
      'Picked tiles. Plumber on 2026-01-15.\n',
    )
    expect(reportVault(vaultDir).problems).toEqual([])
  })

  test('checks the whole plan before writing anything', () => {
    newVault(vaultDir, '2026-01-15')
    const plan = {
      areas: [{ title: 'Home' }],
      tasks: [{ title: 'Bad', status: 'ready', createdAt: 'D-1', due: 'next week' }],
    }
    expect(() => populateVault(vaultDir, plan)).toThrow(/tasks\[0\]\.due: "next week"/)
    expect(existsSync(join(vaultDir, 'areas/Home.md'))).toBe(false)

    expect(() => populateVault(vaultDir, { notes: [{ path: '../escape.md', body: 'x' }] })).toThrow(
      /inside the vault/,
    )
  })
})

describe('reportVault', () => {
  test('buckets tasks and projects relative to the reference date', () => {
    newVault(vaultDir, '2026-01-15')
    const meta = readMeta(vaultDir)
    const task = (title: string, extra: Record<string, string> = {}) =>
      writeTask(vaultDir, meta, {
        title,
        status: 'ready',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        area: 'Home',
        ...extra,
      })
    writeArea(vaultDir, meta, { title: 'Home' })
    writeArea(vaultDir, meta, { title: 'Old', status: 'archived' })
    writeProject(vaultDir, meta, {
      title: 'Late',
      status: 'in-progress',
      area: 'Home',
      endDate: '2026-01-10',
    })
    task('Overdue', { due: '2026-01-14' })
    task('Due today', { due: '2026-01-15' })
    task('Due soon', { due: '2026-01-20' })
    task('Scheduled today', { scheduled: '2026-01-15T09:00' })
    task('Missed', { scheduled: '2026-01-13' })
    task('Available today', { deferUntil: '2026-01-15' })
    task('Later', { deferUntil: '2026-02-01' })
    task('Done yesterday', { status: 'done', completedAt: '2026-01-14', due: '2026-01-01' })
    writeTask(vaultDir, meta, {
      title: 'Orphan',
      status: 'inbox',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    })
    write(vaultDir, 'tasks/broken.md', '---\ntitle: Broken\nstatus: waiting\narea: [[Home]]\n---\n')
    write(vaultDir, 'tasks/bad.md', '---\ntitle: [unclosed\n---\n')
    write(
      vaultDir,
      'tasks/no-projects.md',
      '---\ntitle: Empty list\nstatus: ready\nprojects: []\n---\n',
    )

    const r = reportVault(vaultDir)
    expect(r.tasks).toMatchObject({
      overdue: 1,
      dueToday: 1,
      dueNext7Days: 1,
      scheduledToday: 1,
      scheduledPast: 1,
      deferredUntilToday: 1,
      deferredFuture: 1,
      completedLast7Days: 1,
      // "Orphan", plus the task whose projects list is empty
      orphans: 2,
    })
    expect(r.projects.pastEndDate).toBe(1)
    expect(r.areas.byStatus).toEqual({ active: 1, archived: 1 })
    expect(r.links.unresolved).toEqual(['tasks/broken.md → unquoted link [[Home]]'])
    expect(r.problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('tasks/bad.md: invalid YAML'),
        'tasks/broken.md: unknown task status "waiting"',
      ]),
    )
  })
})
