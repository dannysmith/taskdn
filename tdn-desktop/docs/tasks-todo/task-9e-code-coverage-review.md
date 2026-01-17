# Task: Code Coverage

Read `docs/developer/testing.md` and fully review this codebase for test coverage both in terms of Rust tests and TS/React. Make recommendations for meaningful improvements to test coverage.

Also review the current test suites for any useless or extremely low value tests, Especially when those tests are higher level, i.e. integration or e2e And are expensive to run. review the current test suite for any improvements we could make to its structure or how it reports or the kinds of stuff it's testing.

And then having done both of these come up with recommendations for improving the test suite overall. Remember that the entire goal of testing is to prevent bugs and assist both humans and AI agents in understanding when they have broken something through refactoring or adding new features. The tests should also be helpful in helping humans and AI agents understand the behaviour of this application and how parts of it are supposed to work. Remember that we are in a Tauri desktop app.

---

# Findings

## Executive Summary

The test suite demonstrates **mature, intentional testing practices** with a pragmatic philosophy: thoroughly test business logic (stores, hooks, utilities), maintain minimal smoke tests for UI components. Overall quality is **Good to Very Good**.

| Metric | TypeScript | Rust |
|--------|------------|------|
| Test Files | 34 | 9 modules |
| Total Tests | 610 | 137 |
| All Passing | ✓ | ✓ |
| Runtime | 7.01s | 0.04s |
| Coverage Philosophy | 30% threshold (intentional) | Core logic well-covered |

---

## Coverage Analysis

### TypeScript Coverage Breakdown

| Directory | Tested/Total | Coverage | Assessment |
|-----------|--------------|----------|------------|
| **Stores** | 6/6 | 100% | Excellent |
| **Types** | 3/5 | 60% | Good |
| **Hooks** | 9/16 | 56% | Partial |
| **Lib** | 8/30 | 27% | Partial |
| **Services** | 1/7 | 14% | Weak |
| **Components** | 2/136 | 1.5% | Intentionally minimal |
| **Config/i18n** | 0/7 | 0% | None |

**Key Observations:**
- State management (stores) is 100% covered - the most critical layer
- All ordering hooks are thoroughly tested (today, inbox, calendar, kanban, project, area, sidebar)
- Component testing is deliberately minimal - documented in test files as intentional
- Service subdirectory (vault/mutations.ts, vault/queries.ts, etc.) lacks direct tests

### Rust Coverage Breakdown

