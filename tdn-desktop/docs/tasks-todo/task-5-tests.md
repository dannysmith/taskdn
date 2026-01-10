# Task 5: Comprehensive Test Coverage

## Purpose

Add sufficient automated tests to verify functionality across the entire application. Currently the codebase has minimal test coverage (~65 Rust tests concentrated in vault module, ~20 TypeScript tests).

## Current State Analysis

### Existing Test Infrastructure

- **Vitest 4.x** configured with jsdom, React Testing Library, coverage (60% threshold)
- **Rust** uses native `#[test]` with `tempfile` crate for file system tests
- **Test utilities**: `src/test/setup.ts` (Tauri mocks), `src/test/test-utils.tsx` (providers)
- **Documentation**: `docs/developer/testing.md` with patterns

### Existing Test Coverage

| Area                   | Tests | Coverage      |
| ---------------------- | ----- | ------------- |
| Rust vault/wikilink.rs | 18    | Comprehensive |
| Rust vault/scanner.rs  | 13    | Comprehensive |
| Rust vault/writer.rs   | 18    | Comprehensive |
| Rust vault/entities.rs | 11    | Basic         |
| Rust utils/platform.rs | 4     | Basic         |
| TS ui-store            | 7     | Good          |
| TS commands            | 5     | Good          |
| TS use-platform        | 9     | Good          |
| TS context-menu        | ~5    | Good          |

### Critical Gaps

- **Rust**: VaultManager (551 lines, 0 tests), all command handlers, type validation
- **TypeScript**: 5/6 Zustand stores untested, all ordering hooks, complex components
- **Integration**: No cross-boundary testing (Rust ↔ React)

---

## Phase 1: Static Test Vault

Create a deterministic test fixture vault for integration and component tests.

### Location

`src/test/fixtures/vault/` (TypeScript tests)

> **Note:** The project already has `demo-vault/` for manual testing. These test fixtures are intentionally separate - they're minimal, deterministic, and designed for automated tests rather than realistic exploration.

### Structure

```
test/test-fixtures/vault/
├── tasks/
│   ├── task-inbox-001.md           # Inbox status
│   ├── task-icebox-002.md          # Icebox status
│   ├── task-ready-003.md           # Ready status
│   ├── task-in-progress-004.md     # In progress
│   ├── task-blocked-005.md         # Blocked with reason
│   ├── task-done-006.md            # Completed
│   ├── task-dropped-007.md         # Dropped
│   ├── task-with-dates-008.md      # All date fields (due, scheduled, defer-until)
│   ├── task-minimal-009.md         # Only required fields
│   ├── task-unicode-010.md         # Unicode in title/notes
│   ├── task-long-notes-011.md      # Extended markdown body
│   ├── task-with-project-012.md    # Has project reference
│   ├── task-with-area-013.md       # Has area reference
│   └── archive/
│       └── task-archived-014.md    # Archived task
├── projects/
│   ├── project-planning-001.md     # Planning status
│   ├── project-ready-002.md        # Ready status
│   ├── project-in-progress-003.md  # In progress
│   ├── project-blocked-004.md      # Blocked with reason
│   ├── project-paused-005.md       # Paused
│   ├── project-done-006.md         # Completed
│   ├── project-with-area-007.md    # Has area reference
│   ├── project-empty-008.md        # No linked tasks
│   └── archive/
│       └── project-archived-009.md
└── areas/
    ├── area-active-001.md          # Active with projects
    ├── area-empty-002.md           # No projects
    └── archive/
        └── area-archived-003.md
```

### TypeScript Test Helpers

**File:** `src/test/helpers/vault.ts`

> **Rust fixtures:** For Rust tests, use `tempfile::TempDir` to create fixtures programmatically (already the pattern in existing vault tests). Don't try to share fixtures between TS and Rust - the access patterns are too different.

```typescript
// Factory functions for test data
export function createTestTask(overrides?: Partial<Task>): Task
export function createTestProject(overrides?: Partial<Project>): Project
export function createTestArea(overrides?: Partial<Area>): Area

// Bulk data generation
export function createTestVault(config: {
  taskCount?: number
  projectCount?: number
  areaCount?: number
}): { tasks: Task[]; projects: Project[]; areas: Area[] }

// Temporary vault for write tests
export async function withTempVault(
  fn: (vaultPath: string) => Promise<void>
): Promise<void>

// Load static fixture data
export function loadFixtureVault(): {
  tasks: Task[]
  projects: Project[]
  areas: Area[]
}
```

