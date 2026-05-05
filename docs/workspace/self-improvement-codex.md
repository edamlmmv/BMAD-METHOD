---
title: "Manual bmad-self-improve Operator Runbook"
description: Operator-invoked BMAD self-improvement workflow for Codex
---

# Manual `bmad-self-improve` Operator Runbook

`bmad-self-improve` is an operator-invoked BMAD skill, not Codex automation.
Missing automation is expected.

Use this runbook when improving BMAD agents, skills, prompts, Workspace
templates, or Codex integration. Codex executes an operator-started prompt
sequence, but no background process, scheduler, watcher, hidden executor, live
adapter, or auto-promotion loop exists.

`bmad-loop` remains observe/coordination only; no execution authority.

## Required Launch Inputs

Every run must define:

- `repo_path`: repository to improve.
- `branch`: expected branch for the run.
- `scope`: narrow improvement boundary.
- `target_skill_or_files`: skill, docs, code, or templates allowed.
- `stop_condition`: finite endpoint such as checkpoint written, max files, max
  attempts, operator review, or a specific test result.

Stop before implementation if an input is missing or the stop condition is not
finite.

## Allowed and Rejected Modes

Recommended mode: manual operator-run.

Allowed alternate: foreground, operator-started, one-shot unassisted run with
fixed repo, branch, scope, target files, and stop condition. It ends at
checkpoint and must not recur.

Rejected modes:

- Cron or recurring automation.
- Watcher or daemon.
- Hidden executor.
- Live adapter.
- Auto-promotion loop.
- Self-expanding scope.

## What It Does

The workflow runs:

1. Party Mode decision.
2. Plan.
3. Party Mode critique.
4. Revised plan.
5. TDD implementation.
6. Validation.
7. BMAD compile/install.
8. Codex refresh evidence.
9. Final checkpoint.

Party Mode may choose the target and revise the plan inside repo rules, tests,
and evidence gates. It cannot skip validation, overwrite unrelated work, or
bypass checkpoints.

## Launch Prompt

Manual run:

```text
Run bmad-self-improve on /Users/edam/Documents/TODA/BMAD-METHOD.

Mode: manual operator-run
Branch: <expected branch>
Scope: <narrow improvement boundary>
Target skill or files: <specific skill/docs/code area>
Stop condition: <finite endpoint>

Goal: <specific BMAD improvement>
Question: <specific question to answer>

Constraints:
- no scheduler, watcher, daemon, hidden executor, live adapter, or auto-promotion loop
- bmad-loop remains observe/coordination only; no execution authority
- run Party Mode decision before plan
- run Party Mode critique before implementation
- use TDD for scoped code/docs/skill changes
- write checkpoint under _bmad-output/self-improvement/
```

One-shot unassisted variant: use the same prompt, but set:

```text
Mode: one-shot unassisted foreground run
```

The one-shot variant is foreground, operator-started, fixed-scope, and ends at
checkpoint. It is not a recurring automation.

## Operator Prompts

Use [Self-Improvement Codex Prompt](./templates/self-improvement-codex-prompt.md)
to start a run.

Use
[Self-Improvement Resume Prompt](./templates/self-improvement-codex-resume-prompt.md)
when context runs low or a fresh Codex chat continues the run.

Use
[Self-Improvement Checkpoint Template](./templates/self-improvement-checkpoint.template.md)
for durable run state under `{output_folder}/self-improvement/`.

## Stop Conditions

Stop and report before continuing when:

- Required input is missing.
- Stop condition is missing or not finite.
- Current branch does not match the declared branch.
- Unrelated dirty files would need edits.
- Scope escape is detected.
- Party Mode conflicts with repo rules, tests, or safety.
- Change becomes destructive, broad, or outside intent.
- Test or quality failure appears and the next fix is unclear.
- compile/install evidence is missing when required.
- Refresh status cannot be recorded.

## Checkpoint Evidence

Write checkpoints under:

```text
_bmad-output/self-improvement/<YYYYMMDD-HHMM>-<slug>.md
```

Each checkpoint records objective, question, mode and inputs, Party Mode
decision, plan status, critique result, changed files, tests run with pass/fail
output, compile/install evidence, refresh evidence, unresolved risks, and the
next operator decision.

## Compile and Install

Use the existing installer. A fresh project-local Codex install is:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes
```

An existing project-local Codex update is:

```bash
node tools/installer/bmad-cli.js install --directory <target-project> --modules bmm --tools codex --yes --action update
```

The installer auto-adds `core`. Expected artifacts are:

- `_bmad/_config/manifest.yaml`
- `_bmad/_config/skill-manifest.csv`
- `.agents/skills/bmad-self-improve/SKILL.md`

Current user install can be refreshed with:

```bash
node tools/installer/bmad-cli.js install --directory /Users/edam --modules bmm --tools codex --yes --action update
```

The `~/.codex/skills` global install remains out of scope for v1 because
`global_target_dir` is configured for Codex but is not wired through the BMAD
installer CLI.

## Refresh Verification

The [Codex App Server skills contract](https://developers.openai.com/codex/app-server#skills)
states that `skills/list` supports `forceReload: true`, and that
`skills/changed` notifications are emitted when watched local skill files
change.

If app-server access exists, request `skills/list` for the current cwd with
`forceReload: true` and verify `bmad-self-improve` appears.

If app-server access is unavailable, record:

- installed skill path
- manifest row
- source and installed SHA-256 hashes
- one of `refresh: requires new chat`, `refresh: requires Codex restart`, or
  `refresh: unknown`

Do not claim hot reload unless the run verifies it.

## Quality Gate

Run targeted tests first. Before push, run this on the exact `HEAD` being
pushed:

```bash
npm ci && npm run quality
```
