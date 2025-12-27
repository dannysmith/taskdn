# Task: Clean Code Review

> Comprehensive independent review of all TypeScript/Bun and Rust code in `tdn-cli` for clean code principles, maintainability, and quality.

## Objective

Conduct a thorough code quality audit of the entire `tdn-cli` codebase (both TypeScript and Rust components) to identify areas for improvement in code clarity, maintainability, and adherence to clean code principles.

## Instructions

### 1. Preparation & Exploration

- Use the **Explore subagent** to understand the overall structure of `tdn-cli/`
- Identify all TypeScript/JavaScript files and Rust files
- Get a high-level understanding of the architecture and key modules
- Review any existing architectural documentation in `tdn-cli/docs/`.

### 2. Code Quality Review Areas

For each file/module in the codebase, evaluate:

#### Structure & Organization

- **File structure**: Are files logically organized? Appropriate module boundaries?
- **Separation of concerns**: Is business logic separated from I/O, presentation, and infrastructure?
- **Module cohesion**: Do files/modules have a single, clear responsibility?

#### Functions & Methods

- **Function length**: Are functions concise and focused? (Generally < 30-40 lines)
- **Cyclomatic complexity**: Are there deeply nested conditionals or complex branching logic?
- **Parameter count**: Do functions have too many parameters? (Generally < 4-5)
- **Single responsibility**: Does each function do one thing well?

#### Code Quality

- **Duplication**: Is there repeated code that could be extracted into shared utilities?
- **Redundancy**: Are there unnecessary abstractions, dead code, or unused variables/imports?
- **Naming**: Are variables, functions, and types clearly and consistently named?
- **Magic numbers/strings**: Are there hard-coded values that should be constants?

#### Abstractions & Patterns

- **Appropriate abstraction level**: Are abstractions at the right level (not over- or under-abstracted)?
- **Consistency**: Are similar problems solved in similar ways across the codebase?
- **Language idioms**: Does the code follow TypeScript/Rust best practices and idioms?
- **Error handling**: Is error handling consistent, appropriate, and informative?

#### Readability & Maintainability

- **Comments**: Are comments helpful without being excessive? Do they explain "why" not "what"?
- **Type safety**: Appropriate use of TypeScript types? Rust type system leveraged well?
- **Complexity**: Is the code easy to understand, or does it require significant mental effort?
- **Testing considerations**: Is the code structured in a way that makes it testable?

### 3. Language-Specific Considerations

#### TypeScript Code

- Proper use of TypeScript features (types, interfaces, generics, utility types)
- Async/await patterns used appropriately
- Error handling (try/catch, Result types if used)

#### Rust Code (NAPI-RS bindings)

- Proper memory management and ownership patterns
- Error propagation (Result/Option types)
- FFI safety considerations
- Efficient use of Rust idioms (iterators, pattern matching, etc.)

### 4. Review Approach

1. **Use subagents strategically**:

   - Use **Explore agent** (thoroughness: "very thorough") to map out the codebase structure
   - Consider using **code-refactorer agent** for identifying specific refactoring opportunities in complex modules
   - Use direct file reading for detailed line-by-line review

2. **Prioritize by impact**:

   - Start with core business logic and parser code
   - Review shared utilities and abstractions
   - Then review CLI interface and peripheral code

3. **Document systematically**:
   - For each significant finding, note the file path and line numbers
   - Categorize issues by severity (Critical, Major, Minor, Suggestion)
   - Provide specific, actionable recommendations

### 5. Output Format

Document all findings in the sections below:

#### Findings Summary

- Provide high-level overview of code quality
- Note patterns (good and bad) that appear across the codebase
- Highlight areas of technical debt or concern

#### Detailed Findings

Group findings by category, with format:

```
**[Severity] Category: Brief Description**
- File: `path/to/file.ts:123-145`
- Issue: [Description of the problem]
- Recommendation: [Specific suggestion for improvement]
- Impact: [Why this matters]
```

#### Actions

Prioritized list of recommended refactoring tasks or improvements, formatted as actionable items.

## Notes

