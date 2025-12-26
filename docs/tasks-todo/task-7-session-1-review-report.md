# Session 1 Review Report: Type & API Contract Review

**Date:** 2025-12-26
**Scope:** Rust type design + NAPI API surface (the contract between layers)
**Reviewer:** Claude Code

## Executive Summary

The Rust core library has a well-structured type system and clean API surface. The code demonstrates strong architectural patterns including separation of concerns, explicit type boundaries, and thoughtful error handling. However, there are several areas where improvements would enhance maintainability, future-proofing, and type safety.

**Key Findings:**
- ✅ Clean separation between internal types (parsing) and NAPI-exposed types (API surface)
- ✅ Consistent naming conventions with proper NAPI auto-conversion
- ✅ Comprehensive test coverage for all major code paths
- ⚠️ Enums lack `#[non_exhaustive]` - potential future breaking changes
- ⚠️ String-based error handling is fragile (deferred from Task 4)
- ⚠️ Some inconsistencies in API parameter patterns

## Detailed Analysis

### 1. Type System Review

#### 1.1 Enums

**Current Enums:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "kebab-case")]
#[napi(string_enum)]
pub enum TaskStatus {
    Inbox, Icebox, Ready, InProgress, Blocked, Dropped, Done,
}

pub enum ProjectStatus {
    Planning, Ready, Blocked, InProgress, Paused, Done,
}

pub enum AreaStatus {
    Active, Archived,
}
```

**Analysis:**

✅ **Strengths:**
- Uses `#[napi(string_enum)]` for clean JSON serialization
- `#[serde(rename_all = "kebab-case")]` matches spec requirements
- TypeScript gets clean string literal unions (e.g., `'Inbox' | 'Icebox' | ...`)
- All derive traits are appropriate

⚠️ **Issues:**

1. **Missing `#[non_exhaustive]`**: None of the enums are marked with this attribute
   - **Impact**: Adding new status values in future is a breaking change for TypeScript consumers who exhaustively pattern match
   - **Consideration**: These are spec-defined, so changes would be major version bumps anyway
   - **Recommendation**: Add `#[non_exhaustive]` to future-proof against spec evolution. Even if the spec is stable, it's a defensive practice.

2. **No custom derive macros**: Currently using standard derives, which is fine, but could benefit from strum for iteration if needed in future.

**TypeScript Output (from bindings/index.d.ts):**
```typescript
export declare const enum TaskStatus {
  Inbox = 'Inbox',
  Icebox = 'Icebox',
  Ready = 'Ready',
  InProgress = 'InProgress',
  Blocked = 'Blocked',
  Dropped = 'Dropped',
  Done = 'Done'
}
```

This is clean and appropriate.

#### 1.2 Structs - Internal (Parsing Layer)

**Purpose:** Intermediate types for deserializing YAML frontmatter

```rust
struct TaskFrontmatter {
    title: String,
    status: TaskStatus,
    #[serde(default)]
    created_at: Option<String>,
    // ... other optional fields
    #[serde(default)]
    projects: Option<Vec<String>>,
}
```

**Analysis:**

✅ **Strengths:**
- Clear separation from API types
- Uses `#[serde(default)]` appropriately for optional fields
- Field names match YAML frontmatter exactly (with kebab-case via serde)

✅ **Design Pattern:**
- Intentionally NOT exposed via NAPI
- Allows internal parsing flexibility without constraining API
- This is the "Read vs Write Separation" pattern from cli-tech.md

**No issues identified** - this layer is well-designed.

#### 1.3 Structs - NAPI-Exposed (API Surface)

**Main Entity Types:**

```rust
#[derive(Debug, Clone)]
#[napi(object)]
pub struct Task {
    pub path: String,
    pub title: String,
    pub status: TaskStatus,
    pub created_at: Option<String>,
    // ... dates, area, project
    pub body: String,
}
```

**Analysis:**

