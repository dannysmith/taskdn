# Task: Security Audit

Conduct a full security audit on this whole codebase as an expert security auditor of applications such as this. Remember this is a Tauri desktop app which works only with local markdown files on disk, for personal task management.

---

## Security Audit Report

**Audit Date:** 2026-01-17
**Target:** Taskdn Desktop v0.1.0
**Auditor:** Claude Code Security Analysis

### Executive Summary

**Overall Security Posture: GOOD**

This Tauri v2 desktop application demonstrates generally solid security practices. The codebase handles local markdown files for personal task management and does not process sensitive credentials or connect to external APIs (beyond the auto-updater).

#### Key Strengths
- No XSS vulnerabilities (no `dangerouslySetInnerHTML` usage)
- Type-safe IPC via tauri-specta
- Strong filename validation with path traversal protection
- Atomic file writes prevent corruption
- Resource limits protect against DoS from large vaults
- Write-loop prevention in file watcher

#### Areas Requiring Attention
- High: NPM dependency vulnerabilities (transitive, low practical risk)
- Medium: CSP could be strengthened for defense-in-depth
- Low: Path validation improvements (mitigated by existing controls)

---

### Detailed Findings

#### CRITICAL: Placeholder Updater Public Key [IGNORE THIS ONE]

**Location:** `src-tauri/tauri.conf.json:75`

```json
"pubkey": "YOUR_UPDATER_PUBLIC_KEY_HERE"
```

The auto-updater is enabled but configured with a placeholder public key. This will cause signature verification to fail, making the updater non-functional. More critically, if this placeholder is inadvertently bypassed, it could allow man-in-the-middle attacks where malicious updates are installed.

**Impact:** Auto-updater will not work; potential security risk if placeholder is bypassed.

Decision: THis will be addressed in a later task.

---

#### HIGH (reported) / LOW (practical): NPM Dependency Vulnerabilities

**Location:** `package.json` (transitive dependencies via `shadcn`)

| Dependency | Severity | Issue |
|------------|----------|-------|
| hono <4.11.4 | High | JWT algorithm confusion (GHSA-3vhc-576x-3qv4, GHSA-f67f-6cw9-8mq4) |
| @modelcontextprotocol/sdk <1.25.2 | High | ReDoS vulnerability (GHSA-8r9q-7v3j-jr4g) |
| diff <8.0.3 | Low | DoS in parsePatch/applyPatch (GHSA-73rr-hh4g-fpgx) |

**Practical Risk: LOW** - These are in `shadcn`'s CLI toolchain (MCP SDK), not runtime code shipped with the app. The JWT vulnerabilities in hono are irrelevant since this app doesn't use JWT authentication. The ReDoS vulnerability only affects CLI usage, not the bundled application.

**Action:** Run `bun update` periodically to keep dependencies current, but this is not a security blocker.

---

#### MEDIUM: CSP Allows 'unsafe-inline'

**Location:** `src-tauri/tauri.conf.json:34`

```json
"csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ..."
```

While no current XSS vectors exist, `'unsafe-inline'` weakens CSP protection. If XSS is ever introduced (e.g., via the Milkdown markdown editor or future features), inline scripts could execute.

**Note:** This may be required by Vite/React development mode. Consider different CSP for dev vs production.

---

#### MEDIUM: Wide Opener Path Permission [IGNORE THIS ONE]

**Location:** `src-tauri/capabilities/default.json:21-23`

```json
{
  "identifier": "opener:allow-open-path",
  "allow": [{ "path": "**" }]
}
```

Allows opening any file path on the system. While needed for "Open in Finder" functionality, it could be abused if a vulnerability allows an attacker to control which paths are opened.

DECISION: This is fine, and required for this application

---

#### LOW: Vault Directory Path Validation

**Location:** `src-tauri/src/vault/scanner.rs:48-53`

```rust
pub fn is_valid(&self) -> bool {
    Path::new(&self.tasks_dir).is_dir()
        && Path::new(&self.projects_dir).is_dir()
        && Path::new(&self.areas_dir).is_dir()
}
```

Only validates that directories exist, not whether paths are absolute or contain traversal sequences.

**Practical Risk: VERY LOW** - Multiple mitigating factors make this a non-issue:
1. User explicitly configures these paths via the UI (not from untrusted input)
2. The app only processes `.md` files with valid S1-compliant frontmatter
3. Even if pointed at `/etc`, files would fail frontmatter parsing and be skipped
4. No sensitive data is written - only task/project/area markdown files

**Action:** No immediate action required. Could add canonicalization as defense-in-depth if desired.

---

#### LOW: Deep Link Path Validation

**Location:** `src/lib/deep-link.ts:97-102`

```typescript
if (!path.startsWith('/')) {
  return { type: 'invalid' }
}
return { type: 'open-path', path }
```

