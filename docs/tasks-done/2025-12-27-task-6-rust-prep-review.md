# Task: Potential Rust API Refactorings Findings

> Review for potential Rust refactoring in preparation for possibly extracting the Rust code into a package which can be used in the Tauri app, and eventually published for other users. Maybe including the NAPI TS Bindings so we get a TS API for free with this work. This doesn't need to actually have this ready to do this. It's more about preparatory work we could do uh low hanging fruit which would make this easier to do in the future.

## Findings Summary

**Bottom Line:** Extraction is architecturally feasible and would provide significant value. The current code is already well-structured for extraction, with shallow NAPI coupling. However, full extraction now would be premature. **Recommended approach:** Start with path dependency sharing, implement targeted preparatory refactorings, then extract to proper shared library once desktop app patterns are clear.

### Current State Analysis

The Rust core (`tdn-cli/crates/core/`) is ~3,881 lines across 12 well-organized modules:

**Core modules:**

- `task.rs`, `project.rs`, `area.rs` - Entity parsing and data structures
- `vault.rs` - Parallel directory scanning with rayon
- `vault_session.rs` - Session-based lazy indexing pattern
- `vault_index.rs` - Relationship graph and fast lookups (700+ lines)
- `writer.rs` - Atomic file writing with round-trip fidelity
- `wikilink.rs` - WikiLink parsing utilities
- `error.rs` - Structured error types
- `query_results.rs` - Composite result types for complex queries

**NAPI coupling assessment:**
The NAPI coupling is **shallow and concentrated at the FFI boundary**:

- ✅ **Domain logic is pure Rust** - No NAPI types in business logic
- ✅ **Standard Rust types** - Uses `String`, `Option<T>`, `Vec<T>` (naturally NAPI-compatible)
- ✅ **Clean module separation** - Each module has focused responsibility
- ⚠️ **Surface-level NAPI attributes** - `#[napi]` macros on public functions/structs
- ⚠️ **Error conversion layer** - `impl From<TdnError> for napi::Error` (easily abstracted)
- ⚠️ **Dependency coupling** - `napi`, `napi-derive` in Cargo.toml

**The good news:** The internal implementation is already extraction-ready. The NAPI coupling is annotation-level, not architectural.

### Extraction Feasibility Assessment

**Feasibility: HIGH ✅**

The code is already well-structured for extraction because:

1. **Modular architecture** - Clean separation of concerns (parsing, indexing, querying, writing)
2. **Pure domain logic** - Core business logic has no FFI awareness
3. **Standard Rust idioms** - No NAPI-specific patterns in internal code
4. **Testability** - Internal modules can be tested independently
5. **Clear boundaries** - Public API is concentrated in NAPI-annotated functions

**Extraction complexity: MEDIUM**

Main challenges:

- Error handling abstraction (currently has NAPI-specific conversion)
- Async variants needed for Tauri (current code is sync-only)
- API design differences (NAPI short-lived calls vs Tauri long-lived state)
- Build configuration (feature flags, optional dependencies)

### Architecture Comparison: NAPI vs Tauri

| Aspect             | NAPI (CLI)                          | Tauri (Desktop)                   |
| ------------------ | ----------------------------------- | --------------------------------- |
| **Attributes**     | `#[napi]`                           | `#[tauri::command]`               |
| **Call pattern**   | Short-lived function calls          | Long-lived app state              |
| **Async**          | Sync preferred (simpler)            | Async preferred (non-blocking UI) |
| **Error handling** | `Result<T, napi::Error>`            | `Result<T, String>` or custom     |
| **State**          | Stateless (config passed each call) | Stateful (app holds VaultSession) |
| **File watching**  | Not needed (one-shot commands)      | Critical (reactive UI updates)    |
| **Threading**      | rayon for parallelism               | tokio runtime already present     |
| **IPC**            | Native bindings (direct calls)      | Serialized IPC messages           |

**Key insight:** The desktop app will benefit from **long-lived sessions** and **file watching**, which the CLI doesn't need. This suggests the core library should support both patterns.

### Extraction Strategy Options

#### Option A: Extract Core Library Now ❌

Create `taskdn-core` workspace crate immediately, with:

- `taskdn-core/` - Pure Rust, no NAPI
- `tdn-cli/crates/bindings/` - NAPI wrapper around core
- `tdn-desktop/src-tauri/` - Tauri commands around core

**Pros:**

- Forces good API design upfront
- Both projects start from clean shared base
- Clear separation of concerns

**Cons:**

- **Premature abstraction** - Desktop needs are unknown
- Risk of designing wrong API without usage feedback
- Adds complexity before delivering value
- Workspace management overhead

**Verdict:** Too early. Wait until desktop app clarifies requirements.

---

#### Option B: Path Dependency Sharing ⚠️

