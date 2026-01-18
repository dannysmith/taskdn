# Task: Website Changelog / Release Notes

## Overview

Add a unified changelog to the website that aggregates releases from all Taskdn products.

### Goals

- Single page showing all releases across products
- Automated creation of release entries when GitHub releases are published
- Full editability of release notes (add screenshots, rewrite descriptions, etc.)
- Support for manual entries (spec updates, starter vault changes, Claude plugin, etc.)

### Products to Track

| Product | Automation |
|---------|------------|
| tdn-cli | Workflow on `release: published` |
| tdn-desktop | Workflow on `release: published` |
| obsidian-taskdn | Scheduled sync every 6 hours |
| tdn-claude-plugin | Manual |
| Spec updates | Manual |
| Starter vault | Manual |

### Approach

Regular Starlight docs with custom frontmatter fields (`date`, `product`). A custom index page queries and sorts releases by date. No external plugins required.

---

## Phase 1: Set Up Releases Structure

### 1.1 Extend the content schema

Update `website/src/content.config.ts`:

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

const allDocs = await getCollection('docs')
const releases = allDocs.filter(
  (doc) => doc.id.startsWith('releases/') && doc.data.date
)

const sortedReleases = releases.sort(
  (a, b) => b.data.date!.getTime() - a.data.date!.getTime()
)

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
  <p>All releases across Taskdn products.</p>

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

### 1.4 Add sidebar entry

Update `website/astro.config.mjs` sidebar (at the bottom, after Developer section):

```typescript
{
  label: 'Releases',
  items: [{ label: 'All Releases', link: '/releases/' }],
},
```

### 1.5 Verify setup

Create a test release file, run `bun dev`, verify:
- `/releases/` page renders
- Individual release page works
- Sidebar shows Releases section

Delete the test file after verification.

---

## Phase 2: Release Post Conventions

### 2.1 Frontmatter

```yaml
---
title: 'CLI v1.1.0'
description: 'Brief one-line summary'
date: 2026-01-15
product: cli  # cli | desktop | obsidian | claude-plugin | spec | vault
---
```

### 2.2 File naming

`{product}-{version}.mdx`:
- `cli-1.0.0.mdx`
- `desktop-0.1.0.mdx`
- `obsidian-1.2.0.mdx`
- `claude-plugin-0.5.0.mdx`
- `spec-2026-01.mdx` (date-based for spec)
- `vault-2026-01.mdx` (date-based for vault)

### 2.3 Content structure

```mdx
---
title: 'CLI v1.1.0'
description: 'New filtering options and improved performance'
date: 2026-01-15
product: cli
---

Brief intro paragraph.

## What's New

### Feature Name

Description.

## Bug Fixes

- Fixed issue with X

---

[View on GitHub](https://github.com/dannysmith/taskdn/releases/tag/tdn-cli-v1.1.0)
```

### 2.4 Images

Store in `website/src/content/docs/releases/images/`, reference with:

```mdx
import screenshot from './images/desktop-0.2.0-kanban.png'
import { Image } from 'astro:assets'

<Image src={screenshot} alt="New Kanban view" />
```

### 2.5 Backfill existing releases

Create posts for all existing releases:
- CLI releases (check GitHub)
- Desktop releases (check GitHub)
- Obsidian plugin releases (check obsidian-taskdn repo)

---

## Phase 3: Automate CLI & Desktop Releases

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

          if [ -f "$FILENAME" ]; then
            echo "Release post already exists: $FILENAME"
            exit 0
          fi

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

Triggers on `release: published` so draft releases don't create posts.

---

## Phase 4: Automate Obsidian Plugin Releases

### 4.1 Create PAT

1. Create fine-grained PAT with read access to `dannysmith/obsidian-taskdn`
2. Add as secret `OBSIDIAN_REPO_PAT` in taskdn repo

### 4.2 Create sync workflow

Create `.github/workflows/sync-obsidian-releases.yml`:

```yaml
name: Sync Obsidian Plugin Releases

on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

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
          RELEASES=$(gh api repos/dannysmith/obsidian-taskdn/releases \
            --jq '[.[] | select(.draft == false and .prerelease == false)]')

          echo "$RELEASES" | jq -c '.[]' | while read -r release; do
            TAG=$(echo "$release" | jq -r '.tag_name')
            VERSION="${TAG#v}"
            FILENAME="website/src/content/docs/releases/obsidian-${VERSION}.mdx"

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

---

## Phase 5: Manual Entries

For Claude plugin, spec updates, starter vault, or any manual release:

1. Create `website/src/content/docs/releases/{product}-{version}.mdx`
2. Add frontmatter with `title`, `description`, `date`, and `product`
3. Write content
4. Commit and push

To enhance an auto-generated release, edit the `.mdx` file directly.

---

## File Summary

### New files

```
website/src/content/docs/releases/
website/src/content/docs/releases/images/
website/src/pages/releases/index.astro

.github/workflows/create-release-post.yml
.github/workflows/sync-obsidian-releases.yml
```

### Files to modify

- `website/src/content.config.ts` - Add `date` and `product` fields
- `website/astro.config.mjs` - Add Releases to sidebar

### Secrets to add

- `OBSIDIAN_REPO_PAT` - PAT with read access to obsidian-taskdn repo
