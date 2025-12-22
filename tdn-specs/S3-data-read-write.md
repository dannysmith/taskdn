# Specification S3: Data Read/Write Guidance

**Version:** 1.0.0-draft

This specification provides guidance for implementations reading, writing, and mutating S1-compliant data files. It covers error handling, data preservation, timestamp management, and file safety patterns.

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

---

## 1. Introduction

### 1.1 Purpose

This document defines how implementations should behave when reading and writing task, project, and area files. While S1 defines the file format, this specification addresses the operational concerns of working with those files safely and interoperably.

### 1.2 Scope

This specification covers:
- Error handling when reading files
- Data preservation when writing files
- Timestamp management
- File safety patterns (atomic writes, concurrent access)
- Formatting guidance

### 1.3 Relationship to Other Specifications

- **S1 (Core):** Defines the file format. This specification assumes files conform to S1.
- **S2 (Interface Design):** Defines how interfaces present data to users. This specification covers the lower-level file operations that interfaces rely on.

---

## 2. Reading Files

### 2.1 Parse Error Handling

When reading files, implementations MUST handle malformed data gracefully:

- If a file cannot be parsed as valid YAML, implementations SHOULD skip the file and MAY emit a warning.
- If a required field is missing, implementations SHOULD treat the file as invalid and MAY emit a warning.
- If a status value is not recognized, implementations SHOULD treat it as invalid.

Implementations SHOULD NOT crash or halt entirely when encountering individual malformed files. Partial results (valid files only) are preferable to complete failure.

### 2.2 Unknown Fields

Implementations MUST ignore unknown frontmatter fields during processing. This allows users to add custom metadata without breaking compatibility.

For example, if a user adds a `priority: high` field (not defined in S1 v1.0), implementations MUST:
- Read the file successfully
- Ignore the unknown field during processing
- Preserve the field when writing (see Section 3.2)

---

## 3. Writing Files

### 3.1 Timestamp Management

Implementations SHOULD automatically manage timestamp fields:

| Event | Field | Action |
|-------|-------|--------|
| Task created | `created-at` | SHOULD set to current datetime |
| Task modified | `updated-at` | SHOULD set to current datetime |
| Status → `done` | `completed-at` | SHOULD set to current datetime |
| Status → `dropped` | `completed-at` | SHOULD set to current datetime |

**Notes:**
- "Modified" includes any frontmatter change or body edit
- If `completed-at` is already set when status changes to `done`/`dropped`, implementations MAY preserve the existing value or update it
- Timestamps SHOULD use ISO 8601 format as specified in S1

### 3.2 Data Preservation

When modifying files, implementations MUST preserve data they don't explicitly change:

| Data | Requirement |
|------|-------------|
| Unknown frontmatter fields | MUST preserve |
| Markdown body | MUST preserve |
| YAML formatting (comments, ordering) | SHOULD preserve where possible |

**Rationale:** Users may add custom fields, and other tools may add metadata. Implementations that strip unknown data break interoperability.

**Example:** If a file contains:

```yaml
---
title: My Task
status: ready
my-custom-field: some value
priority: high
---
Body content here.
```

After updating `status` to `done`, the file MUST still contain `my-custom-field` and `priority`, and MUST preserve the body content.

### 3.3 Validation Before Write

- Implementations MUST NOT modify files that fail validation without explicit user consent.
- After a write operation, the resulting file SHOULD be valid per S1.
- If an operation would produce an invalid file (e.g., removing a required field), implementations SHOULD reject the operation or warn the user.

---

## 4. File Safety

### 4.1 Atomic Writes

To prevent file corruption from crashes or interrupts, implementations SHOULD use atomic write patterns:

1. Write content to a temporary file in the same directory
2. Sync the temporary file to disk (if available in the language/platform)
3. Rename the temporary file to the target filename

This pattern ensures the file is either fully written or not modified at all.

**Note:** The rename operation is atomic on most filesystems (POSIX, NTFS). Writing directly to the target file risks partial writes if the process is interrupted.

### 4.2 Concurrent Access

This specification does not define file locking, as taskdn is designed for single-user scenarios.

However, for long-running processes (TUI interfaces, desktop applications):

- Implementations SHOULD watch for external file changes
- When external changes are detected, implementations SHOULD reload the affected data
- Implementations MAY use file system notification APIs (inotify, FSEvents, etc.) or polling

**Conflict handling:** If a file is modified both externally and internally before save, implementations SHOULD either:
- Warn the user and let them choose which version to keep
- Merge changes if possible (e.g., different fields modified)
- Refuse to overwrite and require user intervention

---

## 5. Formatting Guidance

### 5.1 YAML Frontmatter

When writing YAML frontmatter:

- Frontmatter MUST begin with a line containing exactly `---`
- Frontmatter MUST end with a line containing exactly `---`, followed by a newline
- There MUST be no blank lines before the opening `---`

**String quoting:** Quote strings that contain YAML special characters or could be misinterpreted:

```yaml
# Needs quoting
title: "Fix: login bug"           # Contains colon
title: "Say \"hello\""            # Contains quotes
title: "[[Project Name]]"         # Contains brackets (WikiLink)

# Safe without quoting
title: Fix login bug
title: Simple task name
```

**Array formatting:** Either multi-line or inline format is acceptable:

```yaml
# Multi-line (preferred for readability)
projects:
  - "[[Q1 Planning]]"

# Inline (acceptable)
projects: ["[[Q1 Planning]]"]
```

### 5.2 File Encoding

- Files MUST be UTF-8 encoded
- Files SHOULD NOT include a byte order mark (BOM)
- Line endings SHOULD be LF (`\n`) for cross-platform compatibility, though implementations SHOULD tolerate CRLF (`\r\n`) on read

### 5.3 Whitespace

- Trailing whitespace at the end of lines MAY be stripped
- The file SHOULD end with a single newline character
- Multiple trailing newlines MAY be normalized to a single newline

---

## 6. Appendix: Implementation Checklist

A quick reference for implementers:

### Reading
- [ ] Handle YAML parse errors gracefully (skip file, warn)
- [ ] Handle missing required fields (treat as invalid)
- [ ] Handle unrecognized status values (treat as invalid)
- [ ] Ignore unknown frontmatter fields

### Writing
- [ ] Set `created-at` on new tasks
- [ ] Update `updated-at` on modifications
- [ ] Set `completed-at` when status → done/dropped
- [ ] Preserve unknown frontmatter fields
- [ ] Preserve Markdown body
- [ ] Preserve YAML formatting where possible
- [ ] Validate before write; reject invalid operations

### File Safety
- [ ] Use atomic write pattern (temp file + rename)
- [ ] Watch for external changes in long-running processes
- [ ] Handle concurrent modification conflicts
