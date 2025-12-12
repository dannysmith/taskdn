# Releasing taskdn

This document describes how to release new versions of the `taskdn` crate.

## Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking API changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

While in 0.x.y, minor versions may include breaking changes.

## Release Checklist

1. **Update version** in `Cargo.toml`

2. **Update CHANGELOG.md**
   - Add new version section with date
   - Move unreleased changes under the new version
   - Follow [Keep a Changelog](https://keepachangelog.com/) format

3. **Run checks**
   ```bash
   just check              # or: cargo fmt --check && cargo clippy -- -D warnings && cargo test
   cargo publish --dry-run
   ```

4. **Commit and tag**
   ```bash
   git add -A
   git commit -m "Release v0.x.y"
   git tag v0.x.y
   git push && git push --tags
   ```

5. **Publish to crates.io**
   ```bash
   cargo publish
   ```

## Breaking Changes

When making breaking changes:

1. Document in CHANGELOG under "Changed" or "Removed"
2. Consider providing migration guidance
3. Use `#[deprecated]` for one release before removing

## Pre-1.0 Policy

Until 1.0:
- API may change between minor versions
- Focus on getting the API right over stability
- Document breaking changes clearly in CHANGELOG
