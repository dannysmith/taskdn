# Task: Full review of command system

## Initial Prompt

Oh we have recently spent a lot of time cleaning up and implementing new features that all have to do with the command system, the command palette, keyboard shortcuts and menus. You can find the task files for these in @docs/tasks-todos, numbered 6-11 (eg `task-{n}-*`).

Task 7 is not actually a task doc, it's a document we produced after doing task six, which describes the requirements in a non technical way for all this stuff.

Read those task docs so you have an idea of what we've been doing and then step back and conduct a thorough, comprehensive review of our command system, keyboard shortcuts, command palette, context menus and app menus with fresh eyes.

- Is it well-architected?
- Are there any critical issues?
- Is it easy to understand for developers?
- Are we using any inconsistent patterns without good reason?
- As they way we've done this gonna fuck us up in the future?
- Are here any onbious opportunities for refactoring?
- Are there any bugs or obvious performance issues?

Do not write any files. You may use subagents in paralell freely, but should veryfy any important stuff they return. I'm not interested in small nitpick comments on code, I'm interested in actual problems if they exist and I'm most interested in the architecture and approach. This review is an opportunity for us to make sure that all this stuff is as good as it can be before we move on to new features. Ultrathink and take your time.

## Review Report

### Executive Summary

The command system is **well-architected** with a solid foundation. The "commands as single source of truth" principle has been successfully implemented. However, there are **2 critical issues** that should be fixed, along with several smaller improvements.

### What's Done Well

1. **Single Source of Truth**: Commands define shortcuts, labels, availability, and surfaces in one place. Menu, palette, and keyboard handlers all derive from command definitions.

2. **Clean Separation of Concerns**: Registry, types, command files by domain, and CommandContext are well-organized and have clear responsibilities.

3. **Cross-Platform Shortcut Handling**: Parser/matcher/formatter handle Mac/Windows/Linux correctly. Tauri accelerator format (`CmdOrCtrl+1`) as canonical format is a good choice.

4. **Dynamic Commands**: Areas/projects generate navigation commands at runtime, filtered by entity status, and searchable in command palette.

5. **Context Menu Integration**: Commands with `surfaces.contextMenu` appear correctly. Target entity tracked and cleared properly.

---

### Critical Issues

#### 1. Escape Key Always Consumes Event

**Location**: `src/lib/commands/window-commands.ts:85-103`

The `window-exit-fullscreen` command has `shortcut: 'Escape'` but **no `isAvailable` check**. This means any Escape keypress (outside editable elements) triggers this command, even when not in fullscreen.

**Impact**: Breaks closing dialogs, canceling inline edits, dismissing dropdowns—anything that expects Escape to propagate.

**Root Cause**: `isAvailable` is synchronous, but checking fullscreen state requires async `await window.isFullscreen()`.

**Decision**: Remove the Escape shortcut. Let OS/Tauri handle fullscreen exit natively (F11 toggle already works). Native apps typically don't use Escape for fullscreen exit.

---

#### 2. Go Menu Stale When Areas/Projects Change

**Location**: `src/lib/menu.ts:96-129`

The menu only rebuilds on two triggers:
- `setupMenuLanguageListener()` - when language changes
- `setupMenuSelectionListener()` - when task selection changes

**Missing triggers**:
- Areas/projects created, deleted, archived, or renamed
- Obsidian setting toggled

**Impact**: User adds a new area → Go > Areas menu still shows old list until app restart.

**Fix**: Add a listener for vault data changes using TanStack Query's cache subscription.

---

### Moderate Issues

#### 3. Duplicate Filter Logic for Active Areas/Projects

**Locations**:
- `src/lib/commands/registry.ts:19-25`
- `src/lib/menu.ts:517-520`

Both contain identical filtering:
```typescript
areas.filter(a => a.status !== 'archived')
projects.filter(p => p.status !== 'done' && p.status !== 'paused')
```

