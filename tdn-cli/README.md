# tdn-cli

Task management CLI for humans and AI agents.

## Setup

```bash
bun install
bun run build
```

## Development

```bash
bun run check       # Lint, typecheck, clippy, and Rust tests
bun run fix         # Auto-fix formatting issues
bun run build:dev   # Build debug bindings
bun run test        # Run all tests (TS + Rust)
bun run test:ts     # Run TypeScript tests only
```

## Project Structure

```
src/           # TypeScript CLI code
crates/core/   # Rust core library (NAPI-RS)
bindings/      # Auto-generated JS/TS bindings (gitignored)
tests/         # TypeScript tests (E2E and unit)
docs/          # Developer documentation
```

## Documentation

- [Architecture Guide](docs/developer/architecture-guide.md) - High-level architecture and patterns
- [Testing Guide](docs/developer/testing.md) - Testing strategy and examples
