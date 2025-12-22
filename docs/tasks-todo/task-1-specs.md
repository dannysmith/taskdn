# Task: Specs

## Phase 1. Review Beans external CLI interface [COMPLETE]

Review https://github.com/hmans/beans for useful **external** patterns to follow. Produce document.

**Output:** `docs/tasks-todo/BEANS_REVIEW.md`

---

## Phase 2. Split Spec Docs into 3

Split the original single spec doc `/tdn-specs/S1-core.md` into three docs as per `/tdn-specs/README.md`, incorporating findings from Phase 1 and the CLI spec work.

### Target Structure

| Spec | Purpose | Current State |
|------|---------|---------------|
| **S1: Core (Data Storage)** | Files on disk only: naming, frontmatter, location, data types, JSON schemas | Exists, needs content extracted |
| **S2: Interface Design** | How interfaces interact with S1 data: output modes, query/filter, error handling, field naming | Does not exist |
| **S3: Data Read/Write Guidance** | Safe reading, writing, mutation of files | Does not exist |

### Key Decisions (Resolved)

| Decision | Resolution | Notes |
|----------|------------|-------|
| S2 scope | CLI & SDK primarily | Include notes on desktop applicability; general principles may apply broadly |
| GraphQL | Deferred | Interesting but adds complexity; field selection can be achieved simpler |
| Generalization level | Mid-level (concrete patterns) | Use CLI examples as illustrative patterns; readers can adapt to other contexts |
| Search | Recommend Bleve with BM25 | Per Beans review analysis |
| Output modes | Adopt existing CLI design | Already well-specified in cli-requirements.md |
| Flag patterns | Adopt existing CLI design | Inclusion/exclusion pattern already designed |

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
