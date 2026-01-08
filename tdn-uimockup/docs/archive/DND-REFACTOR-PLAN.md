# Drag-and-Drop Refactor Plan

This document outlines the work done to improve the feel and smoothness of drag-and-drop in task lists and sidebar, bringing them up to the quality of the Kanban and Calendar views.

## Quick Summary

**Problem:** Task list drag-and-drop felt janky compared to Kanban/Calendar.

**Root cause:** Transform suppression during cross-container drag, plus per-item state calculations.

**Final solution:** CSS gap animation approach - track hover position during drag, apply margin to create visual gap in target container.

**Status: Complete (Jan 2025)**

---

## What's Been Implemented

### Phase 1: New Component Architecture

1. **Created `TaskItem` component** (`task-item.tsx`)
   - Pure presentational component with no DnD awareness
   - Handles display, editing, selection, status toggle

2. **Created `SortableTaskItem` component** (`sortable-task-item.tsx`)
   - Wrapper following `SortableKanbanCard` pattern
   - Always applies transforms (no suppression)
   - Simple `opacity-50` when dragging
   - Shows CSS gap when it's the cross-container insertion point

3. **Updated `TaskList`** (`task-list.tsx`)
   - Uses `SortableTaskItem` instead of old `TaskListItem`
   - Handles trailing gap for "append at end" drops
   - Cleans up hover state when dropped task appears

4. **Simplified `TaskDndContext`** (`task-dnd-context.tsx`)
   - Uses `over.data.current` directly to determine drop target
   - Tracks `crossContainerHover` state for CSS gap animation
   - No complex visual state management during drag

### Phase 2: Cross-Container "Making Room" Animation

The key challenge was showing items shift to "make room" when dragging across containers.

**Implementation (CSS Gap Approach):**

1. `handleDragOver` tracks cross-container hover state:
   - `targetContainerId`: which container the cursor is over
   - `insertBeforeId`: which task to insert before (null = append)

2. `SortableTaskItem` applies `mt-10` margin when it's the insertion point

3. `TaskList` shows a trailing gap div for append-at-end cases

4. State cleanup happens when the dropped task appears in the target list (prevents visual jump)

**Key files:**
- `src/components/tasks/task-dnd-context.tsx` - Hover tracking and state management
- `src/components/tasks/sortable-task-item.tsx` - Gap rendering via CSS margin
- `src/components/tasks/task-list.tsx` - Trailing gap and cleanup logic

---

## What Works

- Within-container reordering (items shift naturally via dnd-kit)
- Cross-container drops (task moves to correct project)
- Cross-container "making room" animation (CSS gap)
- Empty container drops (via `EmptyProjectDropZone`)
- Selection preserved after drop
- Keyboard navigation works
- Smooth drop animation

---

## Lessons Learned: Failed Approaches

### Failed Approach 1: visualItemsByContainer

We attempted to implement dnd-kit's official multi-container pattern (updating SortableContext items during drag). This failed for three reasons:

#### Issue 1: Collision Detection is Global

`closestCenter` collision detection considers ALL sortable items across ALL containers. When containers are stacked vertically, items near the boundary can "leak" into collision detection for adjacent containers.

**Example:** When dragging within Project1, if your cursor is closer to Project2's first item than to any Project1 item, collision detection returns the Project2 item. This causes:
- Visual state to think item moved to Project2
- Drop detection to fail (indices don't match)

#### Issue 2: Adding Unrendered Items Breaks Transforms

When we add a drag ID to a container's SortableContext items but there's no corresponding DOM element (because TaskList doesn't have that task's data), dnd-kit's transform calculations break:
- Items overlap incorrectly
- Transform positions are wrong
- Visual glitches occur

**The fundamental problem:** Each TaskList only has data for ITS tasks. When we add a foreign drag ID to its SortableContext, there's no element to render for it.

#### Issue 3: Visual State Diverges from Drop Target

React state updates are asynchronous. When `handleDragEnd` fires, `visualItemsByContainer` may have stale data from rapid `handleDragOver` updates. This caused drops to go to wrong containers or fail entirely.

### Failed Approach 2: Placeholder Element

We considered adding a real placeholder element to the target container's SortableContext. This would work because the placeholder DOES have a DOM element. However:

- More complex state management
- Need to coordinate placeholder position with collision detection
- Risk of oscillation at container boundaries
- Decided CSS gap was simpler and sufficient

---

## Why the CSS Gap Approach Works

The CSS gap approach sidesteps the fundamental issues:

1. **No SortableContext manipulation** - We never modify which items are in each container's SortableContext during drag. They always reflect the actual task data.

2. **Visual-only gap** - The margin creates a visual gap without confusing dnd-kit's transform calculations.

3. **Drop timing fix** - We don't clear the gap state until the dropped task actually appears in the target list, preventing the "jump up then down" visual glitch.

**Trade-offs:**
- Gap doesn't animate items naturally (it's a CSS margin, not dnd-kit transforms)
- But it's simple, reliable, and feels good enough

