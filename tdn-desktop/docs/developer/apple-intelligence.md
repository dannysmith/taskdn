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
- 2-3 few-shot examples showing input text → expected JSON output, including an example where most fields are empty

The few-shot examples are the single highest-impact part of the prompt. They teach the model the expected output format and, critically, that leaving fields empty is the right thing to do when information isn't present.

### 4. Rust calls Swift via C FFI

The system prompt and user text are converted to C strings and passed through the FFI boundary to Swift. The Rust side handles all memory management — it converts to `CString` for the call and frees the response via `free_apple_llm_response` afterwards.

### 5. Swift runs on-device inference

The Swift function creates a `LanguageModelSession` with the system prompt as `instructions` (which the model is trained to prioritise over user input). It then calls `session.respond(to: userText, generating: ParsedTask.self)`.

`ParsedTask` is a `@Generable` struct — this is Apple's constrained decoding system. The model's token generation is structurally constrained to produce valid output matching the struct's fields. The `ParsedStatus` enum means the model literally cannot output an invalid status value.

If `@Generable` succeeds (the normal path), the typed `ParsedTask` struct is manually serialized to a JSON string. If it fails (rare), the function falls back to a plain `session.respond()` call — the model typically returns a JSON code block in this case.

Because the Swift call is `async` but the C FFI is synchronous, a `DispatchSemaphore` bridges the two. A detached task runs the inference, signals the semaphore on completion, and the calling thread blocks until it's done. This takes ~2-3 seconds on Apple Silicon.

### 6. Rust parses and validates the response

Back in Rust, `parse_ai_response()` processes the JSON string through several stages:

**Code fence stripping:** If the fallback path produced a markdown-wrapped JSON block (`` ```json...``` ``), the fences are stripped so `serde_json` can parse it.

**Title extraction:** The model's title is used. If JSON parsing failed entirely, the original input text becomes the title.

**Body logic:** If the model transformed the title (it differs from the original input), the original text is preserved in the body — this ensures no context from dictation is lost. If the model also generated body text, it's only appended if it contains genuinely new information. A normalisation check (`is_essentially_same`) catches cases where the model just parrots the input back with minor punctuation changes.

**Date validation:** Each date string is parsed with `chrono::NaiveDate`. Valid YYYY-MM-DD is kept. Empty strings become `None`. Anything else (malformed dates, random text) is silently discarded.

**Project/area matching:** The model returns a project or area name as a string. Rust does case-insensitive exact match against the provided list of names. A match returns the entity's hash ID (which the frontend uses for the dropdown selectors). No match → the field is left empty for the user to set manually. This is a deliberate safety net — the model sometimes hallucinates project/area names that don't exist, and the exact matching silently drops them.

**Status validation:** Must be one of `inbox`, `icebox`, `ready`, `in-progress`, `blocked`. Anything else defaults to `inbox`.

### 7. Frontend populates the form

The React handler receives the `ParsedQuickEntry` result and sets each piece of form state: title, body (with the body section auto-expanding if populated), status, dates, project ID, and area ID. The UI updates immediately — the user sees fields filled in and can adjust anything before saving.

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
Rust: parse_ai_response()
  │  strips markdown code fences (fallback path)
  │  parses JSON
  │  validates dates (YYYY-MM-DD or discard)
  │  matches project/area names → IDs (case-insensitive exact)
  │  applies body logic (preserve original text, deduplicate)
  │  validates status against known values
  │
  ▼
React: populates form fields
  user reviews and saves normally
