# Task: Convenience Commands

## Phase 1: Context Enhancements

Before implementing convenience commands, extract date utilities from `list.ts`:

**Create `src/lib/date.ts`:**

```typescript
export function getToday(): string
export function formatDate(date: Date): string
export function getTomorrow(today: string): string
export function getEndOfWeek(today: string): string
export function getStartOfWeek(today: string): string
```

Update `list.ts` to import from `@/lib/date.ts`.

## Phase 2: Today Command

`taskdn today` - Tasks due today + scheduled for today + overdue + defer-until is today.

### Implementation

**Create `src/commands/today.ts`:**
**Register in `src/commands/index.ts`.**

### Output Considerations

Uses existing `TaskListResult` and formatters. Output is same as `list` command.

In human mode, overdue tasks should be highlighted (red/warning color).

### Tests

```typescript
describe('today command', () => {
  test('shows tasks due today', async () => {})
  test('shows tasks scheduled for today', async () => {})
  test('shows overdue tasks', async () => {})
  test('shows tasks which became available today', async () => {})
  test('shows in-progress tasks', async () => {})
  test('sorts by priority (overdue first)', async () => {})
  test('works in all output modes', async () => {})
})
```

---

## Phase 3: Inbox Command

`taskdn inbox` - List of tasks with status: inbox. Should behave exactly as for any other list tasks command.

### Tests

```typescript
describe('inbox command', () => {
  test('shows only inbox status tasks', async () => {})
  test('works in all output modes', async () => {})
  test('empty result when no inbox tasks', async () => {})
})
```

## Fixture Requirements

Existing fixtures in `tests/fixtures/vault/` have been enhanced for relationship testing. Update as necessary to test these.

### Mock Date Testing

For date-dependent tests (today, overdue, this week), use `TASKDN_MOCK_DATE` env var (already supported in list.ts date utilities).

---

## Final Verification Checklist

### Convenience Commands

- [ ] `today` shows due/scheduled today + overdue + in-progress
- [ ] `inbox` shows inbox tasks only

---

## Relevant Specifications

- **cli-requirements.md** - Context Command, Convenience Commands, AI Mode Output
- **S2-interface-design.md** - Output formats, error handling patterns
- **S1-core.md** - Entity relationships, field definitions
