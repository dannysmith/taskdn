# Task 6: Dev identity and agent safety

Make sure an agent working on any product in this repo can never touch Danny's real vault or installed app, give agents a way to see and drive the dev desktop app, and finish updating the other products' dependencies. Several PRs, roughly one per phase.

Desktop dependencies and tooling (Oxlint, Oxfmt, TypeScript 7, Vite 8 and the `zip` fix) were this task's first phase and are done: see `docs/tasks-done/task-2026-11-16-desktop-dependencies-and-tooling.md`.

Astro Editor is the reference throughout: `~/dev/astro-editor/`, especially `docs/developer/agent-tooling.md`, `package.json`, `scripts/` and `.claude/skills/app-control/`. `tdn-desktop` came from the same Tauri template, so most of it ports directly.

## Phase 1: Desktop dev identity

Today a dev build uses the installed app's identifier (`is.danny.taskdn-desktop`). It reads Danny's real preferences and vault path, shares the single-instance lock and fights the installed app for the global shortcut.

- [ ] `src-tauri/tauri.dev.conf.json` with identifier `is.danny.taskdn-desktop.dev` and product name "Taskdn Dev", applied by a `scripts/tauri-dev.sh` behind `bun run tauri:dev`.
- [ ] Worktree dev slots (`scripts/dev-slot.ts`, `scripts/setup.ts`): each worktree gets its own identifier, Vite port and app data.
- [ ] Dev builds:
  - use a different global shortcut
  - skip the update check
  - show the slot and branch in the window title
  - start with the rendered demo test vault (`demo-vaults/demo`) as their vault
- [ ] List each slot's app data folder in `.claude/settings.json`'s sandbox config so agents can reach the bridge file (Danny edits this file; agents can't write it).

## Phase 2: Agent bridge, styleguide and logs

- [ ] Agent bridge, debug builds only:
  - a token-protected HTTP server in `src-tauri/src/agent_bridge/`
  - `window.__agentBridge` in `src/lib/agent-bridge/`
  - the `bun run app` CLI (`scripts/app.ts`, `app-logs.ts`, `app-diff.ts`)

  The CLI covers screenshots in both themes, the UI tree, click, fill, key and logs. Add Taskdn-specific actions: open a view, select a task, run a command palette command, open the quick entry pane.
- [ ] Port the `app-control` skill.
- [ ] Styleguide as a second Vite entry (`styleguide.html`, `src/styleguide/`) replacing the in-app component reference view, so it never ships and each section can be screenshotted.
- [ ] Release builds log at info level to the log file, rotating at 5 MB and keeping two old files. Today the release log is empty, which is why the 1am crash left no trace. Task 7 depends on this.
- [ ] Document it all in a `tdn-desktop/docs/developer/agent-tooling.md`.

## Phase 3: The CLI, the rest of the repo and other products

- [ ] **CLI agent safety.** The CLI checks, in order, `TASKDN_*_DIR` env vars, `.taskdn.json` in the *current directory only*, then `~/.taskdn.json`. An agent running `tdn` from a subfolder or worktree falls through to Danny's real vault, and `tdn` runs outside the sandbox. Set `TASKDN_TASKS_DIR`, `TASKDN_PROJECTS_DIR` and `TASKDN_AREAS_DIR` in the `env` block of the repo's `.claude/settings.json`, pointing at the rendered demo vault (`demo-vaults/demo`; Danny makes the edit). Check that the installed `tdn` and the dev CLI both resolve to the test vault from the repo root, from `tdn-cli/`, and from a worktree. Note that personal task management through Claude won't work in sessions in this repo, which is intended.
- [ ] **Repo skills.** Cross-product skills live in the root `.claude/skills/` (`deps-update` and `generate-persona-vault` are there already). Convert `tdn-desktop/.claude/commands/` (`/check`, `/init`) to skills and drop the template-era agents nobody uses.
- [ ] **Website.** Dependency updates with the `deps-update` skill. Keep ESLint and Prettier (Astro Editor's website did too).
- [ ] **CLI.** Security-relevant dependency updates only, with the `deps-update` skill; its tooling is redone in the 2.0 rewrite. Includes Dependabot #38 (`minimatch`).

## Follow-ups from the desktop dependency update

Small and independent; do them whenever convenient.

- [ ] A `codebase-hygiene` session on the desktop app with Danny. knip reports 2 unused dependencies (`@tanstack/react-query-devtools`; `next-themes`, used only by `ui/sonner.tsx`, which nothing imports), 11 unused exports and 7 unused exported types.
- [ ] `tdn-desktop/sgconfig.yml` points at a `.ast-grep/test` folder that doesn't exist, so `ast-grep test` fails. Add rule tests or remove the entry.
- [ ] `katex` 0.16 (low-severity advisory) comes in through Milkdown Crepe. Recheck on the next dependency update.

## Done when

- A dev build runs alongside the installed app without sharing anything.
- An agent can screenshot and drive the dev app with `bun run app`.
- The release log has content.
- `tdn` run by an agent anywhere in the repo hits the test vault.