```

## Key Components

### Swift Bridge

Three files in `src-tauri/swift/`:

- `apple_intelligence.swift` — The real implementation. Contains the `@Generable ParsedTask` struct with `ParsedStatus` enum, the `LanguageModelSession` call, JSON serialization, and availability check.
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

The command builds the system prompt, calls the FFI, parses the response, validates fields, and resolves project/area names to IDs.

### Prompt Templates

`src/commands/ai_prompts.rs` centralizes all prompt text. This is the primary file to edit when iterating on prompt quality. It contains:

- `build_system_prompt()` — Assembles the complete prompt from role text, context, field instructions, and few-shot examples
- `build_context_block()` — Formats areas and their projects as a structured list
- `build_examples_block()` — Generates few-shot input→output pairs (dynamically computes "tomorrow" from today's date)

## The @Generable Struct

```swift
@Generable
struct ParsedTask: Sendable {
    let title: String       // concise task title
    let body: String        // extra detail, or empty string
    let status: ParsedStatus  // constrained enum
    let due: String         // YYYY-MM-DD or empty string
    let scheduled: String   // YYYY-MM-DD or empty string
    let deferUntil: String  // YYYY-MM-DD or empty string
    let project: String     // project name or empty string
    let area: String        // area name or empty string
}

@Generable
enum ParsedStatus: Sendable {
    case inbox, icebox, ready, inProgress, blocked
}
```

`@Generable` uses constrained decoding — the model's token generation is structurally constrained to produce valid output matching the struct. The `ParsedStatus` enum means the model literally cannot output an invalid status.

Each field has a `@Guide(description:)` annotation providing a short hint. The system prompt carries the detailed decision-making instructions.

Properties generate in declaration order. Later properties can be influenced by earlier ones. Title is first (most important), optional fields are last.

## Response Parsing Pipeline

After receiving the JSON from Swift, Rust applies several transformations:

**Code fence stripping:** If `@Generable` fails and the fallback produces a markdown-wrapped JSON block (`` ```json...``` ``), the fences are stripped before parsing.

**Body logic:** The raw dictated text is preserved in the body when the title was transformed (title != original input). If the AI also generated body text, it's appended only if it adds genuinely new content — checked via `is_essentially_same()` which normalises case and trailing punctuation to avoid duplication.

**Date validation:** Each date string is parsed with `chrono::NaiveDate`. Valid YYYY-MM-DD is kept, anything else is silently discarded.

**Project/area matching:** The model returns a name string. Rust does case-insensitive exact match against the provided list. No match → field is left empty. (Fuzzy matching is a planned improvement.)

**Status validation:** Must be one of `inbox`, `icebox`, `ready`, `in-progress`, `blocked`. Anything else defaults to `inbox`.

## Frontend Integration

The sparkles button in `QuickPaneTitle` is conditionally rendered: `aiAvailable && value.trim().length > 0`. It shows a spinner during processing.

The `Cmd+Shift+A` shortcut is registered in `useQuickPaneKeyboard` only when `onProcessWithAI` is provided (which only happens when AI is available).

On successful processing, the handler populates all form state setters. The body section auto-expands if body content was generated.

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

1. Edit `src/commands/ai_prompts.rs` — all prompt text is here
2. Restart the dev server (`bun run tauri:dev`)
3. Test with the quick pane
4. Check the server logs for raw response and mapped result
5. The system prompt appears at DEBUG level in logs

The few-shot examples in `build_examples_block()` are the highest-impact thing to change. Keep examples distinct from likely real inputs to avoid contamination (the model copying example content into real responses).

## Known Limitations

- **Date arithmetic is unreliable.** The 3B model frequently gets relative date calculations wrong ("this Friday" off by days, "end of the month" wrong month). Planned fix: have the LLM extract raw date expressions and resolve them deterministically in Rust.
- **Project name matching is exact only.** "Japan Trip" won't match "Japan Trip 2025". Planned fix: fuzzy matching in Rust.
- **Few-shot contamination.** If an input is similar to a few-shot example, the model may copy fields from the example rather than generating from the actual input.
- **Body generation for complex inputs.** The model sometimes fabricates body content not present in the input.
- **`@Guide(Regex{...})` is incompatible with `.default` model.** Regex constraints cause `@Generable` to fail, falling back to plain text. Use `@Guide(description:)` only.
- **`contentTagging` adapter is wrong for this task.** It produces topic tags instead of following structured extraction instructions. Use `.default`.
