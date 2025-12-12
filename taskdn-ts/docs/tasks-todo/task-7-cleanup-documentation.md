# Task 7: Cleanup and Documentation

Final polish before publishing.

## Code Review Checklist

### Rust Code (`src/lib.rs`)

- [ ] Consistent naming (camelCase for JS-facing, snake_case internal)
- [ ] All methods have doc comments
- [ ] Error messages are clear and actionable
- [ ] No `unwrap()` or `expect()` - all errors handled
- [ ] Type conversions are complete and correct
- [ ] No dead code or commented-out sections

### Generated Types (`index.d.ts`)

- [ ] All types have JSDoc comments (from Rust doc comments)
- [ ] Parameter names are clear
- [ ] Optional fields correctly marked
- [ ] No `any` types

### Error Handling

- [ ] All Rust errors convert to meaningful JS errors
- [ ] Error messages include context (file paths, etc.)
- [ ] Errors are catchable in JS try/catch

## Documentation Updates

### README.md

- [ ] Installation instructions correct
- [ ] Basic usage example works
- [ ] All major features documented
- [ ] Link to full API docs

### CLAUDE.md

- [ ] Development commands up to date
- [ ] Testing instructions complete
- [ ] API consistency section added
- [ ] Common issues/troubleshooting

### Inline Documentation

- [ ] Complex type conversions explained
- [ ] Non-obvious design decisions documented

## Consistency Checks

### With Rust SDK

- [ ] All public Rust SDK methods exposed
- [ ] Type names match (allowing for camelCase conversion)
- [ ] Behavior matches Rust SDK

### With Specification

- [ ] Status values match spec exactly
- [ ] Field names match spec (with camelCase conversion)
- [ ] Required/optional fields correct

## Files to Review

- `src/lib.rs` - Main NAPI bindings
- `README.md` - User-facing docs
- `CLAUDE.md` - Developer docs
- `package.json` - Metadata correct

## Final Verification

```bash
# Clean build
rm -rf target node_modules *.node index.js index.d.ts
bun install
bun run build

# All tests pass
bun test

# Types look correct
cat index.d.ts
```
