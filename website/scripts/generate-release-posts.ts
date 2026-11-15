/**
 * Writes a release post to src/content/docs/releases/ for every published
 * release that doesn't have one yet: the CLI and desktop app from this repo,
 * and the Obsidian plugin from its own repo. Existing posts (.md or .mdx) are
 * never touched, so it's safe to run any number of times.
 *
 * Posts are plain Markdown rather than MDX, so release notes can contain
 * anything GitHub accepts (HTML comments, braces) without breaking the build.
 *
 * Usage: bun scripts/generate-release-posts.ts [--dry-run]
 *
 * Reads GH_TOKEN or GITHUB_TOKEN if set (CI); otherwise it calls the public
 * API unauthenticated. Run by .github/workflows/publish-release-notes.yml.
 */

import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const POSTS_DIR = join(import.meta.dirname, '../src/content/docs/releases')

interface Source {
  repo: string
  /** Tag prefix to strip to get the version; tags without it are ignored */
  tagPrefix: string
  product: 'cli' | 'desktop' | 'obsidian'
  label: string
}

const SOURCES: Source[] = [
  {
    repo: 'dannysmith/taskdn',
    tagPrefix: 'tdn-cli-v',
    product: 'cli',
    label: 'CLI',
  },
  {
    repo: 'dannysmith/taskdn',
    tagPrefix: 'desktop-v',
    product: 'desktop',
    label: 'Desktop',
  },
  {
    repo: 'dannysmith/obsidian-taskdn',
    tagPrefix: '',
    product: 'obsidian',
    label: 'Obsidian Plugin',
  },
]

interface GitHubRelease {
  tag_name: string
  html_url: string
  published_at: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
}

/** Fetches every release in the repo, following pagination. */
async function fetchReleases(repo: string): Promise<GitHubRelease[]> {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  const releases: GitHubRelease[] = []
  for (let page = 1; ; page++) {
    const response = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    )
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${repo} releases`)
    }
    const batch = (await response.json()) as GitHubRelease[]
    releases.push(...batch)
    if (batch.length < 100) return releases
  }
}

/**
 * Removes boilerplate that older release bodies carry: a title repeating the
 * post's, install instructions, and changelog links.
 */
function cleanBody(body: string): string {
  return body
    .replace(/^##\s*Taskdn Desktop v[\d.]+\s*\n*/i, '')
    .replace(/### Installation Instructions[\s\S]*$/i, '')
    .replace(/^\*\*Full Changelog\*\*:.*$/gm, '')
    .trim()
}

function renderPost(
  source: Source,
  version: string,
  release: GitHubRelease
): string {
  const title = `${source.label} v${version}`
  const date = (release.published_at ?? '').split('T')[0]
  const body = cleanBody(release.body ?? '')
  return [
    '---',
    `title: '${title}'`,
    `description: 'Release notes for ${title}'`,
    `date: ${date}`,
    `product: ${source.product}`,
    '---',
    '',
    ...(body ? [body, '', '---', ''] : []),
    `[View on GitHub](${release.html_url})`,
    '',
  ].join('\n')
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const releasesByRepo = new Map<string, GitHubRelease[]>()
  let written = 0

  for (const source of SOURCES) {
    let releases = releasesByRepo.get(source.repo)
    if (!releases) {
      releases = await fetchReleases(source.repo)
      releasesByRepo.set(source.repo, releases)
    }

    for (const release of releases) {
      if (release.draft || release.prerelease) continue
      if (!release.tag_name.startsWith(source.tagPrefix)) continue

      const version = release.tag_name
        .slice(source.tagPrefix.length)
        .replace(/^v/, '')
      const name = `${source.product}-${version}`
      const exists = ['.md', '.mdx'].some((ext) =>
        existsSync(join(POSTS_DIR, name + ext))
      )
      if (exists) continue

      if (dryRun) {
        console.log(`Would write ${name}.md`)
      } else {
        writeFileSync(
          join(POSTS_DIR, `${name}.md`),
          renderPost(source, version, release)
        )
        console.log(`Wrote ${name}.md`)
      }
      written++
    }
  }

  console.log(`${written} new release post(s)`)
}

await main()
