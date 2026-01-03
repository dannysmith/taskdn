# AI Agent Instructions for Taskdn Website

## Purpose

Public-facing website for Taskdn: marketing site, documentation, and specifications.

## Stack

[Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) + [Flexoki](https://stephango.com/flexoki) theme.

## Directory Structure

```
website/
├── src/content/docs/      # All content as .md or .mdx
├── public/                # Static assets, robots.txt
├── astro.config.mjs       # Site config, sidebar, SEO
└── tsconfig.json
```

## Commands

| Command                | Action                       |
| :--------------------- | :--------------------------- |
| `bun dev`              | Start dev server (port 4321) |
| `bun build`            | Build to `./dist/`           |
| `bun run check`        | TypeScript checking          |
| `bun run lint`         | ESLint                       |
| `bun run format`       | Prettier (write)             |

## SEO & Meta

Configured in `astro.config.mjs`:

- **Sitemap**: Auto-generated (`/sitemap-index.xml`)
- **Open Graph**: Starlight auto-adds per-page og:title, og:description, og:url
- **LLM context**: [starlight-llms-txt](https://delucis.github.io/starlight-llms-txt/) generates `/llms.txt`

---

## Documentation Structure & Content

Follow these conventions when creating or editing content in `src/content/docs/`.

### Page Types

| Type | Purpose | Location |
|------|---------|----------|
| **Section Index** | Overview + navigation | `{section}/index.mdx` |
| **Content Page** | Tutorial or guide | `{section}/{topic}.mdx` |
| **Reference Page** | Lookup tables, specs | `reference/{topic}.mdx` |

### File Naming

- **kebab-case** for all files and folders
- **index.mdx** for section landing pages
- **Singular nouns** for concept pages — unless genuinely plural (`statuses.mdx`)
- Use Starlight's sidebar config for ordering (no numbered prefixes)

### Frontmatter

Every page requires:

```yaml
---
title: "Page Title"           # Appears in sidebar & H1
description: "One sentence"   # For SEO/meta
sidebar:
  order: 1                    # Position within section
  # label: "Short Name"       # Optional shorter sidebar text
  # badge: "New"              # Optional badge
---
```

### Page Templates

**Section Index** — brief intro, CardGrid navigation, overview paragraphs:

````mdx
---
title: "CLI Guide"
description: "Learn how to use the Taskdn CLI"
sidebar:
  order: 3
---

import { CardGrid, LinkCard } from '@astrojs/starlight/components'

Brief intro to what this section covers.

<CardGrid>
  <LinkCard title="Installation" href="/guides/cli/installation" />
  <LinkCard title="Querying" href="/guides/cli/querying" />
</CardGrid>

## Overview

What is this? Who is it for? What can you do with it?
````

**Content Page** — summary, topics with examples, next steps:

````mdx
---
title: "Querying Tasks"
description: "Use list, show, and today to find tasks"
sidebar:
  order: 2
---

One paragraph summary.

## Topic

Content with examples.

```bash
tdn list --status ready
```

## Next Steps

- [Related page](/path)
````

**Reference Page** — intro, then structured entries with syntax/options/examples:

````mdx
---
title: "Commands Reference"
description: "Complete CLI command reference"
sidebar:
  order: 1
---

## list

Query and filter entities.

**Syntax:** `tdn list [entity-type] [options]`

| Flag | Description |
|------|-------------|
| `--status` | Filter by status |
| `--due` | Filter by due date |

```bash
tdn list --status ready --due today
```
````

### Headings

- **H1**: Never use — generated from `title`
- **H2**: Main sections
- **H3**: Subsections or individual items
- **H4**: Rarely, only for deeply nested content

### When to Use Components

Use `.mdx` and import from `@astrojs/starlight/components`.

**Steps** — for sequential procedures only:

```mdx
<Steps>
1. Install the CLI
2. Create a config file
3. Run your first command
</Steps>
```

**Tabs** — when reader chooses one option. Always use `syncKey`.

Standard keys: `pkg` (package managers), `os` (operating systems), `shell` (shells)

````mdx
<Tabs syncKey="pkg">
  <TabItem label="Homebrew" icon="apple">
    ```bash
    brew install dannysmith/taproom/tdn
    ```
  </TabItem>
  <TabItem label="npm" icon="seti:npm">
    ```bash
    npm install -g @taskdn/cli
    ```
  </TabItem>
  <TabItem label="Binary">
    Download from GitHub Releases
  </TabItem>
</Tabs>
````

````mdx
<Tabs syncKey="os">
  <TabItem label="macOS">~/.config/taskdn/config.json</TabItem>
  <TabItem label="Windows">%APPDATA%\taskdn\config.json</TabItem>
  <TabItem label="Linux">~/.config/taskdn/config.json</TabItem>
</Tabs>
````

**Asides** — for parenthetical info. Types: `note` (default), `tip`, `caution`, `danger`. Don't overuse.

```mdx
<Aside type="tip">Use `--ai` mode when scripting.</Aside>
```

**Cards** — `LinkCard` for navigation on index pages, `Card` for feature lists.

**FileTree** — for directory structures. Use `**bold**` to highlight.

### Code Blocks

Starlight uses [Expressive Code](https://expressive-code.com/).

- Always specify language: `bash`, `json`, `yaml`, `typescript`
- `bash` auto-renders as terminal frame
- Use `title="filename.ext"` for file contents
- Use `frame="none"` for syntax snippets that aren't runnable commands
- Line highlighting: `{2,4-5}`, text markers: `"config"`, diff: `ins={2} del={1}`

### Tables vs Lists

- **Tables**: Structured data with multiple attributes per item
- **Lists**: Steps, features, or prose descriptions

### Cross-References

Link between guides and reference pages. Use absolute paths from site root:

```mdx
See [Commands Reference](/reference/cli/commands) for details.
```

### Writing Style

- **Active voice**: "Run `tdn list`" not "The list command can be run"
- **Second person**: "You can filter" not "Users can filter"
- **Present tense**: "This creates" not "This will create"
- **Concise**: No fluff
- **Examples first**: Show code, then explain
- **No time estimates**: Never "takes 5 minutes"

---

## Starlight Docs

- [Authoring Content](https://starlight.astro.build/guides/authoring-content/)
- [Components](https://starlight.astro.build/reference/components/)
- [Sidebar Configuration](https://starlight.astro.build/guides/sidebar/)
- [Frontmatter Reference](https://starlight.astro.build/guides/frontmatter/)
- [Expressive Code](https://expressive-code.com/key-features/text-markers/)
