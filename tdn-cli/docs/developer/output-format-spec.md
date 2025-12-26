# CLI Output Format Specification

**Status:** Implemented

This document defines the authoritative output format for all CLI commands across different output modes (human, AI, JSON).

## Design Principles

- **Spec Compliance:** All output must conform to `tdn-specs/S1-core.md`
- **Consistency:** Same fields appear in the same order across all commands
- **Predictability:** Users and AI agents can rely on stable output structures
- **Completeness:** Required fields always shown (even if missing)

---

## Field Inclusion Policy

All output must conform to `tdn-specs/S1-core.md`. Fields are classified as:

1. **Required:** Always shown, even if missing (will display as `(missing)` in AI mode or `null` in JSON mode)
2. **Optional:** Only shown if set/present

### Tasks

**Required (S1 spec Section 3.3):**

- `path` (absolute path to file)
- `title`
- `status`
- `created-at`
- `updated-at`

**Optional:**

- `completed-at` - Set when status is `done` or `dropped`
- `area` - Reference to area file
- `projects` - Array of project references (shown as singular `project` in output)
- `due` - Hard deadline
- `scheduled` - Planned work date
- `defer-until` - Hide until date

### Projects

**Required (S1 spec Section 4.3):**

- `path`
- `title`

**Optional (S1 spec Section 4.4):**

- `status` - One of: `planning`, `ready`, `blocked`, `in-progress`, `paused`, `done`
- `area` - Reference to area file
- `description` - Short description
- `start-date` - Project start date
- `end-date` - Project end/expected completion date
- `unique-id` - Unique identifier
- `blocked-by` - Array of blocking project references

**Never show:**

- ❌ `created-at`, `updated-at` (not in spec)

### Areas

**Required (S1 spec Section 5.3):**

- `path`
- `title`

**Optional (S1 spec Section 5.4):**

- `status` - Recommended: `active` or `archived`
- `type` - Area type (e.g., "client", "life-area")
- `description` - Short description

**Never show:**

- ❌ `created-at`, `updated-at` (not in spec)

---

## Canonical Field Order

Fields must appear in this order for consistency across formatters.

### Tasks

```
1. path
2. title (in heading for AI mode, in object for JSON)
3. status
4. created-at     ← Required
5. updated-at     ← Required
6. completed-at   ← Optional
7. due            ← Optional
8. scheduled      ← Optional
9. defer-until    ← Optional
10. project       ← Optional
11. area          ← Optional
12. body          ← Optional (full entity display only)
```

**Rationale:** Identity first (path, title, status), timestamps next (required fields), then dates, relationships, and metadata.

### Projects

```
1. path
2. title
3. status          ← Optional
4. area            ← Optional
5. description     ← Optional
6. start-date      ← Optional
7. end-date        ← Optional
8. unique-id       ← Optional
9. blocked-by      ← Optional
10. body           ← Optional (full entity display only)
```

### Areas

```
1. path
2. title
3. status          ← Optional
4. type            ← Optional
5. description     ← Optional
6. body            ← Optional (full entity display only)
```

---

## Output Templates by Command Type

### List Commands

Commands: `list`, `list projects`, `list areas`, `today`, `inbox`

#### AI Mode

```markdown
## {Entity Type Plural} ({count})

### {title}

- **path:** {absolute-path}
- **status:** {status}
- **created-at:** {timestamp} ← Tasks only
- **updated-at:** {timestamp} ← Tasks only
- **{optional-field}:** {value}
```

**Notes:**

- Entity Type Plural: "Tasks", "Projects", "Areas"
- Title becomes H3 heading
- All fields in canonical order
- Optional fields only shown if set

#### JSON Mode

```json
{
  "summary": "Found {count} {entity-type-plural}",
  "{entity-type-plural}": [
    {
      "path": "{absolute-path}",
      "title": "{title}",
      "status": "{status}",
      "createdAt": "{timestamp}",      ← Tasks only (required)
      "updatedAt": "{timestamp}",      ← Tasks only (required)
      "{optionalFieldCamelCase}": "{value}"
    }
  ]
}
```

**Notes:**

- Field names use camelCase
- All fields in canonical order
- Optional fields only included if set
- Required task fields always present (may be `null` if missing)

### Creation Commands

Commands: `add`, `add project`, `add area` (will become `new`, `new project`, `new area` per task-2)

