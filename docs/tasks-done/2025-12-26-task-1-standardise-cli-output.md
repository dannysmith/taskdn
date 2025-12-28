# Task: Standardize CLI Output Formats

## Overview

This task standardizes output formatting across all CLI commands to make them predictable, consistent, and spec-compliant. Based on analysis of the current CLI interface surface (see `note-cli-interface-surface-inventory.md`), we've identified inconsistencies in field inclusion, mutation output formats, and template structures.

**Key issues identified:**

1. **Spec violations**: Projects/areas showing `created-at` field (doesn't exist in spec); tasks missing required `created-at`/`updated-at` in AI mode list output
2. **Inconsistent mutation formats**: Some show final state, some show diffs, some invent custom fields
3. **No canonical field ordering**: Fields appear in different orders across commands
4. **Varying error formats**: Different structures for single vs batch errors

---

## TODO: Extract to Evergreen Documentation

**⚠️ IMPORTANT**: Once implemented, extract the "Output Format Specification" section below to:

```
tdn-cli/docs/developer/output-format-spec.md
```

This will serve as the authoritative reference for how all CLI output should be formatted.

---

# Output Format Specification

## 1. Field Inclusion Policy (Spec-Based)

All output must conform to `tdn-specs/S1-core.md`:

### Tasks

**Required (always show):**

- `path` (absolute path to file)
- `title`
- `status`
- `created-at` (required by spec)
- `updated-at` (required by spec)

**Optional (show only if set):**

- `completed-at`
- `area`
- `projects`
- `due`
- `scheduled`
- `defer-until`

### Projects

**Required (always show):**

- `path`
- `title`

**Optional (show only if set):**

- `status`
- `area`
- `description`
- `start-date`
- `end-date`
- `unique-id`
- `blocked-by`

**Never show:**

- `created-at`, `updated-at` (not in spec)

### Areas

**Required (always show):**

- `path`
- `title`

**Optional (show only if set):**

- `status`
- `type`
- `description`

**Never show:**

- `created-at`, `updated-at` (not in spec)

---

## 2. Canonical Field Order

Fields must appear in this order for all output modes:

### Tasks

```
1. path
2. title (in heading for AI mode, in object for JSON)
3. status
4. created-at
5. updated-at
6. completed-at (if set)
7. due (if set)
8. scheduled (if set)
9. defer-until (if set)
10. projects (if set)
11. area (if set)
```

### Projects

```
1. path
2. title
3. status (if set)
4. area (if set)
5. description (if set)
6. start-date (if set)
7. end-date (if set)
8. unique-id (if set)
9. blocked-by (if set)
```

### Areas

```
1. path
2. title
3. status (if set)
4. type (if set)
5. description (if set)
```

**Rationale**: Identity first (path, title, status), timestamps next (tasks only), dates, relationships, other metadata.

---

## 3. Output Templates

### Template 1: List Item

Used by: `list`, `list projects`, `list areas`, `today`, `inbox`

#### AI Mode

```markdown
## {Entity Type Plural} ({count})

### {title}

- **path:** {absolute-path}
- **status:** {status}
- **created-at:** {timestamp} ← Tasks only
- **updated-at:** {timestamp} ← Tasks only
- **{optional-field}:** {value}
  ...
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
      "createdAt": "{timestamp}",
      "updatedAt": "{timestamp}",
      "{optionalFieldCamelCase}": "{value}"
    }
  ]
}
```

**Notes:**

- Field names use camelCase in JSON
- All fields in canonical order
- Optional fields only included if set
- Summary field describes result

#### Human Mode

Current format (grouped by status, checkboxes) is already good - keep as-is.

---

### Template 2: Creation Result

Used by: `add`, `add project`, `add area`

#### AI Mode

```markdown
## {Entity Type} Created

### {title}

- **path:** {absolute-path}
- **status:** {status} ← If entity type has status field
- **created-at:** {timestamp} ← Tasks only
- **{field-that-was-set}:** {value}
  ...
```

**Notes:**

- Only show fields that were explicitly set by the user (plus required fields)
- Tasks get `created-at` (required by spec)
- Projects/areas do NOT get `created-at` (not in spec)
- All fields in canonical order

#### JSON Mode

```json
{
  "summary": "{Entity type} created",
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}",
    "status": "{status}",
    "createdAt": "{timestamp}",
    "{fieldThatWasSetCamelCase}": "{value}"
  }
}
```

**Notes:**

- Same logic as AI mode
- Field names in camelCase

#### Human Mode

```
✓ {Entity type} created: {title}
  {path}
```

Keep current simple format.

---

### Template 3: Single-Entity Mutation

Used by: `set status`, `update`, `archive`, `append-body`

#### AI Mode

```markdown
## {Entity Type} {Action Past Tense}

### {title}

- **path:** {absolute-path}

### Changes

- **{field}:** {old-value} → {new-value}
- **{field}:** {old-value} → {new-value}
  ...
```

**Notes:**

- Always use "Changes" section
- Show before → after for all modified fields
- Special cases:
  - `archive`: Include `path: {old} → {new}` in Changes
  - `append-body`: Show as `body: appended "{text} [{date}]"`
- Use `(unset)` for null/empty old or new values

#### JSON Mode

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

**Notes:**

- Changes as structured array
- oldValue/newValue can be null

#### Human Mode

```
✓ {Entity type} {action past tense}: {title}
  {path}
  Changes: {field}: {old} → {new}[, {field}: {old} → {new}]...
```

Single-line summary of changes.

---

### Template 4: Batch Mutation

Used by: `set status`, `update`, `archive` (when multiple paths provided)

#### AI Mode

```markdown
## {Action Past Tense} ({success-count})

### {path}

- **title:** {title}

### Changes

- **{field}:** {old} → {new}
  ...

### {path}

- **title:** {title}

### Changes

...

## Errors ({error-count})

### {path}

- **code:** {ERROR_CODE}
- **message:** {description}
- **suggestion:** {remedy}

### {path}

...
```

**Notes:**

- Success section first, errors section second
- Each entity gets its own H3 with path
- Changes section for each successful mutation
- Errors section only shown if there were failures

#### JSON Mode

```json
{
  "summary": "{action past tense}",
  "succeeded": [
    {
      "path": "{absolute-path}",
      "title": "{title}",
      "changes": [
        {
          "field": "{field}",
          "oldValue": "{old}",
          "newValue": "{new}"
        }
      ]
    }
  ],
  "failed": [
    {
      "path": "{absolute-path}",
      "code": "{ERROR_CODE}",
      "message": "{description}",
      "suggestion": "{remedy}"
    }
  ]
}
```

**Notes:**

- Two arrays: succeeded, failed
- Failed array only included if there were errors
- Each success includes full changes array

#### Human Mode

```
✓ {Action past tense}: {count} succeeded, {count} failed

Succeeded:
  {title} ({path})
  ...

Failed:
  {title} ({path}): {message}
  ...
```

---

### Template 5: Dry-Run Preview

Used by: All mutation commands with `--dry-run` flag

#### AI Mode

Prefix the relevant mutation template with "Dry Run: " and "Would Be":

```markdown
## Dry Run: {Entity Type} Would Be {Action Past Tense}

### {title}

- **path:** {absolute-path}

### Changes

- **{field}:** {old-value} → {new-value}
  ...
```

#### JSON Mode

Add `"dryRun": true` field to mutation template:

```json
{
  "summary": "Dry run: {entity type} would be {action past tense}",
  "dryRun": true,
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}"
  },
  "changes": [...]
}
```

#### Human Mode

Prefix existing mutation format:

```
[DRY RUN] {Entity type} would be {action past tense}: {title}
  {path}
  Changes: {field}: {old} → {new}...
```

---

### Template 6: Error

Used by: All commands when errors occur

#### AI Mode

```markdown
## Error: {ERROR_CODE}

- **message:** {description}
- **suggestion:** {remedy}
- **{context-field}:** {value}
  ...
```

**Notes:**

- Code in heading (e.g., "Error: NOT_FOUND")
- Message always present
- Suggestion optional but recommended
- Context fields (like `path`, `matches`) optional

#### JSON Mode

```json
{
  "error": {
    "code": "{ERROR_CODE}",
    "message": "{description}",
    "suggestion": "{remedy}",
    "{contextFieldCamelCase}": "{value}"
  }
}
```

**Notes:**

- All error info in `error` object
- No `summary` field for errors

#### Human Mode

```
✗ Error: {description}
  {suggestion}
```

Simple, concise error message.

---

## 4. Field Name Conventions

### AI Mode (Markdown)

- Use kebab-case: `created-at`, `defer-until`, `completed-at`
- Markdown-friendly, matches YAML frontmatter

### JSON Mode

- Use camelCase: `createdAt`, `deferUntil`, `completedAt`
- JSON-friendly, standard JavaScript convention

### Human Mode

- Use natural language: "Created at", "Defer until", etc.
- For display only, not parsing

---

## 5. Special Cases

### show command

The `show` command displays full entity details including body content. It does not use the list or mutation templates.

**AI Mode:**

```markdown
## {title}

- **path:** {absolute-path}
- **{field}:** {value}
  ...

### Body

{full-body-content}
```

**JSON Mode:**

```json
{
  "summary": "Entity details",
  "{entity-type}": {
    "path": "{absolute-path}",
    "title": "{title}",
    "{allFieldsCamelCase}": "{value}",
    "body": "{full-body-content}"
  }
}
```

### edit/open command

Human mode only - opens editor, no output template needed.

AI/JSON modes: Return error (NOT_SUPPORTED).

---

# Implementation Phases

## Phase 1: Fix Spec Violations

**Goal:** Ensure all output is compliant with `tdn-specs/S1-core.md`

**Changes:**

1. **Remove `created-at` from project/area creation output**

   - Files: `src/commands/add.ts` (or wherever project/area creation is handled)
   - Impact: AI, JSON, and human mode outputs for `add project` and `add area`
   - Fix: Don't show `created-at` field in output (field doesn't exist in spec)

