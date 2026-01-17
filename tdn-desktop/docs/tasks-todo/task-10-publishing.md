# Task: Publishing

Set up a proper release process including Apple code signing, notarization, and automated builds on CI for all platforms.

## Overview

This task configures the complete release infrastructure for Taskdn Desktop:

- **Apple Code Signing & Notarization**: macOS apps must be signed and notarized for users to run them without security warnings
- **Auto-Updater**: Signed update manifests allow users to receive seamless in-app updates
- **Cross-Platform Builds**: GitHub Actions builds for macOS (universal binary), Windows (MSI), and Linux (AppImage)
- **Draft Releases**: Builds create draft releases for manual review before publishing

## Current State

The template provides:

- `/.github/workflows/release-desktop.yml` - Basic workflow structure (needs Apple signing steps)
- `/scripts/prepare-release.js` - Version bumping script (needs URL updates)
- `/src-tauri/tauri.conf.json` - Bundle config with `createUpdaterArtifacts: true` (needs pubkey, dialog fix)
- `/src/App.tsx` - Auto-updater code (already implemented)
- `/src/lib/menu.ts` - "Check for Updates" menu item (works but has UX issue - see follow-up)

**Existing Assets**: Apple Developer credentials already exist from astro-editor project and can be reused.

## Implementation Plan

### Phase 1: Generate Tauri Update Signing Keys

The auto-updater requires cryptographic signing to verify updates are authentic. This is app-specific and cannot be reused from astro-editor.

**Steps:**

1. Generate a new signing keypair:

   ```bash
   bunx @tauri-apps/cli signer generate -w ~/.tauri/taskdn-desktop.key
   ```

   - Enter a password when prompted (save this - needed for GitHub secret)
   - This outputs a public key (base64 string) - **copy it immediately**
   - Private key saved to `~/.tauri/taskdn-desktop.key`

2. Securely store the private key:
   - Back up `~/.tauri/taskdn-desktop.key` to a secure location (1Password, etc.)
   - Never commit this file to git

3. Note the public key for Phase 3 configuration

---

### Phase 2: Configure GitHub Repository Secrets

Add secrets to the **dannysmith/taskdn** repository (Settings → Secrets and Variables → Actions).

#### Tauri Auto-Updater Signing (New - App Specific)

| Secret                               | Description               | How to get                                                                          |
| ------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------- |
| `TAURI_PRIVATE_KEY`                  | Private key file contents | `cat ~/.tauri/taskdn-desktop.key \| pbcopy` (already base64 - do NOT double-encode) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password from Phase 1     | The password you entered when generating                                            |

#### Apple Code Signing (Reuse from astro-editor)

These secrets are the same for all apps signed with your Developer ID. Copy from wherever you have them stored (1Password, etc.) or from an existing repo's secrets if you have access.

| Secret                       | Description            | Value                |
| ---------------------------- | ---------------------- | -------------------- |
| `APPLE_CERTIFICATE`          | Base64 of .p12 file    | Same as astro-editor |
| `APPLE_CERTIFICATE_PASSWORD` | Password for .p12      | Same as astro-editor |
| `APPLE_API_KEY`              | API Key ID             | Same as astro-editor |
| `APPLE_API_ISSUER`           | Issuer ID              | Same as astro-editor |
| `APPLE_API_KEY_PATH`         | Contents of .p8 file   | Same as astro-editor |
| `APPLE_TEAM_ID`              | Team ID (`XT349SJG9U`) | Same as astro-editor |

**Note**: If you need to recreate any Apple credentials, see the appendix at the end of this document.

---

### Phase 3: Update Configuration Files

#### 3.1: Update `src-tauri/tauri.conf.json`

**Updater configuration** - add the real public key and fix dialog setting:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/dannysmith/taskdn/releases/latest/download/latest.json"
      ],
      "dialog": false,
      "pubkey": "PASTE_PUBLIC_KEY_FROM_PHASE_1_HERE"
    }
  }
}
```

**Important**: Set `"dialog": false` because `App.tsx` handles dialogs manually with `confirm()`. Having both would show duplicate dialogs.

**macOS bundle settings** - enable hardened runtime and use environment variable for signing:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": null,
      "hardenedRuntime": true,
      "entitlements": null,
      "minimumSystemVersion": "10.15"
    }
  }
}
```

