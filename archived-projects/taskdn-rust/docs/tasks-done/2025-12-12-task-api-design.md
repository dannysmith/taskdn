# Task 2: API Design

Design the complete public API before writing implementation code.

## Status: COMPLETE

The API has been designed and documented in `docs/developer/architecture-guide.md`.

## Key Decisions Made

1. **Stateless SDK** — `Taskdn` holds config, not cached data. Every query reads from disk.
2. **Path as identifier** — File paths are the primary identifier for all entities.
3. **Filter struct with builders** — `TaskFilter` struct for queries, with builder methods for ergonomics.
4. **Double-Option for updates** — `TaskUpdates` uses `Option<Option<T>>` to distinguish "don't change" from "clear".
5. **Separate ParsedTask type** — `Task` always has a path; `ParsedTask` is for parsing without I/O.
6. **Best-effort batch operations** — `BatchResult<T>` for partial success reporting.
7. **Automatic timestamps** — SDK manages `created_at`, `updated_at`, `completed_at`.
8. **Preserve unknown fields** — Round-trip preservation of extra frontmatter and markdown body.

## Reference

See `docs/developer/architecture-guide.md` for the complete API specification.
