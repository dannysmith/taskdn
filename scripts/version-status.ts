#!/usr/bin/env bun
/**
 * Version Status Script
 *
 * Shows local versions vs latest published releases for all Taskdn products.
 * Run with: bun scripts/version-status.ts
 */

import fs from 'fs'
import path from 'path'

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

const c = colors

interface VersionInfo {
  product: string
  local: string | null
  released: string | null
  platform: string
  status: 'current' | 'ahead' | 'behind' | 'unknown'
}

const PROJECT_ROOT = path.resolve(import.meta.dir, '..')

// GitHub repos
const MAIN_REPO = 'taskdn/taskdn'
const OBSIDIAN_REPO = 'dannysmith/obsidian-taskdn'

async function fetchJSON(url: string): Promise<unknown> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'taskdn-version-status',
      },
    })
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error(`HTTP ${response.status}`)
    }
    return await response.json()
  } catch {
    return null
  }
}

function readLocalJSON(relativePath: string): Record<string, unknown> | null {
  try {
    const fullPath = path.join(PROJECT_ROOT, relativePath)
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  } catch {
    return null
  }
}

function readSpecVersion(relativePath: string): string | null {
  try {
    const fullPath = path.join(PROJECT_ROOT, relativePath)
    const content = fs.readFileSync(fullPath, 'utf8')
    const match = content.match(/\*\*Version:\*\*\s*(\S+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

async function getLatestRelease(
  repo: string,
  tagPrefix?: string
): Promise<string | null> {
  const url = `https://api.github.com/repos/${repo}/releases`
  const releases = (await fetchJSON(url)) as Array<{ tag_name: string }> | null

  if (!releases || !Array.isArray(releases)) return null

  for (const release of releases) {
    if (!tagPrefix || release.tag_name.startsWith(tagPrefix)) {
      // Extract version from tag (e.g., "tdn-cli-v1.0.0" -> "1.0.0")
      const version = release.tag_name.replace(/^[^v]*v/, '')
      return version
    }
  }
  return null
}

async function getObsidianManifestVersion(): Promise<string | null> {
  // Get the manifest.json from the repo's main branch
  const url = `https://raw.githubusercontent.com/${OBSIDIAN_REPO}/main/manifest.json`
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    const manifest = (await response.json()) as { version?: string }
    return manifest.version || null
  } catch {
    return null
  }
}

function compareVersions(local: string | null, released: string | null): VersionInfo['status'] {
  if (!local || !released) return 'unknown'

  const parseVersion = (v: string) => {
    const clean = v.replace(/^v/, '').replace(/-.*$/, '') // Remove v prefix and pre-release suffix
    const parts = clean.split('.').map(Number)
    return { major: parts[0] || 0, minor: parts[1] || 0, patch: parts[2] || 0 }
  }

  const l = parseVersion(local)
  const r = parseVersion(released)

  if (l.major > r.major) return 'ahead'
  if (l.major < r.major) return 'behind'
  if (l.minor > r.minor) return 'ahead'
  if (l.minor < r.minor) return 'behind'
  if (l.patch > r.patch) return 'ahead'
  if (l.patch < r.patch) return 'behind'
  return 'current'
}

function formatStatus(info: VersionInfo): string {
  const local = info.local || '-'
  const released = info.released || '-'

  let statusIcon: string
  let statusColor: string

  switch (info.status) {
    case 'current':
      statusIcon = '='
      statusColor = c.green
      break
    case 'ahead':
      statusIcon = '>'
      statusColor = c.yellow
      break
    case 'behind':
      statusIcon = '<'
      statusColor = c.red
      break
    default:
      statusIcon = '?'
      statusColor = c.dim
  }

  return `${statusColor}${statusIcon}${c.reset}`
}

async function main() {
  console.log(`${c.bold}${c.blue}Taskdn Version Status${c.reset}\n`)

  const results: VersionInfo[] = []

  // Fetch all data in parallel
  const [cliRelease, desktopRelease, obsidianRelease, obsidianManifest] =
    await Promise.all([
      getLatestRelease(MAIN_REPO, 'tdn-cli-v'),
      getLatestRelease(MAIN_REPO, 'desktop-v'),
      getLatestRelease(OBSIDIAN_REPO),
      getObsidianManifestVersion(),
    ])

  // tdn-cli
  const cliPkg = readLocalJSON('tdn-cli/package.json')
  const cliLocal = cliPkg?.version as string | undefined
  results.push({
    product: 'tdn-cli',
    local: cliLocal || null,
    released: cliRelease,
    platform: 'GitHub, Homebrew',
    status: compareVersions(cliLocal || null, cliRelease),
  })

  // tdn-desktop
  const desktopPkg = readLocalJSON('tdn-desktop/package.json')
  const desktopLocal = desktopPkg?.version as string | undefined
  results.push({
    product: 'tdn-desktop',
    local: desktopLocal || null,
    released: desktopRelease,
    platform: 'GitHub (Tauri)',
    status: compareVersions(desktopLocal || null, desktopRelease),
  })

  // tdn-claude-plugin
  const pluginJson = readLocalJSON('tdn-claude-plugin/.claude-plugin/plugin.json')
  const pluginLocal = pluginJson?.version as string | undefined
  results.push({
    product: 'tdn-claude-plugin',
    local: pluginLocal || null,
    released: null, // No GitHub releases, push-based
    platform: 'Marketplace (push)',
    status: 'unknown',
  })

  // obsidian-taskdn (external repo)
  results.push({
    product: 'obsidian-taskdn',
    local: obsidianManifest, // manifest.json in repo = "local" equivalent
    released: obsidianRelease,
    platform: 'GitHub, Obsidian',
    status: compareVersions(obsidianManifest, obsidianRelease),
  })

  // tdn-specs
  const s1Version = readSpecVersion('tdn-specs/S1-core.md')
  const s2Version = readSpecVersion('tdn-specs/S2-implementation-requirements.md')
  results.push({
    product: 'tdn-specs (S1)',
    local: s1Version,
    released: null, // No releases, just in repo
    platform: 'Docs only',
    status: 'unknown',
  })
  results.push({
    product: 'tdn-specs (S2)',
    local: s2Version,
    released: null,
    platform: 'Docs only',
    status: 'unknown',
  })

  // Print table
  const colWidths = { product: 20, local: 12, released: 12, platform: 20 }

  const header = [
    'Product'.padEnd(colWidths.product),
    'Local'.padEnd(colWidths.local),
    'Released'.padEnd(colWidths.released),
    'Platform'.padEnd(colWidths.platform),
  ].join('  ')

  const separator = '-'.repeat(header.length)

  console.log(`${c.dim}${header}${c.reset}`)
  console.log(`${c.dim}${separator}${c.reset}`)

  for (const info of results) {
    const status = formatStatus(info)
    const row = [
      info.product.padEnd(colWidths.product),
      (info.local || '-').padEnd(colWidths.local),
      `${status} ${(info.released || '-').padEnd(colWidths.released - 2)}`,
      `${c.dim}${info.platform}${c.reset}`,
    ].join('  ')
    console.log(row)
  }

  console.log(`\n${c.dim}Legend: ${c.green}=${c.dim} current  ${c.yellow}>${c.dim} ahead (ready to release)  ${c.red}<${c.dim} behind  ${c.reset}${c.dim}? unknown${c.reset}`)

  // Check for products ahead of release
  const ahead = results.filter(r => r.status === 'ahead')
  if (ahead.length > 0) {
    console.log(`\n${c.yellow}${c.bold}Ready to release:${c.reset}`)
    for (const info of ahead) {
      console.log(`  ${info.product}: ${info.local} (released: ${info.released})`)
    }
  }
}

main().catch(console.error)
