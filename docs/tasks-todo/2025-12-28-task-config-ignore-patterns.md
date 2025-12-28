# Task: Add Ignore Patterns to Config

> Add support for ignore patterns in `~/.taskdn.json` to exclude specific files from validation and scanning

## Problem Statement

When running `tdn doctor` in directories containing non-Taskdn markdown files (e.g., cover files like `3-areas.md`, `4-projects.md`), these files are incorrectly validated and reported as having missing frontmatter.

**Current behavior:**
```
⚠ 2 issues found:

  ~/notes/4-projects/4-projects.md
    → Missing frontmatter (should start with ---)

  ~/notes/3-areas/3-areas.md
    → Missing frontmatter (should start with ---)
```

These files are not Taskdn entities and should be ignored entirely.

---

## Solution: Filename-Based Ignore Patterns

Add `.gitignore`-style ignore patterns to config file. Files whose **filename** matches any pattern are excluded from **all** scanning and validation.

### Why Filename Matching is Sufficient

**Key insight:** S1 spec says files in subdirectories SHALL NOT be read. All scanning happens at **root level only**.

- Rust scanners: Read only root-level `.md` files (spec-compliant)
- No nested directories to worry about (archive/ is skipped entirely)
- No relative paths needed - just match on filename!

**Result:** Simple, intuitive semantics. Pattern `"cover.md"` ignores any file named `cover.md` in tasks/, projects/, or areas/.

