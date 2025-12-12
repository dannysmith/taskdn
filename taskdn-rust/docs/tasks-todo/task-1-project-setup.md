# Task 1: Project Setup

Set up proper Rust project boilerplate with all dependencies and tooling.

## Scope

- [ ] Create `Cargo.toml` with all dependencies from phase2 doc
- [ ] Set up project structure per phase2 doc (`src/lib.rs`, `src/error.rs`, etc.)
- [ ] Configure clippy (use `Cargo.toml` config)
- [ ] Configure rustfmt (`rustfmt.toml`)
- [ ] Set up test framework (unit tests in modules, integration tests in `tests/`)
- [ ] Create a `justfile` or `Makefile` for common commands (`check`, `test`, `lint`, `fmt`)
- [ ] Update `README.md` with project overview and development instructions
- [ ] Add basic structure to `docs/developer/architecture-guide.md`
- [ ] Ensure `cargo build`, `cargo test`, `cargo clippy`, `cargo fmt --check` all pass

## Dependencies to include

From phase2 doc:

```toml
[dependencies]
gray_matter = "0.3"
serde = { version = "1", features = ["derive"] }
thiserror = "1"
rayon = "1"

[dev-dependencies]
# Testing utilities as needed
```

## Notes

- Keep it minimal - only add what's needed now
- File watching deps (`notify`) will be added later as an optional feature
- This task is about infrastructure, not implementation
