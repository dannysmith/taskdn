# Task 4: Parser

Implement frontmatter parsing using `gray_matter`.

**Reference:** See `docs/developer/architecture-guide.md` for `ParsedTask` type.

## Scope

### Parser Module (`src/parser.rs`)
- [ ] Implement `ParsedTask::parse(content: &str) -> Result<Self, Error>`
- [ ] Implement `ParsedProject::parse()` and `ParsedArea::parse()`
- [ ] Use `gray_matter` for frontmatter extraction
- [ ] Preserve unknown fields in `extra: HashMap<String, serde_yaml::Value>`
- [ ] Preserve markdown body exactly
- [ ] Handle `DateTimeValue` parsing (preserve date vs datetime format)

### Test Cases

**Valid files:**
- [ ] Task with all required fields
- [ ] Task with all optional fields
- [ ] Task with unknown custom fields (must be preserved)
- [ ] Project and Area files
- [ ] Date-only values (`2025-01-15`)
- [ ] DateTime values (`2025-01-15T14:30`)
- [ ] Space-separated datetime (`2025-01-15 14:30`)

**Edge cases:**
- [ ] File with no frontmatter (just markdown) → error for tasks
- [ ] File with empty frontmatter (`---\n---`)
- [ ] File with only frontmatter (no body)
- [ ] Frontmatter with comments
- [ ] Multi-line string values
- [ ] WikiLink parsing in project/area fields

**Invalid files:**
- [ ] Malformed YAML → `Error::Parse`
- [ ] Missing `---` delimiter → `Error::Parse`
- [ ] Invalid UTF-8 → `Error::Io`

## Key Implementation

```rust
impl ParsedTask {
    pub fn parse(content: &str) -> Result<Self, Error>;
    pub fn with_path(self, path: impl Into<PathBuf>) -> Task;
}

impl Task {
    pub fn to_string(&self) -> String;  // Serialize back to file content
}
```

## Notes

- `gray_matter` handles delimiter detection
- Parser extracts but does NOT validate (validation is task 5)
- Use `serde_yaml::Value` for unknown fields
- Preserve the original date/datetime format for round-tripping
