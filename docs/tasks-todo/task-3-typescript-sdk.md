# Phase 3: TypeScript SDK

TypeScript wrapper around the Rust SDK via NAPI or WASM.

## Scope

- Bindings to the Rust SDK
- TypeScript type definitions matching the specification
- Async/Promise-based APIs
- Works in Node.js environments
- Potentially browser-compatible via WASM (for desktop app)

## Notes

Depends on Phase 2 (Rust SDK) being complete. Will be consumed by the CLI and Desktop App.
