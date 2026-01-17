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
- Critical: Placeholder updater public key
- High: NPM dependency vulnerabilities
- Medium: CSP, path validation, and capability scope issues

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

#### HIGH: NPM Dependency Vulnerabilities

**Location:** `package.json` (transitive dependencies via `shadcn`)

| Dependency | Severity | Issue |
|------------|----------|-------|
| hono <4.11.4 | High | JWT algorithm confusion (GHSA-3vhc-576x-3qv4, GHSA-f67f-6cw9-8mq4) |
| @modelcontextprotocol/sdk <1.25.2 | High | ReDoS vulnerability (GHSA-8r9q-7v3j-jr4g) |
| diff <8.0.3 | Low | DoS in parsePatch/applyPatch (GHSA-73rr-hh4g-fpgx) |

These are in `shadcn`'s MCP SDK dependency chain and are not actively used by the application's core functionality. However, they should be updated.

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

#### MEDIUM: Vault Directory Path Validation

**Location:** `src-tauri/src/vault/scanner.rs:48-53`

```rust
pub fn is_valid(&self) -> bool {
    Path::new(&self.tasks_dir).is_dir()
        && Path::new(&self.projects_dir).is_dir()
        && Path::new(&self.areas_dir).is_dir()
}
```

Only validates that directories exist, not whether paths are absolute, contain traversal sequences, or resolve through symlinks. A malicious preferences file could potentially point to system directories.

**Mitigating Factor:** The app only reads/writes markdown files with specific frontmatter, limiting practical exploitation.

---

#### MEDIUM: Deep Link Path Validation

**Location:** `src/lib/deep-link.ts:97-102`

```typescript
if (!path.startsWith('/')) {
  return { type: 'invalid' }
}
return { type: 'open-path', path }
```

Accepts any absolute path in `taskdn://open?path=...` deep links without validating the path is within configured vault directories.

**Mitigating Factor:** The backend validates entities exist in the vault index before returning content.

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
| A02: Cryptographic Failures | Attention | Updater key placeholder is critical |
| A03: Injection | Pass | Type-safe Rust backend, no SQL |
| A04: Insecure Design | Pass | Good separation of concerns |
| A05: Security Misconfiguration | Minor | CSP could be strengthened |
| A06: Vulnerable Components | Attention | NPM vulnerabilities need addressing |
| A07: Identification Failures | N/A | No authentication in app |
| A08: Software Data Integrity | Attention | Updater key must be configured |
| A09: Logging Failures | Pass | Good logging implementation |
| A10: SSRF | N/A | No server-side requests from user input |

---

## Phased Implementation Plan

The following phases organize the security improvements by priority and effort. Each item can be addressed in a separate Claude Code session.

### Phase 1: Critical (Pre-Release Blockers)

These MUST be addressed before any public release.

- [ ] **1.1 Generate and configure updater signing keys**
  - Generate Ed25519 key pair: `tauri signer generate -w ~/.tauri/taskdn.key`
  - Store private key securely (NOT in repository)
  - Update `src-tauri/tauri.conf.json` with actual public key
  - Add CI check to ensure placeholder is not shipped

- [ ] **1.2 Update NPM dependencies**
  - Run `bun update` to resolve high-severity vulnerabilities
  - Verify vulnerabilities are resolved with `bun audit`
  - If shadcn's MCP SDK is not needed, evaluate removing it

### Phase 2: High Priority (Should Address Soon)

These should be addressed before v1.0 release.

- [ ] **2.1 Add vault path canonicalization**
  - Location: `src-tauri/src/vault/scanner.rs`
  - Use `std::fs::canonicalize()` on vault directory paths
  - Validate paths are absolute
  - Consider restricting to user home directory
  - Add tests for path traversal attempts

- [ ] **2.2 Validate deep link paths against vault boundaries**
  - Location: `src/lib/deep-link.ts`
  - Before accepting a path, verify it's within configured vault directories
  - Add utility function to check path containment
  - Add tests for malicious deep link attempts

- [ ] **2.3 Set up automated dependency scanning in CI**
  - Add `bun audit` to CI pipeline
  - Add `cargo audit` to CI pipeline (may need to fix CVSS 4.0 parsing issue)
  - Configure to fail build on high-severity vulnerabilities

### Phase 3: Medium Priority (Hardening)

These improve security posture but are not urgent.

- [ ] **3.1 Restrict opener capability scope**
  - Location: `src-tauri/capabilities/default.json`
  - Option A: Restrict to specific parent directories (vault dirs, app data)
  - Option B: Add path validation in the Rust command that calls opener
  - Document security rationale for chosen approach

- [ ] **3.2 Strengthen CSP for production builds**
  - Evaluate if `'unsafe-inline'` can be removed in production
  - Consider using nonces for necessary inline scripts
  - Document why certain CSP directives are needed if they must remain

- [ ] **3.3 Pin tauri-nspanel to specific commit**
  - Location: `src-tauri/Cargo.toml`
  - Change from `branch = "v2.1"` to `rev = "<specific-commit-hash>"`
  - Document the commit and reason for pinning

### Phase 4: Low Priority (Best Practices)

These are nice-to-have improvements for defense in depth.

- [ ] **4.1 Add security regression tests**
  - Test that path traversal attempts are rejected
  - Test that malformed deep links are handled safely
  - Test XSS payloads in task content are not rendered as HTML

- [ ] **4.2 Document security decisions**
  - Document why macOS private API is used
  - Document trust boundaries between frontend and backend
  - Add security section to developer documentation

- [ ] **4.3 Consider App Store build variant**
  - Evaluate fallback behavior without NSPanel for App Store compliance
  - Document any feature differences between variants

---

## Summary Table

| Finding | Severity | Phase | Effort |
|---------|----------|-------|--------|
| Placeholder updater key | Critical | 1 | Low |
| NPM dependency vulnerabilities | High | 1 | Low |
| Vault path validation | Medium | 2 | Medium |
| Deep link path validation | Medium | 2 | Low |
| CI dependency scanning | Medium | 2 | Low |
| Opener capability scope | Medium | 3 | Low |
| CSP hardening | Medium | 3 | Medium |
| Git dependency pinning | Low | 3 | Low |
| Security regression tests | Low | 4 | Medium |
| Security documentation | Low | 4 | Low |
| App Store build variant | Low | 4 | Medium |