### Example Configuration

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/4-projects",
  "areasDir": "~/notes/3-areas",
  "ignore": [
    "3-areas.md",
    "4-projects.md",
    "*.bak",
    "*.tmp",
    "README.md"
  ]
}
```

**Behavior:**
- `"3-areas.md"` → Ignores any file named exactly `3-areas.md`
- `"*.bak"` → Ignores any filename ending in `.bak`
- `"README.md"` → Ignores README.md in any directory

### Config Override Strategy

**Simple field-level override:**
- If local config has `ignore` field → use it
- Otherwise → use user config's `ignore` field
- No merging, no complex semantics

```typescript
ignore: localConfig?.ignore ?? userConfig?.ignore
```

### Pattern Syntax (v1)

**Supported:**
- Exact filename: `"cover.md"`
- Wildcards: `"*.bak"`, `"temp?.md"`
- Case sensitivity matches platform (macOS/Windows: insensitive, Linux: sensitive)

**NOT supported in v1:**
- Path separators: `"drafts/temp.md"` ❌ (not needed - root-only scanning)
- Negation: `"!important.md"` ❌ (complex, defer to v2)
- Recursive globs: `"**/temp/**"` ❌ (not needed - root-only scanning)

---

## Critical Architecture Findings

### 🚨 Two Different Scanners with Different Behavior

**Current implementation has INCONSISTENT scanning:**

1. **TypeScript `findMarkdownFiles()`** (`doctor.ts:82-110`):
   - Used ONLY by `doctor` command
   - **Recursively** scans subdirectories (depth limit 10)
   - Skips `archive/` directories
   - ❌ **VIOLATES S1 SPEC** (line 75: "Task files in subdirectories SHALL NOT be read")

2. **Rust `scan_directory()`** (`vault.rs:91-179`):
   - Used by ALL commands (`list`, `show`, `context`, etc.)
   - **Root-only** scanning (filters out directories)
   - ✅ **COMPLIES with S1 spec**

**Impact:**
- Doctor validates files that other commands don't see
- Inconsistent behavior across CLI
- Spec violation in doctor command

**Resolution:**
- Implement ignore patterns in BOTH Rust and TypeScript
- Fix doctor's recursive scanning in **separate future task** (see Future Work section)

---

### 🚨 Path B (Rust Implementation) is REQUIRED

Not optional. Here's why:

- ALL commands use Rust scanners (`scanTasks`, `scanProjects`, `scanAreas`)
- Doctor uses BOTH TypeScript (validation) AND Rust (reference building)
- TypeScript-only would create silent bugs (ignored in doctor, visible in list)

**We must implement in Rust for correctness.**

---

## Implementation Plan

Structured for 2-3 work sessions with clear checkpoints.

---

## 📍 SESSION 1: Rust Core Implementation

**Goal:** Add ignore pattern support to Rust scanning layer
**Time estimate:** 3-4 hours
**Deliverable:** Rust scanners respect ignore patterns

---

### Step 1.1: Add Dependency (5 min)

**File:** `tdn-cli/Cargo.toml`

```toml
[dependencies]
globset = "0.4"  # Fast glob matching from ripgrep authors
```

**Why `globset`:**
- ✅ Battle-tested (used by ripgrep)
- ✅ Fast compilation of multiple patterns into single matcher
- ✅ Supports case-insensitive matching
- ✅ Simple API for our use case

**Verify:**
```bash
cd tdn-cli
cargo check
```

---

### Step 1.2: Update VaultConfig Struct (5 min)

**File:** `tdn-cli/crates/core/src/vault.rs` (lines 27-31)

**Current:**
```rust
#[napi(object)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
}
```

**New:**
```rust
#[napi(object)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
    pub ignore: Option<Vec<String>>,  // NEW
}
```

**What this does:**
- NAPI-RS auto-generates TypeScript bindings
- TypeScript type: `string[] | undefined`
- Rust type: `Option<Vec<String>>`

---

### Step 1.3: Update scan_directory() Function (2-3 hours)

**File:** `tdn-cli/crates/core/src/vault.rs` (lines 91-179)

**Current signature:**
```rust
fn scan_directory<T, F>(dir_path: &str, parse_fn: F) -> Vec<T>
```

**New signature:**
```rust
fn scan_directory<T, F>(
    dir_path: &str,
    ignore_patterns: Option<&Vec<String>>,  // NEW
    parse_fn: F,
) -> Vec<T>
```

**Implementation:**

Add imports at top of file:
```rust
use globset::{Glob, GlobBuilder, GlobSetBuilder};
```

Update function body:
```rust
fn scan_directory<T, F>(
    dir_path: &str,
    ignore_patterns: Option<&Vec<String>>,
    parse_fn: F,
) -> Vec<T>
where
    F: Fn(String) -> napi::Result<T> + Sync,
    T: Send,
{
    let path = Path::new(dir_path);

    debug!("Scanning directory: {}", dir_path);

    // Build ignore matcher if patterns provided
    let ignore_set = if let Some(patterns) = ignore_patterns {
        let mut builder = GlobSetBuilder::new();

        // Determine case sensitivity based on platform
        let case_insensitive = cfg!(any(target_os = "macos", target_os = "windows"));

        for pattern in patterns {
            match GlobBuilder::new(pattern)
                .case_insensitive(case_insensitive)
                .build()
            {
                Ok(glob) => {
                    builder.add(glob);
                }
                Err(e) => {
                    warn!("Invalid ignore pattern '{}': {} (skipping)", pattern, e);
                }
            }
        }

        match builder.build() {
            Ok(set) => {
                debug!("Built ignore set with {} patterns", patterns.len());
                Some(set)
            }
            Err(e) => {
                warn!("Failed to build ignore pattern set: {}", e);
                None
            }
        }
    } else {
        None
    };

    // Return empty if directory doesn't exist
    if !path.exists() || !path.is_dir() {
        debug!(
            "Directory does not exist or is not a directory: {}",
            dir_path
        );
        return Vec::new();
    }

    let entries = match fs::read_dir(path) {
        Ok(entries) => entries,
        Err(e) => {
            warn!("Failed to read directory {}: {}", dir_path, e);
            return Vec::new();
        }
    };

    // Collect entries into a Vec for parallel processing
    let entries: Vec<_> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            // Only process files (not subdirectories)
            entry.file_type().map(|ft| ft.is_file()).unwrap_or(false)
        })
        .filter(|entry| {
            // Check ignore patterns on FILENAME ONLY
            if let Some(ref ignore_set) = ignore_set {
                if let Some(filename) = entry.path().file_name() {
                    if ignore_set.is_match(filename) {
                        debug!("Ignoring file (matched pattern): {}", entry.path().display());
                        return false;
                    }
                }
            }
            true
        })
        .filter(|entry| {
            // Only process .md files
            entry
                .path()
                .extension()
                .map(|ext| ext == "md")
                .unwrap_or(false)
        })
        .take(MAX_FILES_PER_SCAN) // SECURITY: Limit file count
        .collect();

    // ... rest of existing code (unchanged) ...
}
```

**Key changes:**
- Build `GlobSet` from patterns at start
- Match on **filename only** using `file_name()`
- Platform-aware case sensitivity
- Check patterns BEFORE extension check (efficiency)
- Log ignored files at debug level
- Warn on invalid patterns but continue

---

### Step 1.4: Update Scan Function Implementations (15 min)

**File:** `tdn-cli/crates/core/src/vault.rs`

Update all three scan implementations to pass ignore patterns:

**Find these functions:**
- `scan_tasks_impl()` (around line 55)
- `scan_projects_impl()` (around line 61)
- `scan_areas_impl()` (around line 67)

**Change from:**
```rust
fn scan_tasks_impl(config: &VaultConfig) -> Vec<Task> {
    scan_directory(&config.tasks_dir, parse_task_file_internal)
}
```

**Change to:**
```rust
fn scan_tasks_impl(config: &VaultConfig) -> Vec<Task> {
    scan_directory(
        &config.tasks_dir,
        config.ignore.as_ref(),  // NEW
        parse_task_file_internal,
    )
}
```

Repeat for `scan_projects_impl()` and `scan_areas_impl()`.

---

### Step 1.5: Rebuild Bindings (2 min)

```bash
cd tdn-cli
bun run build
```

**What this does:**
- Compiles Rust code
- Regenerates `bindings/index.js` and `bindings/index.d.ts`
- Makes new `ignore` field visible to TypeScript

**Verify:**
Check that `bindings/index.d.ts` now has:
```typescript
export interface VaultConfig {
  tasksDir: string;
  projectsDir: string;
  areasDir: string;
  ignore?: Array<string>;  // ← Should appear here
}
```

---

### Step 1.6: Quick Manual Test (10 min)

**Create test file:**
```bash
cd tdn-cli
echo '---
title: Test Task
status: inbox
---' > /tmp/test-task.md

echo '# Not a task' > /tmp/cover.md
```

**Test in node REPL:**
```typescript
import { scanTasks } from './bindings/index.js';

// Without ignore
const tasks1 = scanTasks({
  tasksDir: '/tmp',
  projectsDir: '',
  areasDir: ''
});
console.log(tasks1.length); // Should be 1

