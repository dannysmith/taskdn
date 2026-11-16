# Agent Tooling

Dev builds are set up so that coding agents (and you) can run and test them without touching the installed app or a real vault, and can see and drive the running app from the terminal: screenshots, a UI outline, clicks and typing, a component styleguide and searchable logs. None of it ships in release builds. For day-to-day usage, see the `app-control` skill (`.claude/skills/app-control/SKILL.md` at the repo root) or run `bun run app help`.

## Dev Identity

`bun run tauri:dev` runs `scripts/tauri-dev.sh`, which applies `src-tauri/tauri.dev.conf.json` and then an overlay for the checkout's dev slot (below). In the main checkout that gives dev builds their own identifier (`is.danny.taskdn-desktop.dev`) and product name ("Taskdn Dev"), so they get their own:

- app data and preferences: `~/Library/Application Support/is.danny.taskdn-desktop.dev/`
- logs: `~/Library/Logs/is.danny.taskdn-desktop.dev/`
- window state, recovery files and single-instance lock

WebKit storage (localStorage) is the exception: unbundled dev builds keep it in `~/Library/WebKit/taskdn-desktop/`, named after the binary, which is still apart from the installed app's `is.danny.taskdn-desktop`.

The installed app and the dev build can run side by side without touching each other's state. Keep window settings out of the overlay; they live in the platform configs.

A debug build started any other way (plain `bun run tauri dev`, `tauri build --debug`) would have the installed app's identifier, so it exits at startup and says to use `bun run tauri:dev` (`src-tauri/src/dev_identity.rs`).

Debug builds also:

- open the checkout's demo vault (`demo-vaults/demo` at the repo root) until another vault is saved in preferences. `tauri:dev` renders it with `bun run vault render demo` if it's missing, and never re-renders an existing one, so test state survives restarts. Re-render it yourself for a clean copy. "Read from CLI" in Preferences reads the demo vault's `.taskdn.json`, never `~/.taskdn.json`.
- default to `CommandOrControl+Alt+Shift+.` for the quick entry pane, so both apps' shortcuts work. Only the main checkout's dev app registers it (see [Quick Panes](./quick-panes.md)).
- skip the automatic update check; the menu item still works for testing the dialog.
- show the slot and branch in the window title, e.g. "Taskdn (Dev · main)", both in the app's title bar and in Mission Control and the Window menu. The branch is the one checked out when `tauri:dev` started.

Deep links (`taskdn://`) keep going to the installed app: on macOS the scheme is registered by the bundled app, and unbundled dev builds don't register it.

### Worktrees and Dev Slots

Each git worktree of the repo can run its own dev app alongside the others. `scripts/dev-slot.ts` works out which slot a checkout owns, so `tauri:dev` needs no flags or setup beyond `bun run setup`.

| Slot | Checkout   | Identifier                       | Product name | Vite port  |
| ---- | ---------- | -------------------------------- | ------------ | ---------- |
| 0    | main       | `is.danny.taskdn-desktop.dev`    | Taskdn Dev   | 1520       |
| 1–4  | a worktree | `is.danny.taskdn-desktop.dev<n>` | Taskdn Dev n | 1520 + 10n |

