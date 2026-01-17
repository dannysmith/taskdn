# Monorepo Architecture

This document provides a technical overview of how the Taskdn monorepo is structured.

---

## Overview

Taskdn uses a simple monorepo structure with independent products. There's no workspace manager (no pnpm workspaces, Turborepo, or Nx)—each product is self-contained with its own dependencies and build process.

This keeps things simple: products don't share code at build time, and you can work on one product without understanding the others.

---

## Directory Structure

```
taskdn/
├── docs/                    # Shared documentation
│   ├── developer/           # Technical docs for all products
│   ├── tasks-todo/          # Development task tracking
│   └── tasks-done/          # Completed development tasks
├── images/                  # Brand assets (logos)
├── scripts/                 # Monorepo-level scripts
├── demo-vault/              # Canonical test vault (committed)
├── dummy-demo-vault/        # Disposable test vault (gitignored)
├── tdn-cli/                 # CLI tool
├── tdn-desktop/             # Desktop app
├── tdn-claude-plugin/       # Claude Code plugin
├── tdn-obsidian-plugin/     # Obsidian plugin (stub, main repo external)
├── tdn-specs/               # S1/S2 specifications
├── website/                 # Documentation site
├── AGENTS.md                # AI agent instructions
├── CLAUDE.md                # Points to AGENTS.md
└── package.json             # Root scripts only (no dependencies)
```

---

## Products

| Directory | Description | Stack |
|-----------|-------------|-------|
| `tdn-cli/` | Command-line interface | TypeScript (Bun) + Rust (NAPI-RS) |
| `tdn-desktop/` | Desktop application | Tauri v2, React 19, TypeScript |
| `tdn-claude-plugin/` | Claude Code plugin | Markdown skills/commands |
| `tdn-obsidian-plugin/` | Obsidian plugin | Stub only; lives in separate repo |
| `tdn-specs/` | Specifications | Markdown + JSON schemas |
| `website/` | Docs & marketing site | Astro + Starlight |

Each product has its own:
- `package.json` (JS/TS projects) or `Cargo.toml` (Rust)
- `CLAUDE.md` / `AGENTS.md` with product-specific AI instructions
- `docs/` folder for product-specific documentation

---

## Shared Resources

### Specifications (`tdn-specs/`)

The S1 and S2 specs define the data format and implementation guidance. All products that read/write task files must conform to these specs.

### Demo Vaults

Two test vaults exist for development:

| Vault | Purpose | Committed |
|-------|---------|-----------|
| `demo-vault/` | Canonical "golden" test data | Yes |
| `dummy-demo-vault/` | Disposable copy for testing | No |

Reset the dummy vault with `bun run demo:reset`.

### Scripts

Root-level scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| `monorepo-check.sh` | Run checks across all products |
| `reset-dummy-vault.sh` | Reset dummy vault from canonical |
| `complete-task.js` | Move completed dev tasks |
| `version-status.ts` | Check version consistency |

Run monorepo scripts via `bun run <script-name>` from the root.

---

## Working in the Monorepo

### Day-to-Day Development

Most work happens inside a single product directory. Navigate there and use that product's commands:

```bash
cd tdn-desktop
bun install
bun run tauri:dev
```

### Cross-Product Changes

When changes affect multiple products (e.g., spec changes), work from the root and run the monorepo check:

```bash
bun run monorepo:check
```

### Adding a New Product

1. Create `tdn-<name>/` directory
2. Add `CLAUDE.md` pointing to an `AGENTS.md`
3. Add entry to root `AGENTS.md` product table
4. Add entry to `docs/products.md`

---

## Design Decisions

**Why no workspace manager?**
Products have different stacks (Rust, TypeScript, Astro) and don't share runtime code. A workspace manager would add complexity without benefit.

**Why independent products?**
Each product can be developed, built, and released independently. This matches the "products are interfaces, not silos" principle—they share data (markdown files), not code.

**Why specs in the monorepo?**
Specifications evolve alongside implementations. Keeping them together ensures they stay in sync and makes cross-referencing easy.
