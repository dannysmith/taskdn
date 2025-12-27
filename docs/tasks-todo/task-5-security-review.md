# Task: Security Review

> Independent security review by security expert

## Executive Summary

**Audit Date:** 2025-12-27
**Risk Level After Remediation:** LOW-MODERATE

The Taskdn CLI demonstrates solid security fundamentals with memory-safe Rust core and careful TypeScript validation. However, **3 Critical** and **6 High** severity vulnerabilities require immediate attention.

### Findings Summary

- **Critical:** 3 findings (command injection, path traversal, YAML parsing)
- **High:** 6 findings (TOCTOU, deprecated deps, build pipeline, etc.)
- **Medium:** 13 findings (input validation, resource limits, etc.)
- **Low:** 9 findings (error verbosity, weak entropy, etc.)

### Top Priority Issues

1. **CRITICAL:** Command injection in `open.ts` - allows arbitrary command execution via `$EDITOR`
2. **CRITICAL:** Path traversal in config loading - can read/write arbitrary filesystem locations
3. **CRITICAL:** YAML bomb vulnerability - can cause memory/CPU exhaustion
4. **HIGH:** No CI/CD security validation - supply chain risks
5. **HIGH:** Deprecated `serde_yaml` dependency - no security updates
6. **HIGH:** TOCTOU race conditions in file operations

---

## Critical Findings

### CRIT-1: Command Injection in Editor Invocation

**Location:** `tdn-cli/src/commands/open.ts:66-68`
**CVSS Score:** 8.6 (Critical)
**CWE:** CWE-78 (OS Command Injection)

**Description:**
The `open` command uses `spawnSync` with `shell: true`, allowing arbitrary command execution through the `$EDITOR` environment variable.

**Attack Scenario:**

```bash
export EDITOR='vim"; rm -rf ~/*; echo "'
taskdn open mytask.md
# Executes: vim"; rm -rf ~/*; echo " /path/to/task.md
```

**Impact:** Arbitrary command execution with user privileges, data destruction, malware installation

**Required Fix:**

```typescript
// Remove shell: true and validate editor
const result = spawnSync(editor, [task.path], {
  stdio: 'inherit',
  shell: false, // CRITICAL: No shell interpretation
})

// Add editor validation
const ALLOWED_EDITORS = ['vim', 'nvim', 'nano', 'emacs', 'code']
if (!ALLOWED_EDITORS.includes(editorBasename)) {
  throw new Error('Editor not in allowed list')
}
```

---

### CRIT-2: Path Traversal in Configuration Loading

**Location:** `tdn-cli/src/config/index.ts:84-125`
**CVSS Score:** 7.8 (High)
**CWE:** CWE-22 (Improper Path Limitation)

**Description:**
Configuration files can specify arbitrary paths for `tasksDir`, `projectsDir`, and `areasDir` without validation, enabling read/write access to any filesystem location.

**Attack Scenario:**

```json
// Malicious .taskdn.json
{
  "tasksDir": "/etc",
  "projectsDir": "/var/log",
  "areasDir": "../../../../../../etc/passwd"
}
```

**Impact:** Reading sensitive files (SSH keys, passwords), writing to system directories, information disclosure

**Required Fix:**

```typescript
function validateVaultPath(path: string): string {
  const absolutePath = resolve(path)

  // Block system directories
  const systemDirs = ['/etc', '/var', '/usr', '/bin', '/sbin', '/root']
  for (const sysDir of systemDirs) {
    if (absolutePath.startsWith(sysDir)) {
      throw new Error('Vault cannot point to system directory')
    }
  }

  // Warn if outside home directory
  const home = homedir()
  if (!absolutePath.startsWith(home)) {
    console.warn('Warning: Vault outside home directory')
  }

  return absolutePath
}
```

---

### CRIT-3: YAML Bomb / Resource Exhaustion Vulnerability

**Location:** `tdn-cli/crates/core/src/task.rs:92-96`
**CVSS Score:** 7.5 (High)
**CWE:** CWE-776 (XML Entity Expansion / Billion Laughs)

**Description:**
The YAML parser accepts unlimited file sizes and complexity, enabling denial-of-service attacks through maliciously crafted frontmatter.

**Attack Scenario:**

```yaml
---
title: &a 'lol'
a: &b [*a, *a]
b: &c [*b, *b]
c: &d [*c, *c]
# ... exponential expansion
---
```

**Impact:** Memory exhaustion, CPU consumption, application crash, blocking other operations

**Required Fix:**

```rust
const MAX_FILE_SIZE: u64 = 10_000_000; // 10MB
const MAX_FRONTMATTER_SIZE: usize = 100_000; // 100KB

pub fn parse_task_file(file_path: String) -> Result<Task> {
    let metadata = fs::metadata(path)?;
    if metadata.len() > MAX_FILE_SIZE {
        return Err(TdnError::validation_error(
            &file_path, "file_size",
            "File exceeds maximum size (10MB)"
        ).into());
    }

    // Validate frontmatter structure before parsing
    validate_frontmatter_structure(&content)?;
    // ... rest of function
}
```

