# Task 3c: Simple Task Creation (Async Approach)

## Status: Planning

## Background

Task 3a attempted to fix Cmd+N task creation using optimistic updates with temp IDs. After 3+ hours and 17 commits, the approach proved too complex - keeping five different systems synchronized through temp ID → real ID transitions created a whack-a-mole situation where fixing one system broke another.

This task takes a simpler approach: **use async/await and accept the ~50ms delay** from the Rust backend (local filesystem writes are fast). This eliminates all temp ID complexity.

## Original Requirements

### Cmd+N Task Creation

**When a task IS selected:**

- Cmd+N creates a new task immediately UNDER the selected task
- The new task is immediately active (blue background) and open for editing (cursor in title field)
- Typing and pressing Enter OR clicking away confirms the task
- Typing and pressing Escape cancels and DELETES the newly created task
- After Escape, selection returns to the previously selected task

**When NO task is selected (behavior depends on view):**

| View    | Where new task appears               |
| ------- | ------------------------------------ |
| Today   | End of "Scheduled for Today" section |
| Inbox   | End of inbox list                    |
| Project | End of project's task list           |
| Area    | End of "Loose Tasks" section         |
| NoArea  | End of "Loose Tasks" section         |

### Normal Task Editing

- Double-click or press Enter on selected task opens title for editing
- Editing + Enter OR clicking away saves changes
- Editing + Escape discards changes (reverts to original title)

### Drag and Drop

**Within a single list:**

- Reorder works as expected
- Standard drop animation

**Between lists (cross-container):**

- No drop animation
- CSS gap opens where task will drop
- Task slots into correct position

**Specific behaviors:**

- Dragging between projects in Area/NoArea view updates the task's project field
- Dragging to "Loose Tasks" in Area view: removes project, sets area
- Dragging to "Loose Tasks" in NoArea view: removes project, removes area

**Today view specifics:**

- Cannot drag TO the "Due Today" list
- CAN drag FROM "Due Today" or "Became Available" INTO "Scheduled for Today"
- This sets the scheduled date to today

## Why the Previous Approach Failed

The optimistic update approach required synchronizing:

1. **TanStack Query cache** - temp task → real task replacement
2. **Display order stores** - temp ID → real ID in order arrays
3. **Edit mode state** - editingTaskId tracking through ID change
4. **newlyCreatedTaskId** - tracking for Escape-to-delete
5. **File watcher** - preventing invalidation during mutation

Each system had subtle timing dependencies. Fixes to one broke others:

- File watcher fired before `onSuccess`, killing optimistic updates
- Temp task had `project: null`, so filtered views couldn't find it
- ID changes broke the `editingTaskId === task.id` check
- Double keyboard handling caused duplicate task creation

## New Approach: Simple Async

**Core insight:** The Rust backend writes to local filesystem in ~20-50ms. This delay is imperceptible. We don't need optimistic updates.

**New flow:**

```
User presses Cmd+N
    ↓
Call createTask.mutateAsync() - WAIT for backend
    ↓
Backend returns real task with real ID (~50ms)
    ↓
Add to cache, update display order, set edit mode
    ↓
User sees task and can type
```

**Benefits:**

- Single ID throughout (no temp → real transition)
- No race conditions with file watcher
- No multi-system synchronization
- Dramatically simpler code

## Implementation Plan

### Phase 1: Revert Optimistic Update Complexity

**File: `src/services/vault.ts`**

1. Remove `markMutationStart()` function and all calls to it
2. Simplify `useCreateTask` - remove `onMutate` optimistic update logic
3. Keep `onSuccess` but simplify - just add the real task to cache
4. Remove temp ID handling, wikilink construction in onMutate

The mutation should become simple:

```typescript
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: CreateTaskOptions): Promise<Task> => {
      const result = await commands.createTask(options)
      if (result.status === 'error') {
        throw new Error(handleVaultError(result.error, 'Creating task'))
      }
      return result.data
    },
    onSuccess: newTask => {
      markMutationComplete()
      // Add to cache
      queryClient.setQueryData<Task[]>(vaultQueryKeys.tasks(), old =>
        old ? [...old, newTask] : [newTask]
      )
      queryClient.setQueryData(vaultQueryKeys.task(newTask.id), newTask)
    },
  })
}
```

### Phase 2: Update View Handlers to Use Async

**Files:** All view files that handle task creation

Each view's `handleCreateTask` becomes async and uses `mutateAsync`:

```typescript
const handleCreateTask = React.useCallback(
  async (afterTaskId: string | null): Promise<string> => {
    // Create task and wait for real ID
    const newTask = await createTask.mutateAsync({
      title: '',
      status: 'ready', // or 'inbox' for InboxView
      projectId: projectId, // view-specific
      areaId: areaId, // view-specific
      scheduled: null,
      due: null,
      deferUntil: null,
    })

    // Update display order with REAL ID
    const currentOrder = orderedTasks.map(t => t.id)
    let newOrder: string[]

    if (afterTaskId) {
      const insertIndex = currentOrder.indexOf(afterTaskId)
      newOrder =
        insertIndex !== -1
          ? [
              ...currentOrder.slice(0, insertIndex + 1),
              newTask.id,
              ...currentOrder.slice(insertIndex + 1),
            ]
          : [...currentOrder, newTask.id]
    } else {
      newOrder = [...currentOrder, newTask.id]
    }

    // Update order store
    updateOrderStore(newOrder)

    // Trigger edit mode
    setPendingEditItemId(newTask.id)

    return newTask.id
  },
  [createTask, projectId, areaId, orderedTasks]
)
```

