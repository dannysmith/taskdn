# React Codebase Cleanup

Comprehensive cleanup of the React codebase based on full code review (2026-01-10).

## Blocking Issues (Fix First)

### ESLint Errors - React Compiler Conflicts

Two files have missing dependencies in `useCallback` that prevent `check:all` from passing:

- [ ] `src/components/views/area-view.tsx:246` - Add `area?.title` to dependency array
- [ ] `src/components/views/project-view.tsx:252` - Add `project?.title` to dependency array

**Note:** The React Compiler error says "Existing memoization could not be preserved." Consider whether removing the manual `useCallback` entirely is better than fixing dependencies - React Compiler may handle this automatically.

## Bug Fixes

### Medium Priority

- [ ] **ThemeProvider type safety** (`src/components/ThemeProvider.tsx:33`)
  - Unsafe cast: `setTheme(preferences.theme as Theme)`
  - Should validate that `preferences.theme` is a valid Theme value

### Low Priority / Needs Verification

- [ ] **ShortcutPicker stale closure** (`src/components/preferences/ShortcutPicker.tsx:127-178`)
  - Flagged by code review, but may not be a real issue
  - The effect cleanup/re-add cycle should provide fresh closures
  - **Action:** Test rapid keystrokes in preferences before fixing
  - If confirmed: Use a ref to track `pendingShortcut`

- [ ] **Task creation race condition** (`src/components/tasks/task-list.tsx:363-402`)
  - Async task creation captures `currentIndex`/`currentLength` at call time
  - If user navigates before async resolves, selection goes to wrong index
  - **Reality check:** Task creation is ~50ms. User would need to navigate within that window.
  - Low probability in practice, but technically correct to fix if doing a cleanup pass

## Hardcoded Values

- [ ] Update `APP_NAME = 'Tauri Template'` to `'Taskdn'` in `src/lib/menu.ts:19`

## Unused Dependencies

Remove from `package.json`:

- [ ] `next-themes` - Appears unused (we have custom ThemeProvider)
  - **Verify first:** `grep -r "next-themes" src/` to confirm no imports
- [x] ~~`shadcn`~~ - KEEP: Used for `@import 'shadcn/tailwind.css'` and CLI
- [ ] `zod-validation-error` (devDependencies) - Not used (only in overrides)

## Unused Exports (Review Carefully)

These are exported but never imported. Decide case-by-case:

### Remove - Likely Dead Code

- [ ] `src/types/headings.ts` - `parseOrderedId` (never called anywhere)
- [ ] `src/types/sidebar-order.ts` - `parseDragId` (local version defined in today-view.tsx is used instead)
- [ ] `src/store/task-detail-store.ts` - `useIsTaskDetailOpen` (components use selector directly)

### Review - May Be Useful Later

- [ ] `src/services/vault.ts` - Individual entity hooks (`useTask`, `useProject`, `useArea`)
  - Currently `useVaultData()` is used everywhere
  - Could be useful for single-entity views, but currently unused
  - Consider removing if no plans to use

- [ ] `src/services/vault.ts` - `useCreateProject`
  - Project creation from UI not implemented yet
  - Keep if project creation is planned, otherwise remove

- [ ] `src/services/vault.ts` - `initializeVault`, `isVaultConfigured`
  - Wrapper functions around Rust commands
  - Currently unused - app handles this differently
  - Likely safe to remove

### Keep - Intentional API

- [x] `src/lib/tauri-bindings.ts` - `unwrapResult`
  - Useful utility for cleaner error handling
  - Current explicit checks are verbose; this could improve code
  - Keep and consider adopting more broadly

- [x] `src/lib/logger.ts` - All exports (`trace`, `debug`, `info`, `warn`, `error`)
  - Intentional logging API, used as needed
- [x] `src/lib/notifications.ts` - Individual exports (`success`, `error`, `info`, `warning`)
  - Convenience API, may be used in future
- [x] `src/lib/recovery.ts` - `loadEmergencyData`
  - Part of recovery system, designed for future use

## Duplicate Exports

