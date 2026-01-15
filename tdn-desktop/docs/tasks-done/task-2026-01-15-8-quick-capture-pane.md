# Task: Quick Capture Pane

Build a polished quick capture pane for rapid task creation via global keyboard shortcut.

## Requirements Summary

- Global keyboard shortcut opens a floating panel on the currently focused screen
- Default view: Title textarea only (focused on open)
- `Cmd+Shift+Enter` toggles a body textarea below the title
- `Cmd+Enter` submits (creates task with status "inbox"), `Escape` cancels
- Save button disabled when title is empty
- Metadata can be assigned: status, project, area, scheduled/due/defer dates
- Keyboard navigable throughout
- Subtle scale/fade animation on show/hide

## Architecture

### Data Flow

```
Quick Pane                           Main Window
    │                                     │
    ├─► commands.listAreas()              │
    ├─► commands.listProjects()           │
    │                                     │
    ├─► commands.createTask(...)          │
    │                                     │
    └─► emit('task-created', task) ──────►│─► addTaskToCache(task)
                                          │
```

**Rationale**: Direct Rust command calls ensure immediate persistence. The event notifies the main window to update its TanStack Query cache. File watcher provides a fallback if event is missed.

### Window Configuration

| Property | Value | Notes |
|----------|-------|-------|
| Width | 700px (logical) | Accommodates metadata row |
| Height | 500px (logical) | Space for date picker popovers |
| Visible card | ~620×180px | Expandable with body textarea |
| Transparency | Yes | Rounded corners + popover overflow |
| Position | Centered on cursor's monitor | Same as current implementation |

The large transparent padding (40px sides, 160px bottom) allows popovers to render without clipping.

### Animation

- **Show**: Scale from 0.95 → 1.0, opacity 0 → 1, duration ~150ms, ease-out
- **Hide**: Scale 1.0 → 0.98, opacity 1 → 0, duration ~100ms, ease-in

## UI Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        (transparent)                            │
│  ╔═══════════════════════════════════════════════════════════╗  │
│  ║  □  Title...                                              ║  │ ← Row 1
│  ╟───────────────────────────────────────────────────────────╢  │
│  ║  Notes...                              (hidden by default)║  │ ← Row 2 (toggle)
│  ╟───────────────────────────────────────────────────────────╢  │
│  ║  [Inbox ▾] [Project ▾] [Area ▾]    [📅] [🚩] [❄️]        ║  │ ← Row 3
│  ╟───────────────────────────────────────────────────────────╢  │
│  ║                                    [Cancel]  [Save]       ║  │ ← Row 4
│  ╚═══════════════════════════════════════════════════════════╝  │
│                                                                 │
│                   (space for date picker popover)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Row Details

1. **Title row**: Checkbox (visual only, always unchecked) + auto-resizing textarea
2. **Body row**: Hidden by default. Toggle with `Cmd+Shift+Enter`. Multi-line textarea.
3. **Metadata row**:
   - Left: Status pill (dropdown), Project selector, Area selector
   - Right: Date buttons (scheduled, due, defer-until)
4. **Footer row**: Cancel and Save buttons, right-aligned

### Visual Style

- Card: `bg-background` with `border border-border rounded-xl shadow-lg`
- Matches existing TaskDetailPanel styling
- Uses existing components: `SearchableSelect`, `DateButton`, `TaskStatusPill`

## Keyboard Navigation

| Key | Action |
|-----|--------|
| (Global shortcut) | Open pane, focus title |
| `Tab` | Navigate: Title → Status → Project → Area → Scheduled → Due → Defer → Cancel → Save |
| `Shift+Tab` | Navigate backwards |
| `Cmd+Enter` | Submit (if title non-empty) |
| `Cmd+Shift+Enter` | Toggle body textarea visibility |
| `Escape` | Dismiss without saving |
| `Enter` (in title) | Prevent newline, move to next field |

When body is visible, Tab order inserts Body after Title.

## Component Structure

```
src/components/quick-pane/
├── QuickPaneApp.tsx          # Root component (exists, rewrite)
├── QuickPaneCard.tsx         # The visible card with all fields
├── QuickPaneTitle.tsx        # Checkbox + title textarea
├── QuickPaneBody.tsx         # Collapsible body textarea
├── QuickPaneMetadata.tsx     # Status, project, area, dates row
└── QuickPaneFooter.tsx       # Cancel/Save buttons
```

### State Management

Local React state only (no Zustand needed):

```typescript
interface QuickPaneState {
  title: string
  body: string
  showBody: boolean
  status: TaskStatus          // default: 'inbox'
  projectId: string | null
  areaId: string | null
  scheduled: string | null    // ISO date
  due: string | null          // ISO date
  deferUntil: string | null   // ISO date
}
```