// With ignore
const tasks2 = scanTasks({
  tasksDir: '/tmp',
  projectsDir: '',
  areasDir: '',
  ignore: ['cover.md']
});
console.log(tasks2.length); // Should still be 1 (cover.md has no frontmatter so won't parse anyway)
```

---

### ✅ SESSION 1 CHECKPOINT

**Completed:**
- ✅ Rust dependency added
- ✅ VaultConfig updated with ignore field
- ✅ scan_directory() matches on filename only
- ✅ All scan functions pass patterns
- ✅ Bindings regenerated
- ✅ Basic manual test passed

**Commit message:**
```
feat(cli): Add ignore patterns to Rust vault scanners

- Add globset dependency for glob matching
- Update VaultConfig with optional ignore field
- Match patterns on filename only (root-level scanning)
- Platform-aware case sensitivity
- Invalid patterns logged as warnings
```

---

## 📍 SESSION 2: TypeScript Config & Doctor

**Goal:** Wire up config loading and update doctor command
**Time estimate:** 1.5-2 hours
**Deliverable:** Full ignore pattern support working end-to-end

---

### Step 2.1: Update TypeScript Config Interfaces (5 min)

**File:** `tdn-cli/src/config/index.ts`

**Update ConfigFile interface (line 17):**
```typescript
interface ConfigFile {
  tasksDir?: string;
  projectsDir?: string;
  areasDir?: string;
  ignore?: string[];  // NEW
}
```

**Update VaultConfig interface (line 8):**
```typescript
export interface VaultConfig {
  tasksDir: string;
  projectsDir: string;
  areasDir: string;
  ignore?: string[];  // NEW
}
```

---

### Step 2.2: Add Config Validation (30 min)

**File:** `tdn-cli/src/config/index.ts`

**Update `validateConfigFile()` function (around line 99):**

Add validation after existing field checks:

```typescript
function validateConfigFile(parsed: unknown): ConfigFile {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Config file must contain a JSON object');
  }

  const obj = parsed as Record<string, unknown>;

  // ... existing validation for tasksDir, projectsDir, areasDir ...

  // Validate ignore field (NEW)
  if ('ignore' in obj && obj.ignore !== undefined) {
    if (!Array.isArray(obj.ignore)) {
      throw new Error('Config validation failed: "ignore" must be an array');
    }

    for (let i = 0; i < obj.ignore.length; i++) {
      const pattern = obj.ignore[i];

      if (typeof pattern !== 'string') {
        throw new Error(`Config validation failed: ignore[${i}] must be a string`);
      }

      if (pattern.trim() === '') {
        throw new Error(`Config validation failed: ignore[${i}] cannot be empty`);
      }

      // Security: Block absolute paths
      if (pattern.startsWith('/')) {
        throw new Error(
          `Config validation failed: ignore[${i}] cannot be an absolute path. ` +
          `Patterns must be filenames (e.g., "*.bak", not "/tmp/*.bak")`
        );
      }

      // Security: Block path traversal
      if (pattern.includes('../') || pattern.includes('..\\')) {
        throw new Error(
          `Config validation failed: ignore[${i}] cannot contain path traversal (../)`
        );
      }

      // Security: Block path separators (filename matching only)
      if (pattern.includes('/') || pattern.includes('\\')) {
        throw new Error(
          `Config validation failed: ignore[${i}] cannot contain path separators. ` +
          `Patterns match filenames only (e.g., "*.bak" not "temp/*.bak")`
        );
      }
    }
  }

  return obj as ConfigFile;
}
```

**Why these checks:**
- Type safety: Must be array of strings
- Security: No absolute paths, path traversal, or separators
- User clarity: Clear error messages explain what's wrong

---

### Step 2.3: Update Config Loading (10 min)

**File:** `tdn-cli/src/config/index.ts`

**Update `loadConfig()` function (around line 130):**

Add after directory path resolution:

```typescript
export function loadConfig(): VaultConfig {
  // ... existing code to load user and local configs ...

  // ... existing code to resolve tasksDir, projectsDir, areasDir ...

  // Simple override: local config replaces user config (NEW)
  const ignore = localConfig?.ignore ?? userConfig?.ignore;

  return {
    tasksDir: resolvedTasksDir,
    projectsDir: resolvedProjectsDir,
    areasDir: resolvedAreasDir,
    ignore,  // NEW
  };
}
```

**Simple semantics:**
- If local config has `ignore` → use it
- Otherwise → use user config's `ignore`
- No merging, no complexity

---

### Step 2.4: Add minimatch Dependency (1 min)

```bash
cd tdn-cli
bun add minimatch
```

**Why minimatch:**
- Standard in Node ecosystem
- Same glob syntax as Rust `globset`
- Simple API
- Small footprint

---

### Step 2.5: Update Doctor findMarkdownFiles() (30 min)

**File:** `tdn-cli/src/commands/doctor.ts`

**Add import:**
```typescript
import { minimatch } from 'minimatch';
import { basename, relative } from 'path';
```

**Update function signature (line 82):**
```typescript
function findMarkdownFiles(
  dir: string,
  ignorePatterns: string[] = []  // NEW
): string[] {
```

**Update the file filtering logic inside the `walk()` function:**

```typescript
function walk(currentDir: string, depth: number = 0) {
  // Don't recurse too deep to avoid infinite loops
  if (depth > 10) return;

  const entries = readdirSync(currentDir);
  for (const entry of entries) {
    const fullPath = join(currentDir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip archive directories at any level
      if (entry === 'archive') continue;
      walk(fullPath, depth + 1);
    } else if (stat.isFile() && entry.endsWith('.md')) {
      // Check ignore patterns on FILENAME ONLY (NEW)
      const filename = basename(fullPath);
      const ignored = ignorePatterns.some(pattern =>
        minimatch(filename, pattern, {
          dot: true,  // Match dotfiles
          nocase: process.platform === 'darwin' || process.platform === 'win32'
        })
      );

      if (ignored) {
        // Skip ignored files silently
        continue;
      }

      files.push(fullPath);
    }
  }
}
```

**Key changes:**
- Extract filename with `basename()`
- Match pattern against filename only
- Platform-aware case sensitivity (same as Rust)
- Skip silently if matched

---

### Step 2.6: Pass Ignore Patterns in Doctor Command (10 min)

**File:** `tdn-cli/src/commands/doctor.ts`

**Update `doctor()` function (around line 280):**

Find where `findMarkdownFiles()` is called and update:

```typescript
export async function doctor(options: DoctorOptions) {
  const config = loadConfig();
  const ignorePatterns = config.ignore || [];  // NEW

  // Scan all three directories with ignore patterns (UPDATED)
  const taskFiles = findMarkdownFiles(config.tasksDir, ignorePatterns);
  const projectFiles = findMarkdownFiles(config.projectsDir, ignorePatterns);
  const areaFiles = findMarkdownFiles(config.areasDir, ignorePatterns);

  // ... rest of doctor logic unchanged ...
}
```

---

### Step 2.7: Test with User's Real Vault (15 min)

**Update user config:**
```bash
# Edit ~/.taskdn.json
{
  "areasDir": "~/notes/3-areas",
  "projectsDir": "~/notes/4-projects",
  "tasksDir": "~/notes/tasks",
  "ignore": ["3-areas.md", "4-projects.md"]
}
```

**Run doctor:**
```bash
cd tdn-cli
bun run build  # Make sure bindings are fresh
bun src/index.ts doctor
```

**Expected result:**
```
✓ Config found
✓ Tasks directory (X files)
✓ Projects directory (X files)
✓ Areas directory (X files)

✓ No issues found
```

**Verify:**
- No errors about `3-areas.md` missing frontmatter
- No errors about `4-projects.md` missing frontmatter
- All actual tasks/projects/areas still validated

---

### Step 2.8: Test Other Commands (10 min)

**Test that ignore patterns work in all commands:**

```bash
# List should not show ignored files
bun src/index.ts list projects

# Show should not find ignored files
bun src/index.ts show project "3-areas"  # Should fail with "not found"

# Context should not include ignored files
bun src/index.ts context
```

**Verify ignored files are truly invisible across the entire CLI.**

---

### ✅ SESSION 2 CHECKPOINT

**Completed:**
- ✅ TypeScript config interfaces updated
- ✅ Config validation with security checks
- ✅ Simple override strategy (local ?? user)
- ✅ minimatch dependency added
- ✅ Doctor updated to match on filename
- ✅ Tested with user's real vault
- ✅ All commands respect ignore patterns

**Commit message:**
```
feat(cli): Wire up ignore patterns in config and doctor

- Add ignore field to TypeScript config interfaces
- Validate patterns (security checks for paths/traversal)
- Simple override: local config replaces user config
- Update doctor to match on filename only
- Platform-aware case sensitivity matching Rust
- Tested with real vault (3-areas.md, 4-projects.md)

Closes user issue with cover files being validated
```

---

## 📍 SESSION 3: Testing & Documentation

**Goal:** Comprehensive tests and documentation
**Time estimate:** 4-6 hours
**Deliverable:** Production-ready feature with full test coverage

---

### Step 3.1: Rust Unit Tests (2-3 hours)

**File:** `tdn-cli/crates/core/src/vault.rs`

Add to existing `#[cfg(test)]` module at end of file:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    // Helper: Create temp vault structure
    fn create_test_vault() -> TempDir {
        TempDir::new().unwrap()
    }

    // Helper: Create a valid task file
    fn create_task_file(vault_path: &Path, filename: &str, title: &str) {
        let tasks_dir = vault_path.join("tasks");
        fs::create_dir_all(&tasks_dir).unwrap();

        let content = format!(
            "---\ntitle: {}\nstatus: inbox\n---\n\nTask body",
            title
        );

        let mut file = File::create(tasks_dir.join(filename)).unwrap();
        file.write_all(content.as_bytes()).unwrap();
    }

    #[test]
    fn test_ignore_exact_filename() {
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");
        create_task_file(vault_path, "task-2.md", "Task 2");
        create_task_file(vault_path, "cover.md", "Cover");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: Some(vec!["cover.md".to_string()]),
        };

        let tasks = scan_tasks(config);

        assert_eq!(tasks.len(), 2);
        assert!(tasks.iter().any(|t| t.title == "Task 1"));
        assert!(tasks.iter().any(|t| t.title == "Task 2"));
        assert!(!tasks.iter().any(|t| t.title == "Cover"));
    }

    #[test]
    fn test_ignore_wildcard_pattern() {
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");
        create_task_file(vault_path, "backup.bak.md", "Backup");
        create_task_file(vault_path, "temp.tmp.md", "Temp");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: Some(vec!["*.bak.md".to_string(), "*.tmp.md".to_string()]),
        };

        let tasks = scan_tasks(config);

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Task 1");
    }

    #[test]
    fn test_ignore_multiple_patterns() {
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");
        create_task_file(vault_path, "cover.md", "Cover");
        create_task_file(vault_path, "README.md", "README");
        create_task_file(vault_path, "temp.md", "Temp");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: Some(vec![
                "cover.md".to_string(),
                "README.md".to_string(),
                "temp.md".to_string(),
            ]),
        };

        let tasks = scan_tasks(config);

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Task 1");
    }

    #[test]
    fn test_ignore_none() {
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");
        create_task_file(vault_path, "task-2.md", "Task 2");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: None,
        };

        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 2);
    }

    #[test]
    fn test_ignore_empty_array() {
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: Some(vec![]),
        };

        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 1);
    }

    #[test]
    fn test_ignore_invalid_pattern() {
        // Invalid glob pattern should be skipped with warning
        let temp = create_test_vault();
        let vault_path = temp.path();

        create_task_file(vault_path, "task-1.md", "Task 1");

        let config = VaultConfig {
            tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
            projects_dir: "".to_string(),
            areas_dir: "".to_string(),
            ignore: Some(vec!["[invalid".to_string()]), // Invalid glob
        };

        // Should still work, invalid pattern just skipped
        let tasks = scan_tasks(config);
        assert_eq!(tasks.len(), 1);
    }

    #[test]
    fn test_ignore_case_insensitive_on_macos() {
        // This test only meaningful on macOS/Windows
        #[cfg(any(target_os = "macos", target_os = "windows"))]
        {
            let temp = create_test_vault();
            let vault_path = temp.path();

            create_task_file(vault_path, "Cover.md", "Cover");
            create_task_file(vault_path, "task-1.md", "Task 1");

            let config = VaultConfig {
                tasks_dir: vault_path.join("tasks").to_str().unwrap().to_string(),
                projects_dir: "".to_string(),
                areas_dir: "".to_string(),
                ignore: Some(vec!["cover.md".to_string()]), // lowercase pattern
            };

            let tasks = scan_tasks(config);

            // Should match Cover.md (case-insensitive)
            assert_eq!(tasks.len(), 1);
            assert_eq!(tasks[0].title, "Task 1");
        }
    }
}
```

**Run tests:**
```bash
cd tdn-cli
cargo test
```

**Test coverage:**
- ✅ Exact filename match
- ✅ Wildcard patterns
- ✅ Multiple patterns
- ✅ None (no patterns)
- ✅ Empty array
- ✅ Invalid pattern handling
- ✅ Case sensitivity (platform-aware)

---

### Step 3.2: TypeScript Integration Tests (2-3 hours)

**File:** `tdn-cli/tests/integration/doctor-ignore.test.ts` (create new)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { doctor } from '@/commands/doctor';
import { execSync } from 'child_process';

describe('doctor with ignore patterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'taskdn-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should ignore files matching exact filename', async () => {
    const tasksDir = join(tempDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    // Valid task
    writeFileSync(
      join(tasksDir, 'task-1.md'),
      `---
