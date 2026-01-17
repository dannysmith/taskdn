# Task: Clean Code Review

A systematic review of the entire codebase to identify opportunities for cleaner, more maintainable code.

## Reference Material

Before beginning, familiarize yourself with Clean Code principles: https://gist.githubusercontent.com/wojteklu/73c6914cc446146b8b533c0988cf8d29/raw/c7a44d774fc3b09a0d5f0f58888550ba0ac694b9/clean_code.md

Also review the established architecture patterns in `docs/developer/architecture-guide.md` and `AGENTS.md`.

---

## Review Phases

This review is structured in **4 phases**. Execute each phase in a separate session, creating a findings document for each.

### Phase 1: Rust Backend

**Scope:** `src-tauri/src/` (excluding generated files in `target/`)

**Files to examine:**

- `lib.rs`, `main.rs`, `types.rs`, `bindings.rs`
- `commands/*.rs` (preferences, recovery, config, quick_pane, notifications, vault)
- `vault/*.rs` (error, scanner, wikilink, manager, entities, writer)
- `utils/*.rs`

**Output:** `docs/tasks-todo/task-9d-findings-rust.md`

---

### Phase 2: React Core Infrastructure

**Scope:** Non-component TypeScript/React code

**Files to examine:**

- `src/hooks/` - All custom hooks
- `src/services/` - TanStack Query integration
- `src/store/` - Zustand stores
- `src/lib/` - Commands, utilities, tauri-bindings
- `src/types/` - Type definitions
- `src/config/` - Configuration files
- `src/i18n/` - Internationalization setup

**Output:** `docs/tasks-todo/task-9d-findings-react-core.md`

---

### Phase 3: React Components

**Scope:** All React components

**Files to examine:**

- `src/components/layout/` - MainWindow, sidebars, layout components
- `src/components/sidebar/` - Sidebar-specific components
- `src/components/command-palette/` - Command palette system
- `src/components/preferences/` - Preferences dialog
- `src/components/ui/` - shadcn/UI components (focus on customized ones)
- `src/App.tsx`, `src/main.tsx`, `src/quick-pane-main.tsx`

**Output:** `docs/tasks-todo/task-9d-findings-react-components.md`

---

### Phase 4: Cross-Cutting Synthesis

**Scope:** Review findings from phases 1-3, examine cross-cutting concerns

**Activities:**

- Review all phase findings documents
- Look for patterns/inconsistencies across the codebase
- Examine file organization and naming conventions
- Check for duplicated logic between Rust and TypeScript
- Assess overall architectural consistency

**Output:** `docs/tasks-todo/task-9d-findings-synthesis.md` (final consolidated recommendations)

---

## What to Look For

### 1. Function/Component Size & Complexity

| Threshold      | Language         | Action                 |
| -------------- | ---------------- | ---------------------- |
| >40-50 lines   | Rust functions   | Evaluate for splitting |
| >100-150 lines | React components | Evaluate for splitting |
| >3 levels deep | Nesting (both)   | Simplify or extract    |

**Specific patterns:**

- Functions doing more than one conceptual thing (look for "do X _and_ Y")
- High cyclomatic complexity - many `match`/`if`/ternary branches
- Flag arguments (booleans that fundamentally change behavior) - these often indicate two functions masquerading as one
- Functions with >4 parameters - consider grouping into a struct/object

### 2. Naming Clarity

**Red flags:**

- Cryptic abbreviations: `cmd`, `cfg`, `val`, `mgr`, `ctx` instead of full words
- Generic names that don't reveal purpose: `data`, `result`, `item`, `value`, `temp`, `info`, `stuff`
- Misleading names that don't match what the code actually does
- Inconsistent conventions: mixing `getUserData`/`fetchUserInfo`/`loadUser` for similar operations
- Ambiguous boolean props: `enabled`, `active`, `visible` without context of _what_

**Good naming asks:** "Would someone unfamiliar with this code understand what this is for?"

### 3. Single Responsibility Violations

**Look for:**

- Modules/files handling multiple unrelated concerns
- Components that fetch data AND render complex UI AND handle side effects
- Functions with distinct "sections" (often preceded by comments like "// now handle the...")
- Classes/structs with methods that don't relate to each other

### 4. Rust-Specific Concerns

**Error handling:**

- `unwrap()` in production code paths (should use `?` or explicit handling)
- `expect()` with poor/missing messages
- Inconsistent patterns: some functions use `?`, others use `match`, others `unwrap`

**Idioms:**

- Loops where iterators would be clearer
- Manual string building instead of `format!("{variable}")` (modern Rust style)
- Match arms containing complex logic that should be extracted
- Missing use of `if let` / `let else` where appropriate

**Organization:**

- Public items that should be private
- Missing documentation on public API

### 5. React/TypeScript-Specific Concerns

**State management (per architecture guide):**

- **CRITICAL:** Zustand destructuring violations - `const { x } = useStore()` causes render cascades
- State in wrong layer (local vs Zustand vs TanStack Query)
- Not using `getState()` in callbacks

**Types:**

- `any` type abuse - places where proper types were avoided
- Complex inline types that should be extracted and named
- Missing return types on functions where inference isn't obvious

**Hooks:**

- `useEffect` doing multiple unrelated things
- Missing or incorrect dependency arrays
- Custom hooks that are really just functions (no hook behavior)

**Components:**

- Props drilling through many layers (might need context or composition)
- Inline handler functions that are complex (should be extracted)
- Conditional rendering that's hard to follow

### 6. Comments

**Remove:**

- Commented-out code (this is what git is for)
- Redundant comments stating the obvious: `// increment counter` above `counter++`
- Outdated comments that no longer match the code

**Keep/Add:**

- Comments explaining _why_ (business logic, non-obvious decisions)
- Warnings about consequences or gotchas
- Documentation for public APIs

**Assess:**

- TODO/FIXME comments - are they still relevant? Should they become tasks?

### 7. Magic Values

**Look for:**

- Hardcoded strings representing meaningful values (paths, keys, identifiers, error messages)
- Magic numbers: `if (items.length > 10)` instead of `MAX_VISIBLE_ITEMS`
- User-facing text hardcoded in English (should be i18n keys)
- Repeated literal values that could be constants

### 8. Code Smells (from Clean Code)

