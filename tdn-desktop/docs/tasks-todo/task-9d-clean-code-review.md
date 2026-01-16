# Task: Clean Code Review

A systematic review of the entire codebase to identify opportunities for cleaner, more maintainable code.

## Reference Material

Before beginning, familiarize yourself with Clean Code principles: https://gist.githubusercontent.com/wojteklu/73c6914cc446146b8b533c0988cf8d29/raw/c7a44d774fc3b09a0d5f0f58888550ba0ac694b9/clean_code.md

Also review the established architecture patterns in `docs/developer/architecture-guide.md` and `AGENTS.md`.

---

## Review Phases

This review is structured in **4 phases**. Execute each phase in a separate session, creating a findings document for each.

### Phase 1: Rust Backend

**Scope:** `src-tauri/src/` (excluding generated files in `target/`)

**Files to examine:**
- `lib.rs`, `main.rs`, `types.rs`, `bindings.rs`
- `commands/*.rs` (preferences, recovery, config, quick_pane, notifications, vault)
- `vault/*.rs` (error, scanner, wikilink, manager, entities, writer)
- `utils/*.rs`

**Output:** `docs/tasks-todo/task-9d-findings-rust.md`

---

### Phase 2: React Core Infrastructure

**Scope:** Non-component TypeScript/React code

**Files to examine:**
- `src/hooks/` - All custom hooks
- `src/services/` - TanStack Query integration
- `src/store/` - Zustand stores
- `src/lib/` - Commands, utilities, tauri-bindings
- `src/types/` - Type definitions
- `src/config/` - Configuration files
- `src/i18n/` - Internationalization setup

**Output:** `docs/tasks-todo/task-9d-findings-react-core.md`

---

### Phase 3: React Components

**Scope:** All React components

**Files to examine:**
- `src/components/layout/` - MainWindow, sidebars, layout components
- `src/components/sidebar/` - Sidebar-specific components
- `src/components/command-palette/` - Command palette system
- `src/components/preferences/` - Preferences dialog
- `src/components/ui/` - shadcn/UI components (focus on customized ones)
- `src/App.tsx`, `src/main.tsx`, `src/quick-pane-main.tsx`

**Output:** `docs/tasks-todo/task-9d-findings-react-components.md`

---

### Phase 4: Cross-Cutting Synthesis

**Scope:** Review findings from phases 1-3, examine cross-cutting concerns

**Activities:**
- Review all phase findings documents
- Look for patterns/inconsistencies across the codebase
- Examine file organization and naming conventions
- Check for duplicated logic between Rust and TypeScript
- Assess overall architectural consistency

**Output:** `docs/tasks-todo/task-9d-findings-synthesis.md` (final consolidated recommendations)

---

## What to Look For

### 1. Function/Component Size & Complexity

| Threshold | Language | Action |
|-----------|----------|--------|
| >40-50 lines | Rust functions | Evaluate for splitting |
| >100-150 lines | React components | Evaluate for splitting |
| >3 levels deep | Nesting (both) | Simplify or extract |

**Specific patterns:**
- Functions doing more than one conceptual thing (look for "do X *and* Y")
- High cyclomatic complexity - many `match`/`if`/ternary branches
- Flag arguments (booleans that fundamentally change behavior) - these often indicate two functions masquerading as one
- Functions with >4 parameters - consider grouping into a struct/object

### 2. Naming Clarity

**Red flags:**
- Cryptic abbreviations: `cmd`, `cfg`, `val`, `mgr`, `ctx` instead of full words
- Generic names that don't reveal purpose: `data`, `result`, `item`, `value`, `temp`, `info`, `stuff`
- Misleading names that don't match what the code actually does
- Inconsistent conventions: mixing `getUserData`/`fetchUserInfo`/`loadUser` for similar operations
- Ambiguous boolean props: `enabled`, `active`, `visible` without context of *what*

**Good naming asks:** "Would someone unfamiliar with this code understand what this is for?"

### 3. Single Responsibility Violations

**Look for:**
- Modules/files handling multiple unrelated concerns
- Components that fetch data AND render complex UI AND handle side effects
- Functions with distinct "sections" (often preceded by comments like "// now handle the...")
- Classes/structs with methods that don't relate to each other

### 4. Rust-Specific Concerns

**Error handling:**
- `unwrap()` in production code paths (should use `?` or explicit handling)
- `expect()` with poor/missing messages
- Inconsistent patterns: some functions use `?`, others use `match`, others `unwrap`

