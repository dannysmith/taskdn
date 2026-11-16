# Task 6: Tooling, deps and agent safety

Bring the desktop app's tooling up to Astro Editor's, update dependencies across products, and make sure an agent working on any product in this repo can never touch Danny's real vault or installed app. Several PRs, roughly one per phase.

Astro Editor is the reference throughout: `~/dev/astro-editor/`, especially `docs/developer/agent-tooling.md`, `package.json`, `scripts/` and `.claude/skills/` (`app-control`, `deps-update`, `codebase-hygiene`). `tdn-desktop` came from the same Tauri template, so most of it ports directly.

## Phase 1: Desktop dependencies, lint and format

- [ ] Port Astro Editor's `deps-update` skill and use it for this update, so the skill is tested on its first run.
- [ ] Bring the frontend up to Astro Editor's versions: TypeScript 7, Vite 8, Vitest 5, React and the rest.
- [ ] Replace ESLint and Prettier with Oxlint (type-aware, via tsgolint) and Oxfmt. Keep ast-grep. Move knip and jscpd into a `codebase-hygiene` skill, as in Astro Editor. Port the React Compiler check script if it applies.
- [ ] Rust dependencies, except `notify`: its upgrade belongs with the crash work in task 7.
- [ ] Clear the open Dependabot security alerts. As of 2026-11-15 they're all for `zip` 4.6.1 (one critical, fixed in 9.0.5), which comes only from `tauri-plugin-updater`. Update the plugin to a version on `zip` 9.0.5 or later, or pin `zip` if the plugin hasn't moved yet.
- [ ] Add `.github/dependabot.yml`. Without it, Dependabot's security updates treat the bun projects as npm and fail ("Set `package-ecosystem: "bun"` in your dependabot.yml"), so npm alerts such as `minimatch` in `tdn-cli` never get fix PRs. Declare `bun` for `tdn-cli`, `tdn-desktop` and `website`, `cargo` for both Rust workspaces, and `github-actions`. Decide whether to allow scheduled version-update PRs, or only security updates (`open-pull-requests-limit: 0`).
- [ ] Update `check:all`, the versions listed in `tdn-desktop/AGENTS.md`, and `docs/developer/static-analysis.md`.

### Phase 1 working notes

Run with the `deps-update` skill (ported to `.claude/skills/deps-update/`). **Branch:** `desktop-deps-tooling`. **Status:** decisions made; working through the plan.

**Research (2026-11-16):**

