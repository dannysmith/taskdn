# Task: Preferences Pane - Path Settings & Cleanup

## Summary

Implement real path settings (tasks_dir, areas_dir, projects_dir) in the Preferences pane, remove boilerplate examples, and add app version/settings directory access to the Advanced pane.

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
- Rust: `#[cfg(debug_assertions)]`

**File System Access:**
- `@tauri-apps/plugin-fs` with `BaseDirectory.Home` for home directory access
- `@tauri-apps/plugin-dialog` for directory picker dialogs
- `@tauri-apps/plugin-opener` with `revealItemInDir()` to open directories in Finder
- `@tauri-apps/api/app` with `getVersion()` for app version

**Current Capabilities (default.json):**
- `fs:default`, `dialog:default`, `opener:default` already enabled

## Implementation Plan

### Phase 1: Extend Preferences Data Model

**1.1 Update Rust Types (`src-tauri/src/types.rs`)**

Add new optional fields to `AppPreferences`:
```rust
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

**1.2 Add Path Validation Function (`src-tauri/src/types.rs`)**

```rust
pub fn validate_path(path: &str) -> Result<(), String> {
    // Check path is not empty, doesn't contain path traversal attacks
    // Allow absolute paths only
}
```

**1.3 Update `save_preferences` Command (`src-tauri/src/commands/preferences.rs`)**

Add validation for paths before saving.

**1.4 Regenerate TypeScript Bindings**

Run `bun run rust:bindings` to update `src/lib/bindings.ts`.

### Phase 2: New Tauri Commands

**2.1 Create `src-tauri/src/commands/config.rs`**

New command module with:

```rust
#[tauri::command]
#[specta::specta]
pub async fn read_cli_config() -> Result<CliConfig, String> {
    // Read ~/.taskdn.json
    // Return { tasks_dir, areas_dir, projects_dir } or error
}

#[tauri::command]
#[specta::specta]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    // Return path to ~/Library/Application Support/is.danny.taskdn-desktop/
}

#[tauri::command]
#[specta::specta]
pub fn is_dev_mode() -> bool {
    #[cfg(debug_assertions)]
    return true;
    #[cfg(not(debug_assertions))]
    return false;
}

#[tauri::command]
#[specta::specta]
pub fn get_dummy_vault_paths() -> DummyVaultPaths {
    // Only callable in dev mode
    // Return absolute paths to dummy-demo-vault/{tasks,areas,projects}
}
```

**2.2 Add CliConfig Type (`src-tauri/src/types.rs`)**

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CliConfig {
    pub tasks_dir: Option<String>,
    pub areas_dir: Option<String>,
    pub projects_dir: Option<String>,
    pub ignore: Option<Vec<String>>,
}
```

The `~/.taskdn.json` file created by the CLI contains these fields. When importing via "Read from CLI", all four fields will be copied to preferences (paths displayed in UI, ignore stored for future use).

**2.3 Register Commands (`src-tauri/src/bindings.rs`)**

Add new commands to the collect_commands! macro.

**2.4 Update Capabilities (`src-tauri/capabilities/default.json`)**

Add permissions to read from home directory:
```json
{
  "identifier": "fs:allow-read-text-file",
  "allow": [{ "path": "$HOME/.taskdn.json" }]
}
```

### Phase 3: Update Preferences UI

**3.1 Refactor GeneralPane (`src/components/preferences/panes/GeneralPane.tsx`)**

- Keep keyboard shortcuts section
- Keep ONE example toggle as documentation reference (with clear "Example - not persisted" label)
- Remove example text input
- Add new "Vault Directories" section with:
  - Three text inputs: Tasks Directory, Areas Directory, Projects Directory
  - Each with a folder icon button to open directory picker dialog
  - "Read from CLI" button that calls `read_cli_config()` and populates fields
  - Dev-only: "Use Dummy Vault" button (conditionally rendered with `import.meta.env.DEV`)

**3.2 Keep AppearancePane As-Is**

Language and theme settings remain unchanged.

**3.3 Rebuild AdvancedPane (`src/components/preferences/panes/AdvancedPane.tsx`)**

Replace all boilerplate with:
- **About section:**
  - App version (via `getVersion()` from `@tauri-apps/api/app`)
  - Tauri version (optional, via `getTauriVersion()`)
- **Settings & Recovery section:**
  - Button: "Open Settings Directory" (uses `revealItemInDir()` from `@tauri-apps/plugin-opener`)
  - Brief description of what's stored there

**3.4 Create PathInput Component (`src/components/preferences/shared/PathInput.tsx`)**

Reusable component for directory path input:
```typescript
interface PathInputProps {
  value: string | null
  onChange: (path: string | null) => void
  placeholder?: string
  disabled?: boolean
}
```

Features:
- Text input for path
- Folder icon button opens directory picker dialog
- Shows validation state (path exists, is directory, is accessible)

### Phase 4: Frontend Logic

**4.1 Add Directory Validation Hook (`src/hooks/use-path-validation.ts`)**

```typescript
export function usePathValidation(path: string | null) {
  // Query that checks if path exists and is a directory
  // Uses Tauri fs plugin to stat the path
  // Returns { isValid, isLoading, error }
}
```