✅ **Strengths:**
- All fields are public (required for NAPI objects)
- Uses `Option<T>` appropriately for optional fields
- NAPI converts snake_case to camelCase in TypeScript automatically
- No unnecessary complexity

⚠️ **Observations:**

1. **Date representations**: All dates are `Option<String>` with ISO 8601 format
   - **Current approach**: Simple, TypeScript-friendly
   - **Alternative**: Could use a custom Date type with validation
   - **Decision**: Current approach is pragmatic for MVP, deferring structured date types

2. **WikiLink field types**: `area: Option<String>`, `project: Option<String>`
   - Stored as raw strings like `"[[Work]]"`
   - No compile-time validation that these are WikiLinks
   - **Decision**: Appropriate - validation happens at parse time, runtime flexibility preserved

3. **Task.projects vs Task.project**:
   - Internal frontmatter has `projects: Option<Vec<String>>`
   - External API has `project: Option<String>` (first element)
   - This intentional simplification is documented in code comments
   - **Good practice**: API surface is simpler than internal representation

**Result Types:**

```rust
#[napi(object)]
pub struct TaskContextResult {
    pub task: Option<Task>,
    pub project: Option<Project>,
    pub area: Option<Area>,
    pub warnings: Vec<String>,
    pub ambiguous_matches: Vec<Task>,
}
```

**Analysis:**

