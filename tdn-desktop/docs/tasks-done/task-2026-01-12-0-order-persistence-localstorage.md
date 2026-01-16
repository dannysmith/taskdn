# Task: Order Persistence (Quick localStorage)

Add Zustand persist middleware to save display order and headings to localStorage. Quick win that provides working persistence immediately.

## Scope

Add `persist` middleware to `display-order-store.ts`. That's it.

## Implementation

```typescript
// src/store/display-order-store.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export const useDisplayOrderStore = create<DisplayOrderState>()(
  devtools(
    persist(
      set => ({
        // ... existing state and actions unchanged
      }),
      {
        name: 'display-order-storage',
        // Only persist the data fields, not actions
        partialize: state => ({
          sidebarAreaOrder: state.sidebarAreaOrder,
          sidebarProjectOrder: state.sidebarProjectOrder,
          inboxOrder: state.inboxOrder,
          projectTaskOrder: state.projectTaskOrder,
          areaTaskOrder: state.areaTaskOrder,
          todaySectionOrder: state.todaySectionOrder,
          todayHeadings: state.todayHeadings,
          kanbanColumnOrder: state.kanbanColumnOrder,
        }),
      }
    ),
    { name: 'display-order-store' }
  )
)
```

## Why This Works

1. **Stale data handled** - Existing hooks already filter deleted IDs and append new ones
2. **Low stakes** - If localStorage corrupts, order resets to natural order (not catastrophic)
3. **Automatic** - Saves on every change, loads on app start

## Limitations

- Uses browser localStorage (not app data directory)
- No atomic writes (minor corruption risk)
- Global storage (not per-vault)
- Less inspectable than JSON file

These limitations are fine for now. See `task-x-order-persistance.md` for the proper Rust-based implementation when needed.

## Test

1. Reorder something in sidebar
2. Close and reopen app
3. Verify order preserved
