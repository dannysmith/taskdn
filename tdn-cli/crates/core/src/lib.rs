//! Taskdn CLI Core Library (Rust)
//!
//! This library provides performance-critical operations for the Taskdn CLI through NAPI-RS.
//!
//! # Architecture: Rust ↔ TypeScript Boundary
//!
//! **IMPORTANT for AI Agents:** This is a hybrid Rust+TypeScript codebase. Understanding the
//! boundary is critical:
//!
//! ## What's in Rust (this crate):
//! - Frontmatter parsing (gray_matter + serde)
//! - Vault scanning with parallelization (rayon)
//! - Relationship indexing (VaultIndex)
//! - File writing with round-trip fidelity
//! - WikiLink parsing
//!
//! ## What's in TypeScript (tdn-cli/src/):
//! - CLI argument parsing (commander)
//! - Interactive prompts (only in human mode)
//! - Output formatting (human/AI/JSON modes)
//! - Error presentation (mode-specific)
//! - Config validation and security checks
//!
//! ## NAPI Export Pattern:
//!
//! Functions marked with `#[napi]` are automatically exposed to TypeScript:
//!
//! ```rust,ignore
//! #[napi]
//! pub fn parse_task_file(file_path: String) -> Result<Task> { ... }
//! ```
//!
//! Becomes available in TypeScript as:
//!
//! ```typescript
//! import { parseTaskFile } from '@bindings';
//! const task = parseTaskFile('/path/to/task.md');
//! ```
//!
//! ## Error Handling Across the Boundary:
//!
//! Rust uses `TdnError` → NAPI serializes to JSON → TypeScript catches as Error.
//! See `error.rs` for details on error conversion.
//!
//! ## After Modifying NAPI Exports:
//!
//! You must rebuild bindings for TypeScript to see changes:
//! ```bash
//! bun run build  # Regenerates bindings/index.js and bindings/index.d.ts
//! ```

#[macro_use]
extern crate napi_derive;

mod area;
mod error;
mod project;
mod query_results;
mod task;
mod test_utils;
mod vault;
mod vault_index;
mod vault_session;
mod wikilink;
mod writer;

pub use area::*;
pub use error::*;
pub use project::*;
pub use query_results::*;
pub use task::*;
pub use vault::*;
pub use vault_session::*;
pub use writer::*;
