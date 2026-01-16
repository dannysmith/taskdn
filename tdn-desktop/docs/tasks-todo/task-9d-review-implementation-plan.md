# Clean Code Review: Implementation Plan

**Created:** 2026-01-16
**Based on:** Phase 1-4 findings documents

This plan addresses all issues identified in the clean code review, organized into phases that can be completed independently across multiple sessions.

---

## How to Use This Document

1. Each phase can be completed in approximately one Claude Code session
2. After completing a phase, mark it `[x]` and note the completion date
3. Run verification steps before marking complete
4. If a phase spans multiple sessions, note progress in the phase section

---

## Phase Overview

| Phase | Focus                      | Severity | Est. Files | Risk   |
| ----- | -------------------------- | -------- | ---------- | ------ |
| 1     | WikiLink Utilities         | Critical | 5 TS       | Low    |
| 2     | AppPreferences camelCase   | Critical | 3 RS + TS  | Low\*  |
| 3     | Rust Status Methods        | Moderate | 2 RS       | Low    |
| 4     | Temporary Types Removal    | Moderate | ~10 TS     | Low    |
| 5     | Order Hook Consolidation   | Moderate | 4 TS       | Medium |
| 6     | Vault.ts Splitting         | Moderate | 5 TS       | Medium |
| 7     | use-deep-link.ts Splitting | Moderate | 3 TS       | Low    |
| 8     | lib.rs Refactoring         | Moderate | 1 RS       | Low    |
| 9     | Calendar DnD Extraction    | Moderate | 3 TSX      | Medium |
| 10    | Minor Improvements         | Minor    | Various    | Low    |

\*Low risk because only one user currently

---

## Phase 1: WikiLink Utilities Consolidation

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

Four separate implementations of wikilink extraction exist in TypeScript:

- `src/lib/commands/task-commands.ts:274` - `extractIdFromWikilink` (misleadingly named)
- `src/components/views/ProjectView.tsx:101` - `extractTitle`
- `src/components/views/WeekView.tsx:101` - `extractTitle`
- `src/components/tasks/TaskDetailPanel.tsx:98` - `extractFromWikilink`

None handle aliases (`|`) or headings (`#`) that the Rust version supports.

### Tasks

- [ ] Create `src/lib/wikilink.ts` with functions matching Rust behavior
- [ ] Create `src/lib/wikilink.test.ts` with comprehensive tests
- [ ] Replace `extractIdFromWikilink` in `task-commands.ts` with import
- [ ] Replace `extractTitle` in `ProjectView.tsx` with import
- [ ] Replace `extractTitle` in `WeekView.tsx` with import
- [ ] Replace `extractFromWikilink` in `TaskDetailPanel.tsx` with import
- [ ] Remove inline implementations from all files

### New File: `src/lib/wikilink.ts`

```typescript
/**
 * WikiLink parsing utilities matching Rust behavior.
 *
 * Handles Obsidian-style wikilinks:
 * - Basic: [[Page Name]]
 * - With alias: [[Page Name|Display Text]]
 * - With heading: [[Page Name#Heading]]
 * - Combined: [[Page Name#Heading|Display Text]]
 */

/**
 * Extract the target name from a wikilink reference.
 * Returns null if the input is not a valid wikilink.
 *
 * @example
 * extractWikilinkTitle('[[Work]]') // 'Work'
 * extractWikilinkTitle('[[Work|My Job]]') // 'Work'
 * extractWikilinkTitle('[[Work#Section]]') // 'Work'
 * extractWikilinkTitle('not a wikilink') // null
 */
export function extractWikilinkTitle(reference: string): string | null {
  const trimmed = reference.trim()
  if (!trimmed.startsWith('[[') || !trimmed.endsWith(']]')) {
    return null
  }

  const inner = trimmed.slice(2, -2).trim()
  if (!inner) return null

  // Handle alias (take everything before |)
  const beforeAlias = inner.split('|')[0]

  // Handle heading (take everything before #)
  const name = beforeAlias.split('#')[0].trim()

  return name || null
}

/**
 * Check if a string is a wikilink.
 */
export function isWikilink(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith('[[') && trimmed.endsWith(']]')
}

/**
 * Ensure a value is wrapped in wikilink format.
 * If already wrapped, returns unchanged.
 */
export function ensureWikilink(value: string): string {
  const trimmed = value.trim()
  return isWikilink(trimmed) ? trimmed : `[[${trimmed}]]`
}

/**
 * Strip wikilink brackets from a value if present.
 * Equivalent to extractWikilinkTitle but returns original if not a wikilink.
 */
export function stripWikilink(value: string): string {
  return extractWikilinkTitle(value) ?? value.trim()
}
```

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Open a task with a project assigned → Verify project name displays correctly
- Open a task with an area assigned → Verify area name displays correctly
- Open Project view → Verify area grouping works
- Open Week view → Verify tasks display under correct projects/areas

