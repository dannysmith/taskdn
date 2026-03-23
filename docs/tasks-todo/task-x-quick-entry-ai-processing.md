# Quick Entry AI Processing (Smart Dictation)

**GitHub Issue:** https://github.com/dannysmith/taskdn/issues/30
**Product:** tdn-desktop only

## Overview

Add AI-powered processing to the quick entry pane so users can dictate or type free-form natural language (e.g. "Create a new task in the Jengu project with a due date three weeks from now to review the meeting notes") and have it intelligently parsed into structured task fields (title, body, project, area, dates, status).

This does not involve voice-to-text transcription — we assume users have a transcription tool (e.g. macOS dictation). This is about taking transcribed/typed text and intelligently populating the quick entry form so the user can review and confirm before saving.

## Requirements

### From the GitHub Issue

- The contents of the title input field are sent to a local LLM with a short prompt, which returns structured task data for pre-populating the form.
- The prompt includes a list of current areas and projects, context about "now" (today's date), and instructions for lightly cleaning user input, extracting frontmatter fields, and generating a suitable title.
- The raw input text is always included in the body of the task doc.
- The prompt is not user-customizable.
- V1 supports only Apple Intelligence.
- There is no intent to ship downloadable LLMs or provide an interface for managing them for now.

### Product Requirements (from discussion)

- **Trigger:** Explicit keyboard shortcut (`Cmd+Shift+A`) + a visible button in the UI. The shortcut is only active when the quick entry pane is visible.
- **UX flow:** User opens quick pane → types/dictates free-form text → triggers AI processing → form fields are populated → user reviews and saves normally.
- **Body behavior:** The raw dictated/typed text is preserved in the body field, unless the AI-generated title is identical to the raw input (in which case no body is added, since nothing was transformed).
- **Invisible when unavailable:** If Apple Intelligence is not available (wrong platform, older macOS, not enabled), the feature must be completely invisible — no button, no shortcut, no trace. It should appear as if the feature doesn't exist.
- **Future provider support:** Don't prematurely optimise for Ollama or other providers, but at decision points, prefer architecture that wouldn't make adding them painful later. Keep the Rust-level interface clean (text + context in, structured result out).

### UI Placement

The quick entry pane is a compact floating card with: title input (top), metadata row with status/dates (middle), footer with project/area selectors + cancel/save (bottom). The AI processing button should sit adjacent to the title input area since that's where the action happens.

## Background: How Handy Does This

The Handy codebase (`~/dev/handy`) has a production-grade Apple Intelligence integration for post-processing transcriptions. It provides a proven Tauri ↔ Swift bridge pattern that we should follow closely.

### Architecture

```
React frontend
  → Tauri command (Rust)
    → C FFI (unsafe)
      → Swift FoundationModels API
        → On-device ~3B model inference
      ← Structured response (@Generable)
    ← Result<String, String>
  ← Populate form fields
```

### Key Files to Reference in Handy

| File | What it does |
|------|-------------|
| `src-tauri/swift/apple_intelligence.swift` | Real implementation (~144 lines). `@Generable` struct, `LanguageModelSession`, structured output with plain-text fallback, `DispatchSemaphore` for async→sync bridge |
| `src-tauri/swift/apple_intelligence_stub.swift` | Stub compiled when SDK lacks FoundationModels (~46 lines) |
| `src-tauri/swift/apple_intelligence_bridge.h` | C header defining `AppleLLMResponse` struct and FFI function signatures |
| `src-tauri/src/apple_intelligence.rs` | Rust wrapper with safe abstractions over the C FFI |
| `src-tauri/build.rs` | `build_apple_intelligence_bridge()` — SDK detection via `xcrun`, `swiftc` compilation, `libtool` for static lib, weak framework linking |

### Critical Gotchas Discovered by Handy

1. **SIGABRT on init:** Cannot access `SystemLanguageModel.default` during app initialization on macOS 26 — must defer the availability check to runtime (when the user actually tries to use the feature).
2. **Async→sync bridge:** Swift `async/await` called from synchronous Rust FFI. Uses `DispatchSemaphore` + `Task.detached(priority: .userInitiated)` with a thread-safe `ResultBox`.
3. **Weak linking:** Must use `-weak_framework FoundationModels` so the app launches on older macOS. Deployment target is macOS 11.0 with `@available(macOS 26.0, *)` runtime checks.
4. **Invisible Unicode:** LLMs sometimes insert zero-width spaces (`\u{200B}`, `\u{200C}`, `\u{200D}`, `\u{FEFF}`) — strip them from output.
5. **Structured output fallback:** `@Generable` can fail — always have a plain-text fallback path.
6. **Build-time SDK detection:** Check for `FoundationModels.framework` in the SDK path. If absent, compile the stub instead.

## Implementation Plan

### Phase 1: Swift Bridge (Apple Intelligence integration layer)

Set up the Tauri ↔ Swift FFI bridge, closely following Handy's pattern.

**Files to create:**
- `src-tauri/swift/apple_intelligence.swift` — The `@Generable` struct for parsed tasks, inference function, availability check
- `src-tauri/swift/apple_intelligence_stub.swift` — Fallback for builds without FoundationModels SDK
- `src-tauri/swift/apple_intelligence_bridge.h` — C-compatible struct and function declarations

**Files to modify:**
- `src-tauri/build.rs` — Add `build_apple_intelligence_bridge()` (can adapt directly from Handy's `build.rs`)

**Key design detail — the `@Generable` struct:**

```swift
@Generable
struct ParsedTask: Sendable {
    @Guide(description: "A concise task title summarizing the request")
    let title: String

    @Guide(description: "Additional context or notes, empty string if none")
    let body: String

    let status: ParsedStatus

    @Guide(description: "Due date in YYYY-MM-DD format, empty string if none")
    let due: String

    @Guide(description: "Scheduled date in YYYY-MM-DD format, empty string if none")
    let scheduled: String

    @Guide(description: "Defer-until date in YYYY-MM-DD format, empty string if none")
    let deferUntil: String

    @Guide(description: "Exact project name from the available list, empty string if none")
    let project: String

    @Guide(description: "Exact area name from the available list, empty string if none")
    let area: String
}

@Generable
enum ParsedStatus {
    case inbox
    case icebox
    case ready
    case inProgress
    case blocked
}
```

**Key design detail — status as enum:** Task statuses are known at compile time, so using a `@Generable enum` gives us constrained decoding for free — the model literally cannot output an invalid status. The enum omits `done` and `dropped` since those don't make sense for newly-created tasks.

**Key design detail — date handling:** The system prompt includes today's date and day of week. The LLM outputs dates directly in `YYYY-MM-DD` format. The ~3B model should handle common relative date arithmetic ("in 3 weeks", "next Tuesday", "end of April") well enough given today's date as context. If it occasionally gets a date wrong, the user corrects it during the review step — this is no worse than an empty field. Rust validates that returned date strings are valid `YYYY-MM-DD` and discards any that aren't.

**Key design detail — project/area matching:** The `@Guide(.anyOf([...]))` constraint requires compile-time values, but project/area names are dynamic per-user. Instead: list valid names in the system prompt instructions and use `@Guide(description:)` for guidance. In Rust, validate the returned name against the actual list using case-insensitive exact match. If no match, leave the field empty for the user to set manually.

### Phase 2: Rust Layer (command, prompt building, response handling)

**Files to create:**
- `src-tauri/src/apple_intelligence.rs` — Safe Rust wrapper over the C FFI (adapt from Handy)

**Files to modify:**
- `src-tauri/src/commands/` — New Tauri command `process_quick_entry_text`
- `src-tauri/src/lib.rs` or `mod.rs` — Register the new module and command

**The Tauri command should:**
1. Accept: raw text, list of area names+IDs, list of project names+IDs
2. Build system prompt: role description, today's date + day of week, available project/area names, formatting rules
3. Call Swift FFI with system prompt + raw text
4. Deserialize the `ParsedTask` response (JSON)
5. Validate date strings are valid `YYYY-MM-DD` (discard invalid ones)
6. Match returned project/area names to actual IDs (case-insensitive exact match; no match = empty)
7. Return a typed result struct with all resolved fields

**System prompt template (built in Rust):**

```
You are a task parser. Extract structured task fields from free-form input.
Today is {date} ({day_of_week}).

Available projects: {comma-separated names}
Available areas: {comma-separated names}

Rules:
- Create a concise, actionable title (not the raw input verbatim)
- Match project/area names exactly from the lists above, or return empty
- Convert any relative dates to YYYY-MM-DD format based on today's date
- Default status to inbox unless clearly stated otherwise
- Put any detail beyond the title into the body field
```

### Phase 3: Frontend Integration

**Files to modify:**
- `src/components/quick-pane/QuickPaneApp.tsx` — Add AI processing state, handler, availability check on pane open
- `src/components/quick-pane/QuickPaneTitle.tsx` — Add the AI button adjacent to the title input (conditionally rendered)
- `src/components/quick-pane/useQuickPaneKeyboard.ts` — Add `Cmd+Shift+A` shortcut

**Behaviour:**
1. On pane open (focus event), also call `commands.checkAppleIntelligenceAvailable()`. Store result in state. If unavailable, skip rendering button and registering shortcut.
2. When triggered (button or `Cmd+Shift+A`): grab current title text, show loading state (e.g. subtle spinner on the button, disable form briefly), call `commands.processQuickEntryText(...)`.
3. On success: populate title, body (with show-body toggled on), status, dates, project, area from the response. The body should contain the original raw text.
4. On error: leave form unchanged, optionally log the error. No toast or disruptive error UI.
5. User reviews populated fields and saves normally with `Cmd+Enter`.

**Loading state:** Keep it minimal — a spinner or pulse animation on the AI button, lasting ~1-5 seconds. Don't disable the entire form (the user might want to cancel with Escape during processing).

### Phase 4: Testing and Polish

- Test with various dictation styles: short commands, long rambling input, ambiguous dates, misspelled project names, non-English input
- Test availability detection: verify feature is invisible on Intel Macs, older macOS, Apple Intelligence disabled
- Test the build on machines without the FoundationModels SDK (stub compilation)
- Test edge cases: empty input, very long input (context window), input that's already a clean title
- Consider whether re-processing should be supported (user processes, edits, processes again)
