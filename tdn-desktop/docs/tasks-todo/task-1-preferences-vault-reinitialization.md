# Task: Preferences Improvements - Dev/Prod Separation & Vault Reinitialization

## Summary

Two related improvements to the preferences system:

1. **Separate Development Preferences**: Use a different preferences file (`preferences.development.json`) when running in development mode, allowing developers to point at test vaults while production builds use the real vault configuration.

2. **Vault Reinitialization on Settings Change**: When vault directory settings change in preferences, automatically rescan the vault and clear stale state, eliminating the need to restart the app.

## Background

### Current Architecture

**Preferences Storage:**
- Single file: `~/Library/Application Support/com.myapp.app/preferences.json`
- Controlled by `get_preferences_path()` in `src-tauri/src/commands/preferences.rs`
- Contains vault paths: `tasks_dir`, `areas_dir`, `projects_dir`, `ignore`

**Dev Mode Detection:**
- `isDevMode()` command returns `cfg!(debug_assertions)` - true for debug builds
- Already used in `VaultPane.tsx` to show "Use Dummy Vault" button

**Vault Initialization Flow:**
1. App startup: `lib.rs` calls `load_vault_dirs()` then `vault_manager.initialize()`
2. `VaultManager::initialize()` scans directories, builds index, sets up file watchers
3. File watcher emits `vault-changed` events on external changes
4. Frontend `useVaultInitialization()` listens and invalidates TanStack Query caches

**Current Problem - Settings Change:**
1. User changes vault path in VaultPane
2. `savePreferences.mutate()` saves to disk
3. TanStack Query cache updated with new preferences
4. **Nothing else happens** - app restart required

### State That Could Become Stale

| Store | Data | Stale Risk | Self-Cleans? |
|-------|------|-----------|--------------|
| **Rust VaultManager** | VaultIndex with tasks/projects/areas | High | No |
| **TanStack Query** | `['vault', 'tasks']`, `['vault', 'projects']`, `['vault', 'areas']` | High | No |
| `navigation-store` | Selection + history with area/project IDs | Medium | Partially |
| `display-order-store` | Ordering keyed by entity IDs | Low | Yes (hooks filter) |
| `task-detail-store` | `openTaskId` | Medium | No |
| `ui-store` | `collapsedAreaIds` | Low | Effectively yes |

## Implementation Plan

### Phase 1: Separate Development Preferences

**Goal:** Development builds use `preferences.development.json`, production builds use `preferences.json`.

#### Step 1.1: Modify Preferences Path Function

**File:** `src-tauri/src/commands/preferences.rs`

```rust
/// Gets the path to the preferences file.
/// Uses a separate file in development mode to allow testing with different vaults.
fn get_preferences_path(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {e}"))?;

    // Ensure the directory exists
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {e}"))?;

    // Use separate preferences file in development mode
    let filename = if cfg!(debug_assertions) {
        "preferences.development.json"
    } else {
        "preferences.json"
    };

    Ok(app_data_dir.join(filename))
}
```

This automatically affects:
- `load_preferences()` - loads from correct file
- `save_preferences()` - saves to correct file
- `load_preferences_sync()` - used at startup
- `load_vault_dirs()` - used for vault initialization
- `load_quick_pane_shortcut()` - used for shortcut registration

#### Step 1.2: Update Documentation

**File:** `docs/developer/data-persistence.md`

Add new section after "File Locations":

```markdown
## Development vs Production Preferences

The app uses separate preferences files based on build mode:

| Build Mode | Preferences File |
|------------|------------------|
| Development (`bun run tauri:dev`) | `preferences.development.json` |
| Production (release builds) | `preferences.json` |

This allows developers to:
- Point development builds at test vaults (dummy-demo-vault)
- Keep production settings pointing at their real vault
- Test different configurations without affecting production

**First-time development setup:**
1. Run `bun run tauri:dev`
2. Open Preferences > Vault
3. Click "Use Dummy Vault" to configure test directories

The development preferences file will be created automatically on first save.
```

#### Step 1.3: Testing

- [ ] Run `bun run tauri:dev`, verify no preferences loaded (fresh start)
- [ ] Configure vault paths, verify `preferences.development.json` created
- [ ] Build release (`bun run tauri:build`), verify uses separate `preferences.json`
- [ ] Modify one file, verify changes don't affect the other

---

### Phase 2: Vault Reinitialization Infrastructure

**Goal:** Create utilities for reinitializing the vault and clearing stale state.

