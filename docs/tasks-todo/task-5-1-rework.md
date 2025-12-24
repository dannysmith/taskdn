# Task: Rework of Context Commands

We have implemented context commands for area, project and task. Before implementing `context --ai` we decided to stop and do a much better job of clearly defining a good output.

The outcome of that work is now in `../../tdn-cli/docs/developer/ai-context.md`. This overrides the output specified in `cli-requirements.md`.

## Phase 1: Implement Overview (`context --ai`)

### 4.1 Behavior by Mode

| Mode  | No Args Behavior                                   |
| ----- | -------------------------------------------------- |
| AI    | Returns vault overview (areas, summary, this week) |
| Human | Error: "Please specify an entity or use --ai"      |
| JSON  | Returns vault overview (same as AI mode)           |

The stub in `context.ts` already handles the human mode error.

## Phase 2: Rework `context area --ai`

## Phase 3: Rework `context project --ai`

## Phase 4: Rework `context task --ai`

## Phase 5: Review and Rework other `--ai` commands ouptut as needed

Review and rework the output builders for other --ai outputs to ensure they are returning sensible data structures.

- [ ] show task
- [ ] show project
- [ ] show area
- [ ] list tasks
- [ ] list projects
- [ ] list areas

## Phase 6: Rework `--json` as needed

Review and rework the builders for --json outputs to ensure they are returning sensible data structures:

- [ ] show task
- [ ] show project
- [ ] show area
- [ ] list tasks
- [ ] list projects
- [ ] list areas
- [ ] context task
- [ ] context project
- [ ] context area
- [ ] context
- [ ] Any other commands which return JSON

## Reviews and Documentation

- [ ] Review all work on context commands and all the code. Any obvious refactoring we should do now before moving on?
