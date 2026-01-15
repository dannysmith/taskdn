# Task 8b: Quick Pane Code Refactoring

## Overview

Following completion of the Quick Entry Pane feature (Task 8), this task covers cleanup, refactoring, and documentation improvements identified during code review.

**Goal:** Improve maintainability, remove duplication, enhance consistency, and ensure documentation is complete.

**Files involved:**

- `src/components/quick-pane/QuickPaneApp.tsx`
- `src/components/quick-pane/QuickPaneCard.tsx`
- `src/components/quick-pane/QuickPaneTitle.tsx`
- `src/components/quick-pane/QuickPaneBody.tsx`
- `src/components/quick-pane/QuickPaneMetadata.tsx`
- `src/components/quick-pane/QuickPaneFooter.tsx`
- `src/components/quick-pane/QuickPaneErrorBoundary.tsx` (new)
- `src/components/quick-pane/useQuickPaneKeyboard.ts` (new)
- `src/quick-pane.css`
- `src/quick-pane-main.tsx`
- `src/lib/theme.ts` (new)
- `docs/developer/quick-panes.md`
- `src/components/preferences/panes/QuickEntryPane.tsx`
- `locales/en.json`

---

## Phase 1: Quick Cleanup ✅ COMPLETE

Small, isolated fixes that don't change architecture.

### 1.1 Remove unused `animating` state in QuickPaneBody ✅

The `animating` state was set but never read for any purpose.

**File:** `QuickPaneBody.tsx`

**Changes:**

- Removed `const [animating, setAnimating] = React.useState(false)`
- Removed all `setAnimating()` calls
- Simplified the useEffect to only manage `shouldRender`

### 1.2 Remove duplicate focus handling ✅

Focus for the body textarea was handled in two places. Removed the useEffect from `QuickPaneBody.tsx` - focus is now managed solely by the parent (`QuickPaneApp.tsx`).

**Rationale:** Parent components should own focus management for consistent behavior. The body component is now a controlled, presentational component.

### 1.3 Move type definitions to file top ✅

**File:** `QuickPaneApp.tsx`

Moved `PopoverType` and `FocusTarget` type definitions from inside the component to the top of the file with JSDoc comments.

### 1.4 Fix dark mode colors in SearchableSelect ✅

**File:** `src/components/ui/searchable-select.tsx`

Fixed pre-existing bug where selected values and chevron icons were black in dark mode due to missing explicit color classes.

**Changes:**

- Added `text-foreground` class when a value is selected
- Changed chevron from `opacity-50` to `text-muted-foreground`

---

## Phase 2: Constants and Consistency ✅ COMPLETE

Extracted magic numbers to named constants and added CSS custom properties.

### 2.1 Add timing constants to QuickPaneApp ✅

**File:** `QuickPaneApp.tsx`

Added constants at the top of the file:

```typescript
// Animation timing (must match quick-pane.css custom properties)
const FOCUS_DELAY_MS = 50
const EXIT_ANIMATION_MS = 100
```

Replaced all magic number timeouts with these constants.

### 2.2 Add CSS custom properties for animation durations ✅

**File:** `quick-pane.css`

Added CSS variables and updated animation references:

```css
:root {
  --quick-pane-enter-duration: 150ms;
  --quick-pane-exit-duration: 100ms;
}
```

Updated `.quick-pane-card`, `.quick-pane-card.exiting`, `.quick-pane-body-enter`, and `.quick-pane-body-exit` to use variables.

Added comment in `QuickPaneBody.tsx` referencing the CSS timing.

### 2.3 Fix timezone bug in date formatting ✅

**File:** `QuickPaneApp.tsx`

Fixed bug where `toISOString().slice(0, 10)` returned UTC date instead of local date. Now uses date-fns:

```typescript
import { format } from 'date-fns'

function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
```

This returns the user's local date, which is correct for "schedule for today."

---

## Phase 3: Interface Refactoring and Utilities ✅ COMPLETE

