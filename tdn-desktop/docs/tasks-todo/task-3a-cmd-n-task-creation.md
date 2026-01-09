# Task 3a: Fix Cmd+N Task Creation

## Overview

Cmd+N should create a new task in the current view context. When a task is selected, create below it. When nothing is selected, create in the view's default section.

**Current Status:** Broken in most views. Only works reliably in Inbox and Project views.

---

## Background: Current Architecture

### The Two-Layer Keyboard System

The app has two overlapping systems for handling Cmd+N:

1. **Global Handler** (`src/hooks/use-keyboard-shortcuts.ts`)
   - Attaches to `document` keydown
   - Calls `useTaskCreationStore.getState().triggerCreate()`
   - Acts as fallback for any view

2. **Local Handlers** (in TaskList and OrderedItemList)
   - Attached to component's container via `onKeyDown`
   - Only fire when the container has focus
   - Handle Cmd+N directly if `onCreateTask` prop is provided

### The Task Creation Store (`src/store/task-creation-store.ts`)

A Zustand store that allows views/components to register their task creation context:

```typescript
interface TaskCreationState {
  createTaskHandler: CreateTaskHandler | null  // Called to create the task
  selectedTaskId: string | null                // Insert after this task
  setEditingTaskId: ((id: string | null) => void) | null  // Put new task in edit mode
  setSelectedIndex: ((index: number | null) => void) | null
  taskCount: number

  registerContext: (context: {...}) => void
  unregisterContext: () => void
  triggerCreate: () => Promise<string | undefined>
}
```

### Component Hierarchy

```
View (TodayView, AreaView, etc.)
├── TaskDndContext (wraps multi-list views for cross-container drag)
│   ├── SectionTaskGroup (collapsible section with header)
│   │   ├── OrderedItemList (if mixed tasks + headings)
│   │   └── TaskList (if tasks only, with useExternalDnd=true)
│   └── ProjectTaskGroup (project header + tasks)
│       └── TaskList (always)
└── DraggableTaskList (standalone, has own DndContext - used in Inbox, ProjectView)
```

### Which Components Register with the Store

| Component | Registers? | Notes |
|-----------|------------|-------|
| DraggableTaskList | **Yes** | Registers on mount, unregisters on unmount |
| TaskList | **No** | Only has local keyboard handler |
| OrderedItemList | **No** | Only has local keyboard handler |

### View-Component Mapping

| View | Primary List Component | Global Cmd+N Works? |
|------|----------------------|-------------------|
| Inbox | DraggableTaskList | Yes |
| Project (list mode) | DraggableTaskList | Yes |
| Project (kanban) | KanbanBoard | No (not implemented) |
| Today - all sections | TaskList or OrderedItemList | No |
| Area - all sections | TaskList | No |
| NoArea - all sections | TaskList | No |

---

## Problem Statement

### Root Cause

The global Cmd+N handler calls `triggerCreate()`, but `triggerCreate()` only works if a component has registered with the store. Only `DraggableTaskList` registers, so:

- **Inbox works**: Uses DraggableTaskList
- **Project (list) works**: Uses DraggableTaskList
- **Everything else broken**: Uses TaskList or OrderedItemList, which don't register

### Observed Symptoms

| View | With Task Selected | Without Selection |
|------|-------------------|-------------------|
| Inbox | Works | Works |
| Today | Nothing happens | Nothing happens |
| Area/NoArea | Strange "selection shift" | Nothing happens |
| Project (list) | Works | Works |

### The "Selection Shift" Bug

When pressing Cmd+N in Area/Project views with a task selected, a different task appears to gain browser focus styling (blue background) but:
- React selection state isn't properly updated
- Subsequent keyboard shortcuts don't work
- Clicking anywhere resets to normal

This is likely caused by:
1. Global handler fires, calls `e.preventDefault()`, calls `triggerCreate()`
2. `triggerCreate()` does nothing (no handler registered)
3. Some browser/dnd-kit focus behavior shifts focus to another element
4. Visual focus indicator shows, but React state doesn't match

---

## Solution Architecture

### Dual-Handler Pattern

Instead of a single handler, the store will maintain two layers:

1. **View Default Handler** - Registered by the view on mount. Used when no task is selected.
2. **Active List Handler** - Registered by a list when it has a selection. Takes priority over view default.

```
User presses Cmd+N
       ↓
Global handler calls triggerCreate()
       ↓
Is there an activeListHandler? ─Yes→ Use it (create after selected task)
       │
       No
       ↓
Is there a viewDefaultHandler? ─Yes→ Use it (create at section end)
       │
       No
       ↓
Do nothing
```

