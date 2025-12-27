# Specification S2: Implementation Requirements

**Version:** 1.0.0-draft

This specification defines requirements and guidance for implementations that read, write, and present S1-compliant data. It covers field conventions, timestamp management, data preservation, file safety, and common semantics.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 1. Introduction

### 1.1 Purpose

While S1 defines the file format, this specification addresses the operational concerns of working with those files: how to read them safely, how to write them without losing data, and how to present them consistently.

### 1.2 Scope

This specification covers:

- Field naming conventions
- Date handling
- Reading and parsing files
- Writing files (timestamps, preservation, safety)
- Default filter semantics
- Query and filter patterns
- Error codes

### 1.3 Relationship to S1

S1 defines what files look like. This specification defines how implementations should behave when working with those files.

---

## 2. Design Principles

1. **Predictable over clever.** Users should be able to predict what an implementation will do. Avoid magic or implicit behaviors that might surprise.

2. **Explicit over silent.** Empty results should be explicit, not silent. Errors should be informative, not cryptic.

3. **Preserve user data.** Never discard data you don't understand. Unknown fields, custom metadata, and document bodies must survive round-trips.

---

## 3. Field Handling

### 3.1 Canonical Field Names

Field names MUST use kebab-case as defined in S1:

- `created-at`, `updated-at`, `completed-at`
- `defer-until`
- `blocked-by`

Implementations MAY use alternative display names in user interfaces (e.g., "Created" instead of "created-at"), but programmatic interfaces and file output MUST use canonical names.

### 3.2 The project/projects Convention

S1 defines `projects` as an array (for compatibility with systems that support multiple projects per task), but taskdn enforces single-project semantics. Implementations SHOULD:

- Display as `project` (singular) in output
- Accept `project` in input
- Read `projects[0]` from files
- Write `projects: ["[[value]]"]` to files

If a file contains multiple projects, use the first one. Validation commands SHOULD warn about multi-project files.

---

## 4. Date Handling

### 4.1 Storage and Output Format

All dates MUST use ISO 8601 format when stored or output:

| Field Type | Format | Example |
|------------|--------|---------|
| Date fields (due, scheduled, defer-until) | `YYYY-MM-DD` | `2025-12-20` |
| Timestamp fields (created-at, updated-at, completed-at) | `YYYY-MM-DDTHH:MM:SS` | `2025-12-15T14:30:00` |

### 4.2 Input Formats

Implementations MUST accept ISO 8601 format for input.

Implementations MAY accept natural language for human convenience (e.g., `today`, `tomorrow`, `+3d`). Ambiguous formats like `12/1` or `1/12` SHOULD be rejected.

---

## 5. Reading Files

### 5.1 Parse Error Handling

When reading files, implementations MUST handle malformed data gracefully:

- If a file cannot be parsed as valid YAML, skip the file and MAY emit a warning.
- If a required field is missing, treat the file as invalid and MAY emit a warning.
- If a status value is not recognized, treat it as invalid.

Implementations SHOULD NOT crash or halt entirely when encountering individual malformed files. Partial results (valid files only) are preferable to complete failure.

### 5.2 Unknown Fields

Implementations MUST ignore unknown frontmatter fields during processing. This allows users to add custom metadata without breaking compatibility.

For example, if a user adds a `priority: high` field (not defined in S1), implementations MUST:
- Read the file successfully
- Ignore the unknown field during processing
- Preserve the field when writing (see Section 6.2)

---

## 6. Writing Files

### 6.1 Timestamp Management

Implementations SHOULD automatically manage timestamp fields:

| Event | Field | Action |
|-------|-------|--------|
| Task created | `created-at` | Set to current datetime |
| Task modified | `updated-at` | Set to current datetime |
| Status changed to `done` or `dropped` | `completed-at` | Set to current datetime |

"Modified" includes any frontmatter change or body edit. Timestamps SHOULD use ISO 8601 format as specified in S1.

### 6.2 Data Preservation

When modifying files, implementations MUST preserve data they don't explicitly change:

| Data | Requirement |
|------|-------------|
| Unknown frontmatter fields | MUST preserve |
| Markdown body | MUST preserve |
| YAML formatting (comments, ordering) | SHOULD preserve where possible |

