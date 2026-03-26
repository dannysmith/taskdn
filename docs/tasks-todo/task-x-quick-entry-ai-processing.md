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

## Background: Handy Reference Implementation

The Handy codebase (`~/dev/handy`) has a production-grade Apple Intelligence integration. Our Swift bridge is adapted from it.

Key files in Handy for reference: `src-tauri/swift/apple_intelligence.swift`, `src-tauri/swift/apple_intelligence_bridge.h`, `src-tauri/src/apple_intelligence.rs`, `src-tauri/build.rs`.

Critical gotchas discovered via Handy: SIGABRT if accessing `SystemLanguageModel.default` during app init (defer to runtime); async→sync bridge via `DispatchSemaphore`; weak-link FoundationModels for older macOS compatibility; LLMs insert invisible Unicode chars (strip them); `@Generable` can fail (always have plain-text fallback).

## Current Implementation Status

### Completed (Phases 1-3)

**Swift bridge:** `@Generable ParsedTask` struct with `ParsedStatus` enum, `LanguageModelSession` with structured output + plain-text fallback, availability check. Build script with SDK detection, stub compilation, weak linking. All adapted from Handy.

**Rust layer:** Safe FFI wrapper (`apple_intelligence.rs`), Tauri commands (`commands/ai.rs`), centralized prompt templates (`commands/ai_prompts.rs`). System prompt with step-by-step field instructions, few-shot examples, and structured area→project context. Response parsing with date validation, project/area name→ID matching, body deduplication logic.

**Frontend:** Sparkles button in title row (conditionally rendered when AI available + text entered), `Cmd+Shift+A` shortcut (active only when pane open), loading spinner, form field population from AI result. Feature is completely invisible when Apple Intelligence is unavailable.

**Bug fix (pre-existing):** Fixed wikilinks using hash IDs instead of entity titles in all four write paths (create_task, create_project, update_task, update_project).

### Key files

| File | Purpose |
|------|---------|
| `src-tauri/swift/apple_intelligence.swift` | `@Generable` struct, LLM session, FFI functions |
| `src-tauri/swift/apple_intelligence_stub.swift` | Stub for builds without FoundationModels SDK |
| `src-tauri/swift/apple_intelligence_bridge.h` | C header for Swift ↔ Rust FFI |
| `src-tauri/src/apple_intelligence.rs` | Safe Rust wrapper over C FFI |
| `src-tauri/src/commands/ai.rs` | Tauri commands, response parsing, field validation |
| `src-tauri/src/commands/ai_prompts.rs` | All prompt text centralized for iteration |
| `src/components/quick-pane/QuickPaneApp.tsx` | AI processing handler, availability state |
| `src/components/quick-pane/QuickPaneTitle.tsx` | Sparkles button, loading state |
| `src/components/quick-pane/useQuickPaneKeyboard.ts` | `Cmd+Shift+A` shortcut |

## Learnings About Apple Intelligence (~3B Model)

These findings are from hands-on testing and WWDC25 research. They should inform all future prompt work.

### What works well

- **`@Generable` with `@Guide(description:)` for structured output.** The model reliably produces valid JSON matching the struct. `ParsedStatus` enum gives constrained decoding for free.
- **Few-shot examples are the single highest-impact technique.** Adding 2-3 input→output examples dramatically improved field accuracy vs. instructions alone.
- **"Empty string is the safe default" framing works.** Combined with few-shot examples showing empty fields, the model stopped hallucinating dates for simple inputs.
- **Project/area name validation in Rust catches hallucinations.** The model sometimes invents project/area names that don't exist; case-insensitive exact matching in Rust silently drops them.
- **Title generation is reliable.** The model consistently produces clean, concise titles.

### What doesn't work