---

## Phase 2: AppPreferences camelCase Migration

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

`AppPreferences` in Rust lacks `#[serde(rename_all = "camelCase")]`, resulting in snake_case TypeScript fields that violate conventions and are inconsistent with entity types.

### Tasks

- [ ] Add `#[serde(rename_all = "camelCase")]` to `AppPreferences` in `src-tauri/src/types.rs`
- [ ] Run `bun run tauri:dev` to regenerate bindings (or the appropriate binding generation command)
- [ ] Update any TypeScript code that references snake_case preference fields
- [ ] Delete existing `preferences.json` (breaking change, acceptable per user)
- [ ] Verify app starts correctly with fresh preferences

### Code Change

```rust
// src-tauri/src/types.rs
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(default)]
#[serde(rename_all = "camelCase")]  // ADD THIS LINE
pub struct AppPreferences {
    pub theme: String,
    pub quick_pane_shortcut: Option<String>,
    // ... rest unchanged
}
```

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Delete `~/Library/Application Support/is.danny.taskdn-desktop/preferences.json` and `~/Library/Application Support/is.danny.taskdn-desktop/preferences.development.json`
- Launch app → Verify it starts with default preferences
- Change theme → Verify preference saves and persists
- Set quick pane shortcut → Verify it saves and works
- Set vault directories → Verify they save and vault loads

---

## Phase 3: Rust Status Methods

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

Status-to-string conversion is duplicated in 4 locations in `writer.rs`:

- `create_task_file` (TaskStatus)
- `update_task` (TaskStatus)
- `create_project_file` (ProjectStatus)
- `update_project` (ProjectStatus)

### Tasks

- [ ] Add `as_kebab_str()` method to `TaskStatus` enum in `entities.rs`
- [ ] Add `as_kebab_str()` method to `ProjectStatus` enum in `entities.rs`
- [ ] Replace all 4 match statements in `writer.rs` with method calls
- [ ] Add unit tests for the new methods

### Code Changes

```rust
// src-tauri/src/vault/entities.rs

impl TaskStatus {
    /// Returns the kebab-case string representation for YAML frontmatter.
    pub fn as_kebab_str(&self) -> &'static str {
        match self {
            TaskStatus::Inbox => "inbox",
            TaskStatus::Icebox => "icebox",
            TaskStatus::Ready => "ready",
            TaskStatus::InProgress => "in-progress",
            TaskStatus::Blocked => "blocked",
            TaskStatus::Dropped => "dropped",
            TaskStatus::Done => "done",
        }
    }
}

impl ProjectStatus {
    /// Returns the kebab-case string representation for YAML frontmatter.
    pub fn as_kebab_str(&self) -> &'static str {
        match self {
            ProjectStatus::Planning => "planning",
            ProjectStatus::Ready => "ready",
            ProjectStatus::Blocked => "blocked",
            ProjectStatus::InProgress => "in-progress",
            ProjectStatus::Paused => "paused",
            ProjectStatus::Done => "done",
        }
    }
}
```

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Create a new task → Verify status is written correctly to file
- Change task status → Verify file updates correctly
- Create a new project → Verify status is written correctly
- Change project status → Verify file updates correctly

---

## Phase 4: Temporary Types Removal

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

`src/types/data.ts` is marked as "TEMPORARY" but still exists alongside generated tauri-specta types. It has subtle differences that could cause confusion.

### Tasks

- [x] Search for all imports of `src/types/data.ts` or `@/types/data`
- [x] For each import, determine if it can use `@/lib/tauri-bindings` types instead
- [x] Migrate each file to use tauri-bindings types
- [x] Handle field name differences (`areaId` → `area`, `projectId` → `project`, `notes` → `body`)
- [x] Delete `src/types/data.ts`
- [x] Update `src/types/index.ts` if it re-exports from data.ts

### Implementation Notes

The migration to `@/lib/tauri-bindings` types had already been completed in previous work.
All 62 files using entity types were already importing from tauri-bindings.
This phase only required deleting the unused `data.ts` file and updating the barrel export.

