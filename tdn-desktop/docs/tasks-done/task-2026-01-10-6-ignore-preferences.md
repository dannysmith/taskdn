# Task: Ignorelist in Preferences

## Summary

Add UI to the General preferences pane allowing users to manage an ignorelist of filename patterns. These patterns filter out matching files when scanning tasks, projects, and areas directories.

## Background Investigation

### What Already Exists (Backend Complete)

The backend infrastructure is **fully implemented and tested**:

1. **Types** - `AppPreferences.ignore: Option<Vec<String>>` exists in both Rust (`src-tauri/src/types.rs:44`) and TypeScript (via tauri-specta bindings)

2. **Rust Scanners** (`src-tauri/src/vault/scanner.rs`) - Already filter files using the ignore list:
   - `build_ignore_set()` compiles glob patterns using `globset` crate (case-insensitive on macOS/Windows)
   - `scan_tasks()`, `scan_projects()`, `scan_areas()` all pass ignore patterns to filtering
   - Full test coverage exists for exact and wildcard patterns

3. **Config Passing** - Ignore list flows through the system:
   - `load_vault_dirs()` extracts ignore from preferences at startup
   - `VaultConfig::from_dirs()` accepts ignore list
   - `init_vault` Tauri command accepts `ignore: Option<Vec<String>>`
   - Frontend `initializeVault()` already has ignore parameter support

4. **CLI Config Import** - GeneralPane already imports ignore from CLI config (`src/components/preferences/panes/GeneralPane.tsx:116`)

### What Needs to Be Built (Frontend Only)

Only the UI for editing the ignorelist needs to be added:

1. UI section in GeneralPane with TagInput component
2. i18n strings for labels and descriptions
3. Handler to save updated ignore list

## Implementation Plan

### Phase 1: Add i18n Strings

**File:** `locales/en.json`

Add under `preferences.general`:

```json
"ignorePatterns": "Ignored Patterns",
"ignorePatternsDescription": "File patterns to exclude from scanning. Supports wildcards (e.g., \"*.tmp\", \"draft-*\").",
"ignorePatternsPlaceholder": "Add pattern and press Enter"
```

### Phase 2: Add Ignorelist UI to GeneralPane

**File:** `src/components/preferences/panes/GeneralPane.tsx`

**Location:** Add after the directories section (around line 200), before the CLI config import section.

**Implementation:**

1. Import `TagInput` component from `@/components/ui/tag-input`

2. Add handler for ignore list changes:

   ```typescript
   const handleIgnoreChange = (tags: Tag[]) => {
     if (!preferences) return
     savePreferences.mutate({
       ...preferences,
       ignore: tags.length > 0 ? tags.map(t => t.text) : null,
     })
   }
   ```

3. Add UI section using existing patterns:
   ```tsx
   <SettingsSection title={t('preferences.general.ignorePatterns')}>
     <SettingsField
       label={t('preferences.general.ignorePatterns')}
       description={t('preferences.general.ignorePatternsDescription')}
     >
       <TagInput
         tags={(preferences?.ignore ?? []).map(pattern => ({
           id: pattern,
           text: pattern,
         }))}
         onTagsChange={handleIgnoreChange}
         placeholder={t('preferences.general.ignorePatternsPlaceholder')}
         disabled={!preferences || savePreferences.isPending}
         allowDuplicates={false}
       />
     </SettingsField>
   </SettingsSection>
   ```

### Phase 3: Trigger Vault Reinitialization

When the ignorelist changes, the vault needs to be reinitialized to apply the new filtering. Check if this is already handled by the save preferences flow, or add:

```typescript
const handleIgnoreChange = async (tags: Tag[]) => {
  if (!preferences) return
  const newIgnore = tags.length > 0 ? tags.map(t => t.text) : null

  await savePreferences.mutateAsync({
    ...preferences,
    ignore: newIgnore,
  })

  // Reinitialize vault with new ignore patterns
  await initializeVault(
    preferences.tasks_dir,
    preferences.projects_dir,
    preferences.areas_dir,
    newIgnore
  )
}
```

**Note:** Check if `initializeVault` is already imported/available in GeneralPane or if it needs to be added.

### Phase 4: Testing

1. **Manual Testing:**
   - Open preferences, verify ignorelist section appears
   - Add patterns (e.g., `*.tmp`, `draft-*`, `test.md`)
   - Verify patterns appear as tags
   - Remove a pattern by clicking X
   - Close and reopen preferences - verify patterns persist
   - Add files matching patterns to vault directories
   - Verify matched files don't appear in task/project/area lists

2. **Edge Cases:**
   - Empty ignore list (null vs empty array handling)
   - Duplicate patterns (should be prevented by TagInput)
   - Invalid glob patterns (Rust logs warning but doesn't break)
   - Very long patterns
   - Special characters in patterns

## Files to Modify

| File                                               | Changes                                      |
| -------------------------------------------------- | -------------------------------------------- |
| `locales/en.json`                                  | Add 3 i18n strings                           |
| `src/components/preferences/panes/GeneralPane.tsx` | Add TagInput import, handler, and UI section |

## Dependencies

- `TagInput` component already exists (`src/components/ui/tag-input.tsx`)
- `SettingsSection` and `SettingsField` components already exist
- Backend support complete - no Rust changes needed

## Considerations

- **Pattern Format:** Users enter glob patterns, not regex. Document examples in the description text.
- **Case Sensitivity:** Patterns are case-insensitive on macOS/Windows, case-sensitive on Linux (matches OS filesystem behavior)
- **Scope:** Patterns match against filenames only, not full paths
- **No Validation Needed:** Invalid patterns are handled gracefully by Rust (logged and skipped)
