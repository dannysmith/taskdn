# Task: CLI Distribution and Release Automation

**Work Directory:** `tdn-cli/` (with some files at repo root)

## Overview

Set up a production-ready distribution system for `tdn-cli` using Bun's standalone binary compilation. Users will be able to install via:

```bash
# Homebrew (macOS/Linux)
brew install taskdn/tdn/tdn

# Direct download
curl -fsSL https://github.com/taskdn/taskdn/releases/latest/download/install.sh | bash

# Manual download from GitHub Releases
```

## Architecture Decision: Bun Compile

We tested both approaches:

| Approach | Complexity | Binary Size | Runtime Required |
|----------|------------|-------------|------------------|
| Bun compile | Simple (1 binary per platform) | 63 MB | None |
| npm + NAPI-RS | Complex (7 packages to publish) | ~10 MB | Node.js (~50 MB) |

**Decision:** Use Bun compile.

**Rationale:**
- **Tested and working** — Bun compile successfully embeds NAPI-RS bindings (verified locally)
- **Much simpler** — No npm package coordination, no optionalDependencies bugs, no Node.js requirement
- **Acceptable size** — 63 MB is comparable to installing Node.js anyway; one-time download for daily use
- **Simpler CI/CD** — Build binaries, upload to GitHub Releases, done

**Key constraint:** Cannot cross-compile NAPI-RS binaries. Must build on each target platform (macOS builds on macOS, Linux on Linux, etc.).

## Prerequisites

Before starting:

1. Create GitHub repository: `taskdn/homebrew-tdn` for Homebrew tap
2. Create GitHub PAT for Homebrew updates (see "GitHub Secrets Required" section)
3. (Optional) Set up domain for install script hosting

## Phases

### Phase 1: Build Script and Local Testing

Create build scripts and verify binaries work on each platform.

**1.1: Add build scripts to package.json**

```json
{
  "scripts": {
    "build:binary": "bun build --compile --minify src/index.ts --outfile dist/tdn",
    "build:binary:release": "bun build --compile --minify --sourcemap src/index.ts --outfile dist/tdn"
  }
}
```

**1.2: Create build directory structure**

```
tdn-cli/
├── dist/           # Built binaries (gitignored)
├── scripts/
│   ├── build-release.sh   # Script for local builds
│   └── install.sh         # User install script
```

**1.3: Create build-release.sh**

```bash
#!/bin/bash
set -euo pipefail

# Build release binary for current platform (macOS/Linux only)
# Usage: ./scripts/build-release.sh

VERSION="${VERSION:-dev}"
PLATFORM="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

# Normalize architecture names
case "$ARCH" in
  x86_64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

OUTPUT_NAME="tdn-${PLATFORM}-${ARCH}"

echo "Building tdn v${VERSION} for ${PLATFORM}-${ARCH}..."

# Ensure bindings are built
bun run build

# Build standalone binary
bun build --compile --minify src/index.ts --outfile "dist/${OUTPUT_NAME}"

echo "Built: dist/${OUTPUT_NAME}"
ls -lh "dist/${OUTPUT_NAME}"
```

**1.4: Test locally**

```bash
chmod +x scripts/build-release.sh
./scripts/build-release.sh
./dist/tdn-darwin-arm64 --version
./dist/tdn-darwin-arm64 list tasks
```

**1.5: Update .gitignore**

```
# Build output
dist/
```

### Phase 2: GitHub Actions CI Workflow

Create CI workflow for testing on all platforms.

**2.1: Create `.github/workflows/ci-cli.yml`**