Desktop imports CLI's core directly:

```toml
# tdn-desktop/src-tauri/Cargo.toml
[dependencies]
tdn-core = { path = "../../tdn-cli/crates/core" }
```

**Pros:**

- ✅ Immediate code sharing (zero refactoring needed)
- ✅ Proves feasibility quickly
- ✅ Learn what desktop actually needs

**Cons:**

- ⚠️ NAPI coupling creates unnecessary dependencies in desktop
- ⚠️ Conceptually backwards (desktop depends on CLI)
- ⚠️ Not sustainable long-term

**Verdict:** Good for **quick-start experimentation**, but plan to refactor.

---

#### Option C: Duplicate Initially, Extract Later ⚠️

Copy Rust code into desktop, let it diverge, extract when patterns clear.

**Pros:**

- ✅ Each project optimized for its context
- ✅ Learn real requirements before abstracting
- ✅ No premature coupling

**Cons:**

- ❌ **Bug fixes need double application**
- ❌ Wasted effort duplicating parsing logic
- ❌ Divergence makes later extraction harder
- ❌ Spec changes require updating both

**Verdict:** Too much waste. The core logic (parsing, indexing) is stable enough to share.

---

#### Option D: Gradual Extraction with Adapter Pattern ✅ **RECOMMENDED**

**Phase 1: Quick-start (path dependency + refactorings)**

1. Desktop uses path dependency to CLI's core (Option B)
2. Implement preparatory refactorings (see below) in CLI
3. Accept temporary NAPI coupling in desktop

**Phase 2: Extract when patterns clear (2-4 weeks after desktop work starts)**

1. Extract to true workspace crate `taskdn-core/`
2. Create thin adapter layers:
   - `tdn-cli/crates/bindings/` - NAPI adapters
   - `tdn-desktop/src-tauri/commands/` - Tauri command adapters
3. Core stays pure, consumers handle FFI

**Phase 3: Public SDK (long-term)**

1. Polish APIs based on real usage
2. Add comprehensive documentation
3. Publish to crates.io
4. Optional: WASM target for web

**Pros:**

- ✅ Delivers value immediately (desktop can start work)
- ✅ Avoids premature abstraction (learn first, extract second)
- ✅ Refactorings prepare for clean extraction
- ✅ Clear incremental path from sharing to publication

**Cons:**

- ⚠️ Requires discipline to do preparatory work
- ⚠️ Temporary awkwardness (desktop depends on CLI)

**Verdict:** Best balance of pragmatism and architecture. **This is the recommended approach.**

---

### Preparatory Refactorings (Low-Hanging Fruit)

These refactorings will make future extraction **significantly easier** while providing value to the CLI today:

#### 1. Feature-flag NAPI Dependencies ⭐ **HIGH PRIORITY**

**Current:**

```toml
[dependencies]
napi = { version = "3", features = ["napi9"] }
napi-derive = "3"
```

**Refactored:**

```toml
[dependencies]
napi = { version = "3", features = ["napi9"], optional = true }
napi-derive = { version = "3", optional = true }

[features]
default = ["napi-bindings"]
napi-bindings = ["dep:napi", "dep:napi-derive"]
```

**Benefit:** Core can compile without NAPI. Tauri can use it without pulling in unnecessary dependencies.

**Effort:** 1 hour
**Risk:** Low (feature flags are standard Rust)

---

#### 2. Separate Domain Errors from NAPI Errors ⭐ **HIGH PRIORITY**

**Current:** `TdnError` has NAPI-specific `From<TdnError> for napi::Error` implementation in `error.rs:100-113`.

**Refactored:**

```rust
// error.rs - Core error type (NAPI-agnostic)
#[derive(Debug, Clone, Serialize)]
pub struct TdnError {
    pub kind: TdnErrorKind,
    pub message: String,
    pub path: Option<String>,
    pub field: Option<String>,
}

// napi_error.rs - NAPI conversion (only compiled with napi-bindings feature)
#[cfg(feature = "napi-bindings")]
mod napi_error {
    use super::TdnError;
    use napi::bindgen_prelude::*;

    impl From<TdnError> for napi::Error {
        fn from(err: TdnError) -> Self {
            // ... current conversion logic
        }
    }

    // Keep #[napi(object)] wrapper separate
    #[napi(object)]
    pub struct NapiTdnError {
        pub kind: TdnErrorKind,
        pub message: String,
        pub path: Option<String>,
        pub field: Option<String>,
    }
}
```

**Benefit:**

- Core error type works in any context (Tauri, WASM, pure Rust)
- Tauri can implement `From<TdnError>` for its own error types
- Future consumers can add their own conversions

**Effort:** 2-3 hours
**Risk:** Low (clear separation of concerns)

---

#### 3. Extract Constants to Configuration ⭐ **MEDIUM PRIORITY**

