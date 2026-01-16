# Task: React Review

## Review One - Fresh Eyes

Conduct a full React Architecture & Performance Review of the entire React code base of this project. Look for any major performance issues (remember we're using React compiler and are in a Tauri desktop app) or potential Future performance issues, any patterns um which are not idiomatic of good React programming. Think like a highly experienced senior React front end engineer Who's reviewing this codebase for architecture, performance, and general cleanness and MODERN React best practices. Our main goal here is to ensure that our React code is as clean, well structured, easy to work with, easy to maintain, and performant as possible.

## Review Two - Consider Our Patterns

conduct another full review of the architecture having read `../developer/architecture-guide.md`, ``../developer/state-management.md`. in particular, look at our approach to state management, how we're dealing with state management here, and whether or not there's anything we can prove or any major or critical issues with the way that we have things architected.

---

## Review One - Completed

### Summary

The React codebase is **well-architected** with no critical issues. The patterns documented in `AGENTS.md` are being followed consistently. React Compiler is properly configured, mitigating common performance concerns.

### Issues Found

#### Medium Priority

##### 1. Dead Code in KanbanColumn

**File:** `src/components/kanban/KanbanColumn.tsx:331, 336`

```tsx
<TaskCard
  onClick={onEditClick} // Line 331 - USED
  onEditClick={onEditClick} // Line 336 - DEAD CODE
/>
```

**Analysis:** TaskCard's `onEditClick` prop is only used in the `size="compact"` variant (line 215 of TaskCard.tsx). KanbanColumn doesn't pass `size`, so it defaults to "default" - where `onEditClick` is never accessed. The prop is passed but ignored.

**Fix:** Remove `onEditClick={onEditClick}` from line 336.

**Risk:** None. Dead code removal.

---

##### 2. ViewModeStore Not Persisted

**File:** `src/store/view-mode-store.ts:48-61`

**Analysis:** User preferences for view modes (list/kanban/calendar) are lost on app restart. The `useDisplayOrderStore` uses `persist()` middleware, but `useViewModeStore` does not.

**Fix:** Add `persist()` middleware:

```tsx
import { persist } from 'zustand/middleware'

export const useViewModeStore = create<ViewModeState>()(
  devtools(
    persist(
      set => ({
        modes: defaultModes,
        setViewMode: (key, mode) =>
          set(
            state => ({ modes: { ...state.modes, [key]: mode } }),
            undefined,
            'setViewMode'
          ),
      }),
      { name: 'view-mode-storage', version: 1 }
    ),
    { name: 'view-mode-store' }
  )
)
```

**Risk:** None. New localStorage key will be created. First load uses defaults, then persists. Adding `version: 1` enables future migrations.

---

##### 3. useCommandContext Naming Confusion

**File:** `src/hooks/use-command-context.ts:153-155`

**Analysis:** Named as a hook (`useCommandContext`) but returns a module-level singleton, not reactive state. While intentional for performance (stable reference), this can confuse developers expecting hook semantics.

**Fix:** Add prominent JSDoc documentation:

```tsx
/**
 * Returns the command context singleton.
 *
 * NOTE: This is a stable-reference hook that always returns the same object.
 * It does NOT cause re-renders when values change - use for imperative
 * operations only (commands, menu handlers, keyboard shortcuts).
 *
 * For reactive access to specific values, use the underlying stores directly:
 * - Navigation: useNavigationStore(state => state.selection)
 * - UI: useUIStore(state => state.commandPaletteOpen)
 * - Tasks: useTaskDetailStore(state => state.openTaskId)
 */
export function useCommandContext(): CommandContext {
  return commandContext
}
```

**Risk:** None. Documentation only.

---

#### Minor Priority

##### 4. Inline Query Keys Not Using Factory Pattern

**Files:**

- `src/components/preferences/panes/VaultPane.tsx:23` - `['is-dev-mode']`
- `src/components/preferences/panes/QuickEntryPane.tsx:23` - `['default-quick-pane-shortcut']`

**Analysis:** These bypass the `preferencesQueryKeys` factory pattern, making key management less centralized. Both have `staleTime: Infinity` so they're effectively static queries.

**Fix:** Add to `src/services/preferences.ts`:

```tsx
export const preferencesQueryKeys = {
  all: ['preferences'] as const,
  preferences: () => [...preferencesQueryKeys.all] as const,
  devMode: () => ['is-dev-mode'] as const,
  defaultQuickPaneShortcut: () => ['default-quick-pane-shortcut'] as const,
}
```

Then update usages in VaultPane.tsx and QuickEntryPane.tsx.

**Risk:** None. Mechanical refactor.

---

### Rejected Issues

#### ~~Double Coercion in use-mobile.ts~~

Initially flagged `return !!isMobile` as unnecessary, but upon review:

```tsx
const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
// ...
return !!isMobile // Converts undefined → false on first render
```

The `!!` is **necessary** because `isMobile` starts as `undefined` before the effect runs. The double coercion correctly returns `false` during initial render. **Not an issue.**

---

### Observations (No Action Required)

1. **Inline callbacks in KanbanColumn** - React Compiler handles these automatically
2. **Cross-store coupling in task-detail-store** - Acceptable one-directional pattern with getState()
3. **Zustand selector patterns** - Correctly implemented everywhere, no destructuring anti-pattern found
4. **TanStack Query optimistic updates** - Comprehensive and correct
5. **State management onion** - Well-enforced (useState → Zustand → TanStack Query)

---

## Implementation Plan - Review One Fixes

### Step 1: Remove dead code in KanbanColumn

**File:** `src/components/kanban/KanbanColumn.tsx`

Remove line 336: `onEditClick={onEditClick}`

### Step 2: Persist ViewModeStore

**File:** `src/store/view-mode-store.ts`

1. Import `persist` from `zustand/middleware`
2. Wrap store with `persist()` middleware
3. Set `name: 'view-mode-storage'` and `version: 1`

### Step 3: Document useCommandContext

**File:** `src/hooks/use-command-context.ts`

Add comprehensive JSDoc explaining stable-reference behavior.

### Step 4: Centralize query keys

**File:** `src/services/preferences.ts`

Add `devMode` and `defaultQuickPaneShortcut` to factory.

**Files:** `src/components/preferences/panes/VaultPane.tsx`, `QuickEntryPane.tsx`

Update to use `preferencesQueryKeys.devMode()` and `preferencesQueryKeys.defaultQuickPaneShortcut()`.

### Step 5: Verify

Run `bun run check:all` to ensure no regressions.

---

## Review Two - Completed

### Summary

Reviewed the codebase against the documented patterns in `architecture-guide.md` and `state-management.md`. **No violations found.** The implementation exemplifies the documented architecture.

### Areas Reviewed

#### 1. State Layer Boundaries (Onion Architecture) ✅

| Layer          | Purpose                              | Status     |
| -------------- | ------------------------------------ | ---------- |
| TanStack Query | Persistent data (vault, preferences) | ✅ Correct |
| Zustand        | Global UI state (panels, navigation) | ✅ Correct |
| useState       | Component-local state                | ✅ Correct |

**Findings:**

- Zero persistent data stored in Zustand inappropriately
- Zero UI state stored in TanStack Query inappropriately
- All 6 Zustand stores are properly scoped:
  - `ui-store` - Panel visibility (ephemeral)
  - `navigation-store` - Back/forward history (ephemeral)
  - `task-detail-store` - Which task is open (ephemeral)
  - `task-creation-store` - Cmd+N handlers (ephemeral)
  - `view-mode-store` - View preferences (persisted ✅)
  - `display-order-store` - Visual ordering (persisted ✅)

---

#### 2. getState() Pattern Usage ✅

**Rules verified:**

- Use `getState()` in callbacks for current state (avoids render cascades)
- Use selectors for reactive subscriptions: `useStore(state => state.value)`
- No destructuring from stores

**Findings:**

- 50+ `getState()` usages reviewed - all appropriate
- Zero problematic callbacks subscribing to stores
- Zero render cascade patterns found
- Exemplary implementations in:
  - `use-command-context.ts` - Module-level singleton with getState()
  - `use-area-order.ts` - useCallback with stable deps + getState()
  - `app-commands.ts`, `task-commands.ts` - Imperative command execution

**ast-grep verification:** 0 violations of no-destructure rule

---

#### 3. CSS Visibility vs Conditional Rendering ✅

**Rule:** Use CSS visibility for stateful components (preserves state across toggles)

**Findings:**

- `MainWindow.tsx:48-79` - Correctly uses CSS `hidden` class for ResizablePanel sidebars
- All ResizablePanel usage follows the pattern
- `PreferencesDialog.tsx` uses conditional rendering for panes - acceptable because panes don't maintain internal state (data comes from TanStack Query)

---

#### 4. Cross-Store Coordination ✅

**Rules verified:**

- Stores should be focused and single-purpose
- Cross-store coordination should happen at component level (preferred)
- If stores must coordinate, use getState() (one-directional)
- No circular dependencies

**Findings:**

**Store dependency graph:**

```
task-detail-store → ui-store (one-way, justified)
All others → no store dependencies
```

**Coordination patterns:**

- Component-level coordination via selectors + effects (preferred)
- Task creation uses callback-based handler registration (no store subscriptions)
- Navigation store validates selections by reading from TanStack Query cache (read-only)

**No circular dependencies found.**

---

### Architecture Compliance Summary

| Pattern                   | Status       | Notes                                        |
| ------------------------- | ------------ | -------------------------------------------- |
| Onion state layers        | ✅ Compliant | Correct layer for each data type             |
| Selector syntax           | ✅ Compliant | No destructuring, ast-grep enforced          |
| getState() in callbacks   | ✅ Exemplary | Consistent across 50+ usages                 |
| CSS visibility for panels | ✅ Compliant | MainWindow uses hidden class correctly       |
| Cross-store coordination  | ✅ Compliant | Minimal, one-directional, component-level    |
| Single-purpose stores     | ✅ Compliant | 6 focused stores, clear responsibilities     |
| React Compiler ready      | ✅ Compliant | Proper selector usage, no manual memoization |

---

### Observations (No Action Required)

1. **Two-layer task creation handler system** - Well-designed priority system (activeListHandler → viewDefaultHandler) avoids circular dependencies

2. **Navigation store validation** - Reads from TanStack Query cache to validate selections - appropriate read-only pattern

3. **PreferencesDialog conditional rendering** - Acceptable because panes are stateless (data from hooks). Would need CSS visibility if panes gain internal state.

---

### Final Verdict

**Review Two: PASS**

The codebase is fully aligned with documented architecture patterns. No issues found. The implementation demonstrates deep understanding of React state management and Zustand best practices.