Improved prop organization and extracted shared utilities.

### 3.1 Extract theme utility to shared module ✅

Created `src/lib/theme.ts` with shared theme utilities:

- `THEME_STORAGE_KEY` constant
- `applyThemeToDocument()` function for standalone windows
- `getStoredTheme()` helper

Updated `ThemeProvider.tsx` to import `THEME_STORAGE_KEY` instead of hardcoding.
Updated `QuickPaneApp.tsx` to use `applyThemeToDocument()` from the shared module.

### 3.2 Group related props in QuickPaneMetadata ✅

Refactored from 14 flat props to 4 grouped prop objects using `ControlledFieldState<T>` interface:

- `status: ControlledFieldState<TaskStatus>`
- `scheduled: ControlledFieldState<string | undefined>`
- `due: ControlledFieldState<string | undefined>`
- `defer: ControlledFieldState<string | undefined>`

### 3.3 Group related props in QuickPaneFooter ✅

Refactored from 12 flat props to grouped objects:

- `project: { value, onChange, options, open, onOpenChange }`
- `area: { value, onChange, options, open, onOpenChange }`

### 3.4 Add error boundary to quick-pane-main ✅

Created `src/components/quick-pane/QuickPaneErrorBoundary.tsx` - a minimal error boundary that shows a simple error message. User can press Escape to dismiss.

Updated `quick-pane-main.tsx` to wrap `QuickPaneApp` with the error boundary.

---

## Phase 4: Extract Keyboard Hook ✅ COMPLETE

Extracted keyboard handling logic to a custom hook for better organization.

### 4.1 Create useQuickPaneKeyboard hook ✅

Created `src/components/quick-pane/useQuickPaneKeyboard.ts` with:

- Explicit options interface with JSDoc comments
- Handles all keyboard shortcuts: Escape, Cmd+T, Cmd+D, Cmd+Shift+D, Cmd+S, Cmd+Shift+Enter, Cmd+Enter
- Uses capture phase to intercept events before popovers
- Full dependency array for the useEffect

### 4.2 Update QuickPaneApp to use the hook ✅

- Exported `PopoverType` for use by the hook
- Replaced 80+ line inline useEffect with `useQuickPaneKeyboard()` call
- Removed unused `matchesKeyboardEvent` import

---

## Phase 5: Documentation Updates

### 5.1 Update developer documentation

**File:** `docs/developer/quick-panes.md`

The existing documentation covers architecture well but needs updates for the actual React component structure. Add a new section after "Customization":

```markdown
## Component Structure

The quick pane UI is split into focused, single-responsibility components:
```

QuickPaneApp.tsx - Main component, state management, keyboard handling
├── QuickPaneCard.tsx - Card container with entry/exit animations
├── QuickPaneTitle.tsx - Title input with visual checkbox
├── QuickPaneBody.tsx - Collapsible notes textarea
├── QuickPaneMetadata.tsx - Status pill and date buttons
└── QuickPaneFooter.tsx - Project/area selectors and action buttons

