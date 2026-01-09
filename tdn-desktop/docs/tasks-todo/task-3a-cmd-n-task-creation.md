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
  // View-level default (fallback when no task selected)
  viewDefaultHandler: CreateTaskHandler | null

  // List-level (when a task is selected in a specific list)
  activeListId: string | null
  activeListHandler: CreateTaskHandler | null
  activeListSelectedTaskId: string | null
  activeListCallbacks: {
    setEditingTaskId: ((id: string | null) => void) | null
    setSelectedIndex: ((index: number | null) => void) | null
    taskCount: number
  } | null

  // Actions
  registerViewDefault: (handler: CreateTaskHandler | null) => void
  activateList: (listId: string, context: {
    handler: CreateTaskHandler
    selectedTaskId: string
    setEditingTaskId?: (id: string | null) => void
    setSelectedIndex?: (index: number | null) => void
    taskCount: number
  }) => void
  deactivateList: (listId: string) => void
  updateActiveListSelection: (taskId: string | null, index: number | null) => void
  triggerCreate: () => Promise<string | undefined>
}
```

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
1. Add new state fields: `viewDefaultHandler`, `activeListId`, `activeListHandler`, `activeListSelectedTaskId`, `activeListCallbacks`
2. Add new actions: `registerViewDefault`, `activateList`, `deactivateList`, `updateActiveListSelection`
3. Refactor `triggerCreate` to check activeListHandler first, then viewDefaultHandler
4. Keep existing API (`registerContext`, `unregisterContext`) as aliases for backward compatibility during transition
5. Add debug logging (can be removed later) to trace registration flow

**Backward Compatibility:**
- `registerContext` → calls `activateList` with a generated ID
- `unregisterContext` → calls `deactivateList`
- This allows DraggableTaskList to continue working unchanged during transition

**Testing:**
- Unit test triggerCreate with various combinations of handlers
- Test that deactivateList only clears matching listId

---

### Phase 2: Add View Default Handlers

**Files:**
- `src/components/views/today-view.tsx`
- `src/components/views/area-view.tsx`
- `src/components/views/no-area-view.tsx`
- `src/components/views/inbox-view.tsx`
- `src/components/views/project-view.tsx`

**Pattern for each view:**
```typescript
// At top of component
const handleDefaultCreate = useCallback(async () => {
  // Create task with appropriate defaults for this view
  const newTask = await createTask.mutateAsync({...})
  // Insert at end of default section
  // Return task ID
  return newTask.id
}, [createTask, ...])

// Register as view default
useEffect(() => {
  useTaskCreationStore.getState().registerViewDefault(handleDefaultCreate)
  return () => useTaskCreationStore.getState().registerViewDefault(null)
}, [handleDefaultCreate])
```

**View-Specific Logic:**

| View | Default Create Logic |
|------|---------------------|
| TodayView | `scheduled: today`, insert at end of Scheduled section order |
| AreaView | `area: areaId`, insert at end of loose tasks order |
| NoAreaView | No project/area, insert at end of orphan tasks order |
| InboxView | `status: inbox`, insert at end of inbox order |
| ProjectView | `project: projectId`, insert at end of project order |

**Testing:**
- Open each view with no task selected
- Press Cmd+N
- Verify task created in correct section with correct defaults

---

### Phase 3: Add List Activation to TaskList

**File:** `src/components/tasks/task-list.tsx`

**Changes to TaskList component:**
1. Add effect to activate list when selection exists
2. Add effect to deactivate list when selection clears
3. Use `projectId` prop as the unique list identifier

```typescript
// Add near other effects in TaskList
useEffect(() => {
  if (!onCreateTask) return

  if (selectedIndex !== null && tasks[selectedIndex]) {
    // Has selection - activate this list
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
}, [projectId, selectedIndex, tasks, onCreateTask, setEditingTaskId, setSelectedIndex])

// Also update selection in store for accurate afterTaskId
useEffect(() => {
  const selectedTaskId = selectedIndex !== null && tasks[selectedIndex]
    ? tasks[selectedIndex].id
    : null
  useTaskCreationStore.getState().updateActiveListSelection(selectedTaskId, selectedIndex)
}, [selectedIndex, tasks])
```

**Keep existing local keyboard handler** but ensure it works correctly:
- Local handler fires when container is focused
- Should call `e.stopPropagation()` after handling to prevent global double-fire
- Global handler is fallback when container not focused

**Testing:**
- In Area view, select a task in a project group
- Press Cmd+N
- Verify task created in that project, after selected task

---

### Phase 4: Add List Activation to OrderedItemList

**File:** `src/components/tasks/ordered-item-list.tsx`

**Same pattern as Phase 3:**
1. Add activation effect when selection exists
2. Add deactivation effect when selection clears
3. Use `containerId` prop as unique list identifier
4. Ensure local keyboard handler calls `e.stopPropagation()` after handling

**Testing:**
- In Today view, select a task in "Scheduled for Today" section
- Press Cmd+N
- Verify task created in that section, after selected task

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

**Investigation needed:**

The "selection shift" behavior (pressing Cmd+N causes a different task to appear selected) needs debugging:

1. Add console logging to trace which handlers fire
2. Check if dnd-kit's keyboard navigation is interfering
3. Check if browser focus is moving to a sortable item's focusable element

**Possible fixes:**
- Ensure `e.preventDefault()` is called before any focus can shift
- Add `e.stopPropagation()` to prevent event from reaching dnd-kit listeners
- Review ARIA attributes on sortable items

**Testing:**
- Press Cmd+N in Area view with task selected
- Verify no visual selection shift occurs
- Verify task is created correctly

---

### Phase 7: Testing and Edge Cases

**Comprehensive Test Matrix:**

| Scenario | View | Selection State | Expected Result |
|----------|------|----------------|-----------------|
| 1 | Inbox | Task selected | Create after selected, edit mode |
| 2 | Inbox | No selection | Create at end, edit mode |
| 3 | Project (list) | Task selected | Create after selected, edit mode |
| 4 | Project (list) | No selection | Create at end, edit mode |
| 5 | Today - Scheduled | Task selected | Create after selected, edit mode |
| 6 | Today - Overdue | Task selected | Create in Overdue section, after selected |
| 7 | Today | No selection | Create in Scheduled at end |
| 8 | Area - Loose Tasks | Task selected | Create after selected |
| 9 | Area - Project Group | Task selected | Create in that project, after selected |
| 10 | Area | No selection | Create in Loose Tasks at end |
| 11 | NoArea - Loose Tasks | Task selected | Create after selected |
| 12 | NoArea - Project Group | Task selected | Create in that project, after selected |
| 13 | NoArea | No selection | Create in Loose Tasks at end |

**Edge Cases:**

| Case | Expected Behavior |
|------|-------------------|
| Empty view (no tasks anywhere) | Create in default section |
| Editing task title when Cmd+N pressed | Ignore (global handler skips inputs) |
| Task detail panel open | Cmd+N should still work (focus not on input) |
| Section collapsed | Create still works, section should expand |
| Cancel new task (Escape) | Delete the empty task, restore previous selection |

**Verify Delete-on-Cancel:**
The existing code tracks `newlyCreatedTaskId` and `editConfirmedRef` to delete tasks canceled with Escape. Ensure this still works after changes.

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
- `src/components/tasks/task-list.tsx`

### Phase 4
- `src/components/tasks/ordered-item-list.tsx`

### Phase 5 (Optional)
- `src/components/tasks/task-list.tsx` (DraggableTaskList section)

### Phase 6
- Debugging, may touch multiple files

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