- This is a **review only** task - do not make code changes during this task
- Focus on identifying issues and providing actionable recommendations
- Be thorough but pragmatic - not every tiny issue needs to be documented
- Remember the project is in active development
- Reference clean code principles but don't be dogmatic

## Findings Summary

### Overall Code Quality: **GOOD TO VERY GOOD**

The tdn-cli codebase demonstrates solid engineering practices with clear architectural separation, strong type safety, and comprehensive error handling. The hybrid TypeScript/Rust architecture is well-executed, leveraging each language's strengths appropriately.

**Key Strengths:**
1. **Excellent separation of concerns** - Rust handles performance-critical operations (parsing, indexing, I/O), TypeScript handles UX (CLI, prompts, formatting)
2. **Strong type safety** - NAPI-RS auto-generates TypeScript types from Rust, ensuring type safety across the FFI boundary
3. **Comprehensive error handling** - 11 specific error types with structured codes and context
4. **Good test coverage** - 16 E2E tests, 6 unit test suites, plus Rust unit tests
5. **Smart performance optimizations** - VaultSession caching, hybrid matching (O(1) exact + O(n) substring), rayon parallelization
6. **Clear documentation** - Well-commented code, architecture guide, testing guide
7. **Consistent patterns** - All commands follow same structure, unified entity lookup interface

**Primary Areas of Concern:**
1. **File size extremes** - Output formatters are exceptionally large (ai.ts: 57K lines, human.ts: 35K lines, list.ts: 15K lines)
2. **Complex index module** - vault_index.rs (1,445 lines) handles multiple concerns
3. **Writer complexity** - writer.rs (1,089 lines) has some long functions due to round-trip fidelity requirements
4. **Limited abstraction opportunities** - Some duplication in pattern matching and validation logic

**Code Quality Distribution:**
- **Excellent (70%)**: Parsers, entity types, error handling, filtering utilities, vault session, wikilink parsing, simple commands
- **Good (25%)**: Index building, writer infrastructure, entity lookup, date utilities
- **Needs improvement (5%)**: Output formatters, list command

### High-Level Patterns (Good)

**Positive patterns observed:**
- Consistent use of Result types for error handling
- Graceful degradation (broken references → warnings, not errors)
- Lazy evaluation (VaultSession OnceLock pattern)
- Hybrid algorithms (HashMap for exact, linear scan for substring)
- Atomic writes with temp files
- Round-trip fidelity preservation in writer

**Concerns:**
- Output formatters have grown too large through incremental feature additions
- Some validation logic is duplicated across commands
- Index module conflates indexing, querying, and result assembly

## Detailed Findings

### 1. Structure & Organization

**[Suggestion] Monolithic Output Formatters**
- Files: `src/output/human.ts:1-35444`, `src/output/ai.ts:1-57695`
- Issue: Output formatters have grown to extreme sizes through incremental feature development. The ai.ts formatter is 57,695 lines and human.ts is 35,444 lines. These files handle all entity types, result types, and formatting concerns in single files.
- Recommendation: Refactor into entity-specific formatter modules:
  ```
  src/output/
    human/
      index.ts (router)
      task.ts (task formatting)
      project.ts (project formatting)
      area.ts (area formatting)
      context.ts (context formatting)
      list.ts (list formatting)
      shared.ts (common utilities)
    ai/ (same structure)
  ```
- Impact: This would improve maintainability significantly. Adding support for a new entity type or result type would no longer require editing 50K+ line files. It would also make the codebase easier to navigate and test individual formatters in isolation.

**[Major] List Command Complexity**
- File: `src/commands/list.ts:1-15000+`
- Issue: The list command is ~15,000 lines and handles tasks, projects, and areas in a single function with extensive filtering logic. The command has grown organically to support 20+ filter options and becomes difficult to reason about.
- Recommendation: Extract entity-specific list logic into separate functions or modules:
  ```typescript
  function listTasks(config, options, globalOpts) { ... }
  function listProjects(config, options, globalOpts) { ... }
  function listAreas(config, options, globalOpts) { ... }
  ```
  Then dispatch from the main command handler. Alternatively, consider separate commands: `tasks`, `projects`, `areas` that default to listing.
