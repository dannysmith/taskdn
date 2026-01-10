# Keyboard Shortcut System Cleanup

## Summary

The keyboard shortcut system has grown organically with shortcuts defined in multiple places: keyboard handlers, command definitions, and menu accelerators. This creates maintenance burden and inconsistency. The solution is to make the **command system the single source of truth** for all global shortcuts.

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete list of commands, their shortcuts, and where they appear (palette, menus, context menus). This task focuses on the **technical implementation** of the shortcut system.

## Current Architecture (Problems)

### Shortcut Definitions in 4 Places

| Location                            | Format                             | What it does                                     |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------ |
| `use-keyboard-shortcuts.ts`         | Raw key checks (`e.key === ','`)   | Actually handles keyboard events                 |
| `navigation-commands.ts`            | Display strings (`⌘+1`)            | Shows in command palette (not used for matching) |
| `menu.ts`                           | Tauri accelerators (`CmdOrCtrl+1`) | Native menu accelerators                         |
| `CommandPalette.tsx`, `sidebar.tsx` | Raw key checks                     | Isolated component handlers                      |

### Consequences

1. **Duplication**: Adding Cmd+3 requires changes in 3 files
2. **Drift risk**: Keyboard handler and command definitions can get out of sync
3. **Hidden shortcuts**: Cmd+K and Cmd+B exist but aren't discoverable in command palette
4. **Dead commands**: Window commands (Cmd+W, Cmd+M, F11) are defined but have no keyboard handlers
5. **Bypass**: Keyboard handlers call store directly, not through command system

### Current Shortcut Coverage

| Shortcut | Keyboard                      | Menu | Command      | Status              |
| -------- | ----------------------------- | ---- | ------------ | ------------------- |
| Cmd+,    | ✓ `use-keyboard-shortcuts.ts` | ✓    | ✓            | Working             |
| Cmd+1    | ✓ `use-keyboard-shortcuts.ts` | ✓    | ✓            | Working             |
| Cmd+2    | ✓ `use-keyboard-shortcuts.ts` | ✓    | ✓            | Working             |
| Cmd+N    | ✓ `use-keyboard-shortcuts.ts` | ✗    | ✗            | Working (partial)   |
| Cmd+K    | ✓ `CommandPalette.tsx`        | ✗    | ✗            | Hidden              |
| Cmd+B    | ✓ `sidebar.tsx`               | ✗    | ✗            | DEAD CODE - REMOVE  |
| Cmd+W    | ✗                             | ✗    | ✓ (declared) | Needs testing       |
| Cmd+M    | ✗                             | ✗    | ✓ (declared) | Needs testing       |
| F11      | ✗                             | ✗    | ✓ (declared) | Needs testing       |

## Target Architecture

### Single Source of Truth: Commands

```
┌─────────────────────────────────────────────────────────────────┐
│                    Command Registry                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Command { id, shortcut: 'CmdOrCtrl+1', execute, ... }   │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌────────────┐    ┌────────────┐    ┌────────────────┐
    │ Keyboard   │    │ Command    │    │ Native Menu    │
    │ Handler    │    │ Palette    │    │ (Tauri)        │
    │            │    │            │    │                │
    │ matches    │    │ displays   │    │ uses same      │
    │ shortcut → │    │ shortcut   │    │ accelerator    │
    │ execute()  │    │ + execute  │    │ string         │
    └────────────┘    └────────────┘    └────────────────┘
```

**Key principle**: Commands define shortcuts once. Everything else derives from that.

### Shortcut Format

Use Tauri's accelerator format as the canonical format:

```typescript
// In command definitions
shortcut: 'CmdOrCtrl+1'    // Cross-platform primary modifier
shortcut: 'CmdOrCtrl+,'    // Works with special chars
shortcut: 'F11'            // Function keys (no modifier)
shortcut: 'CmdOrCtrl+Shift+Z'  // With shift

// Derive display format for UI
formatForDisplay('CmdOrCtrl+1') → '⌘1' (Mac) or 'Ctrl+1' (Windows)
```

This format:

- Already used by Tauri menus
- Handles cross-platform modifiers
- Parseable for keyboard event matching
- Can generate display strings

### New Files

```
src/lib/shortcuts/
├── types.ts           # ParsedShortcut interface
├── parser.ts          # parseShortcut(), formatForDisplay()
├── matcher.ts         # matchesKeyboardEvent()
└── index.ts           # Re-exports
```

### Implementation Approach

#### 1. Shortcut Utilities (`src/lib/shortcuts/`)