**Rationale:** Users may add custom fields, and other tools may add metadata. Implementations that strip unknown data break interoperability.

### 6.3 Validation Before Write

- Implementations MUST NOT modify files that fail validation without explicit user consent.
- After a write operation, the resulting file SHOULD be valid per S1.
- If an operation would produce an invalid file (e.g., removing a required field), implementations SHOULD reject the operation or warn the user.

### 6.4 Atomic Writes

To prevent file corruption from crashes or interrupts, implementations SHOULD use atomic write patterns:

1. Write content to a temporary file in the same directory
2. Sync the temporary file to disk (if available)
3. Rename the temporary file to the target filename

This pattern ensures the file is either fully written or not modified at all.

### 6.5 Concurrent Access

This specification does not define file locking, as taskdn is designed for single-user scenarios.

For long-running processes (TUI interfaces, desktop applications):

- Implementations SHOULD watch for external file changes and reload affected data
- Implementations MAY use file system notification APIs or polling
- If a file is modified both externally and internally, implementations SHOULD warn the user or require intervention

### 6.6 File Encoding and Formatting

- Files MUST be UTF-8 encoded
- Files SHOULD NOT include a byte order mark (BOM)
- Line endings SHOULD be LF (`\n`); implementations SHOULD tolerate CRLF on read
- Files SHOULD end with a single newline character

---

## 7. Default Semantics

### 7.1 Active Items

By default, queries should return "active" items. The definition of "active" varies by entity type:

**Active tasks:**
- Status NOT IN (`done`, `dropped`, `icebox`)
- `defer-until` is unset or <= today
- File is not in the archive subdirectory

**Active projects:**
- Status is unset OR status NOT IN (`done`)

**Active areas:**
- Status is unset OR status = `active`

Items excluded by default should be includable via explicit parameters or options.

---

## 8. Query & Filter Semantics

For implementations that support querying and filtering:

### 8.1 Filter Combination Logic

When multiple filters are applied:

- **Same filter with multiple values:** OR logic
  - Example: `status=ready,in-progress` matches ready OR in-progress

- **Different filter types:** AND logic
  - Example: `project=Q1 AND status=ready` requires both conditions

- **Contradictory filters:** Empty result (not an error)
  - Example: `due=today AND overdue=true` returns empty if logically impossible

### 8.2 Sorting

Common sort fields: `created`, `updated`, `due`, `title`.

**Null handling:** Items without a value for the sort field SHOULD appear last, regardless of sort direction.

---

## 9. Error Handling

### 9.1 Error Codes

For programmatic interfaces (CLIs, SDKs, APIs), implementations SHOULD use standard error codes:

| Code | When | Contextual Info |
|------|------|-----------------|
| `NOT_FOUND` | Entity doesn't exist | Suggestions for similar items |
| `AMBIGUOUS` | Fuzzy search matched multiple | List of matches |
| `INVALID_STATUS` | Bad status value | List of valid statuses |
| `INVALID_DATE` | Unparseable date | Expected formats |
| `INVALID_PATH` | Path outside configured dirs | Configured paths |
| `PARSE_ERROR` | YAML malformed | Line number, specific issue |
| `MISSING_FIELD` | Required field absent | Which field |
| `REFERENCE_ERROR` | Broken project/area reference | The broken reference |
| `PERMISSION_ERROR` | Can't read/write file | File path |
| `CONFIG_ERROR` | Config missing/invalid | How to fix |

Graphical interfaces may present errors differently (dialogs, inline messages) but the error code catalog remains useful for logging and debugging.

### 9.2 Graceful Degradation

- **Partial results:** When reading multiple files, skip malformed files and return valid results. Emit warnings for skipped files.
- **Batch operations:** Process all items; don't stop at first error. Report successes and failures separately.

---

## 10. Agent-Friendly Output

For implementations that output to AI agents or LLM-based tools: agents receive output in their context window and pay per token. Output should be token-efficient, gracefully degradable (truncated output should still be useful), and readable without parsing. Structured Markdown is often preferable to JSON for agent-facing output because truncated JSON is invalid, while Markdown degrades gracefully. Include file paths in output so agents can perform follow-up operations.

The specific output format is implementation-defined.
