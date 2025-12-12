# Task 7: Reference Resolution

Implement WikiLink and path resolution for file references.

**Reference:** See `docs/developer/architecture-guide.md` for `FileReference` type.

## Scope

### Reference Module (`src/resolve.rs`)
- [ ] Implement `FileReference::parse(s: &str) -> Self`
- [ ] Implement `Taskdn::resolve_project_reference(&self, reference: &FileReference) -> Result<PathBuf, Error>`
- [ ] Implement `Taskdn::resolve_area_reference(&self, reference: &FileReference) -> Result<PathBuf, Error>`
- [ ] Search configured directories for matches
- [ ] Handle case sensitivity (match filesystem behavior)
- [ ] Return `Error::UnresolvedReference` for missing files

### FileReference Parsing

```rust
pub enum FileReference {
    WikiLink { target: String, display: Option<String> },
    RelativePath(String),
    Filename(String),
}
```

**Parsing rules:**
- `[[Page Name]]` → `WikiLink { target: "Page Name", display: None }`
- `[[Page Name|Display]]` → `WikiLink { target: "Page Name", display: Some("Display") }`
- `[[Page Name#Heading]]` → `WikiLink { target: "Page Name", display: None }` (ignore heading)
- `./path/to/file.md` → `RelativePath("./path/to/file.md")`
- `file.md` → `Filename("file.md")`

### Resolution Logic

**WikiLink resolution:**
1. Look for `{target}.md` in the appropriate directory
2. If not found, return `Error::UnresolvedReference`

**RelativePath resolution:**
1. Resolve relative to the configured directory
2. Verify file exists

**Filename resolution:**
1. Look for exact filename in the appropriate directory
2. If not found, return `Error::UnresolvedReference`

### Test Cases

**WikiLink parsing:**
- [ ] `[[Project Name]]` → extract "Project Name"
- [ ] `[[Project Name|Display]]` → extract "Project Name", preserve display
- [ ] `[[Project Name#Heading]]` → extract "Project Name", ignore heading

**Path resolution:**
- [ ] `[[Q1 Planning]]` → find `Q1 Planning.md` in projects_dir
- [ ] `./projects/foo.md` → resolve relative path
- [ ] `foo.md` → find in appropriate directory

**Edge cases:**
- [ ] Reference to non-existent file → `Error::UnresolvedReference`
- [ ] WikiLink with special characters
- [ ] Case-insensitive matching (platform-dependent)

## Notes

- Resolution depends on context (project references search projects_dir, etc.)
- Per spec: file references can be WikiLink, relative path, or filename
- Consider caching file listings for performance (optional optimization)
