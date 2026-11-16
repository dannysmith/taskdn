---
name: codebase-hygiene
description: Find unused code and dependencies (knip) and duplicated code (jscpd) in the desktop app, then review the findings with the user and clean up what they approve. Use when the user asks to clean up dead code, unused dependencies or exports, or to review duplication.
---

# Codebase Hygiene

Two tools, run from `tdn-desktop/`, together or separately depending on the request:

- **knip** (`bun run knip`): unused files, dependencies and exports. Config in `knip.json`.
- **jscpd** (`bun run jscpd`): duplicated code in `src/` and `src-tauri/src/`. Config in `.jscpd.json`. It exits non-zero whenever it finds any duplication (the threshold is 0), and writes `jscpd-report/`, which is gitignored; delete it afterwards.

Both produce false positives. Treat their output as leads to investigate, not a list of things to delete. **Nothing is removed or refactored without the user's approval**, except dependencies with zero usage anywhere.

## knip: what not to remove

- **Code reached from Rust:** listeners for Tauri events (`listen(...)` in `src/hooks/use-main-window-event-listeners.ts`, `src/services/vault/init.ts` and the quick pane) and anything named in `src-tauri/` `emit(...)` calls, such as the vault-changed event. Grep `src-tauri/src` for the name before calling something unused.
- **Generated bindings:** `src/lib/bindings.ts` is written by tauri-specta. Unused commands or types there mean the Rust command is unused; remove it on the Rust side, and the bindings regenerate.
- **`@tauri-apps/*` packages:** each JS plugin pairs with a Rust crate. Remove a plugin from both sides or neither, and check `src-tauri/capabilities/`.
- **Barrel files** (`index.ts`): they export their directory's public API on purpose, which is why knip ignores them.
- **`src/components/ui/`:** shadcn components, ignored by knip, so dependencies only they use (like `next-themes` in `sonner.tsx`) show as unused. Ask the user before removing a component or its dependency; they're cheap to re-add through the shadcn CLI.

If knip reports live code as unused, the config is wrong. Fix `knip.json` before trusting anything else it says.

## jscpd: judging duplication

Duplication is only worth removing when one copy changing without the other would be a bug.

- **Usually extract:** business logic or data transformation over ~15 lines, anything in 3+ places, and duplicated logic in `src/lib/`, `src/services/` or Rust command handlers.
- **Usually keep:** short patterns, React component boilerplate, test setup, Rust error-handling idioms, deliberately parallel code (the per-view `use-*-order` hooks, the kanban boards), and type definitions kept separate for decoupling.

Put extracted code where `docs/developer/architecture-guide.md` says: pure logic in `src/lib/`, hooks in `src/hooks/`, shared Rust helpers next to their callers.

## Process

1. Run the tool(s) and read the surrounding code for every finding. Don't judge from the report alone.
2. Present the findings grouped by confidence: what you'd remove or extract and why, what's probably intentional, and what you can't tell.
3. Make only the changes the user approves. For duplication they decide to keep, add a short comment explaining why, if the reason isn't obvious.
4. Run `bun run check:all`.