---

## Architecture Reference

### Component Hierarchy

```
TaskDndContext (provides DndContext + hover state)
├── SectionTaskGroup (Loose Tasks)
│   └── TaskList
│       └── SortableContext
│           └── SortableTaskItem (shows gap via margin)
│               └── TaskItem (presentational)
├── ProjectTaskGroup (per project)
│   └── TaskList
│       └── SortableContext
│           └── SortableTaskItem (shows gap via margin)
│               └── TaskItem (presentational)
```

### State Flow

```
1. User starts dragging task from Container A
   → dragPreview set with source info

2. User hovers over Container B
   → handleDragOver detects cross-container
   → crossContainerHover = { targetContainerId: B, insertBeforeId: X }

3. SortableTaskItem in Container B sees it's the insertion point
   → Applies mt-10 margin (gap appears)

4. User drops
   → onTaskMove called
   → lastDroppedTaskId set
   → crossContainerHover NOT cleared yet

5. Data updates, task appears in Container B
   → TaskList detects droppedTaskInList
   → Gap hidden (droppedTaskInList check)
   → Cleanup effect clears crossContainerHover and lastDroppedTaskId
```

### Key Files

```
src/components/tasks/
├── task-dnd-context.tsx     # Cross-project DnD context, hover tracking
├── task-list.tsx            # Task list with keyboard nav, trailing gap
├── task-item.tsx            # Presentational component
├── sortable-task-item.tsx   # Sortable wrapper with CSS gap
├── task-list-item.tsx       # Backward compatibility wrapper
├── ordered-item-list.tsx    # Mixed tasks + headings list
├── section-task-group.tsx   # Collapsible section wrapper
├── project-task-group.tsx   # Project section wrapper

src/components/kanban/
├── kanban-dnd-context.tsx   # Status-based DnD (reference implementation)
├── kanban-column.tsx        # Column with SortableKanbanCard
```

---

## Testing Checklist

### AreaView
- [x] Drag task within a project (reorder)
- [x] Drag task to a different project
- [x] Drag task to loose tasks section
- [x] Drag task from loose tasks to a project
- [x] Visual gap appears when hovering over target container
- [x] Keyboard navigation still works
- [x] Selection preserved after drop
- [x] Creating new tasks works

### TodayView
- [x] Drag task within scheduled-today section
- [x] Drag task from overdue to scheduled-today
- [x] Drag task from became-available to scheduled-today

### ProjectView / InboxView
- [x] Drag to reorder tasks (uses DraggableTaskList)
- [x] Keyboard reordering (Cmd+Arrow)

### General
- [x] Drop animation feels smooth
- [x] Dragged item opacity is consistent (50%)
- [x] Auto-selection of dropped task works
- [x] No visual jump on drop (gap closes as item appears)

---

## Potential Future Improvements

If the CSS gap approach ever feels insufficient:

1. **Custom collision detection** - Create a container-aware algorithm that first identifies which container bounds contain the cursor, then finds closest item within that container only. Would reduce boundary oscillation.

2. **Placeholder element approach** - More complex but would give true "items shifting" animation. Would need to carefully manage when placeholder appears/disappears.

3. **Top-level item ownership** - Major refactor where TaskDndContext owns all items and passes them to TaskLists. Would allow true multi-container SortableContext behavior but significant architectural change.

For now, the CSS gap approach is working well.
