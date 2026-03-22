# Task: Distribute tdn CLI via npm

## Background

The tdn CLI is currently distributed via:
- **Homebrew** (`brew install dannysmith/taproom/tdn`)
- **GitHub Releases** (standalone binaries via `install.sh`)

GitHub Releases don't work in Claude Desktop Cowork because the proxy blocks `release-assets.githubusercontent.com`. The Cowork VM does have Node.js and npm, and `registry.npmjs.org` is on the default allowlist. Publishing to npm solves distribution for Cowork and makes installation easier for anyone with Node.js.

**Goal:** `npm install -g @taskdn/cli` installs the `tdn` command on all supported platforms.

## Approach

Follow the established pattern used by esbuild, biome, turbo, and lefthook:

1. **Platform-specific packages** contain the pre-compiled binary + `os`/`cpu` fields so npm only downloads the matching one
2. **A main wrapper package** (`@taskdn/cli`) lists all platform packages as `optionalDependencies` and provides a small Node.js bin script that resolves and spawns the right binary

Use **npm Trusted Publishing** (OIDC) so GitHub Actions can publish without storing npm tokens.

### Package Structure

```
@taskdn/cli                  # Main wrapper (~5KB)
@taskdn/cli-darwin-arm64     # macOS Apple Silicon
@taskdn/cli-darwin-x64       # macOS Intel
@taskdn/cli-linux-arm64      # Linux ARM64 (Cowork, Raspberry Pi)
@taskdn/cli-linux-x64        # Linux x64
@taskdn/cli-win32-x64        # Windows x64
```

Matches the existing 5 build targets in `release-cli.yml`. More targets (musl, windows-arm64) can be added later.

### File Layout in Monorepo

```
tdn-cli/npm/
├── cli/                         # @taskdn/cli
│   ├── bin/
│   │   └── tdn                  # Node.js wrapper script
│   └── package.json
├── cli-darwin-arm64/
│   └── package.json             # Binary added at build time by CI
├── cli-darwin-x64/
│   └── package.json
├── cli-linux-arm64/
│   └── package.json
├── cli-linux-x64/
│   └── package.json
└── cli-win32-x64/
    └── package.json
```

### How the Wrapper Script Works

The `bin/tdn` script in `@taskdn/cli`:
1. Reads `process.platform` and `process.arch`
2. Maps to a package name (e.g. `darwin` + `arm64` → `@taskdn/cli-darwin-arm64`)
3. Uses `require.resolve()` to find the binary inside the installed optional dependency
4. Spawns the binary via `child_process.execFileSync()`, passing through all args and stdio

### How Platform Packages Work

Each platform package's `package.json` has `os` and `cpu` fields:

```json
{
  "name": "@taskdn/cli-linux-arm64",
  "os": ["linux"],
  "cpu": ["arm64"]
}
```

When npm installs `@taskdn/cli`, it installs `optionalDependencies` but silently skips any whose `os`/`cpu` don't match the current system. So only one platform package actually gets downloaded.

### npm Trusted Publishing

Instead of storing an `NPM_TOKEN` secret, configure each package on npmjs.com to trust the specific workflow file in the `dannysmith/taskdn` repo. GitHub Actions gets a short-lived OIDC token at publish time. Requires:

- npm CLI v11.5.1+ on the runner
- `permissions.id-token: write` in the workflow
- Trusted publisher configured per package on npmjs.com
- No `registry-url` in `actions/setup-node` (breaks OIDC)

## Implementation

### Phase 1: npm Org & Package Setup (manual)

- [ ] Create the `@taskdn` org on npmjs.com
- [ ] Delete (or deprecate) the old `taskdn-sdk` package
- [ ] Create placeholder packages to reserve the names — each needs an initial publish before trusted publishing can be configured:
  - `@taskdn/cli`
  - `@taskdn/cli-darwin-arm64`
  - `@taskdn/cli-darwin-x64`
  - `@taskdn/cli-linux-arm64`
  - `@taskdn/cli-linux-x64`
  - `@taskdn/cli-win32-x64`
- [ ] Configure trusted publishing on each package:
  - Repository owner: `dannysmith`
  - Repository: `taskdn`
  - Workflow: `release-cli.yml`

### Phase 2: Create npm Package Files

