# Keyboard Shortcut System Cleanup

## Summary

Comprehensive review identified architectural issues in keyboard shortcut handling: duplication across multiple files, misleading documentation, underutilized command system, and inconsistent patterns.

## Issues

### HIGH Priority

**Documentation Mismatch**
- `docs/developer/keyboard-shortcuts.md` shows inline code that doesn't exist
- Real implementation is in `use-keyboard-shortcuts.ts`, not shown in docs
- Cmd+N and Cmd+K not documented at all

**Command System Underutilized**
- `src/lib/commands/navigation-commands.ts` defines shortcuts as metadata only
- Actual key bindings duplicated in `use-keyboard-shortcuts.ts`
- Same shortcuts defined in 3 places: keyboard handler, command definitions, menu accelerators
- Risk of getting out of sync

### MEDIUM Priority

**Cmd+K Separate Handler**
- `CommandPalette.tsx:59-69` has its own keydown handler
- Bypasses centralized `use-keyboard-shortcuts.ts`
- Should be consolidated

**Cmd+B Orphaned Handler**
- `sidebar.tsx:96-108` defines Cmd+B shortcut from shadcn template
- Not documented anywhere
- May conflict with `useUIStore` sidebar visibility
- Likely dead code - investigate and remove or integrate

**Cmd+N Interaction Complexity**
- Global handler in `use-keyboard-shortcuts.ts`
- Component handlers in `TaskList.tsx` and `OrderedItemList.tsx`
- Relies on `stopPropagation()` and `defaultPrevented` checks
- Fragile pattern - if component forgets stopPropagation, double execution

### LOW Priority

**Display Format Inconsistency**
- `navigation-commands.ts`: `⌘+1` (Mac symbols)
- `menu.ts`: `CmdOrCtrl+1` (Tauri format)
- `window-commands.ts`: Mixed formats

## Recommendations

### Quick Wins

1. **Update documentation** (`docs/developer/keyboard-shortcuts.md`)
   - Reference actual `use-keyboard-shortcuts.ts` file
   - Document ALL shortcuts: Cmd+,/1/2/N/K
   - Remove misleading inline code example
   - Add or remove Cmd+B

2. **Consolidate Cmd+K handler**
   - Move from `CommandPalette.tsx` into `use-keyboard-shortcuts.ts`

3. **Investigate Cmd+B**
   - Check if `SidebarProvider` state is actually used
   - If not, remove the keyboard handler and simplify

### Longer Term

4. **Make command system the source of truth**

   Rather than three places defining shortcuts:
   ```typescript
   // Example approach
   function registerShortcut(command: AppCommand) {
     if (command.shortcut) {
       const keys = parseShortcut(command.shortcut)
       shortcutMap.set(keys, command.id)
     }
   }

   // Single keydown handler
   const handleKeyDown = (e: KeyboardEvent) => {
     const matchingCommand = findCommandForEvent(e)
     if (matchingCommand) {
       e.preventDefault()
       executeCommand(matchingCommand.id, context)
     }
   }
   ```

   Benefits:
   - Single source of truth for shortcut definitions
   - Command palette and key handlers use same definitions
   - Adding new global shortcuts = adding a command

5. **Simplify Cmd+N interaction**
   - Consider focus-based approach where global handler only fires when no list focused
   - Or have global handler always delegate to `useTaskCreationStore` which knows context

## Files Involved

- `docs/developer/keyboard-shortcuts.md` - documentation
- `src/hooks/use-keyboard-shortcuts.ts` - main keyboard handler
- `src/hooks/useMainWindowEventListeners.ts` - wrapper hook
- `src/components/command-palette/CommandPalette.tsx` - Cmd+K handler
- `src/components/ui/sidebar.tsx` - Cmd+B handler
- `src/lib/commands/navigation-commands.ts` - command definitions
- `src/lib/menu.ts` - menu accelerators
- `src/components/tasks/task-list.tsx` - Cmd+N component handler
- `src/components/tasks/ordered-item-list.tsx` - Cmd+N component handler

## What's Working Well

- Component-level keyboard handling is well-scoped
- `getState()` pattern correctly used in event handlers
- Cross-platform modifier checking consistently applied
- Input field exclusion for Cmd+N
- Proper event cleanup on unmount
