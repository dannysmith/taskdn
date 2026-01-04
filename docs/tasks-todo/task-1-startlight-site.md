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

- [x] `getting-started.mdx`
- [x] `philosophy.mdx`

### Desktop App

- [x] `desktop/overview.mdx`

### Obsidian Integration

- [x] `obsidian/plugin.mdx`
- [x] `obsidian/starter-vault.mdx`

### CLI

- [x] `cli/overview.mdx`
- [x] `cli/read-commands.mdx`
- [x] `cli/write-commands.mdx`
- [x] `cli/working-with-ai.mdx`


### Claude Code Plugin

- [x] `claude-code/overview.mdx`
- [x] `claude-code/skill.mdx`
- [x] `claude-code/slash-commands.mdx`


### Reference

- [x] `reference/cli/cli-reference.mdx`

### Developer

- [ ] `developer/contributing.mdx`
- [ ] `developer/roadmap.mdx`

### Final Touches

- [ ] Add a setup.md to the end of the start here section. This should start with a paragraph explaining that this assumes you have obsidian and Claude code installed. And then it should contain a steps component that walks through the ideal order of getting everything installed Starting with a new empty obsidian vault to store all this. Each steps component should just have uh like the minimum required to get things working. So that probably looks like:
  1. Clone the starter vault and open in Obsidian and turn on bases and wikilinks. Should end with a details section to cover optionally installing the folder notes plugin and configuring that. Check outthe bases.
  2. Install & configure the Obsidian Plugin. Check out the "overview" pages and the example showing the widgets.
  3. install and configure the CLI to point at your folder and try running a context command
  4. globally install and configure the Claude Code plugin and try askingit a question.
  5. Install and configure the desktop app and look at your tasks
- [ ] Add images and videos
- [ ] Review entire set of documentation together for inconsistencies, needless repetition, AI-isms and the like.

## Phase 3 - Changelog (Manual for now)

## Phase 4 - Proper Splash/Homepage

## Phase 3 - Automatic Changelog & Product Installation Binaries

- [ ] Set up GitHub Action which looks for new releases in this repo and in obsidian-taskdn and republishes them on the website changelog, as well as pulling the right installation artefacts from those repos into the website binary etc.
