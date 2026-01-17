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
- `/src-tauri/tauri.conf.json` - Bundle config with `createUpdaterArtifacts: true` (needs pubkey)
- `/src/App.tsx` - Auto-updater code (already implemented)
- `/src/lib/menu.ts` - "Check for Updates" menu item (already implemented)

## Implementation Plan

### Phase 1: Generate Tauri Update Signing Keys

The auto-updater requires cryptographic signing to verify updates are authentic.

**Steps:**

1. Generate a new signing keypair:
   ```bash
   bunx @tauri-apps/cli signer generate -w ~/.tauri/taskdn-desktop.key
   ```
   - Enter a password when prompted (save this - needed for GitHub secret)
   - This outputs a public key (base64 string) - copy it immediately
   - Private key saved to `~/.tauri/taskdn-desktop.key`

2. Securely store the private key:
   - Back up `~/.tauri/taskdn-desktop.key` to a secure location (1Password, etc.)
   - Never commit this file to git

3. Note the public key for Phase 4 configuration

**Reference**: The astro-editor project uses this exact approach

---

### Phase 2: Apple Developer Setup

Required for macOS code signing and notarization (so users don't see "unidentified developer" warnings).

#### 2.1: Create Developer ID Certificate

Apple requires a "Developer ID Application" certificate for distribution outside the App Store.

1. Open **Keychain Access** on macOS
2. Menu: **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
   - User Email: your Apple ID email
   - CA Email: leave blank
   - Request: "Saved to disk"
   - Save the `.certSigningRequest` file

3. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
4. Click **+** to create new certificate
5. Select **Developer ID Application** (under Software)
6. Upload the CSR file from step 2
7. Download the certificate (`.cer` file)
8. Double-click to install in Keychain

9. Export as `.p12` file:
   - In Keychain Access, find the certificate under "My Certificates"
   - Right-click → **Export**
   - Choose `.p12` format
   - Set a strong password (needed for GitHub secret)
   - Save as `developer-id-application.p12`

10. Convert to base64 for GitHub:
    ```bash
    base64 -i developer-id-application.p12 | pbcopy
    ```
    - This copies the base64 string to clipboard

#### 2.2: Create App Store Connect API Key

Used for notarization (Apple's malware scan).

1. Go to [App Store Connect → Users and Access → Integrations](https://appstoreconnect.apple.com/access/integrations/api)
2. Click **Generate API Key**
3. Name: "Taskdn Desktop CI"
4. Access: **Developer** role
5. Click **Generate**
6. **CRITICAL**: Download the `.p8` file immediately - you can only download it once!
7. Note the **Key ID** (shown in table)
8. Note the **Issuer ID** (shown at top of page)

#### 2.3: Get Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Team ID is shown in the Membership section
3. Or find it in Keychain - the certificate name format is: `Developer ID Application: Your Name (TEAM_ID)`

---

### Phase 3: Configure GitHub Repository Secrets

Add these secrets to the **dannysmith/taskdn** repository (Settings → Secrets and Variables → Actions).

#### Auto-Updater Signing (Required)

| Secret | Description | How to get |
|--------|-------------|------------|
| `TAURI_PRIVATE_KEY` | Base64-encoded private key | Run: `cat ~/.tauri/taskdn-desktop.key \| base64 \| pbcopy` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password set in Phase 1 | The password you entered when generating |

#### Apple Code Signing (Required for macOS)

| Secret | Description | How to get |
|--------|-------------|------------|
| `APPLE_CERTIFICATE` | Base64 of .p12 file | From Phase 2.1 step 10 |
| `APPLE_CERTIFICATE_PASSWORD` | Password for .p12 | Password set when exporting |
| `APPLE_API_KEY` | API Key ID | From Phase 2.2 (e.g., `ABC123DEF4`) |
| `APPLE_API_ISSUER` | Issuer ID | From Phase 2.2 (UUID format) |
| `APPLE_API_KEY_PATH` | Contents of .p8 file | Paste entire contents of the .p8 file |
| `APPLE_TEAM_ID` | Team ID | From Phase 2.3 (e.g., `XT349SJG9U`) |

---

### Phase 4: Update Configuration Files

#### 4.1: Update `src-tauri/tauri.conf.json`

Update the updater configuration with the real public key:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "endpoints": [
        "https://github.com/dannysmith/taskdn/releases/latest/download/latest.json"
      ],
      "dialog": true,
      "pubkey": "PASTE_PUBLIC_KEY_FROM_PHASE_1_HERE"
    }
  }
}
```

Update macOS bundle settings for proper signing:

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

**Note**: `signingIdentity: null` allows the build to use the `APPLE_SIGNING_IDENTITY` environment variable instead of a hardcoded value.

#### 4.2: Update GitHub Actions Workflow

Update `/.github/workflows/release-desktop.yml` to add Apple code signing steps.

**Changes needed:**

1. Use `macos-14` runner (required for universal binary builds)
2. Add `--target universal-apple-darwin` for macOS to create universal binary (Intel + Apple Silicon)
3. Add Rust target installation step for both architectures
4. Add `apple-actions/import-codesign-certs@v3` step
5. Add API key file creation step
6. Set Apple environment variables in tauri-action step
7. Add `updaterJsonKeepUniversal: true` to maintain universal binary entries in latest.json
8. Pin tauri-action to a specific version (`v0.5.22`)

See the working implementation in `~/dev/astro-editor/.github/workflows/release.yml` for reference.

#### 4.3: Update Prepare Release Script

Update `/scripts/prepare-release.js`:

1. Change placeholder URLs to actual repository:
   - Line 163-166: Update GitHub Actions and releases URLs
   - Replace `YOUR_USERNAME/YOUR_REPO` with `dannysmith/taskdn`

---

### Phase 5: Update CSP for Updates (If Needed)

The current CSP in `tauri.conf.json` should already support updates via GitHub:

```json
"connect-src 'self' tauri: ipc: http://ipc.localhost"
```

If updates fail with CORS errors, add:
```json
"connect-src 'self' tauri: ipc: http://ipc.localhost https://github.com https://objects.githubusercontent.com"
```

---

### Phase 6: Test the Release Flow

#### 6.1: Local Verification

Before pushing to CI:

```bash
# Verify all configs are valid
bun run check:all