title: Task 1
status: inbox
---`
    );

    // Invalid file (no frontmatter) - should be ignored
    writeFileSync(join(tasksDir, 'cover.md'), `# Not a task file`);

    // Create config
    const configPath = join(tempDir, '.taskdn.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        tasksDir,
        projectsDir: join(tempDir, 'projects'),
        areasDir: join(tempDir, 'areas'),
        ignore: ['cover.md'],
      })
    );

    // Run doctor
    const result = execSync(`cd ${tempDir} && bun ${process.cwd()}/src/index.ts doctor --output json`, {
      encoding: 'utf-8',
    });

    const output = JSON.parse(result);

    // Should have no issues (cover.md ignored)
    expect(output.issues).toHaveLength(0);
    expect(output.summary).toContain('No issues found');
  });

  it('should ignore files matching wildcard pattern', async () => {
    const tasksDir = join(tempDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    writeFileSync(join(tasksDir, 'task-1.md'), `---
title: Task 1
status: inbox
---`);

    writeFileSync(join(tasksDir, 'backup.bak.md'), `# Backup`);
    writeFileSync(join(tasksDir, 'temp.tmp.md'), `# Temp`);

    const configPath = join(tempDir, '.taskdn.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        tasksDir,
        projectsDir: join(tempDir, 'projects'),
        areasDir: join(tempDir, 'areas'),
        ignore: ['*.bak.md', '*.tmp.md'],
      })
    );

    const result = execSync(`cd ${tempDir} && bun ${process.cwd()}/src/index.ts doctor --output json`, {
      encoding: 'utf-8',
    });

    const output = JSON.parse(result);
    expect(output.issues).toHaveLength(0);
  });

  it('should replicate user scenario (3-areas.md, 4-projects.md)', async () => {
    const areasDir = join(tempDir, '3-areas');
    const projectsDir = join(tempDir, '4-projects');

    mkdirSync(areasDir, { recursive: true });
    mkdirSync(projectsDir, { recursive: true });

    // Valid files
    writeFileSync(join(areasDir, 'health.md'), `---
title: Health
---`);

    writeFileSync(join(projectsDir, 'website.md'), `---
title: Website
---`);

    // Cover files (no frontmatter)
    writeFileSync(join(areasDir, '3-areas.md'), `# Areas\n\nOverview...`);
    writeFileSync(join(projectsDir, '4-projects.md'), `# Projects\n\nOverview...`);

    const configPath = join(tempDir, '.taskdn.json');
    writeFileSync(
      configPath,
      JSON.stringify({
        tasksDir: join(tempDir, 'tasks'),
        projectsDir,
        areasDir,
        ignore: ['3-areas.md', '4-projects.md'],
      })
    );

    const result = execSync(`cd ${tempDir} && bun ${process.cwd()}/src/index.ts doctor --output json`, {
      encoding: 'utf-8',
    });

    const output = JSON.parse(result);

    // Should have no issues about cover files
    expect(output.issues).toHaveLength(0);
    expect(output.summary).toContain('No issues found');
  });
});
```

**Run tests:**
```bash
cd tdn-cli
bun test tests/integration/doctor-ignore.test.ts
```

---

### Step 3.3: Config Validation Tests (30 min)

**File:** `tdn-cli/tests/unit/config.test.ts` (or add to existing)

```typescript
import { describe, it, expect } from 'bun:test';
import { validateConfigFile } from '@/config/index';

