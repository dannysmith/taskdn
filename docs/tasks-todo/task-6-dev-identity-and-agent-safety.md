# Task 6: Dev identity and agent safety

Make sure an agent working on any product in this repo can never touch Danny's real vault or installed app, give agents a way to see and drive the dev desktop app, and finish updating the other products' dependencies. Several PRs, roughly one per phase.

Desktop dependencies and tooling (Oxlint, Oxfmt, TypeScript 7, Vite 8 and the `zip` fix) were this task's first phase and are done: see `docs/tasks-done/task-2026-11-16-desktop-dependencies-and-tooling.md`.

Astro Editor is the reference throughout: `~/dev/astro-editor/`, especially `docs/developer/agent-tooling.md`, `package.json`, `scripts/` and `.claude/skills/app-control/`. `tdn-desktop` came from the same Tauri template, so most of it ports directly.

## Phase 1: Desktop dev identity

Today a dev build uses the installed app's identifier (`is.danny.taskdn-desktop`). It reads Danny's real preferences and vault path, shares the single-instance lock and fights the installed app for the global shortcut.

- [x] `src-tauri/tauri.dev.conf.json` with identifier `is.danny.taskdn-desktop.dev` and product name "Taskdn Dev", applied by a `scripts/tauri-dev.sh` behind `bun run tauri:dev`.
- [x] Worktree dev slots (`scripts/dev-slot.ts`, `scripts/setup.ts`): each worktree gets its own identifier, Vite port and app data.
- [x] Dev builds:
  - use a different global shortcut
  - skip the update check
  - show the slot and branch in the window title
  - start with the rendered demo test vault (`demo-vaults/demo`) as their vault