2. **Add `created-at`/`updated-at` to task list AI mode**
   - Files: `src/formatters/` or wherever list output is generated
   - Impact: AI mode output for `list`, `today`, `inbox`
   - Fix: Always include these required fields for tasks

**Validation:**

- Run all commands against test fixtures
- Verify no timestamps appear for projects/areas
- Verify timestamps always appear for tasks in AI/JSON modes
- Check against S1-core.md field definitions

---

## Phase 2: Create Shared Formatting Utilities

**Goal:** Build reusable rendering functions that enforce templates

**New files to create:**

```
tdn-cli/src/formatters/
  ├── entity-formatter.ts       # Core entity rendering
  ├── mutation-formatter.ts     # Mutation results
  ├── error-formatter.ts        # Error output
  ├── field-ordering.ts         # Canonical field order
  └── field-inclusion.ts        # Spec-based field rules
```

**Core functions:**

```typescript
// entity-formatter.ts
renderEntityListItem(entity: Entity, mode: OutputMode, entityType: EntityType): string | object
renderEntityCreated(entity: Entity, mode: OutputMode, entityType: EntityType, fieldsSet: string[]): string | object
renderEntityDetails(entity: Entity, mode: OutputMode, entityType: EntityType): string | object

// mutation-formatter.ts
renderMutation(entity: Entity, mode: OutputMode, action: string, changes: Change[]): string | object
renderBatchMutation(succeeded: Result[], failed: Error[], mode: OutputMode, action: string): string | object
renderDryRun(entity: Entity, mode: OutputMode, action: string, changes: Change[]): string | object

// error-formatter.ts
renderError(code: string, message: string, context: object, mode: OutputMode): string | object

// field-ordering.ts
getCanonicalFieldOrder(entityType: EntityType): string[]

// field-inclusion.ts
getRequiredFields(entityType: EntityType): string[]
shouldShowField(field: string, entity: Entity, entityType: EntityType): boolean
```

**Implementation approach:**

- Start with one formatter (e.g., `entity-formatter.ts`)
- Implement all three modes (AI, JSON, human) in same file
- Use switch/case on mode to branch rendering logic
- Extract common logic (field ordering, inclusion rules)

**Testing:**

- Create comprehensive unit tests for each formatter
- Test all templates with fixtures from demo-vault
- Verify output matches specification exactly

---

## Phase 3: Migrate Commands to Use Shared Formatters

**Goal:** Replace custom output code with shared formatter calls

**Approach:**

1. **Start with list commands** (lowest risk, highest consistency gain)

   - `list tasks`, `list projects`, `list areas`, `today`, `inbox`
   - Replace custom rendering with `renderEntityListItem()`
   - Verify output matches specification
   - Run existing tests, update snapshots if needed

2. **Move to creation commands**

   - `add`, `add project`, `add area`
   - Replace with `renderEntityCreated()`
   - Ensure only user-set fields are shown

3. **Convert mutation commands**

   - `set status`, `update`, `archive`, `append-body`
   - Replace with `renderMutation()` or `renderBatchMutation()`
   - Ensure consistent "Changes" section

4. **Standardize error handling**
   - Find all error output locations
   - Replace with `renderError()`

**For each command:**

- Update implementation to call formatter
- Remove custom rendering code
- Update tests (may need snapshot updates)
- Verify all three modes (AI, JSON, human)

