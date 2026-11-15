# Roadmap

The order for the work that came out of the November 2026 review. Each top-level item is roughly one session or PR. Items 1–7 have their own task docs; later items get docs when we get closer to them. Items below the line don't get numbers yet. Background and reasoning are in `docs/tasks-todo/temporary/` (`taskdn-review.md`, `spec-review.md`, `view-state-identity-and-core.md`).

- [x] **1. Housekeeping** (on main) → `task-1-housekeeping.md`
  - [x] Fix stale docs and pointers
  - [x] Reword rule 4 in `AGENTS.md`: no runtime dependencies between products; shared libraries are fine
  - [x] Complete `task-x-quick-entry-ai-processing.md` (all phases done)
  - [x] Close the personal review issues (#9–#13)
  - [x] Merge the Dependabot PRs (#55–57) (already superseded on main, so closed)
- [ ] **2. Release and CI workflows** (branch and PR, with CodeRabbit) → `task-2-release-and-ci-workflows.md`
  - [ ] CLI releases never become the repo's "Latest" release
  - [ ] Stop committing desktop installers; stable-named release assets instead
  - [ ] CI for desktop and website on PRs
  - [ ] Release notes flow to the website reliably for every product
  - [ ] Bring across what helps from Astro Editor (caching, test builds, action versions)
- [ ] **3. Remove installers from git history** → `task-3-remove-installers-from-history.md`
- [ ] **4. CLI 1.0.2** → `task-4-cli-1-0-2.md`
  - [ ] Fix `--json` output starting with an ANSI reset code
  - [ ] Make `new --dry-run` not write the file
  - [ ] Write local timestamps with an offset everywhere
  - [ ] Fix `tdn show "Title"` examples in the skill and website
  - [ ] Release through the new workflow
- [ ] **5. Test vaults** → `task-5-test-vaults.md`
  - [ ] Templates with relative date tokens and a renderer script
  - [ ] Demo vault becomes a template; replaces `demo-vault/` and `dummy-demo-vault/`
  - [ ] Edge-case vault
  - [ ] Persona vault generator (#26)
- [ ] **6. Tooling, deps and agent safety** (match Astro Editor) → `task-6-tooling-deps-and-agent-safety.md`
  - [ ] Desktop: dependencies, Oxlint and Oxfmt
  - [ ] Desktop: dev identity and worktree slots
  - [ ] Desktop: agent bridge, `bun run app`, styleguide, release logging
  - [ ] Agents running `tdn` anywhere in the repo always hit a test vault
  - [ ] Repo skills; website and Obsidian plugin dependencies
- [ ] **7. Desktop crash resilience** (the 1am "quit unexpectedly" crash) → `task-7-desktop-crash-resilience.md`
- [ ] **8. Spec 1.1**
  - [ ] Deterministic reference resolution
  - [ ] Open statuses: unknown values are kept and surfaced, never dropped
  - [ ] YAML quoting guidance for wikilinks and statuses
  - [ ] Timestamps with offsets
  - [ ] Reserve an optional `uid` field
  - [ ] Smaller fixes from `spec-review.md`
  - [ ] Decide: project `dropped` status, area `type`
  - [ ] JSON schemas and website spec pages
- [ ] **9. CLI eval harness and baseline** (#27)
  - [ ] Headless `claude -p` runs against a rendered test vault, with ground truth computed by script
  - [ ] Baseline scores for the current CLI
- [ ] **10. CLI 2.0 design**
  - [ ] Prior art: Beads (`bd`), Backlog.md
  - [ ] Guessability study: record what a cold agent tries to run
  - [ ] "What do you want" interview; Claude Code transcripts if Danny agrees then
  - [ ] Decide Rust or TypeScript for the CLI
  - [ ] Interface doc
- [ ] **11. `tdn-core` crate**
  - [ ] Extract from the CLI's Rust core into its own product dir
  - [ ] Pure functions over strings; file IO in a thin layer
  - [ ] Implements Spec 1.1; conformance tests run against the test vaults
  - [ ] Shared `~/.taskdn/config.json` and `TASKDN_HOME`
- [ ] **12. CLI 2.0 build**
  - [ ] Build on `tdn-core` to the interface doc
  - [ ] Dynamic shell completions (#6)
  - [ ] Evals against the baseline
  - [ ] Update `obsidian-inbox-assistant` and other consumers
  - [ ] Release 2.0
- [ ] **13. Desktop on `tdn-core`**
  - [ ] Replace the desktop's own vault code with `tdn-core`
  - [ ] Read the shared config
  - [ ] Move ordering and Today headings from localStorage to `~/.taskdn/state/`; `tdn today` reads them
- [ ] **14. Skills**
  - [ ] One `taskdn` skill (with the spec and templates as references) plus `/today`; plugin commands become skills
  - [ ] Global evals with `claude plugin eval` (#25)
- [ ] **15. Desktop: always-on app**
  - [ ] Launch at login, menu-bar icon, Today popover
  - [ ] Destroy the main webview on close, recreate it on open
- [ ] **16. Desktop features and review**
  - [ ] Undo (#31)
  - [ ] Multi-select (#29)
  - [ ] Code review, including pruning template-era developer docs
- [ ] **17. Website rewrite** (#49)
  - [ ] Rewrite by hand once the CLI and skill have settled
  - [ ] Regenerate screenshots from a persona vault in both themes
  - [ ] Intro video

---

Unnumbered for the future:

- [ ] Swift native app experiment, written from the spec alone as a test of it
- [ ] Status aliases (e.g. treat `new` as Inbox)
- [ ] Publish `tdn-core`: crates.io, plus a WASM or NAPI package for TypeScript
- [ ] Obsidian plugin on `tdn-core` via WASM
- [ ] atproto two-way sync via private spaces

Known risk until items 11 and 13: files with an unknown status or an unquoted wikilink silently disappear from the CLI and desktop.
