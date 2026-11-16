//! Dev build identity.
//!
//! `bun run tauri:dev` gives debug builds their own identifier (see
//! `scripts/dev-slot.ts`): `is.danny.taskdn-desktop.dev` in the main checkout and
//! `is.danny.taskdn-desktop.dev<n>` in a worktree's slot. That keeps their
//! preferences, vault, logs and single-instance lock apart from the installed app.

/// The main checkout's dev identifier. Keep in step with `src-tauri/tauri.dev.conf.json`.
const MAIN_DEV_IDENTIFIER: &str = "is.danny.taskdn-desktop.dev";

/// Whether an identifier is a dev slot's, in the main checkout or a worktree.
pub fn is_dev_identifier(identifier: &str) -> bool {
    identifier
        .strip_prefix(MAIN_DEV_IDENTIFIER)
        .is_some_and(|slot| slot.chars().all(|c| c.is_ascii_digit()))
}

/// Whether an identifier is a worktree slot's rather than the main checkout's.
pub fn is_worktree_identifier(identifier: &str) -> bool {
    is_dev_identifier(identifier) && identifier != MAIN_DEV_IDENTIFIER
}

/// Stops a debug build that would run as the installed app, before anything
/// touches its data. Plain `bun run tauri dev` or `tauri build --debug` do that.
pub fn exit_unless_dev_identifier(identifier: &str) {
    if !is_dev_identifier(identifier) {
        eprintln!(
            "This debug build has the identifier {identifier}, which would share data with \
             the installed app. Start it with `bun run tauri:dev`."
        );
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_main_and_worktree_slots() {
        assert!(is_dev_identifier("is.danny.taskdn-desktop.dev"));
        assert!(is_dev_identifier("is.danny.taskdn-desktop.dev3"));
    }

    #[test]
    fn rejects_the_release_identifier() {
        assert!(!is_dev_identifier("is.danny.taskdn-desktop"));
        assert!(!is_dev_identifier("is.danny.taskdn-desktop.devx"));
    }

    #[test]
    fn tells_worktree_slots_from_the_main_checkout() {
        assert!(!is_worktree_identifier("is.danny.taskdn-desktop.dev"));
        assert!(is_worktree_identifier("is.danny.taskdn-desktop.dev2"));
        assert!(!is_worktree_identifier("is.danny.taskdn-desktop"));
    }
}
