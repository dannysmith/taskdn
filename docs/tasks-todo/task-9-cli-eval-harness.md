# Task 9: CLI eval harness and baseline

**Product:** `tdn-cli/`. **Related:** #27. **Background:** `docs/tasks-todo/temporary/taskdn-review.md` ("Measure before and after").

CLI 2.0 should be measurably better for agents than 1.x, not just different. Build a harness that gives an agent real questions and tasks against a test vault and scores how it does, then record a baseline for the current CLI before the redesign starts. Task 10's guessability study uses the same harness, and task 12 reruns it against 2.0.

## Approach

- **Headless Claude Code runs.** `claude -p` with only Bash allowed and only `tdn` commands permitted, other shell commands denied, and `--output-format stream-json` to capture every call. `--bare` keeps Danny's CLAUDE.md and plugins out of the runs but needs an API key, not his login. Claude Code's `claude plugin eval` is the wrong tool here: it can't restrict Bash per case or point `tdn` at a vault. It's the right tool for the skill evals in task 14.
- **Ground truth computed by script** over the rendered vault, not judged by a model, wherever possible. Read questions ("what's overdue?", "which tasks are in Acme?") compare answers to what a script computes. Write tasks ("move X to Y", "process the inbox") compare the vault's files afterwards.
- **Fresh vault per case.** Render a test vault into a temp dir and point `tdn` at it with `TASKDN_TASKS_DIR`, `TASKDN_PROJECTS_DIR` and `TASKDN_AREAS_DIR`, as the repo already does for agents.
- **What to measure:** correctness, tool calls per case, errors hit, and tokens. Issue #27's question was whether `--ai` output conveys what an agent needs; correctness and call counts answer that directly.

## Phases

### Phase 1: Harness

- [ ] Decide where it lives (likely `tdn-cli/evals/`) and how it's run (`bun run eval`).
- [ ] A runner: render the vault, run one headless session per case, save the stream-json transcript, score it, and write a results file.
- [ ] Settle the model (or models) and how many runs per case, so results are stable enough to compare. Note the cost of a full run.
- [ ] Make sure no run can reach `~/notes`: the env vars point at the temp vault, and the run itself is sandboxed or denied everything but `tdn`.

### Phase 2: Cases

- [ ] Read cases across the `demo` vault and a persona vault or two (`generate-persona-vault`), with answers computed by script.
- [ ] Write cases, checked by diffing files.
- [ ] Cases that hit known 1.x problems: finding a task by title, `today` on a busy day, a reference to a project that doesn't exist.
- [ ] Variants from #27 where they're cheap: no priming, a one-line hint ("use `tdn`"), and the current skill loaded.

### Phase 3: Baseline

- [ ] Run against CLI 1.0.2 and commit the results with the CLI version, model and date.
- [ ] Summarise what the baseline shows: where agents fail, where they waste calls. This is input for task 10.

## Done when

`bun run eval` (or whatever it's called) runs the suite against any `tdn` binary, and a committed baseline exists for 1.0.2.
