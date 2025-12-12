# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-12-12

### Added

#### Core Parsing

- Parse markdown files with YAML frontmatter into typed entities (`Task`, `Project`, `Area`)
- Support for all Taskdn specification fields including timestamps, references, and custom fields
- Round-trip preservation of unknown frontmatter fields
- `DateTimeValue` type that preserves original format (date-only vs datetime)
- `FileReference` type supporting WikiLinks (`[[Page]]`), relative paths, and filenames

#### Entity Types

- `Task` with statuses: Inbox, Ready, InProgress, Blocked, Done, Dropped
- `Project` with statuses: Planning, Ready, Blocked, InProgress, Paused, Done
- `Area` with statuses: Active, Archived
- Builder types for creating entities: `NewTask`, `NewProject`, `NewArea`
- Update types for partial modifications: `TaskUpdates`, `ProjectUpdates`, `AreaUpdates`

#### Querying

- `TaskFilter` with filtering by status, project, area, due dates, scheduled dates, defer dates
- `ProjectFilter` with filtering by status and area
- `AreaFilter` with filtering by status
- Preset filters: `inbox()`, `today()`, `overdue()`, `upcoming()`, `available()`, `active()`
- Archive directory inclusion/exclusion

#### CRUD Operations

- Create tasks, projects, and areas with automatic timestamp generation
- Update entities with partial changes
- Delete entities
- Archive/unarchive tasks (move to/from archive subdirectory)
- Convenience methods: `complete_task()`, `drop_task()`, `start_task()`, `block_task()`
- Batch operations with `BatchResult` for tracking successes and failures

#### Cross-Entity Queries

- `get_tasks_for_project()` - Find all tasks belonging to a project
- `get_projects_for_area()` - Find all projects in an area
- `get_tasks_for_area()` - Find all tasks in an area (direct and via projects)

#### Validation

- Spec compliance validation for parsed entities
- `ValidationWarning` types for advisory issues (multiple projects, missing completed-at)
- `validate_task()` and `validate_all_tasks()` methods

#### File Watching

- `process_file_change()` for converting file system events to typed `VaultEvent`s
- `VaultEvent` enum with Created/Updated/Deleted variants for each entity type
- `watched_paths()` to get directories that should be monitored
- Built-in `FileWatcher` with debouncing (requires `watch` feature)

#### Performance

- Parallel file scanning using `rayon` for vault-wide operations
- Benchmarks validating performance targets:
  - Single file parse: ~8µs (target: <1ms)
  - In-memory filter (1000 tasks): ~27µs (target: <5ms)
  - Vault scan (1000 files): ~10ms (extrapolates to ~50ms for 5000 files; target: 200-500ms)

### Technical Details

- Uses `thiserror` for structured error types
- Uses `gray_matter` for frontmatter parsing
- Uses `chrono` for date/time handling
- Uses `serde_yaml` for YAML serialization
- Strict clippy lints enabled (pedantic + `unwrap_used`/`expect_used` warnings)
- No panics in library code - all errors returned as `Result`
- 270+ unit tests and 14 integration tests
