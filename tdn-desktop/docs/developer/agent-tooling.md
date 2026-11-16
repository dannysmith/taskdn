# Agent Tooling

Dev builds are set up so that coding agents (and you) can run and test them without touching the installed app or a real vault. None of this ships in release builds.

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
| 0    | main       | `is.danny.taskdn-desktop.dev`    | Taskdn Dev   | 1420       |
| 1–4  | a worktree | `is.danny.taskdn-desktop.dev<n>` | Taskdn Dev n | 1420 + 10n |

- **The identifier** gives each slot its own app data, logs and single-instance lock. Two dev apps with the same identifier would share preferences, and the second would hand over to the first and quit. All slots share one WebKit folder, but storage in it is keyed by origin, so the port separates it.
- **The demo vault** is the worktree's own `demo-vaults/demo`, so each dev app edits its own copy.
- **The main checkout** is the one whose `git rev-parse --git-dir` is the shared `--git-common-dir`. It's always slot 0 and needs no file.
- **A worktree** gets its slot from `bun run setup` in `tdn-desktop/` (`scripts/setup.ts`), which takes the lowest slot no other worktree has and whose Vite port is free (a removed worktree's dev app may still be running), and writes it to `tdn-desktop/dev-slot.local` (gitignored by `*.local`). Removing the worktree frees it. A slot file that doesn't hold 1–4 counts as no slot. `tauri:dev` in a worktree without one stops and says to run setup, rather than clash with slot 0.
- **Setup** also installs dependencies, renders the demo vault if it's missing, empties the slot's app data when it claims it (before writing the slot file, so an interrupted run does it again), and clones the main checkout's `tdn-desktop/src-tauri/target/` with `cp -cR` (APFS copy-on-write). Cargo doesn't hash absolute paths, so the first build in a new worktree recompiles only the app crate. Don't share one `CARGO_TARGET_DIR` instead: builds would queue on Cargo's lock and replace each other's running binary.
- **`tauri:dev`** passes the slot's identifier, product name and `build.devUrl` as a second `--config`, and the port to Vite in `TASKDN_DEV_PORT`. The window title arrives in `TASKDN_DEV_TITLE`, which Rust reads for the native title and Vite exposes to the frontend (`envPrefix` in `vite.config.ts`).

Worktrees go next to the main checkout, not inside it, or the main checkout's Vite watcher and Vitest would pick up their files. `.config/wt.toml` at the repo root makes [worktrunk](https://worktrunk.dev) run setup when it creates one: `wt switch -c <branch> -x claude` makes `../taskdn.<branch>`, sets it up and starts Claude there. Claude's own `claude -w` puts worktrees in `.claude/worktrees/`, so keep it for throwaway subagent work. Each worktree's dev app is started by hand with `bun run tauri:dev` in a terminal of its own.

The sandbox in the repo's `.claude/settings.json` lists each slot's app data folder (`is.danny.taskdn-desktop.dev` to `.dev4`) so agents in any slot can read and write their app's data. They're listed one by one because a `*` pattern there matches the folder but not the files inside it. Keep the list in step with `MAX_SLOT`.

### Logs

Dev logs go to `~/Library/Logs/is.danny.taskdn-desktop.dev/` (`.dev<n>` for a worktree's slot):

- **`Taskdn Dev.log`:** Rust `log` output and webview logging
- **`tauri-dev.log`:** the `tauri:dev` terminal output (Vite and cargo), replaced on each run
