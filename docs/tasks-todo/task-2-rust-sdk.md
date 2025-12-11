# Phase 2: Rust SDK

Core library for parsing, querying, and manipulating task files.

## Scope

- Parse markdown files with YAML frontmatter
- Validate against the specification
- CRUD operations for tasks, projects, and areas
- Query/filter capabilities (by status, project, area, dates, etc.)
- File watching for changes
- Expose safe, ergonomic APIs

## Notes

This is the foundation that the TypeScript SDK and CLI will build upon. Performance and correctness are critical.

- Must be **extremely** performant, hence Rust
- Strong type system
- Efficient batch writing of frontmatter fields across multiple files
- Simple "query language" for fetching tasks based on various criteria
- Memory-efficient for large numbers of files
- Handles changes on disk properly (file watcher?)
- Shippable as a standalone executable and cargo package
- Soft deletion