| Smell                 | Description                              | Look For                                     |
| --------------------- | ---------------------------------------- | -------------------------------------------- |
| Rigidity              | Small change cascades through many files | Tight coupling, missing abstractions         |
| Fragility             | Changes break unrelated code             | Hidden dependencies                          |
| Needless Repetition   | Same logic in multiple places            | Copy-pasted code, similar patterns           |
| Opacity               | Code is hard to understand               | Clever tricks, dense expressions, poor names |
| Negative conditionals | `if (!isNotEnabled)`                     | Double negatives, confusing boolean logic    |

---

## What NOT to Be Dogmatic About

**Do not insist on:**

- Splitting functions that read clearly at 35-40 lines just to hit an arbitrary threshold
- Extracting code used only twice into a "reusable" helper (often makes things harder to follow)
- "One assert per test" - related assertions grouped together is fine
- Adding types where TypeScript inference is clear and correct
- Creating abstractions for hypothetical future requirements

**Accept:**

- Some inherent complexity in genuinely complex domains - distinguish "hard problem" from "poorly expressed solution"
- Longer functions if they have a clear linear flow and good internal structure
- Pragmatic trade-offs that the original author likely made intentionally

**Key question:** "Does this change make the code genuinely easier to understand and maintain, or am I just enforcing a rule?"

---

## Output Format

For each phase, create a findings document with this structure:

```markdown
# Clean Code Review: [Phase Name]

**Date:** YYYY-MM-DD
**Scope:** [What was reviewed]

## Summary

[2-3 sentence overview of findings]

## Critical Findings

[Issues that significantly impact maintainability or correctness]

### [Finding Title]

**Location:** `path/to/file.rs:123` (or line range)
**Issue:** [What's wrong]
**Principle:** [Which Clean Code principle this violates]
**Suggestion:** [Concrete improvement]

## Moderate Findings

[Issues worth addressing but not urgent]

### [Finding Title]

...

## Minor Findings

[Small improvements, nice-to-haves]

### [Finding Title]

...

## Observations

[Patterns noticed, things done well, architectural notes]

## Files Reviewed

- [ ] `file1.rs` - [brief note]
- [ ] `file2.rs` - [brief note]
      ...
```

**Severity guidelines:**

- **Critical:** Affects correctness, security, or significantly harms maintainability
- **Moderate:** Makes code harder to understand or modify, but not urgent
- **Minor:** Polish, small improvements, stylistic consistency

---

## Execution Notes

1. **Read before judging** - Always read the full context of code before flagging it
2. **Check for reasons** - Code that looks wrong might have a good reason; look for comments or context
3. **Be specific** - "This function is too long" is unhelpful; "Lines 45-80 handle validation and could be extracted to `validate_input()`" is actionable
4. **Prioritize impact** - Focus on changes that would most improve maintainability
5. **Respect existing patterns** - If the codebase consistently does something a certain way, inconsistency is worse than imperfection

# Clean Code Review Phase 3: React Components - Findings

## Executive Summary

The React components layer demonstrates **excellent overall quality**. The codebase shows strong adherence to Clean Code principles, with consistent patterns, clear naming, and thorough documentation. Issues found are relatively minor and don't indicate fundamental design problems.

**Overall Assessment:** 🟢 Good (minor improvements identified)

## Scope Reviewed

- **Entry files:** `App.tsx`, `main.tsx`, `quick-pane-main.tsx`
- **Layout:** MainWindow, sidebars, ViewHeader
- **Sidebar:** AppSidebar, DraggableArea, DraggableProject
- **Command palette:** CommandPalette
- **Preferences:** PreferencesDialog, ShortcutPicker, panes, FolderPicker
- **Titlebar:** TitleBar, platform-specific controls
- **Providers:** ErrorBoundary, ThemeProvider
- **Quick-pane:** All 7 quick-pane components
- **Tasks:** TaskItem, TaskList, TaskCard, TaskDndContext, TaskStatusCheckbox, TaskStatusPill, OrderedItemList, ProjectTaskGroup, SectionTaskGroup, etc.
- **Kanban:** KanbanBoard, KanbanColumn, KanbanDndContext, AreaKanbanBoard
- **Calendar:** WeekCalendar, MonthCalendar, DayColumn, MonthDayCell, DraggableTaskCard
- **Headings:** HeadingListItem, HeadingDragPreview, HeadingColorPicker
- **Quick-search:** QuickSearch, QuickSearchResult
- **Custom UI:** DatePicker, MarkdownEditor, SearchableSelect, ProgressCircle, TagInput, EmptyState

---

## Positive Patterns Observed

### 1. Excellent Documentation (Clean Code: Meaningful Comments)

Almost every component has a JSDoc comment explaining:

- What the component does
- Where/when it's used in the application
- Key behaviors and states

**Example from `TaskStatusCheckbox.tsx:7-22`:**

```typescript
/**
 * TaskStatusCheckbox - Visual status indicator styled like Things 3.
 *
 * Used everywhere a task appears (lists, cards, detail panel). Shows the
 * task's status via color and icon:
 * - ready: Empty grey square (default state)
 * - done: Green filled with checkmark
 * ...
 */
```

This pattern is consistent across the entire codebase and significantly aids maintainability.

### 2. Clear Naming Conventions (Clean Code: Meaningful Names)

- Components use descriptive PascalCase names that reveal intent
- Props interfaces follow `{ComponentName}Props` pattern
- Internal helper functions have verb-prefixed names (`handleClick`, `getTaskVariant`)
- Type discriminators are clear (`type: 'task'`, `type: 'heading'`, `type: 'kanban-task'`)

### 3. Single Responsibility Principle

Components are generally well-focused with clear separation of concerns:

- **Presentational vs Container:** `TaskItem` (pure) vs `TaskListItem` (sortable wrapper)
- **Context isolation:** Drag-and-drop contexts (`TaskDndContext`, `KanbanDndContext`) are separate from UI components
- **Configuration externalized:** Status configs in `@/config/status`, colors in `@/config/heading-colors`

### 4. Consistent Architectural Patterns

- DnD contexts follow the same structure: sensors, handlers, context provider, overlay
- All components use `cn()` utility for class merging
- Consistent use of container queries for responsive sizing (`@container`, `@6xs`, `@7xs`)
- Keyboard accessibility patterns are consistent (Enter/Escape handling)

### 5. TypeScript Usage

- Well-defined interfaces for all props and state
- Discriminated unions for drag data types
- Proper use of optional chaining and nullish coalescing

---

## Issues Found