### Data Fetching

On pane focus, fetch fresh data:

```typescript
const [areas, setAreas] = useState<Area[]>([])
const [projects, setProjects] = useState<Project[]>([])

useEffect(() => {
  const unlisten = getCurrentWindow().onFocusChanged(async ({ payload: focused }) => {
    if (focused) {
      const [areasResult, projectsResult] = await Promise.all([
        commands.listAreas(),
        commands.listProjects(),
      ])
      if (areasResult.status === 'ok') setAreas(areasResult.data)
      if (projectsResult.status === 'ok') setProjects(projectsResult.data)
    }
  })
  return () => { unlisten.then(fn => fn()) }
}, [])
```

Filter to active areas/projects for display.

## Implementation Phases

### Phase 1: Window Infrastructure

1. Update `QUICK_PANE_WIDTH` and `QUICK_PANE_HEIGHT` in `src-tauri/src/commands/quick_pane.rs`
2. Update `init_quick_pane_macos` and `init_quick_pane_standard` with new dimensions
3. Add CSS animation classes to `src/quick-pane.css`
4. Test transparent background renders correctly at new size

### Phase 2: Card Layout & Title

1. Create `QuickPaneCard.tsx` with card styling and animation
2. Create `QuickPaneTitle.tsx` with checkbox + textarea
3. Wire up title state and auto-resize behavior
4. Implement `Escape` to dismiss, basic `Cmd+Enter` stub

### Phase 3: Body Toggle

1. Create `QuickPaneBody.tsx` with textarea
2. Implement `Cmd+Shift+Enter` toggle in `QuickPaneApp.tsx`
3. Animate body expand/collapse

### Phase 4: Metadata Row

1. Create `QuickPaneMetadata.tsx`
2. Add status selector using `TaskStatusPill` pattern (default `inbox`)
3. Add project/area selectors using `SearchableSelect`
4. Add date buttons using `DateButton` component
5. Fetch areas/projects on focus

### Phase 5: Footer & Submission

1. Create `QuickPaneFooter.tsx` with Cancel/Save buttons
2. Disable Save when title is empty
3. Implement `commands.createTask()` call on submit
4. Emit `task-created` event with full task data
5. Clear form and dismiss on success

### Phase 6: Main Window Integration

1. Add `task-created` event listener in `use-main-window-event-listeners.ts`
2. Call `addTaskToCache()` from command context when event received
3. Test cache updates correctly without refetch

### Phase 7: Keyboard Navigation & Polish

1. Implement full tab order with `tabIndex` management
2. Prevent `Enter` from creating newlines in title
3. Add show/hide animations
4. Test theme synchronization
5. Test on multiple monitors
6. Test with fullscreen apps (macOS)

## Testing Checklist

- [ ] Opens centered on cursor's monitor
- [ ] Title focused on open
- [ ] `Escape` dismisses without creating task
- [ ] `Cmd+Enter` creates task with all metadata
- [ ] `Cmd+Enter` does nothing when title empty
- [ ] `Cmd+Shift+Enter` toggles body visibility
- [ ] Tab navigates through all fields in order
- [ ] Date picker popovers render without clipping
- [ ] Project/area dropdowns render without clipping
- [ ] Task appears in main window after creation
- [ ] Theme matches main window (light/dark)
- [ ] Works over fullscreen apps on macOS
- [ ] Animation feels smooth and subtle
- [ ] Blur dismisses the pane

## Files to Modify

**Rust**:
- `src-tauri/src/commands/quick_pane.rs` - Window dimensions

**CSS**:
- `src/quick-pane.css` - Animation classes

**Components** (create/rewrite):
- `src/components/quick-pane/QuickPaneApp.tsx`
- `src/components/quick-pane/QuickPaneCard.tsx`
- `src/components/quick-pane/QuickPaneTitle.tsx`
- `src/components/quick-pane/QuickPaneBody.tsx`
- `src/components/quick-pane/QuickPaneMetadata.tsx`
- `src/components/quick-pane/QuickPaneFooter.tsx`

**Main window**:
- `src/hooks/use-main-window-event-listeners.ts` - Add `task-created` listener

## Dependencies

All required packages already installed:
- `@dannysmith/datepicker` - Natural language date input
- `date-fns` - Date formatting
- Existing UI components from `src/components/ui/`

## Reference

- Things 3 quick entry design (screenshot provided)
- Existing `TaskDetailPanel.tsx` for component patterns
- Existing `DateButton`, `SearchableSelect`, `TaskStatusPill` components
