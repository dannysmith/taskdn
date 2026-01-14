# Task: Integrate @dannysmith/datepicker

**Status:** Implemented

## Overview

Replace the current `react-day-picker` calendar-based date selection with `@dannysmith/datepicker`, which provides natural language input ("tomorrow", "next friday", "in 3 weeks") alongside scrollable date selection.

## Current State

### Components Using Date Selection

1. **`DateButton`** (`src/components/ui/date-button.tsx`)
   - Primary date picker for task metadata in TaskDetailPanel
   - Three visual variants: `scheduled` (gray), `due` (red), `defer` (blue)
   - Used at `TaskDetailPanel.tsx:338-364` for all three date fields
   - Shows icon + formatted date as button, opens Popover with Calendar

2. **`DatePickerButton`** (`src/components/cards/TaskCard.tsx:355-456`)
   - Inline date picker within task cards
   - Shows icon + date, opens Popover with Calendar
   - Two instances per card: scheduled and due dates

3. **`DatePicker`** (`src/components/ui/date-picker.tsx`)
   - Generic date picker component (less frequently used)
   - Simple Popover + Calendar pattern

4. **`Calendar`** (`src/components/ui/calendar.tsx`)
   - Wrapper around `react-day-picker` (v9.13.0)
   - Provides styled day grid navigation
   - Will become obsolete after migration

### Current Dependencies

- `react-day-picker` (^9.13.0) - Current calendar UI
- `date-fns` (^4.1.0) - Date formatting (still needed)

## New Package: @dannysmith/datepicker

### Key Features

- **Natural language input**: "tomorrow", "next friday", "in 3 weeks", "3 months"
- **Fuzzy matching**: Handles typos and partial input ("tomorow" → tomorrow)
- **Virtualized scrolling**: Smooth infinite scroll through dates
- **Keyboard navigation**: Arrow keys, Page Up/Down, Home, Enter, Escape
- **Date constraints**: `minDate` and `maxDate` props
- **CSS theming**: OKLCH-based variables (compatible with our theme)

### Component API

```tsx
import { DatePicker } from '@dannysmith/datepicker'
import '@dannysmith/datepicker/styles.css'
;<DatePicker
  value={date} // Date object
  onChange={setDate} // (date: Date) => void
  placeholder="When" // Input placeholder
  minDate={new Date()} // Optional constraint
  maxDate={someDate} // Optional constraint
/>
```

### Rendering Behavior

The component renders as an **input field with a scrollable date list below**. This differs from our current pattern (button → popover → calendar grid). We'll need to wrap it in a Popover for our compact button-trigger UI.

### CSS Variables

```css
--dp-bg           /* Container background */
--dp-elevated     /* Input/hover backgrounds */
--dp-text         /* Primary text */
--dp-primary      /* Selection highlight */
--dp-accent       /* Today indicator */
--dp-ring         /* Focus outline */
```

## Implementation Plan

### Phase 1: Setup & Theme Integration

#### 1.1 Install Package

```bash
bun add @dannysmith/datepicker
```

#### 1.2 Theme Variable Mapping

Create datepicker theme overrides in `src/theme-variables.css`:

```css
/* Light mode datepicker theming */
:root {
  --dp-bg: var(--popover);
  --dp-elevated: var(--muted);
  --dp-text: var(--foreground);
  --dp-primary: var(--primary);
  --dp-accent: var(--accent);
  --dp-ring: var(--ring);
}

.dark {
  --dp-bg: var(--popover);
  --dp-elevated: var(--muted);
  --dp-text: var(--foreground);
  --dp-primary: var(--primary);
  --dp-accent: var(--accent);
  --dp-ring: var(--ring);
}
```

#### 1.3 Import Styles

Add to `src/App.css`:

```css
@import '@dannysmith/datepicker/styles.css';
```

### Phase 2: Create Wrapper Component

#### 2.1 Create PopoverDatePicker

New component: `src/components/ui/popover-date-picker.tsx`

This wraps the datepicker in our existing Popover pattern:

```tsx
interface PopoverDatePickerProps {
  /** Current date value (ISO string yyyy-MM-dd) */
  value: string | undefined
  /** Callback when date changes */
  onChange: (date: string | undefined) => void
  /** Trigger element (button/icon) */
  trigger: React.ReactNode
  /** Optional min date constraint */
  minDate?: Date
  /** Optional max date constraint */
  maxDate?: Date
  /** Popover alignment */
  align?: 'start' | 'center' | 'end'
  /** Controlled open state */
  open?: boolean
  /** Open state change callback */
  onOpenChange?: (open: boolean) => void
}
```