#### Step 2.1: Add Navigation Store Reset

**File:** `src/store/navigation-store.ts`

Add reset function to the store:

```typescript
interface NavigationState {
  // ... existing fields ...

  /** Reset navigation to default state (used when vault changes) */
  resetNavigation: () => void
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    (set, get) => ({
      // ... existing implementation ...

      resetNavigation: () =>
        set(
          {
            selection: { type: 'nav', id: 'today' },
            history: [],
            future: [],
          },
          undefined,
          'resetNavigation'
        ),
    }),
    // ...
  )
)
```

#### Step 2.2: Create Vault Reinitialization Function

**File:** `src/services/vault.ts`

Add new function after `initializeVault`:

```typescript
import { useNavigationStore } from '@/store/navigation-store'
import { useTaskDetailStore } from '@/store/task-detail-store'
// Note: Add AppPreferences to existing imports from tauri-bindings

/**
 * Reinitialize the vault with new configuration.
 * Clears all stale state and reloads data.
 *
 * Call this when vault directory settings change in preferences.
 */
export async function reinitializeVault(
  tasksDir: string,
  projectsDir: string,
  areasDir: string,
  ignore: string[] | null
): Promise<void> {
  logger.info('Reinitializing vault with new configuration', {
    tasksDir,
    projectsDir,
    areasDir,
  })

  // 1. Initialize vault in Rust (rescans directories, creates new file watchers)
  const result = await commands.initVault(tasksDir, projectsDir, areasDir, ignore)

  if (result.status === 'error') {
    throw new Error(formatVaultError(result.error))
  }

  // 2. Clear TanStack Query cache for all vault data
  // Active components will automatically refetch when they see empty cache
  queryClient.removeQueries({ queryKey: vaultQueryKeys.all })

  // 3. Reset Zustand stores that hold entity references
  useTaskDetailStore.getState().closeTask()
  useNavigationStore.getState().resetNavigation()

  // Note: display-order-store is NOT cleared - this is intentional!
  // Stale IDs are filtered out by hooks, and ordering is preserved if
  // the user switches back to a previous vault (useful for dev/prod switching)

  // Note: ui-store.collapsedAreaIds - stale IDs are harmlessly ignored

  logger.info('Vault reinitialized successfully')
}

/**
 * Check if vault-related preferences have changed.
 */
export function vaultConfigChanged(
  oldPrefs: AppPreferences | undefined,
  newPrefs: AppPreferences
): boolean {
  if (!oldPrefs) return true

  return (
    oldPrefs.tasks_dir !== newPrefs.tasks_dir ||
    oldPrefs.areas_dir !== newPrefs.areas_dir ||
    oldPrefs.projects_dir !== newPrefs.projects_dir ||
    JSON.stringify(oldPrefs.ignore) !== JSON.stringify(newPrefs.ignore)
  )
}
```

#### Step 2.3: Export New Functions

Ensure new functions are exported from `src/services/vault.ts`:

```typescript
export {
  // ... existing exports ...
  reinitializeVault,
  vaultConfigChanged,
}
```

---

### Phase 3: Integrate with VaultPane

**Goal:** Trigger vault reinitialization when vault settings are saved.

#### Step 3.1: Update VaultPane to Use Reinitialization

**File:** `src/components/preferences/panes/VaultPane.tsx`

**New imports needed:**
```typescript
import { useState } from 'react'
import { type AppPreferences } from '@/lib/tauri-bindings'
import { reinitializeVault, vaultConfigChanged } from '@/services/vault'
import { logger } from '@/lib/logger'
```