```

### Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| QuickPaneApp | Form state, keyboard shortcuts, submission logic, popover coordination |
| QuickPaneCard | Visual container, CSS animations for show/hide |
| QuickPaneTitle | Title textarea with auto-resize, visual checkbox |
| QuickPaneBody | Collapsible notes section with expand/collapse animation |
| QuickPaneMetadata | Status and date selection (controlled popovers) |
| QuickPaneFooter | Project/area selection, Cancel/Save buttons |

### Popover Coordination

Only one popover can be open at a time. The parent (`QuickPaneApp`) owns `openPopover` state and passes controlled `open`/`onOpenChange` props to children. This prevents multiple overlapping popovers and enables keyboard shortcuts to open specific pickers.

### Focus Management

Focus is managed by the parent component (`QuickPaneApp`). Child components receive refs but don't manage their own focus. This ensures consistent behavior when toggling sections or closing popovers.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Escape` | Close popover (if open) or dismiss pane |
| `Cmd+Enter` | Save task and dismiss |
| `Cmd+Shift+Enter` | Toggle notes section |
| `Cmd+T` | Set scheduled date to today |
| `Cmd+D` | Open scheduled date picker |
| `Cmd+Shift+D` | Open due date picker |
| `Ctrl+Shift+Cmd+D` | Open defer date picker |
| `Cmd+S` | Open status picker |
```

### 5.2 Enhance Quick Entry preferences pane

**File:** `src/components/preferences/panes/QuickEntryPane.tsx`

Add additional help content explaining available features:

```tsx
<SettingsSection title={t('preferences.quickEntry.features')}>
  <div className="text-sm text-muted-foreground space-y-2">
    <p>{t('preferences.quickEntry.featuresIntro')}</p>
    <ul className="list-disc list-inside space-y-1">
      <li>{t('preferences.quickEntry.featureTitle')}</li>
      <li>{t('preferences.quickEntry.featureNotes')}</li>
      <li>{t('preferences.quickEntry.featureStatus')}</li>
      <li>{t('preferences.quickEntry.featureDates')}</li>
      <li>{t('preferences.quickEntry.featureProjectArea')}</li>
    </ul>
  </div>
</SettingsSection>

<SettingsSection title={t('preferences.quickEntry.keyboardShortcutsInPane')}>
  <div className="text-sm text-muted-foreground">
    <p className="mb-2">{t('preferences.quickEntry.shortcutsIntro')}</p>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
      <span>⌘ Enter</span><span>{t('preferences.quickEntry.shortcutSave')}</span>
      <span>⌘ ⇧ Enter</span><span>{t('preferences.quickEntry.shortcutToggleNotes')}</span>
      <span>⌘ T</span><span>{t('preferences.quickEntry.shortcutToday')}</span>
      <span>⌘ D</span><span>{t('preferences.quickEntry.shortcutScheduled')}</span>
      <span>⌘ ⇧ D</span><span>{t('preferences.quickEntry.shortcutDue')}</span>
      <span>⌘ S</span><span>{t('preferences.quickEntry.shortcutStatus')}</span>
      <span>Escape</span><span>{t('preferences.quickEntry.shortcutDismiss')}</span>
    </div>
  </div>
</SettingsSection>
```

### 5.3 Add translation strings

**File:** `locales/en.json`

Add the new translation keys for the preferences pane content.

---

## Verification

After each phase, run:

```bash
bun run check:all
```

This ensures:

- TypeScript compiles without errors
- ESLint rules pass
- Prettier formatting is correct
- ast-grep architectural rules pass

---

## Summary

| Phase | Description               | Key Changes                                                                            |
| ----- | ------------------------- | -------------------------------------------------------------------------------------- |
| 1 ✅  | Quick Cleanup             | Removed unused state, consolidated focus handling, moved types, fixed dark mode colors |
| 2 ✅  | Constants and Consistency | Timing constants, CSS custom properties, timezone bug fix                              |
| 3 ✅  | Interface Refactoring     | Grouped props, theme utility, error boundary                                           |
| 4 ✅  | Extract Keyboard Hook     | New hook with explicit dependencies                                                    |
| 5     | Documentation Updates     | Component docs, preferences help, translations                                         |

---

## Review Notes

This plan was reviewed for potential issues. Key changes from the original:

1. **Removed useMemo recommendation** - React Compiler handles memoization automatically per project patterns
2. **Reframed date-fns change as bug fix** - The original `toISOString()` approach returns UTC date, not local date
3. **Fixed type mismatch** - Use `string | undefined` (not `string | null`) to match `DateButton` signature
4. **Custom error boundary** - Simple implementation instead of external package dependency
5. **Shared theme storage key** - Export from `theme.ts` to prevent drift between files
6. **Explicit hook dependencies** - Full dependency array documented for the keyboard hook
