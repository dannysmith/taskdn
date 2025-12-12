# Task 6: Writer

Implement file writing with preservation of unknown fields and markdown body.

**Reference:** See `docs/developer/architecture-guide.md` for automatic behaviors.

## Scope

### Writer Module (`src/writer.rs`)
- [ ] Implement `Task::to_string()` → serialize to file content
- [ ] Implement internal write function for creating/updating files
- [ ] Preserve unknown frontmatter fields (`extra`)
- [ ] Preserve markdown body exactly (byte-for-byte)
- [ ] Preserve YAML field order where possible
- [ ] Automatically update `updated_at` on every write
- [ ] Automatically set `completed_at` when status changes to `Done` or `Dropped`
- [ ] Preserve original date format (date vs datetime) using `DateTimeValue`

### Test Cases

**Round-trip preservation:**
- [ ] Parse file → write file → content matches (for unchanged files)
- [ ] Unknown fields survive the round-trip
- [ ] Markdown body is byte-for-byte identical
- [ ] Date format is preserved (date stays date, datetime stays datetime)

**Field updates:**
- [ ] Update single field → only that field changes (plus `updated_at`)
- [ ] Update status to `Done` → `completed_at` is set automatically
- [ ] Update status to `Dropped` → `completed_at` is set automatically
- [ ] Every write → `updated_at` is updated

**Edge cases:**
- [ ] File with complex markdown (code blocks, tables, etc.)
- [ ] File with YAML comments (preserve if possible)
- [ ] File with unusual field ordering

## Key Implementation

```rust
impl Task {
    /// Serialize to file content (frontmatter + body)
    pub fn to_string(&self) -> String;
}

// Internal write function used by Taskdn
fn write_task(path: &Path, task: &Task) -> Result<(), Error>;
```

## Notes

- Spec requirement: "Implementations MUST preserve unknown frontmatter fields when modifying files"
- Spec requirement: "Implementations MUST preserve the Markdown body when modifying frontmatter"
- Use read-modify-write pattern internally for updates
- `created_at` is only set on creation, never modified
