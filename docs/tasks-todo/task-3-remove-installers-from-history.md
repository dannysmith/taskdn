# Task 3: Remove installers from git history

Rewrite history to drop the desktop installers that the release workflow used to commit. This is destructive and needs a force-push, so Danny is present for it and approves each step that touches the remote.

## Background

`release-desktop.yml` committed `website/public/taskdn-desktop-latest.{dmg,msi,AppImage}` on every desktop release from 2026-01-17 onwards. That's 15 blobs in 5 commits, 316 MB of the 397 MB `.git`. Task 2 stops new ones arriving.

## Before starting

- [ ] Task 2 is merged and no workflow commits installers any more.
- [ ] No open PRs (`gh pr list`). Close or merge anything Dependabot has opened since task 1.
- [ ] No other local branches, worktrees or stashes that matter: `git branch -a`, `git worktree list`, `git stash list`. List the remote's branches too.
- [ ] Danny confirms there are no other clones (other machines) with unpushed work.
- [ ] Note the current state for comparison: `git rev-parse HEAD^{tree}`, `git tag` and the tree hash of each tag, `git rev-list --count --all`.

## Steps

1. **Back up.** `git clone --mirror` the GitHub repo to a folder outside `~/dev` (e.g. `~/backups/taskdn-pre-purge.git`). Keep it until the rewrite has been in use for a while.
2. **Rewrite a fresh clone.** In a new clone (`git clone --no-local`), run:

   ```bash
   git filter-repo --invert-paths \
     --path website/public/taskdn-desktop-latest.dmg \
     --path website/public/taskdn-desktop-latest.msi \
     --path website/public/taskdn-desktop-latest.AppImage
   ```

   This rewrites every commit since 2026-01-17 and moves the tags with them. `filter-repo` removes the `origin` remote; add it back.
3. **Verify.**
   - HEAD's tree hash is unchanged (the installers are already gone from HEAD after task 2).
   - The same number of commits and the same tag names.
   - Each tag's tree matches the old one apart from the installer paths.
   - No installer blobs remain: `git rev-list --objects --all | grep taskdn-desktop-latest` is empty.
   - `git count-objects -vH` shows the smaller size.
4. **Push** (Danny approves). Temporarily allow force-pushes to `main` if branch protection blocks them. Then `git push --force origin main` and `git push --force --tags`, and restore the protection.
5. **Update the main checkout.** Rather than re-cloning, which would lose gitignored files like `docs/tasks-todo/temporary/`, `dummy-demo-vault/` and `CLAUDE.local.md`: run `git fetch origin`, `git reset --hard origin/main` and `git fetch --tags --force`, then `git reflog expire --expire=now --all && git gc --prune=now`. Any other clones get re-cloned.

## Afterwards

- [ ] `gh release list` still shows every release attached to its tag. Release assets, npm and the Homebrew tap don't depend on commit hashes.
- [ ] A fresh clone is small.
- [ ] Check docs and release posts for links to specific commit hashes, which now point nowhere. Fix any that matter.
- [ ] GitHub's own storage won't shrink, because old pull request refs keep the old objects reachable. That's fine; only clone size matters. GitHub Support can purge them if that ever changes.

## Done when

`main` and all tags are rewritten on GitHub, the main checkout matches, and a fresh clone no longer contains any installers.
