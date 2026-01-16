# Releases and Versioning

This document explains how versioning and releases work across the Taskdn monorepo.

## Philosophy

Each product is versioned **independently**. There is no synchronized version across products because:

- Products have different maturity levels (CLI may be v2.x while Desktop is v0.x)
- Products have different audiences who don't need to know about other products' versions
- Independent releases reduce friction (a typo fix in desktop shouldn't require releasing CLI)
- Version numbers have semantic meaning for each product independently

All versioned products use [Semantic Versioning](https://semver.org/).

## Version Locations

| Product | Version Source | Notes |
|---------|----------------|-------|
| tdn-cli | `tdn-cli/package.json` | Also synced to `tdn-cli/crates/core/Cargo.toml` |
| tdn-desktop | `tdn-desktop/package.json` | Also synced to `tdn-desktop/src-tauri/Cargo.toml` and `tauri.conf.json` |
| tdn-claude-plugin | `tdn-claude-plugin/.claude-plugin/plugin.json` | |
| obsidian-taskdn | External repo: `dannysmith/obsidian-taskdn` | `manifest.json` |
| tdn-specs (S1) | `tdn-specs/S1-core.md` header | `**Version:** X.Y.Z` |
| tdn-specs (S2) | `tdn-specs/S2-implementation-requirements.md` header | `**Version:** X.Y.Z` |

## Checking Versions

Run the version status command to see local versions vs latest published releases:

```bash
bun versions
```

This shows a table comparing local versions to published releases and highlights any products that are ahead (ready to release) or behind (something's wrong).

## Release Processes

### tdn-cli

| Step | Description |
|------|-------------|
| Trigger | Push tag `tdn-cli-v*` |
| Build | GitHub Actions builds binaries for all platforms |
| Distribution | GitHub Release created, PR auto-created in `dannysmith/homebrew-taproom` |

**To release:**

```bash
cd tdn-cli
bun run release:prepare 1.2.3
```

The script updates versions, runs checks, and optionally pushes the tag. See `tdn-cli/scripts/prepare-release.js`.

### tdn-desktop

| Step | Description |
|------|-------------|
| Trigger | Push tag `desktop-v*` |
| Build | GitHub Actions builds via Tauri for macOS, Windows, Linux |
| Distribution | Draft GitHub Release created; manually undraft to publish |

**To release:**

```bash
cd tdn-desktop
bun run release:prepare 0.2.0
```

See `tdn-desktop/scripts/prepare-release.js`.

### tdn-claude-plugin

| Step | Description |
|------|-------------|
| Trigger | Push to GitHub with updated version |
| Build | None (interpreted) |
| Distribution | Claude Code Marketplace picks up changes automatically |

**To release:**

1. Update version in `tdn-claude-plugin/.claude-plugin/plugin.json`
2. Commit and push to main
3. Marketplace syncs automatically

### obsidian-taskdn

This is in a **separate repository**: https://github.com/dannysmith/obsidian-taskdn

| Step | Description |
|------|-------------|
| Trigger | GitHub Release in that repo |
| Build | GitHub Actions builds the plugin |
| Distribution | GitHub Release; Obsidian community plugins auto-update |

See that repo's documentation for release instructions.

## Spec Versioning

The specifications (`tdn-specs/`) use a simple manual versioning approach:

- Version is stored in each spec's markdown header: `**Version:** X.Y.Z`
- Use `-draft` suffix for work-in-progress specs (e.g., `1.0.0-draft`)
- Remove `-draft` when the spec is stable

**When to bump versions:**

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking changes to required fields/behavior | Major | 1.0.0 → 2.0.0 |
| New optional fields or behaviors | Minor | 1.0.0 → 1.1.0 |
| Clarifications, typo fixes | Patch | 1.0.0 → 1.0.1 |

Spec changes are rare and significant, so no automation is needed.

## Unversioned Products

These products don't have release versions:

| Product | Reason |
|---------|--------|
| tdn-obsidian-extras | Collection of templates, no versioning needed |
| website | Deployed website, continuously updated |

## GitHub Actions Workflows

| Workflow | File | Trigger |
|----------|------|---------|
| CI - CLI | `.github/workflows/ci-cli.yml` | Push/PR to `tdn-cli/**` |
| Release - CLI | `.github/workflows/release-cli.yml` | Tag `tdn-cli-v*` |
| Release - Desktop | `.github/workflows/release-desktop.yml` | Tag `desktop-v*` |