**Updated component:**
```typescript
export function VaultPane() {
  const { t } = useTranslation()
  const { data: preferences } = usePreferences()
  const savePreferences = useSavePreferences()

  // Track whether we need to reinitialize after save
  const [isReinitializing, setIsReinitializing] = useState(false)

  // Handler that saves preferences and reinitializes vault if paths changed
  // Returns true if successful, false if error (for callers to handle toasts)
  const saveAndReinitialize = async (newPreferences: AppPreferences): Promise<boolean> => {
    const configChanged = vaultConfigChanged(preferences, newPreferences)

    try {
      // Save preferences first
      await savePreferences.mutateAsync(newPreferences)

      // If vault config changed and all paths are configured, reinitialize
      if (
        configChanged &&
        newPreferences.tasks_dir &&
        newPreferences.areas_dir &&
        newPreferences.projects_dir
      ) {
        setIsReinitializing(true)
        try {
          await reinitializeVault(
            newPreferences.tasks_dir,
            newPreferences.areas_dir,
            newPreferences.projects_dir,
            newPreferences.ignore ?? null
          )
        } catch (error) {
          logger.error('Failed to reinitialize vault', { error })
          toast.error(t('toast.error.vaultReinitialize'))
          return false
        } finally {
          setIsReinitializing(false)
        }
      }
      return true
    } catch (error) {
      // Save preferences failed - error already shown by useSavePreferences
      logger.error('Failed to save preferences', { error })
      return false
    }
  }

  // Directory path handlers - fire-and-forget with internal error handling
  // FolderPicker's onChange is synchronous, so we don't await
  const createDirChangeHandler =
    (field: 'tasks_dir' | 'areas_dir' | 'projects_dir') =>
    (path: string | null) => {
      if (!preferences) return
      // Don't await - saveAndReinitialize handles its own errors
      void saveAndReinitialize({ ...preferences, [field]: path })
    }

  // Updated ignore patterns handler
  const handleIgnoreChange = (tags: Tag[]) => {
    if (!preferences) return
    const normalized = [
      ...new Set(
        tags.map(tag => tag.text.trim()).filter(text => text.length > 0)
      ),
    ]
    void saveAndReinitialize({
      ...preferences,
      ignore: normalized.length > 0 ? normalized : null,
    })
  }

  // Update "Read from CLI" handler
  // Note: Keep existing error handling, just update the success path
  const handleReadFromCli = async () => {
    if (!preferences) return
    const result = await commands.readCliConfig()

    if (result.status === 'error') {
      // ... existing error handling unchanged ...
      return
    }

    const cliConfig = result.data
    const success = await saveAndReinitialize({
      ...preferences,
      tasks_dir: cliConfig.tasksDir ?? preferences.tasks_dir,
      areas_dir: cliConfig.areasDir ?? preferences.areas_dir,
      projects_dir: cliConfig.projectsDir ?? preferences.projects_dir,
      ignore: cliConfig.ignore ?? preferences.ignore,
    })
    if (success) {
      toast.success(t('toast.success.pathsImported'))
    }
  }

  // Update "Use Dummy Vault" handler
  const handleUseDummyVault = async () => {
    if (!preferences) return
    const result = await commands.getDummyVaultPaths()
    const success = await saveAndReinitialize({
      ...preferences,
      tasks_dir: result.tasks_dir,
      areas_dir: result.areas_dir,
      projects_dir: result.projects_dir,
    })
    if (success) {
      toast.success(t('toast.success.dummyVaultSet'))
    }
  }

  // Disable inputs while reinitializing
  const isDisabled = !preferences || savePreferences.isPending || isReinitializing

  return (
    <div className="space-y-6">
      {/* ... existing JSX, but use isDisabled instead of the inline condition ... */}
    </div>
  )
}
```

#### Step 3.2: Add i18n Strings

**File:** `locales/en.json`

Add under `toast.error`:

```json
{
  "toast": {
    "error": {
      "vaultReinitialize": "Failed to reload vault"
    }
  }
}
```

Note: We only need the error string. Success feedback uses existing toasts (`pathsImported`, `dummyVaultSet`) or no toast (for folder picker changes - the UI update is feedback enough).

---

### Phase 4: Testing

#### Unit Tests

**File:** `src/services/vault.test.ts` (new or extend existing)

```typescript
describe('vaultConfigChanged', () => {
  const basePrefs: AppPreferences = {
    theme: 'system',
    quick_pane_shortcut: null,
    language: null,
    tasks_dir: '/path/to/tasks',
    areas_dir: '/path/to/areas',
    projects_dir: '/path/to/projects',
    ignore: null,
    show_obsidian_features: null,
    permanent_delete_tasks: null,
  }

  it('returns true when tasks_dir changes', () => {
    const newPrefs = { ...basePrefs, tasks_dir: '/new/path' }
    expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
  })

  it('returns true when ignore patterns change', () => {
    const newPrefs = { ...basePrefs, ignore: ['*.tmp'] }
    expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(true)
  })

  it('returns false when non-vault settings change', () => {
    const newPrefs = { ...basePrefs, theme: 'dark' }
    expect(vaultConfigChanged(basePrefs, newPrefs)).toBe(false)
  })

  it('returns true when oldPrefs is undefined', () => {
    expect(vaultConfigChanged(undefined, basePrefs)).toBe(true)
  })
})
```

**File:** `src/store/navigation-store.test.ts`

Add test for new `resetNavigation` function:

```typescript
describe('resetNavigation', () => {
  it('resets to default state', () => {
    const { resetNavigation, navigate } = useNavigationStore.getState()

    // Build up some state
    navigate({ type: 'area', id: 'area-1' })
    navigate({ type: 'project', id: 'proj-1' })

    // Reset
    resetNavigation()

    const state = useNavigationStore.getState()
    expect(state.selection).toEqual({ type: 'nav', id: 'today' })
    expect(state.history).toEqual([])
    expect(state.future).toEqual([])
  })
})
```

#### Manual Testing Checklist

**Phase 1 - Dev/Prod Separation:**
- [ ] Fresh dev start: No preferences loaded, prompts for configuration
- [ ] Configure in dev: Creates `preferences.development.json`
- [ ] Run production build: Uses separate `preferences.json`
- [ ] Changes in dev don't affect prod, and vice versa

**Phase 2/3 - Vault Reinitialization:**
- [ ] Change tasks directory: Vault rescans, new tasks appear
- [ ] Change to empty directory: Shows no tasks
- [ ] Change back: Original tasks reappear
- [ ] Add ignore pattern: Matching files disappear
- [ ] Remove ignore pattern: Files reappear
- [ ] "Read from CLI" button: Loads settings and rescans
- [ ] "Use Dummy Vault" button: Loads dummy vault correctly
- [ ] After reinit: Navigation reset to Today view
- [ ] After reinit: Task detail panel closed
- [ ] Error case: Set invalid directory path, verify error toast

---

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/src/commands/preferences.rs` | Modify `get_preferences_path()` for dev/prod separation |
| `src/store/navigation-store.ts` | Add `resetNavigation()` function + update interface |
| `src/services/vault.ts` | Add imports (`useNavigationStore`, `useTaskDetailStore`, `AppPreferences`), add `reinitializeVault()` and `vaultConfigChanged()` |
| `src/components/preferences/panes/VaultPane.tsx` | Add imports (`useState`, `AppPreferences`, `reinitializeVault`, `vaultConfigChanged`, `logger`), refactor handlers |
| `locales/en.json` | Add 1 toast error string (`vaultReinitialize`) |
| `docs/developer/data-persistence.md` | Document dev/prod preferences |

## Files to Create/Extend

| File | Changes |
|------|---------|
| `src/services/vault.test.ts` | **New file** - Tests for `vaultConfigChanged()` |
| `src/store/navigation-store.test.ts` | **Extend existing** - Add test for `resetNavigation()` |

## Dependencies

- No new packages required
- All infrastructure exists (VaultManager can reinitialize, TanStack Query, Zustand stores)

## Considerations

### Race Conditions
- The `saveAndReinitialize` function uses `mutateAsync` to ensure preferences are saved before reinitialization
- During reinitialization, UI is disabled to prevent concurrent changes
- FolderPicker's `onChange` is synchronous - handlers use `void` to fire-and-forget with internal error handling

### Error Handling
- If `initVault` fails (e.g., directory doesn't exist), error is shown via toast
- Preferences are still saved even if vault init fails
- User can correct the path and try again
- Both save and reinitialize errors are handled with appropriate toasts

### Performance
- Full vault rescan happens on every path change
- For most users (< 1000 files), this is instant (~100ms total)
- User may see brief loading state while components refetch
- Consider debouncing if users report issues

### localStorage Persistence (display-order-store)
- `display-order-store` persists ordering to localStorage with entity IDs
- When switching vaults, these IDs become "stale" but are NOT cleared
- **This is intentional and desirable:**
  - Stale IDs are harmlessly filtered out by hooks during rendering
  - If user switches VaultA → VaultB → VaultA, their VaultA ordering is preserved
  - Useful for dev/prod vault switching workflow
- No cleanup needed - the self-cleaning hooks handle stale IDs gracefully

### Known Limitation: Clearing Vault Paths
- If user clears a vault path (sets to null), preferences save but vault stays initialized
- The old data remains visible until all three paths are set again
- This is acceptable for MVP - users can set invalid paths to "clear" data if needed
- Future: Could add explicit "Disconnect Vault" action

### UX During Reinitialization
- After vault reinit, user is navigated to Today view (safe default)
- Task detail panel is closed (avoids showing deleted task)
- Brief loading state possible while components refetch (~100ms)

### Future Enhancement
- Could add a "Vault" indicator in status bar showing current vault path
- Could show confirmation dialog when switching vaults: "This will reload all data. Continue?"
