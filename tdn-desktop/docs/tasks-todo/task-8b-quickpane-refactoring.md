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

## Phase 2: Constants and Consistency

Extract magic numbers to named constants and ensure consistency across JS and CSS.

### 2.1 Add timing constants to QuickPaneApp

**File:** `QuickPaneApp.tsx`

Add constants at the top of the file:

```typescript
// Animation and focus timing (must match quick-pane.css)
const FOCUS_DELAY_MS = 50
const EXIT_ANIMATION_MS = 100
const ENTER_ANIMATION_MS = 150
```

Replace all magic number timeouts with these constants.

### 2.2 Add CSS custom properties for animation durations

**File:** `quick-pane.css`

Add CSS variables and update keyframe references:

```css
:root {
  --quick-pane-enter-duration: 150ms;
  --quick-pane-exit-duration: 100ms;
}

.quick-pane-card {
  animation: card-enter var(--quick-pane-enter-duration) ease-out forwards;
}

.quick-pane-card.exiting {
  animation: card-exit var(--quick-pane-exit-duration) ease-in forwards;
}

/* Same for body animations */
```

**Note:** The JS and CSS values must be kept in sync manually. The constants in Phase 2.1 include comments referencing the CSS file.

### 2.3 Fix timezone bug in date formatting (BUG FIX)

**File:** `QuickPaneApp.tsx`

The current implementation has a timezone bug:

```typescript
// CURRENT (BUGGY): Returns UTC date
function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10)
}
```

`toISOString()` returns UTC time. For a user at UTC-5 at 11:00 PM local time, this returns **tomorrow's date** because it's 4:00 AM UTC.

**Fix:** Use date-fns to get the local date:

```typescript
import { format } from 'date-fns'

function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
```

This returns the user's local date, which is the correct behavior for "schedule for today."

---

## Phase 3: Interface Refactoring and Utilities

Larger refactoring to improve prop organization and extract shared utilities.

### 3.1 Extract theme utility to shared module

The `applyTheme()` function in `QuickPaneApp.tsx` duplicates logic from `ThemeProvider.tsx`.

**Create:** `src/lib/theme.ts`

```typescript
import type { Theme } from '@/lib/theme-context'

/** Default storage key for theme preference. Must match ThemeProvider default. */
export const THEME_STORAGE_KEY = 'ui-theme'

/**
 * Applies the current theme to the document root.
 * Used by standalone windows (quick pane) that don't have ThemeProvider.
 */
export function applyThemeToDocument(): void {
  const theme = localStorage.getItem(THEME_STORAGE_KEY) || 'system'
  const root = document.documentElement

  root.classList.remove('light', 'dark')

  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'
    root.classList.add(systemTheme)
  } else {
    root.classList.add(theme)
  }
}

export function getStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'dark' || stored === 'light' || stored === 'system') {
    return stored
  }
  return 'system'
}
```

**Update:** `QuickPaneApp.tsx` to import and use this utility.

**Update:** `ThemeProvider.tsx` to import `THEME_STORAGE_KEY` instead of using a hardcoded default:

```typescript
import { THEME_STORAGE_KEY } from '@/lib/theme'

// ...
storageKey = THEME_STORAGE_KEY,
```

### 3.2 Group related props in QuickPaneMetadata

**File:** `QuickPaneMetadata.tsx`

The current interface has 14 props. Refactor to use grouped prop objects:

```typescript
interface ControlledFieldState<T> {
  value: T
  onChange: (value: T) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface QuickPaneMetadataProps {
  status: ControlledFieldState<TaskStatus>
  scheduled: ControlledFieldState<string | undefined>
  due: ControlledFieldState<string | undefined>
  defer: ControlledFieldState<string | undefined>
}
```

**IMPORTANT:** Use `string | undefined` (not `string | null`) to match the `DateButton` component's `onChange` signature which uses `undefined` to mean "clear the date."

