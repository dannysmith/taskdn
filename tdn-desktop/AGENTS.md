# AI Agent Instructions

## Monorepo Context

This is part of the [Taskdn monorepo](../docs/overview.md). See the parent `../CLAUDE.md` for general project instructions.

High-level documentation (requirements, technical overview) lives in `../docs/product-overviews/desktop/`.

## Overview

Taskdn Desktop is a desktop application for managing [S1-compliant](../tdn-specs/S1-core.md) task systems, built with Tauri v2 and React 19.

- **Frontend**: React 19, TypeScript, Vite 7, shadcn/ui v4, Tailwind v4
- **Backend**: Tauri v2, Rust
- **State**: Zustand v5 (global UI), TanStack Query v5 (persistent data)

## UI Mockup

A complete UI mockup exists at `../tdn-uimockup/`. This is a standalone Vite/React app with the same tech stack (React 19, Tailwind v4, shadcn/ui) that contains ~90+ production-quality components: all views, sidebar, task detail panel, kanban boards, calendar views, drag-and-drop, etc.

**Purpose**: The mockup proves the UI design works. It uses mock data via React Context (`AppDataContext`). We are porting these components to the desktop app and connecting them to the real Rust backend.

**Key difference**: The mockup uses synchronous in-memory mutations. The desktop app uses TanStack Query with async mutations backed by Rust/filesystem.

See `docs/tasks-todo/task-1-foundation.md` through `task-4-hardening.md` for the integration plan.

## Design Principle: Build As If From Scratch

When making architectural decisions, ask: **"If we were building this without the mockup, how would we do it?"**

The mockup is a prototype optimized for rapid prototyping (synchronous in-memory operations). The production app should use patterns optimized for correctness, maintainability, and the actual tech stack.

This means:

- Use idiomatic TanStack Query patterns, not workarounds to match the mockup
- Use idiomatic Rust/serde patterns, not contortions to match TypeScript types
- Components will need refactoring - this is expected, not a failure

**Example - async mutations:**

```typescript
// Mockup pattern (synchronous, won't work)
const newTaskId = createTask({ title: 'New task' })
setPendingEditItemId(newTaskId)

// Correct TanStack Query pattern (async)
const newTask = await createTaskMutation.mutateAsync({ title: 'New task' })
setPendingEditItemId(newTask.id)
```

## Key Commands

```bash
bun install              # Install dependencies
bun run tauri:dev        # Run development build
bun run check:all        # Run all checks (TS, ESLint, Prettier, ast-grep, clippy, tests)
bun run test             # Run Vitest tests
```

## Core Rules

### New Sessions

- Read the parent `../CLAUDE.md` for monorepo context
- Read @docs/tasks.md for task management
- Review `docs/developer/architecture-guide.md` for high-level patterns
- Check `docs/developer/README.md` for the full documentation index
- Check git status and project structure

### Development Practices

**CRITICAL:** Follow these strictly:

0. **Use bun only**: This project uses `bun`, NOT `npm` or `pnpm`. Always use `bun install`, `bun run`, etc.
1. **Read Before Editing**: Always read files first to understand context
2. **Follow Established Patterns**: Use patterns from this file and `docs/developer`
3. **Senior Architect Mindset**: Consider performance, maintainability, testability
4. **Batch Operations**: Use multiple tool calls in single responses
5. **Match Code Style**: Follow existing formatting and patterns
6. **Test Coverage**: Write comprehensive tests for business logic
7. **Quality Gates**: Run `bun run check:all` after significant changes
8. **No Dev Server**: Ask user to run and report back
9. **No Unsolicited Commits**: Only when explicitly requested
10. **Documentation**: Update relevant `docs/developer/` files for new patterns
11. **Removing files**: Always use `rm -f`

**CRITICAL:** Use Tauri v2 docs only. Always use modern Rust formatting: `format!("{variable}")`

## Architecture Patterns (CRITICAL)

### State Management Onion

```
useState (component) → Zustand (global UI) → TanStack Query (persistent data)
```

**Decision**: Is data needed across components? → Does it persist between sessions?

### Performance Pattern (CRITICAL)

```typescript
// ✅ GOOD: Selector syntax - only re-renders when specific value changes
const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)

// ❌ BAD: Destructuring causes render cascades (caught by ast-grep)
const { leftSidebarVisible } = useUIStore()

// ✅ GOOD: Use getState() in callbacks for current state
const handleAction = () => {
  const { data, setData } = useStore.getState()
  setData(newData)
}
```

### Static Analysis

- **React Compiler**: Handles memoization automatically - no manual `useMemo`/`useCallback` needed
- **ast-grep**: Enforces architecture patterns (e.g., no Zustand destructuring). See `docs/developer/static-analysis.md`
- **Knip/jscpd**: Periodic cleanup tools. Use `/cleanup` command (Claude Code)

### Event-Driven Bridge

- **Rust → React**: `app.emit("event-name", data)` → `listen("event-name", handler)`
- **React → Rust**: Use typed commands from `@/lib/tauri-bindings` (tauri-specta)
- **Commands**: All actions flow through centralized command system

### Tauri Command Pattern (tauri-specta)

```typescript
// ✅ GOOD: Type-safe commands with Result handling
import { commands } from '@/lib/tauri-bindings'

const result = await commands.loadPreferences()
if (result.status === 'ok') {
  console.log(result.data.theme)
}

// ❌ BAD: String-based invoke (no type safety)
const prefs = await invoke('load_preferences')
```

**Adding commands**: See `docs/developer/tauri-commands.md`

### Internationalization (i18n)

```typescript
// ✅ GOOD: Use useTranslation hook in React components
import { useTranslation } from 'react-i18next'

function MyComponent() {
  const { t } = useTranslation()
  return <h1>{t('myFeature.title')}</h1>
}

// ✅ GOOD: Non-React contexts - bind for many calls, or use directly
import i18n from '@/i18n/config'
const t = i18n.t.bind(i18n)  // Bind once for many translations
i18n.t('key')                 // Or call directly for occasional use
```

- **Translations**: All strings in `/locales/*.json`
- **RTL Support**: Use CSS logical properties (`text-start` not `text-left`)
- **Adding strings**: See `docs/developer/i18n-patterns.md`

### Documentation & Versions

- **Context7 First**: Always use Context7 for framework docs before WebSearch
- **Version Requirements**: Tauri v2.x, shadcn/ui v4.x, Tailwind v4.x, React 19.x, Zustand v5.x, Vite v7.x, Vitest v4.x

## Developer Documentation

For complete patterns and detailed guidance, see `docs/developer/README.md`.

Key documents:

- `architecture-guide.md` - Mental models, security, anti-patterns
- `state-management.md` - State onion, getState() pattern details
- `tauri-commands.md` - Adding new Rust commands
- `static-analysis.md` - All linting tools and quality gates

## Claude Code Commands & Agents

These are specific to Claude Code but documented here for context.

### Commands

- `/check` - Check work against architecture, run `bun run check:all`, suggest commit message
- `/cleanup` - Run static analysis (knip, jscpd, check:all), get structured recommendations
- `/init` - One-time template initialization

### Agents

Task-focused agents that leverage separate context for focused work:

- `plan-checker` - Validate implementation plans against documented architecture
- `docs-reviewer` - Review developer docs for accuracy and codebase consistency
- `userguide-reviewer` - Review user guide against actual system features
- `cleanup-analyzer` - Analyze static analysis output (used by `/cleanup`)
