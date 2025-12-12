# Task 5: Entity Validation

Implement spec-compliant validation beyond what the parser already does.

**Reference:** See `docs/developer/architecture-guide.md` for error types.

## What the Parser Already Validates (Task 4)

The parser (using serde + manual checks) already validates:
- Required fields: `title`, `status`, `created_at`, `updated_at` (for tasks)
- Status enum values (TaskStatus, ProjectStatus, AreaStatus)
- Date/datetime formats (ISO 8601, space-separated)
- FileReference format in `area` and `project` fields

These return `ContentMissingField` or `ContentInvalidField` errors (no path context).

## Remaining Validation Scope

### Task Validation
- [x] Warn/error if `projects` array has more than one element (spec says "exactly one")
- [x] Validate `completed_at` is set when status is `done` or `dropped` (advisory)
- [x] Add path context when converting `ParsedTask` -> `Task` via `with_path()`

### Project Validation
- Moved to Task 8 (SDK API): `taskdn-type: project` opt-in behavior (directory-level logic)

### Area Validation
- Moved to Task 8 (SDK API): `taskdn-type: area` opt-in behavior (directory-level logic)

### Validation Method Design

Consider adding a `validate()` method that can be called after parsing:

```rust
impl ParsedTask {
    /// Validate the parsed task against spec rules.
    /// Returns warnings/errors for spec violations.
    pub fn validate(&self) -> Vec<ValidationWarning>;
}

impl Task {
    /// Full validation with path context.
    pub fn validate(&self) -> Result<(), Error>;
}
```

## Error Types

For path-aware validation (after `with_path()`):
```rust
Error::MissingField { path: PathBuf, field: &'static str }
Error::InvalidField { path: PathBuf, field: &'static str, message: String }
Error::Validation { path: PathBuf, message: String }
```

## Notes

- Most validation is already done at parse time
- The `taskdn-type` opt-in logic may be better handled in the scanner (task 6)
- Consider whether violations should be warnings vs errors
- Per spec: "empty or null field values SHOULD be treated as if the field were absent"