**Note**: `signingIdentity: null` tells Tauri to use the `APPLE_SIGNING_IDENTITY` environment variable set in the workflow.

#### 3.2: Update GitHub Actions Workflow

Update `/.github/workflows/release-desktop.yml` with these specific changes:

**1. Update macOS runner and add universal binary target:**

```yaml
matrix:
  include:
    - platform: 'macos-14' # Changed from macos-latest
      args: '--target universal-apple-darwin --bundles app,dmg' # Added universal target
    - platform: 'windows-latest'
      args: '--bundles msi'
    - platform: 'ubuntu-22.04'
      args: '--bundles appimage'
```

**2. Add Rust targets step (after "Install Rust stable"):**

```yaml
- name: Install Rust targets for universal binary
  if: matrix.platform == 'macos-14'
  run: |
    rustup target add aarch64-apple-darwin
    rustup target add x86_64-apple-darwin
```

**3. Add certificate import step (macOS only):**

```yaml
- name: Import Code-Signing Certificates
  if: matrix.platform == 'macos-14'
  uses: apple-actions/import-codesign-certs@v3
  with:
    p12-file-base64: ${{ secrets.APPLE_CERTIFICATE }}
    p12-password: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
```

**4. Add API key file creation step (macOS only):**

```yaml
- name: Create API Key file
  if: matrix.platform == 'macos-14'
  run: |
    mkdir -p ~/private_keys
    echo "${{ secrets.APPLE_API_KEY_PATH }}" > ~/private_keys/AuthKey_${{ secrets.APPLE_API_KEY }}.p8
    chmod 600 ~/private_keys/AuthKey_${{ secrets.APPLE_API_KEY }}.p8
```

**5. Update tauri-action with Apple environment variables:**

```yaml
- name: Build and release
  uses: tauri-apps/tauri-action@v0.5.22 # Pin to specific version
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CI: true
    # Tauri updater signing
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
    # Apple code signing (macOS only - ignored on other platforms)
    APPLE_SIGNING_IDENTITY: 'Developer ID Application: Daniel Smith (XT349SJG9U)'
    APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
    APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
    APPLE_API_KEY_PATH: ~/private_keys/AuthKey_${{ secrets.APPLE_API_KEY }}.p8
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  with:
    projectPath: tdn-desktop
    tagName: ${{ steps.version.outputs.tag }}
    releaseName: 'Taskdn Desktop v${{ steps.version.outputs.clean }}'
    releaseBody: |
      ## Taskdn Desktop v${{ steps.version.outputs.clean }}

      ### Installation Instructions
      - **macOS**: Download the `.dmg` file and drag to Applications folder
      - **Windows**: Download the `.msi` file and run the installer
      - **Linux**: Download the `.AppImage` file, make it executable (`chmod +x`), and run

      ### Auto-Updates
      Existing users will receive automatic update notifications.

      **Full Changelog**: https://github.com/${{ github.repository }}/commits/${{ steps.version.outputs.tag }}
    releaseDraft: true
    prerelease: false
    includeUpdaterJson: true
    updaterJsonKeepUniversal: true # Important for universal binary
    args: ${{ matrix.args }}
```

**Note**: `APPLE_SIGNING_IDENTITY` is hardcoded (not a secret) because it's not sensitive - it's just the certificate name visible in Keychain.

#### 3.3: Update Prepare Release Script

Update `/scripts/prepare-release.js` lines 163-166:

```javascript
console.log(
  '📱 Check GitHub Actions: https://github.com/dannysmith/taskdn/actions'
)
console.log(
  '📦 Draft release will appear at: https://github.com/dannysmith/taskdn/releases'
)
```

---

### Phase 4: Test the Release Flow

#### 4.1: Local Verification

```bash
# Verify all configs are valid
bun run check:all

# Check Rust compiles
cd src-tauri && cargo check && cd ..
```

#### 4.2: Test Release

1. Run the prepare release script:

   ```bash
   bun run release:prepare 0.2.0
   ```

2. Select "No" when prompted to skip automatic push

