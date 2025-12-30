# Task: Preferences Pane - Path Settings & Cleanup

Working dir: `tdn-desktop/`

## Summary

Implement vault directory settings (tasks_dir, areas_dir, projects_dir) in the Preferences pane using native folder pickers, remove boilerplate examples, and add app version/settings directory access to the Advanced pane.

## Background Research

### Current State Analysis

**Preferences System Architecture:**

- **Rust Backend**: `src-tauri/src/commands/preferences.rs` with `load_preferences()` and `save_preferences()` commands
- **Type Definition**: `src-tauri/src/types.rs` - `AppPreferences` struct with theme, quick_pane_shortcut, language
- **Persistence**: Atomic write to `~/Library/Application Support/is.danny.taskdn-desktop/preferences.json`
- **React Frontend**: TanStack Query hooks in `src/services/preferences.ts`
- **UI Components**: Three panes in `src/components/preferences/panes/`

**Existing Patterns:**

- tauri-specta generates TypeScript bindings from Rust commands
- `usePreferences()` and `useSavePreferences()` hooks for data access
- Result type pattern for error handling: `{ status: 'ok', data } | { status: 'error', error }`

**Dev Mode Detection:**

- Frontend: `import.meta.env.DEV`
- Rust: `cfg!(debug_assertions)`

**Key Tauri Insight:**

- `@tauri-apps/plugin-dialog` folder picker automatically grants scope access to selected paths
- Rust commands have full filesystem access regardless of scope (scope only restricts JS plugin APIs)
- Vault file operations will use Rust commands, so scope isn't a concern for CLI-imported paths

## Implementation Plan

### Phase 1: Extend Preferences Data Model

**1.1 Update Rust Types (`src-tauri/src/types.rs`)**

Add new optional fields to `AppPreferences`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(default)]  // Good practice for future schema changes
pub struct AppPreferences {
    pub theme: String,
    pub quick_pane_shortcut: Option<String>,
    pub language: Option<String>,
    // NEW: Directory paths
    pub tasks_dir: Option<String>,
    pub areas_dir: Option<String>,
    pub projects_dir: Option<String>,
    // NEW: Ignore patterns (filenames to skip when scanning)
    pub ignore: Option<Vec<String>>,
}
```

Update `Default` impl to set all new fields to `None`.

> **Note:** The `ignore` field stores filenames to skip when scanning task/project/area directories. The UI for editing this will be added in a future task, but we include it now in the data model to avoid schema changes later.

**1.2 Regenerate TypeScript Bindings**

Run `bun run rust:bindings` to update `src/lib/bindings.ts`.

### Phase 2: New Tauri Commands

**2.1 Create `src-tauri/src/commands/config.rs`**

New command module with:

```rust
use tauri::{AppHandle, Manager};
use crate::types::{CliConfig, CliConfigError, DummyVaultPaths};

/// Read CLI config from ~/.taskdn.json
#[tauri::command]
#[specta::specta]
pub async fn read_cli_config() -> Result<CliConfig, CliConfigError> {
    let home = dirs::home_dir().ok_or(CliConfigError::HomeNotFound)?;
    let config_path = home.join(".taskdn.json");

    if !config_path.exists() {
        return Err(CliConfigError::FileNotFound);
    }

    let contents = std::fs::read_to_string(&config_path)
        .map_err(|e| CliConfigError::ReadError { message: e.to_string() })?;

    serde_json::from_str(&contents)
        .map_err(|e| CliConfigError::ParseError { message: e.to_string() })
}

/// Get the app's data directory path
#[tauri::command]
#[specta::specta]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    app.path().app_data_dir()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

/// Check if running in development mode
#[tauri::command]
#[specta::specta]
pub fn is_dev_mode() -> bool {
    cfg!(debug_assertions)
}

/// Get dummy vault paths for development testing (only in debug builds)
#[cfg(debug_assertions)]
#[tauri::command]
#[specta::specta]
pub fn get_dummy_vault_paths() -> DummyVaultPaths {
    // CARGO_MANIFEST_DIR is src-tauri/, navigate to repo root
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let repo_root = std::path::Path::new(manifest_dir)
        .parent()  // tdn-desktop/
        .and_then(|p| p.parent())  // taskdn/ (repo root)
        .expect("Failed to find repo root");

    let vault = repo_root.join("dummy-demo-vault");

    DummyVaultPaths {
        tasks_dir: vault.join("tasks").to_string_lossy().to_string(),
        areas_dir: vault.join("areas").to_string_lossy().to_string(),
        projects_dir: vault.join("projects").to_string_lossy().to_string(),
    }
}