Create the `tdn-cli/npm/` directory structure.

**For each platform package** (`cli-darwin-arm64`, etc.):

- [ ] Create `package.json` with:
  - `name`, `version` (matching CLI version)
  - `os` and `cpu` fields
  - `description`, `license`, `repository`
  - `preferUnplugged: true` (for Yarn PnP compatibility)
  - No `bin` field (main package handles that)
- [ ] The binary itself is NOT committed — CI copies it in at build time

**For the main package** (`cli/`):

- [ ] Create `package.json` with:
  - `name: "@taskdn/cli"`
  - `bin: { "tdn": "bin/tdn" }`
  - `optionalDependencies` listing all 5 platform packages at the same version
  - `engines: { "node": ">=18" }`
- [ ] Create `bin/tdn` wrapper script (Node.js, ~50 lines):
  - Platform/arch detection via `process.platform` and `process.arch`
  - Map to package name
  - `require.resolve()` to find the binary
  - `execFileSync()` to run it with passthrough stdio
  - Clear error message if no matching platform package is installed

### Phase 3: Update Release Workflow

Extend `.github/workflows/release-cli.yml` to publish to npm after building.

- [ ] Add `id-token: write` to permissions
- [ ] In each platform build job, after building the binary:
  - Copy the binary into the correct `npm/cli-<platform>/` directory
  - Set the version in `package.json` from the git tag
  - Run `npm publish --access public`
- [ ] Add a new `publish-npm` job (after all platform builds complete):
  - Update the version in `npm/cli/package.json` + all `optionalDependencies` versions
  - Run `npm publish --access public` for the main `@taskdn/cli` package
- [ ] Ensure the existing GitHub Release + Homebrew steps still work (they run in the `release` job which already `needs: build`)

### Phase 4: Update prepare-release Script

- [ ] Update `tdn-cli/scripts/prepare-release.js` to also bump versions in all `npm/*/package.json` files
- [ ] Fix repo URL: `taskdn/taskdn` → `dannysmith/taskdn` in the script's output messages

### Phase 5: Fix Existing URL Issues

These are wrong in multiple places and should be fixed regardless of npm publishing.

- [ ] `tdn-cli/scripts/install.sh` line 16: `REPO="taskdn/taskdn"` → `REPO="dannysmith/taskdn"`
- [ ] `tdn-claude-plugin/commands/prime.md` line 13: fix GitHub URL to `dannysmith/taskdn`
- [ ] `tdn-claude-plugin/skills/task-management/cowork.md` line 28: fix GitHub URL
- [ ] `tdn-cli/scripts/prepare-release.js` lines 132-136: fix GitHub URLs

### Phase 6: Update Claude Plugin for npm Install

Update the plugin's install flow to prefer npm when available.

- [ ] Update `tdn-claude-plugin/commands/prime.md`:
  - Step 3a: try `npm install -g @taskdn/cli` first
  - Step 3b: fall back to curl install script (with corrected URL)
  - Step 3c: search mounted dirs for binary
  - Step 3d: fall back to direct file access
- [ ] Update `tdn-claude-plugin/skills/task-management/cowork.md`:
  - Primary method: `npm install -g @taskdn/cli`
  - Fallback: curl install script
  - Fallback: pre-placed binary in mounted folder
  - Fallback: direct file access (degraded mode)

## Testing

- Build locally and verify the wrapper script resolves the correct binary: `node npm/cli/bin/tdn --version`
- After first real publish: `npm install -g @taskdn/cli && tdn --version` on macOS, Linux, and Windows
- Test in a Cowork session: `/tdn:prime` should install via npm and prime successfully

## Notes

- Platform packages will be ~60-100MB each (binary size varies by platform). This is within npm's 200MB per-package limit, and is comparable to other binary CLI tools on npm.
- npm Trusted Publishing requires npm CLI v11.5.1+. Use `actions/setup-node@v4` with `node-version: 24.x` (ships with npm v11+).
- The first publish of each package must happen before trusted publishing can be configured. Either do this manually with `npm publish --access public` using a token, or publish an initial `0.0.0` placeholder.
- Version synchronization: all 6 npm packages must be published at the same version for each release. The CI workflow handles this by extracting the version from the git tag.