```typescript
// types.ts
interface ParsedShortcut {
  key: string // '1', ',', 'F11', 'Escape'
  cmdOrCtrl: boolean // CmdOrCtrl modifier
  shift: boolean
  alt: boolean
}

// parser.ts
function parseShortcut(shortcut: string): ParsedShortcut
// 'CmdOrCtrl+Shift+1' → { key: '1', cmdOrCtrl: true, shift: true, alt: false }

function formatForDisplay(shortcut: string, platform: 'mac' | 'other'): string
// 'CmdOrCtrl+1' → '⌘1' (mac) or 'Ctrl+1' (other)

// matcher.ts
function matchesKeyboardEvent(
  shortcut: ParsedShortcut,
  event: KeyboardEvent
): boolean
// Checks event.key, metaKey/ctrlKey, shiftKey, altKey
```

#### 2. Update Command Definitions

Change shortcut format from display to parseable:

```typescript
// navigation-commands.ts
{
  id: 'toggle-left-sidebar',
  shortcut: 'CmdOrCtrl+1',  // Was: '⌘+1'
  // ...
}
```

**Design Decision**: Use toggle commands (`toggle-left-sidebar`) rather than show/hide pairs. This simplifies the codebase - no need for `isAvailable` checks to pick between show/hide variants. The existing separate show/hide commands in `navigation-commands.ts` will be consolidated into single toggle commands.

#### 3. Unified Keyboard Handler

Replace `use-keyboard-shortcuts.ts` with command-driven approach:

```typescript
// use-global-shortcuts.ts
export function useGlobalShortcuts(context: CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input/textarea/select
      if (isEditableElement(document.activeElement)) return

      // Skip if already handled by component
      if (e.defaultPrevented) return

      // Get fresh list of available commands (isAvailable filtering is dynamic)
      const commands = getAllCommands(context)
      const match = commands.find(
        cmd =>
          cmd.shortcut && matchesKeyboardEvent(parseShortcut(cmd.shortcut), e)
      )

      if (match) {
        e.preventDefault()
        executeCommand(match.id, context)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [context])
}

// Helper to check if element should exclude shortcuts
function isEditableElement(el: Element | null): boolean {
  if (!el) return false
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}
```

**Note**: Commands are fetched fresh on each keypress (not cached) because `isAvailable()` depends on dynamic state. With ~20 commands, this is negligible overhead.

#### 4. Menu Integration

