/**
 * Writes a release post to src/content/docs/releases/ for every published
 * release that doesn't have one yet: the CLI and desktop app from this repo,
 * and the Obsidian plugin from its own repo. Existing posts are never touched,
 * so it's safe to run any number of times.
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

async function fetchReleases(repo: string): Promise<GitHubRelease[]> {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN
  const response = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=100`,
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
  return (await response.json()) as GitHubRelease[]
}

/**
 * Removes boilerplate that older release bodies carry (a title repeating the
 * post's, install instructions, changelog links) and escapes curly braces so
 * MDX doesn't read them as expressions.
 */
function cleanBody(body: string): string {
  return escapeCurlyBraces(
    body
      .replace(/^##\s*Taskdn Desktop v[\d.]+\s*\n*/i, '')
      .replace(/### Installation Instructions[\s\S]*$/i, '')
      .replace(/^\*\*Full Changelog\*\*:.*$/gm, '')
  ).trim()
}

/** Escapes { and } in prose, leaving fenced code blocks and inline code alone. */
function escapeCurlyBraces(text: string): string {
  let inCodeBlock = false
  return text
    .split('\n')
    .map((line) => {
      if (line.trimStart().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        return line
      }
      if (inCodeBlock) return line
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, i) =>
          i % 2 === 1
            ? part
            : part.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
        )
        .join('')
    })
    .join('\n')
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
      const file = join(POSTS_DIR, `${source.product}-${version}.mdx`)
      if (existsSync(file)) continue

      if (dryRun) {
        console.log(`Would write ${source.product}-${version}.mdx`)
      } else {
        writeFileSync(file, renderPost(source, version, release))
        console.log(`Wrote ${source.product}-${version}.mdx`)
      }
      written++
    }
  }

  console.log(`${written} new release post(s)`)
}

await main()
