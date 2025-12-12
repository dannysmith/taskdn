# Task 5: Entity Validation

Implement spec-compliant validation for Task, Project, and Area entities.

## Scope

### Task Validation (`src/task.rs`)
- [ ] Write failing tests for valid tasks
- [ ] Write failing tests for invalid tasks (missing required fields, invalid status, etc.)
- [ ] Validate required fields: `title`, `status`, `created-at`, `updated-at`
- [ ] Validate `status` is one of the allowed values
- [ ] Validate date/datetime formats (ISO 8601)
- [ ] Validate `projects` is an array with exactly one element (if present)
- [ ] Validate file references in `area` and `projects` fields

### Project Validation (`src/project.rs`)
- [ ] Write failing tests for valid/invalid projects
- [ ] Validate required field: `title`
- [ ] Validate optional `status` is one of allowed values
- [ ] Validate date formats for `start-date`, `end-date`
- [ ] Handle `taskdn-type: project` opt-in behavior

### Area Validation (`src/area.rs`)
- [ ] Write failing tests for valid/invalid areas
- [ ] Validate required field: `title`
- [ ] Handle `taskdn-type: area` opt-in behavior

## Validation Rules from Spec

### Dates
- Must be ISO 8601: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`
- Space-separated datetime is also valid: `YYYY-MM-DD HH:MM`
- Timezone suffixes may be present and should be preserved

### Task Status Values
`inbox`, `icebox`, `ready`, `in-progress`, `blocked`, `dropped`, `done`

### Project Status Values
`planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`

## Error Reporting

Validation errors should be informative:
```rust
Error::ValidationError {
    file: PathBuf,
    field: String,
    message: String,
}
```

## Notes

- Validation happens after parsing
- Invalid files should return `Result::Err`, not panic
- Per spec: "empty or null field values SHOULD be treated as if the field were absent"