### Tasks

- [x] Create all fixture markdown files with valid frontmatter
- [x] Create TypeScript factory functions in `src/test/helpers/vault.ts`
- [x] Create `withTempVault` helper using OS temp directories
- [x] Add fixture loading utilities
- [x] Document fixture contents and edge cases covered

---

## Phase 2: Rust Unit Tests

Focus on untested business logic in the Rust backend.

### Priority 1: VaultManager (HIGH - 551 lines, 0 tests)

**File:** `src-tauri/src/vault/manager.rs`

| Test Area             | Description                            | Est. Tests |
| --------------------- | -------------------------------------- | ---------- |
| VaultIndex            | HashMap operations, lookups by ID/path | 8          |
| initialize()          | Full setup with scanning               | 3          |
| list\_\* methods      | Return correct cached data             | 6          |
| get\_\* methods       | ID lookup, not found errors            | 6          |
| create\_\* methods    | File creation, index update            | 6          |
| update\_\* methods    | File modification, index sync          | 6          |
| delete_task           | File removal, index cleanup            | 3          |
| refresh()             | Rescan and reindex                     | 2          |
| Write-loop prevention | AtomicBool flag behavior               | 3          |

**Total: ~43 tests**

### Priority 2: Type Validation (MEDIUM - 0 tests)

**File:** `src-tauri/src/types.rs`

| Function                | Test Cases                                                  |
| ----------------------- | ----------------------------------------------------------- |
| validate_filename()     | Valid names, special chars, path traversal, empty, too long |
| validate_string_input() | Within limit, at limit, over limit, empty                   |
| validate_theme()        | Valid values, invalid values                                |

**Total: ~15 tests**

### Priority 3: Command Handlers (MEDIUM)

**Files:** `src-tauri/src/commands/*.rs`

These are thin wrappers but benefit from error path testing:

| File           | Test Focus                                              | Est. Tests |
| -------------- | ------------------------------------------------------- | ---------- |
| preferences.rs | Load/save with missing file, corrupt JSON, atomic write | 8          |
| recovery.rs    | Size limits, filename validation, cleanup age logic     | 10         |
| config.rs      | CLI config parsing, missing file handling               | 5          |

**Total: ~23 tests**

### Priority 4: Error Module (LOW)

**File:** `src-tauri/src/vault/error.rs`

| Test            | Description                         |
| --------------- | ----------------------------------- |
| Display impl    | All error variants format correctly |
| Builder methods | read_error(), write_error(), etc.   |

**Total: ~10 tests**

### Implementation Notes

- Use `tempfile::TempDir` for all file system tests
- Consider adding `tokio` dev-dependency if async tests needed later
- **VaultManager challenge:** The file watcher (`notify-debouncer-full`) starts automatically on `initialize()`. Options:
  1. Add a `VaultManager::new_without_watcher()` constructor for testing
  2. Test through the public API only (more integration-style)
  3. Extract pure logic (VaultIndex operations) into testable functions
- Test counts for VaultManager are optimistic - `list_tasks/projects/areas` and `get_task/project/area` are structurally identical, so consolidate similar tests

### Tasks

- [x] Add VaultIndex unit tests (HashMap operations)
- [x] Add VaultManager basic tests (unconfigured state, error paths)
- [x] Add type validation tests
- [ ] ~~Add preferences command tests~~ (blocked by Tauri AppHandle dependency)
- [ ] ~~Add recovery command tests~~ (blocked by Tauri AppHandle dependency)
- [ ] ~~Add config command tests~~ (blocked by Tauri AppHandle dependency)
- [x] Add error display tests

> **Note:** Command handler tests (preferences, recovery, config) are blocked by Tauri `AppHandle` dependency. These functions use `app.path().app_data_dir()` for directory resolution. Testing would require either mocking Tauri internals or running as integration tests with a real Tauri app. The validation logic is tested through `types.rs` tests instead.

---

## Phase 3: Rust Integration Tests ~~(Optional)~~ SKIPPED

**Decision: Not needed.**

Phase 2 achieved sufficient coverage:
- VaultIndex operations fully tested (18 tests) - the core data structure
- VaultManager error paths tested (9 tests) - unconfigured state handling
- Scanner, writer, and entity parsing already had comprehensive tests (49 existing tests)
- File watcher is a thin wrapper around `notify-debouncer-full` - testing it would mostly test the library

The file watcher behavior is observable through manual testing and would require significant test infrastructure (mock Tauri app, temp directories with timing) for minimal value.

