# Task 6: Writer

Implement file writing with preservation of unknown fields and markdown body.

**Reference:** See `docs/developer/architecture-guide.md` for automatic behaviors.

## Already Implemented (leverage these)

- `DateTimeValue::Display` - preserves date vs datetime format
- `FileReference::Display` - preserves WikiLink/RelativePath/Filename format

## Scope

### Writer Module (`src/writer.rs`)

**Task serialization:**
- [ ] Implement `Task::to_string()` → serialize to file content
- [ ] Implement `ParsedTask::to_string()` (same logic, no path)
- [ ] Do NOT serialize `projects_count` (validation metadata only)

**Project/Area serialization:**
- [ ] Implement `Project::to_string()` and `ParsedProject::to_string()`
- [ ] Implement `Area::to_string()` and `ParsedArea::to_string()`

**File writing:**
- [ ] Implement internal write function for creating/updating files
- [ ] Preserve unknown frontmatter fields (`extra`)
- [ ] Preserve markdown body exactly (byte-for-byte)
- [ ] YAML field order: use consistent ordering (serde_yaml doesn't guarantee preservation)
- [ ] Automatically update `updated_at` on every write
- [ ] Automatically set `completed_at` when status changes to `Done` or `Dropped`
- [ ] Use existing `DateTimeValue::Display` for date format preservation
- [ ] Use existing `FileReference::Display` for reference format preservation

### Test Cases

**Round-trip preservation (Task, Project, Area):**
- [ ] Parse file → write file → parse again → values match
- [ ] Unknown fields survive the round-trip
- [ ] Markdown body is byte-for-byte identical
- [ ] Date format is preserved (date stays date, datetime stays datetime)
- [ ] FileReference format is preserved (WikiLink stays WikiLink, etc.)
- [ ] `projects_count` is NOT present in output

**Field updates:**
- [ ] Update single field → only that field changes (plus `updated_at`)
- [ ] Update status to `Done` → `completed_at` is set automatically
- [ ] Update status to `Dropped` → `completed_at` is set automatically
- [ ] Every write → `updated_at` is updated

**Edge cases:**
- [ ] File with complex markdown (code blocks, tables, etc.)
- [ ] Empty body (just frontmatter)
- [ ] All optional fields missing

## Key Implementation

```rust
impl Task {
    /// Serialize to file content (frontmatter + body)
    pub fn to_string(&self) -> String;
}

impl Project {
    pub fn to_string(&self) -> String;
}

impl Area {
    pub fn to_string(&self) -> String;
}

// Internal write functions used by Taskdn SDK
pub(crate) fn write_task(path: &Path, task: &Task) -> Result<(), Error>;
pub(crate) fn write_project(path: &Path, project: &Project) -> Result<(), Error>;
pub(crate) fn write_area(path: &Path, area: &Area) -> Result<(), Error>;
```

## Notes

- Spec requirement: "Implementations MUST preserve unknown frontmatter fields when modifying files"
- Spec requirement: "Implementations MUST preserve the Markdown body when modifying frontmatter"
- Use read-modify-write pattern internally for updates
- `created_at` is only set on creation, never modified
- YAML comments are NOT preserved (serde_yaml limitation, acceptable per spec "SHOULD")
