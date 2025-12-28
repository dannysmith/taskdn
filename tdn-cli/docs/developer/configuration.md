# Configuration

Taskdn CLI is configured via `.taskdn.json` files.

## Config File Locations

1. **User config:** `~/.taskdn.json` - Global settings for all vaults
2. **Local config:** `./.taskdn.json` - Project-specific overrides

Local config takes precedence over user config.

## Configuration Fields

### Directory Paths

| Field         | Type   | Description                    | Default      |
| ------------- | ------ | ------------------------------ | ------------ |
| `tasksDir`    | string | Path to tasks directory        | `./tasks`    |
| `projectsDir` | string | Path to projects directory     | `./projects` |
| `areasDir`    | string | Path to areas directory        | `./areas`    |

Paths can be relative or absolute. Tilde (`~`) expands to home directory.

### Ignore Patterns

| Field    | Type       | Description                           | Default     |
| -------- | ---------- | ------------------------------------- | ----------- |
| `ignore` | `string[]` | Filename patterns to exclude scanning | `undefined` |

**Pattern Syntax:**

Patterns use `.gitignore`-style glob syntax and match **filenames only** (not paths).

| Pattern     | Matches                    | Example                   |
| ----------- | -------------------------- | ------------------------- |
| `file.md`   | Exact filename             | `cover.md`                |
| `*.bak`     | Any chars in filename      | `task.bak`, `foo.bak`     |
| `temp?.md`  | Single char                | `temp1.md`, `tempA.md`    |
| `[abc]*.md` | Character class            | `a-note.md`, `b-note.md`  |

**Case Sensitivity:**
- macOS/Windows: Case-insensitive (`cover.md` matches `Cover.md`)
- Linux: Case-sensitive

**Limitations:**
- Patterns match filenames only (cannot include `/` or `\`)
- Negation patterns (`!file.md`) not supported
- Recursive globs (`**/temp/**`) not needed (root-level scanning only)

### Example Configuration

```json
{
  "tasksDir": "~/notes/tasks",
  "projectsDir": "~/notes/4-projects",
  "areasDir": "~/notes/3-areas",
  "ignore": [
    "3-areas.md",
    "4-projects.md",
    "*.bak",
    "*.tmp",
    "README.md"
  ]
}
```

### Config Override Behavior

When both user and local configs exist:

- **Directory paths:** Local overrides user
- **Ignore patterns:** Local replaces user (no merging)

**Example:**

User config (`~/.taskdn.json`):
```json
{
  "ignore": ["*.bak"]
}
```

Local config (`./.taskdn.json`):
```json
{
  "ignore": ["cover.md"]
}
```

**Result:** Only `cover.md` is ignored (local replaces user).

### Invalid Patterns

Invalid glob patterns are logged as warnings and skipped. Other patterns continue to work.

```
Warning: Invalid ignore pattern '[invalid': <error details> (skipping)
```

## Environment Variables

Config can also be set via environment variables (highest priority):

| Variable              | Config Field  |
| --------------------- | ------------- |
| `TASKDN_TASKS_DIR`    | `tasksDir`    |
| `TASKDN_PROJECTS_DIR` | `projectsDir` |
| `TASKDN_AREAS_DIR`    | `areasDir`    |

**Note:** Ignore patterns cannot be set via environment variables.

## Security

The config system includes security protections:

### Path Validation

All directory paths are validated to prevent:
- Access to system directories (`/etc`, `/usr`, `/var/log`, etc.)
- Path traversal attacks
- Accidental data corruption

### Ignore Pattern Validation

Ignore patterns are validated to ensure:
- Patterns cannot contain absolute paths (e.g., `/etc/passwd`)
- Patterns cannot contain path traversal (e.g., `../secrets`)
- Patterns cannot contain path separators (filename matching only)

Invalid patterns are rejected with clear error messages.
