# Task 7: Reference Resolution

Implement WikiLink and path resolution for file references.

## Scope

### Reference Module (`src/reference.rs`)
- [ ] Write failing tests for WikiLink parsing
- [ ] Write failing tests for path resolution
- [ ] Write failing tests for ambiguous/missing references
- [ ] Parse WikiLink format: `[[Page Name]]`, `[[Page Name|Display Text]]`, `[[Page Name#Heading]]`
- [ ] Resolve relative paths: `./projects/foo.md`
- [ ] Resolve filenames: `foo.md`
- [ ] Search configured directories for matches
- [ ] Handle case sensitivity (platform-dependent?)
- [ ] Handle ambiguous matches (multiple files with same name)

## Test Cases

### WikiLink parsing
- `[[Project Name]]` → extract "Project Name"
- `[[Project Name|Display]]` → extract "Project Name", ignore display text
- `[[Project Name#Heading]]` → extract "Project Name", ignore heading

### Path resolution
- `[[Q1 Planning]]` → find `Q1 Planning.md` in projects_dir
- `./projects/foo.md` → resolve relative to current file
- `foo.md` → search in appropriate directory

### Edge cases
- Reference to non-existent file → return error
- Multiple files match (e.g., `foo.md` exists in multiple directories)
- WikiLink with special characters
- Case-insensitive matching (optional?)

## API Design

```rust
pub enum FileReference {
    WikiLink { name: String, display: Option<String>, heading: Option<String> },
    RelativePath(PathBuf),
    Filename(String),
}

impl FileReference {
    pub fn parse(s: &str) -> Result<Self, Error>;
}

impl Taskdn {
    pub fn resolve_reference(&self, reference: &FileReference) -> Result<PathBuf, Error>;

    // Convenience method
    pub fn resolve_reference_str(&self, s: &str) -> Result<PathBuf, Error>;
}
```

## Notes

- Per spec: file references can be WikiLink, relative path, or filename
- Resolution depends on configured directories (tasks_dir, projects_dir, areas_dir)
- Consider caching file listings for performance