```yaml
name: CI - CLI

on:
  push:
    branches: [main]
    paths:
      - 'tdn-cli/**'
      - '.github/workflows/ci-cli.yml'
  pull_request:
    branches: [main]
    paths:
      - 'tdn-cli/**'
      - '.github/workflows/ci-cli.yml'

defaults:
  run:
    working-directory: tdn-cli

env:
  CARGO_TERM_COLOR: always

jobs:
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@1.85
      - run: bun install
      - run: bun run build  # Build NAPI bindings
      - run: bun run check

  test:
    name: Test - ${{ matrix.os }}
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@1.85
      - run: bun install
      - run: bun run build
      - run: bun run test

  build:
    name: Build Binary - ${{ matrix.target }}
    runs-on: ${{ matrix.runner }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: darwin-arm64
            runner: macos-latest
          - target: darwin-x64
            runner: macos-13
          - target: linux-x64
            runner: ubuntu-latest
          - target: linux-arm64
            runner: ubuntu-24.04-arm
          - target: windows-x64
            runner: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@1.85

      - name: Install dependencies
        run: bun install

      - name: Build NAPI bindings
        run: bun run build

      - name: Build standalone binary (Unix)
        if: matrix.target != 'windows-x64'
        run: bun build --compile --minify src/index.ts --outfile dist/tdn-${{ matrix.target }}

      - name: Build standalone binary (Windows)
        if: matrix.target == 'windows-x64'
        run: bun build --compile --minify src/index.ts --outfile dist/tdn-${{ matrix.target }}.exe

      - name: Test binary (Unix)
        if: matrix.target != 'windows-x64'
        run: ./dist/tdn-${{ matrix.target }} --version

      - name: Test binary (Windows)
        if: matrix.target == 'windows-x64'
        run: .\dist\tdn-${{ matrix.target }}.exe --version

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: tdn-${{ matrix.target }}
          path: tdn-cli/dist/tdn-${{ matrix.target }}*
          if-no-files-found: error
```

**Note on Linux ARM64:** The `ubuntu-24.04-arm` runner is available for public repos as of late 2024. If unavailable, options are:
- Use a self-hosted ARM runner
- Use QEMU emulation (slow but works): `runs-on: ubuntu-latest` with `uses: uraimo/run-on-arch-action@v3`
- Skip ARM64 initially and add later

### Phase 3: Release Workflow

Create release workflow triggered by version tags.

**3.1: Create `.github/workflows/release-cli.yml`**

```yaml
name: Release - CLI

on:
  push:
    tags:
      - 'tdn-cli-v*'

defaults:
  run:
    working-directory: tdn-cli

permissions:
  contents: write

env:
  CARGO_TERM_COLOR: always

jobs:
  build:
    name: Build - ${{ matrix.target }}
    runs-on: ${{ matrix.runner }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: darwin-arm64
            runner: macos-latest
          - target: darwin-x64
            runner: macos-13
          - target: linux-x64
            runner: ubuntu-latest
          - target: linux-arm64
            runner: ubuntu-24.04-arm
          - target: windows-x64
            runner: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - uses: dtolnay/rust-toolchain@1.85

      - name: Install dependencies
        run: bun install

      - name: Build NAPI bindings
        run: bun run build

      - name: Build standalone binary (Unix)
        if: matrix.target != 'windows-x64'
        run: bun build --compile --minify src/index.ts --outfile dist/tdn

      - name: Build standalone binary (Windows)
        if: matrix.target == 'windows-x64'
        run: bun build --compile --minify src/index.ts --outfile dist/tdn.exe

      - name: Create archive (Unix)
        if: matrix.target != 'windows-x64'
        run: |
          cd dist
          tar -czvf tdn-${{ matrix.target }}.tar.gz tdn
          sha256sum tdn-${{ matrix.target }}.tar.gz > tdn-${{ matrix.target }}.tar.gz.sha256
          rm tdn

      - name: Create archive (Windows)
        if: matrix.target == 'windows-x64'
        shell: bash
        run: |
          cd dist
          7z a -tzip tdn-${{ matrix.target }}.zip tdn.exe
          sha256sum tdn-${{ matrix.target }}.zip > tdn-${{ matrix.target }}.zip.sha256
          rm tdn.exe

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: tdn-${{ matrix.target }}
          path: |
            tdn-cli/dist/tdn-${{ matrix.target }}.tar.gz
            tdn-cli/dist/tdn-${{ matrix.target }}.tar.gz.sha256
            tdn-cli/dist/tdn-${{ matrix.target }}.zip
            tdn-cli/dist/tdn-${{ matrix.target }}.zip.sha256
          if-no-files-found: error

  release:
    name: Create GitHub Release
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts
          merge-multiple: true

      - name: Copy install script
        run: cp tdn-cli/scripts/install.sh artifacts/install.sh

      - name: List artifacts
        run: ls -la artifacts/

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/tdn-cli-v}" >> $GITHUB_OUTPUT

      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          name: tdn-cli v${{ steps.version.outputs.version }}
          generate_release_notes: true
          files: artifacts/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Trigger Homebrew update
        if: ${{ !contains(github.ref, '-') }}  # Skip for pre-releases (e.g., v1.0.0-beta)
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.HOMEBREW_TAP_TOKEN }}
          repository: taskdn/homebrew-tdn
          event-type: update-formula
          client-payload: '{"version": "${{ steps.version.outputs.version }}"}'
```

