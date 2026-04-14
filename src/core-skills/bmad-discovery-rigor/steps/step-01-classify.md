# Step 1: Classify

Decide what kind of work this is, how much discovery rigor it needs, and whether the task is convergence work. Accurate classification sets the route, the domain fragments, and the handoff expectations for everything that follows.

## Recovery

Run recovery per workflow.md §RECOVERY PROTOCOL.

## Classify and Confirm

Load `../resources/classification-guide.csv` and classify the request across these dimensions:

| Dimension | Options | How to decide |
|-----------|---------|---------------|
| Activity | Solve / Build / Execute | CSV `indicators` column |
| Tier (Solve only) | Quick / Structured / Full-Formal | CSV `indicators` column |
| Convergence | Yes / No | Unifying parallel systems, defining contracts, or standardizing boundaries usually means Yes |

Present the result in a compact confirmation block:

```markdown
**Classification:**
- Activity: **[type]**
- Tier: **[tier]** _(Solve only)_
- Convergence: **[Y/N]**
- Reasoning: [2-3 sentences]
```

If Convergence = Yes, note that downstream handoff should seed contract candidates.

If Convergence = Yes, note that downstream handoff should strongly consider `bmad-create-workflow-contract` even when the activity remains Solve.

**🛑 HALT — Use `vscode_askQuestions` to confirm whether this classification matches the problem. In autonomous mode, self-serve from workspace evidence and log the decision.**

| Response | Action |
|----------|--------|
| Agrees | Proceed |
| Disagrees | Reclassify with the user's feedback |
| Uncertain | Clarify the reasoning, then confirm again |

## Prepare State

Identify applicable domain fragments from `../resources/discovery-resources-index.csv` per workflow.md §DOMAIN FRAGMENT LOADING and record them in State Ledger `Decisions:`.

### Generate Session Tag

Generate `{sessionTag}` per workflow.md §SESSION TAGGING:

1. Take the current date as `{YYYY-MM-DD}`.
2. Derive a `{topic-slug}` from the classified problem statement — kebab-case, ≤ 5 words, capturing the essence of the task (e.g., `auth-token-rotation`, `deploy-pipeline-refactor`).
3. Set `{sessionTag}` = `{YYYY-MM-DD}-{topic-slug}`.
4. Resolve `{outputFile}` = `{output_folder}/discovery-context-{sessionTag}.md`.

Create `{outputFile}`:

```yaml
---
sessionTag: '{sessionTag}'
stepsCompleted: [1]
activity: '[activity]'
tier: '[tier]'
convergence: [true/false]
discoveryCounter: 0
lastStep: 'step-01-classify'
---
```

Append:

```markdown
## Classification

- **Activity:** [activity]
- **Tier:** [tier]
- **Convergence:** [Y/N]
- **Reasoning:** [reasoning]
- **Confirmed:** [date]
```

Initialize and output the State Ledger using workflow.md §STATE LEDGER. Set `Depth:` to empty (top level). Record any files or workspace surfaces consulted so far in `Evidence:` and leave `Skill:` blank until handoff.

## Memory Checkpoint

Per workflow.md §MEMORY CHECKPOINT.

## Next

| Classification | Route to |
|---|---|
| Solve / Quick | `./step-01b-quick-handoff.md` |
| All others | `./step-02-interview.md` |
