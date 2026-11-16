# Task 6: Tooling, deps and agent safety

Bring the desktop app's tooling up to Astro Editor's, update dependencies across products, and make sure an agent working on any product in this repo can never touch Danny's real vault or installed app. Several PRs, roughly one per phase.

Astro Editor is the reference throughout: `~/dev/astro-editor/`, especially `docs/developer/agent-tooling.md`, `package.json`, `scripts/` and `.claude/skills/` (`app-control`, `deps-update`, `codebase-hygiene`). `tdn-desktop` came from the same Tauri template, so most of it ports directly.

## Phase 1: Desktop dependencies, lint and format

- [x] Port Astro Editor's `deps-update` skill and use it for this update, so the skill is tested on its first run.
- [x] Bring the frontend up to Astro Editor's versions: TypeScript 7, Vite 8, Vitest 5, React and the rest.
- [x] Replace ESLint and Prettier with Oxlint (type-aware, via tsgolint) and Oxfmt. Keep ast-grep. Move knip and jscpd into a `codebase-hygiene` skill, as in Astro Editor. Port the React Compiler check script if it applies.
- [x] Rust dependencies, except `notify`: its upgrade belongs with the crash work in task 7.
- [ ] Clear the open Dependabot security alerts. As of 2026-11-15 they're all for `zip` 4.6.1 (one critical, fixed in 9.0.5), which comes only from `tauri-plugin-updater`. Update the plugin to a version on `zip` 9.0.5 or later, or pin `zip` if the plugin hasn't moved yet.
- [x] Add `.github/dependabot.yml`. Without it, Dependabot's security updates treat the bun projects as npm and fail ("Set `package-ecosystem: "bun"` in your dependabot.yml"), so npm alerts such as `minimatch` in `tdn-cli` never get fix PRs. Declare `bun` for `tdn-cli`, `tdn-desktop` and `website`, `cargo` for both Rust workspaces, and `github-actions`. Decide whether to allow scheduled version-update PRs, or only security updates (`open-pull-requests-limit: 0`).
- [x] Update `check:all`, the versions listed in `tdn-desktop/AGENTS.md`, and `docs/developer/static-analysis.md`.

### Phase 1 working notes

Run with the `deps-update` skill (ported to `.claude/skills/deps-update/`). **Branch:** `desktop-deps-tooling`. **Status:** done and smoke-tested; PR open.

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
4. [x] Oxlint, Oxfmt and TypeScript 7:
   - `52b0966`: Oxlint's React Compiler rules caught 13 sites ESLint missed. Fixed all of them (Danny's call): a `useToday()` hook for `new Date()` during render (TodayView also used the UTC date; kanban overdue now matches `isOverdue`), and render-time state adjustment, a ref or `useSyncExternalStore` for effects that only set state.
   - `c9407fc`: Oxlint via `@oxlint/migrate`, type-aware, native compiler rules instead of `eslint-plugin-react-compiler`, `oxlint-disable` comments. Dropped the `zod-validation-error` override and tsconfig `baseUrl`.
   - `2b3051c`: Oxfmt with the Prettier settings; TOML and Markdown excluded. 7 files reformatted, too few for `.git-blame-ignore-revs`.
   - `6cf97b5`: TypeScript 7. Test helpers reference Node's types themselves; tests use `globalThis` and `import.meta.dirname`.