- **Date arithmetic is unreliable.** "This Friday" from Wednesday March 25 → model returned March 30 (Monday, wrong). "Next Monday" → April 2 (Thursday, wrong). "End of the month" → October 31 (wrong month entirely). Apple explicitly says "avoid asking the model to act as a calculator."
- **Few-shot contamination.** When an input is similar to a few-shot example, the model copies fields from the example. "Submit Q1 tax return by April 15th" copied the body "Gather all receipts first" from the similar example — the input never mentioned receipts.
- **Project name fuzzy matching.** "Japan Trip" in the input didn't match "Japan Trip 2025" in the project list. The model returned empty rather than approximate-matching. Our Rust validation uses exact match only.
- **`@Guide(Regex{...})` breaks `@Generable`.** Regex constraints on date fields caused structured output to fail entirely, falling back to plain text. The `.default` model doesn't support regex-constrained generation well. Removed in favour of description-only guides.
- **`contentTagging` adapter is wrong for this task.** It's optimized for tag generation, not instruction-following. Produced topic tags ("task management, shopping") instead of following our field instructions.
- **Body generation for complex inputs.** The model sometimes fabricates body content not present in the input.

### Key principles for prompt iteration

1. **Positive framing outperforms negative.** "Set only if X is present" beats "Do NOT set unless X."
2. **Short instructions beat long ones.** Every token adds latency. Use `@Guide` for per-field constraints, prompt for high-level guidance.
3. **Chain-of-thought HURTS models under ~10B.** Don't ask the model to reason step-by-step.
4. **Few-shot examples need to be distinct from likely inputs** to avoid contamination.
5. **Structural constraints (enums, `@Guide(.anyOf)`) are stronger than description text** — but `.anyOf` needs compile-time values, limiting use for dynamic lists.

## Next Steps

### Phase 5: Evaluation Harness ✅

Done. 31 test cases in `commands/ai.rs` covering simple inputs, project/area matching, date extraction, status detection, complex dictation, and hallucination traps. Run with:

```
cd tdn-desktop/src-tauri && cargo test eval_ai --lib -- --ignored --nocapture
```

Current baseline: **11/31 passing**. Most failures are date arithmetic and project matching — addressed in Phases 7 and 8.

### Phase 6: Deterministic Status and Auto-Ready Rules

Remove status from Apple Intelligence entirely. Status is better handled by deterministic rules.

**Background:** The LLM is inconsistent with status (sometimes "ready" for "tomorrow", sometimes not). The cases where it adds value (icebox, blocked) are rare and can be detected via keyword matching. Meanwhile, the most common and impactful status decision — inbox vs ready — follows clear rules based on what other fields are populated.

**The status model:**

1. **Default:** All tasks start as `inbox`.
2. **Keyword detection (Rust, post-AI):** Scan the original input text for explicit status language. Only match unambiguous phrases:
   - `icebox` / `ice box` → `icebox`
   - `blocked` / `waiting on` / `can't proceed` / `stuck on` → `blocked`
   - `in progress` / `already started` / `working on` → `in-progress`
   - Narrow keywords only. "Maybe" alone is NOT icebox. "Might" is NOT icebox. Only "icebox"/"ice box" and similar explicit phrases.
