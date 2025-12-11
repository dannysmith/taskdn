# Phase 4: CLI Tool

Command-line interface for humans and AI agents.

## Scope

- Human-friendly formatted output (colors, tables, interactive prompts)
- Machine-readable output (JSON) for AI agents
- Commands: list, add, complete, edit, search, etc.
- Configuration for task directory locations
- Shell completions

## Notes

Depends on Phase 3 (TypeScript SDK). Should optimize for both human usability and AI agent consumption.

- CLI interface for SDK
- Supports `-ai` flag which returns results in an AI-friendly, token efficient format to STDOUT
- Supports `--dry-run` for all write operations
- Supports `--json` which return all data as JSON
- Supports piping data in in various formats
- Paths (and other settings) are configurable in `~/.taskdn.config.json`, which can be overriden by a local `.taskd.config.json`.
- Shipped as a single Bun executable
