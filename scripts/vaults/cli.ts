/**
 * `bun run vault <command>`: create, render, shift and inspect test vaults.
 * Templates live in demo-vault-templates/ (committed); vaults are created in
 * demo-vaults/ (gitignored). Run with no command for help.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { daysBetween, isIsoDate, localToday } from './lib/dates.ts'
import { META_FILE, readMeta } from './lib/meta.ts'
import {
  REPO_ROOT,
  TEMPLATES_DIR,
  VAULTS_DIR,
  isInsideVaultsDir,
  resolveTemplateDir,
  resolveVaultDir,
} from './lib/paths.ts'
import { generateVault, SIZES } from './lib/generate.ts'
import { populateFromFile } from './lib/populate.ts'
import { newVault, renderTemplate } from './lib/render.ts'
import { reportVault, type VaultReport } from './lib/report.ts'
import { shiftVault } from './lib/shift.ts'

const HELP = `Usage: bun run vault <command>

  list                                   Templates and vaults, with their reference dates
  render <template> [--as <name>] [--date YYYY-MM-DD]
                                         Copy a template into demo-vaults/ with its dates shifted
                                         so its reference date lands on --date (default: today)
  new <name> [--date YYYY-MM-DD]         Empty vault whose reference date is --date (default: today)
  generate <name> [--size small|medium|large|N] [--seed N] [--date YYYY-MM-DD]
                                         Realistic vault with N tasks (small 100, medium 1000,
                                         large 5000; default small). Same seed, same vault
  populate <vault> <plan.json>...        Add areas, projects, tasks and notes from JSON plans, with
                                         dates relative to the reference date (D, D+3, D-10)
  shift <vault> (--to YYYY-MM-DD | --days N)
                                         Move every date in a vault
  report <vault> [--json]                What the vault covers, relative to its reference date
  open <vault>                           Print the obsidian:// link
  tdn <vault> <args>...                  Run tdn on the vault, e.g. \`tdn edge-cases doctor\`. In this
                                         repo TASKDN_*_DIR point tdn at demo-vaults/demo; this sets
                                         them to the vault's folders instead

A <vault> is a name in demo-vaults/ or a path. Re-rendering or regenerating a vault replaces it
(keeping Obsidian's workspace layout). Never point a tool at a template: work on
a rendered copy.`

// Everything after the vault goes to tdn as is, so this runs before option parsing
if (process.argv[2] === 'tdn') runTdn(process.argv.slice(3))

/**
 * Runs the installed `tdn` on a vault, with TASKDN_*_DIR set from its
 * .taskdn.json. The repo's Claude settings set those variables to the demo
 * vault, and they beat a .taskdn.json in the current folder.
 */
function runTdn([vault, ...args]: string[]): never {
  if (!vault) fail('missing <vault>, e.g. `bun run vault tdn edge-cases doctor`')
  const dir = existingVault(vault)
  const configFile = join(dir, '.taskdn.json')
  if (!existsSync(configFile)) fail(`${dir} has no .taskdn.json`)
  const config = JSON.parse(readFileSync(configFile, 'utf8')) as Record<string, string>
  const result = Bun.spawnSync(['tdn', ...args], {
    env: {
      ...process.env,
      TASKDN_TASKS_DIR: resolve(dir, config.tasksDir ?? 'tasks'),
      TASKDN_PROJECTS_DIR: resolve(dir, config.projectsDir ?? 'projects'),
      TASKDN_AREAS_DIR: resolve(dir, config.areasDir ?? 'areas'),
    },
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  process.exit(result.exitCode)
}

const { positionals, values } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    as: { type: 'string' },
    date: { type: 'string' },
    to: { type: 'string' },
    days: { type: 'string' },
    size: { type: 'string' },
    seed: { type: 'string' },
    json: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
  },
})

const [command, target, ...extra] = positionals

function fail(message: string): never {
  console.error(`Error: ${message}`)
  process.exit(1)
}

function requireTarget(what: string): string {
  if (!target) fail(`missing <${what}>\n\n${HELP}`)
  return target
}

function dateOption(value: string | undefined, name: string): string {
  if (value === undefined) return localToday()
  if (!isIsoDate(value)) fail(`--${name} must be a YYYY-MM-DD date`)
  return value
}

function existingVault(nameOrPath: string): string {
  const dir = resolveVaultDir(nameOrPath)
  if (!existsSync(dir)) fail(`no vault at ${dir}`)
  return dir
}

function created(dir: string, notes: string[]) {
  const meta = readMeta(dir)
  console.log(`Vault ready: ${relative(REPO_ROOT, dir)} (reference date ${meta.referenceDate})`)
  for (const note of notes) console.log(`  Note: ${note}`)
  const vault = isInsideVaultsDir(dir) ? relative(VAULTS_DIR, dir) : dir
  console.log(`  tdn:      bun run vault tdn ${vault} context --ai`)
  console.log(`  Obsidian: ${obsidianLink(dir)}`)
}

function obsidianLink(dir: string): string {
  return `obsidian://open?path=${encodeURIComponent(dir)}`
}

function listVaults(dir: string) {
  if (!existsSync(dir)) return ['  (none)']
  const rows = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(`${dir}/${e.name}/${META_FILE}`))
    .map((e) => `  ${e.name.padEnd(24)} ${readMeta(`${dir}/${e.name}`).referenceDate}`)
  return rows.length ? rows : ['  (none)']
}

