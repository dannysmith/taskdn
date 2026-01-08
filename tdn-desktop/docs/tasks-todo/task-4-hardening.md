# Task 4: Hardening

## Purpose

Make the feature-complete app production-ready through comprehensive testing, edge case handling, performance optimization, and polish. After this phase, the app is ready for beta release.

## Background

Tasks 1-3 deliver a feature-complete app:
- Task 1: Structural foundation
- Task 2: Data layer with persistence
- Task 3: All UI components integrated

This task ensures everything works reliably, handles edge cases gracefully, and provides a polished user experience.

## Scope

### 1. Automated Testing

#### Static Test Vault

Located in `test-fixtures/vault/`:
- Pre-created markdown files with known content
- Coverage across all entity types and statuses
- Edge cases: empty notes, special characters, long titles, many tags
- Used for integration tests and E2E tests

**Contents:**
```
test-fixtures/vault/
├── tasks/
│   ├── task-inbox-001.md           # Inbox status
│   ├── task-ready-002.md           # Ready status
│   ├── task-in-progress-003.md     # In progress
│   ├── task-blocked-004.md         # Blocked with reason
│   ├── task-done-005.md            # Completed
│   ├── task-dropped-006.md         # Dropped
│   ├── task-with-dates-007.md      # All date fields set
│   ├── task-minimal-008.md         # Only required fields
│   ├── task-unicode-009.md         # Unicode in title/notes
│   ├── task-long-notes-010.md      # Extended markdown notes
│   └── archive/
│       └── task-archived-011.md    # Archived task
├── projects/
│   ├── project-active-001.md       # Active with tasks
│   ├── project-planning-002.md     # Planning status
│   ├── project-completed-003.md    # Completed
│   ├── project-empty-004.md        # No tasks
│   └── archive/
│       └── project-archived-005.md
└── areas/
    ├── area-with-projects-001.md   # Has multiple projects
    ├── area-empty-002.md           # No projects
    └── archive/
        └── area-archived-003.md
```

#### Programmatic Test Helpers

```typescript
// test/helpers/vault.ts
export function createTestTask(overrides?: Partial<Task>): Task
export function createTestProject(overrides?: Partial<Project>): Project
export function createTestArea(overrides?: Partial<Area>): Area
export function createTestVault(config: VaultConfig): VaultData
export async function withTempVault(fn: (path: string) => Promise<void>): Promise<void>
```

#### Test Categories

**Unit Tests (Vitest)**
- Rust: Parsing, serialization, index building
- TypeScript: Hooks, utilities, date functions

**Integration Tests**
- TanStack Query hooks with mocked Tauri commands
- Order persistence load/save cycle
- Heading persistence

**Component Tests**
- Key components render correctly with test data
- User interactions trigger correct mutations
- Loading and error states display properly

**E2E Tests** (if using Playwright/Cypress with Tauri)
- Full user flows: create task, edit, complete
- DnD operations
- External file change detection

### 2. Edge Cases

#### Data Edge Cases
- [ ] Task with no optional fields (minimal valid task)
- [ ] Task with all optional fields populated
- [ ] Unicode characters in titles, notes, tags
- [ ] Very long titles (> 200 chars)
- [ ] Very long notes (> 10,000 chars)
- [ ] Task referencing non-existent project
- [ ] Project referencing non-existent area
- [ ] Circular references (if possible in data model)
- [ ] Empty vault (no entities)
- [ ] Large vault (1000+ tasks) - performance test

#### File System Edge Cases
- [ ] Vault folder doesn't exist
- [ ] Vault folder exists but is empty
- [ ] File permissions denied
- [ ] File deleted while app is open
- [ ] File renamed while app is open
- [ ] File modified externally with invalid frontmatter
- [ ] File created externally with duplicate ID
- [ ] Disk full during write
- [ ] Atomic write fails (temp file issues)

#### Concurrent Operations
- [ ] Multiple rapid mutations
- [ ] Mutation during file watcher event
- [ ] External change during mutation
- [ ] App quit during write operation

#### UI Edge Cases
- [ ] Empty views (no matching tasks)
- [ ] Views with 100+ items (scroll performance)
- [ ] Very long task titles in lists
- [ ] Deep nesting in markdown notes
- [ ] Images in markdown notes
- [ ] Code blocks in markdown notes

