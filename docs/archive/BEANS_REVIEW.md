# Beans Project Review 2025-12-22

A comprehensive review of [Beans](https://github.com/hmans/beans) - an "agentic-first" issue tracker designed for AI coding agents and humans working alongside them.

## Executive Summary

Beans is a Go-based CLI tool that stores issues as markdown files with YAML frontmatter, specifically designed for AI agent interaction. Key differentiators:

1. **Agent-First Design**: The entire interface is built assuming AI agents are the primary users, with human UIs as secondary.
2. **GraphQL Query Language**: Uses GraphQL for structured, precise data retrieval - minimizing token usage for agents.
3. **Session Injection Pattern**: A `beans prime` command outputs agent instructions that get injected into AI session context.
4. **Full-Text Search**: Bleve-powered search with advanced query syntax.
5. **Relationship-Aware Data Model**: Parent/child hierarchies and blocking relationships with cycle detection.

---

## Context: Beans vs Taskdn

**Important**: Beans and Taskdn are built for very different contexts. This affects which patterns are relevant for us.

### Different Use Cases

| Aspect                | Beans                                                              | Taskdn                                           |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Primary Context**   | Working in a codebase with AI coding tools (Claude Code, OpenCode) | General-purpose personal task management         |
| **Scope**             | Programming/development-specific                                   | Life, work, projects - anything                  |
| **Agent Role**        | Agents managing their own work while coding                        | Agents helping humans manage their tasks         |
| **Integration Point** | Injected into coding sessions                                      | Standalone CLI, potentially various integrations |

### What's NOT Relevant for Taskdn

1. **The "Prime" Pattern & TodoWrite Overrides**: Beans aggressively injects instructions and overrides Claude's built-in task tools. This makes sense when you want the agent to use Beans _instead of_ its default tools during a coding session. Taskdn won't be used this way - we're not replacing an agent's internal task tracking, we're providing a general task management interface. **Not a priority for us.**

2. **Strict Type Hierarchy** (milestone → epic → feature → bug): This is programming-specific. The concept of "epics" and "bugs" doesn't translate to general task management. Our projects/areas model is more appropriate for life/work tasks. **Not applicable.**

3. **Commit Integration**: Beans has specific workflows around including bean files in git commits. This is irrelevant for general task management. **Not applicable.**

### What IS Relevant for Taskdn

1. **GraphQL as Query Language for Agents**: Very interesting. AI agents understand GraphQL well, and it allows precise field selection (token-efficient). However, see tradeoffs below.

2. **Bleve Search with BM25 Scoring**: Worth adopting as a standard for full-text search. BM25 provides better relevance ranking than TF-IDF - handles term frequency saturation and document length normalization well. Could be a good default for any search/query functionality we implement.

3. **Consistent Flag Patterns**: The inclusion/exclusion pattern (`-s todo` vs `--no-status completed`) and repeatability for OR logic is clean and predictable.

4. **Output Mode Design**: Default human-friendly, `--json` for machines (with implied non-interactive mode), `--quiet` for scripting.

### GraphQL Tradeoffs for Taskdn

**Advantages**:

- Well-understood by AI agents
- Self-documenting schema
- Very flexible - agents request exactly what they need
- Powerful filtering, including on relationships

**Disadvantages**:

- Returns JSON, which is somewhat token-inefficient
- JSON responses are verbose (many lines of output)
- Implementation complexity (code generation, resolver patterns)
- Learning curve for human users who don't know GraphQL

**Open Question**: Could we have GraphQL for agents AND a simpler interface for humans/scripts? Or is there a middle ground - GraphQL-like field selection with simpler filter syntax?

---

## 1. External Interface Design for AI Agents

This is the most important section for our purposes. Beans has put significant thought into agent interaction.

### 1.1 The "Prime" Pattern

The `beans prime` command outputs a complete agent instruction document that gets injected into the AI's system prompt. This happens:

- At **session start** (via hooks)
- Before **session compaction** (to preserve context)

The prime output includes:

```markdown
# EXTREMELY IMPORTANT: Beans Usage Guide for Agents

**Always use beans instead of TodoWrite to manage your work and tasks.**

## CRITICAL: Track All Work With Beans
```

**Key Insight**: They explicitly override Claude's built-in TodoWrite tool, replacing it with their own system. This is aggressive but effective.

### 1.2 Workflow Instructions

The prime document prescribes a specific workflow:

1. **BEFORE starting any task**: Create a bean with status `in-progress`
2. **THEN**: Do the work
3. **FINALLY**: Mark completed with `beans update <id> --status completed`
4. **IF COMMITTING**: Include both code changes AND bean file(s)

They also enforce a rule: **You CAN NOT mark a bean as "completed" if it still contains unchecked todo items.**

### 1.3 GraphQL Schema Injection

The prime command dynamically injects the **complete GraphQL schema** into the agent's context:

```markdown
**GraphQL Schema:**

type Query {
bean(id: ID!): Bean
beans(filter: BeanFilter): [Bean!]!
}
...
```

This teaches the agent exactly what queries are possible without needing to look up documentation.

### 1.4 Query Examples in Instructions

The prime document includes practical query examples:

```bash
# Find actionable beans (not completed, not draft, not blocked)
beans query '{ beans(filter: { excludeStatus: ["completed", "scrapped", "draft"],
  isBlocked: false }) { id title status type priority } }'

# Find high-priority bugs
beans query '{ beans(filter: { type: ["bug"], priority: ["critical", "high"] })
  { id title status body } }'

# Full-text search
beans query '{ beans(filter: { search: "authentication" }) { id title } }'
```

### 1.5 Agent Integration Methods

**Claude Code**: Uses hooks in `.claude/settings.json`:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "beans prime" }] }
    ],
    "PreCompact": [
      { "hooks": [{ "type": "command", "command": "beans prime" }] }
    ]
  }
}
```

**OpenCode**: Plugin that transforms system prompt:

```typescript
export const BeansPrimePlugin: Plugin = async ({ $ }) => {
  const prime = await $`beans prime`.text()
  return {
    'experimental.chat.system.transform': async (_, output) => {
      output.system.push(prime)
    },
    'experimental.session.compacting': async (_, output) => {
      output.context.push(prime)
    },
  }
}
```

---

## 2. GraphQL Query Interface

### 2.1 Why GraphQL?

GraphQL allows agents to request **exactly** the fields they need, minimizing token usage. Compare:

```bash
# Without GraphQL - returns everything
beans list --json

# With GraphQL - returns only what's needed
beans query '{ beans { id title status } }'
```

### 2.2 Full Schema

**Queries:**

```graphql
type Query {
  bean(id: ID!): Bean # Single bean lookup
  beans(filter: BeanFilter): [Bean!]! # Filtered list
}
```

**Mutations:**

```graphql
type Mutation {
  createBean(input: CreateBeanInput!): Bean!
  updateBean(id: ID!, input: UpdateBeanInput!): Bean!
  deleteBean(id: ID!): Boolean!
  setParent(id: ID!, parentId: String): Bean!
  addBlocking(id: ID!, targetId: ID!): Bean!
  removeBlocking(id: ID!, targetId: ID!): Bean!
}
```

**Bean Type with Relationships:**

```graphql
type Bean {
  id: ID!
  title: String!
  status: String!
  type: String!
  priority: String!
  tags: [String!]!
  body: String!
  createdAt: Time!
  updatedAt: Time!

  # Direct link fields
  parentId: String
  blockingIds: [String!]!

  # Computed relationships (with optional filtering!)
  blockedBy(filter: BeanFilter): [Bean!]!
  blocking(filter: BeanFilter): [Bean!]!
  parent: Bean
  children(filter: BeanFilter): [Bean!]!
}
```

**Powerful Filtering:**

```graphql
input BeanFilter {
  search: String # Full-text search (Bleve query syntax)
  status: [String!] # Include only these statuses
  excludeStatus: [String!] # Exclude these statuses
  type: [String!]
  excludeType: [String!]
  priority: [String!]
  excludePriority: [String!]
  tags: [String!]
  excludeTags: [String!]
  hasParent: Boolean
  noParent: Boolean
  parentId: String
  hasBlocking: Boolean
  noBlocking: Boolean
  isBlocked: Boolean
}
```

### 2.3 Nested Filtering

A particularly powerful feature - you can filter **relationships**:

```graphql
# Get a milestone with only its incomplete children
{
  bean(id: "abc") {
    title
    children(filter: { excludeStatus: ["completed", "scrapped"] }) {
      id
      title
      status
    }
  }
}
```

### 2.4 Implementation Details

- Uses **gqlgen** for Go GraphQL code generation
- In-memory executor (no HTTP server needed)
- Schema is embedded in the binary and can be printed with `beans query --schema`

---

## 3. CLI Command Structure

### 3.1 Command Overview

| Command   | Aliases    | Purpose                         |
| --------- | ---------- | ------------------------------- |
| `init`    | -          | Initialize project              |
| `create`  | `c`, `new` | Create new bean                 |
| `list`    | `ls`       | List beans (tree view default)  |
| `show`    | -          | Display single bean             |
| `update`  | `u`        | Modify bean properties          |
| `delete`  | `rm`       | Delete a bean                   |
| `graphql` | `query`    | Execute GraphQL                 |
| `check`   | -          | Validate data integrity         |
| `archive` | -          | Delete completed/scrapped beans |
| `roadmap` | -          | Generate markdown roadmap       |
| `prime`   | -          | Output agent instructions       |
| `tui`     | -          | Interactive terminal UI         |

### 3.2 Output Modes

Every command that outputs data supports:

- **Default**: Human-friendly, colored terminal output
- `--json`: Machine-readable JSON for agents
- `--quiet` / `-q`: IDs only (one per line)
- `--raw`: Raw markdown (for `show`)

**Key Design Choice**: JSON output **implies force mode** - no interactive prompts for machines.

### 3.3 Consistent Flag Patterns

```bash
# Status/Type/Priority flags are consistent across commands
beans create "Title" -t bug -s todo -p high
beans list -s todo -s in-progress -t bug --no-status completed
beans update <id> --status completed --priority normal
```

Filter flags support:

- **Inclusion**: `-s todo` (include)
- **Exclusion**: `--no-status completed` (exclude)
- **Repeatable**: `-s todo -s in-progress` (OR logic)

### 3.4 Full-Text Search

Uses Bleve query syntax:

```bash
beans list -S "login"           # Exact term
beans list -S "login~"          # Fuzzy match (1 edit distance)
beans list -S "log*"            # Wildcard prefix
beans list -S '"user login"'    # Exact phrase
beans list -S "user AND login"  # Boolean
beans list -S "title:login"     # Field-specific
```

---

## 4. Data Model

### 4.1 Storage Structure

```
project/
├── .beans.yml          # Config at project root
└── .beans/             # Data directory
    ├── proj-abc1-fix-login.md
    ├── proj-def2-new-feature.md
    └── ...
