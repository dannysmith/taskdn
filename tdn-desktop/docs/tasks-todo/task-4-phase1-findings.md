# Phase 1 Findings: UI Component Review

This document contains findings from the comprehensive review of the React component architecture.

---

## 1. UI Component Inventory

### Overview

| Metric                  | Count |
| ----------------------- | ----- |
| **Total UI components** | 47    |
| **shadcn-sourced**      | 37    |
| **Custom-built**        | 10    |

A full list is maintained in `src/components/ui/README.md`.

### Architecture Patterns

**Excellent patterns observed:**

1. **Slot-based styling** - Consistent `data-slot` attributes for CSS targeting
2. **CVA + cn()** - Consistent variant management with class merging
3. **Multi-component exports** - Composable families (Field, Item, Sidebar systems)
4. **Context-based variants** - Shared configuration (toggle-group, sidebar)
5. **forwardRef pattern** - Input and Textarea now both use consistent forwardRef pattern

### Issues Found & Resolved

| Issue                                           | Resolution                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| Duplicate empty components (`empty.tsx` unused) | Deleted `empty.tsx`, kept `empty-state.tsx` which is actively used |
| Inconsistent input/textarea pattern             | Updated `input.tsx` to use forwardRef like `textarea.tsx`          |
| KbdGroup type mismatch                          | Fixed type from `'div'` to `'kbd'`                                 |

---

## 2. Component Hierarchy Review

### Current Hierarchy

```
main.tsx
└─ QueryClientProvider
   └─ App.tsx
      ├─ usePreventEscapeExitsFullscreen()
      ├─ useVaultInitialization()
      ├─ useDeepLink()
      └─ useEffect() [app startup: commands, i18n, menu, updates]
      │
      └─ ErrorBoundary
         └─ ThemeProvider
            └─ MainWindow
               ├─ useUIStore() [sidebar visibility - correct selector pattern]
               ├─ useMainWindowEventListeners()
               │
               └─ <div> (flex container)
                  ├─ TitleBar
                  │  └─ Platform-specific: macOS/Windows/Linux
                  │
                  └─ ResizablePanelGroup
                     ├─ LeftSideBar
                     │  └─ SidebarProvider
                     │     └─ AppSidebar
                     │
                     ├─ MainWindowContent
                     │  ├─ ViewHeader
                     │  └─ [View router: Inbox, Today, Week, Calendar, Project, Area]
                     │
                     └─ RightSideBar
                        └─ TaskDetailPanel

                     [Global modals]
                     ├─ CommandPalette
                     ├─ PreferencesDialog
                     └─ Toaster
```

### Good Patterns Observed

1. **Correct Zustand usage** - Selector pattern throughout, no destructuring
2. **Proper provider stack** - QueryClient → App → ErrorBoundary → Theme → MainWindow
3. **Initialization in App** - Heavy startup logic at the right level
4. **Global modals at MainWindow level** - CommandPalette, PreferencesDialog, Toaster correctly placed
5. **Helper components localized** - HeaderViewToggle, PlaceholderView defined in MainWindowContent

### Issues Found & Resolved

| Issue                                       | Resolution                                          |
| ------------------------------------------- | --------------------------------------------------- |
| ContentArea component unused                | Deleted `ContentArea.tsx`                           |
| layout/index.ts had cross-directory exports | Removed TitleBar and MacOSWindowControls re-exports |

### Issues Kept As-Is (By Design)

| Issue                               | Rationale                                                               |
| ----------------------------------- | ----------------------------------------------------------------------- |
| LeftSideBar wrapper                 | Justified - handles SidebarProvider wrapping and state bridging         |
| RightSideBar wrapper                | Justified - allows future flexibility for different right panel content |
| MainWindowContent size (~236 lines) | Manageable - would only extract if it grows significantly               |

---

## 3. File Tree Organization Review

### Current Structure

