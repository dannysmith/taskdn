# Task 2: API Design

Design the complete public API before writing implementation code.

## Scope

- [ ] Design and document the public API in `docs/developer/architecture-guide.md`
- [ ] Define all public types with their fields and methods
- [ ] Define error handling strategy (error types, when to return `Result` vs panic)
- [ ] Document the initialization pattern (`TaskdnConfig` → `Taskdn`)
- [ ] Design CRUD method signatures for tasks, projects, areas
- [ ] Design query/filter API (by status, project, area, dates)
- [ ] Design the file reference resolution API
- [ ] Consider ergonomics for common use cases
- [ ] Review against the specification to ensure completeness

## Key Design Decisions to Document

1. **Initialization**: `TaskdnConfig` struct, `Taskdn::new()` pattern
2. **Task/Project/Area structs**: Fields matching the spec exactly
3. **Enums**: `TaskStatus`, `ProjectStatus`, etc.
4. **Error types**: Granular errors vs single error enum
5. **Update pattern**: `TaskUpdates` struct for partial updates
6. **Query API**: Method chaining? Filter structs? Closures?
7. **File reference resolution**: API for WikiLinks, paths, filenames

## Deliverable

A comprehensive API design section in `architecture-guide.md` that serves as the blueprint for implementation. This should be detailed enough that someone could write tests against it.

## Notes

- This is a design exercise, not coding
- The goal is to think through the API before committing to it
- Consider how this will be consumed by NAPI-RS (TypeScript SDK) and Tauri