Key implementation details:

- Convert between ISO strings and Date objects
- Close popover on date selection
- Include "Clear date" button when value is set
- Handle keyboard navigation (Escape to close)
- Match existing popover styling

### Phase 3: Migrate DateButton

#### 3.1 Update DateButton Component

Replace Calendar usage with PopoverDatePicker in `src/components/ui/date-button.tsx`:

Changes:

- Remove `Calendar` import
- Import `PopoverDatePicker`
- Keep existing variant styles (scheduled/due/defer)
- Keep icon + date display pattern
- Maintain container query responsive sizing

The visual trigger button remains unchanged; only the popover content changes.

### Phase 4: Migrate TaskCard DatePickerButton

#### 4.1 Update DatePickerButton

Refactor inline `DatePickerButton` in `src/components/cards/TaskCard.tsx:355-456`:

- Extract to shared component or reuse PopoverDatePicker
- Convert Date objects to ISO strings (task model uses strings)
- Maintain click propagation handling (`e.stopPropagation()`)
- Keep overdue highlighting logic

### Phase 5: Update Generic DatePicker

#### 5.1 Refactor DatePicker Component

Update `src/components/ui/date-picker.tsx`:

Options:

1. Replace entirely with PopoverDatePicker re-export
2. Keep as standalone component using new datepicker
3. Mark as deprecated if no longer needed

Review actual usage to determine best approach.

### Phase 6: Cleanup

#### 6.1 Remove Obsolete Code

- Consider removing `src/components/ui/calendar.tsx` if no longer used elsewhere
- Remove `react-day-picker` dependency if fully replaced

#### 6.2 Update Component Reference

Update `src/components/views/ComponentReference.tsx:701-719` to demo new datepicker with all three variants.

#### 6.3 Update README

Update `src/components/ui/README.md` to reflect component changes.

## Files to Modify

| File                                          | Action                               |
| --------------------------------------------- | ------------------------------------ |
| `package.json`                                | Add @dannysmith/datepicker           |
| `src/theme-variables.css`                     | Add datepicker CSS variable mappings |
| `src/App.css`                                 | Import datepicker styles             |
| `src/components/ui/popover-date-picker.tsx`   | **Create** - Wrapper component       |
| `src/components/ui/date-button.tsx`           | Replace Calendar with new datepicker |
| `src/components/cards/TaskCard.tsx`           | Update DatePickerButton              |
| `src/components/ui/date-picker.tsx`           | Update or deprecate                  |
| `src/components/ui/calendar.tsx`              | Remove (if unused)                   |
| `src/components/views/ComponentReference.tsx` | Update demo                          |
| `src/components/ui/README.md`                 | Update component list                |

## Testing Checklist

- [ ] Natural language input works ("tomorrow", "next week", "in 3 months")
- [ ] Fuzzy matching handles typos
- [ ] Keyboard navigation works (arrows, Enter, Escape)
- [ ] Date selection closes popover
- [ ] Clear date button works
- [ ] All three variants display correctly (scheduled/due/defer)
- [ ] TaskDetailPanel dates update correctly
- [ ] TaskCard inline dates work
- [ ] Theme switches correctly (light/dark mode)
- [ ] RTL layout works if applicable
- [ ] Container query responsive sizing preserved
- [ ] No console errors or warnings

## Considerations

### Date Format Conversion

The app uses ISO strings (`yyyy-MM-dd`) internally, but the datepicker uses Date objects. The wrapper must convert between formats:

```tsx
// String to Date (for datepicker)
const dateValue = value ? new Date(value) : undefined

// Date to String (for app state)
onChange(format(date, 'yyyy-MM-dd'))
```

### Popover vs Standalone

The datepicker renders its own input field + scrolling list. For the compact button-trigger UI used in TaskDetailPanel and TaskCard, we wrap it in a Popover so the trigger can be a small icon+date button.

### Focus Management

Ensure focus moves into the datepicker input when popover opens, and returns to trigger on close.

### minDate/maxDate Constraints

Consider whether any date fields need constraints:

- Due date: No past dates? (debatable)
- Defer until: No past dates (makes sense)
- Scheduled: Usually no constraints

### i18n

Natural language parsing likely works best in English. Consider whether this affects non-English users. The datepicker may need locale configuration if available.
