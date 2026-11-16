---
name: deps-update
description: Run an interactive dependency update session for one or more products in the Taskdn monorepo (desktop app JS and Rust, CLI, website, GitHub Actions), tracked in a task doc so it can resume across sessions. Use when the user asks to update dependencies, clear Dependabot alerts or PRs, or revisit held packages.
---

# Dependency Update Session

The monorepo's products each have their own dependencies and are updated separately (rule 4 in `AGENTS.md`: no product depends on another):

| Product        | Dependencies                   | Checks                                        |
| -------------- | ------------------------------ | --------------------------------------------- |
| `tdn-desktop/` | bun, Cargo (`src-tauri/`)      | `bun run check:all`                           |
| `tdn-cli/`     | bun, Cargo (`crates/core/`)    | `bun run check` and `bun run test`            |
| `website/`     | bun                            | `bun run check` and `bun run build`           |
| `.github/`     | GitHub Actions                 | CI on the PR                                  |

Ask which products the session covers if the user hasn't said. The Obsidian plugin lives in its own repo (`dannysmith/obsidian-taskdn`) and gets its own session there. Use `bun` everywhere.

## State lives in a task doc

The session runs across several contexts, so all state goes in a task doc: the existing one if this update is part of a task, otherwise `docs/tasks-todo/task-x-dependency-updates-YYYY-MM.md`.

- If one exists, read it and resume where it left off.
- Otherwise add a section after research: status and branch, research findings, a phase checklist, a holds table (package, current, latest, why held), a decisions log and an issues log.
- Update it at every checkpoint, so the user can clear context and run this skill again.

Work on a branch; confirm the name with the user if they haven't given one.

## Research first

- **Last time:** read the most recent `docs/tasks-done/*dependency*` doc for this product, if any. Its holds table and follow-ups are the starting point: re-check each hold and say whether it still applies.
- **Dependabot:** list open alerts (`gh api repos/dannysmith/taskdn/dependabot/alerts --jq '...'`) and PRs. Note which product and package each comes from, and whether it's a direct dependency. Dependabot PRs are closed as superseded after merge; Actions bumps get applied to the workflows.
- **Outdated packages:** `bun outdated` in each product, and `cargo update --dry-run` in each Rust workspace (or `cargo outdated` if installed).
- **Major bumps:** read the changelog or migration guide for each, check whether it affects our usage by reading our code, and use Context7 before web search.
- **Reference:** Astro Editor (`~/dev/astro-editor/`) shares the desktop app's stack and is usually a step ahead. Its `package.json`, `docs/tasks-done/*dependency-updates*` docs and holds are a good guide to what works together.
- **Constraints:** read the product's `AGENTS.md` and developer docs. Know why each override, exact pin and hold exists before touching it.

**Checkpoint:** present the findings and the decisions needed. Ask before proceeding.

## Phases

One commit (or a small group) per phase. Run the product's checks after each.

1. **Security fixes:** anything with an open alert, or broken for users, goes first, so it can ship in a patch release if the rest drags.
2. **JS:** minor and patch updates within ranges, then majors one at a time.
3. **Rust:** `cargo update`, then major bumps. Keep every `@tauri-apps/*` JS package on the same major.minor as its Rust crate.
4. **Tooling:** linters, formatters, test runners and build tools, if they're changing.
5. **CI and scripts:** apply Actions bumps, and check that `scripts/` and the workflows still work with the new tools.

## Known hazards

- **Peer auto-installs:** bun installs peers automatically and picks the newest version in the peer range, so a minor bump can silently pull in a major (Babel 8 nearly arrived this way under the React Compiler in Astro Editor). Scan the update output for major jumps in packages that aren't direct dependencies.
- **Duplicate editor packages (desktop):** Milkdown wraps ProseMirror, and two copies of a `prosemirror-*` or `@milkdown/*` package break the editor in confusing ways. After every JS update, check `bun.lock` for nested copies and regenerate it if there are any.
- **tauri-specta (desktop):** debug builds regenerate `src/lib/bindings.ts`. Diff it after any specta or Rust model change.
- **NAPI bindings (CLI):** Rust changes in `crates/core/` need `bun run build` before the TypeScript sees them.
- **Release pipelines:** changes to release workflows or tauri-action can't be fully tested by PR CI, since releases run on tags. Plan how to verify them, or split them into their own task.
- **`@dannysmith/*` packages** are Danny's own; ask before changing their versions.

## Finish

- The product's checks, then a production build. For the desktop app: `bun run tauri build --bundles app --no-sign --config '{"bundle":{"createUpdaterArtifacts":false}}'`. Look for new warnings.
- Run a security audit (`bun audit`, `cargo audit` if installed) and note anything fixable in the task doc.
- Remove comments and docs about constraints that no longer apply.
- Ask the user for a smoke test, suggesting specific checks for whatever changed (Milkdown → editing task bodies; updater → Check for Updates; global shortcut plugin → quick entry; and so on).
- Push and open the PR when the user says to. Merge with a rebase merge, not a squash, so phases stay bisectable.
- After merge: close superseded Dependabot PRs, check the alerts are gone, and update or complete the task doc.