- [x] List each slot's app data folder in `.claude/settings.json`'s sandbox config so agents can reach the bridge file (Danny edits this file; agents can't write it).

### Plan

Work happens on the `desktop-dev-identity` branch. All paths below are in `tdn-desktop/` unless they start at the repo root.

**Port from Astro Editor, near-verbatim:**

- `src-tauri/tauri.dev.conf.json` (identifier and product name only; window settings stay out of it).
- `scripts/dev-slot.ts` and its test: slot 0 is the main checkout, slots 1–4 are worktrees, recorded in `tdn-desktop/dev-slot.local` (already gitignored by `*.local`). Identifier `is.danny.taskdn-desktop.dev<n>`, product name "Taskdn Dev n", Vite port `1420 + 10n`, title "Taskdn (Dev n · branch)". The test runs under Vitest, so `vitest.config.ts` gains `scripts/**/*.test.ts`.
- `scripts/tauri-dev.sh` behind `bun run tauri:dev`: evals `dev-slot.ts`, passes `tauri.dev.conf.json` plus the slot overlay as `--config`, tees output to `~/Library/Logs/<identifier>/tauri-dev.log`. It also sources `~/.cargo/env`, as the current script does.
- `scripts/setup.ts` behind `bun run setup`: installs dependencies; in a worktree it claims a slot, empties that slot's app data and clones the main checkout's `src-tauri/target` with `cp -cR`.
- `vite.config.ts` reads the port from `TASKDN_DEV_PORT`.
- The native window title is set in `setup_app` from `TASKDN_DEV_TITLE` (debug builds only).
- No automatic update check in dev builds; the menu item still works.
- `.config/wt.toml` at the repo root so worktrunk runs setup when it makes a worktree.

**Different here:**

- **Monorepo layout.** The git root is the repo, but the app is `tdn-desktop/`. `dev-slot.ts` takes the checkout root from git and works in `<root>/tdn-desktop`; the slot file lives in `tdn-desktop/`, and setup clones `tdn-desktop/src-tauri/target`.
- **Global shortcut.** Astro Editor has none. The main checkout's dev app (identifier ending `.dev`) defaults to `CommandOrControl+Alt+Shift+.`; worktree slots register no default shortcut, so work on the quick entry pane happens in the main checkout. A shortcut saved in a slot's preferences still registers. `get_default_quick_pane_shortcut` returns the build's default, so the Quick Entry preferences pane shows it. A failure to register the shortcut becomes a logged warning instead of an error from `setup_app`, which today would stop the app starting (this also helps release builds when another app has taken the shortcut).
- **Visible title.** On macOS the window has no native title bar; the in-app `TitleBar` shows "Tasks". Dev builds show the slot and branch there too (a Vite `define` from `TASKDN_DEV_TITLE`), as well as setting the native title for Mission Control and the Window menu.
- **Demo vault.** In debug builds, when the slot has no preferences file yet, the defaults point at `<checkout>/demo-vaults/demo` (the existing `get_demo_vault_paths`, so each worktree uses its own copy). Both `load_preferences` and the startup `load_vault_dirs` get this, so the vault opens on first launch. Changing the vault in a dev build still sticks for that slot. If `demo-vaults/demo` is missing, `tauri-dev.sh` and `setup.ts` render it first (`bun run vault render demo` at the repo root, which needs no install). They never re-render an existing one, so test state survives restarts; re-render by hand for a clean copy.
- **"Read from CLI" button.** It reads `~/.taskdn.json`, which points at the real vault. In debug builds it reads the demo vault's `.taskdn.json` instead (every rendered vault has one), so the button still works and can't reach the real vault.
- **Guard against the wrong identity.** A debug build started with the release identifier (plain `bun run tauri dev`, `tauri build --debug`) exits at startup with a message to use `bun run tauri:dev`. With that in place the `preferences.development.json` filename split is redundant, so both builds use `preferences.json`. The old `preferences.development.json` in the installed app's folder is then orphaned; Danny can trash it.
- **Already separate once the identifier differs:** single-instance lock, window state, logs, recovery files, persisted fs scope and WebKit storage (localStorage). Deep links aren't registered by unbundled dev builds on macOS, so `taskdn://` keeps going to the installed app.

**Order of commits:** dev identity (conf, `tauri-dev.sh`, guard, prefs filename); slots and setup (`dev-slot.ts`, test, `setup.ts`, port, `wt.toml`); dev build behaviour (shortcut, update check, title, demo vault, CLI button); docs (`docs/developer/agent-tooling.md` started with the dev identity section, `data-persistence.md`, `keyboard-shortcuts.md`, `AGENTS.md`).

**Progress:** Code and docs are committed on `desktop-dev-identity` and `bun run check:all` passes. Docs live in `tdn-desktop/docs/developer/agent-tooling.md`. Runtime checks passed: with the installed app, the main dev app and a slot 1 worktree all running, nothing under `is.danny.taskdn-desktop` changed from the dev builds, each app opened its own vault, and the installed and main dev apps both registered their shortcuts. The root `.claude/settings.json` now exists with the slot folders and the project's permissions. Phase 1 is done once its PR merges.

**Checks before handing over:** `bun run check:all`; with the installed app running, start `tauri:dev` and confirm both run, both shortcuts open their own quick pane, the dev app opens the demo vault, and nothing under `~/Library/Application Support/is.danny.taskdn-desktop/` changes (compare modification times before and after); then a worktree on slot 1 alongside both.

## Phase 2: Agent bridge, styleguide and logs

- [x] Agent bridge, debug builds only:
  - a token-protected HTTP server in `src-tauri/src/agent_bridge/`
  - `window.__agentBridge` in `src/lib/agent-bridge/`
  - the `bun run app` CLI (`scripts/app.ts`, `app-logs.ts`, `app-diff.ts`)

  The CLI covers screenshots in both themes, the UI tree, click, fill, key and logs. Add Taskdn-specific actions: open a view, select a task, run a command palette command, open the quick entry pane.
- [x] Port the `app-control` skill.
- [x] Styleguide as a second Vite entry (`styleguide.html`, `src/styleguide/`) replacing the in-app component reference view, so it never ships and each section can be screenshotted.
- [x] Release builds log at info level to the log file, rotating at 5 MB and keeping two old files. Today the release log is empty, which is why the 1am crash left no trace. Task 7 depends on this.
- [x] Document it all in a `tdn-desktop/docs/developer/agent-tooling.md`.

### Plan

Work happens on the `desktop-agent-bridge` branch. Paths are in `tdn-desktop/`.

**Port from Astro Editor, near-verbatim:**

- `src-tauri/src/agent_bridge/` (`mod.rs`, `snapshot.rs`): `tiny_http` on 127.0.0.1 (port 1422, else random), token in `agent-bridge.json` in the slot's app data folder, endpoints `/health`, `/eval`, `/snapshot` (WKWebView `takeSnapshot`), `/window`. New dependencies: `tiny_http`, `uuid`, and macOS-only `block2`, `objc2`, `objc2-foundation`, `objc2-app-kit`, `objc2-web-kit`.
- `src/lib/agent-bridge/`: `page.ts` (theme, idle, shot mode, `withFrames`, tree, click, fill, key), `ui-tree.ts`, `keys.ts`, `console.ts` (dev `console.*` forwarded to the log file), with their tests.
- `scripts/app.ts`, `app-logs.ts`, `app-diff.ts` with tests (`pixelmatch` and `pngjs` as dev dependencies). Shots go to `tdn-desktop/docs/tasks-todo/temporary/`, which gets gitignored.
- `app-control` skill in `tdn-desktop/.claude/skills/`.
- Styleguide: `styleguide.html` and `src/styleguide/`, one section per page (`?section=<id>`), overlays rendered open on their own pages, `bun run app styleguide` shoots them all.
- Logging: the log file on every platform (today it's macOS only), `KeepSome(2)` instead of `KeepOne`, `tao` and `wry` at info.

**Different here:**

- **Taskdn actions** in `src/lib/agent-bridge/api.ts`, built on the existing `commandContext` and stores:
  - `view <today|this-week|inbox|calendar|area or project title>` navigates
  - `task <title or id>` opens a task in the detail panel
  - `run <command-id>` / `run --list` runs command palette commands (static and the dynamic area and project ones)
  - `quick-entry` opens the quick entry pane
  - `type <text>` types into the focused input or the Milkdown editor
  - `state` reports the view, open task, sidebars, theme, dialogs, toasts and task counts
- **Quick pane window.** It's a separate webview (an NSPanel on macOS), so `/eval` and `/snapshot` take an optional window label, and the CLI's `tree`, `click`, `fill`, `key` and `shot` take `--window=quick-pane`. The quick pane installs the page API in dev builds.
- **Test vaults.** `reset` re-renders the checkout's `demo-vaults/demo` and refreshes the app. `vault <name|path>` switches the dev app to another rendered vault (`edge-cases`, a persona vault, `big`), and `vault` alone goes back to the demo.
- **UI tree.** It summarises the Milkdown editor (ProseMirror) instead of CodeMirror.
- **Styleguide replaces the Components view.** Its seven sections (tasks, projects, areas, layout, forms, display, overlays) move into `src/styleguide/`, split so each fits the dev window, with overlays on their own pages. The `dev-nav` selection type, the sidebar link and the deep-link and navigation-store handling for it go.
- **The release log isn't actually empty.** It has content since the last restart. The problem is `KeepOne`, which deletes the whole file each time it reaches 5 MB, and before phase 1 dev builds filled the installed app's log fast with debug scanning lines. So the log had most likely been wiped by the time anyone looked. `KeepSome(2)` keeps the last two full files with their dates. The panic hook stays in task 7.

**Order of commits:** bridge (Rust and page API, CLI basics: status, tree, shot, click, fill, key, eval, logs, diff); Taskdn actions and the quick pane; styleguide replacing the Components view; release logging; skill and docs.

**Checks:** `bun run check:all`; drive the running dev app through each command (Danny starts `tauri:dev`); shoot every styleguide section in both themes; confirm a release build's log settings by reading the config, since a release build isn't run here.

**Progress:** Done and committed on `desktop-agent-bridge`; `bun run check:all` passes. Every command was driven against the running dev app, including the quick pane, vault switching, `reload` restoring the view and task, and all 15 styleguide sections in both themes. The bridge and Taskdn actions went in as one commit, not two. The release log settings were checked by reading the config, not by running a release build. Found along the way, not fixed here: the sidebar's No Area group has a toggle button with no accessible label (`button [34] (expanded)` in `app tree`), a Base UI warning that a `TooltipTrigger` is passed as a `render` function, `AreaCard` isn't used anywhere in the app (only the styleguide), and the collapsed notes preview shows raw markdown (`**bold**`).

## Phase 3: The CLI, the rest of the repo and other products

- [x] **CLI agent safety.** The CLI checks, in order, `TASKDN_*_DIR` env vars, `.taskdn.json` in the *current directory only*, then `~/.taskdn.json`. An agent running `tdn` from a subfolder or worktree falls through to Danny's real vault, and `tdn` runs outside the sandbox. Set `TASKDN_TASKS_DIR`, `TASKDN_PROJECTS_DIR` and `TASKDN_AREAS_DIR` in the `env` block of the repo's `.claude/settings.json`, pointing at the rendered demo vault (`demo-vaults/demo`; Danny makes the edit). Check that the installed `tdn` and the dev CLI both resolve to the test vault from the repo root, from `tdn-cli/`, and from a worktree. Note that personal task management through Claude won't work in sessions in this repo, which is intended.
  Done on the `repo-agent-safety` branch. Settings `env` values are literal (no `~` or `$CLAUDE_PROJECT_DIR`), so the paths are absolute; on another machine they point nowhere and `tdn` shows an empty vault. The variables also beat a vault's own `.taskdn.json`, so `bun run vault tdn <vault> <args>` runs `tdn` on any other rendered vault. Both CLIs resolve to the demo vault from the repo root and `tdn-cli/`, inside and outside the sandbox, and the CLI's 685 TypeScript tests pass with the variables set. Noted for CLI 2.0: `tdn config` names the local `.taskdn.json` as the config file even when env vars override it.
- [x] **Repo skills.** Cross-product skills live in the root `.claude/skills/` (`deps-update` and `generate-persona-vault` are there already). Convert `tdn-desktop/.claude/commands/` (`/check`, `/init`) to skills and drop the template-era agents nobody uses.
  Done on `repo-agent-safety`. `app-control` and `codebase-hygiene` moved to the root, because skills in `tdn-desktop/.claude/skills/` didn't show up in sessions started at the repo root. `/check` and `/init` were deleted rather than converted (asking for a check works as well, and `/init` was the template's one-time setup), along with the three template agents and `tdn-desktop/.claude/settings.local.json`. The root `AGENTS.md` lists the repo's skills.
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