describe('config validation - ignore patterns', () => {
  it('should accept valid ignore patterns', () => {
    const config = {
      ignore: ['*.bak', 'cover.md', 'temp?.md'],
    };

    expect(() => validateConfigFile(config)).not.toThrow();
  });

  it('should reject non-array ignore', () => {
    const config = {
      ignore: 'not-an-array',
    };

    expect(() => validateConfigFile(config)).toThrow('ignore" must be an array');
  });

  it('should reject non-string pattern', () => {
    const config = {
      ignore: [123],
    };

    expect(() => validateConfigFile(config)).toThrow('ignore[0] must be a string');
  });

  it('should reject empty pattern', () => {
    const config = {
      ignore: [''],
    };

    expect(() => validateConfigFile(config)).toThrow('ignore[0] cannot be empty');
  });

  it('should reject absolute paths', () => {
    const config = {
      ignore: ['/etc/passwd'],
    };

    expect(() => validateConfigFile(config)).toThrow('cannot be an absolute path');
  });

  it('should reject path traversal', () => {
    const config = {
      ignore: ['../secrets'],
    };

    expect(() => validateConfigFile(config)).toThrow('cannot contain path traversal');
  });

  it('should reject path separators', () => {
    const config = {
      ignore: ['temp/file.md'],
    };

    expect(() => validateConfigFile(config)).toThrow('cannot contain path separators');
  });

  it('should allow undefined ignore', () => {
    const config = {};

    expect(() => validateConfigFile(config)).not.toThrow();
  });
});
```

---

### Step 3.4: Documentation (1-1.5 hours)

#### 3.4.1: Create Configuration Docs

**File:** `tdn-cli/docs/developer/configuration.md` (create or update)

```markdown
# Configuration