Menu can use the same shortcut strings directly (they're already in Tauri format):

```typescript
// menu.ts - option A: derive from commands
const toggleLeftSidebar = getCommand('toggle-left-sidebar')
await MenuItem.new({
  text: t('menu.toggleLeftSidebar'),
  accelerator: toggleLeftSidebar.shortcut, // 'CmdOrCtrl+1'
  action: () => executeCommand('toggle-left-sidebar', context),
})

// menu.ts - option B: keep menu separate but use executeCommand
// (simpler, maintains menu-specific concerns)
await MenuItem.new({
  text: t('menu.toggleLeftSidebar'),
  accelerator: 'CmdOrCtrl+1',
  action: () => executeCommand('toggle-left-sidebar', context),
})
```

Option B is recommended - menu can have items without commands, and this keeps things simple while still routing through the command system.

#### 5. Consolidate Scattered Handlers

**Cmd+K (Command Palette)**:

- Add `toggle-command-palette` command with shortcut `CmdOrCtrl+K`
- Remove keyboard handler from `CommandPalette.tsx`

**Cmd+B (Sidebar)** - REMOVE:

- **CONFIRMED DEAD CODE**: The handler toggles `SidebarProvider`'s internal `open` state, which is NOT connected to any visible UI. The actual sidebar visibility is controlled by `useUIStore.leftSidebarVisible`.
- Remove the entire `useEffect` block from `sidebar.tsx:94-108`

**Cmd+N (New Task)** - PRESERVE CAREFULLY:

- Add `create-task` command with shortcut `CmdOrCtrl+N`
- **CRITICAL**: Must route through `useTaskCreationStore.getState().triggerCreate()`
- **CRITICAL**: Must check `e.defaultPrevented` before handling (component override)
- Component handlers (TaskList, OrderedItemList) continue to use `stopPropagation`
- See "CRITICAL: Cmd+N Task Creation Flow" in Edge Cases section

## Critical Issues to Verify First

Before implementing, these issues need investigation and resolution:

### 1. Double-Firing Risk (MUST VERIFY)

**Problem**: Shortcuts like Cmd+1 have BOTH a menu accelerator AND a React keyboard handler.

```
User presses Cmd+1
    ↓
Tauri menu intercepts → handleToggleLeftSidebar() → toggles sidebar
    ↓
Does event propagate to React?
    ↓
If yes → use-keyboard-shortcuts.ts → toggles sidebar AGAIN
    ↓
Net result: sidebar unchanged (toggle × 2)
```

**Unknown**: Does Tauri's menu system prevent keyboard events from reaching the webview?

**Action required**: Test empirically before implementing:

1. Add console.log to both handlers
2. Press Cmd+1, observe which handlers fire
3. If both fire, we have a bug that's been hidden by double-toggle

If accelerators DO intercept: Remove React keyboard handlers for shortcuts that have menu items.
If accelerators DON'T intercept: Remove menu accelerators or coordinate to avoid double-handling.

### 2. Set vs Toggle Inconsistency (BUG)

**Current behavior for Cmd+,**:

- Menu handler: `setPreferencesOpen(true)` — idempotent SET
- React handler: `commandContext.openPreferences()` → `togglePreferences()` — TOGGLE

If both handlers fire (see issue #1), behavior depends on order:

- Menu first, React second: preferences opens then closes
- React first, Menu second: preferences opens and stays

**Fix**: Use consistent approach — either all toggle or all set.

### 3. SidebarProvider Cmd+B is Dead Code (CONFIRMED)

**Finding**: The Cmd+B handler in `sidebar.tsx` toggles SidebarProvider's internal `open` state, which is NOT connected to actual UI visibility (controlled by `useUIStore.leftSidebarVisible`).

**Action**: Remove the Cmd+B handler from `sidebar.tsx:95-108` entirely. The SidebarProvider's internal state is unused. Also remove it from the "Current Shortcut Coverage" table above.

### 4. Window Commands - Add to Menus, Test Manually

**Finding**: Cmd+W, Cmd+M, F11 are defined in `window-commands.ts` but have no keyboard handlers.

- On macOS, Cmd+W (close), Cmd+M (minimize), Cmd+H (hide) may be handled natively
- Tauri apps with native decorations often get these for free

**Action**: Add window commands to the app menus (Task 11). Test manually whether they work via native handling. If they don't work and there's an easy Tauri solution, implement it. If not, remove them.

### 5. Input Field Exclusion is Incomplete

**Current exclusion** (`use-keyboard-shortcuts.ts:47-54`):

```typescript
activeEl instanceof HTMLInputElement ||
  activeEl instanceof HTMLTextAreaElement ||
  (activeEl instanceof HTMLElement && activeEl.isContentEditable)
```

**Missing**:

- `<select>` elements — keyboard shortcuts will fire when select is focused
- Possibly modals/dialogs that should trap focus

**Fix**: Add `HTMLSelectElement` to exclusion list.

## Corrected Implementation Approach

### Dynamic Command Matching

The keyboard handler should check command availability on each keypress (not cache at mount time), since `isAvailable()` depends on dynamic state.

```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  // Get fresh list of available commands each time
  const commands = getAllCommands(context) // Already filtered by isAvailable
  const match = commands.find(
    cmd => cmd.shortcut && matchesKeyboardEvent(parseShortcut(cmd.shortcut), e)
  )
  if (match) {
    e.preventDefault()
    executeCommand(match.id, context)
  }
}
```

With ~20 commands, iterating on each keypress is fine (< 1ms).

> **Note**: Since we're using toggle commands instead of show/hide pairs, the `isAvailable` pattern is mostly used for task-specific commands (requiring a selected task), not for sidebar toggles.

### Menu Integration Decision

**Recommendation changed**: If accelerators intercept keyboard events (need to verify), then:

- Menu accelerators handle keyboard shortcuts
- React keyboard handler is ONLY for shortcuts WITHOUT menu items (Cmd+K, Cmd+N)
- This avoids duplicate handlers

If accelerators don't intercept, use React keyboard handler for everything and remove menu accelerators.

## Implementation Steps

### Phase 0: Verification (DO THIS FIRST)

> **Note**: Despite the theoretical double-firing concern documented above, all shortcuts (Cmd+1, Cmd+2, Cmd+,) currently work correctly from menu, keyboard, and command palette. The empirical testing below will confirm whether both handlers fire (with double-toggle canceling out) or only one fires.

#### Step 0.1: Test Double-Firing Behavior

Add logging to determine if BOTH menu and keyboard handlers fire:

1. **Add logging to `src/lib/menu.ts`** (temporarily):
   ```typescript
   function handleToggleLeftSidebar(): void {
     console.log('🍎 MENU: handleToggleLeftSidebar fired')
     logger.info('Toggle Left Sidebar menu item clicked')
     useUIStore.getState().toggleLeftSidebar()
   }

   function handleOpenPreferences(): void {
     console.log('🍎 MENU: handleOpenPreferences fired')
     logger.info('Preferences menu item clicked')
     useUIStore.getState().setPreferencesOpen(true)
   }
   ```

2. **Add logging to `src/hooks/use-keyboard-shortcuts.ts`** (temporarily):
   ```typescript
   case ',': {
     console.log('⌨️ KEYBOARD: Cmd+, handler fired')
     e.preventDefault()
     commandContext.openPreferences()
     break
   }
   case '1': {
     console.log('⌨️ KEYBOARD: Cmd+1 handler fired')
     e.preventDefault()
     // ... rest of handler
   }
   ```

3. **Test each shortcut**:
   - Press Cmd+1, Cmd+2, Cmd+, via keyboard
   - Click the same items in the application menu
   - Open console and note which log messages appear for each action

4. **Document the results** below before proceeding:
   - [x] Cmd+1 keyboard: Only ⌨️ KEYBOARD handler fired
   - [x] Cmd+1 menu click: Only 🍎 MENU handler fired
   - [x] Cmd+, keyboard: Only ⌨️ KEYBOARD handler fired
   - [x] Cmd+, menu click: Only 🍎 MENU handler fired

**FINDING (2026-01-10)**: Menu accelerators are **display-only** in Tauri. They don't intercept keyboard events. React keyboard handlers handle all shortcuts, menu click handlers fire only on menu clicks. No double-firing exists.

5. **Remove the logging** after testing.

**Decision tree based on results**:
- If ONLY menu handler fires for keyboard shortcuts → Menu accelerators intercept events, React handlers redundant
- If ONLY keyboard handler fires → Menu accelerators are display-only, React handles all shortcuts
- If BOTH fire → We have hidden double-toggle bug, need to remove one

#### Step 0.2: Quick Fixes (Do These Regardless)

1. **Remove dead Cmd+B handler** from `sidebar.tsx:94-108` (the entire useEffect block with `SIDEBAR_KEYBOARD_SHORTCUT`)
2. **Add `HTMLSelectElement`** to exclusion in `use-keyboard-shortcuts.ts`:
   ```typescript
   if (
     activeEl instanceof HTMLInputElement ||
     activeEl instanceof HTMLTextAreaElement ||
     activeEl instanceof HTMLSelectElement ||  // ADD THIS
     (activeEl instanceof HTMLElement && activeEl.isContentEditable)
   )
   ```
3. **Fix set/toggle inconsistency** in `use-command-context.ts`:
   ```typescript
   // Change from:
   openPreferences: () => useUIStore.getState().togglePreferences(),
   // To:
   openPreferences: () => useUIStore.getState().setPreferencesOpen(true),
   ```

#### Step 0.3: Test Window Commands (Optional, Can Do Later)

- Press Cmd+W, Cmd+M, F11 in the app
- Note whether they work via native window management
- Document findings for Task 11

### Phase 1: Foundation

3. Create `src/lib/shortcuts/` utilities
   - `parseShortcut()` — parse `CmdOrCtrl+Shift+1` to structured form
   - `formatForDisplay()` — generate `⌘⇧1` (Mac) or `Ctrl+Shift+1` (Windows)
   - `matchesKeyboardEvent()` — check if event matches parsed shortcut
   - Unit tests for all edge cases (function keys, special chars, modifiers)

4. Update `AppCommand` type
   - Document that `shortcut` uses Tauri accelerator format
   - Add helper to get display format for UI

### Phase 2: Commands

5. Update existing commands to use parseable format
   - `navigation-commands.ts`: Change `⌘+1` → `CmdOrCtrl+1`
   - `window-commands.ts`: Change `⌘+W` → `CmdOrCtrl+W` (or remove, per Phase 0 findings)

6. Add missing commands
   - `toggle-command-palette` (`CmdOrCtrl+K`)
   - `create-task` (`CmdOrCtrl+N`)

### Phase 3: Unified Handler

7. Create `use-global-shortcuts.ts`
   - Query available commands on each keypress (dynamic `isAvailable` check)
   - Match keyboard event against command shortcuts
   - Execute via `executeCommand()` for consistent behavior
   - Skip when focused on editable elements
   - Respect `defaultPrevented` for component-level handlers

8. Remove old handlers
   - Delete `use-keyboard-shortcuts.ts`
   - Remove Cmd+K handler from `CommandPalette.tsx:59-69`
   - Update `use-main-window-event-listeners.ts` to use new hook

### Phase 4: Menu Integration

9. Update `menu.ts` based on Phase 0 findings
   - If accelerators intercept keyboard events: Keep menu accelerators, remove React handlers for those shortcuts
   - If accelerators don't intercept: Remove menu accelerators OR have menu handlers call `executeCommand()` for consistency

### Phase 5: Documentation & Cleanup

10. Update `docs/developer/keyboard-shortcuts.md`
    - Document the command-driven architecture
    - Explain how to add new shortcuts (add a command)
    - Remove outdated code examples

11. Update `docs/developer/command-system.md`
    - Document shortcut format
    - Add section on keyboard shortcut integration

## Edge Cases

### CRITICAL: Cmd+N Task Creation Flow (MUST PRESERVE)

The Cmd+N shortcut has a sophisticated two-layer handler system that **must not be broken** during this refactor. Here's how it works:

**Architecture** (in `task-creation-store.ts`):
1. **Active List Handler** (priority 1): When a task is selected in TaskList or OrderedItemList
2. **View Default Handler** (priority 2): Fallback when no task is selected

**Component-Level Override Pattern**:
- TaskList and OrderedItemList register handlers via `activateList()` when they have a selection
- These components call `e.stopPropagation()` in their Cmd+N handlers
- The global handler checks `e.defaultPrevented` and skips if component already handled it

**What the new `use-global-shortcuts.ts` MUST do**:
```typescript
case 'n':
case 'N': {
  // CRITICAL: Skip if component already handled
  if (e.defaultPrevented) break

  // CRITICAL: Skip if in editable element
  if (isEditableElement(document.activeElement)) break

  e.preventDefault()
  // Route through the task creation store (preserves two-layer system)
  useTaskCreationStore.getState().triggerCreate()
  break
}
```

**DO NOT**:
- Remove the `e.defaultPrevented` check
- Bypass `triggerCreate()` with direct task creation
- Change how TaskList/OrderedItemList call `stopPropagation()`

**Related edit mode behavior**:
- New tasks enter edit mode automatically
- Pressing Escape deletes the newly created task (tracked via `newlyCreatedTaskId`)
- This is handled in the list components, not the global shortcut handler

### Component-Level Shortcuts (General Pattern)

Some shortcuts are context-dependent (Cmd+N creates task in focused list). These should:

1. Be handled by the component with `stopPropagation()`
2. Have a global fallback command for when no component handles them

The global handler checks `e.defaultPrevented` to respect component handling.

### Window Commands

Window commands (Cmd+W, Cmd+M) are OS-standard shortcuts. Consider:

- On macOS, Cmd+W and Cmd+M are handled by the OS/Tauri window frame
- May not need keyboard handlers if using native decorations
- Only add handlers if custom window chrome is used

### Context-Dependent Commands

Some commands only make sense in certain contexts:

- `isAvailable()` already handles this for command palette visibility
- Keyboard handler should also check `isAvailable()` before executing

## Files to Change

| File                                                | Change                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| `src/lib/shortcuts/*.ts`                            | New - shortcut utilities (parser, matcher, formatter)    |
| `src/lib/commands/types.ts`                         | Document shortcut format                                 |
| `src/lib/commands/navigation-commands.ts`           | Consolidate to toggle commands, use Tauri format         |
| `src/lib/commands/window-commands.ts`               | Update shortcut format (or remove if native handles it)  |
| `src/lib/commands/index.ts`                         | Add new commands (toggle-command-palette, create-task)   |
| `src/hooks/use-global-shortcuts.ts`                 | New - unified handler                                    |
| `src/hooks/use-keyboard-shortcuts.ts`               | Delete                                                   |
| `src/hooks/use-command-context.ts`                  | Fix set/toggle inconsistency                             |
| `src/hooks/use-main-window-event-listeners.ts`      | Use new hook                                             |
| `src/components/command-palette/CommandPalette.tsx` | Remove Cmd+K handler                                     |
| `src/components/ui/sidebar.tsx`                     | Remove dead Cmd+B handler                                |
| `src/lib/menu.ts`                                   | Use executeCommand, update based on Phase 0 findings     |
| `docs/developer/keyboard-shortcuts.md`              | Rewrite                                                  |
| `docs/developer/command-system.md`                  | Add shortcut section                                     |

## Success Criteria

1. All global shortcuts defined in one place (command definitions)
2. Adding a new shortcut = adding/updating a command
3. All shortcuts discoverable in command palette with correct display format
4. Keyboard, menu, and command palette all execute through command system
5. No duplicate shortcut handling logic
6. Documentation accurately reflects implementation
