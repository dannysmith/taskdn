# Taskdn Product Principles

Core principles guiding product decisions across all Taskdn products. For background on the project and its goals, see [Overview](./overview.md).

These principles are constraints, not aspirations. When evaluating a feature or design decision, check it against these principles. If it violates one, either reconsider the approach or have a very good reason for the exception.

For the user-facing philosophy, see the [Philosophy](https://tdn.danny.is/philosophy/) page on the website.

---

## Data & Architecture

### 1. Files on Disk, Always

All persistent user data must be stored as markdown files with YAML frontmatter. No proprietary databases, no cloud-only storage, no binary formats, no exceptions.

This is the foundation everything else builds on. It's what enables data ownership, tool interoperability, AI assistance, and user freedom. Any feature that requires storing CORE data outside of markdown files is out of scope.

**In practice:**
- Task/project/area data → markdown files in user-specified directories
- User preferences → JSON config files (not task data, so acceptable)
- Temporary state (window position, UI state) → local app storage (ephemeral, so acceptable)

### 2. Products Are Interfaces, Not Silos

Each Taskdn product is a window into shared data, not its own data store. Every product reads and writes the same file format. Users should be able to switch freely between products—or use multiple simultaneously—without migration, sync, or data conversion.

**In practice:**
- The desktop app, CLI, and Obsidian plugin all read the same task files
- Changes made in one product are immediately visible in others (they're the same files)
- No product should store task data that other products can't access
- Product-specific features (like UI preferences) stay product-specific; shared data stays shared

### 3. Specification Conformance

All products must implement the S1 specification for data format. This ensures that files created by one product work correctly in all others. Following S2 implementation guidance ensures consistent, predictable behavior.

**In practice:**
- Before implementing file read/write, read `tdn-specs/S1-core.md`
- When making behavior decisions, consult `tdn-specs/S2-implementation-guidance.md`
- If the specs don't cover a situation, propose a spec update rather than inventing product-specific behavior
- Test interoperability: files created in product A should work correctly in product B

---

## Design Philosophy

### 4. Opinionated About Tasks, Agnostic About Everything Else

Taskdn has strong, intentional opinions about task structure: a defined set of statuses, required fields, specific semantics for dates and states. This rigidity is what enables smart interfaces—when the app knows exactly what "blocked" means, it can build useful views without user configuration.

Outside of task structure, Taskdn has almost no opinions. Project files can contain anything. Users can add custom frontmatter fields. File naming is flexible. Directory locations are configurable.

**In practice:**
- Task statuses are fixed: `inbox`, `ready`, `in-progress`, `blocked`, `icebox`, `done`, `dropped`
- Don't add "custom status" features—the fixed set is intentional
- Do preserve unknown frontmatter fields—users may have their own tooling
- Don't enforce opinions about markdown body content, project structure, or file naming

### 5. Context-Appropriate Interfaces

Different contexts call for different tools. Quick capture while working on something else needs speed—every click is friction. Focused "doing mode" needs simplicity—show what's next, hide everything else. Weekly planning needs overview—projects, deadlines, blocked items.

No single interface serves all these contexts well. Rather than building one product that compromises everywhere, build purpose-specific products optimized for their use case.

**In practice:**
- The desktop app is optimized for humans doing focused task management
- The CLI has separate modes for humans (pretty output, prompts) vs AI agents (structured data, no prompts)
- The Obsidian plugin is lightweight—you're there to write, not to manage tasks
- When adding features, ask: "Does this serve this product's core context, or does it belong elsewhere?"

### 6. AI as First-Class Citizen

Design all products with AI assistance in mind from the start. Files on disk means AI tools can read and write task data directly—no APIs, no integrations, no special permissions. But "possible" isn't enough; it should be *good*.

**In practice:**
- CLI commands support `--ai` mode with structured, token-efficient output
- Output formats degrade gracefully if truncated
- Commands return complete context in single calls where possible (avoid requiring agents to make many round trips)
- Behavior is predictable and documented—agents shouldn't need to guess
- The Claude Code plugin teaches Claude the system rather than requiring it to figure things out

---

## Scope & Boundaries

### 7. For Individuals Only

Taskdn is personal task management software. It's designed for one person managing their own tasks, projects, and areas. Team features are explicitly out of scope.

This isn't a temporary limitation—it's a design choice. Team task management has fundamentally different requirements (permissions, notifications, assignment, shared views) that would compromise the simplicity and file-based architecture that makes Taskdn work.

**Out of scope:**
- Multi-user access or permissions
- Task assignment to others
- Shared projects or collaborative editing
- Real-time sync between users
- Comments or discussion threads
- Activity feeds or notifications about others' changes

### 8. Interoperability Over Lock-In

Taskdn should fit into users' existing setups, not demand reorganization. Play well with other tools. Make it easy to leave.

**In practice:**
- Preserve unknown frontmatter fields when writing files (users may have custom tooling)
- Use standard formats: markdown, YAML, wikilinks (Obsidian-compatible syntax)
- Don't require specific directory structures beyond the three configurable paths
- Maintain compatibility with other file-based task systems where reasonable
- If a user decides Taskdn isn't for them, their files are still just markdown—take them anywhere

---

## Implementation Standards

### 9. Never Lose User Data

This is non-negotiable. Round-trip file operations must preserve user content completely: markdown body, formatting, YAML field order, unknown fields, even YAML comments where technically feasible.

When encountering malformed or unexpected files, handle gracefully. Warn the user; don't silently corrupt or destroy data. A file that can't be parsed should be left untouched, not "fixed" in ways that lose information.

**In practice:**
- Test round-trip preservation: read a file, write it back, diff should be minimal/none
- Unknown frontmatter fields pass through unchanged
- Markdown body content is never modified unless explicitly requested
- Parse errors result in warnings, not data loss
- When in doubt, preserve the original

### 10. Explicit Behavior, No Magic

Users and AI agents should be able to predict what a product will do. Avoid hidden behaviors, implicit conventions, or "smart" features that sometimes do unexpected things.

**In practice:**
- Commands do what they say; no side effects beyond what's documented
- Don't auto-update timestamps or fields unless that's the explicit purpose of the operation
- Filtering and sorting logic should be documented and consistent
- If a feature requires explaining edge cases, it might be too clever
- Prefer boring and predictable over smart and surprising