### ~~Tasks~~ N/A

- [x] ~~Evaluate if integration tests are needed after Phase 2~~ - Not needed
- [x] ~~If needed: Create integration test module~~ - Skipped
- [x] ~~If needed: Add concurrent access tests~~ - Skipped

---

## Phase 4: TypeScript Unit Tests

Focus on pure logic separate from React components.

### Priority 1: Vault Service (HIGH - 740 lines, PRIMARY data layer)

**File:** `src/services/vault.ts`

This is the most critical TypeScript file - it handles ALL data fetching, mutations, optimistic updates, and error handling. Currently 0 tests.

| Area | Test Cases | Est. Tests |
| --- | --- | --- |
| formatVaultError() | All error type variants (8 types) | 8 |
| Query hooks (useTasks, etc.) | Success, error handling | 6 |
| Mutation optimistic updates | onMutate snapshots correct data | 4 |
| Mutation rollback | onError restores previous state | 4 |
| Mutation debounce | markMutationStart/Complete timing | 3 |
| useVaultHelpers() | Relationship helpers (getProjectsByAreaId, etc.) | 8 |

**Total: ~33 tests**

> **Testing approach:** Mock the `commands` object from `@/lib/tauri-bindings`. Test that optimistic updates modify QueryClient cache correctly, and that rollbacks restore previous state on error. The relationship helpers in `useVaultHelpers()` are pure functions operating on arrays - highly testable.

### Priority 2: Date Utilities (HIGH - Critical for Today view)

**File:** `src/lib/date-utils.ts`

| Function             | Test Cases                                                                      |
| -------------------- | ------------------------------------------------------------------------------- |
| formatRelativeDate() | Today, tomorrow, yesterday, this week days, last week, future dates, past dates |
| isOverdue()          | Past dates, today, future dates, invalid input                                  |
| isToday()            | Exact match, different times same day, different days                           |

**Total: ~20 tests**

> **Time mocking:** Use `vi.useFakeTimers()` and `vi.setSystemTime(new Date('2025-06-15'))` to control "now". Remember to call `vi.useRealTimers()` in `afterEach`.

### Priority 3: Recovery System (HIGH - Critical for crash recovery)

**File:** `src/lib/recovery.ts`

| Function              | Test Cases                                     |
| --------------------- | ---------------------------------------------- |
| saveEmergencyData()   | Success, size limit exceeded, invalid filename |
| loadEmergencyData()   | Exists, not found, parse error                 |
| cleanupOldFiles()     | Removes old, keeps recent                      |
| formatRecoveryError() | All error types formatted                      |

**Total: ~15 tests**

### Priority 4: Platform Strings (MEDIUM)

**File:** `src/lib/platform-strings.ts`

| Function             | Test Cases                                         |
| -------------------- | -------------------------------------------------- |
| getPlatformStrings() | macOS, Windows, Linux                              |
| formatShortcut()     | Single modifier, multiple modifiers, all platforms |

**Total: ~12 tests**

### Priority 5: Notifications (MEDIUM)

**File:** `src/lib/notifications.ts`

| Function            | Test Cases                                    |
| ------------------- | --------------------------------------------- |
| notify()            | Toast only, native only, both, error fallback |
| Convenience methods | success, error, info, warning                 |

**Total: ~10 tests**

### Priority 6: Type Helpers (LOW)

**Files:** `src/types/sidebar-order.ts`, `src/types/calendar-order.ts`, `src/types/headings.ts`

| Function                         | Test Cases              |
| -------------------------------- | ----------------------- |
| getDragId()                      | Correct prefix format   |
| getCalendarTaskDragId()          | Correct composite ID    |
| parseCalendarTaskDragId()        | Extract date and taskId |
| isHeadingId()                    | Type guard accuracy     |
| parseHeadingId() / toHeadingId() | Round-trip              |

**Total: ~10 tests**

### Tasks

- [x] Add vault service tests (formatVaultError, optimistic updates, rollback, helpers)
- [x] Add date-utils tests with vi.useFakeTimers()
- [x] Add recovery system tests with mocked Tauri commands
- [x] Add platform-strings tests
- [x] Add notifications tests with mocked toast/native
- [x] Add type helper tests

---

## Phase 5: TypeScript Store Tests

> **Critical pattern:** Zustand stores persist state between tests. Always reset store state in `beforeEach`:
>
> ```typescript
> beforeEach(() => {
>   useMyStore.setState(useMyStore.getInitialState())
> })
> ```

