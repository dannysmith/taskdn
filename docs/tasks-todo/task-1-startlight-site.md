# Task: Starlight Marketing Site

Working dir: `website/`

## Phase 1 - Setup ✅

- [x] Install
- [x] Set up Theme: https://delucis.github.io/starlight-theme-flexoki/
- [x] Remove cruft, update readme, set up basic structure & AGENTS.md etc
- [x] Add tsc, eslint, prettier etc with appropriate plugins
- [x] Update top-level docs & pages
- [x] Generate and add logo
- [x] Generate favicon (multiple sizes/formats)
- [x] Configure Open Graph / social meta tags (check what Starlight provides by default)
- [x] Enable sitemap & add to robots.txt
- [x] https://delucis.github.io/starlight-llms-txt/
- [x] Set up splash page and hero
- [x] Set up Simple Analytics
- [x] Set up custom domain: tdn.danny.is
- [x] Set up build on GH Pages https://melikyan.dev/blog/how-to-quickly-setup-a-blog/
- [x] Privicy & Cookies Policy

## Phase 2 - Write Docs Content

### The Specification ✅

- [x] `specification/overview.mdx`
- [x] `specification/s1-core.mdx`
- [x] `specification/s2-implementation.mdx`

### Start Here

- [ ] `getting-started.mdx`

  - [ ] Intro paragraphs - Explain what Tas the N is all about.
  - [ ] The suite - table listing the various products they should link to the correct bits of documentation on the left they should also show the current status using emojis and on the very left hand column there should be emojis the same ones we used in the sidebar Which are kind of acting as the icons for the various products. They should be in the same order that they are in the sidebar.
  - [ ] Core Concepts

    - [ ] We should explain the one or two core concepts of the suite. The idea that there's one file per entity and that they're YAML front matter and what the three different entities are. We should also explain that all of these things are intended to be interfaces providing the right context. They're all interfaces to files on disk. Uh this stuff can be predominantly a bunch of paragraphs. it should be based fairly heavily on overview.md But doesn't need to include any of the kind of deeper philosophy and principles and all of that stuff. This is meant to just provide a basic information for people to straight away understand what what is this entire project and get the right mental model for it. It's also gonna need to explain the relationships between areas, projects and tasks, etcetera.
    - [ ] The subsections under this for each of the entities should Briefly explain in plain English what each thing represents, where it lives and provide a very simplistic example of each of the things to demonstrate the front matter and what it might look like. We should also include a list of the statuses for tasks and projects, including information about what each status means. The tables including information about the statuses should use the badge component to represent the actual statuses. And we'll use the same colours which we use in the desktop app to do this.
          | Status | Color | Meaning |
          | ----------- | ----------- | ----------------------- |
          | inbox | Blue | Needs processing |
          | planning | Blue | Being planned |
          | icebox | Light blue | Frozen/deferred |
          | ready | Grey | Waiting to start |
          | in-progress | Amber | Active work |
          | paused | Light amber | Temporarily on hold |
          | blocked | Dark red | Stuck, needs resolution |
          | dropped | Light red | Abandoned |
          | done | Green | Complete |

    - [ ] The last section, which isn't in there at the moment, should include details of the kind of uses we might put each of the products to. This is probably gonna want to include a couple of paragraphs on why each product exists, along with a screenshot of them. And again a link to the relevant area of the docs. We don't have the screenshots yet, so they should be placeholders for them. Probably the way to think about this is that the desktop app is for day to day task management. This is like the replacement for things or Notion or wherever you, you know, move your task with Kanban boards and stuff um around. The CLI is for programmatic messing with tasks and giving context to AI agents. And the screenshot of this will probably show a couple of commands and their outputs, and in particular one of the AI context commands. The obsidian plugin just allows you to be looking at these files in Obsidian and see uh some metadata and I do have a screenshot for that which I can provide. And then the Clawed Code skill is a skill which can be loaded and has instructions for how to work with and create and search for tasks. So I'll probably show a GIF or a short video here of Clawed Code being asked a question, then going and getting context, answering the question, and then creating a new task. We want this area to be fairly short, but the idea here is that when people have seen this, they'll kind of understand the the whole thing.

- [ ] `philosophy.mdx`

### Obsidian Integration

- [ ] `obsidian/plugin.mdx`
- [ ] `obsidian/starter-vault.mdx`

### Claude Code Plugin

- [ ] `claude-code/overview.mdx`
- [ ] `claude-code/skill.mdx`
- [ ] `claude-code/slash-commands.mdx`

### CLI

- [ ] `cli/overview.mdx`
- [ ] `cli/read-commands.mdx`
- [ ] `cli/write-commands.mdx`
- [ ] `cli/working-with-ai.mdx`

### Reference

- [ ] `reference/cli/cli-reference.mdx`
- [ ] `reference/cli/obsidian-plugin-reference.mdx`
- [ ] `reference/desktop-reference/url-scheme.mdx`
- [ ] `reference/desktop-reference/keyboard-shortcuts.mdx`

### Developer

- [ ] `developer/contributing.mdx`
- [ ] `developer/roadmap.mdx`

### Desktop App

- [ ] `desktop/overview.mdx`

## Phase 3 - Changelog (Manual for now)

## Phase 4 - Proper Splash/Homepage

## Phase 3 - Automatic Changelog & Product Installation Binaries

- [ ] Set up GitHub Action which looks for new releases in this repo and in obsidian-taskdn and republishes them on the website changelog, as well as pulling the right installation artefacts from those repos into the website binary etc.
