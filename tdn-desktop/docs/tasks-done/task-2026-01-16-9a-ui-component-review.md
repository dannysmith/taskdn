# Task: Reviews

## UI Component Review

Let's carefully review all the custom UI components we have in `ui/`. Are they fully reusable in all sorts of contexts? Where appropriate, will they work in popovers and when embedded. Do they support keyboard navigation correctly internally where appropriate? Do they expose sensible props with consistent prop naming and consistent return values? Are they resilient to being used in a variety of containers (ie where appropriate do they fill their containers width etc? And for some components obviously they may not want to do this, but we may also want to provide a boolean prop which allows this to happen (eg shrink-to-content or fill-container)). Where appropriate do we provide sensible ways of handling errors which occur inside these. Do we follow standard React best practices when it comes to the external API and the way that these work internally for reusable UI components. And only where appropriate are we following similar ish patterns to the shadcn components that make up the rest of our core UI primitives.

---

## Review Findings (2026-01-16)

### Component Inventory

The `src/components/ui/` directory contains **47 components**:

- **19 Standard shadcn/ui** (minimal customization): alert, checkbox, collapsible, command, tooltip, etc.
- **16 Modified shadcn/ui** (significant customization): button, dropdown-menu, field, select, sidebar
- **12 Fully Custom** (built for this app): tag-input, date-button, markdown-editor, progress-circle, etc.

The custom components were the primary focus of this review.

---

### Issues Worth Fixing

#### 1. TagInput: Silent Validation Failures

**File:** `tag-input.tsx:41-55`

**Problem:** When a user tries to add a duplicate tag or exceeds `maxTags`, the component silently clears the input with no feedback. The user has no idea why their tag wasn't added.

```typescript
// Current behavior - silent failure
if (!allowDuplicates && tags.some(tag => tag.text === trimmedValue)) {
  setInputValue('') // Just clears, user is confused
  return
}
```

**Why this matters:**

- Poor user experience - users don't understand why input was rejected
- Accessibility concern - violates WCAG 4.3.3 (Error Identification)
- No `aria-invalid` support for form integration

**Recommendation:** Add optional validation feedback. Keep it simple - don't over-engineer.

---

### Issues Considered But Not Worth Fixing

After careful consideration, the following were identified as potential issues but are **not recommended for changes**:

#### SearchableSelect "Missing Error Affordances"

**Initial concern:** Component doesn't support `aria-invalid` or error states.

**Why it's fine:** This is what the `Field` component family is for. Form-level validation errors should be displayed via `FieldError`, not baked into every select component. Adding error states to SearchableSelect would duplicate responsibility and couple it unnecessarily to form validation patterns.

#### PopoverContent Fixed Width (w-72)

**Initial concern:** Hardcoded width might cause issues in narrow containers.

**Why it's fine:** The `className` prop is properly merged with `cn()`, so consumers can override this. DateButton already uses `w-auto`, SearchableSelect uses `w-[200px]`. The default is sensible and overridable - this is working as designed.

#### MarkdownEditor Keyboard Shortcut

**Initial concern:** No keyboard shortcut to toggle between preview/source modes.

**Why it's fine:** The toggle buttons are accessible via Tab and activate with Enter/Space (native button behavior). Adding a custom shortcut (Cmd+Shift+M?) would:

- Risk conflicting with system or app shortcuts
- Add complexity for a rarely-used feature
- The current UI is already keyboard accessible

#### TagInput Remove Button Keyboard Handling

**Initial concern:** Remove buttons use `onClick` only.

**Why it's fine:** Native `<button>` elements handle Enter/Space activation automatically. The browser already does this correctly. Adding explicit `onKeyDown` handlers would be redundant.

#### Badge Text Truncation

**Initial concern:** Long tag text in badges could overflow.

**Why it's fine:** Badge already has `overflow-hidden`. Adding `truncate` would hide text that users need to see. Tags should show their full content. If specific use cases need truncation, they can add it via `className`.

#### Prop Naming (onTagsChange vs onChange)

**Initial concern:** Inconsistent with other components using `onChange`.