### Store Changes

```typescript
interface TaskCreationState {
  // === NEW: View-level default (fallback when no task selected) ===
  viewDefaultHandler: CreateTaskHandler | null
  viewDefaultOnTaskCreated: ((taskId: string) => void) | null  // For triggering edit mode

  // === NEW: List-level (when a task is selected in a specific list) ===
  activeListId: string | null
  activeListHandler: CreateTaskHandler | null
  activeListSelectedTaskId: string | null
  activeListCallbacks: {
    setEditingTaskId: ((id: string | null) => void) | null
    setSelectedIndex: ((index: number | null) => void) | null
    taskCount: number
  } | null

  // === LEGACY: Keep for backward compat with DraggableTaskList ===
  createTaskHandler: CreateTaskHandler | null
  selectedTaskId: string | null
  setEditingTaskId: ((id: string | null) => void) | null
  setSelectedIndex: ((index: number | null) => void) | null
  insertInOrderHandler: ((newId: string, afterId: string | null) => void) | null
  taskCount: number

  // === NEW Actions ===
  registerViewDefault: (config: {
    handler: CreateTaskHandler
    onTaskCreated?: (taskId: string) => void  // Called after creation for edit mode
  } | null) => void
  activateList: (listId: string, context: {
    handler: CreateTaskHandler
    selectedTaskId: string
    setEditingTaskId?: (id: string | null) => void
    setSelectedIndex?: (index: number | null) => void
    taskCount: number
  }) => void
  deactivateList: (listId: string) => void
  updateActiveListSelection: (taskId: string | null, index: number | null) => void

  // === LEGACY Actions (keep working) ===
  registerContext: (context: {...}) => void
  unregisterContext: () => void
  updateSelection: (taskId: string | null, index: number | null) => void

  // === Unified trigger ===
  triggerCreate: () => Promise<string | undefined>
}
```

**Priority in `triggerCreate`:**
```
activeListHandler → viewDefaultHandler → createTaskHandler (legacy)
```

**Edit mode handling:**
- Active list: `triggerCreate` calls `activeListCallbacks.setEditingTaskId(newTaskId)`
- View default: `triggerCreate` calls `viewDefaultOnTaskCreated(newTaskId)` (view sets `pendingEditItemId`)
- Legacy: `triggerCreate` calls `setEditingTaskId(newTaskId)` (existing behavior)

### View Default Handlers

Each view registers its default handler on mount:

| View | Default Section | Handler |
|------|----------------|---------|
| TodayView | Scheduled for Today | `handleCreateScheduledTask` (creates with `scheduled: today`) |
| AreaView | Loose Tasks | `handleCreateLooseTask` (creates with `area: areaId`) |
| NoAreaView | Loose Tasks | `handleCreateOrphanTask` (creates with no project/area) |
| InboxView | Inbox list | `handleCreateTask` (creates with `status: inbox`) |
| ProjectView | Project list | `handleCreateTask` (creates with `project: projectId`) |

### List Activation/Deactivation

Lists (TaskList, OrderedItemList) register when they have a selection:

```typescript
// When selection changes
useEffect(() => {
  if (selectedIndex !== null && tasks[selectedIndex] && onCreateTask) {
    // This list has a selection - become active
    useTaskCreationStore.getState().activateList(projectId, {
      handler: onCreateTask,
      selectedTaskId: tasks[selectedIndex].id,
      setEditingTaskId,
      setSelectedIndex,
      taskCount: tasks.length,
    })
  } else {
    // Selection cleared - deactivate this list
    useTaskCreationStore.getState().deactivateList(projectId)
  }
}, [projectId, selectedIndex, tasks, onCreateTask])
```

The `deactivateList(listId)` only clears the active handler if `listId` matches `activeListId`. This prevents List A from accidentally clearing List B's registration.

### Multi-List Conflict Resolution

When multiple lists exist (e.g., Area view with 5 project groups):

1. User clicks task in Project A → `activateList('projectA', ...)` → Project A is active
2. User clicks task in Project B → `activateList('projectB', ...)` → Project B is now active (overwrites)
3. User clicks task in Project A again → `activateList('projectA', ...)` → Project A is active
4. User presses Escape (clears selection in Project A) → `deactivateList('projectA')` → No active list
5. Cmd+N now uses view default → Creates in Loose Tasks