Test Zustand stores in isolation (following existing ui-store.test.ts pattern).

### Priority 1: Task Creation Store (HIGH - Complex two-layer system)

**File:** `src/store/task-creation-store.ts` (227 lines)

| Test Area                   | Description                                  | Est. Tests |
| --------------------------- | -------------------------------------------- | ---------- |
| registerViewDefault         | Register, replace, clear                     | 4          |
| activateList                | Activation, different list replaces          | 3          |
| deactivateList              | Correct list deactivates, wrong list ignored | 3          |
| updateActiveListSelection   | Updates taskId and index                     | 2          |
| triggerCreate (activeList)  | Uses activeListHandler, calls callbacks      | 4          |
| triggerCreate (viewDefault) | Falls back to viewDefaultHandler             | 3          |
| triggerCreate (none)        | Returns undefined when no handlers           | 2          |
| Async handling              | Async handler completes, returns taskId      | 2          |

**Total: ~23 tests**

### Priority 2: Display Order Store (HIGH - Complex nested state)

**File:** `src/store/display-order-store.ts` (~250 lines)

| Test Area        | Description                                          | Est. Tests |
| ---------------- | ---------------------------------------------------- | ---------- |
| Sidebar ordering | setSidebarAreaOrder, setSidebarProjectOrder          | 4          |
| Batch operations | setSidebarProjectOrderBatch                          | 2          |
| Task ordering    | setInboxOrder, setProjectTaskOrder, setAreaTaskOrder | 6          |
| Today sections   | setTodaySectionOrder with different sections         | 4          |
| Headings         | setTodayHeading, deleteTodayHeading                  | 4          |
| Kanban columns   | setKanbanColumnOrder nested updates                  | 4          |
| Reset            | resetAllOrder clears everything                      | 1          |

**Total: ~25 tests**

### Priority 3: Task Detail Store (MEDIUM - Cross-store interaction)

**File:** `src/store/task-detail-store.ts` (45 lines)

| Test Area     | Description                  | Est. Tests |
| ------------- | ---------------------------- | ---------- |
| setOpenTaskId | Sets ID without side effects | 2          |
| openTask      | Sets ID AND opens sidebar    | 3          |
| closeTask     | Clears ID                    | 1          |
| Cross-store   | Verify UI store interaction  | 2          |

**Total: ~8 tests**

### Priority 4: Navigation Store (MEDIUM)

**File:** `src/store/navigation-store.ts` (30 lines)

| Test Area     | Description                                       | Est. Tests |
| ------------- | ------------------------------------------------- | ---------- |
| setSelection  | All selection types (nav, area, project, no-area) | 5          |
| Default state | Starts with Today view                            | 1          |

**Total: ~6 tests**

### Priority 5: View Mode Store (LOW)

**File:** `src/store/view-mode-store.ts`

| Test Area     | Description               | Est. Tests |
| ------------- | ------------------------- | ---------- |
| setViewMode   | Sets mode for key         | 3          |
| Default modes | Correct defaults per view | 3          |

**Total: ~6 tests**

### Tasks

- [x] Add task-creation-store tests (priority system, async handling)
- [x] Add display-order-store tests (all ordering operations)
- [x] Add task-detail-store tests (cross-store interaction)
- [x] Add navigation-store tests
- [x] Add view-mode-store tests

---

## Phase 6: TypeScript Hook Tests

Test custom hooks that derive state or manage complex logic.

### Priority 1: Ordering Hooks (HIGH - Core UX)

**Files:** `src/hooks/use-*-order.ts`

| Hook             | Test Focus                                                       | Est. Tests |
| ---------------- | ---------------------------------------------------------------- | ---------- |
| useTodayOrder    | Section ordering, heading CRUD, mixed item lists (most complex)  | 8          |
| useKanbanOrder   | Order sync on data change, new task append, deleted task removal | 6          |
| useSidebarOrder  | Area + project ordering, cross-container moves                   | 6          |
| useCalendarOrder | Date-based task ordering                                         | 4          |
| useInboxOrder    | Basic ordering, null → natural order                             | 3          |
| useProjectOrder  | Per-project ordering (structurally same as inbox)                | 2          |
| useAreaOrder     | Per-area ordering (structurally same as inbox)                   | 2          |

**Total: ~31 tests**

> **Note:** useInboxOrder, useProjectOrder, and useAreaOrder are nearly identical - test one thoroughly, then just verify the others use the correct store keys.