# Check Rust compiles with all the signing setup
cd src-tauri && cargo check && cd ..
```

#### 6.2: Test Release

1. Run the prepare release script:
   ```bash
   bun run release:prepare 0.2.0
   ```

2. When prompted, select "No" to skip automatic push

3. Verify the changes look correct:
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

5. Monitor GitHub Actions:
   - Go to https://github.com/dannysmith/taskdn/actions
   - Watch the "Release Taskdn Desktop" workflow
   - All three platform builds should succeed

6. Verify the draft release:
   - Go to https://github.com/dannysmith/taskdn/releases
   - Should see a draft release with:
     - `.dmg` file (macOS universal)
     - `.msi` file (Windows)
     - `.AppImage` file (Linux)
     - `latest.json` (auto-updater manifest)
     - `.sig` signature files

7. Test the macOS installer:
   - Download the `.dmg`
   - Open it - should NOT show "unidentified developer" warning
   - Install and run the app

8. Publish the release:
   - Edit the draft release
   - Click "Publish release"

#### 6.3: Test Auto-Updater

1. Install the v0.2.0 release
2. Prepare and publish v0.2.1
3. Open the installed v0.2.0 app
4. Wait 5 seconds - should show update notification
5. Click to install and verify update completes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src-tauri/tauri.conf.json` | Add pubkey, set `hardenedRuntime: true`, set `signingIdentity: null` |
| `/.github/workflows/release-desktop.yml` | Add Apple signing steps, update matrix, pin action version |
| `/scripts/prepare-release.js` | Update placeholder URLs |

## Required Secrets Summary

| Secret | Purpose |
|--------|---------|
| `TAURI_PRIVATE_KEY` | Signs update manifests for auto-updater verification |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password for the signing key |
| `APPLE_CERTIFICATE` | Code signing certificate for macOS |
| `APPLE_CERTIFICATE_PASSWORD` | Certificate password |
| `APPLE_API_KEY` | App Store Connect API Key ID |
| `APPLE_API_ISSUER` | App Store Connect Issuer ID |
| `APPLE_API_KEY_PATH` | Contents of .p8 API key file |
| `APPLE_TEAM_ID` | Apple Developer Team ID |

## Reference Implementation

The astro-editor project (`~/dev/astro-editor`) has a working implementation:
- `/.github/workflows/release.yml` - Complete workflow with Apple signing
- `/src-tauri/tauri.conf.json` - Correct bundle/updater configuration
- `/docs/developer/apple-signing-setup.md` - Setup documentation

## Expected Outcome

After completing this task:

1. Running `bun run release:prepare X.Y.Z` updates all version files
2. Pushing a `desktop-vX.Y.Z` tag triggers GitHub Actions
3. GitHub Actions builds signed/notarized apps for all platforms
4. Draft release appears with all installers
5. Publishing the release enables auto-updates for existing users
6. macOS users can install without security warnings
7. Existing users receive automatic update notifications