✅ **Excellent design:**
- Warnings separate from errors (broken references don't fail, they warn)
- `ambiguous_matches` handles the case where title lookup is non-unique
- All fields optional except warnings/ambiguous (which can be empty)
- Clear intent: "Here's the data we found, plus any issues"

**Create/Update Types:**

```rust
#[napi(object)]
pub struct TaskCreateFields {
    pub status: Option<String>,
    pub project: Option<String>,
    pub area: Option<String>,
    pub due: Option<String>,
    pub scheduled: Option<String>,
    pub defer_until: Option<String>,
}

#[napi(object)]
pub struct FieldUpdate {
    pub field: String,
    pub value: Option<String>,
}
```

**Analysis:**

✅ **Strengths:**
- All fields optional (only title is required, passed separately)
- `FieldUpdate` is elegant: `value: None` means "remove field"
- No `Option<Option<T>>` anti-pattern needed

⚠️ **Minor observation:**
- Status is `Option<String>` not `Option<TaskStatus>` for create operations
- This allows passing invalid status values at the API boundary
- Validation happens inside the create function
- **Decision**: This is acceptable - creates flexibility for TypeScript layer

#### 1.4 Configuration Types

```rust
#[napi(object)]
pub struct VaultConfig {
    pub tasks_dir: String,
    pub projects_dir: String,
    pub areas_dir: String,
}
```

**Analysis:**

✅ **Simple and effective**
- Clear intent
- All required fields (not optional)
- Could be extended with `archive_dir` in future

**No issues identified.**

### 2. API Surface Review

#### 2.1 Complete NAPI Function Inventory

| Category | Function | Parameters | Return Type | Notes |
|----------|----------|------------|-------------|-------|
| **Parsing** |
| | `parse_task_file` | `file_path: String` | `Result<Task>` | Single file parse |
| | `parse_project_file` | `file_path: String` | `Result<Project>` | Single file parse |
| | `parse_area_file` | `file_path: String` | `Result<Area>` | Single file parse |
| **Scanning** |
| | `scan_tasks` | `config: VaultConfig` | `Vec<Task>` | Silently skips parse errors |
| | `scan_projects` | `config: VaultConfig` | `Vec<Project>` | Silently skips parse errors |
| | `scan_areas` | `config: VaultConfig` | `Vec<Area>` | Silently skips parse errors |
| **Finding** |
| | `find_tasks_by_title` | `config: VaultConfig, query: String` | `Vec<Task>` | Case-insensitive substring |
| | `find_projects_by_title` | `config: VaultConfig, query: String` | `Vec<Project>` | Case-insensitive substring |
| | `find_areas_by_title` | `config: VaultConfig, query: String` | `Vec<Area>` | Case-insensitive substring |
| **Context Queries** |
| | `get_task_context` | `config: VaultConfig, identifier: String` | `TaskContextResult` | Path or title lookup |
| | `get_project_context` | `config: VaultConfig, project_name: String` | `ProjectContextResult` | Includes area + tasks |
| | `get_area_context` | `config: VaultConfig, area_name: String` | `AreaContextResult` | Includes projects + tasks |
| | `get_tasks_in_area` | `config: VaultConfig, area_name: String` | `TasksInAreaResult` | Direct + via projects |
| | `get_projects_in_area` | `config: VaultConfig, area_name: String` | `Vec<Project>` | Optimized: no task reads |
| **File Operations** |
| | `create_task_file` | `tasks_dir: String, title: String, fields: TaskCreateFields` | `Result<Task>` | Returns created entity |
| | `create_project_file` | `projects_dir: String, title: String, fields: ProjectCreateFields` | `Result<Project>` | Returns created entity |
| | `create_area_file` | `areas_dir: String, title: String, fields: AreaCreateFields` | `Result<Area>` | Returns created entity |
| | `update_file_fields` | `path: String, updates: Vec<FieldUpdate>` | `Result<()>` | Round-trip fidelity |

**Total: 18 NAPI functions**

#### 2.2 API Design Patterns

✅ **Consistent patterns within categories:**
- Parse functions: all take `file_path: String`, return `Result<T>`
- Scan functions: all take `config: VaultConfig`, return `Vec<T>`
- Find functions: all take `config: VaultConfig, query: String`, return `Vec<T>`
- Context queries: all take `config: VaultConfig, name: String`, return specialized Result
- Create functions: all take `dir: String, title: String, fields: XCreateFields`, return `Result<T>`

⚠️ **Inconsistencies identified:**

1. **Parameter naming variations:**
   - Most functions use `config: VaultConfig`
   - Create functions use individual directory strings (`tasks_dir`, `projects_dir`, `areas_dir`)
   - **Rationale**: Create operations only need one directory, not full config
   - **Impact**: TypeScript layer needs to extract directory from config before calling create
   - **Assessment**: This is intentional and reasonable, not a bug

2. **get_task_context parameter naming:**
   - Takes `identifier: String` (can be path OR title)
   - Other context functions take `{entity}_name: String`
   - **Rationale**: Task lookup is special - supports both path and title
   - **Assessment**: Acceptable, but parameter name could be more explicit (`path_or_title`)

3. **Return type variations:**
   - `get_area_context` returns `AreaContextResult` (with Option<Area> + projects + tasks + warnings)
   - `get_projects_in_area` returns `Vec<Project>` (no warnings)
   - **Rationale**: Different use cases
   - **Potential issue**: Inconsistent - `get_projects_in_area` could benefit from warnings too
   - **Impact**: If a project references unknown area, no warning is surfaced

#### 2.3 Error Handling Analysis

**Current Pattern:**

All error cases use:
```rust
return Err(Error::new(
    Status::GenericFailure,
    format!("File not found: {}", file_path),
));
```

**Issues:**

1. **All errors are `Status::GenericFailure`**
   - No semantic distinction between error types
   - TypeScript receives generic Error with string message
   - Code must pattern-match on message strings (fragile)

2. **Example error messages:**
   ```rust
   "File not found: {}"
   "Failed to read file: {}"
   "Failed to parse frontmatter: {}"
   "No frontmatter found"
   "Invalid path: {}"
   "Failed to create directory: {}"
   ```

3. **TypeScript pattern matching (fragile):**
   ```typescript
   try {
     const task = parseTaskFile(path);
   } catch (error) {
     if (error.message.includes("File not found")) {
       // Handle missing file
     } else if (error.message.includes("Failed to parse")) {
       // Handle parse error
     }
   }
   ```

**Recommended Structured Error Types:**

```rust
#[napi]
pub enum TdnErrorKind {
    FileNotFound,
    FileReadError,
    ParseError,
    ValidationError,
    WriteError,
}

#[napi(object)]
pub struct TdnError {
    pub kind: TdnErrorKind,
    pub message: String,
    pub path: Option<String>,
    pub field: Option<String>,
}
```

**Benefits:**
- TypeScript can switch on `error.kind` (type-safe)
- Additional context (path, field) available when relevant
- Message format changes don't break code
- Better error reporting in CLI

**Implementation effort:** Medium (2-3 hours)
- Define error types
- Update all error sites
- Update TypeScript layer to use structured errors
- Add tests

**Priority:** Medium (defer to post-Task 8 if time is tight)

#### 2.4 API Completeness

✅ **Well covered:**
- CRUD operations (Create, Read, Update)
- Relationship traversal
- Fuzzy search
- Context queries

⚠️ **Potential gaps:**

1. **No Delete operations**
   - Files can be updated, but not deleted via API
   - **Assessment**: Probably intentional - deletions are sensitive, best left to manual operations or future enhancement
   - **Priority**: Low (not needed for MVP)

2. **No batch operations**
   - Can't create/update multiple entities in one call
   - Each operation is individual
   - **Impact**: For large batch updates, many FFI calls
   - **Assessment**: Premature optimization - wait for performance data
   - **Priority**: Low (defer)

3. **No validation-only operations**
   - Can't validate a file without parsing it fully
   - **Use case**: CLI doctor command might want fast validation
   - **Workaround**: Parse and discard result
   - **Priority**: Low (defer)

4. **No file watching/change detection**
   - Vault must be rescanned to detect changes
   - **Assessment**: Out of scope for Phase 1 CLI
   - **Priority**: N/A (future enhancement)

### 3. NAPI Type Generation Quality

Examining `bindings/index.d.ts`:

✅ **Excellent quality:**
- All types properly generated
- Enums are `const enum` (efficient)
- Optional fields use `?:` correctly
- camelCase conversion works perfectly
- JSDoc comments preserved from Rust doc comments

**Examples:**

```typescript
// From Rust: pub created_at: Option<String>
// TypeScript gets:
createdAt?: string

// From Rust: pub status: TaskStatus
// TypeScript gets:
status: TaskStatus  // with TaskStatus as const enum

// From Rust: /// Task struct exposed to TypeScript via NAPI
// TypeScript gets:
/** Task struct exposed to TypeScript via NAPI */
export interface Task { ... }
```

**No issues identified** - NAPI type generation is working excellently.

### 4. Internal vs External Boundary

**Clear separation:**

| Layer | Purpose | Examples |
|-------|---------|----------|
| **Internal (not exposed)** | Parsing, indexing, implementation details | `TaskFrontmatter`, `VaultIndex`, `extract_wikilink_name` |
| **External (NAPI)** | Public API consumed by TypeScript | `Task`, `parse_task_file`, `VaultConfig` |

✅ **Benefits:**
- Can refactor internals without breaking TypeScript
- API surface is minimal and focused
- Internal complexity hidden from consumers

**Example:**
- `VaultIndex` is a complex HashMap-based indexing structure
- TypeScript never sees it - only sees query functions
- This is excellent encapsulation

### 5. Type Redundancy Analysis

**Evaluated pairs:**

1. **TaskFrontmatter vs Task**
   - **Not redundant**: Different purposes (parsing vs API)
   - Frontmatter has `projects: Option<Vec<String>>`
   - Task has `project: Option<String>` (simplified)

2. **TaskCreateFields vs Task**
   - **Not redundant**: Create fields are input, Task is output
   - Create fields all optional (except title passed separately)
   - Task has computed fields (path, created_at, updated_at, body)

3. **Three CreateFields structs (Task, Project, Area)**
   - Could theoretically be unified with generics
   - **Assessment**: Current approach is clearer and more maintainable
   - Each entity has different optional fields
   - **Recommendation**: Keep separate

**No problematic redundancy identified.**

### 6. Missing Types

Potential types that could be beneficial:

1. **DateValue type** (low priority)
   ```rust
   #[napi(object)]
   pub struct DateValue {
       pub iso_string: String,
       pub is_datetime: bool,  // vs date-only
   }
   ```
   - **Benefit**: Explicit date vs datetime distinction
   - **Cost**: More complex API
   - **Decision**: Defer - current string approach is fine

2. **WikiLink type** (low priority)
   ```rust
   #[napi(object)]
   pub struct WikiLink {
       pub name: String,
       pub display: Option<String>,
       pub heading: Option<String>,
   }
   ```
   - **Benefit**: Parsed WikiLink structure
   - **Cost**: More complex, may not be needed
   - **Decision**: Defer - current string approach is fine

3. **Structured Error types** (medium priority) - See section 2.3

## Summary of Issues and Recommendations

### Critical Issues
**None identified.**

### Important Issues

1. **Missing `#[non_exhaustive]` on enums**
   - **Impact**: Future enum additions are breaking changes
   - **Effort**: 5 minutes (add attribute to 3 enums)
   - **Recommendation**: Add `#[non_exhaustive]` to TaskStatus, ProjectStatus, AreaStatus

2. **String-based error handling (deferred from Task 4)**
   - **Impact**: Fragile TypeScript error handling via string matching
   - **Effort**: Medium (2-3 hours)
   - **Recommendation**: Implement structured error types OR explicitly defer to post-Task 8

### Minor Issues

3. **get_projects_in_area lacks warnings**
   - **Impact**: Broken area references not surfaced
   - **Effort**: Small (30 min - change return type to include warnings)
   - **Recommendation**: Consider returning `ProjectsInAreaResult { projects, warnings }`

4. **Parameter naming: identifier vs path_or_title**
   - **Impact**: Slight clarity issue
   - **Effort**: Trivial (rename parameter)
   - **Recommendation**: Rename `identifier` to `path_or_title` for clarity

### Non-Issues (Working as Designed)

- Date fields as strings (appropriate for MVP)
- WikiLink fields as strings (appropriate for MVP)
- Separate CreateFields structs (clarity over DRY)
- No delete operations (intentional)
- No batch operations (YAGNI)

## Recommendations for Action

### Immediate (Before continuing Task 7):

1. ✅ **Add `#[non_exhaustive]` to all enums** (5 min)
   - Future-proofs against spec changes
   - No breaking change for current consumers
   - Standard defensive practice

### Short-term (During Task 7):

2. 🤔 **Decide on structured error types** (decision needed)
   - Option A: Implement now (2-3 hours investment)
   - Option B: Defer to post-Task 8 and document the deferral
   - Option C: Accept string-based errors as permanent design

3. 🔍 **Consider adding warnings to get_projects_in_area** (30 min)
   - Minor API consistency improvement
   - Aligns with other query functions

### Optional (Low priority):

4. 📝 **Rename identifier parameter** (trivial)
   - Improves API clarity
   - Non-breaking (parameter names don't affect TypeScript)

## Conclusion

The Rust type system and NAPI API surface are **well-designed and production-ready**. The architecture demonstrates strong engineering practices:

- Clear separation of concerns
- Appropriate abstraction levels
- Type-safe where it matters
- Pragmatic where over-engineering would hurt

The main improvement opportunity is structured error types, which was already identified as "low priority" in Task 4. This review confirms that assessment - the current string-based approach works but is not ideal for long-term maintainability.

**Overall Grade: A-** (would be A+ with structured errors)

**Ready to proceed:** Yes, with minor enum improvements recommended.
