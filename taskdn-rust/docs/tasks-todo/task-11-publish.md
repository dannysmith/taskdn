# Task 11: Cargo Publishing

Set up everything needed to publish as a proper crate on crates.io.

## Scope

### Cargo.toml Metadata
- [ ] Set proper `name` (taskdn? taskdn-core? taskdn-rust?)
- [ ] Set `version` (0.1.0 for initial release)
- [ ] Add `description`
- [ ] Add `license` (MIT? Apache-2.0? Both?)
- [ ] Add `repository` URL
- [ ] Add `documentation` URL
- [ ] Add `readme` path
- [ ] Add `keywords` (task-management, markdown, yaml, etc.)
- [ ] Add `categories` (command-line-utilities? development-tools?)
- [ ] Set `edition = "2021"`

### Pre-publish Checks
- [ ] Run `cargo publish --dry-run`
- [ ] Verify all files are included (check `.gitignore` vs `Cargo.toml` exclude)
- [ ] Ensure no large unnecessary files are included
- [ ] Verify examples compile
- [ ] Check that docs.rs will build correctly

### CI/CD Setup
- [ ] Set up GitHub Actions for CI (test, clippy, fmt)
- [ ] Consider automated publishing on tag/release
- [ ] Add badges to README (crates.io, docs.rs, CI status)

### Versioning Strategy
- [ ] Document versioning approach (semver)
- [ ] Set up CHANGELOG.md format
- [ ] Consider using `cargo-release` or similar

## Cargo.toml Example

```toml
[package]
name = "taskdn"
version = "0.1.0"
edition = "2021"
authors = ["Danny <email>"]
description = "Parse, query, and manipulate Taskdn task files"
license = "MIT OR Apache-2.0"
repository = "https://github.com/username/taskdn"
documentation = "https://docs.rs/taskdn"
readme = "README.md"
keywords = ["task-management", "markdown", "yaml", "productivity"]
categories = ["command-line-utilities", "parsing"]

[badges]
maintenance = { status = "actively-developed" }
```

## Notes

- Crate name availability should be checked early
- Consider reserving the name on crates.io before full implementation
- The TypeScript SDK (NAPI-RS) will depend on this crate
