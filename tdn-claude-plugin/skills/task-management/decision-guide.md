# Decision Guide

When to use which approach for task management operations.

---

## CLI vs Direct File Access

### Use the CLI When...

| Scenario            | Command                | Why CLI                                             |
| ------------------- | ---------------------- | --------------------------------------------------- |
| Creating any entity | `tdn new --ai`         | Proper timestamps, filename generation, validation  |
| Changing status     | `tdn set status --ai`  | Auto-manages `completed-at`, `updated-at`           |
| Updating fields     | `tdn update --ai`      | Preserves unknown frontmatter, validates references |
| Getting overview    | `tdn context --ai`     | Hierarchical output, relationships computed         |
| Listing/filtering   | `tdn list --ai`        | Built-in filters, proper sorting                    |
| Appending notes     | `tdn append-body --ai` | Proper formatting, date stamps                      |
| Archiving           | `tdn archive --ai`     | Handles path, collisions                            |
| Health check        | `tdn doctor --ai`      | Comprehensive validation                            |

**General rule:** Any operation that **writes** or **mutates** should go through the CLI.

### Use Direct File Access When...

| Scenario                     | Approach        | Why Direct               |
| ---------------------------- | --------------- | ------------------------ |
| Reading full task body       | `Read` the file | Faster, complete content |
| Summarizing multiple tasks   | `Glob` + `Read` | More efficient for bulk  |
| Searching body content       | `Grep`          | Full-text search         |
| Analyzing patterns           | `Glob` + `Read` | Custom analysis logic    |
| Understanding file structure | `Read` the file | See raw frontmatter      |

**General rule:** Any operation that only **reads** multiple files is often faster directly.

---

## Which Command for What?

### "I need to know what's going on"

| Question                                 | Command                           |
| ---------------------------------------- | --------------------------------- |
| What's the overall state of my tasks?    | `tdn context --ai`                |
| What should I work on today?             | `tdn today --ai`                  |
| What's in my inbox?                      | `tdn list --status inbox --ai`    |
| What's overdue?                          | `tdn list --overdue --ai`         |
| What's the status of a specific project? | `tdn context project "Name" --ai` |

### "I need to create something"

| What                  | Command                                            |
| --------------------- | -------------------------------------------------- |
| New task              | `tdn new "Title" --ai`                             |
| New task with details | `tdn new "Title" --due friday --project "Q1" --ai` |
| New project           | `tdn new project "Title" --ai`                     |
| New area              | `tdn new area "Title" --ai`                        |

### "I need to update something"

| What            | Command                                      |
| --------------- | -------------------------------------------- |
| Mark done       | `tdn set status "Task" done --ai`            |
| Start working   | `tdn set status "Task" in-progress --ai`     |
| Change due date | `tdn update "Task" --set due=tomorrow --ai`  |
| Move to project | `tdn update "Task" --set project="Q2" --ai`  |
| Add notes       | `tdn append-body "Task" "Note content" --ai` |

### "I need to find something"

| What                  | Command                               |
| --------------------- | ------------------------------------- |
| Tasks in a project    | `tdn list --project "Name" --ai`      |
| Tasks in an area      | `tdn list --area "Name" --ai`         |
| Tasks matching text   | `tdn list --query "search term" --ai` |
| Specific task details | `tdn show "Task title" --ai`          |

---

## When to Ask Clarifying Questions

Ask the user before acting when:

1. **Creating tasks from vague input**

   - User: "I need to do something about the report"
   - Ask: "What specifically needs to happen with the report?"

2. **Multiple possible matches**

   - User: "Complete the planning task"
   - If multiple "planning" tasks exist, ask which one

3. **Ambiguous status transitions**

   - User: "I'm not going to do that"
   - Ask: Should this be `dropped` (abandoned) or `icebox` (maybe later)?

4. **Missing key information**

   - User: "Create a task for the meeting"
   - Ask: "What's the meeting about? When is it?"

5. **Destructive operations**
   - Before archiving or dropping multiple items

---

## Common Patterns

### Pattern: Daily Review

```bash
# What needs attention today?
tdn today --ai

# What's overdue?
tdn list --overdue --ai

# What's in inbox (needs processing)?
tdn list --status inbox --ai
```

### Pattern: Project Deep Dive

```bash
# Get full project context
tdn context project "Q1 Planning" --ai

# List all tasks in the project
tdn list --project "Q1 Planning" --ai
```

### Pattern: Capture and Organize

When user dumps multiple items:

1. Create each as inbox task:

   ```bash
   tdn new "Item 1" --ai
   tdn new "Item 2" --ai
   ```

2. Then help organize:
   - Assign projects/areas
   - Set due dates
   - Update status to `ready`

### Pattern: Bulk Status Update

For multiple completions:

```bash
tdn set status task1.md task2.md task3.md done --ai
```

### Pattern: Understanding the Vault

When first working with a user's tasks:

```bash
# Get the big picture
tdn context --ai

# Find paths for direct access
tdn config
```

---

## Output Mode Selection

### Use `--ai` (Default)

For all normal operations. Gives structured markdown optimized for understanding.

### Use `--json`

When you need to:

- Parse specific fields programmatically
- Pass data to another process
- Extract structured metadata

### Use `--ai --json`

When you need:

- Human-readable content (markdown)
- Plus structured metadata (JSON envelope)
- Plus file path references as JSON array

---

## Error Recovery

### NOT_FOUND

Task/project/area doesn't exist.

```bash
# Find similar items
tdn list --query "partial name" --ai
```

### AMBIGUOUS

Multiple items match the query.

```bash
# Use exact file path instead
tdn show ./tasks/specific-task.md --ai
```

### INVALID_STATUS

Wrong status value. Check [specification.md](specification.md) for valid values.

### PARSE_ERROR

Malformed frontmatter. Read the file directly to diagnose:

```bash
# Get the file path
tdn config

# Then read the file
# (use Read tool with the path)
```

### REFERENCE_ERROR

Project or area reference points to non-existent entity.

```bash
# Check what exists
tdn list projects --ai
tdn list areas --ai

# Update with correct reference
tdn update "Task" --set project="Correct Name" --ai
```
