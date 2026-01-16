# Deep Linking

The `taskdn://` URL scheme enables external tools to open entities and create tasks.

For the full URL reference, see the [URL Scheme Reference](https://taskdn.is/reference/desktop-reference/url-scheme).

## Architecture

```
URL received by OS
        ↓
tauri-plugin-deep-link (Rust)
        ↓
onOpenUrl event (JS)
        ↓
useDeepLink hook (App.tsx)
        ↓
parseDeepLinkUrl() → DeepLinkCommand
        ↓
Handler (open-path | open-view | new)
        ↓
Navigate + focus window
```

## Key Files

| File                         | Purpose                           |
| ---------------------------- | --------------------------------- |
| `src/lib/deep-link.ts`       | URL parsing, validation, types    |
| `src/lib/deep-link.test.ts`  | Unit tests                        |
| `src/hooks/use-deep-link.ts` | Event listener + command handlers |

## Implementation Notes

### URL Parsing Trick

Custom scheme URLs don't have a host, so we normalize them to use the standard URL parser:

```typescript
const normalizedUrl = url.replace('taskdn://', 'https://taskdn/')
const parsed = new URL(normalizedUrl)
const command = parsed.pathname.slice(1) // "open" or "new"
```

### Data Access

Handlers access vault data via the query cache directly (not React context), since the hook runs outside component render:

```typescript
const tasks = queryClient.getQueryData<Task[]>(vaultQueryKeys.tasks()) ?? []
```

### File Watcher Conflicts

The `new` command uses `markMutationStart()` / `markMutationComplete()` to prevent the file watcher from triggering during task creation.

## Adding a New Command

1. Add type to `DeepLinkCommand` union in `deep-link.ts`
2. Add parser function (return `{ type: 'invalid' }` for bad input)
3. Add case to `parseDeepLinkUrl()` switch
4. Add handler in `use-deep-link.ts` (return `true` to bring window to front)
5. Add case to `processDeepLink()` switch
6. Add tests in `deep-link.test.ts`
7. Update user docs at `website/.../url-scheme.mdx`

## Adding a New View

Add to `VALID_VIEWS` set in `deep-link.ts`. Handle in `handleOpenView()` if it needs special navigation logic.

## Adding Parameters to `new`

1. Add to `CreateTaskFromUrlOptions` interface
2. Parse in `parseNewCommand()` with validation
3. Handle in `handleNew()` when building `CreateTaskOptions`

For status validation, use `validTaskStatusSet` from `@/config/status`.

## Testing

Unit tests cover URL parsing. Manual testing requires a **bundled app** (deep links don't work in dev mode on macOS):

```bash
bun run tauri build --debug --bundles app
```

Paste URLs directly in browser address bar - the `open "taskdn://..."` terminal command is unreliable.

## Design Decisions

- **Silent failure** - Invalid URLs do nothing (no error dialogs, app stays in background)
- **Path-based, not ID-based** - Entity IDs are path hashes, not stable across file moves
- **Title matching for project/area** - Case-insensitive, first match wins
- **ISO dates only** - No relative date parsing in URLs