### Priority 2: View Mode Hook (MEDIUM)

**File:** `src/hooks/use-view-mode.ts`

| Test                 | Description              |
| -------------------- | ------------------------ |
| Returns correct mode | For each view type       |
| Available modes      | Correct options per view |
| setViewMode          | Updates store            |

**Total: ~6 tests**

### Implementation Notes

- Use `renderHook` from @testing-library/react
- Mock stores with initial state
- Test synchronization behavior when underlying data changes

### Tasks

- [x] Add useTodayOrder tests (most complex - headings + tasks)
- [x] Add useKanbanOrder tests
- [x] Add useSidebarOrder tests
- [x] Add useCalendarOrder tests
- [x] Add useInboxOrder tests (template for project/area)
- [x] Add useProjectOrder tests
- [x] Add useAreaOrder tests
- [x] Add useViewMode tests (already existed in view-mode-store.test.ts)

---

## Phase 7: React Component Tests

Focus on components with significant testable behavior (not pure presentation).

> **Reality check:** Component tests are expensive to write and maintain. These estimates assume mocking works smoothly - in practice, some tests may need to be simplified or converted to integration tests if mocking proves too fragile. Prioritize behavior over implementation details.

### Priority 1: TaskList (HIGH - 780 lines, keyboard-heavy)

**File:** `src/components/tasks/task-list.tsx`

| Test Area           | Description                                    | Est. Tests |
| ------------------- | ---------------------------------------------- | ---------- |
| Keyboard navigation | Arrow up/down, bounds handling                 | 4          |
| Selection           | Click to select, selection persistence         | 4          |
| Inline editing      | Enter to edit, Escape to cancel, click outside | 5          |
| Task creation       | Cmd+N creates task, auto-edit new task         | 4          |
| Cancel new task     | Escape on new task deletes it                  | 2          |
| Rendering           | Correct items rendered, empty state            | 3          |

**Total: ~22 tests**

### Priority 2: CommandPalette (MEDIUM)

**File:** `src/components/command-palette/CommandPalette.tsx`

| Test Area        | Description                   | Est. Tests |
| ---------------- | ----------------------------- | ---------- |
| Search filtering | Filters by label, keywords    | 4          |
| Availability     | Only shows available commands | 2          |
| Execution        | Executes command on select    | 2          |
| Keyboard         | Escape closes, Enter executes | 3          |

**Total: ~11 tests**

### Priority 3: TodayView (MEDIUM - Complex filtering)

**File:** `src/components/views/today-view.tsx`

| Test Area         | Description                             | Est. Tests |
| ----------------- | --------------------------------------- | ---------- |
| Section filtering | Correct tasks in each section           | 4          |
| Date logic        | Overdue, due today, scheduled, deferred | 4          |
| Empty sections    | Hidden when no tasks                    | 2          |
| Headings          | Rendered with tasks                     | 2          |

**Total: ~12 tests**

### Priority 4: PreferencesDialog (LOW)

**File:** `src/components/preferences/PreferencesDialog.tsx`

| Test Area       | Description            | Est. Tests |
| --------------- | ---------------------- | ---------- |
| Pane navigation | Switches between panes | 3          |
| Open/close      | Dialog state           | 2          |

**Total: ~5 tests**

### Implementation Notes

- Use `render` from `src/test/test-utils.tsx` (includes all providers)
- Use `userEvent` for realistic user interactions
- Mock TanStack Query data with `QueryClient` in tests

### Tasks

- [x] Add TaskList smoke tests (basic rendering, empty state)
- [ ] ~~Add TaskList keyboard navigation tests~~ (skipped - too tightly coupled to DOM)
- [ ] ~~Add TaskList inline editing tests~~ (skipped - dnd-kit complexity)
- [ ] ~~Add TaskList task creation tests~~ (skipped - covered by store tests)
- [ ] ~~Add CommandPalette tests~~ (skipped - cmdk has many browser dependencies)
- [ ] ~~Add TodayView section filtering tests~~ (skipped - covered by date-utils & hook tests)
- [ ] ~~Add PreferencesDialog tests~~ (skipped - trivial value)

> **Decision: Minimal Component Tests**
>
> Phase 7 was intentionally kept minimal. The complex components (TaskList, TodayView) rely heavily on:
> - @dnd-kit for drag-and-drop (notoriously difficult to test)
> - Multiple store interactions (already tested via store tests)
> - Browser APIs like scrollIntoView (not available in jsdom)
>
> The underlying business logic is already well-tested through:
> - `commands.test.ts` for command system
> - `date-utils.test.ts` for date filtering
> - `use-today-order.test.ts` for ordering logic
> - Store tests for state management
>
> Added 5 smoke tests for TaskList to verify basic rendering works.

