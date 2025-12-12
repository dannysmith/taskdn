# Architecture Guide

## System Architecture

```
                         ┌─────────────────┐
                         │    Rust SDK     │
                         │  (taskdn-rust)  │
                         └────────┬────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
       ┌────────────────┐ ┌─────────────┐ ┌────────────────┐
       │ TypeScript SDK │ │   Desktop   │ │     Other      │
       │   (NAPI-RS)    │ │   (Tauri)   │ │ Rust consumers │
       └───────┬────────┘ └─────────────┘ └────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌─────────┐  ┌──────────┐
   │   CLI   │  │ Obsidian │
   │  (Bun)  │  │  Plugin  │
   └─────────┘  └──────────┘
```

| Project | Depends On | Notes |
|---------|------------|-------|
| `taskdn-rust` | Nothing | Foundation for everything |
| `taskdn-ts` | Rust SDK | NAPI-RS bindings |
| `taskdn-cli` | TS SDK | TypeScript + Bun |
| `taskdn-desktop` | Rust SDK directly | Tauri imports Rust SDK as Cargo dep |
| `taskdn-obsidian-plugin` | TS SDK | |

**Important:** Desktop uses Rust SDK directly (not TS SDK) because NAPI `.node` files don't work in webviews.

---

## Monorepo Approach

**No shared tooling** (no Turborepo, Nx, Lerna). Each project is self-contained.

Why:
- Mixed languages (Rust + TypeScript) - JS monorepo tools don't help
- Linear dependencies - no complex resolution needed
- Independent release cycles

### Cross-Project References

```toml
# taskdn-ts/Cargo.toml
taskdn-rust = { path = "../taskdn-rust" }

# taskdn-desktop/src-tauri/Cargo.toml
taskdn-rust = { path = "../../taskdn-rust" }
```

```json
// taskdn-cli/package.json (dev)
{ "dependencies": { "@taskdn/sdk": "file:../taskdn-ts" } }
```

### GitHub Actions

Per-project workflows with path filters. Changes to `taskdn-rust/` only trigger Rust SDK CI. TS SDK workflow watches both `taskdn-rust/` and `taskdn-ts/` since it depends on Rust.

---

## Design Principles

1. **Each project stands alone** - Works as if it were its own repo
2. **Rust is the source of truth** - All parsing, validation, business logic in Rust
3. **TypeScript is a thin wrapper** - NAPI bindings only, no business logic
4. **Files are the source of truth** - No databases, just markdown on disk
5. **Spec compliance** - All implementations follow `docs/user-guide/2-the-specification.md`
