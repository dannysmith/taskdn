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

### Phase 1: npm Org & Package Setup (manual) ✅

- [x] Create the `@taskdn` org on npmjs.com
- [x] Delete (or deprecate) the old `taskdn-sdk` package
- [x] Create placeholder packages (v0.0.0) to reserve the names:
  - `@taskdn/cli`
  - `@taskdn/cli-darwin-arm64`
  - `@taskdn/cli-darwin-x64`
  - `@taskdn/cli-linux-arm64`
  - `@taskdn/cli-linux-x64`
  - `@taskdn/cli-win32-x64`
- [x] Configure trusted publishing on each package:
  - Repository owner: `dannysmith`
  - Repository: `taskdn`
  - Workflow: `release-cli.yml`

### Phase 2: Create npm Package Files ✅

Created `tdn-cli/npm/` directory structure with:

- [x] 5 platform `package.json` files with `os`/`cpu`/`preferUnplugged` fields
- [x] Main `@taskdn/cli` `package.json` with `bin`, `optionalDependencies`, `engines`
- [x] `bin/tdn` wrapper script using `spawnSync` with passthrough stdio

### Phase 3: Update Release Workflow ✅

- [x] Added `publish-npm` job to `release-cli.yml` (parallel with `release`, both need `build`)
- [x] OIDC trusted publishing via `permissions.id-token: write`
- [x] `actions/setup-node@v4` with `node-version: 24.x` (no `registry-url`)
- [x] Extracts binaries from build artifacts, sets versions, publishes platform packages then main wrapper

### Phase 4: Update prepare-release Script ✅

- [x] `prepare-release.js` now bumps versions in all `npm/*/package.json` files
- [x] Added npm publish to post-push output messages

### Phase 5: Fix Existing URL Issues ✅

- [x] `tdn-cli/scripts/install.sh`: `REPO="dannysmith/taskdn"`
- [x] `tdn-claude-plugin/commands/prime.md`: fixed GitHub URL
- [x] `tdn-claude-plugin/skills/task-management/cowork.md`: fixed GitHub URL
- [x] `tdn-cli/scripts/prepare-release.js`: fixed GitHub URLs

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
- [ ] Update `docs/tasks-todo/task-x-claude-cowork-integration.md` to reflect npm as the primary Cowork install method

### Phase 7: Dual-Install Conflict Detection

Users might have `tdn` installed via both Homebrew and npm, which can cause confusion about which binary is being used.

- [ ] Research how other CLI tools handle this (e.g. how `biome`, `eslint`, `prettier` handle Homebrew vs npm coexistence)
- [ ] Add a check in the npm wrapper script (`bin/tdn`): if `tdn` exists at a Homebrew path (e.g. from `brew --prefix`), print a warning explaining the situation and which binary is being used
- [ ] Consider whether the Homebrew formula should do the inverse check — likely not worth it since Homebrew formulas can't easily detect npm globals, and the npm wrapper is the more common entry point

### Phase 8: Update Documentation

- [ ] Update `tdn-cli/README.md`: add npm as an installation method alongside Homebrew and the install script
- [ ] Update `tdn-cli/docs/developer/releases.md`: document the npm publishing step in the release process
- [ ] Update `website/` user-facing docs: add npm installation instructions to the CLI installation page
- [ ] Update `tdn-claude-plugin/README.md`: mention npm install as the primary method for Cowork environments

## Testing

- Build locally and verify the wrapper script resolves the correct binary: `node npm/cli/bin/tdn --version`
- After first real publish: `npm install -g @taskdn/cli && tdn --version` on macOS, Linux, and Windows
- Test in a Cowork session: `/tdn:prime` should install via npm and prime successfully

## Notes

- Platform packages will be ~60-100MB each (binary size varies by platform). This is within npm's 200MB per-package limit, and is comparable to other binary CLI tools on npm.
- npm Trusted Publishing requires npm CLI v11.5.1+. Use `actions/setup-node@v4` with `node-version: 24.x` (ships with npm v11+).
- The first publish of each package must happen before trusted publishing can be configured. Either do this manually with `npm publish --access public` using a token, or publish an initial `0.0.0` placeholder.
- Version synchronization: all 6 npm packages must be published at the same version for each release. The CI workflow handles this by extracting the version from the git tag.