Accepts any absolute path in `taskdn://open?path=...` deep links without validating the path is within configured vault directories.

**Practical Risk: LOW** - The backend provides strong protection:
1. `get_entity_raw_content` only returns content for paths that exist in the vault index
2. The vault index is built by scanning configured directories only
3. A deep link like `taskdn://open?path=/etc/passwd` would simply fail with "entity not found"
4. Arbitrary file read is not possible through this vector

**Action:** No immediate action required. Could add frontend validation for cleaner error handling.

---

#### LOW: Git Dependency Without Commit Pin

**Location:** `src-tauri/Cargo.toml:64`

```toml
tauri-nspanel = { git = "https://github.com/ahkohd/tauri-nspanel", branch = "v2.1" }
```

Branch references can change; should be pinned to a specific commit for reproducibility and to prevent supply chain attacks.

---

#### LOW: macOS Private API Usage

**Location:** `src-tauri/tauri.conf.json:36`

Used for NSPanel-based quick pane. May cause Mac App Store rejection and potential breakage on macOS updates.

Decision: Just document this somewhere appropriate in the developer documents.

---

### Security Positives Verified

1. **Filename validation** (`src-tauri/src/types.rs:110-127`) - Properly rejects path traversal, special characters, hidden files, multiple extensions, and overly long names.

2. **Atomic file writes** (`src-tauri/src/vault/writer.rs:103-151`) - Uses temp file + rename pattern for crash safety.

3. **No shell command execution** - No `Command::new()` or similar with user input.

4. **Type-safe IPC** - All frontend-backend communication is type-checked via tauri-specta.

5. **Resource limits** (`src-tauri/src/vault/scanner.rs:19-21`) - MAX_FILES_PER_SCAN (10,000) and MAX_PARALLEL_THREADS (8) protect against DoS.

6. **No dangerous HTML rendering** - No `dangerouslySetInnerHTML` or `innerHTML` usage found in React code.

---

### OWASP Top 10 (2021) Mapping

| Category | Status | Notes |
|----------|--------|-------|
| A01: Broken Access Control | Pass | Local app with file-level permissions |
| A02: Cryptographic Failures | Pass | Updater key to be configured before release (separate task) |
| A03: Injection | Pass | Type-safe Rust backend, no SQL |
| A04: Insecure Design | Pass | Good separation of concerns |
| A05: Security Misconfiguration | Pass | CSP is appropriate for local app context |
| A06: Vulnerable Components | Pass | Reported vulns are in dev tooling, not runtime |
| A07: Identification Failures | N/A | No authentication in app |
| A08: Software Data Integrity | Pass | Updater signing will be configured before release |
| A09: Logging Failures | Pass | Good logging implementation |
| A10: SSRF | N/A | No server-side requests from user input |

---

## Implementation Plan

Based on the findings and decisions above, here are the remaining actionable items organized by priority. Each can be addressed in a separate Claude Code session.

### Required Actions

- [x] **1. Pin tauri-nspanel to specific commit** (Done 2026-01-17)
  - Location: `src-tauri/Cargo.toml:64`
  - Pinned to commit `da9c9a8d4eb7f0524a2508988df1a7d9585b4904`
  - Prevents supply chain attacks from branch reference changes

- [x] **2. Document macOS private API usage** (Done 2026-01-17)
  - Added "Platform-Specific Notes" section to `docs/developer/architecture-guide.md`
  - Documents why NSPanel/private API is used, App Store implications, and mitigations

### Optional Improvements (Defense-in-Depth)

These are nice-to-have but not required given the existing mitigations:

- [ ] **3. Run `bun update` periodically**
  - Keeps transitive dependencies current
  - Not a security blocker (reported vulns are in dev tooling)
  - Effort: Low

- [ ] **4. CSP hardening investigation**
  - Evaluate if `'unsafe-inline'` can be removed in production builds
  - May require changes to how Vite/React handles inline styles
  - Document findings even if no changes made
  - Effort: Medium

- [ ] **5. Set up automated dependency scanning in CI** (optional)
  - Add `bun audit` to CI pipeline
  - Good practice but not urgent given low practical risk
  - Effort: Low

---

## Summary

| Finding | Reported Severity | Practical Risk | Action |
|---------|-------------------|----------------|--------|
| Updater key placeholder | Critical | N/A | Separate task |
| NPM vulnerabilities | High | Low | Periodic `bun update` |
| Opener capability scope | Medium | Accepted | Required for app |
| CSP unsafe-inline | Medium | Low | Optional hardening |
| Vault path validation | Medium | Very Low | No action needed |
| Deep link validation | Medium | Low | No action needed |
| Git dependency pinning | Low | Low | Done |
| macOS private API | Low | N/A | Done |

**Conclusion:** The codebase has a solid security posture for a local-file desktop application. All required actions have been completed. Other findings have low practical risk due to existing mitigations.