**4.2 Update Services (`src/services/preferences.ts`)**

Existing hooks work automatically since AppPreferences type will be updated.

Add new hook for CLI config:
```typescript
export function useCliConfig() {
  return useQuery({
    queryKey: ['cli-config'],
    queryFn: async () => unwrapResult(await commands.readCliConfig()),
    staleTime: Infinity, // CLI config rarely changes
    retry: false, // Don't retry if file doesn't exist
  })
}
```

### Phase 5: Internationalization

**5.1 Update Locale Files (`locales/*.json`)**

Add new strings:
```json
{
  "preferences.general.vaultDirectories": "Vault Directories",
  "preferences.general.vaultDirectoriesDescription": "Configure the directories where your tasks, areas, and projects are stored",
  "preferences.general.tasksDir": "Tasks Directory",
  "preferences.general.tasksDirDescription": "Directory containing your task files",
  "preferences.general.areasDir": "Areas Directory",
  "preferences.general.areasDirDescription": "Directory containing your area files",
  "preferences.general.projectsDir": "Projects Directory",
  "preferences.general.projectsDirDescription": "Directory containing your project files",
  "preferences.general.readFromCli": "Read from CLI Config",
  "preferences.general.readFromCliDescription": "Import directory paths from ~/.taskdn.json",
  "preferences.general.useDummyVault": "Use Dummy Vault",
  "preferences.general.useDummyVaultDescription": "Use the development dummy vault (dev mode only)",
  "preferences.general.browse": "Browse...",
  "preferences.general.pathNotSet": "Not configured",

  "preferences.advanced.about": "About",
  "preferences.advanced.version": "Version",
  "preferences.advanced.tauriVersion": "Tauri Version",
  "preferences.advanced.settingsAndRecovery": "Settings & Recovery",
  "preferences.advanced.openSettingsDir": "Open Settings Directory",
  "preferences.advanced.openSettingsDirDescription": "Open the directory containing app settings and recovery data",

  "toast.success.pathsImported": "Settings imported from CLI config",
  "toast.success.dummyVaultSet": "Paths set to dummy vault",
  "toast.error.cliConfigNotFound": "CLI config file not found",
  "toast.error.pathInvalid": "Invalid directory path"
}
```

### Phase 6: Testing

**6.1 Unit Tests**

- Test path validation function
- Test CLI config parsing
- Mock commands for component tests

**6.2 Integration Testing**

- Verify paths persist correctly
- Verify CLI config reading works
- Verify directory picker dialog works
- Verify "Open Settings Directory" works

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/src/types.rs` | Add path fields to AppPreferences, add CliConfig struct, add validation |
| `src-tauri/src/commands/preferences.rs` | Add path validation to save |
| `src-tauri/src/commands/config.rs` | NEW: CLI config and dev mode commands |
| `src-tauri/src/commands/mod.rs` | Export config module |
| `src-tauri/src/bindings.rs` | Register new commands |
| `src-tauri/capabilities/default.json` | Add home directory read permission |
| `src/components/preferences/panes/GeneralPane.tsx` | Add path settings, reduce boilerplate |
| `src/components/preferences/panes/AdvancedPane.tsx` | Replace with version + settings dir |
| `src/components/preferences/shared/PathInput.tsx` | NEW: Reusable path input component |
| `src/services/preferences.ts` | Add useCliConfig hook |
| `src/hooks/use-path-validation.ts` | NEW: Path validation hook |
| `locales/en.json` | Add new strings |
| `locales/fr.json` | Add new strings (translate) |
| `locales/ar.json` | Add new strings (translate) |

## Dependencies

No new dependencies required. Uses existing:
- `@tauri-apps/plugin-fs` (already installed)
- `@tauri-apps/plugin-dialog` (already installed)
- `@tauri-apps/plugin-opener` (already installed)
- `@tauri-apps/api/app` (core API)

## Open Questions / Decisions Needed

1. **Path Validation Behavior**: Should we validate paths on every keystroke, on blur, or only on save? Recommendation: On blur + on save.

2. **Empty vs. Null**: Should empty string be saved as `null` or `""`? Recommendation: Convert empty strings to `null`.

3. **Relative Paths**: Should we support relative paths or require absolute paths? Recommendation: Require absolute paths, show error for relative.

4. **Path Expansion**: Should `~` be expanded to home directory? Recommendation: Yes, expand on save.

5. **Translation Priority**: Should fr.json and ar.json be fully translated before merge? Recommendation: English strings as placeholders acceptable for initial PR.

## Success Criteria

- [ ] Three path settings visible in General pane
- [ ] Paths persist correctly to preferences.json
- [ ] "Read from CLI" button populates paths AND ignore patterns from ~/.taskdn.json
- [ ] Ignore patterns stored in preferences (no UI yet, for future use)
- [ ] "Use Dummy Vault" button only visible in dev mode, sets correct paths
- [ ] Advanced pane shows app version
- [ ] "Open Settings Directory" button opens Finder to correct location
- [ ] All existing functionality (theme, language, shortcuts) still works
- [ ] No TypeScript or ESLint errors
- [ ] `bun run check:all` passes
