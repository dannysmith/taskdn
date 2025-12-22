# tdn-cli

Task management CLI for humans and AI agents.

## Setup

```bash
bun install
bun run build
```

## Development

```bash
bun run check       # Lint, typecheck, clippy, tests
bun run fix         # Auto-fix formatting issues
bun run build:dev   # Build debug bindings
```

## Project Structure

```
src/           # TypeScript CLI code
crates/core/   # Rust core library (NAPI-RS)
bindings/      # Auto-generated JS/TS bindings (gitignored)
```
