# Quick Panes

Quick panes are small floating windows that appear via global keyboard shortcut, even when the main application is not focused. The Quick Entry pane provides fast task capture from anywhere on macOS.

## Architecture

### Multi-Window Setup

Each Tauri window runs a completely separate JavaScript context. They cannot share React state directly.

```
index.html          → src/main.tsx          → Main React app
quick-pane.html     → src/quick-pane-main.tsx → Quick pane React app
```

**Vite configuration** builds both entry points:

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    input: {
      main: resolve(__dirname, 'index.html'),
      'quick-pane': resolve(__dirname, 'quick-pane.html'),
    },
  },
}
```

### Window Creation Pattern

The quick pane is created once at app startup (hidden) and then shown/hidden via commands. This is faster than recreating the window each time and required on macOS because NSPanel must be created on the main thread.

```rust
// In setup() closure - runs on main thread
init_quick_pane(app.handle())?;

// Later, from any command
toggle_quick_pane(app_handle);  // Shows/hides the existing window
```

### Cross-Window Communication

Windows communicate via Tauri events:

```typescript
// Quick pane: emit event on task creation
await emit('task-created', taskData)

// Main window: listen for events to update cache
listen('task-created', ({ payload }) => {
  queryClient.setQueryData(['tasks'], old => [...old, payload])
})
```

### Theme Synchronization

Since windows don't share React context, theme is synchronized via shared utilities:

```typescript
// Shared utility in src/lib/theme.ts
import { applyThemeToDocument } from '@/lib/theme'

// Apply on focus and listen for changes
applyThemeToDocument()
listen('theme-changed', () => applyThemeToDocument())
```

## Component Structure

```
src/components/quick-pane/
├── QuickPaneApp.tsx           # Main component: state, submission, popover coordination
├── QuickPaneCard.tsx          # Visual container with entry/exit CSS animations
├── QuickPaneTitle.tsx         # Title textarea with visual checkbox
├── QuickPaneBody.tsx          # Collapsible notes section
├── QuickPaneMetadata.tsx      # Status pill and date buttons
├── QuickPaneFooter.tsx        # Project/area selectors, Cancel/Save buttons
├── QuickPaneErrorBoundary.tsx # Error boundary for graceful failure
└── useQuickPaneKeyboard.ts    # Keyboard shortcut handler hook
```

| Component         | Responsibility                                                       |
| ----------------- | -------------------------------------------------------------------- |
| QuickPaneApp      | Form state, submission logic, popover coordination, focus management |
| QuickPaneCard     | Visual container, CSS animations for show/hide                       |
| QuickPaneTitle    | Title input with auto-resize, AI sparkle button                      |
| QuickPaneBody     | Collapsible notes with expand/collapse animation                     |
| QuickPaneMetadata | Status and date selection (controlled popovers)                      |
| QuickPaneFooter   | Project/area selection, action buttons                               |

### Key Patterns

**Popover Coordination:** Only one popover can be open at a time. `QuickPaneApp` owns `openPopover` state and passes controlled `open`/`onOpenChange` props to children.

**Focus Management:** Focus is managed by the parent component. Child components receive refs but don't manage their own focus. This ensures consistent behavior when toggling sections or closing popovers.

**Animation Timing:** CSS custom properties in `quick-pane.css` define animation durations. JS constants in `QuickPaneApp.tsx` must match for coordinated exit animations.

## Keyboard Shortcuts

| Shortcut    | Action                                  |
| ----------- | --------------------------------------- |
| `Escape`    | Close popover (if open) or dismiss pane |
| `⌘ Enter`   | Save task and dismiss                   |
| `⌘ ⇧ Enter` | Toggle notes section                    |
| `⌘ T`       | Set scheduled date to today             |
| `⌘ D`       | Open scheduled date picker              |
| `⌘ ⇧ D`     | Open due date picker                    |
| `⌃ ⇧ ⌘ D`   | Open defer date picker                  |
| `⌘ S`       | Open status picker                      |
| `⌘ ⇧ A`     | Process with AI (macOS only)            |

The `useQuickPaneKeyboard` hook handles all shortcuts using capture phase to intercept events before popovers receive them.

## Auto-Ready Status

A `useEffect` in `QuickPaneApp` watches `[projectId, areaId, scheduled, deferUntil]`. When `(project OR area) AND (scheduled OR defer-until)` are set and status is `inbox`, it auto-promotes to `ready`. This applies to all quick entry (manual and AI-assisted).

## Apple Intelligence Integration

On macOS with Apple Intelligence, a sparkle button appears in the title row when the user has typed text. Pressing it (or `⌘⇧A`) sends the text through on-device AI processing to extract structured task fields. See `docs/developer/apple-intelligence.md` for the full architecture.

## Platform Behavior

| Platform      | Panel Type    | Fullscreen Overlay | Dismiss Behavior            |
| ------------- | ------------- | ------------------ | --------------------------- |
| macOS         | NSPanel       | Yes                | Click-outside, Escape, blur |
| Windows       | Always-on-top | No                 | Escape, blur                |
| Linux X11     | Always-on-top | No                 | Escape, blur                |
| Linux Wayland | Not supported | -                  | -                           |

### macOS NSPanel

On macOS, the quick pane uses `tauri-nspanel` for native panel behavior:

- Appears above fullscreen apps
- Proper focus handling without activating the main app
- Native panel dismissal on focus loss

**Critical configuration for fullscreen overlay:**

```rust
// These settings are required for proper fullscreen behavior.
// See src-tauri/src/commands/quick_pane.rs for the complete implementation.

