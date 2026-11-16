// Guards the committed templates: what each README promises must survive
// rendering on any date.
import { afterAll, expect, test } from 'bun:test'
import { readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TEMPLATES_DIR, VAULTS_DIR } from './lib/paths.ts'
import { renderTemplate } from './lib/render.ts'
import { reportVault } from './lib/report.ts'

const vaultDirs: string[] = []
process.env.TASKDN_OBSIDIAN_PLUGIN_DIR = join(tmpdir(), 'no-such-plugin')

afterAll(() => {
  for (const dir of vaultDirs) rmSync(dir, { recursive: true, force: true })
})

function render(template: string, date: string): string {
  const vaultDir = join(VAULTS_DIR, `.test-${crypto.randomUUID()}`)
  vaultDirs.push(vaultDir)
  renderTemplate(join(TEMPLATES_DIR, template), vaultDir, date)
  return vaultDir
}

test('the demo template keeps its coverage when rendered', () => {
  const r = reportVault(render('demo', '2027-03-03'))

  expect(r.referenceDate).toBe('2027-03-03')
  expect(r.problems).toEqual([])
  expect(r.links.unresolved).toEqual([])

  const taskStatuses = ['inbox', 'icebox', 'ready', 'in-progress', 'blocked', 'done', 'dropped']
  expect(Object.keys(r.tasks.byStatus)).toEqual(expect.arrayContaining(taskStatuses))
  const projectStatuses = ['planning', 'ready', 'in-progress', 'paused', 'blocked', 'done']
  expect(Object.keys(r.projects.byStatus)).toEqual(expect.arrayContaining(projectStatuses))
  expect(r.areas.byStatus.archived).toBeGreaterThan(0)

  // Every date case (overdue, due today, starting soon...) has at least one example
  const { total, archived, byStatus, ...taskCases } = r.tasks
  const { total: projectTotal, byStatus: projectByStatus, ...projectCases } = r.projects
  const missing = Object.entries({ ...taskCases, ...projectCases })
    .filter(([, count]) => count === 0)
    .map(([name]) => name)
  expect(missing).toEqual([])
})

test('the edge-cases template renders into its own folders and keeps invalid dates', () => {
  const vaultDir = render('edge-cases', '2026-03-01')
  const tasksDir = join(vaultDir, 'work/tasks')

  expect(JSON.parse(readFileSync(join(vaultDir, '.taskdn.json'), 'utf8')).projectsDir).toBe(
    join(vaultDir, 'Projects & Plans'),
  )
  const invalid = readFileSync(join(tasksDir, 'invalid-dates.md'), 'utf8')
  expect(invalid).toContain('due: 2026-02-30')
  expect(invalid).toContain('defer-until: 15/01/2026')
  expect(readFileSync(join(tasksDir, 'utc-timestamp.md'), 'utf8')).toContain(
    'due: 2026-03-02T08:00:00Z',
  )
  // The report copes with every broken file rather than throwing
  expect(reportVault(vaultDir).problems.length).toBeGreaterThan(0)
})
