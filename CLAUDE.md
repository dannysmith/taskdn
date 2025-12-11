# Claude Instructions for Taskdn

See @docs/ for full documentation. See @docs/tasks.md for task management

## Project Overview

Task management system for individuals that stores data as markdown files with YAML frontmatter. Monorepo containing Rust SDK, TypeScript SDK, CLI, Desktop App, Obsidian Plugin, and Claude Code Skill.

This is structured as a monorepo. Each `taskdn-*` is a self-contained project which should contain its own `docs/` directory for developer documentation, task management etc. The top-level `docs/` directory should only be used to store the core documentation and high-level phased plan docs.

## Core Rules

### Development Practices

**CRITICAL:** Follow these strictly:

1. **Read Before Editing**: Always read files first to understand context
2. **Follow Established Patterns**: Use patterns from this file and project docs
3. **Senior Architect Mindset**: Consider performance, maintainability, testability
4. Use `bun` instead of `pnpm` or `npm`.
