# Releases

Release process, version management, and auto-update system for Taskdn Desktop.

## Overview

The release system provides:

- Automated GitHub Actions workflow for cross-platform builds
- Apple code signing and notarization for macOS
- Universal macOS binary (arm64 + x86_64)
- Auto-updater with cryptographic verification
- Draft releases for manual review before publishing
- Automatic website artifact updates

**Workflow location:** `/.github/workflows/release-desktop.yml` (in monorepo root)

## Release Process

### Quick Release

```bash
cd tdn-desktop
bun run release:prepare 1.0.0
```

This will:

1. Check git status is clean
2. Run all quality checks (`bun run check:all`)
3. Update versions in `package.json`, `Cargo.toml`, `tauri.conf.json`
4. Optionally commit, tag, and push

Then GitHub Actions will:

1. Build the app for all platforms (macOS, Windows, Linux)
2. Sign and notarize macOS builds
3. Create a **draft** release with all artifacts
4. Commit latest installers to `website/public/`

Finally, manually publish the draft release on GitHub.

### Manual Method

```bash
# Update versions in package.json, Cargo.toml, tauri.conf.json
bun run check:all
git add .
git commit -m "chore(desktop): release desktop-v1.0.0"
git tag desktop-v1.0.0
git push && git push origin desktop-v1.0.0
```

**Note:** Desktop releases use `desktop-v*` tags to differentiate from CLI releases (`tdn-cli-v*`).

## Version Strategy

Semantic versioning (`v1.0.0`):

- **Major** (1.x.x): Breaking changes
- **Minor** (x.1.x): New features, backwards compatible
- **Patch** (x.x.1): Bug fixes

All three files must have matching versions:

- `package.json` → `"version": "1.0.0"`
- `src-tauri/Cargo.toml` → `version = "1.0.0"`
- `src-tauri/tauri.conf.json` → `"version": "1.0.0"`

## Release Artifacts

Each release creates:

| Platform | Artifact | Notes |
|----------|----------|-------|
| macOS | `.dmg` | Universal binary (arm64 + x86_64), signed and notarized |
| Windows | `.msi` | Standard installer |
| Linux | `.AppImage` | Portable executable |
| All | `latest.json` | Auto-updater manifest |
| All | `.sig` files | Cryptographic signatures |

The workflow also commits latest installers to `website/public/` for direct downloads.

## GitHub Secrets

The following secrets must be configured in the repository (Settings → Secrets and variables → Actions):

### Tauri Auto-Updater Signing

| Secret | Description |
|--------|-------------|
| `TAURI_PRIVATE_KEY` | Private key for signing update manifests (app-specific) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |

### Apple Code Signing (macOS only)

| Secret | Description |
|--------|-------------|
| `APPLE_CERTIFICATE` | Base64-encoded .p12 certificate |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the .p12 file |
| `APPLE_API_KEY` | App Store Connect API Key ID |
| `APPLE_API_ISSUER` | App Store Connect Issuer ID |
| `APPLE_API_KEY_PATH` | Contents of the .p8 API key file |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

## Initial Setup

If setting up from scratch, see the detailed setup guide in `tdn-desktop/docs/tasks-done/task-2026-01-17-10-publishing.md`.

### 1. Generate Tauri Signing Keys

```bash
bunx @tauri-apps/cli signer generate -w ~/.tauri/taskdn-desktop.key
# Save the password and public key output
```

### 2. Configure `tauri.conf.json`

Ensure these settings are configured:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/dannysmith/taskdn/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  },
  "bundle": {
    "createUpdaterArtifacts": true,
    "macOS": {
      "signingIdentity": null,
      "hardenedRuntime": true
    }
  }
}
```

### 3. Add GitHub Secrets

Add all secrets listed above to the repository.

## Auto-Update System

### Behavior

- Checks for updates 5 seconds after app launch
- Shows confirmation dialog when update is available
- Downloads and installs in background
- Offers to restart when complete
- Fails silently on network issues

### Manual Update Check

Users can manually check via:

- **Menu**: App → Check for Updates
- **Command Palette**: Cmd+K → "Check for Updates"

### Security

All updates are cryptographically signed:

1. Private key signs releases during build
2. Public key in app config verifies downloads
3. Invalid signatures are automatically rejected

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Workflow doesn't trigger | Ensure tag starts with `desktop-v` and is pushed |
| Build fails | Check GitHub secrets, run `bun run check:all` locally |
| macOS "unidentified developer" | Apple secrets misconfigured or notarization failed |
| Updates not detected | Verify endpoint URL and public key match |
| Download fails | Check signatures, file permissions, disk space |

## Reference

- Workflow: `/.github/workflows/release-desktop.yml`
- Prepare script: `/tdn-desktop/scripts/prepare-release.js`
- Setup guide: `/tdn-desktop/docs/tasks-done/task-2026-01-17-10-publishing.md`