**Current:** `vault.rs` has hardcoded constants:

```rust
const MAX_FILES_PER_SCAN: usize = 10_000;
const MAX_PARALLEL_THREADS: usize = 8;
```

**Refactored:**

```rust
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
    // New configurable limits
    pub max_files_per_scan: usize,
    pub max_parallel_threads: usize,
}

impl Default for VaultConfig {
    fn default() -> Self {
        Self {
            // ... existing defaults
            max_files_per_scan: 10_000,
            max_parallel_threads: 8,
        }
    }
}
```

**Benefit:**

- Desktop app can use different limits (e.g., no file limit, more threads)
- Easier testing (lower limits for test vaults)
- User-configurable performance tuning

**Effort:** 1-2 hours
**Risk:** Low (backward compatible via `Default`)

---

#### 4. Add Async Variants for Key Functions ⭐ **MEDIUM PRIORITY**

**Current:** All file I/O is synchronous.

**Refactored:**

```rust
// Keep sync versions (CLI uses these)
pub fn scan_tasks(config: &VaultConfig) -> Result<Vec<Task>, TdnError> {
    // ... existing sync implementation
}

// Add async versions (Tauri uses these)
#[cfg(feature = "async")]
pub async fn scan_tasks_async(config: &VaultConfig) -> Result<Vec<Task>, TdnError> {
    tokio::task::spawn_blocking({
        let config = config.clone();
        move || scan_tasks(&config)
    }).await.unwrap()
}
```

**Benefit:**

- Non-blocking for Tauri UI
- CLI continues using simpler sync code
- Both backed by same implementation

**Effort:** 3-4 hours (add async variants for main functions)
**Risk:** Low (spawn_blocking is standard pattern)

**Alternative:** Do this during extraction, not before. Desktop can wrap sync functions in `spawn_blocking` initially.

---

#### 5. Trait-Based File I/O (Optional, Low Priority)

**Current:** Uses `std::fs` directly.

**Refactored:**

```rust
pub trait FileSystem {
    fn read_to_string(&self, path: &Path) -> io::Result<String>;
    fn write(&self, path: &Path, contents: &str) -> io::Result<()>;
    // ...
}

struct StdFileSystem;
impl FileSystem for StdFileSystem { /* ... */ }

pub fn parse_task_file_with_fs<F: FileSystem>(
    fs: &F,
    path: &str
) -> Result<Task, TdnError> {
    let content = fs.read_to_string(Path::new(path))?;
    // ... rest of parsing
}
```

**Benefit:**

- Easier unit testing (mock filesystem)
- Could support virtual filesystems
- Better testability without temp files

**Effort:** 6-8 hours (significant refactor)
**Risk:** Medium (touches all file I/O)

**Verdict:** **Skip for now.** This is over-engineering. Current approach with `tempfile` crate for tests works fine. Only do this if virtual filesystem becomes a real requirement.

---

### Summary of Recommended Refactorings

| Refactoring            | Priority    | Effort | When                              |
| ---------------------- | ----------- | ------ | --------------------------------- |
| Feature-flag NAPI      | ⭐⭐⭐ High | 1h     | **Before desktop work starts**    |
| Separate domain errors | ⭐⭐⭐ High | 2-3h   | **Before desktop work starts**    |
| Configurable limits    | ⭐⭐ Medium | 1-2h   | **Before or during desktop work** |
| Async variants         | ⭐⭐ Medium | 3-4h   | **During extraction phase**       |
| Trait-based I/O        | ⭐ Low      | 6-8h   | **Skip unless needed**            |

**Total high-priority work: 3-4 hours** - This is genuinely low-hanging fruit that provides immediate value.

---

## Recommended Path Forward

### Immediate (Before Desktop Work Starts)

**Do these refactorings in the CLI now:**

