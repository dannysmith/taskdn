# Roadmap and Approach

## Development Principles

### Minimal by Default

We start with the simplest possible implementation and only add complexity when it provides clear value. This applies to both the file format (few required fields, sensible defaults) and the user interfaces (no bells and whistles unless they're actually necessary). Features earn their place by solving real problems, not by looking impressive.

---

## Historical Context

_This section documents decisions made during early development. It will be removed or consolidated once the project is more established._

### Original Plan

The original implementation plan was:

1. Produce a single spec covering file formats and some implementation details
2. Implement a Rust SDK (for the Tauri desktop app)
3. Generate a TypeScript SDK from the Rust one via NAPI-RS bindings
4. Publish both SDKs to npm and Cargo registries
5. Build the CLI using the TypeScript SDK
6. Build the Tauri desktop app using the Rust SDK

The project was also structured with completely separate sub-project folders (`taskdn-rust`, `taskdn-ts`, `taskdn-cli`, `taskdn-tauri`, `taskdn-obsidian-plugin`, etc.), with top-level work focused only on high-level planning.

### What We Learned

While designing the CLI's external interface, it became clear that many fundamental decisions about how users and tools should interact with tasks hadn't been made. These decisions—around querying, filtering, workflows, output formats, etc felt like they should be part of a general specification (now S2: Interface Design), not just baked into the CLI implementation. This would ensure consistency across all products: the CLI, the SDKs, and any future tools.

The sub-project structure also proved problematic during early development. Work in one directory constantly required referencing documentation and code in others, making the separation feel artificial and friction-inducing.

### December 2024 Reorganisation

Based on these learnings, the project was reorganised:

**Archived:**

- The early Rust and TypeScript SDKs (moved to `archived-projects/`). Starting with SDKs before settling the specifications and interface design was premature.

**Restructured:**

- Sub-projects renamed to "products" and consolidated
- Specs moved from `docs/` to their own top-level directory (`tdn-specs/`) since they're effectively a product
- Documentation reworked and consolidated (user guide merged into `overview.md`)
- Product folders now mostly empty, ready for implementation

**New Approach:**

1. Finalise all three specifications (S1, S2, S3), informed by the CLI interface design work already done
2. Extract any useful patterns from the archived SDK code
3. Decide on the right approach for building the CLI and SDKs together
4. Clean up remaining documentation

### Prior Art: Beans

During research, we discovered [Beans](https://github.com/hmans/beans)—a project with a different scope but interesting approaches to AI agent interaction with markdown task files. It uses GraphQL as a query language and has a well-designed external interface. Reviewing this is the first step in Task 1.

---

## Current Roadmap

See `docs/tasks-todo/` for active tasks. High-level phases:

1. **Specifications** — Finalise S1, S2, S3 based on CLI design work and Beans review
2. **Foundation** — Extract useful code from archived projects, establish build/test infrastructure
3. **CLI** — Implement the CLI tool
4. **Desktop** — Implement the Tauri desktop app
