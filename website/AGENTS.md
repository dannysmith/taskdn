# AI Agent Instructions for Taskdn Website

## Purpose

Public-facing website for Taskdn: https://tdn.danny.is. It includes the following:

- **Homepage** - A "marketing" landing/splash page with CTAs to download the products and learn more about their features.
- **Docs** - User-facing documentation
  - **Guides** - Helps users understand taskdn, learn its features and use the products.
  - **Reference** - More technical reference documents, including the specifications.
  - **Developer** - Documentation for developers wanting to contribute or create their own implementations.
- **Changelog** - Log of releases to all products. Automatically generated.

## Stack

[Astro](https://astro.build/) + [Starlight](https://starlight.astro.build/) + [Flexoki](https://stephango.com/flexoki) theme. Statically Generated. Github Pages & GitHub Actions for Deployment.

## Directory Structure

```
website/
├── src/assets/            # Assets used in documentation pages
├── src/components/        # Custom Astro components
├── src/layouts/           # Layouts for standalone pages
├── src/pages/             # Standalone Astro pages (outside Starlight)
├── src/content/docs/      # All documentation content as .md or .mdx
├── public/                # Static assets
└── astro.config.mjs       # Site config, sidebar, SEO
```

## Dev Commands

| Command            | Action                                           |
| :----------------- | :----------------------------------------------- |
| `bun dev`          | Start dev server (port 4321)                     |
| `bun build`        | Build to `./dist/`                               |
| `bun run check`    | Runs astro check, tsc, eslint and prettier check |
| `bun run lint:fix` | ESLint Auto-fix                                  |
| `bun run format`   | Prettier (write)                                 |

## SEO & Meta

Configured in `astro.config.mjs`:

- **Sitemap**: Auto-generated (`/sitemap-index.xml`)
- **Open Graph**: Starlight auto-adds per-page og:title, og:description, og:url
- **LLM context**: [starlight-llms-txt](https://delucis.github.io/starlight-llms-txt/) generates `/llms.txt`

---

## Writing Documentation

Follow these conventions when creating or editing content in `src/content/docs/`.

### Page Types

| Type               | Purpose              | Location                |
| ------------------ | -------------------- | ----------------------- |
| **Content Page**   | Tutorial or guide    | `{section}/{topic}.mdx` |
| **Reference Page** | Lookup tables, specs | `reference/{topic}.mdx` |

### File Naming

- **kebab-case** for all files and folders
- **Singular nouns** for concept pages — unless genuinely plural (`statuses.mdx`)
- Use Starlight's sidebar config for ordering (no numbered prefixes)

### Frontmatter

Every page requires:

```yaml
---
title: 'Page Title' # Appears in sidebar & H1
description: 'One sentence' # For SEO/meta
---
```

### Headings

- **H1**: Never use — generated from `title`
- **H2-H4**: Section Hierachy

### Using Components

Use Starlight's built-in components by importing from `@astrojs/starlight/components` (only works in `.mdx` files).

### Custom Components

Custom Astro components live in `src/components/`. Always use the `@components` alias when importing:

```mdx
import MyComponent from '@components/MyComponent.astro';

<MyComponent />
```

**Never** use relative paths like `../../components/`. The alias is configured in `tsconfig.json`.

### Images & Assets

Images used in documentation live in `src/assets/`. Ideally, import them using the `@assets` alias and render with Astro's `<Image>` component:

```mdx
import { Image } from 'astro:assets'
import screenshot from '@assets/my-screenshot.png'

<Image src={screenshot} alt="Description of the image" />
```

It's also fine to use standard markdowm.

### Steps Component

Use the `<Steps>` component to style numbered lists of tasks. This is useful for more complex step-by-step guides where each step needs to be clearly highlighted.

Wrap `<Steps>` around a standard Markdown ordered list. All the usual Markdown syntax is applicable inside `<Steps>`.

### Tabs Component

When instructions differ depending on the user's setup (eg Win/macos/Linus or npm/pnpm/bun).

Keep multiple tab groups synchronized by adding the syncKey attribute. All `<Tabs>` on a page with the same syncKey value will display the same active label. This allows your reader to choose once (e.g. their operating system or package manager), and see their choice persisted across page navigations. Standard keys: `pkg` (package managers), `os` (operating systems), `shell` (shells)

````mdx
<Tabs syncKey="pkg">
  <TabItem label="Homebrew" icon="apple">
    ```bash brew install dannysmith/taproom/tdn ```
  </TabItem>
  <TabItem label="npm" icon="seti:npm">
    ```bash npm install -g @taskdn/cli ```
  </TabItem>
  <TabItem label="Binary">Download from GitHub Releases</TabItem>
</Tabs>
````

```mdx
<Tabs syncKey="os">
  <TabItem label="macOS">~/.config/taskdn/config.json</TabItem>
  <TabItem label="Windows">%APPDATA%\taskdn\config.json</TabItem>
  <TabItem label="Linux">~/.config/taskdn/config.json</TabItem>
</Tabs>
```

### Aside Component

For parenthetical info. Types: `note` (default), `tip`, `caution`, `danger`. Don't overuse.

```mdx
:::tip
Use `--ai` mode when scripting.
:::
```

or

```mdx
<Aside type="tip">Use `--ai` mode when scripting.</Aside>
```

### LinkCard, Card & CardGrid Components

Use `LinkCard` for in-page navigation to other docs. Do not over-use.

`Card` should be used sparingly to add interest to the documentation. Cards should amost always include a title, icon and some content.

Cards and LinkCards can be arranged with the `CardGrid` component.

### FileTree Component

For all directory structures. Specify the structure of your files and directories with an unordered Markdown list inside `<FileTree>`. Create a sub-directory using a nested list or add a / to the end of a list item to render it as a directory without specific content. Use bold `**filename**` to highlight a file. Add a comment to a file or directory by adding more text after the name. Add placeholder files and directories by using either ... or … as the name.

### Code Blocks

Starlight uses [Expressive Code](https://expressive-code.com/).

- Always specify language: `bash`, `json`, `yaml`, `typescript`
- `bash` auto-renders as terminal frame
- Use `title="filename.ext"` for file contents
- Use `frame="none"` for syntax snippets that aren't runnable commands
- Line highlighting: `{2,4-5}`, text markers: `"config"`, diff: `ins={2} del={1}`

### Details

Details (also known as “disclosures” or “accordions”) are useful to hide content that is not immediately relevant. Use the standard HTML `<details>` and `<summary>` elements. These can contain markdown.

### Tables

Use for structured data with multiple attributes per item. You may find the `<Badge>` component useful in tables.

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
