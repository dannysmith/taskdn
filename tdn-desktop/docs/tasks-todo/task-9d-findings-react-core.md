# Clean Code Review: React Core Infrastructure

**Date:** 2026-01-16
**Scope:** Non-component TypeScript/React code - hooks, services, stores, lib, types, config, i18n

## Summary

The React core infrastructure is generally well-organized with clear patterns and good documentation. The main findings involve a few large files that handle multiple responsibilities, some code duplication across similar hooks, and module-level mutable state that could complicate testing. The codebase follows established architecture patterns consistently, with a few exceptions noted below.

---

## Critical Findings

### 1. Large Hook with Multiple Responsibilities: use-deep-link.ts

**Location:** `src/hooks/use-deep-link.ts` (414 lines)
**Issue:** This hook handles URL parsing, entity lookup, navigation, task creation, and window management - all within a single file. The file has 5 distinct sections marked with comments (Types, Data Access, Entity Lookup, Command Handlers, Hook).
**Principle:** Single Responsibility Principle - a module should have one reason to change
**Suggestion:** Split into:

- `src/lib/deep-link.ts` - URL parsing (already partially exists)
- `src/lib/deep-link-handler.ts` - Entity lookup and command execution logic
- `src/hooks/use-deep-link.ts` - Just the hook registration and event wiring

### 2. Misleading Function Name: extractIdFromWikilink

**Location:** `src/lib/commands/task-commands.ts:274-277`
**Issue:** Function is named `extractIdFromWikilink` but extracts the **title**, not the ID. The wikilink `[[Work]]` returns `"Work"` which is the title, not a database ID.
**Principle:** Names should reveal intent - a misleading name is worse than a bad name
**Suggestion:** Rename to `extractTitleFromWikilink` or `parseWikilinkTitle` to accurately describe what it does

---

## Moderate Findings

### 3. Code Duplication in Order Hooks

**Location:** `src/hooks/use-area-order.ts`, `use-inbox-order.ts`, `use-project-order.ts`, `use-today-order.ts`, `use-sidebar-order.ts`, `use-kanban-order.ts` (7+ files)
**Issue:** All order hooks follow nearly identical patterns for:

- Syncing local order state with external data
- Handling drag-and-drop reordering
- Persisting order to display-order-store
  **Principle:** DRY (Don't Repeat Yourself)
  **Suggestion:** Extract a generic `useOrderedItems<T>` hook or factory function that accepts configuration for the specific order key, filter function, and item type. Each hook could then be a thin wrapper.

### 4. Large Service File: vault.ts

**Location:** `src/services/vault.ts` (766 lines)
**Issue:** This file handles query keys, cache utilities, error handling, query hooks, mutation hooks, vault initialization, event handling, and utility hooks.
**Principle:** Single Responsibility - this file has many reasons to change
**Suggestion:** Consider splitting into:

- `vault-queries.ts` - Query hooks (useTasks, useProjects, useAreas)
- `vault-mutations.ts` - Mutation hooks (useUpdateTask, useCreateTask, etc.)
- `vault-utils.ts` - Cache utilities, query keys, error handling
- `vault-init.ts` - Initialization and event setup

### 5. Module-Level Mutable State

**Locations:**

- `src/services/vault.ts:573` - `lastMutationTime`
- `src/hooks/use-command-context.ts` - `contextMenuTarget` getter/setter
- `src/lib/context-menu.ts:21-22` - `contextMenuInProgress`, `contextMenuAbortController`

**Issue:** Module-level mutable state makes testing difficult (state persists between tests) and can cause subtle bugs with concurrent operations.
**Principle:** Testability and predictability
**Suggestion:**

- Move `lastMutationTime` into a singleton class or use Zustand with `getState()`
- For `contextMenuTarget`, consider using a dedicated small Zustand store
- For context menu mutex, document why module-level state is necessary or move to a class pattern

### 6. Inconsistent QueryClient Usage

**Location:** `src/services/vault.ts`
**Issue:** Some places import `queryClient` directly from `@/lib/query-client` (e.g., line 44 for `addTaskToCache`), while other places use the `useQueryClient()` hook inside mutations.
**Principle:** Consistency - pick one pattern and use it throughout
**Suggestion:** Standardize on one approach. For non-hook contexts, direct import is fine. For hooks/components, prefer `useQueryClient()`. Document the pattern in architecture guide.

### 7. Hardcoded English Strings in Date Utils

**Location:** `src/lib/date-utils.ts:36-48`
**Issue:** User-facing strings like "Today", "Tomorrow", "Yesterday", "Last Mon" are hardcoded in English rather than using i18n keys.
**Principle:** Internationalization - user-facing text should be translatable
**Suggestion:** Use i18n translation keys:

```typescript
if (diffDays === 0) return t('dates.today')
if (diffDays === 1) return t('dates.tomorrow')
```

### 8. Inconsistent Order Hook: use-calendar-order.ts

**Location:** `src/hooks/use-calendar-order.ts:57-58`
**Issue:** Uses local `useState` for order state while all other order hooks use the Zustand `displayOrderStore`. The comment explains the rationale (dates change = reinitialize), but this creates inconsistency.
**Principle:** Consistency in architectural patterns
**Suggestion:** Either document this as an intentional exception in the architecture guide, or refactor to use Zustand with a different persistence strategy (e.g., per-week keys).

---

## Minor Findings

### 9. Duplicate Availability Check Logic

**Location:**

- `src/lib/commands/types.ts:141-163` - `isTaskCommandAvailable`
- `src/lib/commands/entity-commands.ts:68-88` - `isEntityCommandAvailable`

**Issue:** Both functions have nearly identical logic for checking if focus is in an editable element.
**Suggestion:** Extract shared logic to a utility:

```typescript
function isNotInEditableElement(): boolean {
  const activeEl = document.activeElement
  return !(activeEl instanceof HTMLInputElement || ...)
}
```

### 10. Unused Parameter in task-creation-store

**Location:** `src/store/task-creation-store.ts:183`
**Issue:** `updateActiveListSelection` has an `_index` parameter prefixed with underscore indicating it's unused.
**Suggestion:** Either remove the parameter if it's truly not needed, or use it if it should be.

### 11. Alert() in Menu Handler

**Location:** `src/lib/menu.ts:681-684` (`handleAbout` function)
**Issue:** Uses browser `alert()` for the About dialog, which is jarring UX in a native desktop app.
**Suggestion:** Create a proper About dialog component or use Tauri's dialog API.

### 12. Dynamic Label Convention Could Be Clearer

**Location:** `src/lib/commands/registry.ts:27`, `entity-commands.ts:112`
**Issue:** Uses `_dynamic:` string prefix to mark dynamic labels. This is a stringly-typed pattern that could be confusing.
**Suggestion:** Consider a more explicit type:

```typescript
labelKey: string | { dynamic: string }
```

### 13. Types in data.ts Marked as Temporary

**Location:** `src/types/data.ts`
**Issue:** File header says types are "TEMPORARY and will be replaced by tauri-specta generated types" but they still exist alongside the generated types in `tauri-bindings.ts`.
**Suggestion:** Complete the migration and remove the duplicate types, or update the comment if they're intentionally kept for UI-only scenarios.

### 14. Potential Flash of Incorrect State in use-mobile.ts

**Location:** `src/hooks/use-mobile.ts:18`
**Issue:** Returns `false` initially even when initial state is `undefined`. On first render, this could cause mobile layouts to briefly show desktop view.
**Suggestion:** Consider returning `undefined` initially and handling the loading state in consumers, or using a default that matches the most common case.

---

## Observations

### Things Done Well

1. **Excellent documentation** - Most files have clear JSDoc comments explaining purpose and usage patterns
2. **Consistent command system** - The command registry pattern is well-designed with clear surfaces, groups, and execution
3. **Proper Zustand patterns** - Uses selector syntax consistently, avoiding render cascades (enforced by ast-grep)
4. **Type safety** - Good use of TypeScript with tauri-specta for type-safe Rust-TypeScript bridge
5. **i18n infrastructure** - Clean setup with RTL support and type-safe translation keys
6. **Error handling patterns** - Consistent use of Result types from Rust commands
7. **Shortcut system** - Well-designed parser/matcher for keyboard shortcuts with platform abstraction

### Architectural Notes

- The "state onion" (useState → Zustand → TanStack Query) is well-implemented
- Cross-store coupling (e.g., task-detail-store calling useUIStore.getState()) is documented and intentional
- The command system cleanly separates registration, context, and execution

---

## Files Reviewed

### Hooks

- [x] `use-platform.ts` - Clean, good caching pattern
- [x] `use-mobile.ts` - Simple, potential initial state issue
- [x] `use-theme.ts` - Clean context consumer
- [x] `use-area-order.ts` - Good pattern, duplicated across hooks
- [x] `use-calendar-order.ts` - Inconsistent with other order hooks
- [x] `use-deep-link.ts` - **Large, multiple responsibilities**
- [x] `use-global-shortcuts.ts` - Clean, well-documented
- [x] `use-inbox-order.ts` - Follows pattern
- [x] `use-kanban-order.ts` - Follows pattern
- [x] `use-main-window-event-listeners.ts` - Clean event wiring
- [x] `use-prevent-escape-exits-fullscreen.ts` - Small, focused
- [x] `use-project-order.ts` - Follows pattern
- [x] `use-sidebar-order.ts` - Follows pattern
- [x] `use-today-order.ts` - Follows pattern
- [x] `use-command-context.ts` - Module-level state concern

### Services

- [x] `vault.ts` - **Large, multiple responsibilities**
- [x] `preferences.ts` - Clean, focused

### Stores

- [x] `ui-store.ts` - Clean, well-organized
- [x] `display-order-store.ts` - Clean, good documentation
- [x] `navigation-store.ts` - Good, uses queryClient directly
- [x] `task-creation-store.ts` - Unused parameter, otherwise good
- [x] `task-detail-store.ts` - Cross-store coupling documented
- [x] `view-mode-store.ts` - Clean, simple

### Lib/Commands

- [x] `index.ts` - Clean exports
- [x] `types.ts` - Good type definitions
- [x] `registry.ts` - Well-designed
- [x] `app-commands.ts` - Clean
- [x] `entity-commands.ts` - Dynamic label pattern
- [x] `navigation-commands.ts` - Clean
- [x] `window-commands.ts` - Clean
- [x] `task-commands.ts` - **Misleading function name**

### Lib/Other

- [x] `utils.ts` - Minimal, just cn()
- [x] `logger.ts` - Clean singleton pattern
- [x] `date-utils.ts` - **Hardcoded English strings**
- [x] `deep-link.ts` - Good URL parsing
- [x] `notifications.ts` - Clean abstraction
- [x] `entity-filters.ts` - Small, focused
- [x] `context-menu.ts` - Module-level mutex
- [x] `menu.ts` - **Uses alert() for About**
- [x] `platform-strings.ts` - Good platform abstraction
- [x] `recovery.ts` - Clean error handling
- [x] `task-navigation.ts` - Small, focused
- [x] `theme.ts` - Small, focused
- [x] `query-client.ts` - Clean config
- [x] `theme-context.ts` - Simple context
- [x] `tauri-bindings.ts` - Clean re-export with helper
- [x] `bindings.ts` - Auto-generated, not reviewed

### Lib/Shortcuts

- [x] `index.ts` - Clean exports
- [x] `types.ts` - Good types
- [x] `parser.ts` - Clean parsing
- [x] `matcher.ts` - Good event matching

### Types

- [x] `index.ts` - Clean exports
- [x] `data.ts` - **Marked temporary but still exists**
- [x] `navigation.ts` - Clean
- [x] `headings.ts` - Clean with utilities
- [x] `calendar-order.ts` - Clean
- [x] `sidebar-order.ts` - Clean

### Config

- [x] `index.ts` - Clean exports
- [x] `heading-colors.ts` - Clean config
- [x] `status.ts` - Clean config

### i18n

- [x] `index.ts` - Clean exports
- [x] `config.ts` - Clean setup
- [x] `language-init.ts` - Good initialization logic
- [x] `i18n.d.ts` - Proper type augmentation
