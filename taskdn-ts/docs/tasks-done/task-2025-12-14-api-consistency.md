# Task 2: API Consistency Setup

Set up snapshot testing early to catch API drift as we implement.

## Why Early?

By setting up the snapshot test after task 1 (core types), we establish a baseline. As we add methods in tasks 3-5, each change to `index.d.ts` will require explicit snapshot updates - forcing us to review API changes as they happen rather than at the end.

## Implementation

### Create test file

```typescript
// tests/api-snapshot.test.ts
import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import path from 'path';

describe('API Consistency', () => {
    test('generated types match snapshot', () => {
        const typesPath = path.join(__dirname, '..', 'index.d.ts');
        const generatedTypes = readFileSync(typesPath, 'utf8');

        expect(generatedTypes).toMatchSnapshot();
    });
});
```

### Create initial snapshot

```bash
# Build to generate index.d.ts
bun run build:debug

# Run test to create initial snapshot
bun test --update-snapshots
```

This creates `tests/__snapshots__/api-snapshot.test.ts.snap` with the baseline.

## Workflow for Subsequent Tasks

When implementing tasks 3-5:

1. Add NAPI bindings in `src/lib.rs`
2. Build: `bun run build:debug`
3. Run tests: `bun test`
4. Test fails (snapshot changed)
5. Review the diff - is it expected?
6. If yes: `bun test --update-snapshots`
7. Commit updated snapshot with the implementation

## Documentation

Add to CLAUDE.md:

```markdown
## API Consistency

The generated `index.d.ts` is snapshot-tested to catch unintended API changes.

If you change the NAPI bindings:
1. Run `bun test` - it will fail if types changed
2. Review the diff in the test output
3. If intentional: `bun test --update-snapshots`
4. Commit the updated snapshot
```

## Files to create

- `tests/api-snapshot.test.ts`
- Update `CLAUDE.md`
