# Task: Website Changelog / Release Notes

## Overview

Add a unified changelog to the website that aggregates releases from all Taskdn products, providing a single place for users to see all shipped changes.

### Goals

- Single page showing all releases across products (CLI, Desktop, Obsidian plugin, Claude plugin)
- Automated creation of release entries when GitHub releases are **published** (not drafted)
- Full editability of release notes (add screenshots, rewrite descriptions, etc.)
- Support for manual entries (spec updates, starter vault changes, etc.)
- Display in Starlight sidebar
- RSS feed for subscribers

### Products to Track

| Product | Source | Automation |
|---------|--------|------------|
| tdn-cli | GitHub Releases (same repo) | Separate workflow on `release: published` |
| tdn-desktop | GitHub Releases (same repo) | Separate workflow on `release: published` |
| obsidian-taskdn | GitHub Releases (external repo) | Scheduled sync workflow with PAT |
| tdn-claude-plugin | Version in plugin.json | CI check comparing old vs new version |
| Spec updates | Manual | Direct file creation |
| Starter vault | Manual | Direct file creation |

### Approach

Use **regular Starlight docs** with custom frontmatter fields (`date`, `product`) for release posts. A **custom index page** queries and sorts releases by date. No external plugins required.

This approach is simpler than starlight-blog because:
- No extra dependencies or plugin quirks
- Works with existing Starlight patterns
- Easy to manually create (just make an MDX file)
- Easy to automate (create an MDX file via GitHub Actions)
- Full control over the listing page design

---

## Phase 1: Set Up Releases Content Structure

### 1.1 Extend the content schema

Update `website/src/content.config.ts` to add release-specific frontmatter fields:

```typescript
import { defineCollection } from 'astro:content'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro:content'

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Release-specific fields (optional - only used for release pages)
        date: z.coerce.date().optional(),
        product: z
          .enum(['cli', 'desktop', 'obsidian', 'claude-plugin', 'spec', 'vault'])
          .optional(),
      }),
    }),
  }),
}
```

### 1.2 Create releases directory

```
website/src/content/docs/releases/
```

### 1.3 Create custom index page

Create `website/src/pages/releases/index.astro`:

```astro
---
import { getCollection } from 'astro:content'
import StarlightPage from '@astrojs/starlight/components/StarlightPage.astro'

// Get all release docs (those with a date field)
const allDocs = await getCollection('docs')
const releases = allDocs.filter(
  (doc) => doc.id.startsWith('releases/') && doc.data.date
)

// Sort by date, newest first
const sortedReleases = releases.sort(
  (a, b) => b.data.date!.getTime() - a.data.date!.getTime()
)

// Group by product for optional filtering
const productLabels: Record<string, string> = {
  cli: 'CLI',
  desktop: 'Desktop',
  obsidian: 'Obsidian Plugin',
  'claude-plugin': 'Claude Plugin',
  spec: 'Specification',
  vault: 'Starter Vault',
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
---

<StarlightPage
  frontmatter={{
    title: 'Releases',
    description: 'Release notes and changelog for all Taskdn products',
  }}
>
  <p>
    All releases across Taskdn products. Subscribe via{' '}
    <a href="/releases/rss.xml">RSS</a>.
  </p>

  <ul class="release-list">
    {sortedReleases.map((release) => (
      <li>
        <a href={`/${release.id.replace(/\.mdx?$/, '')}/`}>
          {release.data.title}
        </a>
        <span class="release-meta">
          <time datetime={release.data.date!.toISOString()}>
            {formatDate(release.data.date!)}
          </time>
          {release.data.product && (
            <span class="release-product">
              {productLabels[release.data.product] || release.data.product}
            </span>
          )}
        </span>
      </li>
    ))}
  </ul>
</StarlightPage>

<style>
  .release-list {
    list-style: none;
    padding: 0;
  }
  .release-list li {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--sl-color-gray-5);
  }
  .release-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    color: var(--sl-color-gray-3);
  }
  .release-product {
    background: var(--sl-color-gray-6);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
  }
</style>
```