3. **Auto-ready Rule 1 (all quick entry, not just AI):** If status is `inbox` AND `(projectId OR areaId) is set` AND `(scheduled OR deferUntil) is set` → change to `ready`. Reasoning: a task with both a project/area and a when-to-do-it date has been "processed" — it doesn't need the inbox.
4. **Auto-ready Rule 2 (AI-processed entries only):** If status is `inbox` (keyword detection didn't set something else) AND `scheduled` date is within 7 days of today → change to `ready`. Catches "call Dave this afternoon" and "pick up laundry tomorrow" style tasks that are clearly actionable now.

**Implementation plan:**

**Step 1: Remove status from the LLM**
- Remove `ParsedStatus` enum and `status` field from `ParsedTask` in `apple_intelligence.swift`
- Remove `parsedTaskToJSON` status handling
- Remove status from the prompt in `ai_prompts.rs` (both field instructions and few-shot examples)
- Remove status from the `ParsedQuickEntry` response (or always return "inbox")
- This simplifies the `@Generable` struct from 8 fields to 7, giving the model more capacity for the remaining fields

**Step 2: Keyword-based status detection in Rust**
- New function in `ai.rs`: `detect_status_from_keywords(input: &str) -> TaskStatus`
- Scans the original input text (not the AI response) for explicit status phrases
- Returns `inbox` if no keywords found
- Called during `process_quick_entry_text`, result included in `ParsedQuickEntry`
- **Write unit tests** for this function — it's deterministic and easily testable without the LLM

**Step 3: Auto-ready Rule 1 in QuickPaneApp.tsx**
- Runs in `handleSubmit` for ALL quick entry saves (not just AI)
- Before creating the task: if status is `inbox` and the auto-ready conditions are met, change to `ready`
- This improves UX for manual quick entry too

**Step 4: Auto-ready Rule 2 in QuickPaneApp.tsx**
- Runs only after AI processing populates fields (in `handleProcessWithAI`)
- After all fields are populated: if status is still `inbox` and scheduled is within 7 days → change to `ready`
- Only triggers when keyword detection didn't already set a different status

**Step 5: Update eval harness**
- Remove status expectations from cases where it was being tested as an LLM output
- Add new unit tests for keyword detection (deterministic, runs in normal test suite)
- Add tests for auto-ready rules
- Re-run eval harness to measure improvement from removing status from the LLM

### Phase 7: Fix Few-Shot Contamination

Remove or redesign the third few-shot example (Q1 tax return) to avoid body contamination (model copies "Gather all receipts first" from the example into real responses). Options:
- Make example inputs much more distinct from likely real inputs
- Use a fictional project/area name that doesn't appear in real data
- Remove body content from all examples (always show `"body":""`)

Quick prompt-only change in `ai_prompts.rs`, testable via the eval harness.

### Phase 8: Deterministic Date and Project/Area Resolution

Split the work into what the LLM is good at (language understanding, intent classification) and what deterministic code is good at (date arithmetic, fuzzy string matching).

**Date resolution:**

Change the `@Generable` struct so date fields capture the *raw reference and intent* rather than computed YYYY-MM-DD dates:

```swift
@Guide(description: "Raw date/time reference for scheduling intent, or empty string")
let scheduledRef: String  // e.g. "tomorrow", "next Monday", "this Friday"

@Guide(description: "Raw date/time reference for deadline intent, or empty string")
let dueRef: String  // e.g. "by April 15th", "by end of next week"
```

The LLM's job becomes: (1) identify whether a date reference exists, (2) classify it as scheduled vs. due vs. defer intent, (3) extract the reference text. Crucially, the LLM still decides whether "this Friday" is a scheduling intent for *this task* vs. just contextual information about something else — that's a language understanding judgment the LLM should make.

Rust then resolves the expression to a date deterministically. Options for date parsing in Rust:
- `chrono` with hand-written pattern matching for common expressions
- A crate like `dateparser` or `chrono-english` (evaluate coverage)
- Simple keyword-based resolution ("tomorrow" → +1 day, "next Monday" → find next Monday, "April 15th" → parse month+day)

Start with a small set of common patterns and fall back to empty if unparseable. The eval harness will show which patterns are most needed.

**Project/area matching:**

Add fuzzy matching in Rust alongside the existing exact match. "Japan Trip" should match "Japan Trip 2025". Options:
- Case-insensitive substring matching (simplest)
- Levenshtein distance with a threshold
- Token overlap (split on spaces, check how many words match)

Start with case-insensitive substring (covers the "Japan Trip" case) and evaluate via the harness.

### Phase 9: Polish and Edge Cases

- Re-processing support (user processes, edits title, processes again)
- Cancellation during processing (Escape while LLM is running)
- Very long input handling (context window limits?)