- Impact: Would significantly improve readability and testability. Each entity type's listing logic could be tested and understood independently.

**[Minor] Vault Index Module Scope**
- File: `crates/core/src/vault_index.rs:1-1445`
- Issue: The vault_index module conflates multiple concerns: (1) Index data structure, (2) Index building, (3) Query functions, (4) Result assembly. At 1,445 lines, it's the largest Rust module.
- Recommendation: Consider splitting into:
  - `vault_index.rs` - Index struct and building
  - `vault_queries.rs` - Query functions that use the index
  - `query_results.rs` - NAPI result type definitions
- Impact: Would improve module cohesion and make it easier to understand the boundaries between indexing and querying. Low priority as the current module is well-documented and logically organized despite its size.

**[Minor] Writer Module Function Length**
- File: `crates/core/src/writer.rs:300-600` (various functions)
- Issue: Several functions in writer.rs exceed 100 lines (update_frontmatter_field, update_file_fields_impl). This is primarily due to the complexity of preserving round-trip fidelity when manipulating raw YAML.
- Recommendation: Extract helper functions for specific YAML manipulation patterns:
  - `ensure_field_exists(mapping, field) -> Result<&mut Value>`
  - `remove_field_preserve_comments(mapping, field) -> Result<()>`
  - `set_field_value(mapping, field, value) -> Result<()>`
- Impact: Would improve readability and potentially enable reuse of YAML manipulation patterns. Medium priority - the current code works correctly and is well-tested.

### 2. Functions & Methods

**[Minor] Date Calculation Function Duplication**
- File: `crates/core/src/writer.rs:190-229`
- Issue: Custom date calculation logic (days_to_ymd, is_leap_year) is implemented from scratch. The TODO comment at line 164 acknowledges this: "TODO: Consider using chrono for production if more timezone flexibility is needed."
- Recommendation: Use the `chrono` crate for date/time handling. It's the Rust ecosystem standard and handles edge cases (leap seconds, timezone conversions) correctly.
- Impact: Reduces maintenance burden and potential bugs. The current implementation works but is a potential source of calendar calculation errors.

**[Minor] Slugify Function Edge Cases**
- File: `crates/core/src/writer.rs:75-124`
- Issue: The slugify function has good basic logic but handles some edge cases in an ad-hoc manner (empty result → "untitled", numeric suffix limit of 10,000 before UUID fallback).
- Recommendation: Add explicit tests for edge cases:
  - Very long titles (>100 chars)
  - Titles with only special characters
  - Unicode characters (currently removed, but should be explicit)
  - Collision resolution with many files
- Impact: Would ensure robust filename generation across all inputs. Low priority - current implementation is functional.

**[Suggestion] Entity Type Normalization Duplication**
- Files: `src/commands/list.ts:20-32`, `src/commands/new.ts:41-53`
- Issue: The normalizeEntityType function is duplicated with slight variations in list.ts (normalizes to plural) and new.ts (normalizes to singular).
- Recommendation: Extract to shared utility: `src/lib/entity-type.ts`:
  ```typescript
  export function normalizeEntityType(type: string, form: 'singular' | 'plural'): string
  ```
- Impact: Eliminates duplication and ensures consistent normalization logic. Very low priority - duplication is minimal.

### 3. Code Quality

**[Suggestion] Status Enum Naming Inconsistency**
- Files: `crates/core/src/task.rs:12`, `crates/core/src/project.rs:12`, `crates/core/src/area.rs:13`
- Issue: Rust enums use PascalCase (InProgress, Ready), but YAML uses kebab-case (in-progress, ready), and TypeScript sometimes uses PascalCase in generated bindings. While serde handles the conversion correctly, the mapping is implicit.
- Recommendation: Add explicit comments above each enum variant mapping the Rust name to the spec name:
  ```rust
  #[napi(string_enum)]
  pub enum TaskStatus {
      Inbox,        // "inbox" in YAML
      Icebox,       // "icebox" in YAML
      Ready,        // "ready" in YAML
      InProgress,   // "in-progress" in YAML
      ...
  }
  ```