#[cfg(not(debug_assertions))]
#[tauri::command]
#[specta::specta]
pub fn get_dummy_vault_paths() -> DummyVaultPaths {
    panic!("get_dummy_vault_paths is only available in dev mode")
}
```

**2.2 Add Types (`src-tauri/src/types.rs`)**

```rust
/// Config read from CLI's ~/.taskdn.json
#[derive(Debug, Clone, Serialize, Deserialize, Type, Default)]
#[serde(default)]  // Handle missing/extra fields gracefully
pub struct CliConfig {
    pub tasks_dir: Option<String>,
    pub areas_dir: Option<String>,
    pub projects_dir: Option<String>,
    pub ignore: Option<Vec<String>>,
}

/// Error types for CLI config operations (typed for frontend matching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum CliConfigError {
    /// Home directory could not be determined
    HomeNotFound,
    /// ~/.taskdn.json does not exist (CLI not configured - not a real error)
    FileNotFound,
    /// Failed to read the file
    ReadError { message: String },
    /// Failed to parse JSON
    ParseError { message: String },
}

/// Paths to dummy vault for development testing
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct DummyVaultPaths {
    pub tasks_dir: String,
    pub areas_dir: String,
    pub projects_dir: String,
}
```

**2.3 Register Commands (`src-tauri/src/bindings.rs`)**

Add new commands to the `collect_commands!` macro:

```rust
config::read_cli_config,
config::get_app_data_dir,
config::is_dev_mode,
config::get_dummy_vault_paths,
```

**2.4 Export Module (`src-tauri/src/commands/mod.rs`)**

```rust
pub mod config;
```

**2.5 Add Rust Dependency (`src-tauri/Cargo.toml`)**

```toml
[dependencies]
dirs = "6"  # Cross-platform home directory detection
```

### Phase 3: Update Preferences UI

**3.1 Refactor GeneralPane (`src/components/preferences/panes/GeneralPane.tsx`)**

- Keep keyboard shortcuts section
- Remove ALL example/boilerplate settings (text input, toggle)
- Add new "Vault Directories" section with folder picker UI

**Vault Directories UI Pattern:**

```
Vault Directories
─────────────────────────────────────────────────────────

Tasks Directory
┌─────────────────────────────────────────┐
│ /Users/danny/vault/tasks                │  [Choose...]  [×]
└─────────────────────────────────────────┘
Directory containing your task files

Areas Directory
┌─────────────────────────────────────────┐
│ Not configured                          │  [Choose...]
└─────────────────────────────────────────┘
Directory containing your area files

Projects Directory
┌─────────────────────────────────────────┐
│ /Users/danny/vault/projects             │  [Choose...]  [×]
└─────────────────────────────────────────┘
Directory containing your project files

