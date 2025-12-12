# taskdn-rust

Rust library for parsing, querying, and manipulating Taskdn task files.

## Overview

This is the core SDK that powers the Taskdn ecosystem. It provides:

- Parsing markdown files with YAML frontmatter
- Validation against the Taskdn specification
- CRUD operations for tasks, projects, and areas
- Query/filter capabilities (by status, project, area, dates, etc.)
- WikiLink and path reference resolution
- Preservation of unknown fields when writing

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
taskdn = "0.1"
```

## Usage

```rust
use taskdn::{Taskdn, TaskdnConfig};
use std::path::PathBuf;

let config = TaskdnConfig::new(
    PathBuf::from("./tasks"),
    PathBuf::from("./projects"),
    PathBuf::from("./areas"),
);

let sdk = Taskdn::new(config)?;
// Use sdk to list, read, create, update tasks...
```

## Development

### Prerequisites

- Rust 1.70+ (2021 edition)
- [just](https://github.com/casey/just) (optional, for task runner)

### Commands

Using `just`:

```bash
just          # Run all checks (default)
just build    # Build the library
just test     # Run tests
just lint     # Run clippy
just fmt      # Format code
just check    # Run format check, lint, and tests
```

Using cargo directly:

```bash
cargo build
cargo test
cargo clippy -- -D warnings
cargo fmt --check
```

### Project Structure

```
src/
├── lib.rs        # Public API and SDK entry point
├── config.rs     # Configuration types
├── error.rs      # Error types using thiserror
├── task.rs       # Task entity
├── project.rs    # Project entity
├── area.rs       # Area entity
├── parser.rs     # Frontmatter parsing via gray_matter
├── writer.rs     # File writing with field preservation
└── reference.rs  # WikiLink/path resolution
```

## Testing

Integration tests use the `dummy-demo-vault` (a disposable copy of the demo vault). Reset it with:

```bash
../scripts/reset-dummy-vault.sh
```

## License

MIT