### Phase 4: Homebrew Tap

Set up Homebrew distribution.

**4.1: Create homebrew-tdn repository**

Create `taskdn/homebrew-tdn` repository with:

`Formula/tdn.rb`:
```ruby
class Tdn < Formula
  desc "Task management CLI for humans and AI agents"
  homepage "https://github.com/taskdn/taskdn"
  version "0.1.0"
  license "MIT"

  on_macos do
    on_arm do
      url "https://github.com/taskdn/taskdn/releases/download/tdn-cli-v#{version}/tdn-darwin-arm64.tar.gz"
      sha256 "PLACEHOLDER_DARWIN_ARM64"
    end
    on_intel do
      url "https://github.com/taskdn/taskdn/releases/download/tdn-cli-v#{version}/tdn-darwin-x64.tar.gz"
      sha256 "PLACEHOLDER_DARWIN_X64"
    end
  end

  on_linux do
    on_arm do
      url "https://github.com/taskdn/taskdn/releases/download/tdn-cli-v#{version}/tdn-linux-arm64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_ARM64"
    end
    on_intel do
      url "https://github.com/taskdn/taskdn/releases/download/tdn-cli-v#{version}/tdn-linux-x64.tar.gz"
      sha256 "PLACEHOLDER_LINUX_X64"
    end
  end

  def install
    bin.install "tdn"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/tdn --version")
  end
end
```

**4.2: Create auto-update workflow in homebrew-tdn repo**

`.github/workflows/update-formula.yml`:
```yaml
name: Update Formula

on:
  repository_dispatch:
    types: [update-formula]

permissions:
  contents: write
  pull-requests: write

jobs:
  update:
    runs-on: ubuntu-latest
    env:
      VERSION: ${{ github.event.client_payload.version }}
    steps:
      - uses: actions/checkout@v4

      - name: Download archives and calculate checksums
        run: |
          BASE_URL="https://github.com/taskdn/taskdn/releases/download/tdn-cli-v${VERSION}"

          # Download each archive and get checksum
          for target in darwin-arm64 darwin-x64 linux-arm64 linux-x64; do
            echo "Downloading ${target}..."
            curl -sL "${BASE_URL}/tdn-${target}.tar.gz.sha256" -o "${target}.sha256"
            # Extract just the hash (first field)
            HASH=$(cut -d' ' -f1 "${target}.sha256")
            echo "${target}=${HASH}" >> checksums.env
            echo "  ${target}: ${HASH}"
          done

      - name: Update formula
        run: |
          # Load checksums
          source checksums.env

          # Update version
          sed -i "s/version \".*\"/version \"${VERSION}\"/" Formula/tdn.rb

          # Update each sha256 placeholder
          sed -i "s/PLACEHOLDER_DARWIN_ARM64/${darwin_arm64:-PLACEHOLDER_DARWIN_ARM64}/" Formula/tdn.rb
          sed -i "s/PLACEHOLDER_DARWIN_X64/${darwin_x64:-PLACEHOLDER_DARWIN_X64}/" Formula/tdn.rb
          sed -i "s/PLACEHOLDER_LINUX_ARM64/${linux_arm64:-PLACEHOLDER_LINUX_ARM64}/" Formula/tdn.rb
          sed -i "s/PLACEHOLDER_LINUX_X64/${linux_x64:-PLACEHOLDER_LINUX_X64}/" Formula/tdn.rb

          # For subsequent updates, replace existing hashes (64 hex chars)
          sed -i "s/sha256 \"[a-f0-9]\{64\}\"/sha256 \"${darwin_arm64}\"/" Formula/tdn.rb || true

          echo "Updated Formula/tdn.rb:"
          cat Formula/tdn.rb

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "Update tdn to v${{ env.VERSION }}"
          commit-message: "Update tdn to v${{ env.VERSION }}"
          branch: "update-v${{ env.VERSION }}"
          body: |
            Automated update triggered by new release.

            **Version:** ${{ env.VERSION }}

            **Checksums:**
            - darwin-arm64: `${{ env.darwin_arm64 }}`
            - darwin-x64: `${{ env.darwin_x64 }}`
            - linux-arm64: `${{ env.linux_arm64 }}`
            - linux-x64: `${{ env.linux_x64 }}`
```

