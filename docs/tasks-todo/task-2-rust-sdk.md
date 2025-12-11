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
