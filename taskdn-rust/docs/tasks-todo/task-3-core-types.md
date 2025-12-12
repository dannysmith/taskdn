# Task 3: Core Types

Implement foundational types: errors, config, and core structs/enums.

## Scope

### Error Types (`src/error.rs`)
- [ ] Write failing tests for error types
- [ ] Define `Error` enum with `thiserror`
- [ ] Include variants for: parse errors, validation errors, IO errors, reference resolution errors
- [ ] Ensure errors are informative (include file paths, field names, etc.)

### Config (`src/config.rs`)
- [ ] Write failing tests for config
- [ ] Define `TaskdnConfig` struct with `tasks_dir`, `projects_dir`, `areas_dir`
- [ ] Add validation (directories exist, are readable, etc.)
- [ ] Consider a builder pattern if configuration gets complex

### Core Structs and Enums
- [ ] Write failing tests for struct construction and enum values
- [ ] Define `TaskStatus` enum matching spec (inbox, icebox, ready, in-progress, blocked, dropped, done)
- [ ] Define `ProjectStatus` enum matching spec (planning, ready, blocked, in-progress, paused, done)
- [ ] Define `Task` struct with all required and optional fields from spec
- [ ] Define `Project` struct with all fields from spec
- [ ] Define `Area` struct with all fields from spec
- [ ] Define `FileReference` type for WikiLinks/paths

## TDD Approach

For each type:
1. Write tests for valid construction
2. Write tests for invalid states (if applicable)
3. Write tests for serialization/display
4. Implement to make tests pass

## Notes

- These are just type definitions - no parsing or validation logic yet
- Focus on matching the specification exactly
- Use `Option<T>` for optional fields
- Consider `#[non_exhaustive]` for enums to allow future additions
