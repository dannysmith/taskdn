# Taskdn Desktop

A cross-platform desktop application for managing [S1-compliant](../tdn-specs/S1-core.md) task systems. Built with Tauri v2 and React 19, it provides a native experience on macOS, Windows, and Linux with features like a command palette, global quick-access pane, and automatic updates.

Part of the [Taskdn monorepo](../docs/overview.md).

## Stack

| Layer    | Technologies                                |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 7                |
| UI       | shadcn/ui v4, Tailwind CSS v4, Lucide React |
| State    | Zustand v5, TanStack Query v5               |
| Backend  | Tauri v2, Rust                              |

## Getting Started

```bash
# Install dependencies
bun install

# Run development build
bun run tauri:dev

# Run all quality checks
bun run check:all
```

## Documentation

- **[Developer Docs](docs/developer/)** - Architecture, patterns, and contribution guides

## License

Licensed under [AGPL-3.0](./LICENSE). This means you can use, modify, and distribute this software, but any modifications must also be shared under AGPL-3.0. See the license file for details.