```

### 4.2 Bean File Format

```yaml
---
# proj-abc1
title: Fix authentication bug
status: in-progress
type: bug
priority: high
tags:
  - security
  - urgent
created_at: 2025-01-15T10:30:00Z
updated_at: 2025-01-15T14:20:00Z
parent: proj-xyz9
blocking:
  - proj-ghi3
  - proj-jkl4
---

## Description

The login form doesn't validate...

## Checklist

- [x] Investigate root cause
- [ ] Write fix
- [ ] Add tests
```

### 4.3 Filename Convention

`<prefix>-<nanoid>-<slug>.md`

Example: `myproj-abc1-fix-login-bug.md`

- **Prefix**: Configurable per project (default: directory name + "-")
- **NanoID**: 4-character unique identifier
- **Slug**: Derived from title, URL-safe

### 4.4 Type Hierarchy

Types have a **strict parent-child hierarchy** enforced by the system:

```
milestone
  └── epic
        └── feature
              └── task, bug
```

- Milestones cannot have parents
- Epics can only have milestones as parents
- Features can have milestones or epics
- Tasks/bugs can have milestones, epics, or features

### 4.5 Hardcoded Values

**Statuses** (ordered by sort priority):

1. `in-progress` - Currently being worked on
2. `todo` - Ready to be worked on
3. `draft` - Needs refinement
4. `completed` - Finished (archive status)
5. `scrapped` - Will not be done (archive status)

**Types**:

- `milestone` - Target release/checkpoint
- `epic` - Thematic container
- `bug` - Something broken
- `feature` - User-facing capability
- `task` - Concrete work item

**Priorities**:

- `critical`, `high`, `normal`, `low`, `deferred`

---

## 5. Technical Architecture Highlights

### 5.1 In-Memory Core with Filesystem Persistence

```go
type Core struct {
    root   string              // .beans directory path
    config *config.Config
    mu     sync.RWMutex
    beans  map[string]*bean.Bean  // In-memory cache
    searchIndex *search.Index     // Bleve index (lazy)
}
```

- Beans loaded into memory on startup
- All mutations write-through to disk immediately
- Search index lazily initialized on first search

### 5.2 File Watching with Debounce

For long-running processes (TUI), beans implements file watching:

```go
const debounceDelay = 100 * time.Millisecond