### 1.4 Add RSS feed

Install the RSS package:

```bash
cd website
bun add @astrojs/rss
```

Create `website/src/pages/releases/rss.xml.ts`:

```typescript
import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const allDocs = await getCollection('docs')
  const releases = allDocs
    .filter((doc) => doc.id.startsWith('releases/') && doc.data.date)
    .sort((a, b) => b.data.date!.getTime() - a.data.date!.getTime())

  return rss({
    title: 'Taskdn Releases',
    description: 'Release notes for all Taskdn products',
    site: context.site!,
    items: releases.map((release) => ({
      title: release.data.title,
      pubDate: release.data.date!,
      link: `/${release.id.replace(/\.mdx?$/, '')}/`,
      description: release.data.description || `Release notes for ${release.data.title}`,
    })),
  })
}
```

### 1.5 Add sidebar entry

Update `website/astro.config.mjs` sidebar to include releases:

```typescript
sidebar: [
  // ... existing sections ...
  {
    label: 'Releases',
    items: [{ label: 'All Releases', link: '/releases/' }],
  },
],
```

### 1.6 Create initial test release

Create `website/src/content/docs/releases/test-release.mdx`:

```mdx
---
title: 'Test Release'
description: 'Test release to verify setup'
date: 2026-01-18
product: cli
---

This is a test release post to verify the setup works.

Delete this file after confirming everything renders correctly.
```

### 1.7 Verify setup

- Run `bun dev` in website directory
- Check `/releases/` page renders with the test release
- Check individual release page at `/releases/test-release/`
- Check sidebar shows Releases section
- Check RSS feed at `/releases/rss.xml`
- Delete the test release file

---

## Phase 2: Define Release Post Conventions

### 2.1 Frontmatter specification

All release posts use this frontmatter:

```yaml
---
title: 'CLI v1.1.0' # Product + version
description: 'Brief one-line summary' # For SEO and RSS
date: 2026-01-15 # Release date (YYYY-MM-DD)
product: cli # One of: cli, desktop, obsidian, claude-plugin, spec, vault
---
```

### 2.2 File naming convention

Files are named `{product}-{version}.mdx`:
- `cli-1.0.0.mdx`
- `desktop-0.1.0.mdx`
- `obsidian-1.2.0.mdx`
- `claude-plugin-0.5.0.mdx`
- `spec-2026-01.mdx` (for spec updates, use date)
- `vault-2026-01.mdx` (for starter vault updates, use date)

### 2.3 Content structure

```mdx
---
title: 'CLI v1.1.0'
description: 'New filtering options and improved performance'
date: 2026-01-15
product: cli
---

Brief intro paragraph summarizing the release.

## What's New

### Feature Name

Description of feature.

### Another Feature

Description.

## Bug Fixes

- Fixed issue with X
- Resolved problem Y

---

[View on GitHub](https://github.com/dannysmith/taskdn/releases/tag/tdn-cli-v1.1.0)
```

### 2.4 Images

Store release images in `website/src/content/docs/releases/images/`:

```
releases/
├── images/
│   ├── desktop-0.2.0-kanban.png
│   └── cli-1.1.0-filter.png
├── cli-1.1.0.mdx
└── desktop-0.2.0.mdx
```

Reference in MDX:

```mdx
import screenshot from './images/desktop-0.2.0-kanban.png'
import { Image } from 'astro:assets'

<Image src={screenshot} alt="New Kanban view" />
```

### 2.5 Backfill existing releases

Manually create release posts for all existing releases to provide historical context:

- [ ] CLI releases (check GitHub releases)
- [ ] Desktop releases (check GitHub releases)
- [ ] Obsidian plugin releases (check obsidian-taskdn repo)

---

## Phase 3: Automate Same-Repo Releases (CLI & Desktop)

Create a **single workflow** that handles release post creation for both CLI and Desktop releases. This workflow triggers when a release is **published** (not when a tag is pushed), ensuring draft releases don't appear on the website prematurely.