1. **Feature-flag NAPI dependencies** (see Refactoring #1)

   - Modify `Cargo.toml` to make `napi`/`napi-derive` optional
   - Wrap NAPI-specific code in `#[cfg(feature = "napi-bindings")]`
   - Test that `cargo build --no-default-features` compiles core

2. **Separate domain errors** (see Refactoring #2)

   - Extract NAPI error conversion to separate module
   - Keep `TdnError` pure (no NAPI imports)
   - Test that error handling still works correctly

3. **Make limits configurable** (see Refactoring #3)
   - Add fields to `VaultConfig`
   - Update scan functions to use config values
   - Provide sensible defaults

**Outcome:** Core library is extraction-ready with minimal effort.

---

### Desktop App Quick-Start

**When desktop work begins:**

1. **Use path dependency temporarily:**

   ```toml
   # tdn-desktop/src-tauri/Cargo.toml
   [dependencies]
   tdn-core = { path = "../../tdn-cli/crates/core", default-features = false }
   ```

2. **Wrap sync functions in `spawn_blocking`:**

   ```rust
   #[tauri::command]
   async fn scan_tasks(config: VaultConfig) -> Result<Vec<Task>, String> {
       tokio::task::spawn_blocking(move || {
           tdn_core::scan_tasks(&config)
               .map_err(|e| e.message)
       }).await.unwrap()
   }
   ```

3. **Implement Tauri-specific error conversion:**

   ```rust
   impl From<TdnError> for String {
       fn from(err: TdnError) -> Self {
           err.message
       }
   }
   ```

4. **Learn what desktop needs:**
   - File watching patterns
   - Long-lived session management
   - UI state synchronization
   - Performance characteristics

**Timeline:** Desktop app can start work immediately with code sharing in place.

---

### Extraction Phase (2-4 Weeks After Desktop Work Starts)

**When patterns are clear, extract properly:**

1. **Create workspace structure:**

   ```
   taskdn/
   ├── Cargo.toml              # Workspace root
   ├── crates/
   │   ├── taskdn-core/        # Pure Rust core (extracted)
   │   ├── taskdn-cli-bindings/# NAPI adapters
   │   └── taskdn-tauri-commands/ # Tauri command helpers (optional)
   ├── tdn-cli/
   │   ├── Cargo.toml          # Depends on taskdn-core, taskdn-cli-bindings
   │   └── src/                # TypeScript CLI
   └── tdn-desktop/
       └── src-tauri/
           └── Cargo.toml      # Depends on taskdn-core
   ```

2. **Move core code:**

   - `tdn-cli/crates/core/src/*.rs` → `crates/taskdn-core/src/`
   - Remove all `#[napi]` attributes from core
   - Keep NAPI bindings in `taskdn-cli-bindings/`

3. **Create thin adapter layers:**

   - NAPI bindings: Simple `#[napi]` functions that call core
   - Tauri commands: Simple `#[tauri::command]` functions that call core

4. **Add async support (if needed):**
   - Implement async variants (see Refactoring #4)
   - Or continue using `spawn_blocking` pattern

**Timeline:** 1-2 days of focused work once patterns are clear.

---

### Long-Term (Public SDK)

**When ready to publish (6+ months out):**

1. **Polish the API:**

   - Comprehensive documentation (rustdoc)
   - Usage examples
   - Migration guides

2. **Add CI/CD:**

   - Automated testing across platforms
   - Benchmark suite
   - Semver enforcement

3. **Publish to crates.io:**

   - `taskdn-core` - Pure Rust library
   - `taskdn-napi` - NAPI bindings (optional package)
   - `taskdn-wasm` - WASM bindings (if web support needed)

4. **Documentation site:**
   - API reference
   - Integration guides (CLI, Tauri, WASM, etc.)
   - Spec compliance details

---

## Final Recommendations

### ✅ DO

1. **Implement high-priority refactorings now** (3-4 hours total):

   - Feature-flag NAPI dependencies
   - Separate domain errors from FFI errors
   - Make constants configurable

2. **Use path dependency for desktop quick-start**:

   - Proves feasibility immediately
   - Allows learning before committing to API
   - Unblocks desktop work

3. **Extract to proper workspace crate after 2-4 weeks**:

   - Wait until desktop patterns are clear
   - Create clean adapter layers
   - Core stays pure

4. **Plan for eventual public SDK**:
   - Design APIs with external users in mind
   - Document as you go
   - Consider semver from the start

### ❌ DON'T

1. **Don't extract immediately** - Desktop requirements are unknown
2. **Don't duplicate core logic** - Parsing/indexing is too valuable to duplicate
3. **Don't over-engineer with trait-based I/O** - Not needed yet
4. **Don't rush to publish** - Learn from internal usage first

### 📊 Effort Estimates

| Phase                     | Effort    | Timeline                           |
| ------------------------- | --------- | ---------------------------------- |
| Preparatory refactorings  | 3-4 hours | **Do now**                         |
| Desktop quick-start setup | 1 hour    | **When desktop work starts**       |
| Proper extraction         | 1-2 days  | **2-4 weeks after desktop starts** |
| Public SDK preparation    | 2-3 weeks | **6+ months out**                  |

---

## Conclusion

**The current Rust code is already extraction-ready** with minimal preparatory work. The NAPI coupling is shallow and concentrated at the FFI boundary. The recommended approach balances immediate value (code sharing via path dependency) with long-term quality (proper extraction once patterns clear).

**Next step:** Implement the three high-priority refactorings (3-4 hours work) to make the core extraction-ready. Then desktop work can begin with confidence that the foundation is solid.

The incremental path from current state → shared core → public SDK is clear and low-risk. Each phase delivers value and informs the next. This is **significantly better** than either premature extraction or code duplication.