// Events are batched during debounce window
func (c *Core) handleChanges(changes map[string]fsnotify.Op) {
    // Process file changes incrementally
    // Update in-memory state
    // Fan out to subscribers
}
```

Uses publish-subscribe pattern for change notifications:

```go
events, unsubscribe := core.Subscribe()
defer unsubscribe()
for batch := range events {
    // Handle EventCreated, EventUpdated, EventDeleted
}
```

### 5.3 Link Integrity Management

**Cycle Detection**: Uses DFS to prevent circular dependencies in parent and blocking relationships.

**Broken Link Detection**: `beans check` validates all links and can auto-fix:

```bash
beans check --fix  # Removes broken links and self-references
```

**Cascading Deletes**: When deleting a bean, incoming links are automatically removed from other beans.

### 5.4 GraphQL Implementation

Uses gqlgen with:

- Schema-first design
- Autobind to existing Go types
- Resolver pattern for computed fields
- In-memory executor (no network layer)

```go
// Direct execution without HTTP
exec := executor.New(es)
resp := exec.CreateOperationContext(ctx, params)
handler(ctx)
```

### 5.5 Bleve Search Configuration

```go
indexMapping := bleve.NewIndexMapping()
indexMapping.ScoringModel = "bm25"  // Better relevance than TF-IDF
```

Fields indexed: `id`, `slug`, `title`, `body`

---

## 6. Recommendations for Taskdn CLI

_See also "Context: Beans vs Taskdn" section at the top for what's relevant vs. not._

### 6.1 Adopt: Bleve Search with BM25 Scoring

Beans uses Bleve with BM25 scoring for full-text search. This is worth adopting as a standard:

```go
indexMapping := bleve.NewIndexMapping()
indexMapping.ScoringModel = "bm25"  // Better relevance than TF-IDF
```

**Why BM25 over TF-IDF**:

- Handles term frequency saturation (repeated terms don't over-boost results)
- Normalizes for document length (short docs aren't unfairly penalized)
- Generally produces more intuitive relevance rankings

**Bleve Query Syntax** is also worth considering - supports fuzzy matching, wildcards, phrases, boolean operators, and field-specific searches.

### 6.2 Adopt: Output Mode Design

Beans' pattern is solid and we should follow it:

- **Default**: Human-friendly, colored terminal output
- **`--json`**: Machine-readable JSON (implies non-interactive/force mode)
- **`--quiet` / `-q`**: IDs only, one per line (for scripting/piping)
- **`--raw`**: Unprocessed content (for `show`-type commands)

### 6.3 Adopt: Consistent Flag Patterns

The inclusion/exclusion pattern is clean:

```bash
# Inclusion (OR logic when repeated)
-s todo -s in-progress