### Field Mapping Reference

| data.ts          | tauri-bindings | Notes                      |
| ---------------- | -------------- | -------------------------- |
| `Task.areaId`    | `Task.area`    | WikiLink format `[[Name]]` |
| `Task.projectId` | `Task.project` | WikiLink format `[[Name]]` |
| `Task.notes`     | `Task.body`    | Markdown content           |
| `Project.areaId` | `Project.area` | WikiLink format `[[Name]]` |
| `Project.notes`  | `Project.body` | Markdown content           |
| `Area.notes`     | `Area.body`    | Markdown content           |

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Open any view that displays tasks → Verify all fields render correctly
- Open task detail panel → Verify all metadata displays
- Edit a task → Verify changes save correctly

---

## Phase 5: Order Hook Consolidation

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

Three order hooks (`useInboxOrder`, `useAreaOrder`, `useProjectOrder`) are 95%+ identical with ~240 lines of duplication.

**Note:** Other order hooks (`useTodayOrder`, `useKanbanOrder`, `useSidebarOrder`, `useCalendarOrder`) have unique requirements and should NOT be consolidated.

### ⚠️ Design Note: Keyed vs Non-Keyed Hooks

The factory pattern below needs adjustment during implementation. The three hooks have different signatures:

```typescript
useInboxOrder(tasks: Task[])                    // No key - direct state access
useAreaOrder(areaId: string, tasks: Task[])     // Keyed by areaId
useProjectOrder(projectId: string, tasks: Task[]) // Keyed by projectId
```

**Options:**

1. Create two factories: `createTaskOrderHook` (inbox) and `createKeyedTaskOrderHook` (area/project)
2. Make one flexible factory that accepts an optional key parameter
3. Use a higher-order function that returns a hook with the key baked in

The code sample below shows the non-keyed pattern. Adjust during implementation.

### Tasks

- [x] Create `src/hooks/use-task-order.ts` with a factory function
- [x] Create `src/hooks/use-task-order.test.ts` with comprehensive tests
- [x] Refactor `useInboxOrder` to use the factory
- [x] Refactor `useAreaOrder` to use the factory
- [x] Refactor `useProjectOrder` to use the factory
- [x] Verify existing tests still pass

### Implementation Notes

Created two factory functions to handle the different patterns:
- `createTaskOrderHook` - For non-keyed hooks (inbox) with direct state access
- `createKeyedTaskOrderHook` - For keyed hooks (area, project) with state accessed by key

Each original hook was reduced from ~72-80 lines to ~25 lines while maintaining the same public API. All 45 tests pass (16 factory tests + 13 inbox + 8 area + 8 project).

### New File: `src/hooks/use-task-order.ts`

```typescript
/**
 * Factory for creating task order hooks.
 *
 * This creates hooks that manage display order for task lists, supporting
 * drag-and-drop reordering with Zustand persistence.
 */

import { useCallback, useMemo } from 'react'
import type { Task } from '@/lib/tauri-bindings'
import { useDisplayOrderStore } from '@/store/display-order-store'

interface TaskOrderConfig {
  /** Selector to get stored order from display order store */
  getStoredOrder: (
    state: ReturnType<typeof useDisplayOrderStore.getState>
  ) => string[] | null
  /** Function to set order in display order store */
  setStoredOrder: (ids: string[]) => void
}

/**
 * Creates a task order hook with the given configuration.
 */
export function createTaskOrderHook(config: TaskOrderConfig) {
  return function useTaskOrder(tasks: Task[]) {
    // Get order state from Zustand (using selector syntax for performance)
    const storedOrder = useDisplayOrderStore(config.getStoredOrder)

    // Derive the effective ordered IDs by syncing stored order with current tasks
    const orderedIds = useMemo(() => {
      const currentTaskIds = new Set(tasks.map(t => t.id))

      if (storedOrder) {
        // Keep existing order for tasks that still exist
        const preservedOrder = storedOrder.filter(id => currentTaskIds.has(id))

        // Find new tasks not in order yet
        const existingIds = new Set(storedOrder)
        const newTaskIds = tasks
          .filter(t => !existingIds.has(t.id))
          .map(t => t.id)

        // Append new tasks to end
        return [...preservedOrder, ...newTaskIds]
      }

      // No stored order yet, use natural order
      return tasks.map(t => t.id)
    }, [tasks, storedOrder])

    // Set the new order directly (from reordered tasks array)
    const setOrder = useCallback((reorderedTasks: Task[]) => {
      config.setStoredOrder(reorderedTasks.map(t => t.id))
    }, [])

    // Get ordered task IDs
    const getOrderedTaskIds = useCallback((): string[] => {
      return orderedIds
    }, [orderedIds])

    // Get ordered tasks (returns Task objects in display order)
    const getOrderedTasks = useCallback((): Task[] => {
      const taskMap = new Map(tasks.map(t => [t.id, t]))
      return orderedIds
        .map(id => taskMap.get(id))
        .filter((t): t is Task => t !== undefined)
    }, [orderedIds, tasks])

    return {
      orderedIds,
      setOrder,
      getOrderedTaskIds,
      getOrderedTasks,
    }
  }
}
```

