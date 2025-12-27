# Task: CLI Interface Consolidation & Improvements

## Overview

Following a comprehensive CLI interface review (see `note-cli-interface-surface-inventory.md`), this task addresses inconsistencies and incomplete implementations to create a more predictable, memorable interface for both human users and AI agents.

**Primary goal:** Make the CLI predictable and easy to remember
**Secondary goal:** Enable future code rationalization (not part of this task)
**Scope:** External interface only

**Note:** Since the CLI hasn't shipped yet, these are improvements, not breaking changes.

## Design Principles

- **Predictability:** Same flags work everywhere
- **Clarity:** Clear, intuitive command names
- **Consistency:** No arbitrary special cases
- **Simplicity:** Fewer commands doing the right things (10 core commands instead of 13)
- **Completeness:** All fields settable non-interactively

---

## Phase 1: Core Command Naming

Rename commands to be more intuitive and descriptive.

### 1.1 Rename `add` → `new`

- [ ] **Implementation**

  - Update command name everywhere: `new`, `new project`, `new area`, `new task`
  - Update all code naming to match the interface

- **Rationale:** "New" is more intuitive (you're creating a new entity) than "add"

### 1.2 Rename `edit` → `open`

- [ ] **Implementation**

  - Update command name, help text, and all documentation
  - Update all code naming to match the interface

- **Rationale:** "Open" is more descriptive (you're opening a file, not necessarily editing it)

---

## Phase 2: Status Management Consolidation

Unify status-related commands under a single, consistent interface.

### 2.1 Replace `complete`, `drop`, and `status` with `set status`

- [ ] **Implementation**

  - Remove commands: `taskdn complete <path>`, `taskdn drop <path>`, `taskdn status <path> <value>`
  - Add command: `taskdn set status <path> <value>`
  - Support all status values: `inbox`, `ready`, `in-progress`, `blocked`, `done`, `dropped`, `icebox`
  - Auto-manage `completed-at` field:
    - Set timestamp when transitioning TO `done` or `dropped`
    - Clear timestamp when transitioning FROM `done` or `dropped`

- **Rationale:**
  - More consistent: no special-casing for done/dropped vs other statuses
  - Clearer: "set status" explicitly describes what it does (unlike "status" which sounds like a query)
  - Opens door for future `set` commands while keeping `update --set` for multi-field changes

### 2.2 Remove `inbox` convenience command

- [ ] **Implementation**

  - Remove `taskdn inbox` command
  - Document that users should use `taskdn list --status inbox` instead

- **Rationale:**
  - It's just `list --status inbox` (trivial, unlike `today` which has complex logic)
  - Teaches users about the `--status` filter pattern

---

## Phase 3: Universal Fuzzy Matching & Input Flexibility

Make the interface consistent and ergonomic for all input patterns.

### 3.1 Standardize all commands to accept both paths AND fuzzy matching

- [ ] **Current Problem**

  - Some commands document fuzzy matching, some require paths, but behavior is inconsistent
  - Current docs say write operations require paths in AI mode "for safety", but this provides no actual safety benefit since ambiguous fuzzy matches already error

- [ ] **Implementation**

  - Commands to update: `set status`, `update`, `archive`, `open`, `append-body` (and any other commands currently requiring paths)
  - Make them accept either: exact file paths OR fuzzy title search
  - Examples:
    - Fuzzy: `taskdn set status "login bug" done`
    - Path: `taskdn set status ~/tasks/login-bug.md done`

- [ ] **Ambiguity Handling**

  - Human mode: Interactive prompt to select if multiple fuzzy matches found
  - AI mode: Return AMBIGUOUS error with list of all matches
  - Exact paths: Always work (no fuzzy matching attempted)

- [ ] **Performance Considerations**

  - Path lookup: Single file read operation (fast)
  - Fuzzy matching: Requires scanning all files in directory (slower)
  - Use existing Rust scan functions (scanTasks/scanProjects/scanAreas)
  - Consider caching directory scans if performance becomes an issue with large vaults, or use existing index

- **Benefits:**
  - ✅ Consistent: one rule for all commands (no "reads vs writes" distinction)
  - ✅ Safe: ambiguity checking prevents accidents (same safety as path-only approach)
  - ✅ Simple: easier to document and remember
  - ✅ AI-friendly: agents naturally use paths from `list`/`context` output anyway
  - ✅ Human-friendly: can type short names when iterating quickly

### 3.2 Accept both singular and plural entity types

- [ ] **Implementation**

  - Accept both forms for all entity types:
    - `list task` and `list tasks`
    - `list project` and `list projects`
    - `list area` and `list areas`
    - `new task` and `new tasks`
    - `new project` and `new projects`
    - `new area` and `new areas`

- **Rationale:**
  - Common pattern in well-designed CLIs (e.g., kubectl)
  - Removes friction, costs nothing to implement

---

## Phase 4: Complete Filter & Flag Support

Fix incomplete filter implementations and missing flags.

### 4.1 Add filtering to `list projects`

- [ ] **Implementation**

  - Add support for: `--status`, `--limit`, `--query`
  - Add support for: `--sort`, `--desc`
  - Add support for: `--area` (filter projects by area)

- **Rationale:** Currently these flags are silently ignored, which violates principle of least surprise

### 4.2 Add filtering to `list areas`

- [ ] **Implementation**

  - Add support for: `--status`, `--limit`, `--query`
  - Add support for: `--sort`, `--desc`

- **Rationale:** Currently these flags are silently ignored, which violates principle of least surprise

### 4.3 Complete `--scheduled` filter implementation

- [ ] **Implementation**
  - Add support for `tomorrow` value (currently only `today` works)
  - Add support for `this-week` value
  - Match the behavior of `--due` filter for consistency

### 4.4 Add date flags to `new project` command

- [ ] **Implementation**

  - Add `--start-date` flag
  - Add `--end-date` flag

- **Rationale:**
  - Currently these are only available in interactive mode
  - Need to be available as flags for AI agents and scripting
  - Completes the project creation interface

---

## Phase 5: Documentation & Help Text

Update all documentation to reflect the new interface.

### 5.1 Document command relationships in help text

- [ ] **Implementation**
  - Make it clear that `set status` auto-manages `completed-at` field (unlike `update --set status=X`)
  - Explain when to use `set status` (single status change) vs `update --set` (multiple fields at once)
  - Update all command help text to reflect new naming and behavior
