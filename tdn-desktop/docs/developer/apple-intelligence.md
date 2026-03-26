# Apple Intelligence Quick Entry Processing

The quick entry pane supports AI-powered processing of free-form text input using Apple's on-device Foundation Models framework (~3B parameter model). Users type or dictate natural language and the system parses it into structured task fields.

## Availability

- macOS 26.0+ (Tahoe) on Apple Silicon only
- Apple Intelligence must be enabled in System Settings
- Feature is completely invisible when unavailable (no button, no shortcut)
- App weak-links FoundationModels so it launches on older macOS
- Build falls back to a stub implementation when the SDK lacks FoundationModels

## How It Works (Step by Step)

### 1. User opens the quick pane

User presses `Cmd+Shift+.` (global shortcut). The quick pane React app receives a focus event and loads areas, projects, and checks AI availability in parallel. The availability check goes through Rust → Swift FFI → `SystemLanguageModel.default.availability`. If Apple Intelligence is available, the sparkles button becomes visible once the user types something.

### 2. User types and triggers AI processing

User types or dictates free-form text into the title field (e.g. "Email James about the Japan Trip, schedule for next Monday") and clicks the sparkles button or presses `Cmd+Shift+A`.

The frontend builds context from the loaded vault data: each project as a name + ID + parent area name (stripping wikilink brackets from the area reference), and each area as a name + ID. This context tells the LLM what projects and areas exist so it can match against them.

### 3. Rust builds the system prompt

The Tauri command `process_quick_entry_text` receives the raw text and context. It gets today's date and day of week, then calls `ai_prompts::build_system_prompt()` which assembles the complete prompt from:

- A short role statement ("You are a task field extractor...")
- Today's date and day of week
- A structured list of areas and their projects (e.g. "Acme Corp: Acme Dashboard Redesign")
- Per-field instructions explaining when to set each field and when to leave it empty
- Few-shot examples showing input text → expected JSON output, including examples with empty fields

The few-shot examples are the single highest-impact part of the prompt. They teach the model the expected output format and, critically, that leaving fields empty is the right thing to do when information isn't present.

### 4. Rust calls Swift via C FFI

The system prompt and user text are converted to C strings and passed through the FFI boundary to Swift. The Rust side handles all memory management — it converts to `CString` for the call and frees the response via `free_apple_llm_response` afterwards.

### 5. Swift runs on-device inference

The Swift function creates a `LanguageModelSession` with the system prompt as `instructions` (which the model is trained to prioritise over user input). It then calls `session.respond(to: userText, generating: ParsedTask.self)`.

`ParsedTask` is a `@Generable` struct — this is Apple's constrained decoding system. The model's token generation is structurally constrained to produce valid output matching the struct's fields. The struct has 7 fields: title, body, dueRef, scheduledRef, deferUntilRef, project, area. Note: status is NOT included — it's handled deterministically (see step 6).

The date fields are `*Ref` fields — the model extracts raw date expressions ("tomorrow", "next Monday", "end of March") rather than computing YYYY-MM-DD dates. Date arithmetic is done in Rust.

If `@Generable` succeeds (the normal path), the typed `ParsedTask` struct is manually serialized to a JSON string. If it fails (rare), the function falls back to a plain `session.respond()` call — the model typically returns a JSON code block in this case.

Because the Swift call is `async` but the C FFI is synchronous, a `DispatchSemaphore` bridges the two. A detached task runs the inference, signals the semaphore on completion, and the calling thread blocks until it's done. This takes ~2-3 seconds on Apple Silicon.

The Tauri command is `async` and wraps the blocking FFI call in `tauri::async_runtime::spawn_blocking` to keep the main thread free (avoiding the beach ball cursor and allowing React to render the loading spinner).

### 6. Rust parses, resolves, and validates the response

Back in Rust, `parse_ai_response()` processes the JSON string through several stages:

**Code fence stripping:** If the fallback path produced a markdown-wrapped JSON block (` ```json...``` `), the fences are stripped so `serde_json` can parse it.

**Title extraction:** The model's title is used. If JSON parsing failed entirely, the original input text becomes the title.

**Body logic:** If the model transformed the title (it differs from the original input), the original text is preserved in the body — this ensures no context from dictation is lost. If the model also generated body text, it's only appended if it contains genuinely new information. A normalisation check (`is_essentially_same`) catches cases where the model just parrots the input back with minor punctuation changes.

**Date resolution (`ai_resolve.rs`):** The model returns raw date expressions (e.g. "tomorrow", "next Monday", "end of March"). Rust resolves these deterministically using the `fuzzydate` crate with custom handlers for patterns it doesn't support natively (ordinal suffixes, "end of [month]", "in N weeks", "on/by [day]" prefixes). Invalid or unparseable expressions become `None`.

**Project/area matching (`ai_resolve.rs`):** The model returns a name string. Rust first tries case-insensitive exact match, then falls back to case-insensitive substring match (minimum 3 characters). This handles the common case where the model returns a truncated name ("Japan Trip" matches "Japan Trip 2025"). No match → field is left empty.

**Status determination:** Status is NOT set by the LLM. Instead:

1. `detect_status_from_keywords()` scans the original input text for explicit status phrases: `blocked` / `waiting on` → blocked, `icebox` / `ice box` → icebox, `in progress` / `in-progress` → in-progress. Everything else → inbox.
2. The frontend applies auto-ready rules after (see step 7).

### 7. Frontend populates the form and applies auto-ready rules

The React handler receives the `ParsedQuickEntry` result and sets each piece of form state: title, body (with the body section auto-expanding if populated), status, dates, project ID, and area ID. The UI updates immediately.

Two auto-ready rules then apply:

**Rule 1 (all quick entry, not just AI):** A `useEffect` watches projectId, areaId, scheduled, and deferUntil. If `(project OR area) AND (scheduled OR defer)` are set and status is `inbox`, it auto-promotes to `ready`. A task with both a project/area and a when-to-do-it date has been "processed" — it doesn't need the inbox.