**Note:** The Homebrew formula update workflow above is simplified. For production, consider using a more robust approach like a dedicated script that properly parses and updates the Ruby formula.

### Phase 5: Install Script

Create a curl-installable script for direct downloads.

**5.1: Create `scripts/install.sh`**

```bash
#!/bin/bash
set -euo pipefail

# tdn-cli installer
# Usage: curl -fsSL https://github.com/taskdn/taskdn/releases/latest/download/install.sh | bash
#
# Environment variables:
#   TDN_VERSION     - Version to install (default: latest)
#   TDN_INSTALL_DIR - Installation directory (default: ~/.local/bin)
#   TDN_SKIP_VERIFY - Set to 1 to skip checksum verification

VERSION="${TDN_VERSION:-latest}"
INSTALL_DIR="${TDN_INSTALL_DIR:-$HOME/.local/bin}"
SKIP_VERIFY="${TDN_SKIP_VERIFY:-0}"

REPO="taskdn/taskdn"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

info() { echo -e "${GREEN}==>${NC} $1"; }
warn() { echo -e "${YELLOW}Warning:${NC} $1"; }
error() { echo -e "${RED}Error:${NC} $1" >&2; exit 1; }

# Check for required commands
command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
command -v tar >/dev/null 2>&1 || error "tar is required but not installed"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Darwin) PLATFORM="darwin" ;;
  Linux) PLATFORM="linux" ;;
  *) error "Unsupported operating system: $OS (only macOS and Linux are supported)" ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) error "Unsupported architecture: $ARCH" ;;
esac

TARGET="${PLATFORM}-${ARCH}"
info "Detected platform: ${TARGET}"

# Get version
if [ "$VERSION" = "latest" ]; then
  info "Fetching latest version..."
  # Filter for tdn-cli releases specifically
  VERSION=$(curl -sL "https://api.github.com/repos/${REPO}/releases" | \
    grep '"tag_name":' | \
    grep 'tdn-cli-v' | \
    head -1 | \
    sed -E 's/.*"tdn-cli-v([^"]+)".*/\1/')
  if [ -z "$VERSION" ]; then
    error "Failed to fetch latest version. Check your internet connection."
  fi
fi
info "Version: ${VERSION}"

# Construct download URLs
ARCHIVE="tdn-${TARGET}.tar.gz"
BASE_URL="https://github.com/${REPO}/releases/download/tdn-cli-v${VERSION}"
ARCHIVE_URL="${BASE_URL}/${ARCHIVE}"
CHECKSUM_URL="${BASE_URL}/${ARCHIVE}.sha256"

# Create temp directory
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Download archive
info "Downloading ${ARCHIVE}..."
if ! curl -fsSL "$ARCHIVE_URL" -o "$TMPDIR/$ARCHIVE"; then
  error "Failed to download ${ARCHIVE_URL}"
fi

# Verify checksum
if [ "$SKIP_VERIFY" != "1" ]; then
  info "Verifying checksum..."
  if curl -fsSL "$CHECKSUM_URL" -o "$TMPDIR/checksum.sha256" 2>/dev/null; then
    EXPECTED=$(cut -d' ' -f1 "$TMPDIR/checksum.sha256")
    if command -v sha256sum >/dev/null 2>&1; then
      ACTUAL=$(sha256sum "$TMPDIR/$ARCHIVE" | cut -d' ' -f1)
    elif command -v shasum >/dev/null 2>&1; then
      ACTUAL=$(shasum -a 256 "$TMPDIR/$ARCHIVE" | cut -d' ' -f1)
    else
      warn "Neither sha256sum nor shasum found, skipping verification"
      ACTUAL="$EXPECTED"
    fi
    if [ "$EXPECTED" != "$ACTUAL" ]; then
      error "Checksum mismatch!\n  Expected: ${EXPECTED}\n  Actual:   ${ACTUAL}"
    fi
    info "Checksum verified"
  else
    warn "Could not download checksum file, skipping verification"
  fi
fi

# Extract
info "Extracting..."
tar -xzf "$TMPDIR/$ARCHIVE" -C "$TMPDIR"

# Install
mkdir -p "$INSTALL_DIR"
mv "$TMPDIR/tdn" "$INSTALL_DIR/"
chmod +x "$INSTALL_DIR/tdn"

# Verify installation
if [ -x "$INSTALL_DIR/tdn" ]; then
  INSTALLED_VERSION=$("$INSTALL_DIR/tdn" --version 2>/dev/null || echo "unknown")
  info "Successfully installed tdn v${INSTALLED_VERSION} to ${INSTALL_DIR}/tdn"
else
  error "Installation failed - binary not executable"
fi

# Check if in PATH
if ! command -v tdn >/dev/null 2>&1; then
  echo ""
  warn "${INSTALL_DIR} is not in your PATH"
  echo ""
  echo "Add this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
  echo ""
  echo "  export PATH=\"\$PATH:${INSTALL_DIR}\""
  echo ""
  echo "Then restart your shell or run: source ~/.bashrc"
fi

echo ""
info "Run 'tdn --help' to get started"
```

