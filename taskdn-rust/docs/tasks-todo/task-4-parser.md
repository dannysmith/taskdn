# Task 4: Parser

Implement frontmatter parsing using `gray_matter`.

## Scope

### Parser Module (`src/parser.rs`)
- [ ] Write failing tests for frontmatter extraction
- [ ] Write failing tests for YAML parsing into structs
- [ ] Write failing tests for edge cases (no frontmatter, empty frontmatter, malformed YAML)
- [ ] Implement `parse_frontmatter()` function using gray_matter
- [ ] Handle the `---` delimiter detection
- [ ] Extract raw YAML and markdown body separately
- [ ] Implement serde deserialization into Task/Project/Area structs
- [ ] Preserve unknown fields (store as `HashMap<String, Value>` or similar)
- [ ] Preserve the raw markdown body

## Test Cases

### Valid files
- Task with all required fields
- Task with all optional fields
- Task with unknown custom fields (must be preserved)
- Project and Area files

### Edge cases
- File with no frontmatter (just markdown)
- File with empty frontmatter (`---\n---`)
- File with only frontmatter (no body)
- Frontmatter with comments
- Multi-line string values

### Invalid files
- Malformed YAML (should return error, not panic)
- Missing `---` delimiter
- Invalid UTF-8

## Key Implementation Details

```rust
pub struct ParsedFile {
    /// Known fields deserialized into struct
    pub frontmatter: Frontmatter,
    /// Unknown fields preserved for round-tripping
    pub extra_fields: HashMap<String, serde_yaml::Value>,
    /// Raw markdown body (everything after second ---)
    pub body: String,
}

pub fn parse_file(content: &str) -> Result<ParsedFile, Error>;
```

## Notes

- gray_matter handles the delimiter detection
- Use serde's `#[serde(flatten)]` for extra fields if needed
- The parser should NOT validate - that's task 5
