# Task 1: Core Types and Enums

Implement the foundational types used across all operations.

## Scope

### Status Enums (as string types in TS)

```rust
// In src/lib.rs - expose as string values
#[napi(string_enum)]
pub enum TaskStatus {
    Inbox,
    Icebox,
    Ready,
    InProgress,
    Blocked,
    Dropped,
    Done,
}

#[napi(string_enum)]
pub enum ProjectStatus { ... }

#[napi(string_enum)]
pub enum AreaStatus { ... }
```

TypeScript output should be string literal unions:
```typescript
export type TaskStatus = 'inbox' | 'icebox' | 'ready' | 'in-progress' | 'blocked' | 'dropped' | 'done';
```

### FileReference (tagged union)

```rust
#[napi(object)]
pub struct FileReference {
    #[napi(js_name = "type")]
    pub ref_type: String,  // "wikilink" | "relativePath" | "filename"
    pub target: Option<String>,   // for wikilink
    pub display: Option<String>,  // for wikilink
    pub path: Option<String>,     // for relativePath
    pub name: Option<String>,     // for filename
}
```

### DateTimeValue

Dates and datetimes are returned as ISO strings. Implement `From<DateTimeValue>` to convert Rust's `DateTimeValue` enum to a string.

## Implementation Notes

- Check how NAPI-RS handles enums - may need `#[napi(string_enum)]` or manual conversion
- FileReference needs both `From<taskdn::FileReference>` and `Into<taskdn::FileReference>` since it's used for input and output
- Reference the Rust SDK types in `taskdn-rust/src/types/`

## Verification

After this task:
```typescript
import { TaskStatus, FileReference } from '@taskdn/sdk';
// Types should be available and correct
```

## Files to modify

- `src/lib.rs` - Add type definitions and From impls
