# Task: Migrate shadcn/ui from Radix to BaseUI

Working Dir: `tdn-desktop/`

## Overview

Migrate tdn-desktop from shadcn/ui (Radix-based) to the new official shadcn (BaseUI-based). This involves updating dependencies, configuration, CSS imports, and replacing all UI components.

## Background

- shadcn has released an official version using BaseUI instead of Radix
- Reference app created at `~/Desktop/vite-app` with correct BaseUI setup
- All existing UI components except `tag-input.tsx` are unmodified shadcn components
- `tag-input.tsx` is a custom component that should be preserved

## Implementation Steps

### Phase 1: Preparation

1. **Back up custom component**

   ```bash
   cp tdn-desktop/src/components/ui/tag-input.tsx tdn-desktop/src/components/ui/tag-input.tsx.bak
   ```

2. **Create git branch for migration**
   ```bash
   git checkout -b chore/shadcn-baseui-migration
   ```

### Phase 2: Update Configuration

1. **Update `tdn-desktop/components.json`**

   ```json
   {
     "$schema": "https://ui.shadcn.com/schema.json",
     "style": "base-nova",
     "rsc": false,
     "tsx": true,
     "tailwind": {
       "config": "",
       "css": "src/App.css",
       "baseColor": "neutral",
       "cssVariables": true,
       "prefix": ""
     },
     "iconLibrary": "lucide",
     "aliases": {
       "components": "@/components",
       "utils": "@/lib/utils",
       "ui": "@/components/ui",
       "lib": "@/lib",
       "hooks": "@/hooks"
     },
     "menuColor": "default",
     "menuAccent": "subtle",
     "registries": {}
   }
   ```

2. **Update `tdn-desktop/package.json` dependencies**

   Remove:

   ```
   @radix-ui/react-alert-dialog
   @radix-ui/react-checkbox
   @radix-ui/react-dialog
   @radix-ui/react-dropdown-menu
   @radix-ui/react-label
   @radix-ui/react-popover
   @radix-ui/react-radio-group
   @radix-ui/react-scroll-area
   @radix-ui/react-select
   @radix-ui/react-separator
   @radix-ui/react-slot
   @radix-ui/react-switch
   @radix-ui/react-toggle
   @radix-ui/react-toggle-group
   @radix-ui/react-tooltip
   ```

   Add:

   ```
   @base-ui/react: ^1.0.0
   shadcn: ^3.6.2
   ```

3. **Update `tdn-desktop/src/App.css`**

   Add the shadcn import after tailwindcss:

   ```css
   @import 'tailwindcss';
   @import 'tw-animate-css';
   @import 'shadcn/tailwind.css';
   @import './theme-variables.css';
   ```

### Phase 3: Replace Components

1. **Delete existing UI components** (except tag-input.tsx.bak)

   ```bash
   cd tdn-desktop/src/components/ui
   rm -f alert-dialog.tsx alert.tsx badge.tsx breadcrumb.tsx button-group.tsx button.tsx calendar.tsx card.tsx checkbox.tsx command.tsx date-picker.tsx dialog.tsx dropdown-menu.tsx empty.tsx field.tsx input-group.tsx input.tsx item.tsx kbd.tsx label.tsx native-select.tsx popover.tsx radio-group.tsx resizable.tsx scroll-area.tsx select.tsx separator.tsx sheet.tsx sidebar.tsx skeleton.tsx sonner.tsx spinner.tsx switch.tsx textarea.tsx toggle-group.tsx toggle.tsx tooltip.tsx
   ```

2. **Install dependencies**

   ```bash
   cd tdn-desktop
   bun install
   ```

3. **Add shadcn components**

   Original components to reinstall:

   ```bash
   bunx --bun shadcn@latest add alert-dialog alert badge breadcrumb button calendar card checkbox command dialog dropdown-menu input label popover radio-group scroll-area select separator sheet sidebar skeleton sonner switch textarea toggle toggle-group tooltip
   ```

   Additional recommended components:

   ```bash
   bunx --bun shadcn@latest add accordion avatar collapsible context-menu form input-otp menubar navigation-menu progress slider tabs
   ```

   Note: Some components may not exist in BaseUI version yet. Check availability and skip if not present:

   - `resizable` (uses react-resizable-panels, may need manual handling)
   - `field`, `input-group`, `button-group`, `item`, `kbd`, `native-select`, `empty`, `date-picker`, `spinner` - these may be custom or from different sources

4. **Restore custom component**
   ```bash
   mv tdn-desktop/src/components/ui/tag-input.tsx.bak tdn-desktop/src/components/ui/tag-input.tsx
   ```

### Phase 4: Handle Custom/Missing Components

These components need manual attention:

| Component           | Action                                                  |
| ------------------- | ------------------------------------------------------- |
| `tag-input.tsx`     | Restore from backup - uses Badge, verify it still works |
| `resizable.tsx`     | May need to recreate - uses `react-resizable-panels`    |
| `field.tsx`         | Check if available in new shadcn, recreate if needed    |
| `input-group.tsx`   | Check if available, recreate if needed                  |
| `button-group.tsx`  | Check if available, recreate if needed                  |
| `item.tsx`          | Check if available in new shadcn                        |
| `kbd.tsx`           | Simple component, recreate if not available             |
| `native-select.tsx` | Simple component, recreate if not available             |
| `empty.tsx`         | Custom empty state component, recreate                  |
| `date-picker.tsx`   | Composite component using Calendar + Popover            |
| `spinner.tsx`       | Simple loading spinner, recreate                        |

### Phase 5: Fix Breaking Changes

1. **Check for `asChild` usage in consuming components**

   The following files use `asChild` and may need updates:

   - `src/components/preferences/PreferencesDialog.tsx` (lines 80, 105)
   - `src/components/ui/date-picker.tsx` (line 29)

   The new BaseUI components handle this internally, but verify the consumer code still works.

2. **Check animation class changes**

   Old: `data-[state=open]`, `data-[state=closed]`
   New: `data-open`, `data-closed`

   This is handled within component files, but check any custom styling.

### Phase 6: Verification

1. **Run type checking**

   ```bash
   bun run typecheck
   ```

2. **Run linting**

   ```bash
   bun run lint
   ```

3. **Run tests**

   ```bash
   bun run test
   ```

4. **Manual testing**

   - Start dev server and test all UI interactions
   - Test preferences dialog (uses many components)
   - Test command palette
   - Test all dropdowns and selects
   - Test dialogs and modals

5. **Run full check**
   ```bash
   bun run check:all
   ```

### Phase 7: Cleanup

1. Remove backup file if everything works
2. Update any documentation referencing Radix
3. Commit changes

## Files Changed

- `tdn-desktop/components.json`
- `tdn-desktop/package.json`
- `tdn-desktop/src/App.css`
- `tdn-desktop/src/components/ui/*` (all files)
- Potentially: consuming components if API changes

## Risks

- Some shadcn components may not be available yet in BaseUI version
- API changes in components could break consuming code
- Custom components may need updates to work with new Badge/Button etc.

## Rollback Plan

If migration fails:

```bash
git checkout main -- tdn-desktop/
bun install
```

## Reference

- New shadcn setup: `~/Desktop/vite-app/`
- BaseUI docs: https://base-ui.com/
- shadcn docs: https://ui.shadcn.com/
