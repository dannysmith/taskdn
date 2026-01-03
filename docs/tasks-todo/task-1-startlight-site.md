# Task: Starlight Marketing Site

Working dir: `website/`

## Phase 1 - Setup

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

## Phase 2 - Content

- [ ] Guides
  - [ ] Getting Started
    - [ ] Quick Start (incl download)
    - [ ] Core Concepts & Philosophy
    - [ ] Entities (Areas, Project & Tasks) - incl fields
    - [ ] Statuses & Workflow
  - [ ] Desktop App
    - [ ] Overview
    - [ ] Installation & Config
    - [ ] <Stub>
  - [ ] CLI
    - [ ] Overview & Concepts
    - [ ] Installation & Config (files, env vars, ignore patterns, init, config, doctor)
    - [ ] Querying: list, show & today, Filtering & Sorting
    - [ ] Querying: Context Command & AI Mode
    - [ ] Mutation: new, set status, update, archive, append-body, open
  - [ ] Claude Code Plugin
    - [ ] Overview
    - [ ] Installation
    - [ ] The Skill
    - [ ] Commands
  - [ ] Obsidian Plugin
    - [ ] Overview
    - [ ] Installation & Config
    - [ ] Basic Usage
    - [ ] Extras - Templates, Bases & WebClipper Template
- [ ] Reference
  - [ ] The Specification
    - [ ] S1
    - [ ] S2
  - [ ] CLI
    - [ ] Command Reference
    - [ ] Configuration
    - [ ] Output Modes
    - [ ] Input Modes
    - [ ] Error Codes
  - [ ] Desktop App
    - [ ] Keyboard Shortcuts
    - [ ] Visual Indicators - icons, colours etc
    - [ ] Preferences - incl settings.json etc
    - [ ] URL Scheme reference
  - [ ] Obsidian Plugin - Specification of what behaves how and when
- [ ] Developer
  - [ ] Contributing Guidelines
  - [ ] Roadmap
- [ ] Footer Pages
  - [ ] Privacy Policy (required for analytics)
  - [ ] About Danny
- [ ] Changelog entry template
- [ ] Actually Good Splash Page
  - [ ] Screenshots, GIFs, or short videos showing the products
  - [ ] Better copy & CTAs etc

## Phase 3 - Automatic Changelog

- [ ] Set up GitHub Action which looks for new releases in this repo and in obsidian-taskdn and republishes them on the website changelog, as well as pulling the right installation artefacts from those repos into the website binary etc.
