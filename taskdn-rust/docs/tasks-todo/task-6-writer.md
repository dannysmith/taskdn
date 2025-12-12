# Task 6: Writer

Implement file writing with preservation of unknown fields and markdown body.

## Scope

### Writer Module (`src/writer.rs`)
- [ ] Write failing tests for round-trip preservation
- [ ] Write failing tests for field updates
- [ ] Write failing tests for automatic timestamp updates
- [ ] Implement `write_file()` function
- [ ] Preserve unknown frontmatter fields
- [ ] Preserve markdown body exactly (no modifications)
- [ ] Preserve YAML formatting where possible (field order, comments)
- [ ] Automatically update `updated-at` on every write
- [ ] Automatically set `completed-at` when status changes to `done` or `dropped`

## Test Cases

### Round-trip preservation
- Parse file → write file → content should match (for unchanged files)
- Unknown fields must survive the round-trip
- Markdown body must be byte-for-byte identical

### Field updates
- Update single field → only that field changes
- Update status to `done` → `completed-at` is set automatically
- Update status to `dropped` → `completed-at` is set automatically
- Every write → `updated-at` is updated

### Edge cases
- File with complex markdown (code blocks, tables, etc.)
- File with YAML comments (should preserve if possible)
- File with unusual field ordering

## Key Implementation

```rust
pub fn write_task(
    path: &Path,
    task: &Task,
    extra_fields: &HashMap<String, Value>,
    body: &str,
) -> Result<(), Error>;

// Or an update pattern:
pub fn update_task(
    path: &Path,
    updates: TaskUpdates,
) -> Result<(), Error>;
```

## Notes

- The spec says: "Implementations MUST preserve unknown frontmatter fields when modifying files"
- The spec says: "Implementations MUST preserve the Markdown body when modifying frontmatter"
- Consider using a "read-modify-write" pattern internally
