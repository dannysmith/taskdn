# Keyboard Shortcuts

Global keyboard shortcuts are managed through the **command system**. Shortcuts are defined once in command definitions and automatically work across keyboard input, the command palette, and native menus.

## Current Shortcuts

| Shortcut             | Mac   | Windows/Linux | Action                |
| -------------------- | ----- | ------------- | --------------------- |
| Open Preferences     | Cmd+, | Ctrl+,        | Opens settings dialog |
| Command Palette      | Cmd+K | Ctrl+K        | Opens command search  |
| Toggle Left Sidebar  | Cmd+1 | Ctrl+1        | Show/hide left panel  |
| Toggle Right Sidebar | Cmd+2 | Ctrl+2        | Show/hide right panel |
| New Task             | Cmd+N | Ctrl+N        | Creates a new task    |

## Architecture

Shortcuts are defined in command definitions and handled by a unified keyboard handler:

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

### Key Files

| File                                | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `src/lib/commands/*.ts`             | Command definitions with shortcuts            |
| `src/hooks/use-global-shortcuts.ts` | Unified keyboard handler                      |
| `src/lib/shortcuts/`                | Shortcut parsing and matching utilities       |
| `src/lib/menu.ts`                   | Native menu (uses same shortcuts for display) |

## Adding a New Shortcut

To add a keyboard shortcut, add a command with a `shortcut` property:

### Step 1: Define the Command

```typescript
// src/lib/commands/my-feature-commands.ts
export const myFeatureCommands: AppCommand[] = [
  {
    id: 'my-action',
    labelKey: 'commands.myAction.label',
    shortcut: 'CmdOrCtrl+3', // Tauri accelerator format
    execute: () => {
      // Your logic here
    },
  },
]
```

### Step 2: Register the Command

```typescript
// src/lib/commands/index.ts
import { myFeatureCommands } from './my-feature-commands'

export function initializeCommandSystem(): void {
  registerCommands(myFeatureCommands)
  // ...
}
```

That's it! The shortcut will automatically:

- Work via keyboard (handled by `use-global-shortcuts.ts`)
- Appear in the command palette with the correct display format
- Be available for native menu integration

### Step 3: Add to Menu (Optional)

If the shortcut should appear in a native menu:

```typescript
// src/lib/menu.ts
await MenuItem.new({
  id: 'my-action',
  text: t('menu.myAction'),
  accelerator: 'CmdOrCtrl+3', // Same format as command
  action: () => executeCommand('my-action', commandContext),
})
```

## Shortcut Format

Use **Tauri's accelerator format** for all shortcuts:

```typescript
shortcut: 'CmdOrCtrl+1' // Cross-platform primary modifier
shortcut: 'CmdOrCtrl+,' // Works with special chars
shortcut: 'F11' // Function keys (no modifier)
shortcut: 'CmdOrCtrl+Shift+Z' // With shift modifier
shortcut: 'CmdOrCtrl+Alt+P' // With alt modifier
```

This format:

- Is cross-platform (`CmdOrCtrl` = Cmd on Mac, Ctrl elsewhere)
- Works directly with Tauri menu accelerators
- Is automatically converted to display format (`⌘1` on Mac, `Ctrl+1` elsewhere)

### Display Format

Use `formatForDisplay()` to convert to user-facing format:

```typescript
import { formatForDisplay } from '@/lib/shortcuts'

formatForDisplay('CmdOrCtrl+1') // '⌘1' (Mac) or 'Ctrl+1' (Windows)
formatForDisplay('CmdOrCtrl+Shift+Z') // '⌘⇧Z' (Mac) or 'Ctrl+Shift+Z' (Windows)
```

## Component-Level Shortcuts

Some shortcuts depend on context (e.g., Cmd+N creates a task in the focused list). These use a two-layer pattern:

1. **Component handler** (priority): Calls `e.stopPropagation()` when handling
2. **Global handler** (fallback): Checks `e.defaultPrevented` and skips if already handled

```typescript
// Component-level handler
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault()
    e.stopPropagation() // Prevent global handler
    createTaskInThisList()
  }
}

// Global handler (use-global-shortcuts.ts) automatically skips if defaultPrevented
```

## Input Field Behavior

Modifier-based shortcuts (Cmd+1, Cmd+K, etc.) work even when focused on input fields. This is intentional—toggling sidebars or opening the command palette while editing text is useful, and these shortcuts don't conflict with typing.

The global handler includes an `isEditableElement` check that can block shortcuts in input fields, but it's currently a no-op for our modifier-based shortcuts. It exists for future use if we add:

- Single-key shortcuts without modifiers (e.g., `n` for new)
- Shortcuts that conflict with text editing (e.g., `Cmd+Z`, `Cmd+A`)

## Troubleshooting

| Issue                         | Check                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| Shortcut not working          | Is the command registered? Check `initializeCommandSystem()`    |
| Shortcut fires in input       | Verify `isEditableElement()` check in `use-global-shortcuts.ts` |
| Wrong display format          | Use `formatForDisplay()` from `@/lib/shortcuts`                 |
| Menu shows different shortcut | Ensure menu `accelerator` matches command `shortcut`            |
| Shortcut fires twice          | Component should use `stopPropagation()` if handling locally    |

## Related Documentation

- [Command Registry](./command-registry.md) - Complete list of all commands and shortcuts
- [Command System](./command-system.md) - Full command system documentation
- [Menus](./menus.md) - Native menu integration
