# Desktop App - Technical Overview

High-level technical architecture for Taskdn Desktop. For product requirements, see [Desktop Requirements](./desktop-requirements.md).

For detailed implementation patterns and developer documentation, see [tdn-desktop/docs/developer/](../../../tdn-desktop/docs/developer/).

## Tech Stack

| Layer    | Technology                              | Rationale                                                    |
| -------- | --------------------------------------- | ------------------------------------------------------------ |
| Shell    | Tauri v2                                | Native performance, small bundles, Rust security             |
| Backend  | Rust                                    | Type safety, memory safety, performance for file operations  |
| Frontend | React 19 + TypeScript                   | Mature ecosystem, React Compiler for automatic optimization  |
| Bundler  | Vite 7                                  | Fast HMR, native ESM                                         |
| UI       | shadcn/ui v4 + Tailwind v4              | Accessible components, design system flexibility             |
| State    | Zustand v5 + TanStack Query v5          | Minimal boilerplate, clear separation of concerns            |
| Testing  | Vitest v4 + Testing Library             | Fast, compatible with Vite                                   |
| Quality  | ESLint, Prettier, ast-grep, clippy      | Comprehensive static analysis with architecture enforcement  |

## Architecture Decisions

### Why Tauri Over Electron

- **Bundle size**: ~10MB vs ~150MB+ for Electron
- **Memory usage**: Native webview vs bundled Chromium
- **Security**: Rust backend with capability-based permissions
- **Native feel**: Platform-specific title bars, vibrancy effects, native dialogs

### Three-Layer State Architecture

State management follows an "onion" model with clear ownership boundaries:

```
useState (component) → Zustand (global UI) → TanStack Query (persistent data)
```

- **useState**: Component-local UI state (form inputs, hover states)
- **Zustand**: Cross-component UI state (sidebar visibility, theme)
- **TanStack Query**: Server/persistent data (tasks, projects, preferences)

This prevents the common pitfall of putting everything in global state.

### Command-Centric Design

All user actions (menu clicks, keyboard shortcuts, command palette) route through a unified command system. This ensures:

- Consistent behavior regardless of trigger method
- Single point for enabling/disabling actions
- Easy discoverability via command palette
- Testable action handlers

### Type-Safe Rust-TypeScript Bridge

Tauri commands use [tauri-specta](https://github.com/specta-rs/tauri-specta) to generate TypeScript bindings from Rust function signatures. This provides:

- Compile-time type checking across the bridge
- Auto-generated TypeScript types for Rust structs
- No string-based `invoke()` calls

### React Compiler

React 19's compiler handles memoization automatically, eliminating the need for manual `useMemo`, `useCallback`, and `React.memo`. This reduces cognitive load and prevents common optimization mistakes.

### Architecture Enforcement via ast-grep

Custom ast-grep rules enforce architectural patterns at lint time (e.g., preventing Zustand store destructuring which causes render cascades). This catches anti-patterns before code review.

## Cross-Platform Strategy

| Platform | Title Bar            | Window Controls | Bundle Format |
| -------- | -------------------- | --------------- | ------------- |
| macOS    | Custom with vibrancy | Traffic lights  | `.dmg`        |
| Windows  | Custom               | Right side      | `.msi`        |
| Linux    | Native + toolbar     | Native          | `.AppImage`   |

Platform detection utilities handle OS-specific behaviors (keyboard modifiers, file paths, UI strings like "Reveal in Finder" vs "Show in Explorer").

## Security Model

- **Capability-based permissions**: Each window only gets the Tauri permissions it needs
- **Rust-first validation**: All file operations happen in Rust with path validation
- **Atomic file writes**: Write to temp file, then rename to prevent corruption
- **OS keychain for secrets**: Sensitive data (API tokens) stored in system keychain, not plain JSON

## Key Tauri Plugins

| Plugin            | Purpose                          |
| ----------------- | -------------------------------- |
| single-instance   | Prevent multiple app instances   |
| window-state      | Remember window position/size    |
| fs                | Sandboxed file system access     |
| dialog            | Native open/save dialogs         |
| global-shortcut   | System-wide keyboard shortcuts   |
| updater           | In-app auto-updates              |
| tauri-nspanel     | macOS floating panel (quick pane)|

## Detailed Documentation

Implementation details, code patterns, and developer guides are in `tdn-desktop/docs/developer/`:

- [Architecture Guide](../../../tdn-desktop/docs/developer/architecture-guide.md) - Mental models, component hierarchy, anti-patterns
- [State Management](../../../tdn-desktop/docs/developer/state-management.md) - Detailed state layer patterns
- [Command System](../../../tdn-desktop/docs/developer/command-system.md) - Command registration and execution
- [Tauri Commands](../../../tdn-desktop/docs/developer/tauri-commands.md) - Adding type-safe Rust commands
- [Cross-Platform](../../../tdn-desktop/docs/developer/cross-platform.md) - Platform-specific adaptations
- [Static Analysis](../../../tdn-desktop/docs/developer/static-analysis.md) - Linting tools and ast-grep rules
- [Full Documentation Index](../../../tdn-desktop/docs/developer/README.md)