### Phase 6: Release Automation (Optional)

Set up release-please for automated versioning and changelogs.

**6.1: Create release-please configuration**

Create `release-please-config.json` at repo root:

```json
{
  "packages": {
    "tdn-cli": {
      "release-type": "node",
      "package-name": "tdn-cli",
      "changelog-path": "CHANGELOG.md",
      "include-component-in-tag": true,
      "tag-separator": "-v"
    }
  }
}
```

Create `.release-please-manifest.json` at repo root:

```json
{
  "tdn-cli": "0.1.0"
}
```

**6.2: Create release-please workflow**

Create `.github/workflows/release-please.yml`:

```yaml
name: Release Please

on:
  push:
    branches:
      - main
    paths:
      - 'tdn-cli/**'

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

When you merge a PR with conventional commits (e.g., `feat(cli): add filter`), release-please will:
1. Create/update a "Release PR" with version bump and changelog
2. When merged, create a git tag `tdn-cli-v0.2.0`
3. The tag triggers the release workflow

## Testing Before First Release

Before pushing the workflows to main, test them:

**1. Test CI workflow locally with `act`:**
```bash
# Install act: brew install act
cd /path/to/taskdn
act -W .github/workflows/ci-cli.yml --job lint
```

**2. Do a test release:**
```bash
# Create a test tag (won't trigger Homebrew update due to pre-release format)
git tag tdn-cli-v0.0.1-test
git push origin tdn-cli-v0.0.1-test