**Existing helpers exist** in `useVaultHelpers()` (`getActiveAreas()`, `getActiveProjects()`), but these are React hooks and can't be used in registry.ts or menu.ts which aren't React components.

**Fix**: Extract pure filter functions to a shared location (e.g., `src/lib/entity-filters.ts`):
```typescript
export function filterActiveAreas(areas: Area[]): Area[]
export function filterActiveProjects(projects: Project[]): Project[]
```
Then use these in `useVaultHelpers()`, `registry.ts`, and `menu.ts`.

---

#### 4. Windows/Linux Display Bug with Dual Modifiers

**Location**: `src/lib/shortcuts/parser.ts:80-81`

When both `cmdOrCtrl` and `ctrl` are true (e.g., `Ctrl+CmdOrCtrl+F`), the formatter outputs `Ctrl+Ctrl+...` on Windows/Linux.

```typescript
if (parsed.cmdOrCtrl) parts.push('Ctrl')
if (parsed.ctrl) parts.push('Ctrl')  // Duplicate!
```

**Impact**: Edit > Edit Defer Until shows `Ctrl+Ctrl+Shift+D` instead of `Ctrl+Shift+D` on Windows.

**Mac is unaffected** because Mac uses separate symbols (`⌃⌘`). The matcher is correct—it properly handles the case where both map to the same physical key on Windows. Only the display is wrong.

**Fix**: Only output Ctrl once when either or both are true:
```typescript
if (parsed.cmdOrCtrl || parsed.ctrl) parts.push('Ctrl')
```

---

#### 5. Silent Failures in Menu Command Execution

**Location**: `src/lib/menu.ts:153-160`

When a menu command fails, it's only logged—user gets no feedback:
```typescript
if (!result.success) {
  logger.error('Menu command failed', { commandId: cmd.id, error: result.error })
  // User sees nothing!
}
```

**Fix**: Show toast on failure via `context.showToast(result.error, 'error')`.

---

#### 6. Inconsistent Shortcut Format in ShortcutPicker

**Location**: `src/components/preferences/ShortcutPicker.tsx:80`

Uses `CommandOrControl` when capturing, but commands use `CmdOrCtrl`. Both work (parser accepts both), but should be consistent.

**Fix**: Update to use `CmdOrCtrl` consistently.

---

### Minor Issues (No Action Required)

#### `_dynamic:` Prefix Convention

Dynamic labels use a string prefix convention (`_dynamic:Area Title`). This works and is localized to two files (registry.ts, entity-commands.ts). The alternative would be a discriminated union type, but the added complexity isn't worth it for a pattern that works and is contained. **Leave as-is.**

#### Context Menu Target as Module-Level State

This works because native menus are modal—you can't have two context menus open simultaneously. The state is set immediately before showing the menu and cleared in a `finally` block. Moving to Zustand would add reactivity overhead for state that doesn't need to be reactive and doesn't persist. **Leave as-is.**

#### File/Edit Menu Manual Availability Checks

View menu uses `createCommandMenuItem()` while File/Edit manually check `hasEntitySelected`. This is actually **correct behavior**, not a bug.

The entity commands' `isAvailable` includes a focus check (`document.activeElement`) that's designed for keyboard shortcuts—it ensures we don't capture Cmd+C when typing in an input. But for menus, focus is irrelevant; we just care if a task is selected.

The manual `hasEntitySelected` check correctly skips the focus check that doesn't apply to menus. **Leave as-is**, but document why in a comment.

---

## Action Items

### Task A: Remove Escape Shortcut from window-exit-fullscreen

**File**: `src/lib/commands/window-commands.ts`

Remove the `shortcut: 'Escape'` line from the `window-exit-fullscreen` command (lines 88-89). The command can stay (for completeness/palette), but should not have a global keyboard shortcut.

The F11 shortcut already provides keyboard access to fullscreen. Native macOS handles Escape for exiting fullscreen if the system wants to.

---

### Task B: Add Vault Data Change Listener for Menu Rebuild

