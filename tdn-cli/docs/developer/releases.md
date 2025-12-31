# Releasing tdn-cli

This document covers how to release new versions of the CLI.

## Overview

Releases are triggered by pushing a git tag in the format `tdn-cli-v<version>`. The GitHub Actions workflow then:

1. Builds binaries for all 5 platforms
2. Creates archives with SHA256 checksums
3. Publishes a GitHub Release with all assets
4. Triggers an auto-update PR in the Homebrew tap

## Prerequisites

Before your first release, ensure:

1. **Homebrew tap exists**: `dannysmith/homebrew-taproom` with the formula and update workflow
2. **GitHub secret configured**: `HOMEBREW_TAP_TOKEN` in `taskdn/taskdn` repo settings

## Release Process

### 1. Prepare the release

From the `tdn-cli/` directory:

```bash
bun run release:prepare <version>
```

For example:
```bash
bun run release:prepare 1.0.0
```

This script:
- Updates version in `package.json`
- Updates version in `crates/core/Cargo.toml`
- Runs all checks (`bun run check`)
- Prompts to create a git commit and tag

### 2. Push the tag

If you didn't let the script create the commit/tag, do it manually:

```bash
git add -A
git commit -m "chore(cli): release v1.0.0"
git tag tdn-cli-v1.0.0
```

Then push:

```bash
git push origin main
git push origin tdn-cli-v1.0.0
```

### 3. Monitor the release

1. Go to [Actions](https://github.com/taskdn/taskdn/actions) and watch the "Release - CLI" workflow
2. Once complete, check the [Releases](https://github.com/taskdn/taskdn/releases) page
3. Verify all assets are present:
   - `tdn-darwin-arm64.tar.gz` + `.sha256`
   - `tdn-darwin-x64.tar.gz` + `.sha256`
   - `tdn-linux-arm64.tar.gz` + `.sha256`
   - `tdn-linux-x64.tar.gz` + `.sha256`
   - `tdn-windows-x64.zip` + `.sha256`
   - `install.sh`

### 4. Merge the Homebrew PR

1. Go to [homebrew-taproom PRs](https://github.com/dannysmith/homebrew-taproom/pulls)
2. Review the auto-generated PR (version and checksums should be updated)
3. Merge it

### 5. Verify installation

Test that users can install:

```bash
# Homebrew (if tap already added)
brew upgrade tdn

# Or fresh install
brew install dannysmith/taproom/tdn

# Verify
tdn --version
```

## Pre-releases

For beta/RC releases, use a pre-release version format:

```bash
bun run release:prepare 1.0.0-beta.1
git tag tdn-cli-v1.0.0-beta.1
git push origin tdn-cli-v1.0.0-beta.1
```

Pre-releases (versions containing `-`) will:
- Create a GitHub Release (marked as pre-release)
- **Not** trigger the Homebrew formula update

## Troubleshooting

### Build fails on a specific platform

Check the Actions logs. Common issues:
- Rust version mismatch (requires 1.85+)
- Missing dependencies on Linux ARM64

### Homebrew update not triggered

- Verify `HOMEBREW_TAP_TOKEN` secret exists and hasn't expired
- Check it's not a pre-release version (contains `-`)
- Check the workflow logs for dispatch errors

### Checksum mismatch in Homebrew

The formula update workflow fetches checksums from the release. If they don't match:
1. Check the `.sha256` files in the GitHub Release
2. Manually update `Formula/tdn.rb` if needed

## Local testing

To build a release binary locally:

```bash
./scripts/build-release.sh
```

This creates `dist/tdn-<platform>-<arch>` for your current platform.