#### AI Mode

```markdown
## {Entity Type} Created

### {title}

- **path:** {absolute-path}
- **status:** {status} ← If entity has status field
- **created-at:** {timestamp} ← Tasks only (required)
- **{field-that-was-set}:** {value}
```

**Notes:**

- Only show fields explicitly set by user (plus required fields)
- Tasks get `created-at` (required by spec)
- Projects/areas do NOT get `created-at` (not in spec)

#### JSON Mode

```json
{
  "summary": "{Entity type} created",
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}",
    "status": "{status}",
    "createdAt": "{timestamp}",      ← Tasks only
    "{fieldThatWasSetCamelCase}": "{value}"
  }
}
```

### Mutation Commands

Commands: `complete`, `drop`, `status` (will become `set status` per task-2), `update`, `archive`, `append-body`

#### AI Mode - Single Entity

```markdown
## {Entity Type} {Action Past Tense}

### {title}

- **path:** {absolute-path}

### Changes

- **{field}:** {old-value} → {new-value}
- **{field}:** {old-value} → {new-value}
```

**Notes:**

- Always use "Changes" section
- Show before → after for all modified fields
- Use `(unset)` for null/empty old or new values
- Special cases:
  - `archive`: Include `path: {old} → {new}` in Changes
  - `append-body`: Show as `body: appended "{text} [{date}]"`

#### JSON Mode - Single Entity

```json
{
  "summary": "{Entity type} {action past tense}",
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}"
  },
  "changes": [
    {
      "field": "{field}",
      "oldValue": "{old-value}",
      "newValue": "{new-value}"
    }
  ]
}
```

### Full Entity Display

Commands: `show`

Displays complete entity details including body content.

#### AI Mode

```markdown
## {title}

- **path:** {absolute-path}
- **status:** {status}
- **created-at:** {timestamp} ← Tasks only
- **updated-at:** {timestamp} ← Tasks only
- **{field}:** {value}

### Body

{full-body-content}
```

#### JSON Mode

```json
{
  "summary": "Entity details",
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}",
    "status": "{status}",
    "createdAt": "{timestamp}",      ← Tasks only
    "updatedAt": "{timestamp}",      ← Tasks only
    "{allFieldsCamelCase}": "{value}",
    "body": "{full-body-content}"
  }
}
```

---

## Field Name Conventions

### AI Mode (Markdown)

- Use **kebab-case:** `created-at`, `defer-until`, `completed-at`, `start-date`, `end-date`
- Markdown-friendly, matches YAML frontmatter in files

### JSON Mode

- Use **camelCase:** `createdAt`, `deferUntil`, `completedAt`, `startDate`, `endDate`
- Standard JavaScript convention

### Human Mode

- Use **natural language:** "Created at", "Defer until", etc.
- For display only, not programmatic parsing

---

## Implementation

### Shared Utilities

Field ordering and inclusion logic is centralized in:

- `src/output/helpers/field-ordering.ts` - Canonical field order per entity type
- `src/output/helpers/field-inclusion.ts` - Required vs. optional field rules

These utilities document the specification and can be used by future formatters.

### Current Formatters

- `src/output/ai.ts` - AI mode (structured Markdown)
- `src/output/json.ts` - JSON mode (programmatic access)
- `src/output/human.ts` - Human mode (terminal-friendly)
- `src/output/ai-json.ts` - AI-JSON hybrid mode

All formatters implement the specifications in this document and maintain consistent field ordering.

---

## Validation Checklist

When adding new output or modifying existing formatters, verify:

- ✅ All output is spec-compliant (no fields shown that don't exist in S1 spec)
- ✅ Required fields always shown (tasks: `created-at`, `updated-at`)
- ✅ Field ordering matches canonical order
- ✅ Optional fields only shown when set/present
- ✅ Projects/areas never show `created-at` or `updated-at`
- ✅ Field names follow convention (kebab-case for AI, camelCase for JSON)
- ✅ Mutation outputs use "Changes" section with before→after format

---

## Future Extensions

This standardized format makes the following extensions straightforward:

- Add new output modes (YAML, CSV, XML)
- Add verbosity levels (--verbose, --quiet)
- Add color themes for human mode
- Add CSV export for list commands
- Custom field filtering (--fields)

The canonical field order and inclusion rules serve as the contract for all future formatters.
