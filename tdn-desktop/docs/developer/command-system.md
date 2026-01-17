# Command System

The command system provides a unified way to register and execute actions throughout the app, enabling consistent behavior across keyboard shortcuts, menus, and the command palette.

## Quick Start

### Defining Commands

```typescript
// src/lib/commands/my-feature-commands.ts
import { SomeIcon } from 'lucide-react'
import type { AppCommand } from './types'

export const myFeatureCommands: AppCommand[] = [
  {
    id: 'my-action',
    labelKey: 'commands.myAction.label',
    descriptionKey: 'commands.myAction.description',
    icon: SomeIcon,
    group: 'my-feature',
    shortcut: 'CmdOrCtrl+M', // Tauri accelerator format
    keywords: ['my', 'action', 'feature'],

    execute: context => {
      context.showToast('Action executed!')
    },

    isAvailable: () => true,
  },
]
```

### Registering Commands

```typescript
// src/lib/commands/index.ts
import { myFeatureCommands } from './my-feature-commands'
import { registerCommands } from './registry'

export function initializeCommandSystem(): void {
  registerCommands(myFeatureCommands)
  // Register other command groups...
}
```

## Architecture

### Command Structure

```typescript
interface AppCommand {
  id: string
  labelKey: string // Translation key (e.g., 'commands.myAction.label')
  descriptionKey?: string // Translation key for description
  icon?: LucideIcon
  group?: string // Grouping for command palette
  keywords?: string[] // Additional search terms
  shortcut?: string // Tauri accelerator format (e.g., 'CmdOrCtrl+1')
  execute: (context: CommandContext) => void | Promise<void>
  isAvailable?: (context: CommandContext) => boolean
}
```

### Command Context

The context provides actions commands need without tight coupling:

```typescript
interface CommandContext {
  openPreferences: () => void
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void
}
```

The context is available as:

- **Hook**: `useCommandContext()` for React components
- **Singleton**: `commandContext` for non-React code (e.g., menu handlers)

```typescript
// In React components
const context = useCommandContext()

// In non-React code (menu.ts, etc.)
import { commandContext } from '@/lib/commands'
executeCommand('my-action', commandContext)
```

### Registry Pattern

Commands are stored in a central registry:

```typescript
// Register commands (called once at app init)
registerCommands(navigationCommands)

// Get filtered commands (for command palette)
const commands = getAllCommands(context, searchValue, t)

// Execute by ID (returns success/error result)
const result = await executeCommand(commandId, context)
```

**Key Pattern**: Commands use `getState()` in execute functions:

```typescript
// ✅ Good: Direct store access in execute
execute: () => {
  useUIStore.getState().toggleLeftSidebar()
}

// ❌ Bad: Hook usage (would cause re-renders)
const { leftSidebarVisible } = useUIStore()
execute: () => setLeftSidebarVisible(!leftSidebarVisible)
```

## Shortcut Format

Commands use **Tauri's accelerator format** for shortcuts:

```typescript
shortcut: 'CmdOrCtrl+1' // Cross-platform primary modifier
shortcut: 'CmdOrCtrl+,' // Special characters
shortcut: 'F11' // Function keys (no modifier)
shortcut: 'CmdOrCtrl+Shift+Z' // With shift
shortcut: 'CmdOrCtrl+Alt+P' // With alt
```

**Why this format?**

- Cross-platform: `CmdOrCtrl` = Cmd on Mac, Ctrl elsewhere
- Same format used by Tauri menu accelerators
- Parseable for keyboard event matching
- Convertible to display strings

### Display Format

Convert shortcuts for UI display using the shortcuts utility:

```typescript
import { formatForDisplay } from '@/lib/shortcuts'

formatForDisplay('CmdOrCtrl+1') // '⌘1' (Mac) or 'Ctrl+1' (Windows)
formatForDisplay('CmdOrCtrl+Shift+Z') // '⌘⇧Z' (Mac) or 'Ctrl+Shift+Z' (Windows)
```

## Integration Points

### Keyboard Shortcuts

The global keyboard handler (`use-global-shortcuts.ts`) automatically handles all command shortcuts:

```typescript
// src/hooks/use-global-shortcuts.ts
export function useGlobalShortcuts(context: CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (isEditableElement(document.activeElement)) return

      const commands = getAllCommands(context)
      const match = commands.find(cmd => {
        if (!cmd.shortcut) return false
        return matchesKeyboardEvent(parseShortcut(cmd.shortcut), e)
      })

      if (match) {
        e.preventDefault()
        executeCommand(match.id, context)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [context])
}
```

**No extra setup needed**: Add a `shortcut` to your command and it works automatically.

### Command Palette

The command palette (`Cmd+K`) displays all available commands with translated labels:

```typescript
const { t } = useTranslation()
const commands = getAllCommands(commandContext, search, t)

// Render command with translated text and shortcut
<CommandItem onSelect={() => handleCommandSelect(command.id)}>
  {command.icon && <command.icon />}
  <span>{t(command.labelKey)}</span>
  {command.shortcut && <kbd>{formatForDisplay(command.shortcut)}</kbd>}
</CommandItem>
```

### Native Menus

Menu handlers route through the command system:

```typescript
// src/lib/menu.ts
import { executeCommand, commandContext } from '@/lib/commands'

await MenuItem.new({
  id: 'toggle-left-sidebar',
  text: t('menu.toggleLeftSidebar'),
  accelerator: 'CmdOrCtrl+1', // Display only (doesn't intercept keyboard)
  action: () => executeCommand('toggle-left-sidebar', commandContext),
})
```

**Note**: Menu accelerators are display-only in Tauri. They show the shortcut in the menu but don't handle keyboard events. The keyboard handler (`use-global-shortcuts.ts`) handles all shortcuts.

## Adding New Commands

### Step 1: Add Translation Keys

```json
// locales/en.json
{
  "commands": {
    "myAction": {
      "label": "My Action",
      "description": "Does something useful"
    }
  }
}
```

### Step 2: Create Command Definition

```typescript
// src/lib/commands/my-feature-commands.ts
export const myFeatureCommands: AppCommand[] = [
  {
    id: 'my-action',
    labelKey: 'commands.myAction.label',
    descriptionKey: 'commands.myAction.description',
    group: 'my-feature',
    shortcut: 'CmdOrCtrl+3', // Optional: add keyboard shortcut

    execute: context => {
      // Your logic here
      context.showToast('Done!')
    },
  },
]
```

### Step 3: Register in Index

```typescript
// src/lib/commands/index.ts
import { myFeatureCommands } from './my-feature-commands'

export function initializeCommandSystem(): void {
  registerCommands(navigationCommands)
  registerCommands(myFeatureCommands) // Add here
  // ...
}
```

### Step 4: Extend Context (if needed)

If your command needs new context actions:

```typescript
// src/hooks/use-command-context.ts
export const commandContext: CommandContext = {
  // ... existing actions
  myNewAction: () => {
    /* implementation */
  },
}

// Update CommandContext type in types.ts
```

## Command Groups

Organize commands into logical groups (used in command palette headings):

- **app**: Application-wide actions (command palette, etc.)
- **navigation**: Sidebar toggles, view switching
- **settings**: Preferences, configuration
- **tasks**: Task-related actions
- **notifications**: Notification actions
- **window**: Window management (minimize, close, etc.)

Group labels are translated via `commands.group.{groupName}` keys.

## Dynamic Labels

Most commands use i18n keys for labels (e.g., `commands.myAction.label`). However, some commands need dynamic labels from runtime data:

- **Entity navigation**: Area/project titles come from user data
- **Platform-specific**: "Reveal in Finder" vs "Show in Explorer"

For these cases, use the `_dynamic:` prefix:

```typescript
// Dynamic label from entity data
{
  id: `navigate-area-${area.id}`,
  labelKey: `_dynamic:${area.title}`,  // Display string, not i18n key
  // ...
}

// Dynamic label from platform detection
{
  id: 'reveal-in-finder',
  get labelKey() {
    const strings = getPlatformStrings(getPlatform())
    return `_dynamic:${strings.revealInFileManager}`
  },
  // ...
}
```

**How it works:**

1. The `_dynamic:` prefix signals that the rest of the string is the display value
2. `getCommandLabel()` in `registry.ts` strips the prefix and returns the raw string
3. `filterCommands()` strips the prefix before search matching

**When to use:**

- User-generated content (entity titles)
- Platform-specific strings already resolved
- Any label that can't be a static i18n key

## Best Practices

| Do                                                 | Don't                             |
| -------------------------------------------------- | --------------------------------- |
| Use `labelKey` with translation keys               | Hardcode label strings            |
| Use `_dynamic:` prefix for runtime labels          | Mix i18n keys with raw strings    |
| Use `getState()` in execute functions              | Use hooks in commands             |
| Use Tauri accelerator format for shortcuts         | Use display format (`⌘1`)         |
| Check `isAvailable` for context-dependent commands | Show unavailable commands         |
| Provide `keywords` for better searchability        | Rely only on label matching       |
| Use `context.showToast()` for feedback             | Silently execute without feedback |
| Route menu actions through `executeCommand()`      | Call store directly from menus    |

## Related Documentation

- [Command Registry](./command-registry.md) - Complete list of all commands and their properties
- [Keyboard Shortcuts](./keyboard-shortcuts.md) - Shortcut-specific patterns
- [Menus](./menus.md) - Native menu integration
