# tdn-claude-plugin

A Claude Code plugin for task and project management using the `tdn` CLI.

## What It Does

This plugin teaches Claude Code to work as a **productivity assistant**, helping you manage tasks, projects, and areas stored as markdown files on disk. It provides:

- **Task Management Skill** — Comprehensive knowledge of the tdn system
- **Slash Commands** — Quick actions like `/tdn:today`

## Prerequisites

You need the `tdn` CLI installed and configured:

1. Install tdn (see [tdn-cli documentation](../tdn-cli/README.md))
2. Configure your vault in `~/.taskdn.json`:

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/projects",
  "areasDir": "~/notes/areas"
}
```

## Installation

### From Marketplace

```
/plugin marketplace add dannysmith/taskdn
/plugin install tdn@tdn-marketplace
```

### Development / Local Use

Load the plugin when starting Claude Code using the `--plugin-dir` flag:

```bash
claude --plugin-dir /path/to/tdn-claude-plugin
```

From the monorepo root:

```bash
claude --plugin-dir ./tdn-claude-plugin
```

## Usage

With the plugin loaded, Claude automatically has access to:

### Slash Commands

- `/tdn:today` — Show today's actionable tasks

### Skill Capabilities

Just ask Claude to help with task management:

- "What should I focus on today?"
- "Create a task to call the dentist"
- "Show me the Q1 Planning project status"
- "Mark the report task as done"
- "What's overdue?"

Claude will use the `tdn` CLI with appropriate flags to help you.

## How It Works

The plugin provides a **skill** that teaches Claude:

1. **The tdn system** — Tasks, projects, and areas hierarchy
2. **CLI commands** — How to use `tdn` with the `--ai` flag
3. **When to use what** — CLI vs direct file access
4. **File format** — YAML frontmatter specifications

Claude adopts a **productivity assistant** mindset — thinking like a GTD coach rather than a programmer, even though it retains all its capabilities.

## Plugin Structure

```
tdn-claude-plugin/
├── .claude-plugin/
│   └── plugin.json           # Plugin manifest
├── commands/
│   └── today.md              # /tdn:today slash command
├── skills/
│   └── task-management/
│       ├── SKILL.md          # Main skill (overview)
│       ├── command-reference.md
│       ├── decision-guide.md
│       ├── examples.md
│       ├── specification.md
│       └── templates.md
└── README.md
```

## Contributing

This plugin is part of the [Taskdn](../) monorepo. See the main repository for contribution guidelines.

## License

Licensed under [MIT](./LICENSE).
