# Task: UI Component Review

This task involves reviewing and restructuring our React component architecture. It combines review work (requiring decisions) with implementation work (clear actions).

NOTE: Well this document provides a structure to work from and I particularly want to focus on the things in it, If in the course of your various reviews and exploration you find other architectural problems to do with our React code you are free to suggest those two.

---

## Phase 1: Review & Analysis

**Goal**: Understand the current state before making any changes. This phase produces a findings document with recommendations.

### 1.1 UI Component Inventory

Review all components in `ui/` and document:

- Which components originated from shadcn vs hand-written
- Whether they follow shadcn patterns (using BaseUI primitives correctly, etc.)
- Any components that are near-duplicates or have inconsistent prop APIs
- Multi-component systems (like `sidebar.tsx`) that export many related components

**Context**: We want to potentially separate shadcn-sourced components from custom ones. Not to keep shadcn pristine (editing them is the point), but to know which ones to check when updating from shadcn. If we do separate them (e.g., `ui/primitives/` vs `ui/components/`), we need consistent imports. Bear in mind many shadcn components export multiple sub-components.

### 1.2 Component Hierarchy Review

Critically review the current hierarchy:

```
main.tsx
  └─ QueryClientProvider
      └─ App.tsx
          └─ ThemeProvider
              └─ ErrorBoundary
                  └─ MainWindow.tsx
                      ├─ TitleBar (OS-specific)
                      ├─ LeftSidebar → AppSidebar
                      ├─ RightSidebar → TaskDetailPanel
                      ├─ MainWindowContent → ViewHeader + Views
                      └─ (invisible: CommandPalette, Toaster, Preferences)
```

Look for:

- **Unnecessary wrappers**: LeftSidebar wrapping AppSidebar seems redundant if it's always 1:1. RightSidebar may be justified if we'll show other content there in future.
- **Misplaced logic**: Is functionality at the right level? (QueryClientProvider in main.tsx, ThemeProvider in App.tsx makes sense—are there other cases that don't?)
- **Naming improvements**: Are component names clear about what they do?
- **Wrapper divs with Tailwind**: Could styling move up/down the tree for clarity?

**Goal**: The hierarchy should be obvious to both humans and AI agents—where to find things, where to add new code.

### 1.3 File Tree Organization Review

Review how components are organized in the file tree:

- `ui/` - Clear: design system primitives
- `layout/` - Clear: top-level main app layout
- `quick-pane/` - Clear: separate window (future quick entry pane)
- `preferences/` - Clear: preferences pane components, all showin in the prefpane modal.
- `command-palette/` - Clear: Pretty independant "modal" interface.
- `views/` - Clear: One per "main view" in the app. This is what gets rendered in MainWindoContent
- `tasks/` - Contains task-related components (TaskCard, TaskListItem, etc.)
- etc

**Question**: Is there a better structure as the codebase grows? The current organization is fairly logical in may ways, and we should certainally keep `ui`, `layout`, `quick-pane` etc. But there may be a solid opportunity to thing more about the rest. **This is about thinking ahead for future maintainability**

---

## Phase 2: Decisions

Based on Phase 1 findings, make decisions on:

1. **shadcn separation**: Should we separate shadcn-sourced from custom UI components? If so, what structure?
2. **Hierarchy changes**: What wrappers should be eliminated or added? Any renamings?
3. **File tree changes**: Any reorganization needed?

These decisions inform Phase 3.

---

## Phase 3: Structural Changes

Implement the decisions from Phase 2:

- Reorganize `ui/` directory structure (if decided)
- Simplify component hierarchy (eliminate unnecessary wrappers, rename components)
- Restructure file tree (if decided)
- Ensure imports remain clean and consistent

---

## Phase 4: Naming Convention Migration

**Clear action, no decision needed.**

Rename all component files outside `ui/` from kebab-case to PascalCase.

**The rule**:
- **kebab-case** (`button.tsx`) = Design system primitives in `ui/`. Stateless, no side effects, reusable anywhere.
- **PascalCase** (`TaskCard.tsx`) = App-specific components. May have side effects, tied to this application.

This should happen after structural changes are complete to avoid churn.

---

## Phase 5: UI Component Reference

**Clear action, but depends on Phases 1-4 being complete.**

Create a development-only view that showcases all reusable components with fake data.

**Scope**:
- UI primitives (shadcn-sourced and custom)
- Reusable app components (TaskCard, AreaCard, TaskListItem, DueDatePicker, etc.)

**Not in scope**:
- Layout components (ViewHeader, AppSidebar)
- Non-reusable components tied to specific features

**Purpose**:
- Work on styling/interactivity in isolation
- Spot visual inconsistencies
- Find duplicated or similar components with inconsistent APIs
- Document component APIs (props)

**Consideration**: For multi-component systems like `sidebar.tsx`, show them in a usage pattern rather than individually.

---

## Execution Notes

- **Phase 1** is pure review—no code changes. Produces a findings document.
- **Phase 2** requires your input on decisions.
- **Phases 3-5** are implementation work.
- **Phase 5** could theoretically be built earlier as a review tool, but makes more sense after restructuring is complete so we're not documenting a moving target.