### Severity Levels

- 🔴 **Critical:** Must fix - violates core principles or creates maintenance burden
- 🟡 **Moderate:** Should fix - reduces readability or maintainability
- 🟢 **Minor:** Consider fixing - small improvements

---

### 🟡 MODERATE-1: Large Files Could Be Split

**Principle Violated:** Clean Code - Small Functions/Classes

Several components exceed 400 lines and contain multiple internal components or helper functions that could be extracted:

| File                  | Lines | Issue                                                                                           |
| --------------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `AreaKanbanBoard.tsx` | 653   | Contains `AreaKanbanColumn`, `ProjectSwimlane`, `LooseTasksSwimlane`, `useAreaCollapsedColumns` |
| `TaskDndContext.tsx`  | 482   | Contains helper exports, multiple type definitions, complex handler logic                       |
| `WeekCalendar.tsx`    | 486   | Complete DnD context inline, multiple useMemo blocks                                            |
| `MonthCalendar.tsx`   | 449   | Similar structure to WeekCalendar                                                               |

**Recommendation:** Consider extracting internal components in `AreaKanbanBoard.tsx` to separate files since they're substantial (ProjectSwimlane: ~110 lines, LooseTasksSwimlane: ~100 lines).

---

### 🟡 MODERATE-2: Code Duplication in Calendar Components

**Principle Violated:** Clean Code - DRY (Don't Repeat Yourself)

`WeekCalendar.tsx` and `MonthCalendar.tsx` share significant structural similarities:

- Nearly identical DnD handler patterns (`handleDragStart`, `handleDragOver`, `handleDragEnd`, `handleDragCancel`)
- Same `DragState` interface
- Similar navigation button patterns
- Identical sensor configuration

**Locations:**

- `WeekCalendar.tsx:300-410` (DnD handlers)
- `MonthCalendar.tsx:249-349` (DnD handlers)

**Recommendation:** Consider extracting common calendar DnD logic into a shared hook (`useCalendarDnd`) or base component, leaving view-specific rendering to each calendar type.

---

### 🟡 MODERATE-3: Code Duplication in AreaKanbanBoard Swimlanes

**Principle Violated:** Clean Code - DRY

`ProjectSwimlane` and `LooseTasksSwimlane` in `AreaKanbanBoard.tsx` are nearly identical (~80% similar):

- Same task rendering logic with `SortableKanbanCard`
- Same droppable setup
- Same empty state handling
- Different only in header content and swimlane ID

**Locations:**

- `AreaKanbanBoard.tsx:396-509` (ProjectSwimlane)
- `AreaKanbanBoard.tsx:526-624` (LooseTasksSwimlane)

**Recommendation:** Extract a shared `BaseSwimlane` component or use a render prop pattern to eliminate duplication.

---

### 🟢 MINOR-1: Inline Callback Wrappers Reduce Readability

**Principle Violated:** Clean Code - Small Functions

Several components wrap callbacks inline with conditional logic, making JSX harder to scan:

**Example from `KanbanColumn.tsx:185-192`:**

```typescript
onStatusChange={
  onTaskStatusChange
    ? newStatus => onTaskStatusChange(task.id, newStatus)
    : undefined
}
```

**Locations:**

- `KanbanColumn.tsx:185-218` (multiple inline wrappers)
- `AreaKanbanBoard.tsx:459-491` (in map loops)
- `DayColumn.tsx:140-168`

**Note:** While React Compiler handles memoization, these patterns still reduce readability.

**Recommendation:** For components with many callback props, consider creating pre-bound handlers at the list level or using a helper function to create task-specific handlers.

---

### 🟢 MINOR-2: Magic Numbers Without Context

**Principle Violated:** Clean Code - Meaningful Constants

Some hardcoded values lack explanatory constants:

| Location               | Value              | Context                |
| ---------------------- | ------------------ | ---------------------- |
| `QuickSearch.tsx:36`   | `MAX_RESULTS = 50` | ✅ Good - has constant |
| `KanbanColumn.tsx:171` | `min-h-[200px]`    | Missing explanation    |
| `KanbanColumn.tsx:142` | `w-72`             | Missing explanation    |
| `MonthDayCell.tsx:74`  | `min-h-[100px]`    | Missing explanation    |
| `DayColumn.tsx:95`     | `min-h-[300px]`    | Missing explanation    |

**Recommendation:** Add CSS custom properties or constants for layout-significant magic numbers, especially those that define minimum sizes for interaction.

---

### 🟢 MINOR-3: ESLint Disable Comments

**Observation (not an issue):**

Several files have `/* eslint-disable react-refresh/only-export-components */` for legitimate reasons (context hooks exported alongside providers). These are properly scoped and necessary.

**Locations:**

- `TaskDndContext.tsx:1`
- `KanbanDndContext.tsx:76`

---

### 🟢 MINOR-4: Complex Controlled/Uncontrolled Pattern

**Principle Violated:** Clean Code - Simple Control Flow

The controlled/uncontrolled state pattern in `SearchableSelect.tsx:88-99` and `TaskStatusPill.tsx:45-47` adds complexity:

```typescript
const isControlled = controlledOpen !== undefined
const open = isControlled ? controlledOpen : internalOpen
const setOpen = (value: boolean) => {
  if (isControlled && onOpenChange) {
    onOpenChange(value)
  } else {
    setInternalOpen(value)
  }
}
```

**Note:** This is a common pattern and the implementation is correct. Just noting it adds cognitive load.

**Recommendation:** If this pattern is used in multiple places, consider extracting a `useControllableState` hook.

---

## Non-Issues Reviewed (Confirmed Good)

### Event Handler Patterns ✅

- Consistent `stopPropagation()` usage in nested interactive elements
- Proper keyboard event handling (Enter, Escape, Space)
- Appropriate use of `type="button"` to prevent form submission

### Accessibility ✅

- ARIA labels on interactive elements (`aria-label`, `aria-pressed`, `aria-expanded`)
- Focus management in edit modes
- Keyboard navigation support

### State Management ✅

- Proper use of `useRef` for non-rendering state (edit cancellation flags)
- Local state for UI concerns, props for data
- Controlled component patterns where appropriate

### Performance Patterns ✅

- Appropriate use of `useMemo` for derived data
- Stable callback patterns in hooks
- No unnecessary re-renders observed in component structure

---

## Recommendations Summary

### Priority 1 (Moderate - Should Fix)

1. Extract internal components from `AreaKanbanBoard.tsx` into separate files
2. Create shared calendar DnD hook to reduce duplication between `WeekCalendar` and `MonthCalendar`
3. Unify `ProjectSwimlane` and `LooseTasksSwimlane` with a shared base component

### Priority 2 (Minor - Consider Fixing)

1. Add CSS custom properties for layout-significant magic numbers
2. Consider extracting `useControllableState` hook if pattern repeats
3. Evaluate callback binding patterns for readability (no performance concern due to React Compiler)

---

## Metrics

| Metric                 | Value                       |
| ---------------------- | --------------------------- |
| Files Reviewed         | 50+                         |
| Critical Issues        | 0                           |
| Moderate Issues        | 3                           |
| Minor Issues           | 4                           |
| Lines of Duplication   | ~300 (calendar + swimlanes) |
| Documentation Coverage | >95% (excellent)            |

---

## Conclusion

The React components demonstrate strong adherence to Clean Code principles. The codebase benefits from:

- Consistent documentation across all components
- Clear separation of concerns
- Well-typed interfaces
- Consistent patterns for complex functionality (DnD, keyboard handling)

The issues identified are primarily about reducing code duplication in similar components (calendars, swimlanes) and don't represent architectural concerns. The team's commitment to JSDoc documentation is particularly noteworthy and should be maintained.

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

# Clean Code Review: Phase 1 - Rust Backend

**Date:** 2026-01-16
**Scope:** `src-tauri/src/` - All Rust backend code

## Summary

The Rust codebase is generally well-structured with good documentation, comprehensive test coverage, and consistent error handling patterns. The code follows established Rust idioms and makes good use of modern features like `LazyLock`, `inspect_err`, and proper `#[cfg]` attributes for platform-specific code. Most functions are appropriately sized and focused. The main areas for improvement are a few longer functions that could benefit from extraction, some scattered `unwrap()`/`expect()` calls, and minor opportunities to reduce code duplication.

## Critical Findings

_None identified._ The codebase demonstrates sound engineering practices with no critical issues affecting correctness, security, or maintainability.

## Moderate Findings

### 1. Long `run()` Function with Multiple Responsibilities

**Location:** `src-tauri/src/lib.rs:21-236` (~215 lines)
**Issue:** The main `run()` function handles plugin registration, app setup, and event handling in a single large function. While each section is logically grouped with comments, the function does several distinct things: plugin configuration, setup callback, and run event handling.
**Principle:** Functions should do one thing (Single Responsibility)
**Suggestion:** Consider extracting the plugin registration into a helper like `configure_plugins(builder: Builder) -> Builder` and the setup callback into `setup_app(app: &App) -> Result<(), Box<dyn Error>>`. This would make `run()` a high-level orchestrator:

```rust
pub fn run() {
    let builder = bindings::generate_bindings();
    export_bindings_if_dev();

    let app_builder = configure_plugins(tauri::Builder::default());

    app_builder
        .setup(setup_app)
        .invoke_handler(builder.invoke_handler())
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(handle_run_event);
}
```

---

### 2. Nested Loop with Magic Number in Recovery Cleanup

**Location:** `src-tauri/src/commands/recovery.rs:126-206` (~80 lines)
**Issue:** The `cleanup_old_recovery_files()` function has a deeply nested loop with multiple `match` statements and uses a magic number `7` for the day count.
**Principle:** Avoid deep nesting; replace magic numbers with named constants
**Suggestion:**

1. Extract the constant: `const RECOVERY_FILE_RETENTION_DAYS: u64 = 7;`
2. Extract the age-checking logic into a helper function:

```rust
const RECOVERY_FILE_RETENTION_DAYS: u64 = 7;

fn is_file_older_than_days(path: &Path, days: u64) -> Option<bool> {
    let metadata = std::fs::metadata(path).ok()?;
    let modified = metadata.modified().ok()?;
    let modified_secs = modified.duration_since(UNIX_EPOCH).ok()?.as_secs();
    let cutoff = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .ok()?
        .as_secs()
        .saturating_sub(days * 24 * 60 * 60);
    Some(modified_secs < cutoff)
}
```

This would significantly simplify the main loop body.

---

### 3. `unwrap()` on ThreadPoolBuilder in Scanner

**Location:** `src-tauri/src/vault/scanner.rs:192-195`
**Issue:** Uses `.unwrap()` on the thread pool builder, which could panic if thread pool creation fails (unlikely but possible under resource constraints).
**Principle:** Avoid `unwrap()` in production code paths
**Suggestion:** Handle the error gracefully or at minimum use `expect()` with a descriptive message:

```rust
let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(MAX_PARALLEL_THREADS)
    .build()
    .expect("Failed to create thread pool for vault scanning");
```

Or better, return an empty Vec with a warning log if pool creation fails.

---

### 4. Duplicated Status-to-String Conversion Logic

**Location:**

- `src-tauri/src/vault/writer.rs:229-237` (TaskStatus in `create_task_file`)
- `src-tauri/src/vault/writer.rs:482-490` (TaskStatus in `update_task`)
- `src-tauri/src/vault/writer.rs:323-330` (ProjectStatus in `create_project_file`)
- `src-tauri/src/vault/writer.rs:576-583` (ProjectStatus in `update_project`)

**Issue:** The same `match` statements converting `TaskStatus`/`ProjectStatus` enums to kebab-case strings are duplicated across 4 locations.
**Principle:** DRY (Don't Repeat Yourself) - Needless Repetition is a code smell
**Suggestion:** Add a method to the status enums:

```rust
impl TaskStatus {
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
```

Then use `status.as_kebab_str()` throughout the codebase.

---

### 5. Repeated Read-Lock Pattern in `get_entity_raw_content`

**Location:** `src-tauri/src/vault/manager.rs:382-418`
**Issue:** The function acquires three separate read locks (`self.inner.read()`) with identical patterns for task/project/area. Each lock is acquired and released separately within the match arms.
**Principle:** Reduce cognitive complexity; prefer single acquisition patterns
**Suggestion:** Acquire the lock once and use a match to extract the path:

```rust
pub fn get_entity_raw_content(&self, entity_type: &str, id: &str) -> Result<String, VaultError> {
    self.ensure_configured()?;

    let inner = self.inner.read();
    let path = match entity_type {
        "task" => inner.index.get_task(id).map(|t| t.path.clone()),
        "project" => inner.index.get_project(id).map(|p| p.path.clone()),
        "area" => inner.index.get_area(id).map(|a| a.path.clone()),
        _ => return Err(VaultError::validation_error(
            "entity_type",
            format!("Unknown entity type: {entity_type}"),
        )),
    };
    drop(inner); // Release lock before file I/O

    let entity_type_display = entity_type.to_title_case(); // Or simple match
    let path = path.ok_or_else(|| VaultError::entity_not_found(entity_type_display, id))?;

    std::fs::read_to_string(&path).map_err(|e| VaultError::read_error(&path, e.to_string()))
}
```

## Minor Findings

### 1. `expect()` in Development-Only Path

**Location:** `src-tauri/src/commands/config.rs:72`
**Issue:** Uses `expect("Failed to find repo root")` which could panic. While this is only in debug builds, it's still preferable to handle gracefully.
**Principle:** Explicit error handling over panics
**Suggestion:** Consider returning empty paths with a warning log if repo root cannot be found, similar to the release build behavior.

---

### 2. `VaultDirs` Struct Location

**Location:** `src-tauri/src/commands/preferences.rs:33-38`
**Issue:** The `VaultDirs` struct is defined in `preferences.rs` but is conceptually a type that could belong with other shared types.
**Principle:** Code organization - related types should be co-located
**Suggestion:** Consider moving `VaultDirs` to `types.rs` for consistency with other shared types like `AppPreferences`. However, since it's only used internally within preferences loading, the current location is acceptable.

---

### 3. Long Functions in `writer.rs`

**Location:**

- `create_task_file`: lines 208-300 (~92 lines)
- `update_task`: lines 471-562 (~91 lines)
- `update_project`: lines 565-648 (~83 lines)

**Issue:** These functions are longer than typical clean code guidelines suggest (~50 lines for Rust).
**Principle:** Functions should be small
**Assessment:** These functions follow a clear linear flow (build frontmatter, set fields, serialize, write) and are not complex. The length is primarily due to the many optional fields being handled. Splitting them would likely make the code harder to follow, not easier. **This is acceptable per the "don't be dogmatic" guideline** - the functions have good internal structure and clear purpose.

---

### 4. Commented Code Note

**Location:** None found
**Assessment:** The codebase is clean of commented-out code. Good practice observed.

---

### 5. TODO/FIXME Comments

**Location:** None found in Rust code
**Assessment:** No technical debt markers found in the Rust codebase.

## Observations

### Patterns Done Well

1. **Atomic File Operations**: All file writes use the atomic write pattern (temp file + rename), preventing corruption. This is consistently implemented across `preferences.rs`, `recovery.rs`, and `vault/writer.rs`.

2. **Error Handling Consistency**: The codebase uses a consistent pattern of typed errors (`VaultError`, `RecoveryError`, `CliConfigError`) with builder methods and proper `Display` implementations.

3. **Modern Rust Idioms**: Good use of:
   - `LazyLock` for static regex (types.rs:16)
   - `inspect_err` for logging errors (preferences.rs:66)
   - `is_none_or` for clean conditional checks (recovery.rs:161)
   - Modern format strings `"{variable}"` throughout

4. **RAII Pattern**: The `WriteFlagGuard` in manager.rs (lines 601-616) demonstrates proper RAII for ensuring the write flag is always reset, even on panic.

5. **Security Measures**: Well-documented security constants (`MAX_FILES_PER_SCAN`, `MAX_PARALLEL_THREADS`) and input validation throughout.

6. **Test Coverage**: Most modules have comprehensive unit tests covering happy paths, edge cases, and error conditions.

7. **Platform-Specific Code**: Clean use of `#[cfg]` attributes for platform-specific behavior (quick_pane.rs, manager.rs).

8. **Documentation**: Module-level doc comments explain purpose and design decisions. Public API is well-documented.

### Architectural Notes

- The separation between internal frontmatter structs (kebab-case for YAML) and public structs (camelCase for TypeScript) in `entities.rs` is a good pattern for handling serialization differences.

- The event-driven bridge between Rust and React (VAULT_CHANGED_EVENT) is well-implemented with proper debouncing.

- The module structure (commands/, vault/, utils/) provides clear separation of concerns.

## Files Reviewed

- [x] `lib.rs` - Main entry point, plugin setup (~237 lines)
- [x] `main.rs` - Minimal launcher (~7 lines)
- [x] `types.rs` - Shared types and validation (~453 lines)
- [x] `bindings.rs` - Tauri-specta bindings (~69 lines)
- [x] `commands/mod.rs` - Module exports (~12 lines)
- [x] `commands/preferences.rs` - Preferences management (~150 lines)
- [x] `commands/recovery.rs` - Emergency data recovery (~207 lines)
- [x] `commands/config.rs` - CLI config and app info (~94 lines)
- [x] `commands/quick_pane.rs` - Quick pane window management (~408 lines)
- [x] `commands/notifications.rs` - Native notifications (~47 lines)
- [x] `commands/vault.rs` - Vault CRUD commands (~181 lines)
- [x] `vault/mod.rs` - Vault module exports (~34 lines)
- [x] `vault/error.rs` - Vault error types (~321 lines)
- [x] `vault/scanner.rs` - File scanning infrastructure (~535 lines)
- [x] `vault/wikilink.rs` - WikiLink parsing utilities (~193 lines)
- [x] `vault/manager.rs` - VaultManager with file watching (~1004 lines)
- [x] `vault/entities.rs` - Entity structs and types (~391 lines)
- [x] `vault/writer.rs` - File writing with round-trip fidelity (~923 lines)
- [x] `utils/mod.rs` - Utility module exports (~4 lines)
- [x] `utils/platform.rs` - Cross-platform utilities (~136 lines)

**Total:** 20 files, ~5,416 lines of Rust code reviewed

# Clean Code Review: Phase 4 - Cross-Cutting Synthesis

**Date:** 2026-01-16
**Scope:** Cross-cutting analysis of Rust backend and React frontend

## Summary

The codebase demonstrates strong foundational patterns with consistent documentation, good type safety via tauri-specta, and solid architectural separation. However, cross-cutting analysis reveals several patterns of duplication and inconsistency between layers. The most significant finding is duplicated WikiLink extraction logic scattered across 4+ TypeScript locations with inconsistent implementations. Additionally, there's a naming convention split where entity types use camelCase but preferences use snake_case, and the "temporary" data types file remains in use alongside generated types.

---

## Critical Findings

### 1. Duplicated WikiLink Extraction Logic Across TypeScript

**Locations:**

- `src/lib/commands/task-commands.ts:274` - `extractIdFromWikilink`
- `src/components/views/ProjectView.tsx:101` - `extractTitle`
- `src/components/views/WeekView.tsx:101` - `extractTitle`
- `src/components/tasks/TaskDetailPanel.tsx:98` - `extractFromWikilink`

**Issue:** Four separate implementations of wikilink extraction exist in TypeScript, with:

- **Inconsistent naming**: `extractIdFromWikilink` (misleading - extracts title, not ID), `extractTitle`, `extractFromWikilink`
- **Different implementations**: Some use string slice (`wikilink.slice(2, -2)`), others use regex (`/^\[\[(.+)\]\]$/`)
- **Missing features**: None handle advanced wikilink syntax (aliases `|`, headings `#`) that the Rust implementation (`src-tauri/src/vault/wikilink.rs`) fully supports

**Principle:** DRY - Don't Repeat Yourself; also naming clarity
**Impact:** High - Inconsistent behavior, maintenance burden, and potential bugs when wikilinks with aliases or headings are encountered

**Suggestion:** Create a single `src/lib/wikilink.ts` utility module:

```typescript
/**
 * WikiLink parsing utilities matching Rust behavior.
 * Handles: [[Name]], [[Name|Alias]], [[Name#Heading]], [[Name#Heading|Alias]]
 */

export function extractWikilinkTitle(wikilink: string): string | null {
  const match = wikilink.match(/^\[\[([^\]|#]+)/)
  return match?.[1]?.trim() ?? null
}

export function isWikilink(value: string): boolean {
  return value.startsWith('[[') && value.endsWith(']]')
}

export function ensureWikilink(value: string): string {
  const trimmed = value.trim()
  return isWikilink(trimmed) ? trimmed : `[[${trimmed}]]`
}

export function stripWikilink(value: string): string {
  return extractWikilinkTitle(value) ?? value.trim()
}
```

Then replace all 4 implementations with imports from this module.

---

### 2. Naming Convention Inconsistency: AppPreferences vs Entities

**Locations:**

- `src-tauri/src/types.rs:27-52` - AppPreferences (no serde rename)
- `src-tauri/src/vault/entities.rs:58-87` - Task, Project, Area (camelCase rename)
- Generated `src/lib/bindings.ts:373-410` - AppPreferences has snake_case fields

**Issue:** Entity types (Task, Project, Area) use `#[serde(rename_all = "camelCase")]`, generating proper TypeScript-style field names. However, `AppPreferences` lacks this attribute, resulting in snake_case TypeScript fields like `quick_pane_shortcut`, `tasks_dir`, etc.

This creates inconsistency where:

```typescript
// Entity fields - correct TypeScript style
task.createdAt // ✓
task.deferUntil // ✓

// Preferences fields - Rust style in TypeScript
preferences.quick_pane_shortcut // ✗
preferences.permanent_delete_tasks // ✗
```

**Principle:** Consistency - follow the same conventions across the codebase
**Impact:** Medium - confusing API surface, violates TypeScript naming conventions

**Suggestion:** Add `#[serde(rename_all = "camelCase")]` to AppPreferences in `types.rs`. This is a breaking change requiring a migration or versioning strategy for existing preferences files.

---

## Moderate Findings

### 3. Temporary Types File Still in Use

**Location:** `src/types/data.ts`

**Issue:** The file header explicitly states:

> "NOTE: These types are TEMPORARY. Once the Rust backend is integrated, they will be replaced by types generated via tauri-specta from Rust structs."

However, the Rust backend is now integrated and tauri-specta generates types in `src/lib/bindings.ts`. The temporary types have subtle differences:

- `areaId` vs `area` (wikilink format)
- `projectId` vs `project` (wikilink format)
- `notes` vs `body` (markdown content)
- Different optionality patterns

**Principle:** Single Source of Truth - avoid duplicate type definitions
**Impact:** Medium - potential confusion about which types to use, risk of using wrong types

**Suggestion:**

1. Audit all imports of `src/types/data.ts`
2. Migrate all usages to `@/lib/tauri-bindings` types
3. Remove or archive `src/types/data.ts`

---

### 4. Aggregated Duplication Patterns

Analysis across all phases reveals a pattern of similar code being copy-pasted rather than abstracted:

| Pattern                     | Locations             | Lines Duplicated |
| --------------------------- | --------------------- | ---------------- |
| WikiLink extraction         | 4 TS files            | ~20 lines × 4    |
| Order hook logic            | 7 hook files          | ~50 lines × 7    |
| Status-to-string conversion | 4 Rust locations      | ~10 lines × 4    |
| Calendar DnD handlers       | 2 calendar components | ~100 lines × 2   |
| Swimlane rendering          | 2 swimlane components | ~80 lines × 2    |
| Availability check logic    | 2 command files       | ~20 lines × 2    |

**Estimated total duplicate lines:** ~700-800 lines

**Priority order for consolidation:**

1. WikiLink utilities (cross-cutting, high impact)
2. Order hook factory (most duplicated, same pattern)
3. Calendar DnD hook (significant size)
4. Status methods in Rust (simple, low risk)

---

### 5. Inconsistent QueryClient Usage

**Location:** `src/services/vault.ts`

**Issue:** Some places import `queryClient` directly while others use `useQueryClient()`:

- Direct import: `addTaskToCache` (line 44)
- Hook: Inside mutations

**Principle:** Consistency in patterns
**Impact:** Low - both work, but inconsistent

**Suggestion:** Document the pattern:

- Direct import: For non-React contexts (utilities, event handlers)
- `useQueryClient()`: For React components and hooks

---

## Minor Findings

### 6. Hardcoded English Strings in date-utils.ts

**Location:** `src/lib/date-utils.ts:36-48`

**Issue:** User-facing date strings ("Today", "Tomorrow", "Yesterday", "Last Mon") are hardcoded in English rather than using i18n translation keys.

**Suggestion:** Use i18n:

```typescript
import i18n from '@/i18n/config'
const t = i18n.t.bind(i18n)

if (diffDays === 0) return t('dates.today')
if (diffDays === 1) return t('dates.tomorrow')
```

---

### 7. Module-Level Mutable State

**Locations:**

- `src/services/vault.ts:573` - `lastMutationTime`
- `src/hooks/use-command-context.ts` - `contextMenuTarget`
- `src/lib/context-menu.ts:21-22` - mutex variables

**Issue:** Module-level mutable state complicates testing and can cause subtle bugs.

**Suggestion:** For testing purposes, consider wrapping in a singleton class or using Zustand.

---

## Positive Observations

### Consistent Patterns Done Well

1. **Documentation Quality**
   - JSDoc comments on virtually all functions and components
   - Module-level doc comments in Rust explaining purpose
   - Consistent format across both languages

2. **Type Safety**
   - tauri-specta provides end-to-end type safety between Rust and TypeScript
   - Proper discriminated unions for error types
   - TypeScript strict mode enforced

3. **Atomic Operations**
   - All Rust file writes use temp file + rename pattern
   - Consistent across preferences, recovery, and vault modules

4. **Error Handling**
   - Typed error enums in Rust with tagged variants
   - Consistent error formatting and logging
   - Toast notifications for user-facing errors

5. **Security Patterns**
   - Input validation in Rust commands
   - Path sanitization for file operations
   - Documented security constants

6. **No Technical Debt Markers**
   - No TODO/FIXME comments in either Rust or TypeScript
   - Clean codebase without commented-out code

---

## File Organization Assessment

### Rust (`src-tauri/src/`)

```
✓ Clear module separation (commands/, vault/, utils/)
✓ Internal vs public types well-separated in entities.rs
✓ Tests co-located with implementation
```

### TypeScript (`src/`)

```
✓ Good component organization by feature (calendar/, kanban/, tasks/)
✓ Clear hooks/ vs services/ vs store/ separation
✓ Commands organized by domain (app-, entity-, navigation-, task-, window-)
? Consider: lib/wikilink.ts for extracted utilities
? Consider: services/vault split (queries, mutations, utils)
```

---

## Consolidated Recommendations

### Priority 1 - Critical (Should Fix Soon)

1. **Create WikiLink utility module** (`src/lib/wikilink.ts`)
   - Consolidate all 4 implementations
   - Match Rust functionality (aliases, headings)
   - Fix misleading `extractIdFromWikilink` name

2. **Add camelCase to AppPreferences**
   - Add `#[serde(rename_all = "camelCase")]` to Rust struct
   - Plan migration for existing preferences files

### Priority 2 - Moderate (Plan for Next Sprint)

3. **Remove temporary types file**
   - Audit imports of `src/types/data.ts`
   - Migrate to tauri-bindings types
   - Delete or archive the file

4. **Extract order hook factory**
   - Create `useOrderedItems<T>` generic hook
   - Reduce 7 duplicate implementations to thin wrappers

5. **Add status methods to Rust enums**
   - Add `as_kebab_str()` method to TaskStatus, ProjectStatus
   - Eliminate 4 duplicate match statements

### Priority 3 - Minor (When Convenient)

6. **Extract calendar DnD hook** - Shared between WeekCalendar/MonthCalendar

7. **Internationalize date strings** - Add i18n keys for "Today", "Tomorrow", etc.

8. **Document QueryClient pattern** - Clarify when to use direct import vs hook

---

## Metrics Summary

| Metric                    | Value                     |
| ------------------------- | ------------------------- |
| Critical Issues           | 2                         |
| Moderate Issues           | 4                         |
| Minor Issues              | 3                         |
| Estimated Duplicate Lines | ~700-800                  |
| Test Coverage             | Good (unit tests present) |
| Documentation Coverage    | Excellent (>95%)          |
| Technical Debt Markers    | 0                         |

---

## Conclusion

The codebase demonstrates mature engineering practices with strong typing, consistent documentation, and solid architectural patterns. The primary technical debt is scattered code duplication rather than fundamental design issues. The WikiLink utilities consolidation should be prioritized as it affects multiple layers and has correctness implications (missing alias/heading support). The preferences naming inconsistency, while not urgent, should be addressed to maintain a consistent developer experience.

The team's commitment to documentation and type safety provides a strong foundation for maintaining code quality as the application grows.

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

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

`src/hooks/use-deep-link.ts` (414 lines) handles URL parsing, entity lookup, navigation, task creation, and window management in a single file.

### Tasks

- [x] Create `src/lib/deep-link-handler.ts` for command handlers
- [x] Slim down `src/hooks/use-deep-link.ts` to just hook registration and event wiring
- [x] Update imports as needed

### Implementation Notes

Split the 414-line use-deep-link.ts into focused modules:

- `src/lib/deep-link.ts` (~200 lines) - URL parsing and types (unchanged)
- `src/lib/deep-link-handler.ts` (~290 lines) - Command handlers, entity lookup, data access, window management
- `src/hooks/use-deep-link.ts` (~52 lines) - Just the hook with event listener setup

The handler module contains:

- `VaultData` type and `getVaultData()` for cache access
- Entity lookup functions (`findEntityByPath`, `findProjectByTitle`, `findAreaByTitle`)
- Selection helpers (`getSelectionForProject`, `getSelectionForArea`, `getViewForNewTask`)
- Command handlers (`handleOpenPath`, `handleOpenView`, `handleNew`)
- Main dispatcher `processDeepLink()` and `bringWindowToFront()`

### Verification

```bash
bun run check:all
```

**Manual Testing:**

- Test deep link: `taskdn://new?title=Test` → Should create new task
- Test deep link: `taskdn://open?path=/path/to/task.md` → Should open task detail
- Test deep link: `taskdn://open?view=inbox` → Should navigate to inbox

---

## Phase 8: lib.rs Refactoring

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

The `run()` function in `lib.rs` (~215 lines) handles plugin registration, app setup, and event handling in a single function.

### Tasks

- [x] Extract `configure_plugins(builder: Builder) -> Builder`
- [x] Extract `setup_app(app: &App) -> Result<(), Box<dyn Error>>`
- [x] Extract `handle_run_event` if not already separate
- [x] Simplify `run()` to be a high-level orchestrator

### Implementation Notes

Refactored the 236-line lib.rs into focused functions:

- `export_bindings_if_dev()` - Handles debug-only TypeScript binding export
- `configure_plugins()` - Registers all Tauri plugins in correct order
- `configure_log_plugin()` - Configures the logging plugin with levels and targets
- `setup_app()` - Orchestrates application initialization
- `setup_global_shortcuts()` - Registers global shortcut plugin and quick pane shortcut
- `setup_quick_pane()` - Creates the quick pane window
- `setup_vault()` - Initializes vault from saved preferences
- `handle_run_event()` - Routes run events to handlers
- `handle_main_window_close()` - Orchestrates cleanup on window close
- `save_window_state()` - Saves window state before closing
- `hide_quick_pane()` - Hides quick pane panel (macOS)
- `unregister_global_shortcuts()` - Unregisters all global shortcuts

The `run()` function is now a clean 12-line orchestrator that clearly shows the application flow.

Conditional compilation (`#[cfg(...)]`) is handled with paired stub functions for non-applicable platforms to keep the main code clean.

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

**Status:** [x] Complete
**Completion Date:** 2026-01-16

### Problem

`WeekCalendar.tsx` and `MonthCalendar.tsx` share ~200 lines of nearly identical DnD handler logic.

### Implementation Notes

Audit revealed that the DnD handler logic was nearly identical between both calendars:

- **DragState interface** - Identical
- **Sensors configuration** - Identical (PointerSensor with distance: 8)
- **Drop animation** - Identical (defaultDropAnimationSideEffects with opacity 0.5)
- **handleDragStart, handleDragOver, handleDragEnd, handleDragCancel** - Identical logic

Created `src/components/calendar/use-calendar-dnd.ts` hook that:

1. Manages `dragState` internally
2. Configures sensors and drop animation
3. Provides all four handler functions
4. Takes dependencies from useCalendarOrder and props as parameters

Both WeekCalendar.tsx (~485 → ~320 lines) and MonthCalendar.tsx (~449 → ~285 lines) were refactored to use the new hook, removing ~120 lines of duplicated DnD code from each.

Added 18 comprehensive tests for the hook covering:

- Initial state
- handleDragStart (valid data, missing task, wrong type)
- handleDragOver (day targets, task targets, null targets)
- handleDragEnd (cross-day moves, same-day drops, within-day reorder, drop on self)
- handleDragCancel

### Tasks

- [x] Audit WeekCalendar.tsx and MonthCalendar.tsx DnD logic for shared vs unique patterns
- [x] Design hook API based on audit findings
- [x] Create `src/components/calendar/use-calendar-dnd.ts` hook
- [x] Extract common DnD logic (sensors, handlers, state)
- [x] Refactor `WeekCalendar.tsx` to use the hook
- [x] Refactor `MonthCalendar.tsx` to use the hook
- [x] Add tests for the new hook

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

**Status:** [x] Complete
**Completion Date:** 2026-01-16

This phase collects all minor issues. Each can be done independently.

### 10a. Internationalize Date Strings

**Status:** [x] Complete

**Location:** `src/lib/date-utils.ts:36-48`

- [x] Add i18n keys for "Today", "Tomorrow", "Yesterday", "Last {day}"
- [x] Add keys to `locales/en.json`
- [x] Update `formatRelativeDate` to use i18n

### 10c. Extract CSS Custom Properties for Magic Numbers

**Status:** [x] Complete

**Locations:** Various component files

- [x] Add CSS variables for:
  - `--kanban-column-min-height: 200px`
  - `--kanban-column-width: 288px` (w-72)
  - `--month-day-min-height: 100px`
  - `--week-day-min-height: 300px`
- [x] Update components to use variables

### 10d. Recovery Cleanup Refactoring

**Status:** [x] Complete

**Location:** `src-tauri/src/commands/recovery.rs:126-206`

- [x] Add constant: `const RECOVERY_FILE_RETENTION_DAYS: u64 = 7`
- [x] Extract helper: `is_file_older_than_days(path: &Path, days: u64) -> Option<bool>`
- [x] Simplify main loop in `cleanup_old_recovery_files`

### 10e. ThreadPool Error Handling

**Status:** [x] Complete

**Location:** `src-tauri/src/vault/scanner.rs:192-195`

- [x] Handle gracefully with error log and return empty Vec

### 10f. Document QueryClient Pattern

**Status:** [x] Complete

**Location:** `docs/developer/architecture-guide.md`

- [x] Add section explaining when to use direct import vs `useQueryClient()` hook
- [x] Direct import: non-React contexts (utilities, event handlers)
- [x] Hook: React components and hooks

### 10g. get_entity_raw_content Lock Pattern

**Status:** [x] Complete

**Location:** `src-tauri/src/vault/manager.rs:382-418`

- [x] Refactor to acquire lock once
- [x] Use match to extract path
- [x] Release lock before file I/O

### 10h. VaultDirs Struct Location (Optional)

**Status:** [x] Complete (kept current location)

**Location:** `src-tauri/src/commands/preferences.rs:41-46`

- [x] Reviewed: Current location is appropriate because:
  - `VaultDirs` is only used within `preferences.rs` (by `load_vault_dirs()`)
  - It's an internal helper struct, not a domain type exposed via Tauri commands
  - Keeping it near its usage follows the principle of locality
  - `types.rs` is for shared types used across multiple modules

### 10i. Unused Parameter in task-creation-store

**Status:** [x] Complete

**Location:** `src/store/task-creation-store.ts:183`

- [x] Removed unused `index` parameter from `updateActiveListSelection`
- [x] Updated type definition, implementation, and test calls

### 10j. Dynamic Label Convention

**Status:** [x] Complete (documented)

**Location:** `src/lib/commands/registry.ts:27`, `entity-commands.ts:112`

- [x] Documented the `_dynamic:` prefix convention in `docs/developer/command-system.md`
- [x] Explains when to use it (entity titles, platform-specific strings)
- [x] Shows how it's processed by `getCommandLabel()` and `filterCommands()`

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
- `src/components/calendar/use-calendar-dnd.test.ts`
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
- [x] Phase 7: use-deep-link.ts Splitting
- [x] Phase 8: lib.rs Refactoring
- [x] Phase 9: Calendar DnD Extraction
- [x] Phase 10: Minor Improvements
  - [x] 10a. Date strings i18n
  - [x] 10c. CSS custom properties
  - [x] 10d. Recovery cleanup refactoring
  - [x] 10e. ThreadPool error handling
  - [x] 10f. QueryClient pattern docs
  - [x] 10g. get_entity_raw_content lock pattern
  - [x] 10h. VaultDirs location (reviewed, kept current)
  - [x] 10i. Unused parameter
  - [x] 10j. Dynamic label convention
