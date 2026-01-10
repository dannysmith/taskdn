# Task: Task-Specific Commands Implementation

> **Requirements Reference**: See [Task 7: Command Registry](./task-7-command-registry.md) for the complete list of task commands, shortcuts, and availability conditions.

## Overview

This task implements all task-specific commands - those that are only available when a task is selected. These enable keyboard-driven task management similar to Things.

## Prerequisites

- Task 6 complete (shortcut infrastructure)
- Task 8 in progress or complete (command system extensions)

## Scope

### Task Commands to Implement

From the registry, these commands require "task selected" availability:

| Command | Shortcut | Description |
|---------|----------|-------------|
| `paste-as-tasks` | ⌘V | Create tasks from clipboard lines |
| `duplicate-task` | ⇧⌘D | Duplicate selected task |
| `move-task-up` | ⌘↑ | Move task up in list |
| `move-task-down` | ⌘↓ | Move task down in list |
| `move-task-to-top` | ⌥⌘↑ | Move task to top of list |
| `move-task-to-bottom` | ⌥⌘↓ | Move task to bottom of list |
| `edit-scheduled-date` | ⌘D | Open scheduled date picker |
| `set-scheduled-today` | ⌘T | Set scheduled date to today |
| `edit-due-date` | ⌥⌘D | Open due date picker |
| `edit-defer-date` | ⇧⌥⌘D | Open defer until date picker |
| `edit-status` | ⌘S | Open status dropdown |
| `copy-task-title` | ⌘C | Copy task title to clipboard |

### Availability Logic

All task commands share this availability check:

```typescript
isAvailable: (context) => {
  // Must have a selected task
  if (!context.selectedTaskId) return false

  // Must not be in an editable element
  const activeEl = document.activeElement
  if (
    activeEl instanceof HTMLInputElement ||
    activeEl instanceof HTMLTextAreaElement ||
    activeEl instanceof HTMLSelectElement ||
    (activeEl instanceof HTMLElement && activeEl.isContentEditable)
  ) {
    return false
  }

  return true
}
```

### Implementation Details

#### `paste-as-tasks` (⌘V)

```typescript
execute: async (context) => {
  const clipboardText = await navigator.clipboard.readText()
  const lines = clipboardText.split('\n').filter(line => line.trim())

  if (lines.length === 0) return

  // Create tasks below selected task
  const selectedTask = context.getSelectedTask()
  for (const line of lines) {
    await context.createTaskBelow(selectedTask.id, { title: line.trim() })
  }

  context.showToast(t('tasks.pastedCount', { count: lines.length }))
}
```

**Note**: Does NOT open any task for editing after creation.

#### `duplicate-task` (⇧⌘D)

```typescript
execute: async (context) => {
  const task = context.getSelectedTask()
  const newTask = await context.duplicateTask(task.id)
  context.selectTask(newTask.id)
}
```

#### Movement Commands (⌘↑↓, ⌥⌘↑↓)

```typescript
// move-task-up
execute: (context) => {
  const task = context.getSelectedTask()
  context.moveTaskUp(task.id)
}

// move-task-to-top
execute: (context) => {
  const task = context.getSelectedTask()
  context.moveTaskToTop(task.id)
}
```

**Note**: Movement behavior depends on current view:
- In project view: moves within project
- In area view: moves within visible list
- In Today/This Week: moves within scheduled order

#### Date Commands (⌘D, ⌘T, ⌥⌘D, ⇧⌥⌘D)

```typescript
// edit-scheduled-date - opens date picker
execute: (context) => {
  const task = context.getSelectedTask()
  context.openDatePicker(task.id, 'scheduled')
}

// set-scheduled-today - immediate action
execute: (context) => {
  const task = context.getSelectedTask()
  const today = new Date().toISOString().split('T')[0]
  context.updateTask(task.id, { scheduledDate: today })
  context.showToast(t('tasks.scheduledToday'))
}
```

#### `edit-status` (⌘S)

```typescript
execute: (context) => {
  const task = context.getSelectedTask()
  context.openStatusDropdown(task.id)
}
```

#### `copy-task-title` (⌘C)

```typescript
execute: async (context) => {
  const task = context.getSelectedTask()
  await navigator.clipboard.writeText(task.title)
  context.showToast(t('tasks.titleCopied'))
}
```

**Important**: This only fires when a task is selected AND not in an editable element. Standard ⌘C behavior is preserved in inputs/textareas.

### CommandContext Extensions

Add these methods to support task commands:

```typescript
interface CommandContext {
  // Selection
  selectedTaskId: string | null
  getSelectedTask: () => Task
  selectTask: (taskId: string) => void

  // Task operations
  createTaskBelow: (afterTaskId: string, data: Partial<Task>) => Promise<Task>
  duplicateTask: (taskId: string) => Promise<Task>
  updateTask: (taskId: string, data: Partial<Task>) => Promise<void>

  // Movement
  moveTaskUp: (taskId: string) => void
  moveTaskDown: (taskId: string) => void
  moveTaskToTop: (taskId: string) => void
  moveTaskToBottom: (taskId: string) => void

  // UI
  openDatePicker: (taskId: string, field: 'scheduled' | 'due' | 'defer') => void
  openStatusDropdown: (taskId: string) => void
}
```

## Interaction with Existing Handlers

### `create-task` (⌘N)

Already implemented with context-aware behavior. The command should wrap the existing logic:

| Context | Behavior |
|---------|----------|
| Task selected in list | Create below selected, open for editing |
| Task list focused, none selected | Create at bottom, open for editing |
| In area view | Create in area's default location |
| In project view | Create in project |
| Global | Create in Inbox |

### Component-Level Handlers

Some components may have their own handlers that should take precedence:

```typescript
// In TaskListItem or similar
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    // Component handles Enter for editing
    e.stopPropagation()
    startEditing()
  }
}}
```

The global shortcut handler respects `e.defaultPrevented` and skips commands when a component has already handled the event.

## Implementation Steps

1. Extend `CommandContext` with task operation methods
2. Create `src/lib/commands/task-commands.ts`
3. Implement each command with proper `isAvailable` check
4. Register task commands in command system
5. Ensure date picker / status dropdown can be triggered programmatically
6. Add tests for each command
7. Verify keyboard shortcuts work with task selected
8. Ensure all existing keyboard functionality works as before (user to manually test and report)

## Files to Change

| File | Change |
|------|--------|
| `src/lib/commands/task-commands.ts` | New - all task commands |
| `src/lib/commands/index.ts` | Register task commands |
| `src/hooks/use-command-context.ts` | Add task operation methods |
| `src/stores/ui-store.ts` | Add openDatePicker, openStatusDropdown |
| `src/components/task-list/*` | Expose methods for command context |

## Success Criteria

1. All task commands from registry work when task selected
2. Commands don't fire when in input/textarea/select
3. Standard ⌘C/⌘V preserved in editable elements
4. Date pickers open via keyboard shortcut
5. Status dropdown opens via keyboard shortcut
6. Task movement works across all views

## Reference

Things keyboard shortcuts: https://culturedcode.com/things/support/articles/2785159/