**Why it's fine:** Changing would break existing code. The current `onTagsChange` naming is actually more descriptive and follows the pattern of `on[Entity]Change`. The benefit of consistency doesn't justify the churn.

#### Size Variant Standardization

**Initial concern:** Button has 8 size variants, Toggle has 3, Select has 2.

**Why it's fine:** This is premature standardization. Each component's sizes evolved for its specific use cases. A major refactor to standardize would touch many files for marginal benefit. Address this if it becomes a real problem.

---

### Patterns Working Well

These patterns are well-implemented and should be continued:

1. **Container Queries** (`date-button.tsx:122`)

   ```typescript
   '@[280px]:h-7 @[280px]:gap-1 @[280px]:px-2 @[280px]:text-xs'
   ```

   DateButton adapts to container width without viewport media queries. Excellent pattern.

2. **Controlled/Uncontrolled Dual State** (`date-button.tsx:86-97`)

   ```typescript
   const isControlled = controlledOpen !== undefined
   const open = isControlled ? controlledOpen : internalOpen
   ```

   Clean pattern used consistently across date and select components.

3. **Field Component Family** (`field.tsx`)
   Ten composable sub-components with proper `role="alert"` on FieldError and responsive orientation via container queries.

4. **data-slot Convention**
   All components use `data-slot="component-name"` for CSS targeting and debugging.

5. **Error Boundary in Lazy Components** (`lazy-markdown-editor.tsx`)
   Proper async loading with class-based error boundary and user-friendly fallback.

6. **forwardRef Usage** (`tag-input.tsx`)
   Properly forwards refs - good pattern for other custom components.

7. **className Merging**
   All components accept and merge `className` prop with `cn()`.

8. **Portal Usage**
   All overlays (Popover, Dialog, Sheet, Dropdown) use Portal to escape scroll containers.

---

## Implementation Plan

### Task: Add Validation Feedback to TagInput

**Priority:** Medium
**Effort:** Small
**Risk:** Low

#### Approach

Add an optional `onValidationError` callback that fires when validation fails, allowing parent components to show feedback. Keep the component simple - don't add built-in error UI.

#### Changes

1. **Add new prop to interface** (`tag-input.tsx`)

   ```typescript
   export interface TagInputProps extends Omit<...> {
     // ... existing props
     /** Called when validation fails (duplicate, max tags reached) */
     onValidationError?: (error: 'duplicate' | 'max-tags') => void
   }
   ```

2. **Call the callback on validation failure**

   ```typescript
   if (!allowDuplicates && tags.some(tag => tag.text === trimmedValue)) {
     setInputValue('')
     onValidationError?.('duplicate')
     return
   }

   if (maxTags && tags.length >= maxTags) {
     setInputValue('')
     onValidationError?.('max-tags')
     return
   }
   ```

3. **Usage in parent component**

   ```tsx
   const [error, setError] = useState<string | null>(null)

   <Field>
     <FieldLabel>Tags</FieldLabel>
     <TagInput
       tags={tags}
       onTagsChange={setTags}
       maxTags={5}
       onValidationError={(type) => {
         if (type === 'duplicate') setError('Tag already exists')
         if (type === 'max-tags') setError('Maximum 5 tags allowed')
         setTimeout(() => setError(null), 3000)
       }}
     />
     {error && <FieldError>{error}</FieldError>}
   </Field>
   ```

#### Why This Approach

- **Minimal change** - Single callback prop, no internal UI changes
- **Composable** - Parent decides how to show feedback (toast, inline error, etc.)
- **Non-breaking** - Existing usages continue to work unchanged
- **Follows existing patterns** - Similar to how other controlled components work

#### Testing

- Verify callback fires on duplicate tag attempt
- Verify callback fires when maxTags exceeded
- Verify existing functionality unchanged when callback not provided

---

## Summary

The custom UI components are **well-architected overall**. Most initial concerns turned out to be either working as designed or not worth the implementation cost.

**One genuine issue to fix:** TagInput silent validation failures.

**Everything else:** Either working correctly, already overridable, or would be over-engineering to "fix."