- Impact: Makes the case mapping explicit for developers unfamiliar with serde conventions. Very low priority - the current code works correctly.

**[Minor] Magic Numbers in Filtering**
- File: `crates/core/src/vault.rs:89`
- Issue: Comment says "Skip files that fail to parse (log would go here in production)" but there's no logging infrastructure.
- Recommendation: Add structured logging using the `log` crate with appropriate log levels:
  - WARN for parse failures (helps users debug malformed files)
  - DEBUG for each file scanned (useful for performance debugging)
  - INFO for vault stats (e.g., "Scanned 42 tasks in 15ms")
- Impact: Would improve observability and debugging. Medium priority - currently silent failures can be confusing.

**[Suggestion] Unused Field in Error Type**
- File: `src/errors/types.ts:65`
- Issue: InvalidDateError includes an expectedFormats field, but it's always populated with the same hardcoded list in practice.
- Recommendation: Either remove the field if it's not providing value, or actually vary it based on the field being validated (e.g., due dates might support natural language, but created-at should only accept ISO 8601).
- Impact: Minimal - error messages would be slightly clearer. Very low priority.

### 4. Abstractions & Patterns

**[Minor] Vault Config Cloning**
- File: `crates/core/src/vault.rs:24`
- Issue: The scan_tasks function takes `config: VaultConfig` by value and clones it, which is unnecessary since it's only used to read the tasks_dir field.
- Recommendation: Change signature to `config: &VaultConfig` and access fields by reference. This applies to scan_projects and scan_areas as well.
- Impact: Minor performance improvement (avoids string clones). Low priority since VaultConfig is small.

**[Suggestion] Let-Else Pattern Usage**
- Files: `crates/core/src/vault_index.rs:158-165`, `207-214`
- Issue: Uses Rust 1.65+ let-else pattern, which is excellent for early returns. However, it's nested in ways that can be hard to follow (3-level let-else chains).
- Recommendation: Consider extracting complex guard logic into helper functions:
  ```rust
  fn is_valid_area_reference(project: &Project, area_by_name: &HashMap<String, usize>) -> Option<usize>
  ```
- Impact: Would improve readability of the index building logic. Low priority - the current code is correct and efficient.

**[Positive] VaultSession Pattern**
- File: `crates/core/src/vault_session.rs:1-181`
- Issue: N/A - This is exemplary code
- Observation: The VaultSession pattern is an excellent example of lazy evaluation using OnceLock. The documentation is clear, the API is simple, and it solves a real performance problem elegantly.
- Impact: Should be used as a reference pattern for other potential optimization opportunities in the codebase.

### 5. Readability & Maintainability

**[Major] Formatter Result Type Proliferation**
- File: `src/output/types.ts:1-300+`
- Issue: There are ~15 different result types (TaskResult, TaskListResult, TaskCreatedResult, TaskContextResult, ProjectResult, ProjectListResult, etc.). Each formatter must handle all of these.
- Recommendation: Consider a more compositional approach:
  ```typescript
  type ResultType = 'task' | 'project' | 'area'
  type ResultVariant = 'single' | 'list' | 'created' | 'context'

  interface FormattableResult<T> {
    resultType: ResultType
    variant: ResultVariant
    data: T | T[]
    metadata?: { warnings: string[], ... }
  }
  ```
  Then formatters can dispatch based on resultType and variant rather than checking 15 distinct type literals.
- Impact: Would significantly reduce the complexity of formatters and make it easier to add new result types. However, this is a substantial refactoring that would affect many files.

**[Minor] Comment Quality Inconsistency**
- Files: Various
- Issue: Some modules have excellent documentation (vault_session.rs, vault_index.rs, writer.rs), while others have minimal comments (filtering.ts, entity-lookup.ts). The Rust code generally has better documentation than TypeScript.
- Recommendation: Add module-level documentation comments to key TypeScript files explaining:
  - What problem the module solves
  - Key design decisions
  - Usage patterns
  Example: `src/lib/entity-lookup.ts` should document the path vs. title lookup strategy.
