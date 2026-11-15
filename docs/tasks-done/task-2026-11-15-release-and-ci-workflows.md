# Task 2: Release and CI workflows

Fix the release workflows, stop committing installers, add CI for the desktop app and website, and bring across what's worked in Astro Editor. Do this on a branch and open a PR so CodeRabbit reviews the workflow changes.

## Background

This repo releases several products from one GitHub repo:

| Workflow                     | Trigger                 | What it does                                                             |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `release-cli.yml`            | `tdn-cli-v*` tag        | Builds binaries, publishes to npm, creates a release, bumps Homebrew tap |
| `release-desktop.yml`        | `desktop-v*` tag        | Builds a draft release, then commits installers to `website/public/`     |
| `create-release-post.yml`    | release published       | Writes a website release post for CLI and desktop releases               |
| `sync-obsidian-releases.yml` | every 6 hours           | Copies Obsidian plugin releases (other repo) into website posts          |
| `deploy-website.yml`         | `website/**` on main    | Deploys the website                                                      |
| `ci-cli.yml`                 | PRs and main, CLI paths | CLI checks                                                               |

Problems:

1. **CLI releases take over "Latest".** `softprops/action-gh-release` marks each CLI release as the repo's latest by default. The desktop updater reads `https://github.com/dannysmith/taskdn/releases/latest/download/latest.json` (`tdn-desktop/src-tauri/tauri.conf.json`), so after any CLI release, desktop auto-updates 404 until the next desktop release. This happened for about 15 minutes on 2026-10-22.
2. **Installers are committed to git.** The last job of `release-desktop.yml` copies the .dmg, .msi and .AppImage into `website/public/` and pushes to main. That's 316 MB of the 397 MB `.git` so far. The website's download buttons (`website/src/components/DesktopAppDownloadButtons.astro`) link to those files.
3. **No CI for the desktop app or website.** Nothing checks a desktop PR before release.
4. **Release posts are unreliable.** There's no post for CLI 1.0.1 in `website/src/content/docs/releases/`. A push made with `GITHUB_TOKEN` also doesn't trigger other workflows, so a post committed by a workflow may not deploy until something else touches `website/`.

Astro Editor solved most of this; see `~/dev/astro-editor/docs/developer/releases.md` and its `.github/workflows/` (`ci.yml`, `release.yml`, `publish-release-notes.yml`, `deploy-website.yml`).

## Work

### Latest release

- [x] Set `make_latest: false` on CLI releases, so `/releases/latest` always means the newest desktop release.
- [x] Check the CLI's `install.sh`: its usage comment says `releases/latest/download/install.sh`, which won't work once "latest" is always desktop. The script itself finds the CLI version through the API, so only the documented URL needs changing (pin it to a tag or serve the script from the website).

### Installers

- [x] In `release-desktop.yml`, replace the commit-to-website job with Astro Editor's approach: download the release's installers, make stable-named copies (`taskdn-desktop-latest.dmg`, `.msi`, `.AppImage`) plus a `SHA256SUMS`, and upload them to the same release.
- [x] Point the website's download buttons at `https://github.com/dannysmith/taskdn/releases/latest/download/taskdn-desktop-latest.*`.
- [x] Delete the installers from `website/public/` and gitignore them.
- [x] Backfill stable-named copies onto `desktop-v0.1.7` so the links work as soon as this merges. Making the stable-copy job runnable by hand (`workflow_dispatch` with a tag input) covers the backfill and tests the job at the same time.
  - The job is `desktop-stable-assets.yml`. A manually triggered workflow can only run once it's on `main`, so run it straight after merging: `gh workflow run desktop-stable-assets.yml -f tag=desktop-v0.1.7`. The download links 404 until it has finished.

### CI

- [x] Desktop CI on PRs and main, modelled on Astro Editor's `ci.yml`: `check:all` on Ubuntu, plus a build and smoke test on each platform. Path filters so it only runs for `tdn-desktop/**`. `concurrency` to cancel superseded runs. Only `main` saves the Rust cache; PRs restore it.
- [x] Website CI on PRs: `astro check` and a build.
- [x] Review `ci-cli.yml` against the same patterns (caching, concurrency, path filters).
- [x] Bring action versions up to date across all workflows (the CLI workflows still use `actions/checkout@v4`).

### Release posts

- [x] Find out why CLI 1.0.1 has no post, and backfill it.
- [x] After committing a post, dispatch `deploy-website.yml` explicitly, as Astro Editor's `publish-release-notes.yml` does.
- [x] Decide whether `create-release-post.yml` and `sync-obsidian-releases.yml` should share one script. The Obsidian plugin's releases live in another repo, so the cron sync may still be the simplest option.
  - **Findings:** CLI releases never got posts, because `release-cli.yml` creates them with `GITHUB_TOKEN`, which doesn't fire other workflows' `release` triggers (the 1.0.0 post was written by hand). The Obsidian sync worked but never deployed its commits.
  - **Done:** both workflows are replaced by `publish-release-notes.yml` running `website/scripts/generate-release-posts.ts`, which writes posts for every published CLI, desktop and Obsidian release that lacks one. It runs on `release: published`, when `release-cli.yml` dispatches it, every 6 hours and by hand, and it dispatches a deploy when it commits. The `OBSIDIAN_REPO_PAT` secret is no longer used, because the plugin repo is public.
- [x] Also found: the plugin's `/prime` command and Cowork guide installed the CLI from `releases/latest/download/install.sh`, which 404s whenever a desktop release is "Latest". They now use the script on `main`, and the plugin is bumped to 0.1.3.
- [x] Also found: the CLI CI's Rust cache pointed at `tdn-cli/crates/core`, but the Cargo workspace root (and `target/`) is `tdn-cli/`, so the cache never held the build.

### Worth considering

- [ ] Astro Editor's test builds: a signed prerelease of any commit, which the updater and download links ignore. Useful for testing the crash fix in task 7 on the real installed app. Deferred to task 7, if it turns out to be needed there.
- [x] Desktop release builds without a Rust cache (Astro Editor found tag-scoped caches are never read again).

### Docs

- [x] Update `docs/developer/releases-and-versioning.md` and `tdn-desktop/docs/developer/releases.md`.

## Done when

The PR is merged after CodeRabbit's review; the website's download links resolve to the 0.1.7 installers on GitHub; nothing in any workflow commits installers; desktop and website PRs get CI. The first real check of the CLI change is the 1.0.2 release in task 4.