### 3.1 Create the workflow

Create `.github/workflows/create-release-post.yml`:

```yaml
name: Create Release Post

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  create-post:
    # Only run for CLI and Desktop releases
    if: startsWith(github.event.release.tag_name, 'tdn-cli-v') || startsWith(github.event.release.tag_name, 'desktop-v')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - name: Determine product and version
        id: info
        run: |
          TAG="${{ github.event.release.tag_name }}"

          if [[ "$TAG" == tdn-cli-v* ]]; then
            echo "product=cli" >> "$GITHUB_OUTPUT"
            echo "version=${TAG#tdn-cli-v}" >> "$GITHUB_OUTPUT"
            echo "title_prefix=CLI" >> "$GITHUB_OUTPUT"
          elif [[ "$TAG" == desktop-v* ]]; then
            echo "product=desktop" >> "$GITHUB_OUTPUT"
            echo "version=${TAG#desktop-v}" >> "$GITHUB_OUTPUT"
            echo "title_prefix=Desktop" >> "$GITHUB_OUTPUT"
          fi

          # Get date from release
          DATE=$(echo '${{ github.event.release.published_at }}' | cut -d'T' -f1)
          echo "date=${DATE}" >> "$GITHUB_OUTPUT"

      - name: Create release post
        env:
          RELEASE_BODY: ${{ github.event.release.body }}
        run: |
          PRODUCT="${{ steps.info.outputs.product }}"
          VERSION="${{ steps.info.outputs.version }}"
          DATE="${{ steps.info.outputs.date }}"
          TITLE_PREFIX="${{ steps.info.outputs.title_prefix }}"
          TAG="${{ github.event.release.tag_name }}"

          FILENAME="website/src/content/docs/releases/${PRODUCT}-${VERSION}.mdx"

          # Skip if file already exists
          if [ -f "$FILENAME" ]; then
            echo "Release post already exists: $FILENAME"
            exit 0
          fi

          # Create the file using printf to avoid heredoc issues
          {
            printf '%s\n' "---"
            printf '%s\n' "title: '${TITLE_PREFIX} v${VERSION}'"
            printf '%s\n' "description: 'Release notes for ${TITLE_PREFIX} v${VERSION}'"
            printf '%s\n' "date: ${DATE}"
            printf '%s\n' "product: ${PRODUCT}"
            printf '%s\n' "---"
            printf '\n'
            printf '%s\n' "$RELEASE_BODY"
            printf '\n'
            printf '%s\n' "---"
            printf '\n'
            printf '%s\n' "[View on GitHub](https://github.com/${{ github.repository }}/releases/tag/${TAG})"
          } > "$FILENAME"

          echo "Created: $FILENAME"

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add website/src/content/docs/releases/

          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "docs(releases): add ${{ steps.info.outputs.title_prefix }} v${{ steps.info.outputs.version }}"

            # Retry push up to 3 times in case of concurrent releases
            for i in 1 2 3; do
              if git push; then
                echo "Push succeeded"
                break
              else
                echo "Push failed, attempt $i of 3"
                git pull --rebase
              fi
            done
          fi
```

### 3.2 Why this approach

- **Triggers on `release: published`**: Desktop creates draft releases first; this ensures posts only appear when the release is actually public
- **Single workflow**: Less duplication, easier maintenance
- **Uses `printf` instead of heredoc**: Avoids shell escaping issues with markdown content
- **Retry logic**: Handles concurrent releases gracefully
- **Idempotent**: Skips if file already exists

---

## Phase 4: Automate External Repo Releases (Obsidian Plugin)

The Obsidian plugin is in a separate repo (`dannysmith/obsidian-taskdn`), so we need a different approach.

### 4.1 Create a PAT for external repo access

1. Create a fine-grained PAT with read access to `dannysmith/obsidian-taskdn`
2. Add it as a secret named `OBSIDIAN_REPO_PAT` in the taskdn repo