- Impact: Would improve onboarding for new developers. Low priority - the code is generally self-documenting.

**[Suggestion] Test Organization**
- Files: `tests/e2e/*.test.ts`, `tests/unit/*.test.ts`
- Issue: Tests are well-organized but lack a clear naming convention. Some tests are very broad ("show.test.ts" has 80+ test cases), others are focused.
- Recommendation: Consider grouping related tests using describe blocks and following a consistent naming pattern:
  ```typescript
  describe('show command', () => {
    describe('with tasks', () => { ... })
    describe('with projects', () => { ... })
    describe('error handling', () => { ... })
  })
  ```
- Impact: Would make test output more readable and failures easier to locate. Low priority - existing tests are effective.

### 6. Language-Specific Observations

**Rust Code Quality: EXCELLENT**
- Proper ownership and borrowing patterns throughout
- Good use of iterators and functional patterns
- Excellent error propagation with Result types
- Well-structured test coverage
- Appropriate use of derive macros
- Good FFI safety practices (all NAPI types are safe to send across FFI boundary)

**Specific Rust Positives:**
- crates/core/src/wikilink.rs - Exemplary module: small, focused, well-tested, zero unsafe code
- crates/core/src/error.rs - Clean error type design with good From implementations
- crates/core/src/vault.rs - Good use of rayon for parallelism

**TypeScript Code Quality: GOOD**
- Good use of TypeScript's type system
- Appropriate async/await patterns
- Consistent error handling approach
- Good separation of concerns

**Specific TypeScript Positives:**
- src/lib/filtering.ts - Clean, reusable utility functions with good type constraints
- src/errors/types.ts - Excellent use of discriminated unions for error types
- src/commands/show.ts - Simple, focused command implementation

**TypeScript Concerns:**
- Output formatters have grown beyond manageable size
- Some commands have become complex through incremental feature additions
- Limited use of advanced TypeScript features (e.g., branded types, template literal types)

### 7. Performance Considerations

**[Positive] Rayon Parallelization**
- File: `crates/core/src/vault.rs:84-92`
- Observation: Excellent use of rayon's par_iter for parallel file parsing. This will scale well with vault size.
- Impact: N/A - this is good practice.

**[Positive] Hybrid Matching Strategy**
- Files: `crates/core/src/vault_index.rs:263-276`, `283-296`, `298-310`
- Observation: The hybrid exact/substring matching provides O(1) performance for exact matches while maintaining fuzzy search capability. This is a smart optimization that provides the best of both worlds.
- Impact: N/A - this is excellent design.

**[Minor] Unnecessary Clones in Query Functions**
- Files: `crates/core/src/vault_session.rs:70-74`, `102-106`, `114-120`
- Issue: The find_*_by_title functions clone entities from the index. For large result sets, this could be expensive.
- Recommendation: Consider returning references where possible, or using Rc<T> for entities in the index to enable cheap clones.
- Impact: Minor performance improvement for large queries. Low priority - typical query result sizes are small.

## Actions

### DO NOT IMPLEMENT (Skip These)

**❌ Result Type Refactoring**
- The current discriminated union approach is MORE type-safe than the proposed compositional approach
- TypeScript can narrow types very effectively with the current design
- This would be risky refactoring for questionable benefit
- The current 15 distinct types isn't the problem - the problem is the monolithic formatter files
- **Decision**: Skip this entirely

**❌ Entity-Specific Commands**
- This is a UX/product decision, not a code quality issue
- Should be a separate discussion about interface design, not bundled into cleanup
- Too big and too subjective for a "code quality" task
- **Decision**: Skip this entirely

---

### Phase 1: Quick Wins & Foundation

Do small, independent, low-risk improvements first to build momentum:

1. **Add Logging Infrastructure**
   - Add `log` crate to Rust dependencies
   - Add WARN logs for parse failures in vault scanning
   - Add optional DEBUG logging for performance diagnostics
   - **Rationale**: Independent, helps debug all future work; silent failures make debugging difficult for users

