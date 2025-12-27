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
3. **CRITICAL + HIGH:** YAML bomb vulnerability + Deprecated `serde_yaml` - **BOTH FIXED by migrating to serde-saphyr**
4. **HIGH:** No CI/CD security validation - supply chain risks
5. **HIGH:** TOCTOU race conditions in file operations

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

Migrating to **serde-saphyr** (HIGH-2) provides built-in protection via its Budget mechanism:

```rust
use serde_saphyr::{from_str, Budget};

// Configure budget limits for DoS protection
let budget = Budget::default()
    .with_max_depth(10)          // Prevents deeply nested structures
    .with_max_keys(100)           // Limits number of keys
    .with_max_string_size(10000); // Limits individual string size

// Deserialize with budget protection
let frontmatter: TaskFrontmatter = from_str(&yaml_str)
    .with_budget(budget)?;
```

**Additional hardening:**
- Add file size check (10MB max) before parsing
- Validate frontmatter length before deserialization

**Note:** This vulnerability is comprehensively addressed by the serde-saphyr migration (HIGH-2).

---

## High Severity Findings

### HIGH-2: Deprecated serde_yaml Dependency

**Location:** `tdn-cli/crates/core/Cargo.toml:25`
**CVSS Score:** 6.8 (Medium-High)

**Description:**
The project uses `serde_yaml v0.9.34+deprecated`, which is no longer maintained. Security vulnerabilities won't be patched.

**Required Fix:**

```toml
# Replace in Cargo.toml with modern, secure alternative
serde-saphyr = "0.0.10"

# Benefits:
# - Zero unsafe code (pure Rust)
# - Fastest performance (benchmarked superior to all alternatives)
# - Built-in DoS protection via Budget mechanism
# - Type-driven parsing (safer by design)
# - Actively maintained (created Sept 2025)
```

**Note:** gray_matter already uses yaml-rust2 for frontmatter extraction, so this only affects deserialization into Rust types.

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

- [ ] **Migrate to serde-saphyr (CRIT-3 + HIGH-2 combined)**
  - Replace `serde_yaml` with `serde-saphyr` in Cargo.toml
  - Update imports across Rust codebase
  - Configure Budget with appropriate limits:
    - `max_depth(10)` - prevents deeply nested structures
    - `max_keys(100)` - prevents excessive fields
    - `max_string_size(10_000)` - limits individual strings
  - Add file size check (10MB) before parsing
  - Update all deserialization calls to use serde-saphyr API
  - Test with existing demo-vault files
  - Verify all 18 task files parse correctly
  - Files: `tdn-cli/crates/core/Cargo.toml`, `task.rs`, `project.rs`, `area.rs`

  **Note:** This single migration fixes both CRIT-3 (YAML bombs) and HIGH-2 (deprecated dependency)

### Priority 2: High Severity

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

---

## Appendix: YAML Parser Migration Research

**Research Date:** 2025-12-27
**Decision:** Migrate from `serde_yaml` (deprecated) to `serde-saphyr`

### Alternatives Evaluated

| Parser | Pros | Cons | Verdict |
|--------|------|------|---------|
| **serde-saphyr** | Zero unsafe, fastest, built-in DoS protection, type-driven | Very new (v0.0.10), API changes needed | ✅ **SELECTED** |
| **yaml-rust2** | Pure Rust, stable, already in dependency tree (via gray_matter) | Lower-level API, not Serde-first | Good fallback |
| **serde_yaml_ng** | Drop-in replacement, easiest migration | Uses unmaintained unsafe-libyaml (though patched) | Not recommended |
| **serde_norway** | Drop-in replacement, maintained libyaml fork | Still uses unsafe C code | Not recommended |
| **serde_yml** | N/A | **UNSOUND - RustSec Advisory RUSTSEC-2025-0068** | ❌ **AVOID** |

### Key Discovery

The current codebase uses `gray_matter` for frontmatter extraction, which already depends on `yaml-rust2 v0.10`. This means:
- We're not using `serde_yaml` for initial parsing
- Only need replacement for deserialization into Rust types
- Migration is more focused than initially thought

### Security Benefits of serde-saphyr

1. **Zero unsafe code** - Pure Rust implementation
2. **Built-in DoS protection** via Budget mechanism:
   - `max_depth` prevents deeply nested structures (Billion Laughs)
   - `max_keys` limits number of fields
   - `max_string_size` prevents memory exhaustion
3. **Type-driven parsing** - Safer by design, prevents "Norway problem"
4. **Performance** - Benchmarked 20-30% faster than alternatives
5. **Active maintenance** - Created Sept 2025, ongoing development

### Migration Complexity: Medium

**Estimated effort:** 2-4 hours

**Changes required:**
- Update `Cargo.toml` dependency
- Replace `serde_yaml::from_str()` with `serde_saphyr::from_str()`
- Configure Budget limits for security
- Update error handling (different error types)
- Test all parsing operations

**Files affected:**
- `tdn-cli/crates/core/Cargo.toml`
- `tdn-cli/crates/core/src/task.rs`
- `tdn-cli/crates/core/src/project.rs`
- `tdn-cli/crates/core/src/area.rs`

### Testing Strategy

1. Unit tests with malicious YAML:
   - YAML bombs (anchor/alias abuse)
   - Deeply nested structures (>10 levels)
   - Excessive keys (>100 fields)
   - Large strings (>10KB individual values)
2. Integration tests with demo-vault (18 task files)
3. Performance benchmarks vs old parser
4. Fuzz testing with yaml-test-suite

### Sources

- [serde-saphyr GitHub](https://github.com/bourumir-wyngs/serde-saphyr)
- [serde-saphyr on crates.io](https://crates.io/crates/serde-saphyr)
- [Rust Forum: serde_yaml deprecation discussion](https://users.rust-lang.org/t/serde-yaml-deprecation-alternatives/108868)
- [RustSec RUSTSEC-2025-0068: serde_yml unsound](https://rustsec.org/advisories/RUSTSEC-2025-0068.html)
- [RustSec RUSTSEC-2023-0075: unsafe-libyaml vulnerability](https://rustsec.org/advisories/RUSTSEC-2023-0075.html)
- [gray_matter crate](https://crates.io/crates/gray_matter)
- [yaml-rust2 GitHub](https://github.com/Ethiraric/yaml-rust2)