### Refactored Hook Example: `use-inbox-order.ts`

```typescript
import { createTaskOrderHook } from './use-task-order'
import { useDisplayOrderStore } from '@/store/display-order-store'

/**
 * Manages inbox task display order separately from entity data.
 */
export const useInboxOrder = createTaskOrderHook({
  getStoredOrder: state => state.inboxOrder,
  setStoredOrder: ids => {
    useDisplayOrderStore.getState().setInboxOrder(ids)
  },
})
```

### Verification

```bash
bun run check:all
bun run test -- --filter="order"
```

**Manual Testing:**

- Open Inbox view → Drag tasks to reorder → Verify order persists
- Open a Project view → Drag tasks to reorder → Verify order persists
- Open an Area view → Drag tasks to reorder → Verify order persists
- Navigate away and back → Verify order was preserved

---

## Phase 6: Vault.ts Splitting

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

`src/services/vault.ts` (829 lines) handles too many responsibilities: query keys, cache utilities, error handling, query hooks, mutation hooks, initialization, and event handling.

### ⚠️ Risk: Circular Dependencies

When splitting a large file, circular imports can occur. Before implementing:

1. **Map dependencies first** - identify what depends on what within vault.ts
2. **Suggested dependency order** (lower depends on higher):
   - `keys.ts` - no internal dependencies
   - `utils.ts` - depends on keys.ts
   - `queries.ts` - depends on keys.ts, utils.ts
   - `mutations.ts` - depends on keys.ts, utils.ts
   - `init.ts` - depends on keys.ts, utils.ts
   - `index.ts` - re-exports all

3. **If circular deps occur**, extract shared types/constants to a separate `types.ts` file

### Implementation Notes

Split the 829-line vault.ts into 6 focused files:
- `keys.ts` (~15 lines) - Query key definitions
- `utils.ts` (~90 lines) - Error handling, cache utils, mutation timing
- `queries.ts` (~210 lines) - Query hooks + useVaultData/useVaultHelpers
- `mutations.ts` (~300 lines) - Mutation hooks with optimistic updates
- `init.ts` (~150 lines) - Initialization, event setup, config utils
- `index.ts` (~45 lines) - Re-exports

Added `isRecentMutation()` and `getTimeSinceLastMutation()` helpers in utils.ts to cleanly share mutation timing state between mutations.ts and init.ts without exposing module-level variables.

No import changes required throughout codebase - `@/services/vault` now resolves to the directory's index.ts.

### Tasks

- [x] Create `src/services/vault/index.ts` (re-exports)
- [x] Create `src/services/vault/keys.ts` (query keys)
- [x] Create `src/services/vault/queries.ts` (query hooks)
- [x] Create `src/services/vault/mutations.ts` (mutation hooks)
- [x] Create `src/services/vault/utils.ts` (cache utilities, error handling)
- [x] Create `src/services/vault/init.ts` (initialization, event setup)
- [x] Update imports throughout codebase
- [x] Delete original `vault.ts`

### File Structure

```
src/services/vault/
├── index.ts          # Re-exports all public API
├── keys.ts           # vaultQueryKeys object
├── queries.ts        # useTasks, useProjects, useAreas, useTask, etc. + useVaultData, useVaultHelpers
├── mutations.ts      # useUpdateTask, useCreateTask, useDeleteTask, etc.
├── utils.ts          # addTaskToCache, formatVaultError, handleVaultError, mutation timing
└── init.ts           # useVaultInitialization, initializeVault, reinitializeVault, vaultConfigChanged
```

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Full app walkthrough - tasks, projects, areas CRUD
- Verify vault change events trigger refreshes
- Verify error toasts appear on failures