### 3. Error Handling

#### User-Facing Errors
- [ ] Toast notifications for save failures
- [ ] Inline error states for mutations
- [ ] Recovery suggestions where appropriate
- [ ] No cryptic error messages

#### Error Recovery
- [ ] Retry logic for transient failures
- [ ] Graceful degradation if file watcher fails
- [ ] Manual refresh option if sync seems stuck

#### Logging
- [ ] Structured logs for debugging
- [ ] Error logs with context
- [ ] Performance timing for slow operations

### 4. Performance

#### Profiling Targets
- Initial vault load time
- View switch time
- Mutation response time (optimistic update)
- Large list scroll performance
- DnD drag smoothness

#### Optimization Opportunities
- [ ] Lazy loading of task notes (only load when detail panel opens)
- [ ] Virtual scrolling for large lists (if needed)
- [ ] Debounced saves for rapid inline edits
- [ ] Index caching strategies

#### Benchmarks
Create benchmarks for:
- Load vault with 100/500/1000 tasks
- Filter tasks by status
- Render TodayView with 50+ tasks
- Kanban board with 20+ cards per column

### 5. Polish

#### Visual Polish
- [ ] Consistent spacing and alignment
- [ ] Proper focus indicators
- [ ] Smooth transitions and animations
- [ ] Dark mode works correctly everywhere
- [ ] Responsive behavior at various window sizes

#### Keyboard Navigation
- [ ] Tab order is logical
- [ ] Arrow keys work in lists
- [ ] Escape closes modals/panels
- [ ] Enter activates focused items
- [ ] Shortcuts work (Cmd+K, etc.)

#### Accessibility
- [ ] Proper ARIA labels
- [ ] Screen reader compatibility
- [ ] Sufficient color contrast
- [ ] Focus visible at all times

#### Inline Editing
- [ ] Task title editing feels native
- [ ] Heading title editing
- [ ] Escape cancels edits
- [ ] Enter confirms edits
- [ ] Blur auto-saves

### 6. Platform-Specific

#### macOS
- [ ] Native window controls work
- [ ] Dock menu (if applicable)
- [ ] System notifications
- [ ] Cmd shortcuts (not Ctrl)
- [ ] Quick pane behavior


### 7. Documentation Updates

After stabilization:
- [ ] Update README with current features
- [ ] Developer docs reflect final architecture
- [ ] API documentation for hooks
- [ ] Troubleshooting guide

## Testing Workflow

### During Development
1. Write tests alongside features
2. Run `bun run test` frequently
3. Use `dummy-demo-vault` for manual testing

### Before Completion
1. Full test suite passes
2. Manual testing checklist complete
3. Performance benchmarks acceptable
4. All edge cases handled or documented

### Regression Prevention
- CI runs full test suite
- Pre-commit hooks for quick checks
- Coverage tracking (aim for 80%+ on business logic)

## Checklist

### Testing Infrastructure
- [ ] Static test vault created
- [ ] Programmatic test helpers
- [ ] Vitest configured for components
- [ ] Rust tests passing
- [ ] E2E test setup (if doing)

### Edge Case Coverage
- [ ] Data edge cases handled
- [ ] File system edge cases handled
- [ ] Concurrent operations handled
- [ ] UI edge cases handled

### Error Handling
- [ ] User-facing error messages
- [ ] Error recovery paths
- [ ] Logging in place

### Performance
- [ ] Load time acceptable (< 2s for 500 tasks)
- [ ] UI feels responsive
- [ ] No jank in DnD
- [ ] Memory usage reasonable

### Polish
- [ ] Visual consistency audit
- [ ] Keyboard navigation complete
- [ ] Accessibility audit
- [ ] Platform-specific testing

### Final Checks
- [ ] `bun run check:all` passes
- [ ] All views tested manually
- [ ] External sync tested
- [ ] Fresh install tested
- [ ] Documentation updated

## Dependencies

- Task 3 (UI Integration) - Feature-complete app to test

## Outcome

A production-ready desktop app that:
- Handles real-world vault data reliably
- Recovers gracefully from errors
- Performs well with large vaults
- Provides a polished user experience
- Has comprehensive test coverage
