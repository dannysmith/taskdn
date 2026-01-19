# Task: Make Taskdn Work in Claude Cowork

## Background

Anthropic released [Claude Cowork](https://claude.com/blog/cowork-research-preview) in January 2026 - a research preview that brings Claude Code's agentic capabilities to Claude Desktop for non-developers. It runs tasks in an isolated Linux VM using Apple's Virtualization Framework (VZVirtualMachine).

**Key technical details:**
- Runs a lightweight Linux VM on macOS (Apple Silicon only currently)
- Uses VZVirtualMachine with a custom Linux rootfs
- Pre-installed tools: Python, git, grep (no Node.js/Bun)
- User folders mounted at paths like `/sessions/[session-id]/mnt/[folder-name]`
- Hard isolation: Claude can only access explicitly mounted directories
- No `~/.taskdn.json` or global `tdn` binary available

**Goal:** Make the existing Claude Code plugin (`tdn-claude-plugin/`) work in both:
1. Claude Code (local machine, `tdn` globally installed)
2. Cowork sandbox (bundled binary, mounted directories)

## Research Sources

- [Cowork announcement](https://claude.com/blog/cowork-research-preview)
- [Simon Willison's analysis](https://simonwillison.net/2026/Jan/12/claude-cowork/)
- [Cowork Architecture Deep Dive](https://claudecn.com/en/blog/claude-cowork-architecture/)
- [Getting Started with Cowork](https://support.claude.com/en/articles/13345190-getting-started-with-cowork)
- [HN discussion](https://news.ycombinator.com/item?id=46613304)

## Proposed Approach

Bundle a pre-compiled Linux ARM64 `tdn` binary with the skill. When Claude detects it's in a sandboxed Cowork environment (no global `tdn`, mounted paths), use the bundled binary with a dynamically created config file.

### Why This Approach

1. **Binary compilation works**: `bun build --compile` creates self-contained executables
2. **Config already flexible**: CLI supports env vars > local `.taskdn.json` > user config > defaults
3. **Cross-compilation ready**: Already builds for `linux-arm64-gnu` and `linux-arm64-musl`

## Implementation Checklist

### Phase 1: Build & Verify Binary

- [ ] Build Linux ARM64 standalone binary
  ```bash
  # Build for glibc (standard Linux)
  napi build --release --target aarch64-unknown-linux-gnu -o bindings
  bun build --compile --minify src/index.ts --outfile dist/tdn-linux-arm64
  ```
- [ ] Verify binary size (expect 15-25MB) - check if acceptable for skill bundling
- [ ] Test binary in Cowork VM manually (mount folder containing binary, run it)
- [ ] Determine if Cowork uses glibc or musl

### Phase 2: Environment Detection

- [ ] Add detection logic to SKILL.md:
  - Check if `which tdn` returns a path (Claude Code)
  - Check for `/sessions/*/mnt/*` paths (Cowork)
  - Check for bundled binary in known location
- [ ] Document detection signals:

| Signal | Claude Code | Cowork |
|--------|-------------|--------|
| `which tdn` | Returns path | Empty/error |
| `/sessions/*/mnt/` | No | Yes |
| `~/.taskdn.json` | Usually exists | No |

### Phase 3: Update Plugin Structure

- [ ] Add binary to plugin:
  ```
  tdn-claude-plugin/
  ├── bin/
  │   └── tdn-linux-arm64          # Bundled binary
  ├── skills/
  │   └── task-management/
  │       ├── SKILL.md             # Updated with env detection
  │       ├── setup-cowork.md      # NEW: Cowork setup docs
  │       └── ...
  └── commands/
      ├── prime.md                 # Updated to handle both envs
      └── setup.md                 # NEW: /tdn:setup command
  ```

### Phase 4: Create Setup Flow

- [ ] Create `/tdn:setup` command that:
  1. Detects environment (Claude Code vs Cowork)
  2. In Cowork: discovers mounted directories
  3. Creates local `.taskdn.json` with mounted paths:
     ```json
     {
       "tasksDir": "/sessions/xxx/mnt/tasks",
       "projectsDir": "/sessions/xxx/mnt/projects",
       "areasDir": "/sessions/xxx/mnt/areas"
     }
     ```
  4. Verifies binary works: `./tdn-linux-arm64 config --ai`
- [ ] Update `/tdn:prime` to run setup if needed

### Phase 5: Update SKILL.md

- [ ] Add "Environment Detection" section
- [ ] Add "Cowork Setup" section
- [ ] Update command patterns to use appropriate binary path
- [ ] Document that users must mount tasks/projects/areas folders

### Phase 6: Documentation & Distribution

- [ ] Update plugin README with Cowork instructions
- [ ] Document user requirements:
  - Must grant folder access to tasks, projects, and areas directories
  - May need to include binary in a mounted folder (if plugins aren't accessible in VM)
- [ ] Consider a "Cowork starter kit" with binary included

## Key Unknowns to Resolve

1. **Plugin accessibility in Cowork**: Are `~/.claude/plugins/` files accessible from inside the Cowork VM? May need binary distributed separately.

2. **Skill size limits**: Is there a maximum size for skill bundles? Binary is 15-25MB.

3. **libc variant**: Does Cowork's Linux use glibc or musl? (Likely glibc)

4. **Session persistence**: Each session gets new ID - config needs regeneration each time.

5. **Path discovery**: Need reliable way to find mounted directories (glob `/sessions/*/mnt/*`).

## Path Mapping Reference

| User's Mac | Cowork VM |
|------------|-----------|
| `~/notes/tasks` | `/sessions/xxx/mnt/tasks` |
| `~/notes/projects` | `/sessions/xxx/mnt/projects` |
| `~/notes/areas` | `/sessions/xxx/mnt/areas` |

## Modified Command Pattern

```markdown
# In SKILL.md

## Running Commands

Determine the tdn binary path at session start:

**Claude Code (global)**:
```bash
TDN_BIN="tdn"
```

**Cowork (bundled)**:
```bash
TDN_BIN="/path/to/mounted/bin/tdn-linux-arm64"
```

Then use consistently:
```bash
$TDN_BIN list --ai
$TDN_BIN new "Task title" --ai
```
```

## Alternative Approaches Considered

### MCP Server (Rejected)
Create an MCP server wrapping tdn CLI that runs on host. Rejected because:
- User explicitly doesn't want MCP
- Unclear if Cowork VM can access host MCP servers
- Adds complexity

### Python-based Skill (Rejected)
Reimplement CLI logic in Python (pre-installed in Cowork). Rejected because:
- Duplicates CLI functionality
- Maintenance burden of two implementations
- Loses Rust performance benefits

### Direct File Access Only (Partial)
Just mount directories and work with files directly. Acceptable as fallback but:
- Loses CLI benefits (validation, querying, formatted output)
- More error-prone for mutations
- Could be used as degraded mode if binary doesn't work