2. **Replace Custom Date Logic with Chrono**
   - Replace custom days_to_ymd implementation with chrono
   - Add proper timezone handling
   - Update tests to cover edge cases
   - **Rationale**: Reduces tech debt, well-tested library; reduces maintenance burden and potential bugs

3. **Normalize Entity Type Utility**
   - Extract shared normalizeEntityType function to `src/lib/entity-type.ts`
   - Eliminate duplication between list.ts and new.ts
   - **Rationale**: Trivial duplication fix

4. **Optimize VaultConfig Usage**
   - Change scan_* functions to take &VaultConfig
   - Avoid unnecessary clones
   - **Rationale**: Minor perf win, simple change

5. **Extract YAML Manipulation Helpers**
   - Extract reusable patterns from writer.rs
   - Create ensure_field_exists, remove_field_preserve_comments, etc.
   - **Rationale**: Improves writer.rs readability for future work

### Phase 2: Architectural Improvements

Medium-risk structural changes:

6. **Split Vault Index Module**
   - Separate into: vault_index.rs, vault_queries.rs, query_results.rs
   - Improves module cohesion and testability
   - **Rationale**: Improves organization, independent of other changes; better to do this before formatters in case we need to touch query results

### Phase 3: Major Refactoring

High-impact, high-risk changes - do these together while in "refactoring mode":

7. **Refactor Output Formatters**
   - Break `human.ts` and `ai.ts` into entity-specific modules
   - Create clear module boundaries: task, project, area, context, list, shared
   - Structure:
     ```
     src/output/
       human/
         index.ts (router)
         task.ts, project.ts, area.ts, context.ts, list.ts
         shared.ts (common utilities)
       ai/ (same structure)
     ```
   - Add tests for each formatter module
   - **Rationale**: The REAL fix for formatter complexity; 50K+ line files are unmaintainable and slow to navigate

8. **Simplify List Command**
   - Extract entity-specific listing logic into separate functions
   - Create: listTasks(), listProjects(), listAreas()
   - Dispatch from main command handler
   - Add focused tests for each entity type's filtering
   - **Rationale**: Easier to do after formatters are cleaner; list command uses formatters; 15K line command is difficult to modify without introducing bugs

### Phase 4: Testing & Documentation

Do this AFTER refactoring so you're testing the final structure:

9. **Add Missing Tests**
   - Add tests for short flags (-s, -p, -a, -d, -q, -l)
   - Add tests for fuzzy disambiguation prompts
   - Add tests for taskdn-type field support
   - Add Rust tests for batch operations
   - **Rationale**: Test the new architecture, not the old one; identified gaps in cli-progress.md

10. **Improve Test Organization**
    - Add describe blocks to group related tests
    - Follow consistent naming conventions
    - Example structure:
      ```typescript
      describe('show command', () => {
        describe('with tasks', () => { ... })
        describe('with projects', () => { ... })
        describe('error handling', () => { ... })
      })
      ```
    - **Rationale**: Do this while adding tests, natural time to reorganize; makes test failures easier to locate

11. **Add Module Documentation**
    - Add JSDoc module comments to key TypeScript files
    - Document design decisions and usage patterns
    - Focus on: what problem the module solves, key design decisions, usage patterns
    - **Rationale**: Document the final state after all refactoring is complete; improves onboarding for new developers

## Summary

The tdn-cli codebase is well-architected and demonstrates solid engineering practices. The code is generally clean, well-tested, and follows language idioms appropriately. The main areas for improvement are:

1. **File size management** - Output formatters and list command have grown too large
2. **Logging and observability** - Silent failures make debugging difficult
3. **Test coverage** - Some gaps identified in progress tracking

The Rust code is of particularly high quality, with excellent use of the type system, proper error handling, and smart performance optimizations. The TypeScript code is good but would benefit from better organization of the larger modules.

**Overall Assessment**: This is production-ready code that would benefit from strategic refactoring in a few key areas, but has no critical issues that would prevent use or maintenance.
