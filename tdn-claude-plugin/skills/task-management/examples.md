# Workflow Examples

Real-world scenarios showing how to help users with task management.

---

## Scenario 1: User Dumps a List of Things to Do

**User says:** "I need to do a bunch of things: call the bank about that charge, schedule a dentist appointment, review the Q1 proposal, and buy groceries."

**Approach:**

1. Create each as a task in inbox:

```bash
tdn new "Call bank about charge" --ai
tdn new "Schedule dentist appointment" --ai
tdn new "Review Q1 proposal" --ai
tdn new "Buy groceries" --ai
```

2. Ask if any have deadlines or belong to projects:

> "I've created 4 tasks in your inbox. Do any of these have deadlines? And does the Q1 proposal belong to a specific project?"

3. Based on response, update as needed:

```bash
tdn update "Review Q1 proposal" --set due=friday --set project="Q1 Planning" --ai
tdn set status "Review Q1 proposal" ready --ai
```

---

## Scenario 2: User Wants to Complete Something

**User says:** "I finished calling the bank"

**Approach:**

1. Find and complete the task:

```bash
tdn set status "Call bank" done --ai
```

2. Confirm completion:

> "Done! 'Call bank about charge' is now marked complete."

**If ambiguous:** Multiple tasks might match. Show options:

```bash
tdn list --query "bank" --ai
```

Then ask which one.

---

## Scenario 3: User Asks What to Work On

**User says:** "What should I focus on today?"

**Approach:**

1. Show today's actionable items:

```bash
tdn today --ai
```

2. Summarize the key priorities:

> "You have 3 things demanding attention today:
>
> - **Overdue:** Review Q1 proposal (was due yesterday)
> - **Due today:** Submit expense report
> - **Scheduled:** Call with marketing team at 2pm
>
> The overdue proposal seems most urgent. Want me to show you the details?"

---

## Scenario 4: User Wants a Project Overview

**User says:** "How's the Q1 Planning project going?"

**Approach:**

1. Get project context:

```bash
tdn context project "Q1 Planning" --ai
```

2. Summarize status:

> "Q1 Planning has 8 active tasks:
>
> - 2 in progress (including the auth bug fix)
> - 4 ready to start
> - 1 blocked (waiting for client feedback)
> - 1 in inbox (needs processing)
>
> The blocked task might need attention. Want me to show details on what's blocking it?"

---

## Scenario 5: User Wants to Start a New Project

**User says:** "I want to start a project to redesign our website"

**Approach:**

1. Create the project:

```bash
tdn new project "Website Redesign" --ai
```

2. Ask about context:

> "I've created the Website Redesign project. A few questions:
>
> - Does this belong to a specific area (like Work)?
> - Do you have a target completion date?
> - Any initial tasks you want to capture?"

3. Based on response, update and create tasks:

```bash
tdn update "Website Redesign" project --set area="Work" --set end-date=2025-03-31 --ai
tdn new "Audit current site structure" --project "Website Redesign" --ai
tdn new "Create design mockups" --project "Website Redesign" --ai
```

---

## Scenario 6: User Needs to Defer Something

**User says:** "I can't deal with the website stuff until after the holidays"

**Approach:**

1. Find website-related tasks:

```bash
tdn list --project "Website Redesign" --ai
```

2. Defer them:

```bash
tdn update "task1.md" --set defer-until="2025-01-06" --ai
tdn update "task2.md" --set defer-until="2025-01-06" --ai
```

Or if the whole project should be paused:

```bash
tdn set status "Website Redesign" project paused --ai
```

3. Confirm:

> "Done! Website Redesign is paused and the tasks won't appear in your active lists until January 6th."

---

## Scenario 7: User Wants a Summary of an Area

**User says:** "Give me an overview of everything going on with Work"

**Approach:**

1. Get area context:

```bash
tdn context area "Work" --ai
```

2. Summarize the key points:

> "Your Work area has 4 active projects:
>
> **In Progress:**
>
> - Q1 Planning (8 tasks, 2 overdue)
> - Client Migration (3 tasks, on track)
>
> **Ready to Start:**
>
> - Client Onboarding (4 tasks)
>
> **Paused:**
>
> - Legacy Migration (waiting on budget approval)
>
> You have 2 overdue items in Q1 Planning. Want me to show those?"

---

## Scenario 8: User Wants to Analyze Their Tasks

**User says:** "How many tasks do I have in each status?"

**Approach:**

Use the vault overview:

```bash
tdn context --ai
```

The stats section shows counts. Summarize:

> "Across your vault:
>
> - Inbox: 5 (need processing)
> - Ready: 12
> - In Progress: 4
> - Blocked: 2
> - Icebox: 8
>
> Your inbox has some items waiting to be processed. Want to go through them?"

---

## Scenario 9: User Wants to Find Something

**User says:** "Where's that task about the API documentation?"

**Approach:**

1. Search for it:

```bash
tdn list --query "API documentation" --ai
```

2. If found, show details:

```bash
tdn show "Document API v2 endpoints" --ai
```

3. If in a project, provide context:

> "Found it! 'Document API v2 endpoints' is in the Q1 Planning project. It's currently in-progress. Here are the details..."

---

## Scenario 10: User Wants to Add Notes to a Task

**User says:** "I made progress on the auth bug - found the root cause"

**Approach:**

1. Append the note:

```bash
tdn append-body "Fix authentication bug" "Found root cause: OAuth callback handler not refreshing expired tokens." --ai
```

2. Confirm:

> "Added your note to 'Fix authentication bug'. Want me to show the full task details?"

---

## Scenario 11: User Needs Health Check

**User says:** "Are there any problems with my task files?"

**Approach:**

```bash
tdn doctor --ai
```

Report findings:

> "I found a few issues:
>
> - 2 tasks have invalid status values
> - 1 task references a project that doesn't exist
> - 3 tasks are missing the required 'created-at' field
>
> Want me to help fix these?"

---

## Scenario 12: Bulk Reading for Analysis

**User says:** "Can you summarize all my blocked tasks and why they're blocked?"

**Approach:**

1. First, get the config to find paths:

```bash
tdn config
```

2. List blocked tasks to get paths:

```bash
tdn list --status blocked --ai
```

3. Read each file directly for full body content:

```
Read: /path/to/tasks/waiting-for-client.md
Read: /path/to/tasks/pending-approval.md
```

4. Synthesize a summary:

> "You have 3 blocked tasks:
>
> 1. **Waiting for client feedback** - Blocked since Jan 8, waiting for response to API proposal
> 2. **Pending budget approval** - Finance team reviewing, expected decision by Jan 20
> 3. **Hardware order** - Supplier backordered, new ETA Feb 1
>
> The client feedback one has been waiting longest. Want me to draft a follow-up message?"