### 4.2 Create sync workflow

Create `.github/workflows/sync-obsidian-releases.yml`:

```yaml
name: Sync Obsidian Plugin Releases

on:
  schedule:
    - cron: '0 */6 * * *' # Every 6 hours
  workflow_dispatch: # Manual trigger

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - name: Fetch and process releases
        env:
          GH_TOKEN: ${{ secrets.OBSIDIAN_REPO_PAT }}
        run: |
          # Fetch all published releases as JSON array
          RELEASES=$(gh api repos/dannysmith/obsidian-taskdn/releases \
            --jq '[.[] | select(.draft == false and .prerelease == false)]')

          # Process each release
          echo "$RELEASES" | jq -c '.[]' | while read -r release; do
            TAG=$(echo "$release" | jq -r '.tag_name')
            VERSION="${TAG#v}"
            FILENAME="website/src/content/docs/releases/obsidian-${VERSION}.mdx"

            # Skip if file exists
            if [ -f "$FILENAME" ]; then
              continue
            fi

            DATE=$(echo "$release" | jq -r '.published_at' | cut -d'T' -f1)
            BODY=$(echo "$release" | jq -r '.body // "No release notes provided."')
            URL=$(echo "$release" | jq -r '.html_url')

            {
              printf '%s\n' "---"
              printf '%s\n' "title: 'Obsidian Plugin v${VERSION}'"
              printf '%s\n' "description: 'Release notes for Obsidian Plugin v${VERSION}'"
              printf '%s\n' "date: ${DATE}"
              printf '%s\n' "product: obsidian"
              printf '%s\n' "---"
              printf '\n'
              printf '%s\n' "$BODY"
              printf '\n'
              printf '%s\n' "---"
              printf '\n'
              printf '%s\n' "[View on GitHub](${URL})"
            } > "$FILENAME"

            echo "Created: $FILENAME"
          done

      - name: Commit if changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add website/src/content/docs/releases/

          if git diff --cached --quiet; then
            echo "No new releases to sync"
          else
            git commit -m "docs(releases): sync obsidian plugin releases"
            git push
          fi
```

### 4.3 Alternative: Immediate sync via repository dispatch

For faster sync, add to obsidian-taskdn's release workflow:

```yaml
- name: Notify main repo
  uses: peter-evans/repository-dispatch@v3
  with:
    token: ${{ secrets.TASKDN_REPO_TOKEN }}
    repository: dannysmith/taskdn
    event-type: obsidian-release
    client-payload: '{"tag": "${{ github.ref_name }}"}'
```

Then add a workflow in taskdn that listens for this event and creates the post immediately.

---

## Phase 5: Automate Claude Plugin Version Changes

The Claude plugin doesn't have GitHub releases - it's versioned via `plugin.json`. We detect version changes on push to main.

### 5.1 Create version check workflow

Create `.github/workflows/check-claude-plugin-version.yml`:

```yaml
name: Check Claude Plugin Version

on:
  push:
    branches: [main]
    paths:
      - 'tdn-claude-plugin/.claude-plugin/plugin.json'

permissions:
  contents: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2 # Need previous commit to compare

      - name: Check for version change
        id: version
        run: |
          PLUGIN_FILE="tdn-claude-plugin/.claude-plugin/plugin.json"

          # Get current version
          CURRENT=$(jq -r '.version' "$PLUGIN_FILE")
          echo "current=${CURRENT}" >> "$GITHUB_OUTPUT"

          # Get previous version (may fail if file didn't exist)
          PREVIOUS=$(git show HEAD~1:"$PLUGIN_FILE" 2>/dev/null | jq -r '.version' 2>/dev/null || echo "")
          echo "previous=${PREVIOUS}" >> "$GITHUB_OUTPUT"

          # Check if version actually changed
          if [ "$CURRENT" = "$PREVIOUS" ]; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Check if release post exists
        if: steps.version.outputs.changed == 'true'
        id: check
        run: |
          VERSION="${{ steps.version.outputs.current }}"
          FILENAME="website/src/content/docs/releases/claude-plugin-${VERSION}.mdx"

          if [ -f "$FILENAME" ]; then
            echo "exists=true" >> "$GITHUB_OUTPUT"
          else
            echo "exists=false" >> "$GITHUB_OUTPUT"
          fi

      - name: Create release post
        if: steps.version.outputs.changed == 'true' && steps.check.outputs.exists == 'false'
        run: |
          VERSION="${{ steps.version.outputs.current }}"
          DATE=$(date +%Y-%m-%d)
          FILENAME="website/src/content/docs/releases/claude-plugin-${VERSION}.mdx"

          {
            printf '%s\n' "---"
            printf '%s\n' "title: 'Claude Plugin v${VERSION}'"
            printf '%s\n' "description: 'Release notes for Claude Plugin v${VERSION}'"
            printf '%s\n' "date: ${DATE}"
            printf '%s\n' "product: claude-plugin"
            printf '%s\n' "---"
            printf '\n'
            printf '%s\n' "New version of the Claude Code plugin."
            printf '\n'
            printf '%s\n' "<!-- Edit this file to add release notes -->"
            printf '\n'
            printf '%s\n' "---"
            printf '\n'
            printf '%s\n' "The Claude Code plugin updates automatically."
          } > "$FILENAME"

      - name: Commit if created
        if: steps.version.outputs.changed == 'true' && steps.check.outputs.exists == 'false'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add website/src/content/docs/releases/
          git commit -m "docs(releases): add Claude Plugin v${{ steps.version.outputs.current }}"
          git push
```

### 5.2 Manual editing expected

The auto-generated post is a placeholder. Edit the file manually to add actual release notes before or after the commit.

---

## Phase 6: Manual Entries

### 6.1 Creating a manual release

For spec updates, starter vault changes, or any manual release:

1. Create `website/src/content/docs/releases/{product}-{version}.mdx`
2. Add frontmatter with `title`, `description`, `date`, and `product`
3. Write content in markdown
4. Commit and push (website deploys automatically)

Example for a spec update:

```mdx
---
title: 'Specification v2.1'
description: 'Added support for recurring tasks'
date: 2026-02-01
product: spec
---

## Changes

### Added

- Recurring task syntax (`@every 1w`)
- Task templates

### Changed

- Clarified status transitions

---

[View full specification](/specification/overview/)
```

### 6.2 Editing auto-generated releases

To enhance an auto-generated release:

1. Edit the `.mdx` file directly
2. Add images to `releases/images/` if needed
3. Commit and push

---

## File Summary

### New files to create

```
website/
├── src/content/docs/releases/
│   ├── images/                        # Screenshots (as needed)
│   ├── cli-*.mdx                      # Backfilled + automated
│   ├── desktop-*.mdx                  # Backfilled + automated
│   ├── obsidian-*.mdx                 # Automated
│   └── claude-plugin-*.mdx            # Automated (needs manual editing)
├── src/pages/releases/
│   ├── index.astro                    # Custom listing page
│   └── rss.xml.ts                     # RSS feed

.github/workflows/
├── create-release-post.yml            # New: handles CLI & Desktop
├── sync-obsidian-releases.yml         # New: syncs external repo
└── check-claude-plugin-version.yml    # New: detects version changes
```

### Files to modify

- `website/src/content.config.ts` - Extend schema with `date` and `product` fields
- `website/astro.config.mjs` - Add Releases to sidebar
- `website/package.json` - Add `@astrojs/rss` dependency

### Secrets to add

- `OBSIDIAN_REPO_PAT` - Fine-grained PAT with read access to obsidian-taskdn repo

---

## Decisions

- **Sidebar placement**: Very bottom, after Developer section
- **Backfill**: All existing releases (there aren't many yet)
- **Cross-linking**: Yes, manually add links to relevant docs where appropriate
- **Homepage banner**: No - keep homepage focused on getting started; RSS handles notifications
