# Task 5: Entity Validation

Implement spec-compliant validation for Task, Project, and Area entities.

**Reference:** See `docs/developer/architecture-guide.md` for error types.

## Scope

### Task Validation
- [ ] Validate required fields: `title`, `status`, `created_at`, `updated_at`
- [ ] Validate `status` is a valid `TaskStatus` value
- [ ] Validate date/datetime formats (ISO 8601)
- [ ] Validate `projects` is an array with exactly one element (if present)
- [ ] Validate `FileReference` format in `area` and `project` fields
- [ ] Return `Error::MissingField` or `Error::InvalidField` as appropriate

### Project Validation
- [ ] Validate required field: `title`
- [ ] Validate optional `status` is a valid `ProjectStatus` value
- [ ] Validate date formats for `start_date`, `end_date`
- [ ] Handle `taskdn-type: project` opt-in behavior (if one file has it, all others without are ignored)

### Area Validation
- [ ] Validate required field: `title`
- [ ] Validate optional `status` is a valid `AreaStatus` value
- [ ] Handle `taskdn-type: area` opt-in behavior

## Validation Rules from Spec

### Dates
- ISO 8601: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`
- Space-separated: `YYYY-MM-DD HH:MM`
- Timezone suffixes may be present and should be preserved

### Status Values
- **Task:** `inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`
- **Project:** `planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`
- **Area:** `active`, `archived`

## Error Types

```rust
Error::MissingField { path: PathBuf, field: &'static str }
Error::InvalidField { path: PathBuf, field: &'static str, message: String }
Error::Validation { path: PathBuf, message: String }
```

## Notes

- Validation happens after parsing
- Invalid files return `Result::Err`, never panic
- Per spec: "empty or null field values SHOULD be treated as if the field were absent"
- The `ParsedTask::with_path()` method should validate before returning `Task`