**Key Insight:** Only ONE list can be active at a time. The last list where user selected a task wins.

---

## Implementation Phases

### Phase 1: Refactor Task Creation Store

**File:** `src/store/task-creation-store.ts`

**Changes:**

1. **Add new state fields** (don't remove existing ones):
   - `viewDefaultHandler: CreateTaskHandler | null`
   - `viewDefaultOnTaskCreated: ((taskId: string) => void) | null`
   - `activeListId: string | null`
   - `activeListHandler: CreateTaskHandler | null`
   - `activeListSelectedTaskId: string | null`
   - `activeListCallbacks: {...} | null`

2. **Add new actions:**
   - `registerViewDefault(config | null)` - stores handler + onTaskCreated callback
   - `activateList(listId, context)` - sets active list fields
   - `deactivateList(listId)` - clears active list **only if listId matches**
   - `updateActiveListSelection(taskId, index)` - updates selection within active list

3. **Keep legacy fields and actions unchanged:**
   - `createTaskHandler`, `selectedTaskId`, `setEditingTaskId`, etc.
   - `registerContext()`, `unregisterContext()`, `updateSelection()`
   - DraggableTaskList continues using these without modification

4. **Refactor `triggerCreate`:**
   ```typescript
   triggerCreate: async () => {
     const state = get()

     // Priority: activeList → viewDefault → legacy
     if (state.activeListHandler) {
       const afterTaskId = state.activeListSelectedTaskId
       const newTaskId = await state.activeListHandler(afterTaskId)
       if (newTaskId && state.activeListCallbacks?.setEditingTaskId) {
         state.activeListCallbacks.setEditingTaskId(newTaskId)
       }
       return newTaskId
     }

     if (state.viewDefaultHandler) {
       const newTaskId = await state.viewDefaultHandler(null)  // No afterTaskId
       if (newTaskId && state.viewDefaultOnTaskCreated) {
         state.viewDefaultOnTaskCreated(newTaskId)  // Triggers edit mode in view
       }
       return newTaskId
     }

     // Legacy fallback (existing code)
     if (state.createTaskHandler) {
       // ... existing implementation
     }

     return undefined
   }
   ```

5. **Optional: Add debug logging** (remove before merge):
   ```typescript
   console.log('[TaskCreationStore] triggerCreate:', {
     hasActiveList: !!state.activeListHandler,
     hasViewDefault: !!state.viewDefaultHandler,
     hasLegacy: !!state.createTaskHandler,
   })
   ```

**Why keep legacy fields:**
- DraggableTaskList works today and uses the legacy API
- Migrating it can happen later (or never - it's not broken)
- Avoids risk of breaking working views (Inbox, Project) while fixing broken ones

---

### Phase 2: Add View Default Handlers

**Files:**
- `src/components/views/today-view.tsx`
- `src/components/views/area-view.tsx`
- `src/components/views/no-area-view.tsx`
- `src/components/views/inbox-view.tsx`
- `src/components/views/project-view.tsx`

**Key Insight: Reuse existing handlers**

Each view already has a `handleCreate...` function for its default section. These handlers already:
- Create tasks with correct defaults
- Update order arrays (insert after or append)
- Return the new task ID

We just need to register them as view defaults and add the `onTaskCreated` callback for edit mode.

**Pattern for each view:**
```typescript
// Views already have pendingEditItemId state for header button "+ Task"
const [pendingEditItemId, setPendingEditItemId] = useState<string | null>(null)

// Existing handler (already works, just need to register it)
const handleCreateInDefaultSection = useCallback(async (afterTaskId: string | null) => {
  const newTask = await createTask.mutateAsync({...})
  // ... order update logic (append if afterTaskId is null)
  return newTask.id
}, [...])

// NEW: Register as view default with edit mode callback
useEffect(() => {
  useTaskCreationStore.getState().registerViewDefault({
    handler: handleCreateInDefaultSection,
    onTaskCreated: (taskId) => setPendingEditItemId(taskId),
  })
  // No cleanup needed - next view will overwrite, or we'll update on re-render
  // Explicit null on unmount is optional but cleaner:
  return () => useTaskCreationStore.getState().registerViewDefault(null)
}, [handleCreateInDefaultSection])  // Note: may fire frequently, but that's OK
```

**View-Specific Details:**

| View | Existing Handler to Reuse | Default Section |
|------|--------------------------|-----------------|
| TodayView | `handleCreateScheduledTask` | Scheduled for Today |
| AreaView | `handleCreateLooseTask` | Loose Tasks |
| NoAreaView | `handleCreateOrphanTask` | Loose Tasks (orphan) |
| InboxView | `handleCreateTask` | Inbox list |
| ProjectView | `handleCreateTask` | Project task list |

**Note on InboxView and ProjectView:**
These views use DraggableTaskList which already registers via the legacy API. Adding view default registration provides a backup, but the legacy registration takes priority for these views. This is fine - both paths create in the same place.

**Verification (manual):**
- Open each view with no task selected
- Press Cmd+N
- Verify task created in correct section with correct defaults
- Verify task enters edit mode (cursor in title)

---

### Phase 3: Add List Activation to TaskList

**File:** `src/components/tasks/task-list.tsx`

**Changes to TaskList component:**

1. **Add activation/deactivation effect with proper guards and cleanup:**

```typescript
// Add near other effects in TaskList
useEffect(() => {
  if (!onCreateTask) return

  // Guard: Ensure selectedIndex is valid (tasks array can shrink)
  const hasValidSelection =
    selectedIndex !== null &&
    selectedIndex < tasks.length &&
    tasks[selectedIndex] !== undefined

  if (hasValidSelection) {
    // Has valid selection - activate this list
    useTaskCreationStore.getState().activateList(projectId, {
      handler: (afterTaskId) => onCreateTask(afterTaskId),
      selectedTaskId: tasks[selectedIndex].id,
      setEditingTaskId,
      setSelectedIndex,
      taskCount: tasks.length,
    })
  } else {
    // No selection - deactivate (reverts to view default)
    useTaskCreationStore.getState().deactivateList(projectId)
  }

  // Cleanup: deactivate when this list unmounts
  return () => {
    useTaskCreationStore.getState().deactivateList(projectId)
  }
}, [projectId, selectedIndex, tasks.length, onCreateTask, setEditingTaskId, setSelectedIndex])
// Note: Using tasks.length instead of tasks to reduce effect frequency
```

2. **Update selection tracking (separate effect for clarity):**

```typescript
useEffect(() => {
  // Only update if this list is currently active
  const { activeListId } = useTaskCreationStore.getState()
  if (activeListId !== projectId) return

  const selectedTaskId =
    selectedIndex !== null && selectedIndex < tasks.length && tasks[selectedIndex]
      ? tasks[selectedIndex].id
      : null
  useTaskCreationStore.getState().updateActiveListSelection(selectedTaskId, selectedIndex)
}, [projectId, selectedIndex, tasks])
```

3. **Update local keyboard handler to prevent double-fire:**

In the existing `handleKeyDown` function, after handling Cmd+N:
```typescript
case 'n':
case 'N':
  if (isMeta && onCreateTask) {
    e.preventDefault()
    e.stopPropagation()  // ADD: Prevent global handler from also firing
    // ... existing create logic
  }
  break
```

**Why `tasks.length` in dependencies:**
Using `tasks.length` instead of `tasks` reduces effect frequency. The activation logic only cares whether the selected task exists, not the full array contents.

**Verification (manual):**
- In Area view, select a task in a project group
- Press Cmd+N
- Verify task created in that project, after selected task
- Verify task enters edit mode

---

### Phase 4: Add List Activation to OrderedItemList

**File:** `src/components/tasks/ordered-item-list.tsx`

**Same pattern as Phase 3, adapted for OrderedItemList:**

1. **Add activation/deactivation effect:**

```typescript
useEffect(() => {
  if (!onCreateTask) return

  // OrderedItemList uses selectedItemId (string) not selectedIndex (number)
  // Find the task if selected item is a task (not a heading)
  const selectedTask = selectedItemId
    ? items.find(item => item.type === 'task' && item.id === selectedItemId)
    : null

  if (selectedTask && selectedTask.type === 'task') {
    useTaskCreationStore.getState().activateList(containerId, {
      handler: (afterTaskId) => onCreateTask(afterTaskId),
      selectedTaskId: selectedTask.id,
      setEditingTaskId: setEditingItemId,  // Adapted name
      setSelectedIndex: null,  // OrderedItemList uses ID-based selection
      taskCount: items.filter(i => i.type === 'task').length,
    })
  } else {
    useTaskCreationStore.getState().deactivateList(containerId)
  }

  return () => {
    useTaskCreationStore.getState().deactivateList(containerId)
  }
}, [containerId, selectedItemId, items.length, onCreateTask, setEditingItemId])
```

2. **Update local keyboard handler:**

In the existing `handleKeyDown`, add `e.stopPropagation()` after handling Cmd+N.

**Note:** OrderedItemList manages selection by ID (`selectedItemId`) rather than index. The activation context adapts accordingly - `setSelectedIndex` may be null since the pattern is different.

**Verification (manual):**
- In Today view, select a task in "Scheduled for Today" section
- Press Cmd+N
- Verify task created in that section, after selected task
- Verify task enters edit mode

---

### Phase 5: Update DraggableTaskList (Optional Cleanup)

**File:** `src/components/tasks/task-list.tsx` (DraggableTaskList)

**Current:** DraggableTaskList uses the old `registerContext`/`unregisterContext` API.

**Options:**
1. **Keep as-is:** Backward compatibility layer handles it
2. **Migrate:** Update to use new `activateList`/`deactivateList` API
3. **Remove registration:** Since it wraps TaskList which now registers, might be redundant

**Recommended:** Keep as-is for Phase 5, consider cleanup in Phase 7.

---

### Phase 6: Fix Selection Shift Bug

**Likely Cause:**

The "selection shift" (pressing Cmd+N causes a different task to appear with blue background) is probably browser `:focus` styling, not React selection state. Here's why:

1. Global handler fires, calls `e.preventDefault()`, calls `triggerCreate()`
2. `triggerCreate()` does nothing (no handler registered in current broken state)
3. Browser's focus management moves focus to a focusable element (sortable items have `tabIndex`)
4. CSS `:focus` styles show the "selected" appearance
5. But React's `selectedIndex` state wasn't updated

**First Fix (may resolve entirely):**

Once Phases 1-4 are complete, `triggerCreate()` will actually create a task. Focus will move to the new task's title input. The bug may simply go away.

**If bug persists, try:**

1. **Add `e.stopPropagation()` to global handler:**

```typescript
// src/hooks/use-keyboard-shortcuts.ts
case 'n':
case 'N': {
  if (e.defaultPrevented) break
  // ... input check
  e.preventDefault()
  e.stopPropagation()  // ADD: Prevent event from reaching other listeners
  useTaskCreationStore.getState().triggerCreate()
  break
}
```

2. **If still happening, investigate with logging:**

```typescript
// Temporarily add to global handler:
console.log('[Cmd+N] Global handler fired', {
  activeElement: document.activeElement,
  target: e.target,
})

// Add to TaskList handleKeyDown:
console.log('[Cmd+N] Local handler fired', {
  hasFocus: containerRef.current === document.activeElement,
})
```

3. **Nuclear option (if nothing else works):**

Add `outline: none` to sortable items. This hurts accessibility but eliminates the visual bug. Only use as last resort.

**Verification:**
- Press Cmd+N in Area view with task selected
- Verify no spurious visual selection shift
- Verify task is created correctly and enters edit mode

---

### Phase 7: Manual Verification & Cleanup

**Manual Verification Checklist:**

Run through these scenarios after implementation:

- [ ] Inbox: Cmd+N with task selected → creates after, edit mode
- [ ] Inbox: Cmd+N with no selection → creates at end, edit mode
- [ ] Project (list): Cmd+N with task selected → creates after, edit mode
- [ ] Project (list): Cmd+N with no selection → creates at end, edit mode
- [ ] Today: Cmd+N with task in Scheduled selected → creates after, edit mode
- [ ] Today: Cmd+N with task in Overdue selected → creates in Overdue, after
- [ ] Today: Cmd+N with no selection → creates in Scheduled at end
- [ ] Area: Cmd+N with task in project group selected → creates in that project
- [ ] Area: Cmd+N with no selection → creates in Loose Tasks
- [ ] NoArea: Same as Area
- [ ] Empty view: Cmd+N creates in default section
- [ ] While editing task title: Cmd+N is ignored
- [ ] Cancel with Escape: Empty task is deleted

**Cleanup:**

1. Remove any debug logging added during implementation
2. Verify no console warnings/errors
3. Run `bun run check:all` to ensure no lint/type issues

---

## Future Considerations

### Kanban View Support

Currently skipped. To add Cmd+N support for kanban:

1. Determine which column gets new tasks (probably "ready" or first visible)
2. KanbanBoard would need to register with the store
3. New tasks would need column-based positioning

The dual-handler architecture supports this:
- KanbanBoard registers as view default when in kanban mode
- Individual kanban columns could activate when clicked (optional enhancement)

### Calendar View Support

Similar approach:
- CalendarView registers default handler
- New tasks created on currently visible/selected date
- Time-based positioning if applicable

### Quick Add Integration

The Quick Add pane (separate window) creates tasks via different mechanism. This task focuses on in-app Cmd+N. Quick Add should continue working independently.

---

## Tests to Add (Copy to Testing Task)

When adding automated tests for this feature, cover:

### Unit Tests: `task-creation-store.ts`

```
- triggerCreate() with activeListHandler set → calls activeListHandler
- triggerCreate() with only viewDefaultHandler set → calls viewDefaultHandler
- triggerCreate() with only legacy createTaskHandler set → calls legacy handler
- triggerCreate() with no handlers → returns undefined
- activateList() overwrites previous activeList
- deactivateList(id) only clears if id matches activeListId
- deactivateList(id) is no-op if id doesn't match
- registerViewDefault(null) clears view default
- Edit mode callbacks are called after successful creation
```

### Integration Tests: Task Creation Flow

```
- Cmd+N in Inbox creates task with status: inbox
- Cmd+N in Project creates task with project link
- Cmd+N in Today creates task with scheduled: today
- Cmd+N after selected task inserts at correct position
- Cmd+N with no selection appends to end
- Cmd+N while editing is ignored (input check)
- Escape after Cmd+N deletes empty task
- Task enters edit mode after creation
- Blur clears selection and deactivates list
- Clicking between lists switches active list correctly
```

### Edge Case Tests

```
- View switch during async task creation (stale callback safety)
- Rapid Cmd+N presses (debounce/queue behavior)
- Cmd+N on collapsed section (should work, expand section)
- Empty view Cmd+N (creates in default section)
- Multi-list view: selection in List A, click List B, Cmd+N → creates in List B
```

---

## Files to Modify

### Phase 1
- `src/store/task-creation-store.ts`

### Phase 2
- `src/components/views/today-view.tsx`
- `src/components/views/area-view.tsx`
- `src/components/views/no-area-view.tsx`
- `src/components/views/inbox-view.tsx`
- `src/components/views/project-view.tsx`

### Phase 3
- `src/components/tasks/task-list.tsx` (TaskList component)

### Phase 4
- `src/components/tasks/ordered-item-list.tsx`

### Phase 5 (Optional)
- `src/components/tasks/task-list.tsx` (DraggableTaskList section)

### Phase 6
- `src/hooks/use-keyboard-shortcuts.ts` (add stopPropagation)
- Possibly CSS files if focus styling needs adjustment

---

## Success Criteria

1. Cmd+N works in ALL list views (Inbox, Project, Today, Area, NoArea)
2. With task selected: creates after that task, enters edit mode
3. Without selection: creates in view's default section, at end
4. No "selection shift" bug when pressing Cmd+N
5. Cancel (Escape) before confirming deletes the new empty task
6. Existing functionality preserved (drag-drop, reordering, etc.)
7. Architecture supports future kanban/calendar extension

---

## Known Risks & Watchouts

Things identified during planning that need attention during implementation:

1. **Effect dependency on `tasks` array**: The `tasks` prop creates a new array reference each render. Using `tasks.length` in effect dependencies reduces churn, but verify it's sufficient for correctness.

2. **Blur behavior assumption**: The plan assumes clicking in List B triggers blur on List A, which clears List A's selection. Verify this actually happens with the current TaskList implementation. If `relatedTarget` handling is buggy, the multi-list activation model breaks.

3. **Effect order matters**: The selection guard in Phase 3 protects against stale `selectedIndex`, but only if our effect runs after the existing index-fix-up effect. Effects run in definition order within a component - verify our new effect is placed correctly.

4. **Async handler + unmount**: If view unmounts while `triggerCreate` is awaiting the handler, callbacks may be stale. React setState on unmounted components is a no-op (with warning), so this should be safe, but watch for warnings in console.

5. **View default handler changes frequently**: The handler depends on order arrays that change often. This causes frequent `registerViewDefault` calls. Should be cheap (Zustand updates are fast), but watch for performance issues in complex views.

---

## Session Notes

_Space for tracking progress across sessions. Update after each work session._

### Session 1: [Date]
- [ ] Phase 1 complete
- [ ] Notes:

### Session 2: [Date]
- [ ] Phase 2 complete
- [ ] Notes:

### Session 3: [Date]
- [ ] Phases 3-4 complete
- [ ] Notes:

### Session 4: [Date]
- [ ] Phase 6 complete (bug fix)
- [ ] Phase 7 testing complete
- [ ] Notes:
