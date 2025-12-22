# Task: Specs

## Phase 1. Review Beans external CLI interface [COMPLETE]

Review https://github.com/hmans/beans for useful **external** patterns to follow. Produce document.

**Output:** `docs/tasks-todo/BEANS_REVIEW.md`

---

## Phase 2. Split Spec Docs into 3

Split the original single spec doc `/tdn-specs/S1-core.md` into three docs as per `/tdn-specs/README.md`, incorporating findings from Phase 1 and the CLI spec work.

### Target Structure

| Spec                             | Purpose                                                                                        | Current State                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| **S1: Core (Data Storage)**      | Files on disk only: naming, frontmatter, location, data types, JSON schemas                    | Exists, needs content extracted |
| **S2: Interface Design**         | How interfaces interact with S1 data: output modes, query/filter, error handling, field naming | Does not exist                  |
| **S3: Data Read/Write Guidance** | Safe reading, writing, mutation of files                                                       | Does not exist                  |

### Key Decisions (Resolved)

| Decision             | Resolution                    | Notes                                                                          |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| S2 scope             | CLI & SDK primarily           | Include notes on desktop applicability; general principles may apply broadly   |
| GraphQL              | Deferred                      | Interesting but adds complexity; field selection can be achieved simpler       |
| Generalization level | Mid-level (concrete patterns) | Use CLI examples as illustrative patterns; readers can adapt to other contexts |
| Search               | Recommend Bleve with BM25     | Per Beans review analysis                                                      |
| Output modes         | Adopt existing CLI design     | Already well-specified in cli-requirements.md                                  |
| Flag patterns        | Adopt existing CLI design     | Inclusion/exclusion pattern already designed                                   |

### Sub-Phases

---

#### Phase 2.1: Mapping & Analysis [COMPLETE]

**Goal:** Create a detailed planning document that maps content to target specs, surfaces any remaining decisions, and proposes structure for S2 and S3.

**Context Documents (read before starting):**

- `/tdn-specs/README.md` — Target spec structure
- `/tdn-specs/S1-core.md` — Current spec to split
- `/docs/product-overviews/cli/cli-requirements.md` — CLI design work to incorporate
- `/docs/tasks-todo/BEANS_REVIEW.md` — Phase 1 findings
- `/docs/overview.md` — Project goals and principles

**Output:** `docs/tasks-todo/phase-2-analysis.md`

**This document should contain:**

1. Section-by-section mapping of current S1 content to target specs
2. Analysis of cli-requirements.md: what generalizes to S2 vs stays CLI-specific
3. Beans findings to incorporate (with specific recommendations)
4. Proposed table of contents for S2
5. Proposed table of contents for S3
6. Any remaining open questions

---

#### Phase 2.2: Create S3 (Smallest Scope) [COMPLETE]

**Goal:** Create S3 with guidance for safely reading/writing S1-compliant files.

**Context Documents (read before starting):**

- `docs/tasks-todo/phase-2-analysis.md` — The mapping document
- `/tdn-specs/S1-core.md` — Source of implementation guidance sections

**Output:** `/tdn-specs/S3-data-read-write.md`

**Expected content:**

- Error handling when reading files
- Timestamp management (created-at, updated-at, completed-at)
- Interoperability requirements (preserving unknown fields, body content)
- Safe file mutation patterns
- Frontmatter formatting guidance

**Note:** S3 will be short (1-2 pages). It captures "how to be a good citizen" when reading/writing these files.

---

#### Phase 2.3: Refactor S1 [COMPLETE]

**Goal:** Remove content that moved to S3, ensure S1 is purely about "files on disk."

**Context Documents (read before starting):**

- `docs/tasks-todo/phase-2-analysis.md` — The mapping document
- `/tdn-specs/S1-core.md` — Current spec
- `/tdn-specs/S3-data-read-write.md` — Where implementation guidance now lives

**Output:** Updated `/tdn-specs/S1-core.md`

**Changes:**

- Remove Section 6.2 (Error Handling) → S3
- Remove Section 6.3 (Timestamps) → S3
- Remove Section 6.4 (Interoperability) → S3
- Keep Section 6.1 (Conformance Levels) but review for any implementation guidance
- Clean up any other implementation details that crept into file definitions

---

#### Phase 2.4: Create S2 [COMPLETE]

**Goal:** Create S2 with interface design principles and patterns.

**Context Documents (read before starting):**

- `docs/tasks-todo/phase-2-analysis.md` — The mapping document with proposed structure
- `/docs/product-overviews/cli/cli-requirements.md` — Source of patterns to generalize
- `/docs/tasks-todo/BEANS_REVIEW.md` — Additional patterns to consider
- `/tdn-specs/S1-core.md` — Data model context

**Output:** `/tdn-specs/S2-interface-design.md`

**Expected content (per analysis doc):**

- Scope and applicability (CLI, SDK, notes on desktop)
- Output modes (human, JSON, AI/agent)
- Error handling patterns and error codes
- Field naming and display conventions
- Date handling (input formats, output formats)
- Query and filter patterns
- Sorting
- Identification patterns (paths vs fuzzy matching)
- Graceful degradation principles

**Note:** This is the largest piece of work. Use concrete examples (CLI syntax is fine as illustration). The goal is patterns that any interface can implement.

---

#### Phase 2.5: Update cli-requirements.md [COMPLETE]

**Goal:** Update CLI doc to reference S2, remove redundancy, keep CLI-specific details.

**Context Documents (read before starting):**

- `/tdn-specs/S2-interface-design.md` — The new interface spec
- `/docs/product-overviews/cli/cli-requirements.md` — Doc to update

**Output:** Updated `/docs/product-overviews/cli/cli-requirements.md`

**Changes:**

- Add references to S2 where appropriate ("see S2 for output mode specification")
- Remove content now redundant with S2
- Keep all CLI-specific details (commands, flags, examples, interactive behavior)
- Ensure no contradictions with S2

---

## Phase 3. Cleanup

**Goal:** Final pass to ensure specs are well-formatted, consistent, and non-contradictory.

**Context Documents (read before starting):**

- `/tdn-specs/README.md`
- `/tdn-specs/S1-core.md`
- `/tdn-specs/S2-interface-design.md`
- `/tdn-specs/S3-data-read-write.md`
- `/docs/product-overviews/cli/cli-requirements.md`

**Checklist:**

- [ ] All specs are well-formatted and readable
- [ ] No contradictions between specs
- [ ] S2 is sufficiently generalized (not just "CLI spec rewritten")
- [ ] Cross-references between specs are accurate
- [ ] Any references to specs in other documentation are updated
- [ ] README.md accurately describes all three specs

# Phase 2 Analysis: Spec Split Mapping

This document maps existing content to the target three-spec structure and proposes the structure for S2 and S3.

**Context documents read:**

- `/tdn-specs/README.md`
- `/tdn-specs/S1-core.md`
- `/docs/product-overviews/cli/cli-requirements.md`
- `/docs/tasks-todo/BEANS_REVIEW.md`
- `/docs/overview.md`

---

## 1. S1-core.md Content Mapping

Current S1 is structured into 7 sections. Here's where each belongs:

### Stays in S1

| Section                   | Content                                                         | Notes                                               |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| 1. Terminology            | Markdown, YAML, Frontmatter, WikiLink, ISO 8601, File Reference | Core definitions, needed to understand file format  |
| 2. General Rules          | UTF-8, frontmatter format, field ordering, dates, enums         | Fundamental rules for files                         |
| 3. Task Files             | Location, filename, required/optional fields, status values     | Core data model                                     |
| 4. Project Files          | Location, filename, fields, status values, taskdn-type          | Core data model                                     |
| 5. Area Files             | Location, filename, fields, status, taskdn-type                 | Core data model                                     |
| 6.1 Conformance Levels    | What implementations MUST/SHOULD/MAY support                    | Stays—defines compliance levels for the file format |
| 7.1 Design Rationale      | Why one file per task, why YAML, etc.                           | Rationale for S1 decisions                          |
| 7.2 Compatibility Notes   | TaskNotes, Obsidian compatibility                               | S1-specific compatibility                           |
| 7.3 JSON Schemas          | Schema file references                                          | S1 deliverable                                      |
| 7.4 Future Considerations | Priority, recurring, subtasks, tags                             | S1 future scope                                     |

### Moves to S3

| Section              | Content                                                                                      | Notes                                        |
| -------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 6.2 Error Handling   | Skip unparseable files, treat missing required fields as invalid, don't modify invalid files | Guidance for implementations reading/writing |
| 6.3 Timestamps       | Auto-set created-at, updated-at, completed-at                                                | Guidance for implementations writing         |
| 6.4 Interoperability | Preserve unknown fields, preserve body, preserve YAML formatting                             | Guidance for implementations writing         |

### Action Summary for S1

1. Move sections 6.2, 6.3, 6.4 to S3
2. Renumber section 6 (will just have Conformance Levels)
3. Consider whether 6.1 should reference S3 for implementation guidance
4. No content changes to sections 1-5 or 7

---

## 2. cli-requirements.md Analysis

The CLI doc is comprehensive (~1300 lines). Much of it is CLI-specific, but significant portions describe general interface patterns.

### Generalizes to S2

| CLI Section                             | S2 Topic                  | Notes                                                                 |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------- |
| "Two User Types, Two Modes"             | Interface modes           | The human/agent distinction applies to any interface                  |
| "Output Modes & Flags" (concepts)       | Output modes              | Mode concepts (human, JSON, agent) generalize; specific flags are CLI |
| "AI Mode Behaviors"                     | Agent mode specification  | Non-prompting, path inclusion, structured errors                      |
| "Why Markdown for AI Mode?"             | Agent output rationale    | Applies to any agent-facing interface                                 |
| "JSON Output Structure"                 | JSON output specification | Summary field, entity keys pattern                                    |
| "Empty Results"                         | Empty result handling     | Applies to any interface                                              |
| "AI Mode Output Specification"          | Agent output format       | Heading structure, field format, date formats, body inclusion         |
| "Identification: Paths vs Fuzzy Search" | Identification patterns   | The principle generalizes; fuzzy matching details may be CLI-specific |
| "What 'Active' Means"                   | Active entity definitions | Possibly S1? See open questions                                       |
| "Date Handling"                         | Date input/output         | Natural language and ISO formats                                      |
| "Exit Codes" (concepts)                 | Error severity levels     | Success/runtime-error/usage-error distinction                         |
| "Error Codes"                           | Error code catalog        | The codes themselves generalize                                       |
| "Error structure (AI mode)"             | Error output format       | Applies to any programmatic interface                                 |

### Stays CLI-Specific

| CLI Section                                 | Reason                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| "The Flag System" table                     | Flags are CLI syntax                                                      |
| "Interactive Prompts"                       | CLI-specific UX                                                           |
| "Commands" (all subsections)                | CLI command definitions                                                   |
| "Command Grammar"                           | Verb-first is CLI syntax                                                  |
| "Convenience Commands" (today, inbox, next) | CLI shortcuts                                                             |
| "Context Command"                           | CLI command (though the concept of hierarchical queries could generalize) |
| "Show/List/Add/Update Commands"             | CLI commands                                                              |
| "Doctor Command"                            | CLI command                                                               |
| "Fuzzy Matching Rules"                      | CLI-specific behavior                                                     |
| "Configuration"                             | CLI config files                                                          |
| "Dry Run Mode"                              | CLI feature                                                               |
| "Piping Support"                            | CLI feature                                                               |
| "Bulk Operations"                           | CLI feature                                                               |
| "Short Flags"                               | CLI syntax                                                                |
| "Shell Completions"                         | CLI feature                                                               |
| "Design Decisions & Rationale"              | Mix: some generalizes, some CLI-specific                                  |

### Relationship Between S2 and cli-requirements.md

After creating S2:

- cli-requirements.md should reference S2 for general patterns
- cli-requirements.md keeps all command definitions, flags, interactive behavior
- No content is "deleted" from CLI doc—it either moves to S2 or stays with a reference added

---

## 3. Beans Findings to Incorporate

From BEANS_REVIEW.md, the following are marked as "Adopt" or relevant:

### Adopt: Output Mode Design

Already well-specified in cli-requirements.md. S2 should capture the pattern:

- Default: Human-friendly, colored output
- `--json`: Machine-readable JSON (implies non-interactive)
- `--ai` (or equivalent): Agent-optimized structured output

**Action:** Generalize this into S2 as a pattern any interface should follow.

### Adopt: Consistent Flag Patterns

The inclusion/exclusion pattern:

- Include: `-s todo` or `--status todo`
- Exclude: `--no-status completed`
- Multiple values: OR logic (`-s todo -s ready`)

**Action:** The _principle_ (inclusion/exclusion, OR for same filter, AND across filters) goes in S2. Specific flag syntax stays in CLI doc.

### Adopt: Bleve Search with BM25

Recommendation for full-text search implementations:

- Use BM25 scoring (handles term frequency saturation, document length normalization)
- Consider Bleve query syntax (fuzzy, wildcards, phrases, boolean, field-specific)

**Action:** S2 includes a search section recommending BM25 and noting query syntax considerations. Not prescriptive about implementation (Bleve is Go-specific).

### Deferred: GraphQL

Per decision in task doc. S2 may note that field selection for agents is important but doesn't prescribe GraphQL.

### Skipped

- Prime/injection pattern (Beans-specific use case)
- TodoWrite override (Beans-specific)
- Strict type hierarchy (programming-specific)
- Commit integration (git-specific)

---

## 4. Proposed S2 Structure

### S2: Interface Design — Table of Contents

```
# Specification S2: Interface Design

Version: 1.0.0-draft

## 1. Introduction
   - Purpose and scope
   - Applicability (CLI, SDK, desktop notes)
   - Relationship to S1 and S3

## 2. Design Philosophy
   - Two user types: humans and machines (including AI agents)
   - Optimize for each rather than compromise
   - Principle: interfaces SHOULD provide distinct modes
   - Principle: agent-facing interfaces SHOULD bundle related context (see 3.3)

## 3. Interface Modes
   ### 3.1 Human Mode
   - Default for interactive use
   - Formatted output (colors, alignment, tables)
   - May prompt for input
   - Fuzzy matching acceptable for reads

   ### 3.2 Machine Mode (JSON)
   - Structured JSON output
   - Non-interactive (no prompts)
   - Exact identifiers required for writes
   - Summary field pattern

   ### 3.3 Agent Mode
   - Structured Markdown output (token-efficient, gracefully degradable)
   - Non-interactive
   - Always includes file paths
   - Rationale for Markdown over JSON for agents
   - Design principle: provide context-rich responses
     - Bundle entity with related context in single response
     - Reduces round-trips, gives agent full picture
     - Specific API shape is implementation-defined

## 4. Output Formats
   ### 4.1 Human Output
   - Readable, scannable
   - Implementation-specific formatting

   ### 4.2 JSON Output
   - Structure: { "summary": "...", "<entities>": [...] }
   - Empty results: explicit (empty array, descriptive summary)
   - Single entity: { "summary": "...", "<entity>": {...} }

   ### 4.3 Agent Output (Structured Markdown)
   - Heading hierarchy (## for sections, ### for entities)
   - Field format (- **field-name:** value)
   - Date formats
   - Array field formatting
   - Body inclusion rules

## 5. Field Naming & Display
   ### 5.1 Canonical Field Names
   - Use kebab-case as defined in S1
   - Agent mode: always use canonical names

   ### 5.2 Human-Friendly Display Names
   - Mapping table (created-at → Created, etc.)
   - Human mode MAY use friendly names

   ### 5.3 Array Fields
   - Display as comma-separated inline values
   - Empty array handling

## 6. Date Handling
   ### 6.1 Input Formats
   - ISO 8601 (YYYY-MM-DD) always accepted
   - Natural language MAY be supported (today, tomorrow, next friday, +3d)
   - Ambiguous formats SHOULD be rejected

   ### 6.2 Output Formats
   - Always ISO 8601
   - Date fields: YYYY-MM-DD
   - Timestamp fields: YYYY-MM-DDTHH:MM:SS

   ### 6.3 Recommendations for Programmatic Clients
   - Use ISO 8601 for all input
   - Natural language is for human convenience only

## 7. Identification Patterns
   ### 7.1 Path-Based Identification
   - Unambiguous, required for writes in machine/agent mode
   - Path formats (absolute, relative, tilde-expanded)

   ### 7.2 Fuzzy Matching
   - Acceptable for reads in human mode
   - Case-insensitive substring matching
   - No typo tolerance (predictable behavior)

   ### 7.3 Ambiguity Handling
   - Human mode: prompt for selection
   - Machine/agent mode: error with list of matches

## 8. Query & Filter Patterns
   ### 8.1 Filter Combination Logic
   - Same filter, multiple values: OR
   - Different filters: AND
   - Contradictory filters: empty result (not error)

   ### 8.2 Default Filters (Active Items)
   - Tasks: exclude done, dropped, icebox; exclude future defer-until; exclude archived
   - Projects: exclude done
   - Areas: include active or unset status

   ### 8.3 Inclusion Flags Pattern
   - Explicit opt-in for excluded items
   - Pattern: --include-<category>

   ### 8.4 Sorting
   - Common sort fields: created, updated, due, title
   - Null handling: nulls last (regardless of sort direction)

## 9. Error Handling
   ### 9.1 Error Severity Levels
   - Success (including empty results)
   - Runtime error (valid request, execution failed)
   - Usage error (invalid request)

   ### 9.2 Error Codes
   - Catalog of standard error codes
   - NOT_FOUND, AMBIGUOUS, INVALID_STATUS, INVALID_DATE, etc.

   ### 9.3 Error Structure
   - Human mode: prose with suggestions
   - Machine/agent mode: structured (code, message, details, suggestions)

   ### 9.4 Graceful Degradation
   - Partial results when possible (skip bad files, warn)
   - Batch operations: complete all, report successes and failures separately

## 10. Search
   ### 10.1 Full-Text Search
   - Recommendation: BM25 scoring
   - Rationale (term saturation, document length normalization)

   ### 10.2 Query Syntax Considerations
   - Basic: substring/term matching
   - Advanced (optional): fuzzy, wildcards, phrases, boolean, field-specific

## Appendix A: Applicability to Desktop Apps

Notes on how these patterns apply (or don't) to GUI interfaces:
- No "modes" in the CLI sense, but JSON export may follow Machine Mode
- Fuzzy matching in search bars follows human mode patterns
- Error handling may use dialogs rather than structured output
- Query/filter patterns apply to views and filters
```

---

## 5. Proposed S3 Structure

### S3: Guidance for Reading & Writing Data — Table of Contents

```
# Specification S3: Data Read/Write Guidance

Version: 1.0.0-draft

## 1. Introduction
   - Purpose: guidance for implementations reading/writing S1-compliant files
   - Scope: error handling, data preservation, timestamp management

## 2. Reading Files
   ### 2.1 Parse Error Handling
   - If YAML is invalid: skip file, MAY emit warning
   - If required field missing: treat as invalid, MAY emit warning
   - If status value unrecognized: treat as invalid

   ### 2.2 Unknown Fields
   - MUST ignore unknown frontmatter fields during processing
   - This allows user customization without breaking compatibility

## 3. Writing Files
   ### 3.1 Timestamp Management
   - SHOULD set created-at when creating a task
   - SHOULD update updated-at when modifying a task
   - SHOULD set completed-at when status changes to done or dropped

   ### 3.2 Data Preservation
   - MUST preserve unknown frontmatter fields
   - MUST preserve the Markdown body
   - SHOULD preserve YAML formatting (comments, ordering) where possible

   ### 3.3 Validation Before Write
   - MUST NOT modify files that fail validation without explicit user consent
   - After write, file SHOULD be valid per S1

## 4. File Safety
   ### 4.1 Atomic Writes
   - Recommendation: write to temp file, then rename
   - Prevents corruption on crash/interrupt

   ### 4.2 Concurrent Access
   - No locking specified (single-user system)
   - Long-running processes (TUI, desktop) SHOULD watch for external changes

## 5. Formatting Guidance
   ### 5.1 YAML Formatting
   - Frontmatter delimiters: exactly `---` on own line
   - String quoting: quote strings containing special YAML characters
   - Array formatting: multi-line or inline acceptable

   ### 5.2 File Encoding
   - MUST be UTF-8
   - SHOULD NOT include BOM
```

---

## 6. Open Questions

### 6.1 Where does "active" definition belong?

The cli-requirements.md defines "active tasks" as:

- Status NOT IN (done, dropped, icebox)
- defer-until unset or <= today
- Not in archive/ subdirectory

This is about **data model semantics** (what "active" means) but also **filtering behavior** (how queries work).

**Options:**

1. Put in S1 (it's about the data model)
2. Put in S2 (it's about query behavior)
3. Split: S1 defines the _concept_, S2 defines _how to filter_

**Recommendation:** Put in S2 under "Default Filters (Active Items)". The concept of "active" is an interface concern—it's about what users see by default. S1 just defines the fields; S2 defines how to interpret them for display.

### 6.2 Should S2 cover batch operations?

cli-requirements.md specifies batch operation semantics:

- Process all items (don't stop at first error)
- Report successes and failures separately
- Exit code 1 if ANY failed

**Recommendation:** Yes, include in S2 under "Graceful Degradation" or as a separate section. This pattern applies to any interface that can operate on multiple items.

### 6.3 How detailed should the search section be?

The Beans review recommends Bleve with BM25, but Bleve is Go-specific.

**Recommendation:** S2 recommends _concepts_ (BM25 scoring, query syntax categories) without mandating specific libraries. Implementations choose their own tooling.

### 6.4 Context/hierarchical queries

The CLI has a `context` command that returns an entity plus related entities. Should S2 describe this pattern generically?

**Recommendation:** Not as a formal specification in v1. This is a CLI-specific convenience. SDKs would expose this differently (methods like `getProjectWithTasks()`). Desktop apps have their own navigation patterns.

**However:** S2 should include a design principle note about this pattern. When building tools for AI agents, bundling related context into a single response is valuable:

- Agents benefit from receiving a task _plus_ its project _plus_ its area in one call
- This reduces round-trips and gives the agent sufficient context to reason about the work
- The specific API shape varies by interface type, but the principle is universal

This should be mentioned in S2 Section 2 (Design Philosophy) or Section 3.3 (Agent Mode) as a recommendation, not a specification. Something like: "Agent-facing interfaces SHOULD provide operations that return entities with their related context, minimizing the need for multiple queries."

---

## 7. Summary of Actions

### Phase 2.2 (Create S3)

1. Create `/tdn-specs/S3-data-read-write.md` with structure from Section 5 above
2. Source content from S1 sections 6.2, 6.3, 6.4
3. Add file safety and formatting guidance sections

### Phase 2.3 (Refactor S1)

1. Remove sections 6.2, 6.3, 6.4 from S1
2. Renumber remaining section 6 content
3. Add cross-reference to S3 in section 6

### Phase 2.4 (Create S2)

1. Create `/tdn-specs/S2-interface-design.md` with structure from Section 4 above
2. Generalize content from cli-requirements.md per mapping in Section 2
3. Incorporate Beans findings per Section 3
4. Resolve open questions (recommendations provided above)

### Phase 2.5 (Update cli-requirements.md)

1. Add S2 references in relevant sections
2. Remove content now redundant (if any—mostly will be "see S2 for general pattern")
3. Ensure CLI-specific details remain comprehensive