| Module | Tests | Assessment |
|--------|-------|------------|
| **vault/manager.rs** | 30 | Excellent |
| **vault/error.rs** | 20 | Excellent |
| **vault/writer.rs** | 18 | Good |
| **vault/wikilink.rs** | 18 | Excellent |
| **vault/scanner.rs** | 11 | Good |
| **vault/entities.rs** | 7 | Good |
| **types.rs** | 29 | Excellent |
| **utils/platform.rs** | 4 | Good |
| **bindings.rs** | 1 | Minimal |
| **commands/* (6 files)** | 0 | **Critical Gap** |
| **lib.rs** | 0 | Untested |

---

## Critical Gaps

### HIGH PRIORITY: Tauri Command Handlers (Rust)

All 6 command modules have **zero tests**. These are the primary API surface between Rust and React:

| File | Commands | Risk |
|------|----------|------|
| `commands/vault.rs` | 16 commands (CRUD operations) | **HIGH** |
| `commands/preferences.rs` | load/save preferences, atomic writes | **HIGH** |
| `commands/recovery.rs` | emergency data, file retention | **HIGH** |
| `commands/quick_pane.rs` | window positioning, shortcuts, macOS NSPanel | **HIGH** |
| `commands/config.rs` | CLI config parsing, paths | MEDIUM |
| `commands/notifications.rs` | OS notifications | LOW |

**Why This Matters:** These commands handle:
- All persistent data mutations
- User settings
- Crash recovery
- Complex platform-specific window management

While the underlying `VaultManager` is well-tested, the command handlers themselves (State extraction, error handling, marshalling) are untested.

### MEDIUM PRIORITY: Untested TypeScript Areas

1. **Hooks (7 untested):**
   - `use-global-shortcuts.ts` - keyboard shortcut registration
   - `use-deep-link.ts` - URL navigation handling
   - `use-main-window-event-listeners.ts` - Tauri event setup
   - `use-theme.ts` - theme switching logic
   - `use-mobile.ts` - responsive detection
   - `use-prevent-escape-exits-fullscreen.ts`
   - `use-command-context.ts`

2. **Command modules (lib/commands/):**
   - `app-commands.ts`, `entity-commands.ts`, `task-commands.ts`
   - `navigation-commands.ts`, `window-commands.ts`
   - `registry.ts`

3. **Service layer (services/vault/):**
   - `mutations.ts`, `queries.ts`, `utils.ts`, `init.ts`, `keys.ts`
   - Note: `vault.test.ts` tests helpers, but these modules lack direct tests

---

## Test Quality Assessment

### Well-Designed Tests (Keep As-Is)

| Test File | Why It's Good |
|-----------|---------------|
| `navigation-store.test.ts` | 51 tests covering complex state machine, history bounds, invalid selection skipping |
| `date-utils.test.ts` | Comprehensive edge cases: year boundaries, leap years, invalid input |
| `shortcuts.test.ts` | Platform-specific behavior, modifier exactness, case sensitivity |
| `vault.test.ts` | 44 tests for query keys, filtering, calculations, config change detection |
| `ui-store.test.ts` | Clean Zustand pattern with proper state reset |
| `use-platform.test.ts` | Tests caching, failure fallbacks, all platforms |

### Tests That Need Improvement

1. **`App.test.tsx`** - Uses vague assertions:
   ```typescript
   // Current (weak)
   expect(headings.length).toBeGreaterThan(0)

   // Better
   expect(headings).toHaveLength(1)
   expect(headings[0]).toHaveTextContent('Today')
   ```

2. **`TaskList.test.tsx`** - Only 5 tests for a core component. The test file acknowledges this is intentional (dnd-kit complexity), but could test more rendering scenarios.

### Tests To Remove

**`src/test/example.test.ts`** - This is placeholder boilerplate:
```typescript
function add(a: number, b: number): number {
  return a + b
}
describe('example utility functions', () => {
  it('adds two numbers correctly', () => {
    expect(add(2, 3)).toBe(5)
  })
})
```
This serves no purpose and should be deleted.

---

## Test Infrastructure Assessment

### Strengths

1. **Comprehensive Tauri Mocking** (`setup.ts`):
   - All Tauri APIs properly mocked (event, window, menu, OS, plugins)
   - Type-safe command mocks via tauri-specta
   - Platform cache reset between tests

2. **Excellent Test Utilities**:
   - `test-utils.tsx` - Provider wrapper with QueryClient, i18n, theme
   - `helpers/vault.ts` - Factory functions with deterministic IDs, temp vault utilities
   - Fixture vault with all entity statuses covered

3. **Proper Configuration**:
   - Conservative thresholds (30%) with documented rationale
   - React Compiler integration
   - jsdom environment

### Gaps in Infrastructure

1. **No E2E/Integration Test Setup** - No Playwright, Cypress, or Tauri test harness
2. **No Performance Benchmarks** - No tracking for test suite regression
3. **No Contract Testing** - Rust↔TypeScript interface not verified

---

## Summary

**Current State:** The test suite is thoughtfully designed with strong coverage of business logic (stores, hooks, utilities) and intentionally minimal UI testing. The Rust vault core is well-tested.

**Critical Gap:** Tauri command handlers are completely untested. This is the highest-priority improvement area since all user-facing operations flow through these commands.

**Quality:** Good to Very Good. Tests are well-organized, use proper mocking, and follow consistent patterns. The philosophy of "test logic, smoke-test UI" is sound for a desktop application.

**Estimated Bug-Catching Ability:** 80-85% for core logic regressions. Component-level and integration bugs may slip through, which is a reasonable trade-off given the cost of comprehensive UI testing.

---

# Implementation Plan

## Phase 1: Quick Cleanup [✅ DONE]

**Goal:** Remove noise and improve existing tests

**Tasks:**
1. Delete `src/test/example.test.ts` (placeholder test with no value)
2. Improve `App.test.tsx` assertions:
   - Replace `expect(headings.length).toBeGreaterThan(0)` with specific assertions
   - Add meaningful checks for expected content

**Commit:** "test: Remove placeholder test and improve App.test.tsx assertions"

---

## Phase 2: Rust Command Tests - Vault CRUD [✅ DONE]

**Goal:** Test the most critical command module (`commands/vault.rs`)

This module exposes 16 Tauri commands that handle all entity CRUD operations. While `VaultManager` is well-tested, the command handlers themselves need coverage.

**Tasks:**
1. Add test module to `commands/vault.rs`
2. Test key commands:
   - `create_task` / `create_project` - file creation with correct content
   - `update_task` / `update_project` - field updates preserved
   - `delete_task` / `delete_project` - file removal
   - `get_task` / `get_project` / `get_area` - entity retrieval
   - `list_tasks` / `list_projects` / `list_areas` - listing returns expected data
3. Use `tempfile` crate for isolated test directories
4. Test error handling for invalid inputs

**Commit:** "test(rust): Add tests for vault command handlers"

---

## Phase 3: Rust Command Tests - Persistence [✅ DONE]

**Goal:** Test user data persistence commands (`commands/preferences.rs`, `commands/recovery.rs`)

**Tasks:**

### preferences.rs
1. Test `load_preferences` - returns defaults when no file exists
2. Test `save_preferences` - writes valid JSON, atomic file operations
3. Test load/save round-trip - data integrity
4. Test validation (invalid theme values rejected)

### recovery.rs
1. Test `save_emergency_data` - creates file with correct content
2. Test `load_emergency_data` - reads saved data correctly
3. Test size limit validation (10MB limit)
4. Test `cleanup_old_recovery_files` - removes files older than 7 days
5. Test filename validation

**Commit:** "test(rust): Add tests for preferences and recovery commands"

---

## Phase 4: Rust Command Tests - Platform & Config [✅ DONE]

**Goal:** Test remaining command modules (`commands/quick_pane.rs`, `commands/config.rs`, `commands/notifications.rs`)

**Tasks:**

### quick_pane.rs (complex - focus on testable logic)
1. Test window positioning calculations
2. Test shortcut registration/unregistration
3. Test default shortcut retrieval
4. Note: Some platform-specific behavior (NSPanel) may be difficult to unit test

### config.rs
1. Test `read_cli_config` - parses valid config file
2. Test `read_cli_config` - returns appropriate error for missing/invalid file
3. Test `get_app_data_dir` - returns valid path
4. Test `is_dev_mode` - returns expected value based on build

### notifications.rs
1. Test `send_native_notification` - basic invocation (minimal logic to test)

**Commit:** "test(rust): Add tests for quick_pane, config, and notification commands"

---

## Phase 5: TypeScript Hook Tests

**Goal:** Test untested hooks that handle user-facing functionality

**Tasks:**

Priority hooks to test:
1. `use-global-shortcuts.ts` - shortcut registration and handler execution
2. `use-deep-link.ts` - URL parsing and navigation
3. `use-theme.ts` - theme switching logic

Lower priority (if time permits):
4. `use-main-window-event-listeners.ts` - event setup
5. `use-mobile.ts` - responsive detection
6. `use-command-context.ts` - context management

**Commit:** "test: Add tests for global shortcuts, deep link, and theme hooks"

---

## Phase 6: TypeScript Command & Service Tests

**Goal:** Test command modules and service layer

**Tasks:**

### Command modules (lib/commands/)
1. Test `registry.ts` - command registration and lookup
2. Test key commands in `entity-commands.ts` - CRUD orchestration
3. Test `task-commands.ts` - task-specific operations
4. Test `navigation-commands.ts` - navigation actions

### Service layer (services/vault/)
1. Test `mutations.ts` - mutation logic
2. Test `queries.ts` - query hooks
3. Test `utils.ts` - utility functions
4. Test `init.ts` - initialization logic

**Commit:** "test: Add tests for command modules and vault service layer"

---

## Phase 7: Documentation Update

**Goal:** Update `docs/developer/testing.md` to include testing philosophy

**Tasks:**
1. Add "Testing Philosophy" section explaining:
   - Why coverage thresholds are set at 30%
   - "Test logic, smoke-test UI" approach
   - When to write thorough tests vs minimal tests
   - Tauri-specific testing considerations
2. Add guidance on what to test for new features
3. Document the test infrastructure (factories, fixtures, mocking)
4. Add examples of good test patterns from existing tests

**Commit:** "docs: Update testing.md with philosophy and comprehensive guidance"

---

## Phase Summary

| Phase | Focus | Risk Addressed |
|-------|-------|----------------|
| 1 | Quick cleanup | Test noise, weak assertions |
| 2 | Rust vault commands | Critical: All CRUD untested |
| 3 | Rust persistence | Critical: User data at risk |
| 4 | Rust platform/config | Platform-specific bugs |
| 5 | TypeScript hooks | User-facing features |
| 6 | TypeScript commands/services | Application orchestration |
| 7 | Documentation | Knowledge preservation |

Each phase results in a working, committable state. Phases can be tackled in separate Claude Code sessions if context runs low.