function printReport(r: VaultReport) {
  const statuses = (counts: Record<string, number>) =>
    Object.entries(counts)
      .sort()
      .map(([k, v]) => `${k} ${v}`)
      .join(', ') || 'none'
  const t = r.tasks
  const p = r.projects
  console.log(`Reference date ${r.referenceDate}\n`)
  console.log(`Tasks     ${t.total} (${t.archived} archived): ${statuses(t.byStatus)}`)
  console.log(
    `  overdue ${t.overdue}, due today ${t.dueToday}, due in the next 7 days ${t.dueNext7Days}`,
  )
  console.log(
    `  scheduled today ${t.scheduledToday}, scheduled in the past ${t.scheduledPast}, scheduled in the next 7 days ${t.scheduledNext7Days}`,
  )
  console.log(
    `  deferred until today ${t.deferredUntilToday}, deferred into the future ${t.deferredFuture}`,
  )
  console.log(`  completed in the last 7 days ${t.completedLast7Days}, orphans ${t.orphans}`)
  console.log(`Projects  ${p.total}: ${statuses(p.byStatus)}`)
  console.log(
    `  past their end date ${p.pastEndDate}, ending in the next 7 days ${p.endingNext7Days}, starting in the next 14 days ${p.startingNext14Days}`,
  )
  console.log(`Areas     ${r.areas.total}: ${statuses(r.areas.byStatus)}`)
  console.log(`Links     ${r.links.total}, unresolved ${r.links.unresolved.length}`)
  for (const link of r.links.unresolved) console.log(`  ${link}`)
  console.log(`Problems  ${r.problems.length}`)
  for (const problem of r.problems) console.log(`  ${problem}`)
}

if (values.help || !command) {
  console.log(HELP)
  process.exit(command || values.help ? 0 : 1)
}

try {
  run(command)
} catch (error) {
  fail((error as Error).message)
}

function run(command: string) {
  switch (command) {
    case 'list':
      console.log('Templates (demo-vault-templates/):')
      console.log(listVaults(TEMPLATES_DIR).join('\n'))
      console.log('\nVaults (demo-vaults/):')
      console.log(listVaults(VAULTS_DIR).join('\n'))
      break

    case 'render': {
      const templateDir = resolveTemplateDir(requireTarget('template'))
      if (!existsSync(templateDir)) fail(`no template at ${templateDir}`)
      const vaultDir = resolveVaultDir(values.as ?? requireTarget('template'))
      created(vaultDir, renderTemplate(templateDir, vaultDir, dateOption(values.date, 'date')))
      console.log('  If this vault is open in Obsidian or the desktop app, reload it.')
      break
    }

    case 'new': {
      const vaultDir = resolveVaultDir(requireTarget('name'))
      if (existsSync(vaultDir)) fail(`${vaultDir} already exists`)
      created(vaultDir, newVault(vaultDir, dateOption(values.date, 'date')))
      break
    }

    case 'generate': {
      const vaultDir = resolveVaultDir(requireTarget('name'))
      const size = values.size ?? 'small'
      const tasks = size in SIZES ? SIZES[size as keyof typeof SIZES] : Number(size)
      if (!Number.isInteger(tasks) || tasks < 1)
        fail('--size must be small, medium, large or a number of tasks')
      const seed = Number(values.seed ?? 1)
      if (!Number.isInteger(seed)) fail('--seed must be a whole number')
      const result = generateVault(vaultDir, {
        tasks,
        seed,
        referenceDate: dateOption(values.date, 'date'),
      })
      console.log(
        `Generated ${result.tasks} tasks, ${result.projects} projects and ${result.areas} areas (seed ${seed})`,
      )
      created(vaultDir, result.notes)
      console.log('  If this vault is open in Obsidian or the desktop app, reload it.')
      break
    }

    case 'populate': {
      const vaultDir = existingVault(requireTarget('vault'))
      if (!extra.length) fail('give at least one plan file')
      for (const planFile of extra) {
        const r = populateFromFile(vaultDir, planFile)
        console.log(
          `${planFile}: ${r.areas} areas, ${r.projects} projects, ${r.taskFiles.length} tasks, ${r.notes} notes`,
        )
        // Task filenames, for linking to tasks from note bodies
        for (const file of r.taskFiles) console.log(`  ${file}`)
      }
      break
    }

    case 'shift': {
      const vaultDir = existingVault(requireTarget('vault'))
      if (!isInsideVaultsDir(vaultDir))
        fail('only vaults in demo-vaults/ can be shifted (never a template)')
      const { referenceDate } = readMeta(vaultDir)
      let days: number
      if (values.to !== undefined) days = daysBetween(referenceDate, dateOption(values.to, 'to'))
      else if (values.days !== undefined && /^-?\d+$/.test(values.days)) days = Number(values.days)
      else fail('give --to YYYY-MM-DD or --days N')
      shiftVault(vaultDir, days)
      console.log(
        `Shifted ${days} days: reference date ${referenceDate} → ${readMeta(vaultDir).referenceDate}`,
      )
      break
    }

    case 'report': {
      const report = reportVault(existingVault(requireTarget('vault')))
      if (values.json) console.log(JSON.stringify(report, null, 2))
      else printReport(report)
      break
    }

    case 'open':
      console.log(obsidianLink(existingVault(requireTarget('vault'))))
      break

    default:
      fail(`unknown command "${command}"\n\n${HELP}`)
  }
}
