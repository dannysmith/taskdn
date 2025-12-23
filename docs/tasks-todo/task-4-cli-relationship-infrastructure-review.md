# Task 4: Relationship Infrastructure & Review

**Work Directory:** `tdn-cli/`

**Depends on:** Task 3 (List Command)

## Overview

This is a review checkpoint after implementing basic show and list functionality. Before proceeding to the context command (which fundamentally requires relationship traversal), we pause to:

1. Review the current codebase – We have now implemented enough features which work, That we can begin looking for architectural refactors. The current implementations are likely somewhat simple, And little thought has been given to obvious abstractions. Specifically review the rust parseing code as a whole.
2. Refactor as needed
3. Design and implement the relationship infrastructure (ie tasks, project & areas via wikilinks in frontmatter)

## Why This Checkpoint Exists

We have now implemented enough features which work, That we can begin looking for architectural refactors. The current implementations are likely somewhat simple, And little thought has been given to obvious abstractions.

Also: the context command (`context area "Work"`) must find all projects with `area: [[Work]]` and all tasks belonging to those projects. Without proper infrastructure, this becomes O(tasks × projects) file reads per query.

We probably need a **scan-once-and-index** approach before Task 5. But we should explore our options here before settling on the idea of maintaining our own index.

## Phases

### Phase 1: Review

Review the current code base critically, focusing specifically on architectural patterns which will reduce duplication and lead to a more efficient and reliable system in the future. The current code base should now contain enough implementation code that it's possible to think about a more coherent approach to reading and parseing files, and providing the required CLI output. Do bear in mind that we haven't yet implemented any features which write to files. That's coming in Task 6. While we don't want to prematurely optimise for that any major refactorings we do now should take that into account.

#### Parser Architecture Review

Review the current Rust parser code and identify improvements.

**Questions to answer:**

- Is the separation between `TaskFrontmatter` (internal) and `Task` (NAPI) appropriate?
- Should we have a shared `Entity` trait or keep parsers separate?
- Is error handling consistent across parsers?
- Are there obvious DRY violations?

**Not in scope:** Major rewrites. Just identify issues and fix obvious ones.

### Phase 2: Refactor

[TBD: refactor as needed based on phase 1]

### Phase 3: Relationship Infrastructure

[TBD: Design The implementation for this after phases one and two are completed.]

## Notes on Relationship Infrastructure

The notes below were developed a little while ago. They may inform our approach to phase three.

Create a utility to extract names from wikilink syntax.

**Function:**

```rust
/// Extract the target name from a file reference
/// "[[Q1 Planning]]" -> Some("Q1 Planning")
/// "[[Q1 Planning|Display Text]]" -> Some("Q1 Planning")
/// "./path/to/file.md" -> None (path, not wikilink)
fn extract_wikilink_name(reference: &str) -> Option<&str>
```

**Test cases:**

- `[[Simple Name]]` → `"Simple Name"`
- `[[Name|Alias]]` → `"Name"`
- `[[Name#Heading]]` → `"Name"`
- `[[Name#Heading|Alias]]` → `"Name"`
- `./relative/path.md` → `None`
- `path.md` → `None`

### Vault Index Design

Design the in-memory index structure for efficient relationship queries.

**Proposed structure:**

```rust
pub struct VaultIndex {
    // All entities
    pub tasks: Vec<Task>,
    pub projects: Vec<Project>,
    pub areas: Vec<Area>,

    // Name-to-index lookup (for resolving wikilinks)
    project_by_name: HashMap<String, usize>,  // lowercase name -> index
    area_by_name: HashMap<String, usize>,

    // Relationship maps
    tasks_by_project: HashMap<usize, Vec<usize>>,  // project idx -> task indices
    tasks_by_area: HashMap<usize, Vec<usize>>,     // area idx -> task indices (direct)
    projects_by_area: HashMap<usize, Vec<usize>>,  // area idx -> project indices
}
```

**Key methods:**

```rust
impl VaultIndex {
    /// Build index by scanning all directories
    pub fn build(config: &VaultConfig) -> Result<Self>;

    /// Get all tasks in an area (direct + via projects)
    pub fn tasks_in_area(&self, area_idx: usize) -> Vec<&Task>;

    /// Get all tasks in a project
    pub fn tasks_in_project(&self, project_idx: usize) -> Vec<&Task>;

    /// Get parent project for a task (if any)
    pub fn project_for_task(&self, task_idx: usize) -> Option<&Project>;

    /// Get parent area for a task (direct or via project)
    pub fn area_for_task(&self, task_idx: usize) -> Option<&Area>;
}
```

### Implement Vault Indexing

Implement the vault index in Rust.

**Build process:**

1. Scan tasks directory → parse all tasks
2. Scan projects directory → parse all projects
3. Scan areas directory → parse all areas
4. Build name lookup maps (lowercase for case-insensitive matching)
5. For each task, resolve project reference → populate tasks_by_project
6. For each task, resolve area reference → populate tasks_by_area
7. For each project, resolve area reference → populate projects_by_area

**Error handling:**

- Files that fail to parse: skip with warning, continue building index
- Unresolvable references: store as unresolved (for doctor command later)

### Expose Index to TypeScript

Decide how to expose the index via NAPI.

**Options:**

A. **Single function returning full index:**

```typescript
const index = buildVaultIndex(config)
// Use index.tasks, index.projects, etc.
```

B. **Query functions that build index internally:**

```typescript
const tasksInArea = getTasksInArea(config, 'Work')
// Index built and cached internally
```

C. **Hybrid - build index, return query handle:**

```typescript
const vault = openVault(config)
const tasks = vault.tasksInArea('Work')
vault.close() // or let it drop
```

**Recommendation:** Option A for simplicity. The CLI is short-lived, so we can afford to build the full index once and pass it around.

### Update List Command

Update the `--area` filter in the list command to use proper relationship traversal.

Before: Only finds tasks with direct `area: [[X]]` assignment
After: Finds tasks in area directly OR via their project

### Notes

- Keep the index simple - we can optimize later if needed
- Case-insensitive matching for wikilink resolution
- The index is rebuilt for each CLI invocation (no persistence)
- This sets up Task 5 (context command) for success