- **The identifier** gives each slot its own app data, logs and single-instance lock. Two dev apps with the same identifier would share preferences, and the second would hand over to the first and quit. All slots share one WebKit folder, but storage in it is keyed by origin, so the port separates it.
- **The ports** start at 1520 rather than Tauri's usual 1420 (and the agent bridge prefers 1522), so the dev app runs alongside other Tauri dev apps on this machine, such as Astro Editor's.
- **The demo vault** is the worktree's own `demo-vaults/demo`, so each dev app edits its own copy.
- **The main checkout** is the one whose `git rev-parse --git-dir` is the shared `--git-common-dir`. It's always slot 0 and needs no file.
- **A worktree** gets its slot from `bun run setup` in `tdn-desktop/` (`scripts/setup.ts`), which takes the lowest slot no other worktree has and whose Vite port is free (a removed worktree's dev app may still be running), and writes it to `tdn-desktop/dev-slot.local` (gitignored by `*.local`). Removing the worktree frees it. A slot file that doesn't hold 1–4 counts as no slot. `tauri:dev` in a worktree without one stops and says to run setup, rather than clash with slot 0.
- **Setup** also installs dependencies, renders the demo vault if it's missing, empties the slot's app data when it claims it (before writing the slot file, so an interrupted run does it again), and clones the main checkout's `tdn-desktop/src-tauri/target/` with `cp -cR` (APFS copy-on-write; a full copy on Linux). Cargo doesn't hash absolute paths, so the first build in a new worktree recompiles only the app crate. Don't share one `CARGO_TARGET_DIR` instead: builds would queue on Cargo's lock and replace each other's running binary.
- **`tauri:dev`** passes the slot's identifier, product name and `build.devUrl` as a second `--config`, and the port to Vite in `TASKDN_DEV_PORT`. The window title arrives in `TASKDN_DEV_TITLE`, which Rust reads for the native title and Vite exposes to the frontend (`envPrefix` in `vite.config.ts`).

Worktrees go next to the main checkout, not inside it, or the main checkout's Vite watcher and Vitest would pick up their files. `.config/wt.toml` at the repo root makes [worktrunk](https://worktrunk.dev) run setup when it creates one: `wt switch -c <branch> -x claude` makes `../taskdn.<branch>`, sets it up and starts Claude there. Claude's own `claude -w` puts worktrees in `.claude/worktrees/`, so keep it for throwaway subagent work. Each worktree's dev app is started by hand with `bun run tauri:dev` in a terminal of its own.

The sandbox in the repo's `.claude/settings.json` lists each slot's app data folder (`is.danny.taskdn-desktop.dev` to `.dev4`) so agents in any slot can read and write their app's data. They're listed one by one because a `*` pattern there matches the folder but not the files inside it. Keep the list in step with `MAX_SLOT`.

## Agent Bridge

Three parts, all debug-only:

- **`src-tauri/src/agent_bridge/`**: an HTTP server on `127.0.0.1` (port 1522, or a random one if that's taken, as it is for every slot after the first) with endpoints for eval, snapshot, window (size, appearance and navigation) and health. On startup it writes `{ port, token, pid }` to `agent-bridge.json` in the app data folder, and removes it on exit. Requests must send the token in `x-agent-bridge-token`, so a web page open in a browser can't call it. Eval, snapshot and window act on the main window unless the request names another (`"window": "quick-pane"`).
  - **Eval:** wraps the snippet in an async function. `eval_with_callback` can't await, so the result is stored on `window.__agentBridgeResults` and polled for.
  - **Snapshots:** use `WKWebView.takeSnapshot`. It needs no Screen Recording permission, doesn't raise or focus the window, and works while the window is behind others. It captures the webview only, so native menus, dialogs, the vibrancy and the quick pane's transparent edges are missing. macOS only; elsewhere the endpoint returns an error.
- **`src/lib/agent-bridge/`**: the `window.__agentBridge` API the CLI calls through eval:
  - `page.ts` works on any page: theme, `idle`, shot mode (transitions and caret off while screenshotting), `tree` (built by `ui-tree.ts`, which summarises the Milkdown editor rather than walking it), `click`, `fill`, `type` and `key`. The quick pane (`src/quick-pane-main.tsx`) and the styleguide install it as is.
  - `api.ts` adds Taskdn's actions for the main window: `state`, `view`, `task`, `run` and `commands`, `quickEntry`, `refreshVault` and `openVault`. They go through the same `commandContext`, stores and services the UI uses.
  - `AgentBridge` (in `components/agent-bridge/`) installs it, and `MainWindow` renders that only when `import.meta.env.DEV`. Dev builds also copy `console.*` into the log file (`console.ts`), in every window.
- **`scripts/app.ts`**: the `bun run app` CLI. `scripts/app-logs.ts` reads the logs, and `scripts/app-diff.ts` compares screenshots (pixelmatch). Shots go to `tdn-desktop/docs/tasks-todo/temporary/`, which is gitignored.

To add an app action, add a method to `createAgentApi` (or `createPageApi` if it's useful on any page) and a CLI command that calls it with `callApi()` in `scripts/app.ts`. Prefer reusing app code (command palette commands, store actions, services) over simulating clicks.

**Hidden windows:** when the dev window is behind other windows, WebKit stops `requestAnimationFrame`, throttles timers, and doesn't fire media-query changes or start transitions until it next renders. The bridge works around it:

- `idle()` falls back to timeouts and finishes animations, and `shot` sets the page theme directly instead of relying on `prefers-color-scheme`.
- Base UI waits for an animation frame before opening a popup from a click, moving focus into it and unmounting it after it closes, so the CLI runs every API call inside `withFrames()`: during the call, frame requests also fire from a short timeout. Outside bridge calls nothing changes.
- `tree`, `click` and `fill` wait for idle first, because an overlay that has just opened sits at opacity 0 until its animation is finished.

## Styleguide

`styleguide.html` and `src/styleguide/` make up a second Vite entry. Vite only builds `index.html` and `quick-pane.html`, so it never ships (knip is told about it in `knip.json`). It shows the app's components in each state, with fake data. One section per page (`?section=<id>`) fits the dev window at its minimum size, so each can be screenshotted whole; overlays are rendered open on their own pages. `bun run app styleguide` shoots every section in both themes. The styleguide runs inside the dev app's webview, so Tauri calls work; it also opens in a browser at `localhost:1520/styleguide.html` (or the slot's port in a worktree).

When you add or change a shared component, add it to a section in `src/styleguide/sections.tsx`.

To check a change, shoot the sections before and after and compare them with `bun run app diff <before-dir> <after-dir>`. It matches shots by name (ignoring the timestamp), reports which are identical, and writes a diff image boxing what changed for the rest. Repeat snapshots of an unchanged page are pixel-identical, so it counts any changed pixel.

## Logs

Release logging (levels, rotation, where the installed app's log lives) is in [Logging](./logging.md). Dev logs go to `~/Library/Logs/is.danny.taskdn-desktop.dev/` (`.dev<n>` for a worktree's slot):

- **`Taskdn Dev.log`:** Rust `log` output and webview logging, including `console.*` from every window, marked `[console]`. It rotates like the release log.
- **`tauri-dev.log`:** the `tauri:dev` terminal output (Vite and cargo), replaced on each run

`bun run app logs` searches both, and `bun run app logs --crashes` reads macOS crash reports. See the skill for the flags.
