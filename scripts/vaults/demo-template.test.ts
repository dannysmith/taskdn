// Guards the demo template's coverage: every case its README promises must
// survive rendering on any date.
import { afterAll, expect, test } from 'bun:test'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TEMPLATES_DIR, VAULTS_DIR } from './lib/paths.ts'
import { renderTemplate } from './lib/render.ts'
import { reportVault } from './lib/report.ts'

const vaultDir = join(VAULTS_DIR, `.test-${crypto.randomUUID()}`)
process.env.TASKDN_OBSIDIAN_PLUGIN_DIR = join(tmpdir(), 'no-such-plugin')

afterAll(() => rmSync(vaultDir, { recursive: true, force: true }))

test('the demo template keeps its coverage when rendered', () => {
  renderTemplate(join(TEMPLATES_DIR, 'demo'), vaultDir, '2027-03-03')
  const r = reportVault(vaultDir)

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