```
src/components/
├── calendar/         (6 files)  - Calendar view sub-components
├── cards/            (4 files)  - TaskCard, ProjectCard, AreaCard
├── command-palette/  (2 files)  - Command palette modal
├── headings/         (4 files)  - Area/project heading components
├── kanban/           (5 files)  - Kanban view sub-components
├── layout/           (6 files)  - Page structure, resizable panels
├── preferences/      (5+2 files) - Settings dialog with panes/ and shared/
├── projects/         (3 files)  - Project status badges/pills
├── providers/        (2 files)  - ErrorBoundary, ThemeProvider [NEW]
├── quick-pane/       (1 file)   - Separate window entry
├── sidebar/          (4 files)  - Left sidebar navigation
├── tasks/            (16 files) - Task display & editing (LARGEST)
├── titlebar/         (7 files)  - Platform-specific window chrome
├── ui/               (47 files) - Design system primitives
└── views/            (8 files)  - Top-level view containers
```

**Total: ~117 component files across 15 directories**

### Good Patterns Observed

1. **Clear feature separation** - tasks, views, calendar, kanban well-isolated
2. **Index files for clean exports** - Every directory has barrel exports
3. **Platform-specific code grouped** - titlebar/ has macOS, Windows, Linux variants
4. **preferences/ has subdirectories** - panes/ and shared/ for logical grouping
5. **providers/ now groups utility wrappers** - ErrorBoundary, ThemeProvider in dedicated directory

### Issues Found & Resolved

| Issue                                   | Resolution                          |
| --------------------------------------- | ----------------------------------- |
| Root-level utility providers            | Moved to new `providers/` directory |
| layout/index.ts cross-directory exports | Cleaned up barrel exports           |

### Issues Kept As-Is (By Design)

| Issue                        | Rationale                                       |
| ---------------------------- | ----------------------------------------------- |
| tasks/ is largest (16 files) | Manageable - will subdivide if it grows past 20 |
| quick-pane/ has only 1 file  | Intentional - separate Tauri window context     |

### Remaining Work: Naming Convention (Phase 4)

Two conventions currently coexist:

| Convention     | Where Used                                                                      |
| -------------- | ------------------------------------------------------------------------------- |
| **PascalCase** | layout/, titlebar/, preferences/, command-palette/, quick-pane/, providers/     |
| **kebab-case** | tasks/, views/, calendar/, kanban/, cards/, sidebar/, headings/, projects/, ui/ |

**Phase 4 action**: Rename all non-ui/ files to PascalCase for consistency.

---

## 4. Additional Observations

### What's Working Well

1. **State management** - Zustand selectors used correctly everywhere
2. **Path aliases** - Consistent use of `@/components/...`
3. **Barrel exports** - Clean import statements
4. **Separation of concerns** - Layout vs views vs UI primitives clear
5. **shadcn patterns** - `data-slot`, CVA, cn() used consistently
6. **Accessibility** - Proper ARIA attributes, keyboard handling

### Potential Future Concerns

1. **No shared DnD context location** - `task-dnd-context.tsx` in tasks/, `kanban-dnd-context.tsx` in kanban/. If they share logic, consider a `dnd/` directory.

2. **Views could grow** - Currently 8 views is fine. If views become complex (sub-views, shared logic), consider `views/inbox/`, `views/calendar/` subdirectories.

---

## Summary of Phase 1 Changes Made

### Files Deleted

- `src/components/ui/empty.tsx` (unused, shadcn Empty component)
- `src/components/layout/ContentArea.tsx` (unused)

### Files Modified

- `src/components/ui/input.tsx` - Updated to use forwardRef pattern
- `src/components/ui/kbd.tsx` - Fixed KbdGroup type from 'div' to 'kbd'
- `src/components/layout/index.ts` - Removed cross-directory exports
- `src/App.tsx` - Updated imports for moved providers

### Files Created

- `src/components/providers/` directory
- `src/components/providers/index.ts` - Barrel exports
- `src/components/ui/README.md` - Component inventory
- `src/components/ui/CLAUDE.md` - AI agent reference

### Files Moved

- `ErrorBoundary.tsx` → `providers/ErrorBoundary.tsx`
- `ThemeProvider.tsx` → `providers/ThemeProvider.tsx`

---

## Remaining Phases

- **Phase 3**: No structural changes needed beyond what was done here
- **Phase 4**: Naming convention migration (kebab-case → PascalCase for non-ui/)
- **Phase 5**: UI Component Reference view (dev-only showcase)