─────────────────────────────────────────────────────────
[Read from CLI Config]     [Use Dummy Vault]  ← dev only
```

**Key UI decisions:**

- Path display is **read-only** (disabled input or styled text)
- "Choose..." opens native `open({ directory: true })` dialog
- [×] button clears the path (only shown when path is set)
- "Read from CLI Config" imports from `~/.taskdn.json`
- "Use Dummy Vault" only visible when `import.meta.env.DEV` is true

**3.2 Create FolderPicker Component (`src/components/preferences/shared/FolderPicker.tsx`)**

Reusable component for directory selection:

```typescript
import { open } from '@tauri-apps/plugin-dialog'
import { X, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface FolderPickerProps {
  value: string | null
  onChange: (path: string | null) => void
  placeholder?: string
  disabled?: boolean
}

export function FolderPicker({
  value,
  onChange,
  placeholder = 'Not configured',
  disabled,
}: FolderPickerProps) {
  const handleChoose = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      defaultPath: value ?? undefined,
    })
    if (selected && typeof selected === 'string') {
      onChange(selected)
    }
  }

  const handleClear = () => onChange(null)

  return (
    <div className="flex gap-2">
      <Input
        value={value ?? ''}
        placeholder={placeholder}
        disabled
        className="flex-1 font-mono text-sm"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={handleChoose}
        disabled={disabled}
      >
        <Folder className="h-4 w-4 mr-1" />
        {t('preferences.general.choose')}
      </Button>
      {value && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
```

**3.3 Keep AppearancePane As-Is**

Language and theme settings remain unchanged.

**3.4 Rebuild AdvancedPane (`src/components/preferences/panes/AdvancedPane.tsx`)**

Replace all boilerplate with:

```typescript
import { getVersion } from '@tauri-apps/api/app'
import { revealItemInDir } from '@tauri-apps/plugin-opener'
import { useQuery } from '@tanstack/react-query'
import { commands } from '@/lib/tauri-bindings'

export function AdvancedPane() {
  const { t } = useTranslation()

  const { data: appVersion } = useQuery({
    queryKey: ['app-version'],
    queryFn: getVersion,
    staleTime: Infinity,
  })

  const handleOpenSettingsDir = async () => {
    const result = await commands.getAppDataDir()
    if (result.status === 'ok') {
      await revealItemInDir(result.data)
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection title={t('preferences.advanced.about')}>
        <SettingsField label={t('preferences.advanced.version')}>
          <span className="text-sm text-muted-foreground font-mono">
            {appVersion ?? '...'}
          </span>
        </SettingsField>
      </SettingsSection>

      <SettingsSection title={t('preferences.advanced.settingsAndRecovery')}>
        <SettingsField
          label={t('preferences.advanced.openSettingsDir')}
          description={t('preferences.advanced.openSettingsDirDescription')}
        >
          <Button variant="outline" onClick={handleOpenSettingsDir}>
            {t('preferences.advanced.openSettingsDir')}
          </Button>
        </SettingsField>
      </SettingsSection>
    </div>
  )
}
```

### Phase 4: Frontend Logic

**4.1 GeneralPane Handlers**

```typescript
// In GeneralPane.tsx

const { data: preferences } = usePreferences()
const savePreferences = useSavePreferences()

// Individual path handlers
const handleTasksDirChange = (path: string | null) => {
  if (!preferences) return
  savePreferences.mutate({ ...preferences, tasks_dir: path })
}

// Similar for areas_dir and projects_dir...

// Read from CLI config
const handleReadFromCli = async () => {
  const result = await commands.readCliConfig()

  if (result.status === 'error') {
    if (result.error.type === 'FileNotFound') {
      toast.info(t('preferences.general.cliNotConfigured'))
    } else {
      toast.error(t('toast.error.cliConfigRead'), {
        description:
          'message' in result.error ? result.error.message : undefined,
      })
    }
    return
  }

  const cliConfig = result.data
  savePreferences.mutate({
    ...preferences,
    tasks_dir: cliConfig.tasks_dir ?? preferences?.tasks_dir,
    areas_dir: cliConfig.areas_dir ?? preferences?.areas_dir,
    projects_dir: cliConfig.projects_dir ?? preferences?.projects_dir,
    ignore: cliConfig.ignore ?? preferences?.ignore,
  })

  toast.success(t('toast.success.pathsImported'))
}

// Use dummy vault (dev only)
const handleUseDummyVault = async () => {
  const result = await commands.getDummyVaultPaths()
  // Result is not wrapped in status for non-fallible commands
  savePreferences.mutate({
    ...preferences,
    tasks_dir: result.tasks_dir,
    areas_dir: result.areas_dir,
    projects_dir: result.projects_dir,
  })

  toast.success(t('toast.success.dummyVaultSet'))
}
```

**4.2 Dev Mode Check**

Query dev mode once at component mount:

```typescript
const { data: isDevMode } = useQuery({
  queryKey: ['is-dev-mode'],
  queryFn: () => commands.isDevMode(),
  staleTime: Infinity,
})

// In JSX:
{
  isDevMode && (
    <Button variant="outline" onClick={handleUseDummyVault}>
      {t('preferences.general.useDummyVault')}
    </Button>
  )
}
```

### Phase 5: Internationalization

**5.1 Update Locale Files (`locales/*.json`)**

Add new strings:

```json
{
  "preferences.general.vaultDirectories": "Vault Directories",
  "preferences.general.tasksDir": "Tasks Directory",
  "preferences.general.tasksDirDescription": "Directory containing your task files",
  "preferences.general.areasDir": "Areas Directory",
  "preferences.general.areasDirDescription": "Directory containing your area files",
  "preferences.general.projectsDir": "Projects Directory",
  "preferences.general.projectsDirDescription": "Directory containing your project files",
  "preferences.general.choose": "Choose...",
  "preferences.general.notConfigured": "Not configured",
  "preferences.general.readFromCli": "Read from CLI Config",
  "preferences.general.useDummyVault": "Use Dummy Vault",
  "preferences.general.cliNotConfigured": "CLI not configured. Run the Taskdn CLI to create ~/.taskdn.json",

  "preferences.advanced.about": "About",
  "preferences.advanced.version": "Version",
  "preferences.advanced.settingsAndRecovery": "Settings & Recovery",
  "preferences.advanced.openSettingsDir": "Open Settings Directory",
  "preferences.advanced.openSettingsDirDescription": "Open the directory containing app settings and recovery data",

  "toast.success.pathsImported": "Settings imported from CLI config",
  "toast.success.dummyVaultSet": "Paths set to dummy vault",
  "toast.error.cliConfigRead": "Failed to read CLI config"
}
```

### Phase 6: Testing

**6.1 Manual Testing Checklist**

- [ ] Folder picker opens and returns selected path
- [ ] Path displays correctly after selection
- [ ] Clear button (×) removes path and saves null
- [ ] "Read from CLI Config" works when ~/.taskdn.json exists
- [ ] "Read from CLI Config" shows info toast when file doesn't exist
- [ ] "Use Dummy Vault" only visible in dev mode
- [ ] "Use Dummy Vault" sets correct absolute paths
- [ ] Paths persist correctly to preferences.json
- [ ] "Open Settings Directory" opens Finder to correct location
- [ ] App version displays correctly
- [ ] All existing functionality (theme, language, shortcuts) still works

**6.2 Unit Tests**

- Mock commands for component tests
- Test CLI config error type handling

## Files to Modify

| File                                                 | Changes                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src-tauri/Cargo.toml`                               | Add `dirs = "6"` dependency                                                           |
| `src-tauri/src/types.rs`                             | Add path fields to AppPreferences, add CliConfig/CliConfigError/DummyVaultPaths types |
| `src-tauri/src/commands/config.rs`                   | NEW: CLI config, dev mode, app data dir commands                                      |
| `src-tauri/src/commands/mod.rs`                      | Export config module                                                                  |
| `src-tauri/src/bindings.rs`                          | Register new commands                                                                 |
| `src/components/preferences/panes/GeneralPane.tsx`   | Add vault directories section, remove boilerplate                                     |
| `src/components/preferences/panes/AdvancedPane.tsx`  | Replace with version + settings dir                                                   |
| `src/components/preferences/shared/FolderPicker.tsx` | NEW: Reusable folder picker component                                                 |
| `locales/en.json`                                    | Add new strings                                                                       |
| `locales/fr.json`                                    | Add new strings (translate)                                                           |
| `locales/ar.json`                                    | Add new strings (translate)                                                           |

## Dependencies

**New Rust dependency:**

- `dirs = "6"` - Cross-platform home directory detection

**Existing (no changes):**

- `@tauri-apps/plugin-dialog` - Native folder picker dialogs
- `@tauri-apps/plugin-opener` - Open settings directory in Finder
- `@tauri-apps/api/app` - Get app version

## Open Questions / Decisions Needed

1. **Empty vs. Null**: Should clearing a path save `null` or `""`? Recommendation: `null` (cleaner).

2. **Translation Priority**: Should fr.json and ar.json be fully translated before merge? Recommendation: English strings as placeholders acceptable for initial PR.

3. **Tilde Expansion**: If CLI config contains `~/...` paths, should we expand them? Recommendation: The CLI should store absolute paths, but we could expand on import as a safety measure.

## Success Criteria

- [ ] Three folder pickers visible in General pane (not text inputs)
- [ ] Paths persist correctly to preferences.json
- [ ] "Read from CLI" button populates paths AND ignore patterns from ~/.taskdn.json
- [ ] Ignore patterns stored in preferences (no UI yet, for future use)
- [ ] "Use Dummy Vault" button only visible in dev mode, sets correct paths
- [ ] Advanced pane shows app version
- [ ] "Open Settings Directory" button opens Finder to correct location
- [ ] All existing functionality (theme, language, shortcuts) still works
- [ ] No TypeScript or ESLint errors
- [ ] `bun run check:all` passes

## Implementation Notes

Key decisions made during planning:

1. **Folder picker only, no text input** - More idiomatic for desktop apps, eliminates need for path validation, automatically handles Tauri's scope system.

2. **Rust commands bypass scope** - Since vault operations will use Rust commands (not the JS fs plugin), paths imported from CLI config work fine without explicit scope granting.

3. **Typed CLI config errors** - `CliConfigError::FileNotFound` is a normal state (CLI not installed), not a failure. Frontend shows helpful guidance instead of error toast.

4. **Dummy vault uses compile-time paths** - `env!("CARGO_MANIFEST_DIR")` captures the path at compile time, works regardless of runtime working directory.

5. **No validation needed** - Folder picker guarantees the selected path exists and is a directory. CLI-imported paths are trusted (user configured them elsewhere).

6. **`#[serde(default)]` on AppPreferences** - Good practice for future schema additions, even though not strictly needed for initial build.
