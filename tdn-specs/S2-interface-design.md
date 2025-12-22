# Specification S2: Interface Design

**Version:** 1.0.0-draft

This specification defines design patterns and principles for interfaces that interact with S1-compliant data. Implementing S2 ensures a consistent and predictable external interface across different tools (CLI, SDK, desktop applications).

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 1. Introduction

### 1.1 Purpose

This specification defines how interfaces should present S1-compliant data to users and other systems. While S1 defines the file format and S3 covers file operations, this specification addresses the user-facing and API-facing concerns.

### 1.2 Scope

This specification covers:
- Interface modes (human, machine, agent)
- Output formats for each mode
- Field naming and display conventions
- Date handling (input and output)
- Identification patterns
- Query and filter patterns
- Error handling
- Search recommendations

### 1.3 Applicability

This specification primarily targets:
- **Command-line interfaces (CLI):** Full applicability
- **Software development kits (SDK):** Full applicability for public APIs

For desktop applications, see Appendix A for notes on how these patterns apply to graphical interfaces.

### 1.4 Relationship to Other Specifications

- **S1 (Core):** Defines the file format. This specification assumes data conforms to S1.
- **S3 (Data Read/Write):** Defines file operation guidance. This specification covers higher-level interface concerns.

---

## 2. Design Philosophy

### 2.1 Two User Types

Interfaces serve two fundamentally different user types with different needs:

| Human Users | Machines (including AI agents) |
|-------------|-------------------------------|
| Want quick, scannable output | Want structured, complete data |
| Type short commands | Need unambiguous identifiers |
| Tolerate prompts and interaction | Need single-call efficiency |
| Value aesthetics (colors, alignment) | Value token efficiency |
| Think in fuzzy terms ("the login task") | Need exact references (file paths) |

### 2.2 Core Principles

1. **Optimize for each user type rather than compromise.** Interfaces SHOULD provide distinct modes optimized for human and machine users.

2. **Agent-facing interfaces SHOULD bundle related context.** When serving AI agents, provide entities with their related context in a single response (e.g., a task plus its project plus its area). This reduces round-trips and gives agents sufficient context to reason about the work. The specific API shape is implementation-defined.

3. **Predictable behavior over clever behavior.** Users should be able to predict what an interface will do. Avoid magic or implicit behaviors that might surprise users.

4. **Explicit over silent.** Empty results should be explicit, not silent. Errors should be informative, not cryptic.

---

## 3. Interface Modes

Interfaces SHOULD support multiple output modes to serve different user types.

### 3.1 Human Mode

The default mode for interactive use.

- **Output:** Formatted for readability (colors, alignment, tables)
- **Interaction:** MAY prompt for input when needed
- **Identification:** Fuzzy matching acceptable for read operations
- **Errors:** Prose with suggestions ("Did you mean...?")

### 3.2 Machine Mode (JSON)

For scripts, automation, and interoperability.

- **Output:** Structured JSON
- **Interaction:** Non-interactive (no prompts)
- **Identification:** Exact identifiers required for write operations
- **Errors:** Structured JSON with error codes

JSON mode implies non-interactive behavior—implementations MUST NOT prompt for input when in JSON mode.

### 3.3 Agent Mode

Optimized for AI coding assistants and LLM-based tools.

- **Output:** Structured Markdown (token-efficient, gracefully degradable)
- **Interaction:** Non-interactive (no prompts)
- **Identification:** Always includes file paths for follow-up operations
- **Errors:** Structured with error codes and actionable suggestions

**Why Markdown for agents?**
AI agents receive output in their context window. The format should be:
1. Token-efficient (LLMs pay per token)
2. Gracefully degradable (agents often truncate output)
3. Readable without parsing (no code execution needed)
4. Familiar (LLMs are trained heavily on Markdown)

JSON fails on degradability (truncated JSON is invalid). Markdown is organized text that LLMs can read directly.

**Context-rich responses:** Agent-facing interfaces SHOULD provide operations that return entities with their related context, minimizing the need for multiple queries. For example, returning a project along with its tasks and parent area in a single response.

---

## 4. Output Formats

### 4.1 Human Output

Human output is implementation-specific. General guidelines:
- Readable and scannable
- Use colors and formatting where the terminal supports it
- Group related information visually
- Show counts and summaries

### 4.2 JSON Output

JSON output MUST follow a consistent structure:

```json
{
  "summary": "<one-sentence description of what was returned>",
  "<entity-type>": [...]
}
```

**Examples:**

```json
// List of tasks
{
  "summary": "Found 3 tasks matching criteria",
  "tasks": [...]
}

// Single entity
{
  "summary": "Task: Fix login bug",
  "task": {...}
}

// Empty result
{
  "summary": "No tasks match the specified criteria",
  "tasks": []
}

// Multiple entity types
{
  "summary": "Work area with 2 projects and 8 tasks",
  "area": {...},
  "projects": [...],
  "tasks": [...]
}
```

The `summary` field ensures results are self-documenting. Entity types are clear from the keys.

### 4.3 Agent Output (Structured Markdown)

Agent output uses a consistent Markdown structure:

**Heading hierarchy:**
- `##` for top-level sections (entity type + count)
- `###` for individual entities
- Deeper nesting as needed for logical structure

**Field format:**
```markdown
- **field-name:** value
```

**Example:**
```markdown
## Tasks (2)

### Fix login bug

- **path:** ~/tasks/fix-login-bug.md
- **status:** in-progress
- **due:** 2025-12-15
- **project:** Q1 Planning

### Write documentation

- **path:** ~/tasks/write-docs.md
- **status:** ready
- **project:** Q1 Planning
```

**Array fields:** Display as comma-separated inline values:
```markdown
- **blocked-by:** [[Project A]], [[Project B]]
```

Empty arrays: `- **blocked-by:** (none)`

### 4.4 Empty Result Handling

Empty results MUST be explicit, never silent:

| Mode | Empty Result Output |
|------|---------------------|
| Human | "No tasks found matching your criteria." |
| JSON | `{"summary": "No tasks match...", "tasks": []}` |
| Agent | `## Tasks (0)\n\nNo tasks match the specified criteria.` |

---

## 5. Field Naming & Display

### 5.1 Canonical Field Names

Field names MUST use kebab-case as defined in S1:
- `created-at`, `updated-at`, `completed-at`
- `defer-until`
- `blocked-by`

Agent and machine modes MUST use canonical field names. This ensures consistency with file contents and allows programmatic field updates.

### 5.2 Human-Friendly Display Names

Human mode MAY use friendly display names:

| Canonical Name | Human Display |
|----------------|---------------|
| `status` | Status |
| `created-at` | Created |
| `updated-at` | Updated |
| `completed-at` | Completed |
| `due` | Due |
| `scheduled` | Scheduled |
| `defer-until` | Deferred Until |
| `project` | Project |
| `area` | Area |
| `description` | Description |
| `start-date` | Start Date |
| `end-date` | End Date |
| `blocked-by` | Blocked By |

### 5.3 The `project` vs `projects` Convention

S1 defines `projects` as an array (for compatibility with multi-project systems), but taskdn enforces single-project semantics. Interfaces SHOULD:

- Display as `project` (singular) in output
- Accept `project` in input
- Read `projects[0]` from files
- Write `projects: ["[[value]]"]` to files

If a file contains multiple projects, use the first one. Validation/health-check commands SHOULD warn about multi-project files.

---

## 6. Date Handling

### 6.1 Input Formats

Interfaces MUST accept ISO 8601 format:
- `YYYY-MM-DD` (date)
- `YYYY-MM-DDTHH:MM:SS` (datetime)

Interfaces MAY accept natural language for human convenience:
- Relative: `today`, `tomorrow`, `yesterday`
- Day names: `friday`, `next friday`
- Relative offsets: `+3d` (3 days), `+1w` (1 week), `+2m` (2 months)

Ambiguous formats like `12/1` or `1/12` SHOULD be rejected with an `INVALID_DATE` error.

**Natural language rules:**
- "today" = midnight in system local time
- Day names = the next occurrence of that day
- "next X" = skips the immediate occurrence

### 6.2 Output Formats

Output MUST always use ISO 8601:

| Field Type | Format | Example |
|------------|--------|---------|
| Date fields (due, scheduled, defer-until) | `YYYY-MM-DD` | `2025-12-20` |
| Timestamp fields (created, updated, completed) | `YYYY-MM-DDTHH:MM:SS` | `2025-12-15T14:30:00` |

### 6.3 Recommendations for Programmatic Clients

Programmatic clients (scripts, AI agents) SHOULD use ISO 8601 for all input. Natural language parsing introduces interpretation edge cases and is provided for human convenience only.

---

## 7. Identification Patterns

### 7.1 Path-Based Identification

File paths are unambiguous identifiers. For write operations in machine/agent mode, implementations SHOULD require exact paths.

**Path formats (all should be accepted):**
- Absolute: `/Users/name/tasks/fix-login.md`
- Tilde-expanded: `~/tasks/fix-login.md`
- Relative: `./tasks/fix-login.md` or `fix-login.md`

**Path format in output:** Use tilde notation for files under the user's home directory (`~/tasks/...`), otherwise use absolute paths. This keeps output readable while remaining unambiguous.

### 7.2 Fuzzy Matching

Fuzzy matching MAY be supported for read operations in human mode.

**Recommended rules:**
- Case-insensitive
- Substring match (query appears somewhere in title)
- No typo tolerance (predictable behavior)

Example: Query "login" matches "Fix login bug", "Login page redesign", "Update login tests".

### 7.3 Ambiguity Handling

| Mode | Multiple Matches |
|------|------------------|
| Human | Prompt user to select |
| Machine/Agent | Return `AMBIGUOUS` error with list of matches |

For write operations, machine/agent modes MUST NOT guess—they should require exact paths obtained from previous queries.

---

## 8. Query & Filter Patterns

### 8.1 Filter Combination Logic

When multiple filters are applied:

- **Same filter with multiple values:** OR logic
  - Example: `status=ready,in-progress` → status is ready OR in-progress

- **Different filter types:** AND logic
  - Example: `project=Q1 AND status=ready` → both conditions must match

- **Contradictory filters:** Empty result (not an error)
  - Example: `due=today AND overdue=true` → logically impossible, returns empty

This follows standard query conventions and produces predictable, composable behavior.

### 8.2 Default Filters (Active Items)

By default, queries should return "active" items. The definition of "active" varies by entity type:

**Active tasks:**
- Status NOT IN (`done`, `dropped`, `icebox`)
- `defer-until` is unset or <= today
- File is not in the archive subdirectory

**Active projects:**
- Status is unset OR status NOT IN (`done`)

**Active areas:**
- Status is unset OR status = `active`

### 8.3 Inclusion Flags Pattern

Items excluded by default should be includable via explicit flags:

| Default State | Include Flag |
|---------------|--------------|
| `icebox` excluded | `--include-icebox` |
| `done` excluded | `--include-done` |
| `dropped` excluded | `--include-dropped` |
| Both done + dropped | `--include-closed` |
| Deferred (future date) | `--include-deferred` |
| Archived | `--include-archived` |

The pattern is: `--include-<category>` adds items to normal results.

### 8.4 Sorting

Common sort fields:
- `created` (creation date)
- `updated` (last modified)
- `due` (due date)
- `title` (alphabetical)

**Null handling:** Items without a value for the sort field SHOULD appear last, regardless of sort direction.

---

## 9. Error Handling

### 9.1 Error Severity Levels

| Level | Meaning | Exit Code (CLI) |
|-------|---------|-----------------|
| Success | Operation succeeded (including empty results) | 0 |
| Runtime Error | Valid request, execution failed | 1 |
| Usage Error | Invalid request (bad arguments) | 2 |

Empty results are successful outcomes, not errors.

### 9.2 Error Codes

Standard error codes for machine-readable error handling:

| Code | When | Contextual Info |
|------|------|-----------------|
| `NOT_FOUND` | Entity doesn't exist | Suggestions for similar items |
| `AMBIGUOUS` | Fuzzy search matched multiple | List of matches with paths |
| `INVALID_STATUS` | Bad status value | List of valid statuses |
| `INVALID_DATE` | Unparseable date | Expected formats |
| `INVALID_PATH` | Path outside configured dirs | Configured paths |
| `PARSE_ERROR` | YAML malformed | Line number, specific issue |
| `MISSING_FIELD` | Required field absent | Which field |
| `REFERENCE_ERROR` | Broken project/area reference | The broken reference |
| `PERMISSION_ERROR` | Can't read/write file | File path |
| `CONFIG_ERROR` | Config missing/invalid | How to fix |

### 9.3 Error Structure

**Human mode:** Prose with suggestions
```
Error: Task file does not exist.
  Path: ~/tasks/nonexistent.md
  Did you mean: ~/tasks/existent-task.md?
```

**Machine mode (JSON):**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task file does not exist",
    "path": "~/tasks/nonexistent.md",
    "suggestions": ["~/tasks/existent-task.md"]
  }
}
```

**Agent mode (Markdown):**
```markdown
## Error: NOT_FOUND

- **message:** Task file does not exist
- **path:** ~/tasks/nonexistent.md
- **suggestion:** Did you mean ~/tasks/existent-task.md?
```

### 9.4 Graceful Degradation

- **Partial results:** When reading multiple files, skip malformed files and return valid results. Emit warnings for skipped files.
- **Batch operations:** Process all items (don't stop at first error). Report successes and failures separately.

---

## 10. Search

### 10.1 Full-Text Search

Implementations providing search functionality SHOULD use BM25 scoring for relevance ranking.

**Why BM25?**
- Handles term frequency saturation (repeated terms don't over-boost)
- Normalizes for document length (short docs aren't penalized)
- Produces more intuitive relevance rankings than TF-IDF

### 10.2 Query Syntax Considerations

**Basic (recommended minimum):**
- Term/substring matching

**Advanced (optional):**
- Fuzzy matching: `login~` (1 edit distance)
- Wildcards: `log*`
- Phrases: `"user login"`
- Boolean: `user AND login`
- Field-specific: `title:login`

The specific syntax is implementation-defined. If providing advanced search, document the supported syntax.

---

## Appendix A: Applicability to Desktop Applications

Desktop/GUI applications have different interaction patterns. Here's how S2 concepts apply:

### Modes

Desktop apps don't have CLI-style modes, but the principles apply:
- **Human mode patterns:** Apply to all interactive UI
- **JSON output:** Apply to data export features
- **Agent mode:** Not typically applicable (desktop apps aren't usually AI-facing)

### Fuzzy Matching

Search bars and filters follow human mode patterns—fuzzy, forgiving, with results to choose from.

### Error Handling

Errors typically use dialogs or inline messages rather than structured output. The error code catalog is still useful for logging and debugging.

### Query & Filter Patterns

The filter combination logic (OR within, AND across) applies to filter UI controls. Default filter states (hiding done/dropped) apply to list views.

### Field Display

Use human-friendly display names in labels and table headers.