**Views to update:**

- `inbox-view.tsx`
- `project-view.tsx`
- `today-view.tsx` (multiple sections)
- `area-view.tsx` (loose tasks + project sections)
- `no-area-view.tsx` (loose tasks + project sections)

### Phase 3: Simplify TaskList Component

**File: `src/components/tasks/task-list.tsx`**

1. Update Cmd+N handler to work with async `onCreateTask`:

```typescript
case 'n':
case 'N':
  if (isMeta && onCreateTask && !e.defaultPrevented) {
    e.preventDefault()
    e.stopPropagation()

    const afterTaskId = selectedIndex !== null && tasks[selectedIndex]
      ? tasks[selectedIndex].id
      : null

    // Save state for potential Escape restore
    setPreviousSelectedIndex(selectedIndex)
    editConfirmedRef.current = false

    // Call async handler - UI updates when promise resolves
    onCreateTask(afterTaskId).then(newTaskId => {
      if (newTaskId) {
        setNewlyCreatedTaskId(newTaskId)
        // Edit mode will be triggered by autoEditItemId prop
      }
    })
  }
  break
```

2. Keep `newlyCreatedTaskId` tracking for Escape-to-delete (it's simpler now since ID never changes)

3. Remove complexity around temp ID → real ID transitions in auto-edit effect

### Phase 4: Update Task Creation Store

**File: `src/store/task-creation-store.ts`**

Update `triggerCreate` to handle async handlers properly:

```typescript
triggerCreate: async () => {
  const state = get()

  if (state.activeListHandler) {
    const afterTaskId = state.activeListSelectedTaskId
    const newTaskId = await state.activeListHandler(afterTaskId)

    if (newTaskId && state.activeListCallbacks?.setEditingTaskId) {
      state.activeListCallbacks.setEditingTaskId(newTaskId)
    }

    return newTaskId
  }

  if (state.viewDefaultHandler) {
    const newTaskId = await state.viewDefaultHandler(null)

    if (newTaskId && state.viewDefaultOnTaskCreated) {
      state.viewDefaultOnTaskCreated(newTaskId)
    }

    return newTaskId
  }

  // ... legacy handler support
}
```

### Phase 5: Clean Up

1. Remove unused temp ID types (`CreateTaskWithTempId`)
2. Remove `markMutationStart` function
3. Simplify or remove file watcher debounce logic (may still be useful for external edits)
4. Run `bun run check:all` to ensure no regressions
5. Test all views manually

## Testing Checklist

### Cmd+N with task selected

- [ ] Inbox: Creates task below selected, enters edit mode
- [ ] Today (Scheduled): Creates task below selected, enters edit mode
- [ ] Project: Creates task below selected, enters edit mode
- [ ] Area (Loose Tasks): Creates task below selected, enters edit mode
- [ ] Area (Project Section): Creates task below selected, enters edit mode
- [ ] NoArea (Loose Tasks): Creates task below selected, enters edit mode
- [ ] NoArea (Project Section): Creates task below selected, enters edit mode

### Cmd+N with no selection

- [ ] Inbox: Creates at end of list
- [ ] Today: Creates at end of "Scheduled for Today"
- [ ] Project: Creates at end of project list
- [ ] Area: Creates at end of "Loose Tasks"
- [ ] NoArea: Creates at end of "Loose Tasks"

### Edit confirmation/cancellation

- [ ] New task: Enter confirms, task persists
- [ ] New task: Click away confirms, task persists
- [ ] New task: Escape deletes task, selection returns to previous
- [ ] Existing task: Enter saves changes
- [ ] Existing task: Click away saves changes
- [ ] Existing task: Escape reverts to original title

### Drag and drop (verify not broken)

- [ ] Reorder within list works
- [ ] Cross-container drag shows CSS gap
- [ ] Dropping between projects updates project field
- [ ] Today view drag restrictions work

## Success Criteria

1. All Cmd+N scenarios work as specified
2. No perceptible delay (backend is fast enough)
3. Code is significantly simpler than before
4. All existing functionality still works
5. `bun run check:all` passes

## Files to Modify

| File                                    | Changes                                           |
| --------------------------------------- | ------------------------------------------------- |
| `src/services/vault.ts`                 | Simplify useCreateTask, remove optimistic updates |
| `src/components/tasks/task-list.tsx`    | Async Cmd+N handling, simplified auto-edit        |
| `src/components/views/inbox-view.tsx`   | Async handleCreateTask                            |
| `src/components/views/project-view.tsx` | Async handleCreateTask                            |
| `src/components/views/today-view.tsx`   | Async handleCreateTask (multiple)                 |
| `src/components/views/area-view.tsx`    | Async handleCreateTask (multiple)                 |
| `src/components/views/no-area-view.tsx` | Async handleCreateTask (multiple)                 |
| `src/store/task-creation-store.ts`      | Async triggerCreate                               |

## Estimated Complexity

This should be a **simplification** task - we're removing code, not adding it. The changes are straightforward refactoring from sync-with-temp-ID to async-with-real-ID.