# Watch the Actions tab on GitHub
# Verify artifacts are created correctly
# Delete the test release and tag when done
```

**3. Verify Homebrew tap manually:**
```bash
# After first real release, test the tap
brew tap taskdn/tdn
brew install tdn
tdn --version
```

## Verification

### Phase 1: Local Build
- [ ] `scripts/build-release.sh` creates working binary
- [ ] Binary runs `--version` correctly
- [ ] Binary can list tasks from demo vault
- [ ] Binary size is ~60-70MB

### Phase 2: CI Workflow
- [ ] Workflow triggers on tdn-cli changes only
- [ ] Lint job passes
- [ ] Tests pass on all 3 platforms (ubuntu, macos, windows)
- [ ] Binary builds succeed on all 5 targets
- [ ] Artifacts are uploaded correctly

### Phase 3: Release Workflow
- [ ] Workflow triggers on `tdn-cli-v*` tags
- [ ] All platform binaries are built and archived
- [ ] Per-file checksums (.sha256) are generated
- [ ] Install script is included in release
- [ ] GitHub Release is created with all assets
- [ ] Homebrew update is triggered (for non-pre-release tags)

### Phase 4: Homebrew
- [ ] `brew tap taskdn/tdn` works
- [ ] `brew install tdn` downloads correct binary for platform
- [ ] `tdn --version` works after install
- [ ] Formula auto-update PR is created on new releases

### Phase 5: Install Script
- [ ] `curl ... | bash` works on macOS ARM
- [ ] `curl ... | bash` works on macOS Intel
- [ ] `curl ... | bash` works on Linux x64
- [ ] Script detects platform correctly
- [ ] Script verifies checksums
- [ ] Script handles missing PATH gracefully

### End-to-End
- [ ] Fresh Homebrew install works on macOS ARM
- [ ] Fresh Homebrew install works on macOS Intel
- [ ] Fresh curl install works on Linux x64
- [ ] `tdn --version` shows correct version
- [ ] `tdn list tasks` works against demo vault

## Notes

### GitHub Secrets Required

| Secret | Purpose | How to Create |
|--------|---------|---------------|
| `HOMEBREW_TAP_TOKEN` | Trigger updates in homebrew-tdn repo | Create a fine-grained PAT with `repo` scope for `taskdn/homebrew-tdn` only |

**Creating HOMEBREW_TAP_TOKEN:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Create new token with:
   - Repository access: Only select repositories → `taskdn/homebrew-tdn`
   - Permissions: Contents (read/write), Pull requests (read/write)
3. Add as secret in `taskdn/taskdn` repo: Settings → Secrets → Actions → New repository secret

The default `GITHUB_TOKEN` is sufficient for creating releases in the main repo.

### Binary Size

The compiled binary is ~63MB. This includes:
- Bun runtime (~50MB)
- Bundled TypeScript code
- Embedded NAPI-RS Rust binary

This is acceptable because:
- One-time download for a tool used daily
- No runtime dependencies (no Node.js/Bun required)
- Comparable to installing a runtime anyway

### Platform Support

| Platform | Runner | Notes |
|----------|--------|-------|
| macOS ARM64 | macos-latest | Apple Silicon (M1/M2/M3) |
| macOS x64 | macos-13 | Intel Macs |
| Linux x64 | ubuntu-latest | Most common server/desktop |
| Linux ARM64 | ubuntu-24.04-arm | Raspberry Pi, ARM servers, AWS Graviton |
| Windows x64 | windows-latest | Most common |

**Not supported initially:**
- Windows ARM64 (no GitHub runner available)
- Linux x86 32-bit (rare, legacy)
- FreeBSD (would need cross-platform-actions)

### Rust Version

The project requires Rust 1.85+ (for edition 2024). The workflows pin to `dtolnay/rust-toolchain@1.85` to ensure consistent builds. Update this when bumping the MSRV.

### Cross-Compilation Limitation

NAPI-RS binaries cannot be cross-compiled. The Rust code must be compiled on the target platform. This is why we use platform-specific runners instead of cross-compiling from Linux.

### Conventional Commits

For release-please to work, use conventional commit format:

```
feat(cli): add new filter option
fix(cli): handle empty vault gracefully
docs(cli): update README
chore(cli): update dependencies
```

### Version Synchronization

Version appears in multiple places:
- `tdn-cli/package.json` — Source of truth
- `.release-please-manifest.json` — Updated by release-please
- Git tag — Created by release-please

release-please keeps these in sync automatically. For manual releases, update `package.json` first.

### Future Enhancements

- **Size optimization:** Monitor Bun's progress on smaller binaries ([bun#5854](https://github.com/oven-sh/bun/issues/5854))
- **Windows ARM64:** Add when GitHub provides runners
- **Code signing:** Sign binaries for macOS Gatekeeper and Windows SmartScreen
- **npm wrapper:** Publish thin npm package that downloads binary on postinstall (if there's demand)
- **Completions in Homebrew:** Add shell completion files to the Homebrew formula

## References

- [Bun Single-file Executable](https://bun.sh/docs/bundler/executables)
- [GitHub Actions: Creating Releases](https://docs.github.com/en/actions/publishing-packages)
- [Homebrew: How to Create a Tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
- [release-please](https://github.com/googleapis/release-please)
- [softprops/action-gh-release](https://github.com/softprops/action-gh-release)
- [peter-evans/repository-dispatch](https://github.com/peter-evans/repository-dispatch)
