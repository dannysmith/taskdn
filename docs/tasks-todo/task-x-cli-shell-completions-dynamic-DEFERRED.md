# Task: CLI Shell Completions - Dynamic Completions & Polish

**Work Directory:** `tdn-cli/`

**Depends on:** `task-x-cli-shell-completions-foundation.md`

**GitHub Issue:** [#6](https://github.com/dannysmith/taskdn/issues/6)

**Status:** Deferred to backlog (Icebox 🧊)

## Overview

Enhance shell completions with dynamic vault-based suggestions and polish the completion system. This adds:

- **Phase 2:** Dynamic completions that suggest task/project/area names from the vault
- **Phase 4:** Polish and cross-platform support

After this task, users will get intelligent tab completions that:

- Suggest task names when running `tdn set <TAB>`
- Suggest project names when using `--project <TAB>`
- Suggest area names when using `--area <TAB>`
- Work efficiently even with large vaults (100+ tasks)

**Key challenge:** Performance. Completions need to respond in <100ms, which means we need to efficiently load and query the vault on every tab press.

## Phases

### Phase 1: Performance Baseline Testing

Before implementing dynamic completions, establish performance baseline.

**1.1: Create test vaults of different sizes**

Generate test vaults:

- Small: 10 tasks, 5 projects, 3 areas
- Medium: 50 tasks, 20 projects, 10 areas
- Large: 200 tasks, 50 projects, 20 areas

Use a script to generate these:

```bash
# Create script: scripts/generate-test-vault.sh
bun run scripts/generate-test-vault.sh small
bun run scripts/generate-test-vault.sh medium
bun run scripts/generate-test-vault.sh large
```

**1.2: Benchmark vault loading**

Test how long it takes to load and index each vault size:

```typescript
// Add to tests/benchmarks/vault-loading.test.ts
import { createVaultSession } from '@bindings'

test('vault loading performance', () => {
  const sizes = ['small', 'medium', 'large']

  for (const size of sizes) {
    const start = performance.now()
    const session = createVaultSession({
      tasksDir: `./test-vaults/${size}/tasks`,
      projectsDir: `./test-vaults/${size}/projects`,
      areasDir: `./test-vaults/${size}/areas`,
    })
    const tasks = session.listTasks()
    const end = performance.now()

    console.log(`${size} vault: ${end - start}ms (${tasks.length} tasks)`)

    // Assert reasonable performance
    if (size === 'small') expect(end - start).toBeLessThan(50)
    if (size === 'medium') expect(end - start).toBeLessThan(150)
    if (size === 'large') expect(end - start).toBeLessThan(300)
  }
})
```

Run and document the results. This tells us if we need caching.

**1.3: Decide on caching strategy**

Based on benchmark results:

- **If < 100ms for large vaults:** No caching needed, load vault on each completion
- **If 100-300ms:** Implement simple in-memory cache with 5-second TTL
- **If > 300ms:** Need file-based cache or lazy loading strategy

Document the decision in this task file.

### Phase 2: Dynamic Completions Implementation

Add vault-based completions for task/project/area names.

**2.1: Create completion provider utilities**

Create `src/lib/completion-providers.ts`:

```typescript
import { getVaultConfig } from '@/config'
import { createVaultSession } from '@bindings'

export interface CompletionItem {
  value: string
  description?: string
}

let cachedSession: any = null
let cacheTimestamp = 0
const CACHE_TTL = 5000 // 5 seconds

function getVaultSession() {
  const now = Date.now()

  // Use cached session if fresh
  if (cachedSession && now - cacheTimestamp < CACHE_TTL) {
    return cachedSession
  }

  // Load fresh session
  try {
    const config = getVaultConfig()
    cachedSession = createVaultSession(config)
    cacheTimestamp = now
    return cachedSession
  } catch (error) {
    // Vault not configured or error - return null
    return null
  }
}

export function completeTaskNames(prefix?: string): CompletionItem[] {
  const session = getVaultSession()
  if (!session) return []

  try {
    const tasks = session.listTasks()

    return tasks
      .filter(
        (task) =>
          !prefix || task.name.toLowerCase().includes(prefix.toLowerCase())
      )
      .slice(0, 50) // Limit to 50 suggestions
      .map((task) => ({
        value: task.name,
        description: `[${task.status}] ${task.metadata.title || task.name}`,
      }))
  } catch {
    return []
  }
}

export function completeProjectNames(prefix?: string): CompletionItem[] {
  const session = getVaultSession()
  if (!session) return []

  try {
    const projects = session.listProjects()

    return projects
      .filter(
        (p) => !prefix || p.name.toLowerCase().includes(prefix.toLowerCase())
      )
      .slice(0, 50)
      .map((project) => ({
        value: project.name,
        description: `[${project.status}] ${
          project.metadata.title || project.name
        }`,
      }))
  } catch {
    return []
  }
}

export function completeAreaNames(prefix?: string): CompletionItem[] {
  const session = getVaultSession()
  if (!session) return []

  try {
    const areas = session.listAreas()

    return areas
      .filter(
        (a) => !prefix || a.name.toLowerCase().includes(prefix.toLowerCase())
      )
      .slice(0, 50)
      .map((area) => ({
        value: area.name,
        description: area.metadata.title || area.name,
      }))
  } catch {
    return []
  }
}
```

**2.2: Add dynamic completions to commands**

Update `src/index.ts` after tab initialization:

```typescript
import {
  completeTaskNames,
  completeProjectNames,
  completeAreaNames,
} from '@/lib/completion-providers'

// ... after const completion = tab(program)

// 'set' command - complete task names
const setCommand = completion.commands.get('set')
if (setCommand) {
  const taskArg = setCommand.arguments.get(0)
  if (taskArg) {
    taskArg.handler = (complete, context) => {
      const items = completeTaskNames(context.partial)
      items.forEach((item) => complete(item.value, item.description))
    }
  }
}

// 'show' command - complete entity names
const showCommand = completion.commands.get('show')
if (showCommand) {
  const entityArg = showCommand.arguments.get(0)
  if (entityArg) {
    entityArg.handler = (complete, context) => {
      // Complete all entity types
      const tasks = completeTaskNames(context.partial)
      const projects = completeProjectNames(context.partial)
      const areas = completeAreaNames(context.partial)

      tasks.forEach((item) =>
        complete(item.value, `[task] ${item.description}`)
      )
      projects.forEach((item) =>
        complete(item.value, `[project] ${item.description}`)
      )
      areas.forEach((item) =>
        complete(item.value, `[area] ${item.description}`)
      )
    }
  }
}

// 'update' command - complete entity names
const updateCommand = completion.commands.get('update')
if (updateCommand) {
  const entityArg = updateCommand.arguments.get(0)
  if (entityArg) {
    entityArg.handler = (complete, context) => {
      // Same as show command
      const tasks = completeTaskNames(context.partial)
      const projects = completeProjectNames(context.partial)
      const areas = completeAreaNames(context.partial)

      tasks.forEach((item) =>
        complete(item.value, `[task] ${item.description}`)
      )
      projects.forEach((item) =>
        complete(item.value, `[project] ${item.description}`)
      )
      areas.forEach((item) =>
        complete(item.value, `[area] ${item.description}`)
      )
    }
  }
}

// 'open' command - complete entity names
const openCommand = completion.commands.get('open')
if (openCommand) {
  const entityArg = openCommand.arguments.get(0)
  if (entityArg) {
    entityArg.handler = (complete, context) => {
      // Same as show command
      const tasks = completeTaskNames(context.partial)
      const projects = completeProjectNames(context.partial)
      const areas = completeAreaNames(context.partial)

      tasks.forEach((item) =>
        complete(item.value, `[task] ${item.description}`)
      )
      projects.forEach((item) =>
        complete(item.value, `[project] ${item.description}`)
      )
      areas.forEach((item) =>
        complete(item.value, `[area] ${item.description}`)
      )
    }
  }
}

// 'archive' command - complete task names (done tasks only)
const archiveCommand = completion.commands.get('archive')
if (archiveCommand) {
  const taskArg = archiveCommand.arguments.get(0)
  if (taskArg) {
    taskArg.handler = (complete, context) => {
      const session = getVaultSession()
      if (!session) return

      const tasks = session.listTasks().filter((t) => t.status === 'done')
      tasks
        .filter(
          (t) =>
            !context.partial ||
            t.name.toLowerCase().includes(context.partial.toLowerCase())
        )
        .slice(0, 50)
        .forEach((task) => {
          complete(task.name, `[done] ${task.metadata.title || task.name}`)
        })
    }
  }
}

// Option completions for --project
const commands = ['list', 'new', 'set']
for (const cmdName of commands) {
  const cmd = completion.commands.get(cmdName)
  if (cmd) {
    const projectOption = cmd.options.get('project')
    if (projectOption) {
      projectOption.handler = (complete, context) => {
        const items = completeProjectNames(context.partial)
        items.forEach((item) => complete(item.value, item.description))
      }
    }
  }
}

// Option completions for --area
const areaCommands = ['list', 'new']
for (const cmdName of areaCommands) {
  const cmd = completion.commands.get(cmdName)
  if (cmd) {
    const areaOption = cmd.options.get('area')
    if (areaOption) {
      areaOption.handler = (complete, context) => {
        const items = completeAreaNames(context.partial)
        items.forEach((item) => complete(item.value, item.description))
      }
    }
  }
}
```

**2.3: Test dynamic completions**

Manual testing:

```bash
# Configure a vault first
tdn init

# Test task name completion
tdn show <TAB>                # Should show all tasks/projects/areas
tdn set <TAB>                 # Should show all tasks
tdn set my-<TAB>              # Should filter tasks starting with "my-"

# Test option completion
tdn list --project <TAB>      # Should show all projects
tdn list --area <TAB>         # Should show all areas

# Test performance (should feel instant)
tdn set <TAB>                 # Time the response
tdn set <TAB>                 # Second press should use cache (faster)
```

**2.4: Performance monitoring**

Add optional debug logging:

```typescript
// In completion-providers.ts
const DEBUG = process.env.TDN_COMPLETION_DEBUG === '1'

function getVaultSession() {
  const start = DEBUG ? performance.now() : 0

  // ... existing code

  if (DEBUG) {
    const end = performance.now()
    console.error(
      `[completion] vault load: ${end - start}ms (cached: ${
        cachedSession !== null
      })`
    )
  }

  return cachedSession
}
```

Test with:

```bash
TDN_COMPLETION_DEBUG=1 tdn set <TAB>
```

### Phase 3: Error Handling & Edge Cases

Ensure completions fail gracefully.

**3.1: Handle missing config**

If vault is not configured:

- Don't show error messages during completion
- Fall back to empty completions
- Static completions still work

**3.2: Handle corrupted vault files**

If parsing fails:

- Catch errors silently
- Return empty completions
- Don't crash the completion process

**3.3: Handle large vaults**

If vault has 500+ tasks:

- Limit completions to first 50 matches
- Consider fuzzy matching instead of substring matching
- Document performance expectations

### Phase 4: Polish & Cross-Platform Support

**4.1: Windows PowerShell support**

Test on Windows (if available):

- PowerShell completion script generation
- Profile path detection
- Installation/uninstallation

**4.2: Improve completion descriptions**

Make descriptions more helpful:

```typescript
// Instead of: "[todo] Task title"
// Use: "todo · Task title · in project-name"

completeTaskNames() {
  return tasks.map(task => ({
    value: task.name,
    description: `${task.status} · ${task.metadata.title || task.name}${
      task.metadata.project ? ` · in ${task.metadata.project}` : ''
    }`
  }));
}
```

**4.3: Add completion for date options**

For commands with date options (--start-date, --end-date):

```typescript
const dateOption = cmd.options.get('start-date')
if (dateOption) {
  dateOption.handler = (complete) => {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    complete('today', "Today's date")
    complete(today, 'Today (YYYY-MM-DD)')
    complete(tomorrow, 'Tomorrow (YYYY-MM-DD)')
  }
}
```

**4.4: Documentation polish**

Update README.md with:

- Performance characteristics (vault loading time)
- Troubleshooting section (completions not working)
- How to disable caching (if needed)
- How to debug completions

### Phase 5: Unit Tests

**5.1: Test completion providers**

Create `tests/lib/completion-providers.test.ts`:

```typescript
test('completeTaskNames returns filtered tasks', () => {
  // Mock vault session
  const items = completeTaskNames('setup')

  expect(items.length).toBeGreaterThan(0)
  expect(items.every((item) => item.value.includes('setup'))).toBe(true)
})

test('completeTaskNames limits results to 50', () => {
  const items = completeTaskNames()
  expect(items.length).toBeLessThanOrEqual(50)
})

test('completion providers handle vault errors gracefully', () => {
  // Mock vault error
  expect(() => completeTaskNames()).not.toThrow()
})
```

**5.2: Test caching**

```typescript
test('vault session is cached', () => {
  const session1 = getVaultSession()
  const session2 = getVaultSession()

  expect(session1).toBe(session2) // Same instance
})

test('cache expires after TTL', async () => {
  const session1 = getVaultSession()

  // Wait for cache to expire
  await new Promise((resolve) => setTimeout(resolve, 6000))

  const session2 = getVaultSession()

  expect(session1).not.toBe(session2) // Different instance
})
```

## Verification

- [ ] Performance benchmarks completed for small/medium/large vaults
- [ ] Caching strategy decided and documented
- [ ] `src/lib/completion-providers.ts` created
- [ ] Dynamic completions added for task/project/area names
- [ ] Completions work for `show`, `set`, `update`, `open`, `archive` commands
- [ ] Option completions work for `--project` and `--area`
- [ ] Performance is acceptable (<100ms for tab press)
- [ ] Error handling for missing config and corrupted vaults
- [ ] Date option completions added
- [ ] Completion descriptions improved with context
- [ ] Windows PowerShell support tested (if available)
- [ ] README.md updated with performance docs
- [ ] Unit tests added for completion providers
- [ ] Manual testing passes on large vaults
- [ ] `bun run check` passes

## Performance Targets

Based on Phase 1 benchmarks, document achieved performance:

- Small vault (10 tasks): \_\_\_ ms
- Medium vault (50 tasks): \_\_\_ ms
- Large vault (200 tasks): \_\_\_ ms

Target: < 100ms for most common vault sizes

## Notes

**Caching trade-offs:**

- **Pros:** Fast completions, low latency
- **Cons:** Completions may be stale if vault changes frequently
- **Mitigation:** 5-second TTL balances freshness and performance

**Scope limits:**

- Fuzzy matching (e.g., "stp" matching "setup-task") is out of scope
- Filtering by status within completions is out of scope
- Context-aware completions (e.g., only show incomplete tasks for `set`) could be added later

**Future enhancements:**

- Smart sorting (recently used tasks first)
- Project-aware completions (show tasks in current project)
- Fuzzy matching with fzf-like scoring
- Completion caching to file system for instant cold starts
