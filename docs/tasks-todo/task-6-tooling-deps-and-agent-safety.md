# Task 6: Tooling, deps and agent safety

Bring the desktop app's tooling up to Astro Editor's, update dependencies across products, and make sure an agent working on any product in this repo can never touch Danny's real vault or installed app. Several PRs, roughly one per phase.

Astro Editor is the reference throughout: `~/dev/astro-editor/`, especially `docs/developer/agent-tooling.md`, `package.json`, `scripts/` and `.claude/skills/` (`app-control`, `deps-update`, `codebase-hygiene`). `tdn-desktop` came from the same Tauri template, so most of it ports directly.

## Phase 1: Desktop dependencies, lint and format

- [ ] Port Astro Editor's `deps-update` skill and use it for this update, so the skill is tested on its first run.
- [ ] Bring the frontend up to Astro Editor's versions: TypeScript 7, Vite 8, Vitest 5, React and the rest.
- [ ] Replace ESLint and Prettier with Oxlint (type-aware, via tsgolint) and Oxfmt. Keep ast-grep. Move knip and jscpd into a `codebase-hygiene` skill, as in Astro Editor. Port the React Compiler check script if it applies.
- [ ] Rust dependencies, except `notify`: its upgrade belongs with the crash work in task 7.
- [ ] Update `check:all`, the versions listed in `tdn-desktop/AGENTS.md`, and `docs/developer/static-analysis.md`.

## Phase 2: Desktop dev identity

Today a dev build uses the installed app's identifier (`is.danny.taskdn-desktop`). It reads Danny's real preferences and vault path, shares the single-instance lock and fights the installed app for the global shortcut.

- [ ] `src-tauri/tauri.dev.conf.json` with identifier `is.danny.taskdn-desktop.dev` and product name "Taskdn Dev", applied by a `scripts/tauri-dev.sh` behind `bun run tauri:dev`.
- [ ] Worktree dev slots (`scripts/dev-slot.ts`, `scripts/setup.ts`): each worktree gets its own identifier, Vite port and app data.
- [ ] Dev builds:
  - use a different global shortcut
  - skip the update check
  - show the slot and branch in the window title
  - start with the rendered demo test vault (task 5) as their vault
- [ ] List each slot's app data folder in `.claude/settings.json`'s sandbox config so agents can reach the bridge file (Danny edits this file; agents can't write it).

## Phase 3: Agent bridge, styleguide and logs

- [ ] Agent bridge, debug builds only:
  - a token-protected HTTP server in `src-tauri/src/agent_bridge/`
  - `window.__agentBridge` in `src/lib/agent-bridge/`
  - the `bun run app` CLI (`scripts/app.ts`, `app-logs.ts`, `app-diff.ts`)

  The CLI covers screenshots in both themes, the UI tree, click, fill, key and logs. Add Taskdn-specific actions: open a view, select a task, run a command palette command, open the quick entry pane.
- [ ] Port the `app-control` skill.
- [ ] Styleguide as a second Vite entry (`styleguide.html`, `src/styleguide/`) replacing the in-app component reference view, so it never ships and each section can be screenshotted.
- [ ] Release builds log at info level to the log file, rotating at 5 MB and keeping two old files. Today the release log is empty, which is why the 1am crash left no trace. Task 7 depends on this.
- [ ] Document it all in a `tdn-desktop/docs/developer/agent-tooling.md`.

## Phase 4: The CLI, the rest of the repo and other products

- [ ] **CLI agent safety.** The CLI checks, in order, `TASKDN_*_DIR` env vars, `.taskdn.json` in the *current directory only*, then `~/.taskdn.json`. An agent running `tdn` from a subfolder or worktree falls through to Danny's real vault, and `tdn` runs outside the sandbox. Set `TASKDN_TASKS_DIR`, `TASKDN_PROJECTS_DIR` and `TASKDN_AREAS_DIR` in the `env` block of the repo's `.claude/settings.json`, pointing at the rendered test vault's fixed path from task 5 (Danny makes the edit). Check that the installed `tdn` and the dev CLI both resolve to the test vault from the repo root, from `tdn-cli/`, and from a worktree. Note that personal task management through Claude won't work in sessions in this repo, which is intended.
- [ ] **Repo skills.** Put cross-product skills in a root `.claude/skills/`. Convert `tdn-desktop/.claude/commands/` to skills and drop the template-era agents nobody uses.
- [ ] **Website.** Dependency updates. Keep ESLint and Prettier (Astro Editor's website did too).
- [ ] **CLI.** Security-relevant dependency updates only; its tooling is redone in the 2.0 rewrite.
- [ ] **Obsidian plugin** (`dannysmith/obsidian-taskdn`, separate repo, its own session and PR there): dependency updates. Keep ESLint, since `eslint-plugin-obsidianmd` mirrors Obsidian's review bot.

## Done when

- `bun run check:all` passes in `tdn-desktop` with the new tooling.
- A dev build runs alongside the installed app without sharing anything.
- An agent can screenshot and drive the dev app with `bun run app`.
- The release log has content.
- `tdn` run by an agent anywhere in the repo hits the test vault.
