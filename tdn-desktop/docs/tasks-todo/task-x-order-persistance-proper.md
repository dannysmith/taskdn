# Task: Order Persistence (Proper Implementation)

Persist display order and Today view headings to the app data directory using Rust commands, following the established preferences pattern.

## Background

Currently, all ordering state lives in `display-order-store.ts` (Zustand) and is lost on app restart. This task implements proper disk persistence via Rust commands.

**Note:** A simpler localStorage-based solution exists as task-0. This task is for when we need:

- Per-vault storage (multiple vaults)
- Better inspectability (JSON file in app data dir)
- Atomic writes for robustness
- Consistency with the preferences pattern

## What to Persist

From `display-order-store.ts`:

- `sidebarAreaOrder: string[] | null`
- `sidebarProjectOrder: Record<string, string[]> | null`
- `inboxOrder: string[] | null`
- `projectTaskOrder: Record<string, string[]> | null`
- `areaTaskOrder: Record<string, string[]> | null`
- `todaySectionOrder: Partial<Record<TodaySectionId, string[]>> | null`
- `todayHeadings: Record<string, Heading> | null`
- `kanbanColumnOrder: KanbanColumnOrder | null`

**Not persisting:** `collapsedAreaIds` from ui-store (low value).

## Architecture

Follow the preferences pattern (`docs/developer/data-persistence.md`):

```
App opens → Load from Rust → Hydrate Zustand
User reorders → Update Zustand → UI updates immediately
After debounce → Save to Rust
App closes → Final save to Rust
```

### Rust Side

```rust
// src-tauri/src/commands/display_order.rs

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct DisplayOrderData {
    pub sidebar_area_order: Option<Vec<String>>,
    pub sidebar_project_order: Option<HashMap<String, Vec<String>>>,
    pub inbox_order: Option<Vec<String>>,
    pub project_task_order: Option<HashMap<String, Vec<String>>>,
    pub area_task_order: Option<HashMap<String, Vec<String>>>,
    pub today_section_order: Option<HashMap<String, Vec<String>>>,
    pub today_headings: Option<HashMap<String, Heading>>,
    pub kanban_column_order: Option<HashMap<String, HashMap<String, Vec<String>>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Heading {
    pub id: String,
    pub title: String,
    pub color: String,
}
```

File location: `{app_data_dir}/display-order-{vault_hash}.json`

Use vault path hash in filename for per-vault storage.

Commands:

- `load_display_order(vault_path: String)` - returns Default if missing
- `save_display_order(vault_path: String, data: DisplayOrderData)` - atomic write

### TypeScript Side

```typescript
// src/services/display-order-persistence.ts

export function useDisplayOrderPersistence() {
  const vaultPath = useVaultPath() // or however vault is identified

  // 1. Load on mount, hydrate Zustand
  useEffect(() => {
    commands.loadDisplayOrder(vaultPath).then(result => {
      if (result.status === 'ok' && result.data) {
        hydrateDisplayOrderStore(result.data)
      }
    })
  }, [vaultPath])

  // 2. Subscribe to Zustand, debounced save
  useEffect(() => {
    const unsubscribe = useDisplayOrderStore.subscribe(
      debounce(state => {
        commands.saveDisplayOrder(vaultPath, extractPersistableState(state))
      }, 1000)
    )
    return unsubscribe
  }, [vaultPath])

  // 3. Save on app close
  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async () => {
      const state = useDisplayOrderStore.getState()
      await commands.saveDisplayOrder(vaultPath, extractPersistableState(state))
    })
    return () => {
      unlisten.then(fn => fn())
    }
  }, [vaultPath])
}
```

### Save Triggers

1. **Debounced** - 1 second after any change (handles rapid drag-and-drop)
2. **On app close** - Via Tauri's `onCloseRequested`
3. **Optional: Periodic** - Every 5 minutes as backup

## Stale Data Handling

**Already solved by existing hooks.** When order hooks render:

1. Take persisted order array
2. Filter out IDs not in current vault data
3. Append any new IDs to end

No special handling needed. Persisted order with deleted task IDs just gets filtered out.

## Known Pitfall

A previous attempt at this caused sync problems between Zustand state and file-watcher-triggered vault updates. The issue was trying to coordinate both directions of updates.

**Solution:** Keep it one-directional:

- Zustand is always the UI source of truth
- Rust persistence is just save/load, not reactive
- Don't try to update Zustand when files change (the filtering handles stale data)

## Implementation Steps

1. Add Rust struct and commands (follow `preferences.rs` pattern)
2. Register commands in `bindings.rs`, regenerate bindings
3. Create `display-order-persistence.ts` service
4. Add `useDisplayOrderPersistence()` hook to App.tsx or MainWindow
5. Test: reorder, restart app, verify order preserved
6. Test: delete a task externally, restart, verify it's filtered out

## Files to Create/Modify

- `src-tauri/src/commands/display_order.rs` (new)
- `src-tauri/src/commands/mod.rs` (add module)
- `src-tauri/src/bindings.rs` (register commands)
- `src/services/display-order-persistence.ts` (new)
- `src/App.tsx` or `src/components/MainWindow.tsx` (add hook)