**Update:** `QuickPaneApp.tsx` call site to pass grouped objects. The conversion from internal `null` state to `undefined` props happens at the call site:

```typescript
<QuickPaneMetadata
  status={{
    value: status,
    onChange: setStatus,
    open: openPopover === 'status',
    onOpenChange: open => setOpenPopover(open ? 'status' : null),
  }}
  scheduled={{
    value: scheduled ?? undefined,
    onChange: d => setScheduled(d ?? null),
    open: openPopover === 'scheduled',
    onOpenChange: open => setOpenPopover(open ? 'scheduled' : null),
  }}
  // ... etc
/>
```

### 3.3 Group related props in QuickPaneFooter

**File:** `QuickPaneFooter.tsx`

Similar refactoring for the 12-prop interface:

```typescript
interface QuickPaneFooterProps {
  onCancel: () => void
  onSave: () => void
  saveDisabled: boolean
  project: {
    value: string | undefined
    onChange: (id: string | undefined) => void
    options: Project[]
    open: boolean
    onOpenChange: (open: boolean) => void
  }
  area: {
    value: string | undefined
    onChange: (id: string | undefined) => void
    options: Area[]
    open: boolean
    onOpenChange: (open: boolean) => void
  }
}
```

**Note:** The filtering logic for active projects/areas stays in `QuickPaneFooter` - React Compiler handles memoization automatically per project patterns.

### 3.4 Add error boundary to quick-pane-main

**Create:** `src/components/quick-pane/QuickPaneErrorBoundary.tsx`

A minimal error boundary for the quick pane. Unlike the main app's `ErrorBoundary`, this doesn't need crash recovery - just a simple message since the user can dismiss and reopen.

```typescript
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Minimal error boundary for quick pane.
 * Shows a simple error message - user can press Escape to dismiss.
 */
export class QuickPaneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in dev for debugging
    if (import.meta.env.DEV) {
      console.error('Quick pane error:', error, errorInfo)
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center p-4">
          <div className="text-center">
            <p className="text-destructive font-medium">Something went wrong</p>
            <p className="text-sm text-muted-foreground mt-1">
              Press Escape to close
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**Update:** `quick-pane-main.tsx`:

```typescript
import ReactDOM from 'react-dom/client'
import QuickPaneApp from './components/quick-pane/QuickPaneApp'
import { QuickPaneErrorBoundary } from './components/quick-pane/QuickPaneErrorBoundary'
import './quick-pane.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <QuickPaneErrorBoundary>
    <QuickPaneApp />
  </QuickPaneErrorBoundary>
)
```

---

## Phase 4: Extract Keyboard Hook

The keyboard handling logic in `QuickPaneApp.tsx` is 80+ lines. Extract to a custom hook for better organization and testability.

### 4.1 Create useQuickPaneKeyboard hook

**Create:** `src/components/quick-pane/useQuickPaneKeyboard.ts`

```typescript
import * as React from 'react'
import { matchesKeyboardEvent } from '@/lib/shortcuts'

// Import or define shortcuts and PopoverType
import type { PopoverType } from './QuickPaneApp'

interface UseQuickPaneKeyboardOptions {
  /** Called when Escape pressed with no popover open */
  onDismiss: () => Promise<void>
  /** Called when Cmd+Enter pressed */
  onSubmit: () => Promise<void>
  /** Called when Cmd+Shift+Enter pressed */
  onToggleBody: (show: boolean) => void
  /** Called when Cmd+T pressed */
  onSetScheduledToday: () => void
  /** Called when a popover shortcut is pressed */
  onOpenPopover: (popover: PopoverType) => void
  /** Called when Escape pressed with a popover open */
  onClosePopover: () => void
  /** Called before opening a popover to capture current focus */
  captureCurrentFocus: () => void
  /** Current open popover (null if none) */
  openPopover: PopoverType
  /** Whether body section is currently visible */
  showBody: boolean
  /** Parsed shortcut definitions */
  shortcuts: {
    setScheduledToday: ReturnType<
      typeof import('@/lib/shortcuts').parseShortcut
    >
    openScheduled: ReturnType<typeof import('@/lib/shortcuts').parseShortcut>
    openDue: ReturnType<typeof import('@/lib/shortcuts').parseShortcut>
    openDefer: ReturnType<typeof import('@/lib/shortcuts').parseShortcut>
    openStatus: ReturnType<typeof import('@/lib/shortcuts').parseShortcut>
  }
}