- **No previous dependency doc** for the desktop app. Astro Editor's (`~/dev/astro-editor/docs/tasks-done/*dependency-updates*`) cover nearly every jump below and are the guide.
- **Dependabot alerts:** `zip` 4.6.1 in `src-tauri/Cargo.lock` (#35 critical, #36 high, #37 moderate), only via `tauri-plugin-updater` 2.14.0. `cargo update` takes the updater to 2.14.1 and `zip` to 9.6.0, as in Astro Editor. Also #38 `minimatch` in `tdn-cli` (phase 4). No open Dependabot PRs.
- **JS majors:**
  - TypeScript 7, Vite 8, `@vitejs/plugin-react` 6, Vitest 5 and coverage 5, jsdom 31, jest-dom 7, `@types/node` 26.
  - lucide 1 (used in 59 files), react-resizable-panels 4 (only `components/ui/resizable.tsx`), i18next 27 and react-i18next 18, shadcn 4 (we import `shadcn/tailwind.css`), knip 6, jscpd 5, ast-grep 0.51.
  - `@dannysmith/datepicker` 0.1.4 → 0.1.6.
- **Rust:**
  - `cargo update` is all in range, except it would take `notify` 8.2.0 → 8.2.2.
  - Majors available: `gray_matter` 0.3 (frontmatter parsing), `dirs` 7, and the specta trio (pinned at rc.22, rc.21 and 0.0.9; Astro Editor is on rc.26; the latest are rc.28, rc.29 and 0.0.15).
  - `tauri-plugin-deep-link` is pinned at `=2.6.1` for plugins-workspace#3710, which closed on 2026-10-15; 2.6.3 is out.
- **Constraints:**
  - The `zod-validation-error` override came in with ESLint's React hooks plugin, so it can go with ESLint.
  - `eslint-plugin-react-hooks` `~7.0.1` goes with ESLint too.
  - i18n sets `fallbackLng: 'en'`, so i18next 27's default change doesn't affect us, but its stricter interpolation types may need code changes.
- **What Astro Editor learned:**
  - Do Oxlint and Oxfmt before TypeScript 7, since typescript-eslint is the only blocker. Reformat once, and add the commit to `.git-blame-ignore-revs`.
  - Vite 8 needs `@rolldown/plugin-babel` for the React Compiler. Pin `@babel/core` to 7, or bun installs Babel 8 as a peer.
  - jest-dom 7 needs `@testing-library/jest-dom/vitest` in the test setup.
  - Vite 8.3 warns about `__dirname` in configs; use `import.meta.dirname`.
  - Its `scripts/react-compiler-check.ts` fails `check:all` if the compiler silently skips a component. It applies here too: we use the compiler.

**Plan:**

1. [x] Security: `tauri-plugin-updater` 2.14.1 (Rust and JS), `zip` 9.6.0 (`9b683d3`).
2. [x] JS within ranges (`08c45da`): Milkdown 7.23, TanStack Query 5.107, Tailwind 4.3.5, zustand 5.1, Tauri JS plugins. Transitive majors (zod 4, brace-expansion 5) are only nested under the packages that need them; no nested ProseMirror or Milkdown copies.
3. [x] Rust (`223ad6b`): `cargo update` with `notify` and `notify-types` held; deep-link unpinned (2.6.3); `dirs` 7; specta rc.28, tauri-specta rc.29, specta-typescript 0.0.15. The new tauri-specta throws by default, so the builder sets `ErrorHandlingMode::Result` to keep `{ status, data | error }`, plus `disable_serde_phases` and `dangerously_cast_bigints_to_number` as in Astro Editor. Knock-ons: `AppPreferences` and `CliConfig` fields are optional in TypeScript now (struct-level `serde(default)`), `Result` is defined in `tauri-bindings.ts`, and `JsonValue` is specta's stricter `Value` (crash info saves missing fields as null).
4. [ ] Oxlint and Oxfmt replace ESLint and Prettier: one reformat commit, then TypeScript 7.
5. [ ] Vite 8, plugin-react 6, Vitest 5, jsdom, jest-dom, `@types/node`.
6. [ ] App majors one at a time: lucide, react-resizable-panels, i18next and react-i18next, shadcn, datepicker.
7. [ ] `codebase-hygiene` skill (knip 6, jscpd 5), `compiler:check`, ast-grep 0.51.
8. [ ] `.github/dependabot.yml`, then docs: `check:all`, `tdn-desktop/AGENTS.md` versions, `static-analysis.md`.
9. [ ] Finish: production build, audit, smoke test, PR.

**Holds:**

| Package       | Current | Latest | Why held                                                      |
| ------------- | ------- | ------ | ------------------------------------------------------------- |
| `notify`      | 8.2.0   | 8.2.2  | File watching changes go with the crash work (task 7)         |
| `gray_matter` | 0.2.9   | 0.3.2  | Parses every task file; task 13 replaces it with `tdn-core`   |

**Decisions (2026-11-16):**

- specta: the latest matched set (tauri-specta rc.29 and what it needs), diffing the bindings; Astro Editor's rc.26 set is the fallback.
- `dirs` 7: yes. `gray_matter` 0.3: held, since task 13 replaces the desktop's vault code with `tdn-core`.
- `@dannysmith/datepicker` 0.1.6: yes, checked in the smoke test.
- Dependabot: security updates only for bun and cargo (`open-pull-requests-limit: 0`), GitHub Actions monthly.

**Issues:**

- `cargo clippy --all-targets` shows 7 warnings in existing test code (`commands/quick_pane.rs`, `vault/manager.rs`). `check:all` doesn't lint tests; fix them when it moves to `--all-targets` like Astro Editor (step 8).

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
