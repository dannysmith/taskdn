# Task 7: Reference Resolution

Implement WikiLink and path resolution for file references.

**Reference:** See `docs/developer/architecture-guide.md` for `FileReference` type.

## Scope

### FileReference Parsing (in `src/types/reference.rs`) - DONE
- [x] Implement `FileReference::parse(s: &str) -> Self`
- [x] `FileReference` enum with `WikiLink`, `RelativePath`, `Filename` variants
- [x] `[[Page Name]]` → `WikiLink { target: "Page Name", display: None }`
- [x] `[[Page Name|Display]]` → `WikiLink { target: "Page Name", display: Some("Display") }`
- [x] `[[Page Name#Heading]]` → strip `#Heading` from target
- [x] `./path/to/file.md` → `RelativePath("./path/to/file.md")`
- [x] `file.md` → `Filename("file.md")`
- [x] `Error::UnresolvedReference` variant exists in `src/error.rs`

### Resolution Module (`src/resolve.rs`) - DONE
- [x] Create `src/resolve.rs` module
- [x] Implement `Taskdn::resolve_project_reference(&self, reference: &FileReference) -> Result<PathBuf, Error>`
- [x] Implement `Taskdn::resolve_area_reference(&self, reference: &FileReference) -> Result<PathBuf, Error>`
- [x] Also implemented `Taskdn::resolve_task_reference` for completeness
- [x] Search configured directories for matches
- [x] Handle case sensitivity (uses filesystem behavior via `path.exists()`)

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

**WikiLink parsing:** (tests in `src/types/reference.rs`)
- [x] `[[Project Name]]` → extract "Project Name"
- [x] `[[Project Name|Display]]` → extract "Project Name", preserve display
- [x] `[[Project Name#Heading]]` → extract "Project Name", ignore heading

**Path resolution:** (tests in `src/resolve.rs`)
- [x] `[[Q1 Planning]]` → find `Q1 Planning.md` in projects_dir
- [x] `./projects/foo.md` → resolve relative path
- [x] `foo.md` → find in appropriate directory

**Edge cases:**
- [x] Reference to non-existent file → `Error::UnresolvedReference`
- [x] WikiLink with special characters (apostrophes, parentheses, spaces)
- [x] Case sensitivity (uses filesystem behavior)

## Notes

- Resolution depends on context (project references search projects_dir, etc.)
- Per spec: file references can be WikiLink, relative path, or filename
- Consider caching file listings for performance (optional optimization)