- [ ] `src/components/calendar/draggable-task-card.tsx` - Exports both `SortableTaskCard` and `DraggableTaskCard` for same component
  - Pick one name and use it consistently
- [ ] `src/components/command-palette/CommandPalette.tsx` - Has both named export and default export
  - Remove default export (project uses named exports)

## File Naming Standardization

**Critical observation:** The codebase is split ~70/30 between kebab-case and PascalCase:

| Pattern    | Folders                                                                                    | File Count |
| ---------- | ------------------------------------------------------------------------------------------ | ---------- |
| PascalCase | `layout/`, `titlebar/`, `preferences/`                                                     | ~15 files  |
| kebab-case | `tasks/`, `views/`, `sidebar/`, `calendar/`, `cards/`, `kanban/`, `projects/`, `headings/` | ~45 files  |

**Decision needed:** Standardizing to PascalCase (per original plan) would require renaming 45+ files and updating all their imports. This is significant churn with risk of merge conflicts.

**Options:**

1. **Accept current state** - Live with the inconsistency. Not ideal but low risk.
2. **Standardize to kebab-case** - Less work (only ~15 files to rename). Matches `ui/` pattern.
3. **Standardize to PascalCase** - More work (~45 files) but matches component names.

**Recommendation:** Option 1 for now. The inconsistency is annoying but harmless. Revisit when there's a natural refactoring opportunity (e.g., major restructure).

### Hooks Naming (Definite Fix)

- [ ] `hooks/useMainWindowEventListeners.ts` - Rename to `use-main-window-event-listeners.ts`
  - All other hooks use kebab-case pattern
  - Single file rename, low risk

## Large Components (For Future Consideration)

These components are large (>650 lines) but work correctly. Not urgent, but consider refactoring if they become harder to maintain:

- `src/components/tasks/task-list.tsx` (780 lines)
- `src/components/views/area-view.tsx` (751 lines)
- `src/components/ui/sidebar.tsx` (721 lines)
- `src/components/views/no-area-view.tsx` (677 lines)
- `src/components/views/today-view.tsx` (661 lines)

## Code Duplication Notes

Significant duplication exists between view components (jscpd detected 40+ clones). However, per project guidelines, we should NOT prematurely extract this unless it obviously simplifies the codebase. Current approach:

- Each view has its own clear responsibility
- Duplication makes views self-contained and easier to modify independently
- Only extract if the same pattern needs modification in multiple places

## Files to Keep (Not Unused)

These were flagged by static analysis but should be kept:

- [x] `src/components/cards/area-card.tsx` - Needed for future card-based views
- [x] `src/quick-pane-main.tsx` and quick-pane system - Needed for quick entry feature
- [x] `src/components/ui/alert-dialog.tsx` - Standard shadcn component, will be used
- [x] `src/components/ui/spinner.tsx` - Loading indicator, will be used
- [x] `src/components/ui/empty.tsx` - Alternative to EmptyState for complex layouts
- [x] Status pill components (`task-status-pill.tsx`, `project-status-pill.tsx`) - Intentionally separate

## Completion Checklist

### Must Do (Blocking or High Value)

1. [ ] Fix ESLint errors (blocking `check:all`)
2. [ ] Update hardcoded APP_NAME
3. [ ] Rename `useMainWindowEventListeners.ts` to kebab-case
4. [ ] Remove clearly dead exports (`parseOrderedId`, `parseDragId`, `useIsTaskDetailOpen`)
5. [ ] Fix duplicate exports (SortableTaskCard, CommandPalette default)

### Should Do (Good Cleanup)

6. [ ] Verify and remove unused dependencies
7. [ ] Add Theme validation in ThemeProvider
8. [ ] Review borderline vault exports (decide: keep or remove)

### Maybe Do (After Verification)

9. [ ] Test and fix ShortcutPicker if actually buggy
10. [ ] Fix task creation race condition if reproducible

### Skip For Now

- File naming standardization (too much churn for little benefit)
- Large component refactoring (works fine, revisit if maintenance becomes painful)
- Code duplication extraction (premature optimization)

### Final

11. [ ] Run `bun run check:all` to verify everything passes