PanelBuilder::<_, QuickPanePanel>::new(app, label)
    .level(PanelLevel::Status)
    .style_mask(StyleMask::empty().nonactivating_panel())  // Required!
    .collection_behavior(
        CollectionBehavior::new()
            .full_screen_auxiliary()
            .can_join_all_spaces(),
    )
    .build()
```

### Space-Switching Prevention

When hiding the panel on macOS, we must resign key window status first to prevent macOS from activating the main window (which causes space switching):

```rust
panel.resign_key_window();  // Resign BEFORE hiding
panel.hide();
```

## Implementation Notes

### Transparent Window Size

The quick pane window is significantly larger than the visible card. The window is transparent, and the card is centered within it. This allows dropdowns, date pickers, and other popovers to render outside the card bounds without being clipped by the window edge. The actual window dimensions are defined in `src-tauri/src/commands/quick_pane.rs`.

### Threading (macOS)

NSPanel creation MUST happen on the main thread. The Tauri async runtime uses a tokio thread pool, not the main thread.

```rust
// Bad: async command runs on tokio thread pool
#[tauri::command]
async fn create_panel(app: AppHandle) {
    PanelBuilder::new(...).build()?;  // May crash!
}

// Good: create in setup() which runs on main thread
.setup(|app| {
    init_quick_pane(app.handle())?;
    Ok(())
})
```

### Escape Key Sound

Prevent the system alert sound on Escape by calling `preventDefault()`:

```typescript
if (e.key === 'Escape') {
  e.preventDefault() // Prevents "boop" sound
  await commands.dismissQuickPane()
}
```

### Window Positioning

The quick pane automatically centers on the monitor containing the mouse cursor. This is handled in the Rust `show_quick_pane` and `toggle_quick_pane` commands.

## Dependencies

```toml
# Cargo.toml

# Global shortcuts
tauri-plugin-global-shortcut = "2"

# macOS NSPanel (conditional)
[target.'cfg(target_os = "macos")'.dependencies]
tauri-nspanel = { git = "https://github.com/ahkohd/tauri-nspanel", branch = "v2.1" }
```

## Limitations

- **Linux Wayland**: Global shortcuts are not supported
- **Visual blur**: Native frosted glass blur is not available due to conflicts between `window-vibrancy` and `tauri-nspanel`. The current implementation uses CSS `backdrop-blur` with semi-transparent backgrounds.

## Alternative: Event-Driven Actions

The Quick Entry pane calls Tauri commands directly and emits a `task-created` event for cache invalidation. Future quick panes with different requirements might instead emit events for the main window to handle. Since windows can't share React state, this decouples the pane from the action:

```typescript
// Quick pane: emit event with payload
await emit('quick-pane-submit', { text: text.trim() })

// Main window: handle however needed
listen('quick-pane-submit', ({ payload }) => {
  // Zustand
  useUIStore.getState().setSomeValue(payload.text)
  // TanStack Query
  createTaskMutation.mutate({ title: payload.text })
  // Tauri command
  await commands.createTask(payload.text)
})
```
