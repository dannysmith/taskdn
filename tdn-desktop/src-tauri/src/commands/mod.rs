//! Tauri command handlers organized by domain.
//!
//! Each submodule contains related commands and their helper functions.
//! Import specific commands via their submodule (e.g., `commands::preferences::greet`).

// The Apple Intelligence helpers are only called on Apple Silicon Macs, but
// they're plain Rust, so they build and are unit-tested on every platform.
// Elsewhere they'd be reported as dead code. Dead-code checks still apply in
// full on Apple Silicon.
#[cfg_attr(
    not(all(target_os = "macos", target_arch = "aarch64")),
    allow(dead_code)
)]
pub mod ai;
#[cfg_attr(
    not(all(target_os = "macos", target_arch = "aarch64")),
    allow(dead_code)
)]
pub(crate) mod ai_prompts;
#[cfg_attr(
    not(all(target_os = "macos", target_arch = "aarch64")),
    allow(dead_code)
)]
pub(crate) mod ai_resolve;
pub mod config;
pub mod notifications;
pub mod preferences;
pub mod quick_pane;
pub mod recovery;
pub mod vault;
