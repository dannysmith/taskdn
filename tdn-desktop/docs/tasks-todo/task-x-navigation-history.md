# Navigation History (Back/Forward)

## Overview

Implement browser-style back/forward navigation using `Cmd+[` and `Cmd+]`. This is most useful when clicking through from one view to another (e.g., clicking a project name in the week view to open the project view) and wanting to return.

## Requirements

### Shortcuts

- `Cmd+[` (macOS) / `Ctrl+[` (Windows/Linux) — Go back
- `Cmd+]` (macOS) / `Ctrl+]` (Windows/Linux) — Go forward
- These match standard macOS app conventions (Safari, Obsidian, VS Code)

### Behavior

- Navigating to a new view pushes the current selection onto the history stack
- Going back pops from history and pushes current to future stack
- Going forward pops from future and pushes current to history
- Navigating to a **new** view clears the future stack (standard browser behavior)
- Navigating to the **same** view (e.g., clicking the already-selected sidebar item) should not create a history entry
- History should be bounded (50 entries is plenty, ~5KB max memory)

### Commands

Register `go-back` and `go-forward` in the command system:
- Available via keyboard shortcuts
- Optionally available in command palette (with `isAvailable` check for `canGoBack`/`canGoForward`)
- Consider adding back/forward buttons to the toolbar (optional, lower priority)

### Edge Case: Deleted Items

When navigating back to a project or area that no longer exists:
- Skip the invalid entry and try the next one in history
- Continue recursively until a valid selection is found or history is exhausted
- This keeps the UX simple — user never sees a broken state

## Approach: Custom History Stack in Zustand

Extend `navigation-store.ts` to track history. No external dependencies needed.

### State Shape

```typescript
interface NavigationState {
  selection: Selection | null
  history: Selection[]      // Past selections (stack)
  future: Selection[]       // Forward stack (cleared on new navigation)

  navigate: (selection: Selection) => void  // Replaces setSelection
  goBack: () => void
  goForward: () => void
  canGoBack: boolean        // Computed
  canGoForward: boolean     // Computed
}
```

### Key Implementation Details

1. **Replace `setSelection` with `navigate`** — All existing call sites need updating
2. **Duplicate prevention** — Compare selections before pushing (same type + same id = skip)
3. **Bounded history** — Slice to max length on push
4. **Invalid selection handling** — Check if project/area exists before applying; skip if not

## Desktop App Conventions (Research)

Standard shortcuts across desktop apps:
- **VS Code**: `Ctrl+-` / `Ctrl+Shift+-` (Windows/Linux), navigation history per workspace
- **Obsidian**: `Cmd+[` / `Cmd+]` (macOS), per-pane history in multi-pane layouts
- **Figma**: Lacks this feature entirely (users constantly request it)

Common patterns:
- History bounded at 20-100 entries
- Per-window scope (not per-pane for simple apps like ours)
- No duplicate consecutive entries

## Alternatives Considered

### Zundo (Zustand Temporal Middleware)

Rejected. Zundo is designed for undo/redo of state mutations (edit operations), not navigation history. The semantics differ — `undo` reverts changes, whereas `goBack` tracks view transitions. Would work but adds conceptual mismatch and unnecessary dependency.

### Separate Navigation History Store

Rejected. Adding 3-4 properties to navigation-store doesn't warrant a separate store. Separation adds coordination overhead without clear benefit.

### React Router / TanStack Router

Rejected. These are URL-based routing solutions for web apps using browser history APIs. Tauri desktop apps don't have browser navigation — would require fighting the tools rather than using them as intended.

## Implementation Checklist

- [ ] Extend `navigation-store.ts` with history/future arrays and new actions
- [ ] Add `selectionsEqual` helper for duplicate prevention
- [ ] Add validity check helper (does project/area still exist?)
- [ ] Update all `setSelection` call sites to use `navigate`
- [ ] Register `go-back` and `go-forward` commands with shortcuts
- [ ] Add i18n strings for command labels
- [ ] Test: basic back/forward flow
- [ ] Test: navigating to same view doesn't create entry
- [ ] Test: new navigation clears future stack
- [ ] Test: back to deleted project skips to next valid entry