---

## High Severity Findings

### HIGH-2: Deprecated serde_yaml Dependency

**Location:** `tdn-cli/crates/core/Cargo.toml:25`
**CVSS Score:** 6.8 (Medium-High)

**Description:**
The project uses `serde_yaml v0.9.34+deprecated`, which is no longer maintained. Security vulnerabilities won't be patched.

**Required Fix:**

```toml
# Replace in Cargo.toml
serde_yml = "0.0.12"  # Maintained fork

# Update imports
use serde_yml as serde_yaml;  // Alias for compatibility
```

---

### HIGH-3: TOCTOU Race Conditions

**Location:** Multiple files - `task.rs:82-88`, `writer.rs:560-567`, `update.ts:427-445`
**CVSS Score:** 6.3 (Medium-High)

**Description:**
File operations check existence before reading, creating race condition windows where files can be swapped, deleted, or symlinked.

**Required Fix:**

```rust
// Remove redundant exists() checks - rely on error handling
let content = fs::read_to_string(path)
    .map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            TdnError::file_not_found(&file_path)
        } else {
            TdnError::file_read_error(&file_path, e.to_string())
        }
    })?;
```

---

### HIGH-4: Inadequate Demo Vault Protection

**Location:** Architecture - `demo-vault/` vs `dummy-demo-vault/`
**CVSS Score:** 5.8 (Medium)

**Description:**
Only documentation protects canonical `demo-vault/` from modification. No technical enforcement prevents accidental corruption.

**Required Actions:**

1. Create `demo-vault/.readonly` marker file
2. Implement `isReadOnlyVault()` check in TypeScript layer
3. Add `validateWritableVault()` to all write commands
4. Create git pre-commit hook to prevent commits of modified demo-vault
5. Add CI check to verify demo-vault unchanged

---

### HIGH-5: Symlink Following Without Validation

**Location:** `tdn-cli/crates/core/src/vault.rs:84-107`
**CVSS Score:** 5.5 (Medium)

**Description:**
Directory scanner follows symlinks without validation. Malicious symlinks could expose sensitive files outside vault.

**Required Fix:**

```rust
.filter(|entry| {
    let metadata = entry.metadata().ok()?;

    #[cfg(unix)]
    if metadata.file_type().is_symlink() {
        warn!("Skipping symlink: {:?}", entry.path());
        return None;
    }

    Some(metadata.is_file())
})
```

---

### HIGH-6: Missing Resource Limits

**Location:** `tdn-cli/crates/core/src/vault.rs:116-131`
**CVSS Score:** 5.9 (Medium)

**Description:**
Rayon parallel processing has no concurrency limits. Large vaults can cause resource exhaustion.

**Required Fix:**

```rust
const MAX_FILES_PER_SCAN: usize = 10_000;
const MAX_PARALLEL_THREADS: usize = 8;

let pool = rayon::ThreadPoolBuilder::new()
    .num_threads(MAX_PARALLEL_THREADS)
    .build()
    .unwrap();

let entries: Vec<_> = entries
    .take(MAX_FILES_PER_SCAN)  // Limit file count
    .collect();
```

---

## Actions

### Priority 1: Critical Fixes

- [ ] **Fix command injection (CRIT-1)**

  - Remove `shell: true` from `spawnSync` in `open.ts`
  - Implement editor validation
  - Add tests for shell metacharacter rejection
  - File: `tdn-cli/src/commands/open.ts`

- [ ] **Implement path validation (CRIT-2)**

  - Create `validateVaultPath()` function
  - Block system directories (`/etc`, `/var`, etc.)
  - Apply to config loading in `src/config/index.ts`
  - Add comprehensive path traversal tests
  - File: `tdn-cli/src/config/index.ts`

- [ ] **Add YAML parsing limits (CRIT-3)**
  - Implement file size check (10MB max)
  - Add frontmatter size limit (100KB)
  - Detect YAML bomb patterns (anchor/alias abuse)
  - Add fuzz testing for YAML parser
  - File: `tdn-cli/crates/core/src/task.rs`

### Priority 2: High Severity

- [ ] **Replace deprecated dependency (HIGH-2)**

  - Migrate from `serde_yaml` to a more suitable system
  - Update imports across Rust codebase
  - Test YAML parsing compatibility
  - File: `tdn-cli/crates/core/Cargo.toml`

- [ ] **Mitigate TOCTOU vulnerabilities (HIGH-3)**

  - Remove redundant `path.exists()` checks
  - Rely on error handling from file operations
  - Add retry logic for concurrent modifications
  - Files: `task.rs`, `project.rs`, `area.rs`, `writer.rs`

- [ ] **Implement resource limits (HIGH-6)**
  - Cap Rayon threads (8 max)
  - Limit files per scan (10,000 max)
  - Add scan timeout (30 seconds)
  - Validate directory size before scanning
  - File: `tdn-cli/crates/core/src/vault.rs`