**File**: `src/lib/menu.ts`

Add a new setup function that listens for TanStack Query cache changes on areas/projects queries and rebuilds the menu:

```typescript
export function setupMenuDataListener(): () => void {
  const queryClient = getQueryClient()
  return queryClient.getQueryCache().subscribe(event => {
    const key = event.query.queryKey[0]
    if (key === 'areas' || key === 'projects') {
      buildAppMenu().catch(error => {
        logger.error('Failed to rebuild menu on data change', { error })
      })
    }
  })
}
```

Call this from `App.tsx` alongside the existing listeners. Consider debouncing if performance becomes an issue (though it shouldn't—menu rebuilds are already fast enough to handle every task selection change).

---

### Task C: Extract Active Entity Filter Functions

**New file**: `src/lib/entity-filters.ts`

Create pure filter functions:
```typescript
import type { Area, Project } from '@/lib/tauri-bindings'

export function filterActiveAreas(areas: Area[]): Area[] {
  return areas.filter(a => a.status !== 'archived')
}

export function filterActiveProjects(projects: Project[]): Project[] {
  return projects.filter(p => p.status !== 'done' && p.status !== 'paused')
}
```

Update these files to use the new functions:
1. `src/services/vault.ts` - `useVaultHelpers()` implementation
2. `src/lib/commands/registry.ts` - `getDynamicNavigationCommands()`
3. `src/lib/menu.ts` - `buildGoMenu()`

---

### Task D: Fix Windows Display Bug for Dual Modifiers

**File**: `src/lib/shortcuts/parser.ts`

In `formatForDisplay()`, around lines 80-81, change:
```typescript
// Before (buggy)
if (parsed.cmdOrCtrl) parts.push('Ctrl')
if (parsed.ctrl) parts.push('Ctrl')

// After (fixed)
if (parsed.cmdOrCtrl || parsed.ctrl) parts.push('Ctrl')
```

This only affects Windows/Linux display. Mac uses separate symbols and is unaffected. The keyboard matcher already handles this correctly—it's only the display formatter that's wrong.

**Verify**: Check that `Ctrl+CmdOrCtrl+F` (toggle fullscreen) still displays correctly on Mac as `⌃⌘F`.

---

### Task E: Show Toast on Menu Command Failure

**File**: `src/lib/menu.ts`

In `createCommandMenuItem()`, around lines 153-160, add a toast on failure:

```typescript
action: async () => {
  const result = await executeCommand(cmd.id, context)
  if (!result.success) {
    logger.error('Menu command failed', { commandId: cmd.id, error: result.error })
    context.showToast(result.error || t('toast.error.commandFailed'), 'error')
  }
}
```

This gives users feedback when something goes wrong instead of silent failure.

---

### Task F: Standardize Shortcut Format in ShortcutPicker

**File**: `src/components/preferences/ShortcutPicker.tsx`

Around line 80, change `CommandOrControl` to `CmdOrCtrl` for consistency with command definitions:

```typescript
// Before
if (e.metaKey || e.ctrlKey) parts.push('CommandOrControl')

// After
if (e.metaKey || e.ctrlKey) parts.push('CmdOrCtrl')
```

Both formats work (the parser accepts both), but we should be consistent throughout the codebase.

---

### Task G: Add Explanatory Comment for File/Edit Menu Pattern

**File**: `src/lib/menu.ts`

Add a comment around line 252 explaining why File/Edit menus manually check `hasEntitySelected` instead of using `createCommandMenuItem()`:

```typescript
// Note: We check hasEntitySelected manually rather than using createCommandMenuItem()
// because entity commands' isAvailable() includes a focus check for keyboard shortcuts
// (to avoid capturing Cmd+C when typing in inputs). For menus, focus is irrelevant—
// we just care if a task is selected. The manual check correctly skips the focus check.
const hasEntitySelected = context.selectedTaskId !== null
```

This prevents future developers from "fixing" this perceived inconsistency.
