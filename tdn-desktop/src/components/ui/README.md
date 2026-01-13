# UI Components

This directory contains the design system primitives for the Taskdn desktop app.

## shadcn/ui Components (37)

These components originated from [shadcn/ui](https://ui.shadcn.com/docs/components) and may have been customized:

- `alert-dialog.tsx`
- `alert.tsx`
- `badge.tsx`
- `breadcrumb.tsx`
- `button-group.tsx`
- `button.tsx`
- `calendar.tsx`
- `card.tsx`
- `checkbox.tsx`
- `collapsible.tsx`
- `command.tsx`
- `date-picker.tsx`
- `dialog.tsx`
- `dropdown-menu.tsx`
- `field.tsx`
- `input-group.tsx`
- `input.tsx`
- `item.tsx`
- `kbd.tsx`
- `label.tsx`
- `native-select.tsx`
- `popover.tsx`
- `radio-group.tsx`
- `resizable.tsx`
- `scroll-area.tsx`
- `select.tsx`
- `separator.tsx`
- `sheet.tsx`
- `sidebar.tsx`
- `skeleton.tsx`
- `sonner.tsx`
- `spinner.tsx`
- `switch.tsx`
- `textarea.tsx`
- `toggle-group.tsx`
- `toggle.tsx`
- `tooltip.tsx`

## Custom Components (10)

These components were written specifically for this app:

- `collapsible-notes.tsx` - Expandable notes section with preview teaser
- `date-button.tsx` - Compact date display with calendar popover (scheduled/due/defer variants)
- `empty-state.tsx` - Simple centered placeholder (alternative to Empty)
- `lazy-markdown-editor.tsx` - Code-split wrapper with error boundary
- `markdown-editor.tsx` - Unified editor with preview/source toggle
- `markdown-source-textarea.tsx` - Raw markdown textarea
- `progress-circle.tsx` - SVG circular progress indicator
- `searchable-select.tsx` - Combobox using Command + Popover
- `tag-input.tsx` - Multi-select tags with keyboard handling
- `view-toggle.tsx` - Icon toggle group for list/kanban/calendar modes

## Notes

- All components use kebab-case filenames
- shadcn components can be customized - the goal is not to keep them pristine
- When updating from shadcn, check https://ui.shadcn.com/docs/components for the latest component list
- Many shadcn components export multiple sub-components (e.g., `sidebar.tsx` exports 22 components)