**Risk mitigation:**

- Do one command at a time
- Run tests after each change
- Keep custom code until formatter is proven
- Use feature flags if needed during transition

---

## Phase 4: Validation & Documentation

**Goal:** Ensure correctness and document patterns

**Tasks:**

1. **Comprehensive testing**

   - Run full test suite
   - Test all commands against demo-vault
   - Test all output modes
   - Test error cases
   - Test batch operations
   - Test dry-run mode

2. **Update integration tests**

   - May need to update snapshots
   - Add tests for field ordering
   - Add tests for field inclusion rules
   - Add tests for spec violations

3. **Extract specification to evergreen docs**

   - Move "Output Format Specification" section to `tdn-cli/docs/developer/output-format-spec.md`
   - Add examples with real fixtures
   - Document any deviations from templates (if justified)
   - Link from main developer docs

4. **Update API documentation**
   - Update CLI help text if needed
   - Update any user-facing documentation
   - Update `cli-interface-surface-inventory.md` to reflect new consistent patterns

---

## Success Criteria

Implementation is complete when:

- ✅ All output is spec-compliant (no fields shown that don't exist in spec, all required fields shown)
- ✅ All commands use shared formatters (no custom output code in command handlers)
- ✅ Field ordering is consistent across all commands
- ✅ Mutation outputs use "Changes" section consistently
- ✅ Error format is unified
- ✅ All tests pass
- ✅ Specification extracted to evergreen documentation
- ✅ No regressions in human mode (user-visible changes should be minimal/improvements only)

---

## Notes

### Why this matters

**For users:**

- Predictable output (know what to expect)
- Easier to learn (patterns repeat)
- Better error messages (consistent format)

**For AI agents:**

- Reliable parsing (consistent structure)
- Spec-compliant data (correct fields)
- Clear change tracking (before→after)

**For maintainers:**

- DRY code (shared formatters)
- Easier to test (templates are data)
- Easier to extend (add new output mode)
- Self-documenting (templates show contract)

### Risks & Considerations

- **Human mode changes**: Be careful not to break existing human-readable output that users may depend on
- **Snapshot tests**: May need updating, ensure changes are intentional
- **Performance**: Formatters should be lightweight, avoid unnecessary allocations
- **Backward compatibility**: This is pre-1.0, so breaking changes are acceptable

### Future Extensions

After standardization is complete, these become easy:

- Add new output mode (e.g., YAML, XML)
- Add color themes for human mode
- Add verbosity levels
- Add CSV export for list commands