3. Verify changes:
   - `package.json` version updated
   - `src-tauri/Cargo.toml` version updated
   - `src-tauri/tauri.conf.json` version updated

4. Commit and push:

   ```bash
   git add .
   git commit -m "chore(desktop): release desktop-v0.2.0"
   git tag desktop-v0.2.0
   git push && git push origin desktop-v0.2.0
   ```

5. Monitor GitHub Actions at https://github.com/dannysmith/taskdn/actions

6. Verify draft release at https://github.com/dannysmith/taskdn/releases:
   - `.dmg` file (macOS universal)
   - `.msi` file (Windows)
   - `.AppImage` file (Linux)
   - `latest.json` (auto-updater manifest)
   - `.sig` signature files

7. Test macOS installer:
   - Download the `.dmg`
   - Open it - should NOT show "unidentified developer" warning
   - Install and run the app

8. Publish the release (edit draft → click "Publish release")

#### 4.3: Test Auto-Updater

1. Install v0.2.0 release
2. Prepare and publish v0.2.1
3. Open installed v0.2.0 app
4. Wait 5 seconds - should show update notification
5. Verify update installs and app restarts

---

## Files to Modify

| File                                     | Changes                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src-tauri/tauri.conf.json`              | Add pubkey, set `dialog: false`, set `hardenedRuntime: true`, set `signingIdentity: null`                                 |
| `/.github/workflows/release-desktop.yml` | Add Apple signing steps, update matrix for macos-14, add Rust targets, pin action version, add `updaterJsonKeepUniversal` |
| `/scripts/prepare-release.js`            | Update placeholder URLs to dannysmith/taskdn                                                                              |

## Required Secrets Summary

| Secret                               | New/Reuse | Purpose                               |
| ------------------------------------ | --------- | ------------------------------------- |
| `TAURI_PRIVATE_KEY`                  | **New**   | Signs update manifests (app-specific) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | **New**   | Password for signing key              |
| `APPLE_CERTIFICATE`                  | Reuse     | Code signing certificate              |
| `APPLE_CERTIFICATE_PASSWORD`         | Reuse     | Certificate password                  |
| `APPLE_API_KEY`                      | Reuse     | App Store Connect API Key ID          |
| `APPLE_API_ISSUER`                   | Reuse     | App Store Connect Issuer ID           |
| `APPLE_API_KEY_PATH`                 | Reuse     | Contents of .p8 API key file          |
| `APPLE_TEAM_ID`                      | Reuse     | Apple Developer Team ID               |

## Follow-up Issues

**Menu "Check for Updates" UX**: The current implementation in `src/lib/menu.ts:686-702` only shows a notification when an update is available but doesn't trigger the download/install flow. The astro-editor implementation emits an event that triggers the full flow in App.tsx. This should be fixed in a separate task for consistency.

## Reference Implementation

The astro-editor project (`~/dev/astro-editor`) has a working implementation:

- `/.github/workflows/release.yml` - Complete workflow with Apple signing
- `/src-tauri/tauri.conf.json` - Correct bundle/updater configuration
- `/docs/developer/apple-signing-setup.md` - Setup documentation

---

## Appendix: Creating Apple Credentials (If Needed)

Only needed if you don't have existing credentials from astro-editor.

### A.1: Create Developer ID Certificate

1. Open **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - User Email: your Apple ID email
   - CA Email: leave blank
   - Request: "Saved to disk"

2. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
3. Click **+** → **Developer ID Application**
4. Upload CSR, download certificate, double-click to install

5. Export as `.p12`:
   - Keychain Access → My Certificates → right-click → Export
   - Set password, save file

6. Convert to base64: `base64 -i cert.p12 | pbcopy`

### A.2: Create App Store Connect API Key

1. Go to [App Store Connect → Integrations](https://appstoreconnect.apple.com/access/integrations/api)
2. Generate API Key with Developer role
3. **Download .p8 immediately** (one-time only!)
4. Note Key ID and Issuer ID

### A.3: Get Team ID

Found in [Apple Developer Account](https://developer.apple.com/account) membership section, or in certificate name: `Developer ID Application: Name (TEAM_ID)`