/**
 * Handles all keyboard shortcuts for the quick pane.
 * Uses capture phase to intercept events before popovers.
 */
export function useQuickPaneKeyboard({
  onDismiss,
  onSubmit,
  onToggleBody,
  onSetScheduledToday,
  onOpenPopover,
  onClosePopover,
  captureCurrentFocus,
  openPopover,
  showBody,
  shortcuts,
}: UseQuickPaneKeyboardOptions): void {
  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Escape - close popover or dismiss pane
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()

        if (openPopover) {
          onClosePopover()
        } else {
          await onDismiss()
        }
        return
      }

      // Cmd+T - set scheduled to today
      if (matchesKeyboardEvent(shortcuts.setScheduledToday, e)) {
        e.preventDefault()
        onSetScheduledToday()
        return
      }

      // Cmd+D - open scheduled date picker
      if (matchesKeyboardEvent(shortcuts.openScheduled, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('scheduled')
        return
      }

      // Cmd+Shift+D - open due date picker
      if (matchesKeyboardEvent(shortcuts.openDue, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('due')
        return
      }

      // Ctrl+Shift+Cmd+D - open defer date picker
      if (matchesKeyboardEvent(shortcuts.openDefer, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('defer')
        return
      }

      // Cmd+S - open status picker
      if (matchesKeyboardEvent(shortcuts.openStatus, e)) {
        e.preventDefault()
        captureCurrentFocus()
        onOpenPopover('status')
        return
      }

      // Cmd+Shift+Enter - toggle body
      if (e.key === 'Enter' && e.metaKey && e.shiftKey) {
        e.preventDefault()
        onToggleBody(!showBody)
        return
      }

      // Cmd+Enter - submit
      if (e.key === 'Enter' && e.metaKey && !e.shiftKey) {
        e.preventDefault()
        await onSubmit()
        return
      }
    }

    // Capture phase to handle before any popover gets the event
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    onDismiss,
    onSubmit,
    onToggleBody,
    onSetScheduledToday,
    onOpenPopover,
    onClosePopover,
    captureCurrentFocus,
    openPopover,
    showBody,
    shortcuts,
  ])
}
```

### 4.2 Update QuickPaneApp to use the hook

**File:** `QuickPaneApp.tsx`

Export `PopoverType` for use by the hook, then replace the inline useEffect:

```typescript
// Export for use by useQuickPaneKeyboard
export type PopoverType =
  | 'status'
  | 'project'
  | 'area'
  | 'scheduled'
  | 'due'
  | 'defer'
  | null

// ... in component:

useQuickPaneKeyboard({
  onDismiss: handleDismiss,
  onSubmit: handleSubmit,
  onToggleBody: show => {
    setShowBody(show)
    setTimeout(() => {
      ;(show ? bodyRef : titleRef).current?.focus()
    }, FOCUS_DELAY_MS)
  },
  onSetScheduledToday: () => setScheduled(getTodayISO()),
  onOpenPopover: popover => {
    captureCurrentFocus()
    setOpenPopover(popover)
  },
  onClosePopover: () => setOpenPopover(null),
  captureCurrentFocus,
  openPopover,
  showBody,
  shortcuts: SHORTCUTS,
})
```

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
| 2     | Constants and Consistency | Timing constants, **timezone bug fix**                                                 |
| 3     | Interface Refactoring     | Grouped props, theme utility, error boundary                                           |
| 4     | Extract Keyboard Hook     | New hook with explicit dependencies                                                    |
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