Taskdn CLI is configured via `.taskdn.json` files.

## Config File Locations

1. **User config:** `~/.taskdn.json` - Global settings for all vaults
2. **Local config:** `./.taskdn.json` - Project-specific overrides

Local config takes precedence over user config.

## Configuration Fields

### Directory Paths

| Field         | Type   | Description                    | Default      |
| ------------- | ------ | ------------------------------ | ------------ |
| `tasksDir`    | string | Path to tasks directory        | `./tasks`    |
| `projectsDir` | string | Path to projects directory     | `./projects` |
| `areasDir`    | string | Path to areas directory        | `./areas`    |

Paths can be relative or absolute. Tilde (`~`) expands to home directory.

### Ignore Patterns

| Field    | Type       | Description                           | Default     |
| -------- | ---------- | ------------------------------------- | ----------- |
| `ignore` | `string[]` | Filename patterns to exclude scanning | `undefined` |

**Pattern Syntax:**

Patterns use `.gitignore`-style glob syntax and match **filenames only** (not paths).

| Pattern     | Matches                    | Example                   |
| ----------- | -------------------------- | ------------------------- |
| `file.md`   | Exact filename             | `cover.md`                |
| `*.bak`     | Any chars in filename      | `task.bak`, `foo.bak`     |
| `temp?.md`  | Single char                | `temp1.md`, `tempA.md`    |
| `[abc]*.md` | Character class            | `a-note.md`, `b-note.md`  |

**Case Sensitivity:**
- macOS/Windows: Case-insensitive (`cover.md` matches `Cover.md`)
- Linux: Case-sensitive

