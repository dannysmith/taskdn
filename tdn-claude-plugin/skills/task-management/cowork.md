# Cowork Environment Guide

This document covers using tdn inside **Claude Cowork** — Anthropic's sandboxed Linux VM environment for Claude Desktop.

---

## How Cowork Differs from Claude Code

| Aspect | Claude Code | Cowork |
|--------|-------------|--------|
| `tdn` binary | Globally installed | Not installed — must be set up |
| Config file | `~/.taskdn.json` | None — must be created locally |
| Vault paths | User's home directory | Mounted paths (e.g. `/sessions/xxx/mnt/tasks`) |
| Platform | macOS/Linux/Windows | Linux ARM64 (always) |
| Internet | Always available | Usually available |

---

## Setup Flow

When you detect you're in a Cowork environment (no `tdn` in PATH, Linux platform), follow these steps:

### Step 1: Install the tdn Binary

**Primary method — install via npm:**

```bash
npm install -g @taskdn/cli
export PATH="$PATH:$(npm prefix -g)/bin"
```

This is the most reliable method in Cowork, since `registry.npmjs.org` is on the default allowlist.

**Fallback 1 — download from GitHub Releases:**

```bash
curl -fsSL https://github.com/dannysmith/taskdn/releases/latest/download/install.sh | bash
export PATH="$PATH:$HOME/.local/bin"
```

**Fallback 2 — pre-placed binary in mounted folder:**

Search mounted directories for a pre-placed binary:

```bash
# Look for a tdn binary the user may have included in their mounted folders
find /sessions/*/mnt/ -name 'tdn' -o -name 'tdn-linux-arm64' 2>/dev/null
```

If found, use it directly by its full path.

If no method works, fall back to direct file access mode (see "Degraded Mode" below).

### Step 2: Discover Mounted Vault Directories

The user must have shared/mounted their tasks, projects, and areas folders. Find them:

```bash
# List all mounted directories to identify vault paths
ls /sessions/*/mnt/ 2>/dev/null || ls /mnt/ 2>/dev/null
```

Look for directories named `tasks`, `projects`, and `areas` (or similar). If unsure, ask the user which mounted directories correspond to their vault.

### Step 3: Create Local Configuration

Create a `.taskdn.json` in the current working directory with the discovered paths:

```json
{
  "tasksDir": "/sessions/xxx/mnt/tasks",
  "projectsDir": "/sessions/xxx/mnt/projects",
  "areasDir": "/sessions/xxx/mnt/areas"
}
```

Replace the paths with the actual mounted paths from Step 2.

### Step 4: Verify

```bash
tdn config --ai
```

This should show the resolved paths pointing to the mounted directories. If it shows default paths instead, the local config wasn't picked up — check the working directory.

---

## Degraded Mode (No Binary)

If `tdn` can't be installed or found, you can still work with the vault using direct file access:

- **Read tasks:** Use `Read` and `Glob` tools to read markdown files from the mounted vault directories
- **Search:** Use `Grep` to search across task files
- **Create/edit:** Use `Write` and `Edit` tools, following the templates in [templates.md](templates.md) and the spec in [specification.md](specification.md)

This loses CLI benefits (validation, querying, status management), but is functional for basic task management.

---

## Important Notes

- **Setup runs each session.** Cowork sessions don't persist installed binaries or config files. The setup flow runs once at the start of each conversation.
- **Warnings are expected.** The CLI warns when vault paths are "outside your home directory" — this is normal in Cowork where paths look like `/sessions/xxx/mnt/tasks`. Ignore these warnings.
- **Ask about paths.** If you can't find the vault directories automatically, ask the user which folders they shared and what they contain.