---

## Phase 7: use-deep-link.ts Splitting

**Status:** [ ] Not Started
**Completion Date:** \_\_\_

### Problem

`src/hooks/use-deep-link.ts` (414 lines) handles URL parsing, entity lookup, navigation, task creation, and window management in a single file.

### Tasks

- [ ] Expand `src/lib/deep-link.ts` with entity lookup and command execution logic
- [ ] Create `src/lib/deep-link-handler.ts` for command handlers
- [ ] Slim down `src/hooks/use-deep-link.ts` to just hook registration and event wiring
- [ ] Update imports as needed

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Test deep link: `taskdn://task/create` → Should create new task
- Test deep link: `taskdn://task/{id}` → Should open task detail
- Test deep link: `taskdn://navigate/inbox` → Should navigate to inbox

---

## Phase 8: lib.rs Refactoring

**Status:** [ ] Not Started
**Completion Date:** \_\_\_

### Problem

The `run()` function in `lib.rs` (~215 lines) handles plugin registration, app setup, and event handling in a single function.

### Tasks

- [ ] Extract `configure_plugins(builder: Builder) -> Builder`
- [ ] Extract `setup_app(app: &App) -> Result<(), Box<dyn Error>>`
- [ ] Extract `handle_run_event` if not already separate
- [ ] Simplify `run()` to be a high-level orchestrator

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Launch app → Verify it starts correctly
- Test quick pane → Verify it works
- Test file watching → Verify vault changes are detected

---

## Phase 9: Calendar DnD Extraction

**Status:** [ ] Not Started
**Completion Date:** \_\_\_

### Problem

`WeekCalendar.tsx` and `MonthCalendar.tsx` share ~200 lines of nearly identical DnD handler logic.

### ⚠️ Pre-Implementation: Audit Both Components First

Before designing the hook, audit both calendars to identify:

1. **Shared logic** (likely candidates for extraction):
   - Sensor configuration
   - `handleDragStart`, `handleDragEnd`, `handleDragCancel` structure
   - `DragState` interface
   - Overlay rendering pattern

2. **Potentially different logic** (may need parameterization):
   - Drop zone calculations (week has columns, month has cells)
   - Date determination from drop coordinates
   - Overlay positioning math
   - How "same day" vs "different day" drops are detected

3. **Hook API design** - only after understanding shared vs unique logic

If differences are significant, consider whether extraction still provides value or adds complexity.

### Tasks

- [ ] Audit WeekCalendar.tsx and MonthCalendar.tsx DnD logic for shared vs unique patterns
- [ ] Design hook API based on audit findings
- [ ] Create `src/components/calendar/use-calendar-dnd.ts` hook
- [ ] Extract common DnD logic (sensors, handlers, state)
- [ ] Refactor `WeekCalendar.tsx` to use the hook
- [ ] Refactor `MonthCalendar.tsx` to use the hook
- [ ] Add tests for the new hook

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Open Week view → Drag task to different day → Verify it moves and scheduled date updates
- Open Month view → Drag task to different day → Verify it moves and scheduled date updates
- Drag within same day → Verify reordering works
- Drag between days → Verify drop indicator shows correctly

---

## Phase 10: Minor Improvements

**Status:** [ ] Not Started
**Completion Date:** \_\_\_

This phase collects all minor issues. Each can be done independently.

### 10a. Internationalize Date Strings

**Location:** `src/lib/date-utils.ts:36-48`

- [ ] Add i18n keys for "Today", "Tomorrow", "Yesterday", "Last {day}"
- [ ] Add keys to `locales/en.json`
- [ ] Update `formatRelativeDate` to use i18n

### 10c. Extract CSS Custom Properties for Magic Numbers

**Locations:** Various component files

- [ ] Add CSS variables for:
  - `--kanban-column-min-height: 200px`
  - `--kanban-column-width: 288px` (w-72)
  - `--month-day-min-height: 100px`
  - `--day-column-min-height: 300px`
- [ ] Update components to use variables

### 10d. Recovery Cleanup Refactoring

**Location:** `src-tauri/src/commands/recovery.rs:126-206`

- [ ] Add constant: `const RECOVERY_FILE_RETENTION_DAYS: u64 = 7`
- [ ] Extract helper: `is_file_older_than_days(path: &Path, days: u64) -> Option<bool>`
- [ ] Simplify main loop in `cleanup_old_recovery_files`