---

## Phase 8: Test Cleanup and Documentation

### Cleanup Tasks

- [ ] Review all tests for redundancy and remove duplicates
- [ ] Ensure edge cases are covered (empty states, errors, boundaries)
- [ ] Remove any tests that don't provide value
- [ ] Standardize test naming conventions
- [ ] Group related tests logically

### Documentation Updates

- [ ] Update `docs/developer/testing.md` with new patterns discovered
- [ ] Document test fixture structure and usage
- [ ] Add examples for common test scenarios
- [ ] Document any new mock utilities created

### Coverage Analysis

- [ ] Run coverage report: `bun run test:coverage`
- [ ] Identify remaining gaps in critical paths
- [ ] Adjust coverage thresholds if appropriate (currently 60%)

---

## Summary

| Phase | Focus                        | Estimated Tests      |
| ----- | ---------------------------- | -------------------- |
| 1     | Test Vault Fixtures          | N/A (infrastructure) |
| 2     | Rust Unit Tests              | ~70-80 tests         |
| 3     | Rust Integration (if needed) | ~5-10 tests          |
| 4     | TypeScript Unit Tests        | ~100 tests           |
| 5     | TypeScript Store Tests       | ~68 tests            |
| 6     | TypeScript Hook Tests        | ~37 tests            |
| 7     | React Component Tests        | 5 tests (minimal)    |
| 8     | Cleanup & Docs               | N/A                  |

**Total New Tests: ~340** (actual: 425 tests total as of Phase 7 completion)

> **Note on estimates:** Test counts are guidelines, not targets. Some areas will need more tests than estimated (edge cases discovered during implementation), others fewer (structurally identical code). Prioritize coverage of critical paths over hitting numbers.

### Execution Order Recommendation

1. **Phase 1** first - Required foundation for other phases
2. **Phase 2** and **Phase 4** can run in parallel (Rust and TS unit tests)
3. **Phase 5** after Phase 4 (stores depend on understanding utilities)
4. **Phase 6** after Phase 5 (hooks use stores)
5. **Phase 7** after Phase 6 (components use hooks and stores)
6. **Phase 8** last - Final polish

### Key Files to Test (Priority Order)

**Rust:**

1. `vault/manager.rs` - Core data access (highest complexity, 0 tests)
2. `types.rs` - Input validation (security-relevant)
3. `commands/recovery.rs` - Crash recovery (data safety)

**TypeScript:**

1. `services/vault.ts` - PRIMARY data layer (740 lines, 0 tests, optimistic updates)
2. `lib/date-utils.ts` - Date logic (Today view correctness)
3. `store/task-creation-store.ts` - Task creation flow (complex state machine)
4. `store/display-order-store.ts` - Visual ordering (user-facing state)
5. `hooks/use-today-order.ts` - Today view logic (most complex hook)
6. `components/tasks/task-list.tsx` - Main interaction surface (if time permits)

---

## Known Challenges

Issues to be aware of during implementation:

1. **Drag-and-drop (@dnd-kit)** - Multiple components use dnd-kit for drag operations. Testing drag-drop is notoriously difficult. Consider:
   - Testing the callbacks (onDragEnd handlers) in isolation
   - Skipping visual drag simulation in favor of unit testing the reorder logic
   - Using dnd-kit's testing utilities if available

2. **VaultManager file watcher** - The Rust VaultManager starts a file watcher on initialization. Either:
   - Add a test-only constructor that skips the watcher
   - Accept that these are integration tests, not unit tests
   - Focus on testing VaultIndex (the cache) separately from VaultManager

3. **TanStack Query mutation testing** - Testing optimistic updates requires careful setup:
   - Create a fresh QueryClient per test
   - Pre-populate the cache with known data
   - Verify cache state after onMutate, onError, and onSuccess

4. **Platform-specific code** - Some code paths (macOS NSPanel in quick_pane.rs) are untestable without the actual platform. Accept that some code won't have automated test coverage.

5. **Recovery testing** - The TypeScript recovery.ts is mostly a thin wrapper over Rust commands. Testing the TS layer with mocked commands proves the wrapper works, but the real value is in the Rust tests. Don't over-invest in the TS layer here.
