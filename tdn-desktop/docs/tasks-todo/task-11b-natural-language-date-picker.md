# Natural Language Date Picker

## Overview

Replace the current calendar-only date picker with a keyboard-friendly component that supports natural language input like "tomorrow", "next friday", "in 4 days", etc.

## Requirements

This should probably be a distinct component from our DateButton. ie it should be a component that is rendered as the pop-up or inside the pop-up which the date button uses. That way we can reuse it whether it's firing from a button or embedded somewhere else. I think it's important that this is a general use component. You know, you imagine one that we could use in any other system by just copying and pasting the component code over.

Here's how it should work *in the context of a popup*. Just because that's where we're gonna use it here.

## Current Implementation

### Components to modify

| Component | Location | Usage |
|-----------|----------|-------|
| `DateButton` | `src/components/ui/date-button.tsx` | Task detail panel (scheduled, due, defer) |
| `DatePickerButton` | `src/components/cards/task-card.tsx` | Inline on task cards |

### Existing patterns

- `DateButton` has 3 visual variants (scheduled/due/defer) with different color schemes
- Supports controlled open state (for `pendingFocusField` flow in task-detail-panel)
- Uses container queries for responsive sizing
- All date pickers use the `Calendar` component (react-day-picker wrapper)

### Related component

`SearchableSelect` (`src/components/ui/searchable-select.tsx`) provides a good reference pattern: Popover + Command + Input for searchable selection.

---

## Research Notes

### Recommended parsing library: chrono-node

| Attribute | Details |
|-----------|---------|
| Package | `chrono-node` |
| Version | 2.9.0 (Sep 2025) |
| GitHub | 5.1k stars, actively maintained |
| TypeScript | Yes (written in TS) |
| Bundle size | ~45KB gzipped (full locale support) |

**Supported formats:**

```
Relative:    "tomorrow", "yesterday", "next friday", "in 4 days", "2 weeks from now"
Natural:     "jan 15", "January 15th", "Sep 12-13"
Standard:    "1/15/26", "2026-01-15"
With time:   "tomorrow at 3pm", "next friday 13:00-16:00"
```

**API:**

```typescript
import * as chrono from 'chrono-node'

chrono.parseDate('tomorrow')           // Date
chrono.parseDate('next friday')        // Date
chrono.parseDate('in 4 days')          // Date
chrono.parseDate('jan 15')             // Date (current/next year)
chrono.parseDate('invalid')            // null

// Strict mode (formal formats only)
chrono.strict.parseDate('Jan 15, 2026') // Works
chrono.strict.parseDate('tmrw')          // null
```

**Languages:** Full support for en, ja, fr, nl, ru, uk. Partial: de, es, pt, zh.hant.

### Files to create/modify

| File | Change |
|------|--------|
| `src/lib/date-parser.ts` | New: chrono wrapper + suggestion generation |
| `src/components/ui/date-button.tsx` | Enhance with text input |
| `package.json` | Add `chrono-node` |

### Considerations

- Preserve existing variant system (scheduled/due/defer colors)
- Maintain controlled open state for focus management
- Keep container query responsive behavior