**Idioms:**
- Loops where iterators would be clearer
- Manual string building instead of `format!("{variable}")` (modern Rust style)
- Match arms containing complex logic that should be extracted
- Missing use of `if let` / `let else` where appropriate

**Organization:**
- Public items that should be private
- Missing documentation on public API

### 5. React/TypeScript-Specific Concerns

**State management (per architecture guide):**
- **CRITICAL:** Zustand destructuring violations - `const { x } = useStore()` causes render cascades
- State in wrong layer (local vs Zustand vs TanStack Query)
- Not using `getState()` in callbacks

**Types:**
- `any` type abuse - places where proper types were avoided
- Complex inline types that should be extracted and named
- Missing return types on functions where inference isn't obvious

**Hooks:**
- `useEffect` doing multiple unrelated things
- Missing or incorrect dependency arrays
- Custom hooks that are really just functions (no hook behavior)

**Components:**
- Props drilling through many layers (might need context or composition)
- Inline handler functions that are complex (should be extracted)
- Conditional rendering that's hard to follow

### 6. Comments

**Remove:**
- Commented-out code (this is what git is for)
- Redundant comments stating the obvious: `// increment counter` above `counter++`
- Outdated comments that no longer match the code

**Keep/Add:**
- Comments explaining *why* (business logic, non-obvious decisions)
- Warnings about consequences or gotchas
- Documentation for public APIs

**Assess:**
- TODO/FIXME comments - are they still relevant? Should they become tasks?

### 7. Magic Values

**Look for:**
- Hardcoded strings representing meaningful values (paths, keys, identifiers, error messages)
- Magic numbers: `if (items.length > 10)` instead of `MAX_VISIBLE_ITEMS`
- User-facing text hardcoded in English (should be i18n keys)
- Repeated literal values that could be constants

### 8. Code Smells (from Clean Code)

| Smell | Description | Look For |
|-------|-------------|----------|
| Rigidity | Small change cascades through many files | Tight coupling, missing abstractions |
| Fragility | Changes break unrelated code | Hidden dependencies |
| Needless Repetition | Same logic in multiple places | Copy-pasted code, similar patterns |
| Opacity | Code is hard to understand | Clever tricks, dense expressions, poor names |
| Negative conditionals | `if (!isNotEnabled)` | Double negatives, confusing boolean logic |

---

## What NOT to Be Dogmatic About

**Do not insist on:**
- Splitting functions that read clearly at 35-40 lines just to hit an arbitrary threshold
- Extracting code used only twice into a "reusable" helper (often makes things harder to follow)
- "One assert per test" - related assertions grouped together is fine
- Adding types where TypeScript inference is clear and correct
- Creating abstractions for hypothetical future requirements

**Accept:**
- Some inherent complexity in genuinely complex domains - distinguish "hard problem" from "poorly expressed solution"
- Longer functions if they have a clear linear flow and good internal structure
- Pragmatic trade-offs that the original author likely made intentionally

**Key question:** "Does this change make the code genuinely easier to understand and maintain, or am I just enforcing a rule?"

---

## Output Format

For each phase, create a findings document with this structure:

```markdown
# Clean Code Review: [Phase Name]

**Date:** YYYY-MM-DD
**Scope:** [What was reviewed]

## Summary

[2-3 sentence overview of findings]

## Critical Findings

[Issues that significantly impact maintainability or correctness]

### [Finding Title]

**Location:** `path/to/file.rs:123` (or line range)
**Issue:** [What's wrong]
**Principle:** [Which Clean Code principle this violates]
**Suggestion:** [Concrete improvement]

## Moderate Findings

[Issues worth addressing but not urgent]

### [Finding Title]
...

## Minor Findings

[Small improvements, nice-to-haves]

### [Finding Title]
...

## Observations

[Patterns noticed, things done well, architectural notes]

## Files Reviewed

- [ ] `file1.rs` - [brief note]
- [ ] `file2.rs` - [brief note]
...
```

**Severity guidelines:**
- **Critical:** Affects correctness, security, or significantly harms maintainability
- **Moderate:** Makes code harder to understand or modify, but not urgent
- **Minor:** Polish, small improvements, stylistic consistency

---

## Execution Notes

1. **Read before judging** - Always read the full context of code before flagging it
2. **Check for reasons** - Code that looks wrong might have a good reason; look for comments or context
3. **Be specific** - "This function is too long" is unhelpful; "Lines 45-80 handle validation and could be extracted to `validate_input()`" is actionable
4. **Prioritize impact** - Focus on changes that would most improve maintainability
5. **Respect existing patterns** - If the codebase consistently does something a certain way, inconsistency is worse than imperfection
