# Task 3: Core Types

Implement foundational types: errors, config, and core structs/enums.

**Reference:** See `docs/developer/architecture-guide.md` for type definitions.

## Scope

### Error Types (`src/error.rs`)
- [ ] Define `Error` enum with `thiserror` (see architecture guide for variants)
- [ ] Ensure errors include context (file paths, field names, etc.)
- [ ] Implement `#[non_exhaustive]` for future extensibility

### Config (`src/config.rs`)
- [ ] Define `TaskdnConfig` struct with `tasks_dir`, `projects_dir`, `areas_dir`
- [ ] Add validation (directories exist, are readable)

### Status Enums (`src/types/`)
- [ ] `TaskStatus` enum with `#[non_exhaustive]` (inbox, icebox, ready, in-progress, blocked, dropped, done)
- [ ] `ProjectStatus` enum (planning, ready, blocked, in-progress, paused, done)
- [ ] `AreaStatus` enum (active, archived)
- [ ] Implement `FromStr`, `as_str()`, `is_completed()`, `is_active()` for each

### DateTimeValue (`src/types/datetime.rs`)
- [ ] `DateTimeValue` enum with `Date(NaiveDate)` and `DateTime(NaiveDateTime)` variants
- [ ] Methods: `date()`, `datetime()`, `is_date_only()`
- [ ] Implement serialization that preserves original format

### FileReference (`src/types/reference.rs`)
- [ ] `FileReference` enum: `WikiLink`, `RelativePath`, `Filename`
- [ ] `parse()` method for string parsing
- [ ] `display_name()` method
- [ ] Implement `From<&str>` for convenient construction

### Entity Structs
- [ ] `Task` struct with path and all frontmatter fields
- [ ] `Project` struct with path and all frontmatter fields
- [ ] `Area` struct with path and all frontmatter fields
- [ ] `ParsedTask`, `ParsedProject`, `ParsedArea` (without path, for parsing API)
- [ ] Helper methods: `filename()`, `is_archived()`, `is_active()`

### Creation/Update Types
- [ ] `NewTask`, `NewProject`, `NewArea` (for creating new entities)
- [ ] `TaskUpdates`, `ProjectUpdates`, `AreaUpdates` (double-Option pattern for partial updates)

### Filter Types (`src/filter.rs`)
- [ ] `TaskFilter` with all filter fields and builder methods
- [ ] `ProjectFilter` and `AreaFilter`
- [ ] Preset filters: `TaskFilter::inbox()`, `TaskFilter::today()`, etc.

### Result Types
- [ ] `BatchResult<T>` for partial success reporting

## TDD Approach

For each type:
1. Write tests for construction and field access
2. Write tests for serialization/deserialization
3. Write tests for helper methods
4. Implement to make tests pass

## Notes

- Use `Option<T>` for optional fields
- Use `HashMap<String, serde_yaml::Value>` for `extra` fields
- Use `NaiveDate` directly for date-only fields (scheduled, defer_until)
- Use `DateTimeValue` for date-or-datetime fields