**Limitations:**
- Patterns match filenames only (cannot include `/` or `\`)
- Negation patterns (`!file.md`) not supported
- Recursive globs (`**/temp/**`) not needed (root-level scanning only)

### Example Configuration

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/4-projects",
  "areasDir": "~/notes/3-areas",
  "ignore": [
    "3-areas.md",
    "4-projects.md",
    "*.bak",
    "*.tmp",
    "README.md"
  ]
}
```

### Config Override Behavior

When both user and local configs exist:

- **Directory paths:** Local overrides user
- **Ignore patterns:** Local replaces user (no merging)

**Example:**

User config (`~/.taskdn.json`):
```json
{
  "ignore": ["*.bak"]
}
```

Local config (`./.taskdn.json`):
```json
{
  "ignore": ["cover.md"]
}
```

**Result:** Only `cover.md` is ignored (local replaces user).

### Invalid Patterns

Invalid glob patterns are logged as warnings and skipped. Other patterns continue to work.

```
Warning: Invalid ignore pattern '[invalid': <error details> (skipping)
```

## Environment Variables

Config can also be set via environment variables (highest priority):

| Variable              | Config Field  |
| --------------------- | ------------- |
| `TASKDN_TASKS_DIR`    | `tasksDir`    |
| `TASKDN_PROJECTS_DIR` | `projectsDir` |
| `TASKDN_AREAS_DIR`    | `areasDir`    |

**Note:** Ignore patterns cannot be set via environment variables.
```

---

#### 3.4.2: Update Requirements Doc

**File:** `docs/product-overviews/cli/cli-requirements.md`

Add new section:

```markdown
### File Filtering (Ignore Patterns)

- CLI MUST support ignore patterns in config file
- Patterns use `.gitignore`-style glob syntax
- Patterns match filenames only (not paths)
- Ignored files excluded from all commands (list, show, doctor, etc.)
- Invalid patterns logged as warnings but don't break functionality
- Local config ignore field replaces user config (no merging)
- Platform-aware case sensitivity (macOS/Windows: insensitive, Linux: sensitive)
```

---

#### 3.4.3: Update README

**File:** `tdn-cli/README.md`

Add example to configuration section:

```markdown
### Ignoring Files

To exclude specific files from all Taskdn operations:

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/projects",
  "areasDir": "~/notes/areas",
  "ignore": [
    "*.bak",
    "*.tmp",
    "README.md"
  ]
}
```

Patterns match filenames only. See [Configuration Guide](./docs/developer/configuration.md#ignore-patterns) for details.
```

---

### Step 3.5: Update CLI Progress Doc (15 min)

**File:** `tdn-cli/docs/cli-progress.md`

Add to completed features:

```markdown
## Configuration

- [x] Load config from ~/.taskdn.json
- [x] Load config from ./.taskdn.json
- [x] Environment variable overrides
- [x] Path validation and security checks
- [x] **Ignore patterns support** ✨ NEW
  - [x] Glob pattern matching on filenames
  - [x] Platform-aware case sensitivity
  - [x] Config validation with security checks
  - [x] Invalid pattern handling (warn and skip)
```

---

### ✅ SESSION 3 CHECKPOINT

**Completed:**
- ✅ Comprehensive Rust unit tests
- ✅ TypeScript integration tests
- ✅ Config validation tests
- ✅ Full documentation (config guide, requirements, README)
- ✅ Progress tracking updated

**Commit message:**
```
test(cli): Add comprehensive tests for ignore patterns

- Rust unit tests for filename matching and wildcards
- TypeScript integration tests for doctor command
- Config validation tests (security checks)
- Platform-specific case sensitivity tests
- Invalid pattern handling tests

docs(cli): Document ignore patterns feature

- Configuration guide with syntax and examples
- Update requirements doc
- Update README with usage example
- Update CLI progress tracker
```

---

## Production Readiness Checklist

Before merging to main:

- [ ] All Rust tests pass (`cargo test`)
- [ ] All TypeScript tests pass (`bun test`)
- [ ] Type checking passes (`bun run check`)
- [ ] Formatting passes (`bun run fix` then `bun run check`)
- [ ] Manual test with user's vault (3-areas.md, 4-projects.md)
- [ ] Manual test with demo vault
- [ ] Documentation complete and accurate
- [ ] No performance regression on large vaults

**Final verification:**
```bash
cd tdn-cli
bun run fix           # Format everything
bun run check         # Type check, lint, test
bun run build         # Build release bindings
./scripts/reset-dummy-vault.sh
bun src/index.ts doctor  # Test with dummy vault
```

---

## Summary

**Total implementation time:** 10-13 hours over 3 sessions

**What was built:**
- Filename-based ignore patterns in Rust and TypeScript
- Simple config override strategy (local replaces user)
- Platform-aware case sensitivity
- Comprehensive test coverage
- Security validation (no paths, traversal, etc.)
- Full documentation

**User benefit:**
- Can ignore cover files (3-areas.md, 4-projects.md)
- Can ignore backup/temp files (*.bak, *.tmp)
- Simple, intuitive semantics
- Consistent across all commands

**Commits:**
1. Session 1: Rust core implementation
2. Session 2: TypeScript config and doctor
3. Session 3: Tests and documentation

---

## 📋 FUTURE WORK

Items deferred to future tasks/versions. Create separate tasks as needed.

### Future Task 1: Fix Doctor's Recursive Scanning (High Priority)

**Issue:** Doctor violates S1 spec by recursively scanning subdirectories

**Current behavior:**
- `findMarkdownFiles()` recursively scans up to 10 levels deep
- Skips `archive/` but processes other subdirectories
- Inconsistent with Rust scanners (root-only)

**S1 Spec (line 75):**
> "Task files in subdirectories SHALL NOT be read during normal operation"

**Impact:**
- Doctor validates files that shouldn't exist per spec
- Inconsistent with `list`, `show`, and other commands
- May confuse users about file organization

**Recommendation:**
- Change `findMarkdownFiles()` to root-only scanning
- Match Rust `scan_directory()` behavior
- Test that archive/ is still handled correctly
- Update any tests that depend on recursive scanning

**Estimated effort:** 1-2 hours

**File:** `tdn-cli/src/commands/doctor.ts`

---

### Future Task 2: Support .taskdnignore File (Optional)

**User request:** Support `.taskdnignore` file as alternative to config

**Pros:**
- Cleaner for large pattern lists
- Can be committed to version control
- Familiar pattern (like .gitignore, .dockerignore)
- Per-project ignores without modifying config

**Cons:**
- Another file to manage
- Need to define precedence (config vs file vs both?)
- More complexity

**Recommendation:**
- Wait for user feedback
- If multiple users request it, implement in v2
- If implementing, consider: config patterns + .taskdnignore patterns (additive)

**Estimated effort:** 2-3 hours

---

### Future Task 3: Per-Directory Ignore Patterns (Optional)

**Enhancement:** Allow different patterns for tasks/projects/areas

**Example:**
```json
{
  "ignore": {
    "tasks": ["*.draft.md"],
    "projects": ["cover.md", "README.md"],
    "areas": ["cover.md"]
  }
}
```

**Use case:**
- Different conventions in different directories
- More granular control

**Complexity:**
- Config schema change
- Rust VaultConfig needs nested structure or separate fields
- More complex validation
- Backward compatibility with current array format

**Recommendation:**
- Wait for user requests
- Current global patterns cover 95% of use cases
- Can add in v2 if needed

**Estimated effort:** 4-6 hours

---

### Future Task 4: Negation Patterns (Optional)

**Enhancement:** Support `!` prefix to un-ignore files

**Example:**
```json
{
  "ignore": [
    "*.md",           // Ignore all .md files
    "!important.md"   // Except this one
  ]
}
```

**Complexity:**
- Order-dependent processing
- `globset` doesn't handle automatically
- Need to separate positive/negative patterns
- Match positive first, then check negatives
- Complex precedence rules

**Recommendation:**
- Only implement if users specifically request it
- Most use cases covered by positive patterns alone
- Significant complexity for edge-case feature

**Estimated effort:** 6-8 hours

---

### Future Task 5: Archive Directory Support (Medium Priority)

**Current state:**
- Archive directories are skipped entirely
- No commands scan archived files
- Doctor doesn't validate archive contents

**Future enhancement:**
- Commands to query archived tasks/projects
- `tdn list tasks --include-archived`
- `tdn doctor --include-archived`

**Question for future:** Should ignore patterns apply to archived files?

**Recommendation:**
- Implement archive querying first
- Then decide if ignore patterns should apply
- Likely answer: yes, patterns should apply to keep behavior consistent

**Related spec:** S1 spec mentions archive directories but doesn't fully specify behavior

---

### Future Task 6: Performance Optimization (Low Priority)

**Current implementation:** Rebuild `GlobSet` on every scan call

**Optimization:** Cache compiled `GlobSet` in config object

**Impact:**
- Current: Negligible (patterns compiled once per command)
- Optimized: Slightly faster for multi-directory operations

**When to do:**
- If profiling shows pattern compilation is a bottleneck
- Unlikely to be needed for typical use (5-20 patterns)

**Estimated effort:** 1-2 hours

---

### Future Task 7: Ignore Patterns in Other Scan Contexts (Low Priority)

**Question:** Should patterns apply to other file operations?

**Potential contexts:**
- File watching (if we add live reloading)
- Bulk import operations
- Migration tools
- Backup/export operations

**Recommendation:**
- Assess per-feature as they're built
- Default: respect ignore patterns everywhere for consistency
- Allow override if specific use case requires it

---

## Notes for Future Implementers

### Key Design Decisions Made

1. **Filename-only matching** - Simplifies implementation, sufficient for spec-compliant root-level scanning
2. **Local replaces user** - Simple override, no merge complexity
3. **Platform-aware case sensitivity** - Matches filesystem behavior
4. **Warn and skip invalid** - Forgiving, doesn't break workflow
5. **Security validation** - Block paths, traversal, separators

### If You Need to Change These

**Adding path-based matching:**
- Update validation to allow `/` in patterns
- Use `strip_prefix()` in Rust to get relative path
- Update documentation (patterns relative to scanned directory)
- More complex mental model for users

**Adding merge semantics:**
- Decide precedence (user first? local first?)
- Handle duplicates
- Document clearly
- More complex config loading

**Adding negation:**
- Separate positive/negative patterns
- Process in order
- Handle edge cases (what if only negations?)
- Significantly more complex

### Test Coverage

When adding features, maintain test coverage for:
- ✅ Exact match
- ✅ Wildcard patterns
- ✅ Multiple patterns
- ✅ Empty/None cases
- ✅ Invalid patterns
- ✅ Case sensitivity (platform-specific)
- ✅ Security validation

### Documentation Locations

When updating:
- `tdn-cli/docs/developer/configuration.md` - Technical details
- `docs/product-overviews/cli/cli-requirements.md` - Requirements
- `tdn-cli/README.md` - User-facing examples
- `tdn-cli/docs/cli-progress.md` - Feature tracking