### 10e. ThreadPool Error Handling

**Location:** `src-tauri/src/vault/scanner.rs:192-195`

- [ ] Replace `.unwrap()` with `.expect("descriptive message")`
- [ ] Or handle gracefully with warning log

### 10f. Document QueryClient Pattern

**Location:** `docs/developer/architecture-guide.md`

- [ ] Add section explaining when to use direct import vs `useQueryClient()` hook
- [ ] Direct import: non-React contexts (utilities, event handlers)
- [ ] Hook: React components and hooks

### 10g. get_entity_raw_content Lock Pattern

**Location:** `src-tauri/src/vault/manager.rs:382-418`

- [ ] Refactor to acquire lock once
- [ ] Use match to extract path
- [ ] Release lock before file I/O

### 10h. VaultDirs Struct Location (Optional)

**Location:** `src-tauri/src/commands/preferences.rs:33-38`

- [ ] Consider moving to `types.rs` for consistency
- [ ] Or document why current location is acceptable

### 10i. Unused Parameter in task-creation-store

**Location:** `src/store/task-creation-store.ts:183`

- [ ] Remove unused `_index` parameter or use it

### 10j. Dynamic Label Convention

**Location:** `src/lib/commands/registry.ts:27`, `entity-commands.ts:112`

- [ ] Consider changing `_dynamic:` prefix to explicit type
- [ ] Or document the convention in architecture guide

### Verification (after each sub-task)

```bash
bun run check:all
```

---

## Appendix: Files Changed Summary

### Rust Files

- `src-tauri/src/types.rs`
- `src-tauri/src/vault/entities.rs`
- `src-tauri/src/vault/writer.rs`
- `src-tauri/src/vault/manager.rs`
- `src-tauri/src/vault/scanner.rs`
- `src-tauri/src/commands/recovery.rs`
- `src-tauri/src/lib.rs`

### TypeScript Files (New)

- `src/lib/wikilink.ts` (Phase 1)
- `src/lib/wikilink.test.ts` (Phase 1)
- `src/hooks/use-task-order.ts` (Phase 5 - factory functions)
- `src/hooks/use-task-order.test.ts` (Phase 5)
- `src/components/calendar/use-calendar-dnd.ts`
- `src/services/vault/index.ts`
- `src/services/vault/keys.ts`
- `src/services/vault/queries.ts`
- `src/services/vault/mutations.ts`
- `src/services/vault/utils.ts`
- `src/services/vault/init.ts`
- `src/lib/deep-link-handler.ts`

### TypeScript Files (Modified)

- `src/lib/commands/task-commands.ts`
- `src/components/views/ProjectView.tsx`
- `src/components/views/WeekView.tsx`
- `src/components/tasks/TaskDetailPanel.tsx`
- `src/hooks/use-inbox-order.ts` (Phase 5 - refactored to use factory)
- `src/hooks/use-area-order.ts` (Phase 5 - refactored to use factory)
- `src/hooks/use-project-order.ts` (Phase 5 - refactored to use factory)
- `src/hooks/use-deep-link.ts`
- `src/components/calendar/WeekCalendar.tsx`
- `src/components/calendar/MonthCalendar.tsx`
- Various files importing from `@/types/data`
- `src/lib/date-utils.ts`
- `src/lib/menu.ts`

### TypeScript Files (Deleted)

- `src/types/data.ts`
- `src/services/vault.ts` (replaced by vault/ directory)

---

## Completion Checklist

- [x] Phase 1: WikiLink Utilities
- [x] Phase 2: AppPreferences camelCase
- [x] Phase 3: Rust Status Methods
- [x] Phase 4: Temporary Types Removal
- [x] Phase 5: Order Hook Consolidation
- [x] Phase 6: Vault.ts Splitting
- [ ] Phase 7: use-deep-link.ts Splitting
- [ ] Phase 8: lib.rs Refactoring
- [ ] Phase 9: Calendar DnD Extraction
- [ ] Phase 10: Minor Improvements
  - [ ] 10a. Date strings i18n
  - [ ] 10c. CSS custom properties
  - [ ] 10d. Recovery cleanup refactoring
  - [ ] 10e. ThreadPool error handling
  - [ ] 10f. QueryClient pattern docs
  - [ ] 10g. get_entity_raw_content lock pattern
  - [ ] 10h. VaultDirs location (optional)
  - [ ] 10i. Unused parameter
  - [ ] 10j. Dynamic label convention
