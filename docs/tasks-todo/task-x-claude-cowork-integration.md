# Task: Make Taskdn Work in Claude Cowork

## Background

Anthropic released [Claude Cowork](https://claude.com/blog/cowork-research-preview) in January 2026 — a research preview that brings Claude Code's agentic capabilities to Claude Desktop for non-developers. It runs tasks in an isolated Linux VM.

**Key technical details:**
- Runs a lightweight Linux VM (Apple Silicon Macs and Windows)
- Hard isolation: Claude can only access explicitly mounted/shared folders
- No `~/.taskdn.json` or global `tdn` binary available
- No access to host `~/.claude/` — plugins/skills are managed via the Desktop app UI
- Pre-installed tools include Python, git, grep, curl (no Node.js/Bun)

**Goal:** Make the existing Claude Code plugin (`tdn-claude-plugin/`) work in both:
1. Claude Code (local machine, `tdn` globally installed)
2. Cowork sandbox (binary installed at session start, mounted directories)

## Research (March 2026 Update)

The original version of this doc (January 2026) proposed bundling a pre-compiled binary with the plugin. That approach doesn't work:

1. **Plugins can't bundle binaries** — the Claude Code plugin system supports markdown skills, scripts, hooks, and MCP configs, but not pre-compiled executables.
2. **Binary is 102MB** — the standalone `tdn` binary (built with `bun build --compile`) is far larger than the 15-25MB originally estimated.
3. **Cowork VM can't see `~/.claude/`** — plugin directories on the host aren't accessible from inside the VM.

### What Does Work (Verified)

Proof of concept tested on Linux ARM64 (2026-03-14):

- `bun build --compile --minify src/index.ts --outfile dist/tdn-linux-arm64` produces a working standalone binary
- The binary runs with zero dependencies beyond glibc
- A local `.taskdn.json` in the working directory correctly overrides defaults
- `tdn context --ai` successfully reads a vault and produces structured output
- The existing `install.sh` script handles Linux ARM64 detection and installation

### Revised Approach: Install at Session Start

Instead of bundling, have Claude install `tdn` at the start of each Cowork session. The user mounts their vault folders, and the skill guides Claude through setup.

**Primary method: npm** (preferred since `registry.npmjs.org` is on Cowork's default allowlist):
```bash
npm install -g @taskdn/cli
```

**Fallback: GitHub Releases** (if npm is unavailable):
```bash
curl -fsSL https://github.com/dannysmith/taskdn/releases/latest/download/install.sh | bash
```

**Why this works:**
- npm's registry is on the Cowork allowlist (GitHub release assets are blocked)
- `curl` and `tar` are available as a fallback
- The install script already supports `linux-arm64`
- Local `.taskdn.json` in the working directory takes precedence over global config
- No changes needed to the binary or release pipeline

## Implementation Checklist

### Phase 1: Cowork Setup Documentation [✅ DONE]

- [x] Create `skills/task-management/cowork.md` with:
  - How Cowork environment differs from Claude Code
  - Step-by-step setup instructions for Claude to follow
  - How to discover mounted vault directories
  - How to create a local `.taskdn.json`
  - Troubleshooting (no internet, wrong paths, etc.)

### Phase 2: Update `/tdn:prime` for Environment Detection [✅ DONE]

- [x] Update `commands/prime.md` to detect the environment before running commands:
  1. Check if `tdn` is already available (`which tdn`)
  2. If not: check for Cowork signals (mounted paths, no home dir config)
  3. If Cowork detected: run install script, discover mounted dirs, create `.taskdn.json`
  4. Then proceed with normal priming (`tdn config --ai && tdn context --ai`)
- [x] Add `cowork.md` to the skill's detailed documentation list in SKILL.md

### Phase 3: Handle the "No Internet" Fallback [✅ DONE]

- [x] Document a fallback for when `curl` can't reach GitHub (e.g. no internet in VM):
  - User can pre-download the binary and include it in a mounted folder
  - Skill docs explain: "place `tdn` binary in your mounted folder, Claude will find it"
  - Claude searches mounted directories for a `tdn` or `tdn-linux-arm64` executable
- [x] Add fallback instructions to `cowork.md`

### Phase 4: Update Plugin README [✅ DONE]

- [x] Add "Using with Claude Cowork" section to README
- [x] Document user requirements:
  - Must share/mount their tasks, projects, and areas folders
  - Binary is downloaded automatically on first use (or placed in a mounted folder)
- [x] Note that setup runs once per session (not persistent across sessions)

### Phase 5: Suppress Warnings for Cowork Paths [✅ DONE]

- [x] The CLI warned when dirs are "outside your home directory" — this always triggers in Cowork where paths look like `/sessions/xxx/mnt/tasks`
- [x] Added `/sessions/` and `/mnt/` to the exemption list alongside `/tmp/` and `/var/folders/`
- [x] Added tests for the new exemptions
- [x] This was a CLI change in `tdn-cli/src/config/index.ts`

## Environment Detection Signals

| Signal | Claude Code | Cowork |
|--------|-------------|--------|
| `which tdn` | Returns path | Empty/error |
| `~/.taskdn.json` | Usually exists | No |
| Mounted paths (`/sessions/*/mnt/*` or similar) | No | Yes |
| `uname -s` | Darwin (usually) | Linux |
| Internet access | Yes | Usually yes |

## Setup Flow (What Claude Does)

```
1. User says /tdn:prime (or asks about tasks)
2. Claude checks: which tdn
   ├─ Found → normal flow (Claude Code)
   └─ Not found → Cowork setup:
      a. Try npm: npm install -g @taskdn/cli
         ├─ Success → continue
         └─ Failure → try curl
      b. Try curl: curl -fsSL <install-url> | bash
         ├─ Success → continue
         └─ Failure → look for binary in mounted dirs
      c. Discover vault dirs in mounted paths
      d. Create .taskdn.json with discovered paths
      e. Verify: tdn config --ai
      f. Continue with normal priming
```

## Path Mapping Reference

| User's Mac | Cowork VM |
|------------|-----------|
| `~/notes/tasks` | `/sessions/xxx/mnt/tasks` (or similar) |
| `~/notes/projects` | `/sessions/xxx/mnt/projects` |
| `~/notes/areas` | `/sessions/xxx/mnt/areas` |

The exact mount paths depend on what the user shares and the session ID. Claude should discover these dynamically rather than assuming a structure.

## Alternative Approaches Considered

### Binary Bundling in Plugin (Original Plan — Rejected)
Bundle a pre-compiled `tdn` binary inside the plugin directory. Rejected because:
- Plugin system doesn't support binary bundling
- Binary is 102MB (too large)
- Cowork VM can't access host plugin directories

### MCP Server (Rejected)
Create an MCP server wrapping tdn CLI that runs on host. Rejected because:
- User explicitly doesn't want MCP
- Adds complexity

### Python-based Skill (Rejected)
Reimplement CLI logic in Python (pre-installed in Cowork). Rejected because:
- Duplicates CLI functionality
- Maintenance burden of two implementations
- Loses Rust performance benefits

### Direct File Access Only (Fallback)
Just mount directories and work with files directly. Acceptable as degraded fallback but:
- Loses CLI benefits (validation, querying, formatted output)
- More error-prone for mutations
- The skill's `templates.md` and `specification.md` already document the file format for this case

## Open Questions

1. ~~**Internet in Cowork VM** — Can the VM always reach GitHub to download releases?~~ **Resolved:** The Cowork proxy blocks `release-assets.githubusercontent.com` but allows `registry.npmjs.org`. npm install is now the primary method; curl install script is the fallback for environments where npm isn't available.
2. **Install location persistence** — Does `~/.local/bin/` persist across Cowork sessions or is it wiped? If wiped, install runs every session (acceptable — takes seconds).