5. [x] `90e1264`: Vite 8, plugin-react 6 (compiler via `@rolldown/plugin-babel`, `@babel/core` pinned to 7), Vitest 5 (webstorage workaround removed), jsdom 31, jest-dom 7 (`/vitest` import), `@types/node` 26.
6. [x] App majors, one commit each: lucide 1.73 (`e2fc1dc`, every icon still exists); react-resizable-panels 4 (`2ddc84b`: wrapper on Group/Panel/Separator, sizes now explicit percentages since v4 reads numbers as pixels, ResizeObserver stub in tests); i18next 27 and react-i18next 18 (`95b9364`, no changes needed); shadcn 4.23 (`f02beb7`, `tailwind.css` only gained opt-in utilities); datepicker 0.1.6 (`b0f0dcd`, adds an `autoFocus` prop).
7. [x] ast-grep 0.51 (`282b8bc`); knip 6 and jscpd 5 with a `codebase-hygiene` skill in `tdn-desktop/.claude/skills/` replacing `/cleanup` and `cleanup-analyzer` (`be76627`); `compiler:check` in `check:all` (`527131a`), which found 4 components the compiler skipped for try/catch, now fixed.
8. [x] `.github/dependabot.yml` (`9d95052`); clippy over all targets, fixing 7 test warnings (`eb16c84`); desktop docs: `AGENTS.md` commands and versions, `static-analysis.md`, the docs index and the ast-grep guide (`78d7c54`).
9. [ ] Finish:
   - [x] Production build: `Taskdn Desktop.app` 8.34 MiB, no new warnings (the >600 kB `theme` chunk note was already there on `main`: 693 kB then, 669 kB now). Frontend `dist/` 2,176 KB vs 2,148 KB on `main` (+1.3%, mostly react-resizable-panels 4).
   - [x] Audit: `bun audit` finds 3: `deepmerge` and `minimatch` via the `shadcn` CLI's dependencies (not bundled), and `katex` 0.16 via Milkdown Crepe (low; needs Crepe to move to KaTeX 0.18+). `cargo audit`: no vulnerabilities, 7 warnings for unmaintained or unsound crates deep in Tauri's Linux dependencies.
   - [x] Smoke test (Danny, 2026-11-16), in `bun run tauri:dev` with the rendered demo vault. It found one regression: hiding a sidebar left its width empty, because MainWindow hid panels with CSS, which v4's explicit panel sizes don't reflow. Fixed in `97e4e91` by collapsing the panels through their refs, as Astro Editor does. Everything below then passed:
     - Today and This Week views list the right tasks; kanban marks due-today tasks as due, not overdue (`useToday`)
     - Sidebars open at about 20% width, resize, and hide and show (react-resizable-panels 4)
     - Rename a task inline in the list, a card and a heading; Escape cancels (title draft sync)
     - New task from a view starts in edit mode (TaskList auto-edit)
     - Quick entry: global shortcut opens it; project plus a date promotes inbox to ready; a popover opened by keyboard returns focus when closed; the body section animates open and closed; AI parsing if available
     - Task detail panel: a shortcut that opens a field opens its popover
     - Preferences: change language; change vault folders (reinitialises); "Use Demo Vault"; change the quick entry shortcut
     - Date pickers (datepicker 0.1.6), Milkdown body editing, icons (lucide 1), Check for Updates (updater 2.14.1), a notification
   - [ ] PR (when Danny says), rebase merge. After merge: check the `zip` alerts are closed.

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

- knip findings left for a `codebase-hygiene` session with Danny: 2 unused dependencies (`@tanstack/react-query-devtools`; `next-themes`, used only by the unused `ui/sonner.tsx`), 11 unused exports, 7 unused exported types.
- `sgconfig.yml` points at a `.ast-grep/test` folder that doesn't exist, so `ast-grep test` fails. Unrelated to the upgrade.
- `.vscode/` is gitignored and the sandbox can't write it, so Danny's local `extensions.json` still recommends Prettier and `settings.json` has no Oxc formatter. Astro Editor's versions are the model.
- Vite 8 build: one chunk over the 600 kB warning (`theme`, 669 kB). Compare with a Vite 7 build in the finish step.
- Fixed (`9325f02`): `TaskCard` saved picked dates with `toISOString().split('T')[0]`, which gave the day before in BST (local midnight is 23:00 UTC). Now `format(date, 'yyyy-MM-dd')`, like the other pickers.
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
