# Task 2: CLI Show Command Completion

**Work Directory:** `tdn-cli/`

**Depends on:** Task 1 (fixtures and error codes)

## Overview

The `show` command works for tasks but needs to support projects and areas. This task adds project/area parsing to Rust, extends the show command, and implements structured error codes.

## Phases

### Phase 1: Project Parsing in Rust

Add project parsing to `crates/core/src/`.

**Create `project.rs`:**
```rust
#[napi(string_enum)]
pub enum ProjectStatus {
    Planning,
    Ready,
    Blocked,
    InProgress,
    Paused,
    Done,
}

#[napi(object)]
pub struct Project {
    pub path: String,
    pub title: String,
    pub status: Option<ProjectStatus>,  // Optional per S1 spec
    pub unique_id: Option<String>,
    pub area: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub description: Option<String>,
    pub blocked_by: Option<Vec<String>>,
    pub body: String,
}

#[napi]
pub fn parse_project_file(file_path: String) -> Result<Project> { ... }
```

**E2E Test Example:**
```typescript
describe('taskdn show project', () => {
  test('outputs project title', async () => {
    const { stdout, exitCode } = await runCli([
      'show',
      fixturePath('vault/projects/minimal.md')
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Minimal Project');
  });
});
```

### Phase 2: Area Parsing in Rust

Add area parsing to `crates/core/src/`.

**Create `area.rs`:**
```rust
#[napi(string_enum)]
pub enum AreaStatus {
    Active,
    Archived,
}

#[napi(object)]
pub struct Area {
    pub path: String,
    pub title: String,
    pub status: Option<AreaStatus>,
    pub area_type: Option<String>,  // 'type' in YAML - free-form string per S1 spec
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub description: Option<String>,
    pub body: String,
}

#[napi]
pub fn parse_area_file(file_path: String) -> Result<Area> { ... }
```

### Phase 3: Show Project Command

Extend show command to handle projects.

**Detection logic:**
- If path contains `/projects/` or ends with project indicators, parse as project
- Or: explicit `show project <path>` syntax

**Output modes:**
```markdown
## Project: Q1 Planning (AI mode)

- **path:** ~/projects/q1-planning.md
- **status:** in-progress
- **area:** [[Work]]
- **start-date:** 2025-01-01
- **end-date:** 2025-03-31

### Body

Project description and notes...
```

### Phase 4: Show Area Command

Extend show command to handle areas.

**Output modes:**
```markdown
## Area: Work (AI mode)

- **path:** ~/areas/work.md
- **status:** active
- **type:** work

### Body

Area description...
```

### Phase 5: Structured Error Codes

Update error handling to use error codes from Task 1.

**NOT_FOUND example (AI mode):**
```markdown
## Error: NOT_FOUND

- **message:** File does not exist
- **path:** ~/tasks/nonexistent.md
- **suggestion:** Check the path or use `taskdn list` to find tasks
```

**NOT_FOUND example (JSON mode):**
```json
{
  "error": true,
  "code": "NOT_FOUND",
  "message": "File does not exist",
  "path": "~/tasks/nonexistent.md",
  "suggestion": "Check the path or use `taskdn list` to find tasks"
}
```

**PARSE_ERROR example:**
```markdown
## Error: PARSE_ERROR

- **message:** Invalid YAML frontmatter
- **path:** ~/tasks/broken.md
- **line:** 3
- **details:** Expected ':' but found '='
```

### Phase 6: Fuzzy Matching for Show (Human Mode)

When path doesn't exist but looks like a name, search for matches.

**Example:**
```bash
taskdn show "login bug"
# If multiple matches, prompt user to select
# If single match, show it
# If no matches, error with suggestions
```

**For AI mode:** Return AMBIGUOUS error with list of matches.

## Test Cases to Write

```typescript
// Phase 1-2: Parsing
describe('project parsing', () => {
  test('parses minimal project');
  test('parses project with all fields');
  test('returns error for nonexistent file');
});

describe('area parsing', () => {
  test('parses minimal area');
  test('parses area with all fields');
});

// Phase 3-4: Show command
describe('taskdn show project', () => {
  test('outputs project in human mode');
  test('outputs structured markdown in AI mode');
  test('outputs JSON with summary field');
});

describe('taskdn show area', () => {
  test('outputs area in human mode');
  test('outputs structured markdown in AI mode');
  test('outputs JSON with summary field');
});

// Phase 5: Error codes
describe('error handling', () => {
  test('NOT_FOUND includes error code in AI mode');
  test('NOT_FOUND includes error code in JSON mode');
  test('PARSE_ERROR includes line number');
});

// Phase 6: Fuzzy matching
describe('fuzzy matching', () => {
  test('finds task by partial title');
  test('prompts when multiple matches (human mode)');
  test('returns AMBIGUOUS error (AI mode)');
});
```

## Verification

- [x] `parseProjectFile()` exported from Rust bindings
- [x] `parseAreaFile()` exported from Rust bindings
- [x] `show <project-path>` works for all output modes
- [x] `show <area-path>` works for all output modes
- [x] Error codes appear in AI/JSON output
- [ ] Fuzzy matching works in human mode
- [x] All E2E tests pass
- [x] cli-progress.md updated

## Notes

- Entity type detection currently uses path heuristic (`/projects/` or `/areas/` in path). Will be replaced with config-based detection once config is implemented.
- Fuzzy matching should be case-insensitive substring (per CLI spec)