# Exclusion
--no-status completed

# Combined
-s todo -s in-progress --no-type someday
```

### 6.4 Consider: GraphQL for Agent Interface

GraphQL is interesting but involves tradeoffs. See "GraphQL Tradeoffs for Taskdn" section above.

**If we adopt it**: Could offer both `tdn query '<graphql>'` for agents AND simpler flag-based commands for humans. GraphQL would be the "power user" interface.

**If we don't**: A simpler domain-specific query language could achieve similar goals. The key insight from Beans is that agents benefit from precise field selection - however we implement that.

### 6.5 Skip: Agent-Specific Patterns

These patterns are specific to Beans' use case (coding tools) and not relevant for Taskdn:

- **Prime/Injection Pattern** - for overriding built-in agent tools
- **TodoWrite Override** - for replacing agent's internal task tracking
- **Strict Type Hierarchy** - programming-specific (milestone → epic → feature → bug)
- **Commit Integration** - git-specific workflows

### 6.6 Opportunities (What Beans Lacks)

These are gaps in Beans that Taskdn is designed to address:

1. **Scheduled/Due Dates** - Beans focuses on status, not time
2. **Recurring Tasks** - Single-instance only
3. **Projects/Areas Model** - Beans uses parent hierarchy instead of explicit project/area concepts
4. **Defer/Someday Workflow** - Beans just uses priority
5. **Inbox Concept** - All beans are in the same flat structure

---

## 7. Summary of Key Decisions

| Aspect            | Beans Decision             | Notes                               |
| ----------------- | -------------------------- | ----------------------------------- |
| Storage           | Single `.beans/` directory | Flat structure, no subdirectories   |
| ID Format         | Prefix + NanoID + Slug     | Human-readable and unique           |
| Query Language    | GraphQL                    | Full schema exposed to agents       |
| Agent Integration | Session injection hooks    | Runs `beans prime` at session start |
| Statuses          | Hardcoded (5 values)       | Not configurable                    |
| Types             | Hardcoded (5 values)       | With hierarchy enforcement          |
| Priorities        | Hardcoded (5 values)       | Optional on beans                   |
| Relationships     | Parent + Blocking          | Single parent, multiple blocking    |
| Search            | Bleve (BM25)               | Full-text with advanced syntax      |
| TUI               | Built-in                   | Bubbletea-based                     |
| Language          | Go                         | Single binary distribution          |

---

## Appendix: Command Help Reference

### beans create

```
beans create [title] [flags]
  -s, --status     Initial status
  -t, --type       Bean type
  -p, --priority   Priority level
  -d, --body       Body content
  --tag            Add tag (repeatable)
  --parent         Parent bean ID
  --blocking       Blocking bean ID (repeatable)
  --json           Output as JSON
```

### beans list

```
beans list [flags]
  -S, --search     Full-text search
  -s, --status     Filter by status (repeatable)
  --no-status      Exclude by status (repeatable)
  -t, --type       Filter by type (repeatable)
  --no-type        Exclude by type (repeatable)
  -p, --priority   Filter by priority
  --tag            Filter by tag
  --has-parent     Filter beans with parent
  --no-parent      Filter beans without parent
  --is-blocked     Filter blocked beans
  --sort           Sort by: created, updated, status, priority, id
  -q, --quiet      Only output IDs
  --json           Output as JSON
```

### beans query

```
beans query <graphql> [flags]
  -v, --variables  Query variables as JSON
  -o, --operation  Operation name
  --json           Raw JSON output
  --schema         Print schema only
```