**Rule 2 (AI only):** After AI processing, if the scheduled date is within 7 days of today and status is still `inbox` (keyword detection didn't override), promote to `ready`. Catches "call Dave tomorrow" style tasks.

### 8. User reviews and saves

The user presses `Cmd+Enter` to save. From here the flow is identical to a manually-entered task: `createTask` writes the file to disk with the appropriate frontmatter, and `updateTask` adds the body content. The vault index is updated and the main window receives a `task-created` event.

## Architecture Diagram

```
React (QuickPaneApp)
  │  builds project/area context from loaded vault data
  │  strips wikilinks from project area references
  │
  ▼
Tauri command: process_quick_entry_text()
  │  builds system prompt (ai_prompts.rs) with:
  │    - role + field instructions
  │    - today's date
  │    - area→project relationships
  │    - few-shot examples
  │
  ▼
Rust FFI wrapper: apple_intelligence::process_text()
  │  converts to CStrings, calls Swift, frees C memory
  │
  ▼
Swift: processTextWithSystemPrompt()
  │  creates LanguageModelSession with system prompt as instructions
  │  calls session.respond(to: userText, generating: ParsedTask.self)
  │  ParsedTask is a @Generable struct — constrained decoding
  │  falls back to plain text if @Generable fails
  │  serializes to JSON, strips invisible Unicode chars
  │
  ▼
Rust: parse_ai_response() + ai_resolve
  │  strips markdown code fences (fallback path)
  │  parses JSON
  │  resolves date expressions → YYYY-MM-DD (fuzzydate + custom)
  │  matches project/area names → IDs (substring fuzzy match)
  │  applies body logic (preserve original text, deduplicate)
  │  detects status from keywords (not LLM)
  │
  ▼
React: populates form fields
  applies auto-ready rules (Rule 1 + Rule 2)
  user reviews and saves normally
```

## Key Components

### Swift Bridge

Three files in `src-tauri/swift/`:

- `apple_intelligence.swift` — The real implementation. Contains the `@Generable ParsedTask` struct (7 fields, no status), the `LanguageModelSession` call, JSON serialization, and availability check.
- `apple_intelligence_stub.swift` — Compiled instead when the build SDK lacks FoundationModels. All functions return errors.
- `apple_intelligence_bridge.h` — C header defining the `AppleLLMResponse` struct and function signatures shared between Swift and Rust.

The Swift code bridges async/await to synchronous C using `DispatchSemaphore` + `Task.detached`. Memory is managed manually — `strdup` for C strings, `free` on the Rust side via `free_apple_llm_response`.

### Build Script

`build.rs` contains `build_apple_intelligence_bridge()` (gated to macOS ARM64). It detects whether the SDK has FoundationModels, compiles the appropriate Swift file with `swiftc`, creates a static library with `libtool`, and sets up linking. Key detail: `-weak_framework FoundationModels` allows the app to launch on older macOS.

### Rust FFI Wrapper

`src/apple_intelligence.rs` provides safe Rust functions over the unsafe C FFI:

- `check_availability()` → `bool`
- `process_text(system_prompt, user_content, max_tokens)` → `Result<String, String>`

### Tauri Commands

`src/commands/ai.rs` exposes two commands to the frontend:

- `check_apple_intelligence_available()` → `bool`
- `process_quick_entry_text(text, projects, areas)` → `Result<ParsedQuickEntry, String>`

The command builds the system prompt, calls the FFI, parses the response, resolves dates and project/area names, and applies keyword-based status detection.

### Prompt Templates

`src/commands/ai_prompts.rs` centralizes all prompt text. This is the primary file to edit when iterating on prompt quality. It contains:

- `build_system_prompt()` — Assembles the complete prompt from role text, context, field instructions, and few-shot examples
- `build_context_block()` — Formats areas and projects as separate lists for the prompt
- `build_examples_block()` — Few-shot input→output pairs showing raw date expression extraction

### Date Resolution and Fuzzy Matching

`src/commands/ai_resolve.rs` handles the deterministic parts of processing:

- `resolve_date_expression(expr, today)` — Resolves natural language dates ("tomorrow", "next Monday", "end of March") to YYYY-MM-DD strings using the `fuzzydate` crate with custom handlers for ordinal suffixes, "end of [month]", "in N weeks", and "on/by" prefixes
- `match_project_fuzzy(name, projects)` — Case-insensitive exact match, then substring match (min 3 chars)
- `match_area_fuzzy(name, areas)` — Same approach for areas

## The @Generable Struct

```swift
@Generable
struct ParsedTask: Sendable {
    let title: String           // concise task title
    let body: String            // extra detail, or empty string
    let project: String         // project name or empty string
    let area: String            // area name or empty string
    let scheduledRef: String    // raw scheduling expression, or empty string
    let dueRef: String          // raw deadline expression, or empty string
    let deferUntilRef: String   // raw deferral expression, or empty string
}
```

Properties generate in declaration order. Project/area are placed before dates so the model considers them while the input is still fresh in context.

`@Generable` uses constrained decoding — the model's token generation is structurally constrained to produce valid output matching the struct.

Note: **status is not in the struct** — it was removed because the model was inconsistent with it. Status is now determined by keyword detection in Rust and auto-ready rules in the frontend.

Date fields are `*Ref` fields containing raw expressions ("tomorrow", "next Monday", "end of March") rather than YYYY-MM-DD dates. The model is good at text extraction but bad at date arithmetic, so date computation is done deterministically in Rust.

Each field has a `@Guide(description:)` annotation providing a short hint. The system prompt carries the detailed decision-making instructions.

## Frontend Integration

The sparkles button in `QuickPaneTitle` is conditionally rendered: `aiAvailable && value.trim().length > 0`. It shows a spinner during processing.

The `Cmd+Shift+A` shortcut is registered in `useQuickPaneKeyboard` only when `onProcessWithAI` is provided (which only happens when AI is available).

On successful processing, the handler populates all form state setters. The body section auto-expands if body content was generated.

### Auto-Ready Rules

Two rules automatically promote `inbox` → `ready`:

**Rule 1 (all quick entry):** A `useEffect` watches `[projectId, areaId, scheduled, deferUntil]`. When `(project OR area) AND (scheduled OR defer-until)` are set and status is `inbox`, it promotes to `ready`. This applies to manual entry too — it's not AI-specific.

**Rule 2 (AI only):** After AI processing, if the scheduled date is within 7 days of today and status is still `inbox`, promote to `ready`. Catches "call Dave tomorrow" style tasks.

## Logging

All AI processing is logged at INFO level with a clear delimiter:

```
── AI Quick Entry ──────────────────────────────────
Input: "Buy groceries for the week"
Raw response: {"title":"Buy groceries","body":"",... }
Mapped result:
  title:     "Buy groceries"
  body:      "Buy groceries for the week"
  status:    "inbox"
  due:       None
  ...
────────────────────────────────────────────────────
```

The full system prompt is logged at DEBUG level. To see it, check the Tauri dev server output.

## Iterating on Prompts

### Manual testing

1. Edit `src/commands/ai_prompts.rs` — all prompt text is here
2. Restart the dev server (`bun run tauri:dev`)
3. Test with the quick pane
4. Check the server logs for raw response and mapped result
5. The system prompt appears at DEBUG level in logs

The few-shot examples in `build_examples_block()` are the highest-impact thing to change. Keep examples distinct from likely real inputs to avoid contamination (the model copying example content into real responses).

### Evaluation harness

A faster feedback loop for prompt iteration. 31 test cases covering simple inputs, project/area matching, date extraction, status detection, complex dictation, and hallucination traps.

```
cd tdn-desktop/src-tauri && cargo test eval_ai --lib -- --ignored --nocapture
```

Takes ~50 seconds (31 LLM calls). Prints a per-case pass/fail summary with raw values and failure details. Uses fixed context (hardcoded projects, areas, date=2026-03-25 Wednesday) for reproducibility.

The harness does NOT assert on failure — it's a measurement tool, not a hard test. Some failures are expected while iterating on prompts.

As of March 2026, **~18/31 eval tests pass** — the remaining failures are mostly the model inconsistently extracting date expressions and project names from input. Run the eval across multiple runs to account for non-determinism.

### Unit tests

Deterministic logic (date resolution, fuzzy matching, keyword status detection) has standard unit tests that run in the normal test suite:

```
cd tdn-desktop/src-tauri && cargo test --lib
```

These cover date resolution patterns, fuzzy project/area matching, and keyword-based status detection.

## Known Limitations

- **LLM sometimes misses date expressions.** The model inconsistently extracts date references — "buy milk tomorrow" sometimes returns `scheduledRef: "tomorrow"`, sometimes returns empty. When it does extract, deterministic resolution handles it correctly.
- **LLM sometimes misses project names.** Even when a project name is explicitly in the input, the model may return empty. Fuzzy matching helps when the model returns a close-but-not-exact name, but can't help when it returns nothing.
- **Area hallucination.** When the model correctly identifies a project, it sometimes also fills in the parent area. This is harmless (both get set) but unexpected.
- **Body fabrication.** The model sometimes generates body content not present in the input. The `is_essentially_same` check catches parroting but not fabrication.
- **`@Guide(Regex{...})` is incompatible with `.default` model.** Regex constraints cause `@Generable` to fail, falling back to plain text. Use `@Guide(description:)` only.
- **`contentTagging` adapter is wrong for this task.** It produces topic tags instead of following structured extraction instructions. Use `.default`.
