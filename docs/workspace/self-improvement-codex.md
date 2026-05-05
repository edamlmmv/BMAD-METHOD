---
title: "bmad-self-improve Codex Automation Runbook"
description: Local Codex automation-capable BMAD self-improvement workflow
---

# `bmad-self-improve` Codex Automation Runbook

`bmad-self-improve` runs BMAD improvement work from Codex. It supports local Codex automation loops and foreground operator runs through the same policy, tests, install, refresh, and checkpoint gates.

The source policy is [Self-Improvement Automation Policy](./self-improvement-automation-policy.md). Read it before running or editing this workflow.

Vercel Workflow WDK is a future optional hosted adapter, not part of Phase 1 or Phase 2. The starter contract stays local to Codex and this Node CLI/skills repo.

## Required Launch Inputs

Every run defines:

- `repo_path`: repository to improve.
- `base_ref`: optional; default is current `HEAD`.
- `scope` or goal: optional; Party Mode may choose any BMAD repo target.
- `stop_condition`: finite endpoint such as checkpoint written, max iterations, max fix attempts, or operator review.
- `automation_schedule_config`: effective automation schedule/config or explicit operator-provided cadence parameters; never infer cadence from name or prompt text.
- `max_iterations`: default `1`; starter automation may set `3`.
- `daily_cap`: starter automation may set `3`.
- `max_fix_attempts`: fixed at `5`.

Stop before implementation if required inputs, policy baseline, or finite stop condition cannot be recorded.

## Allowed Modes

Recommended mode:

```text
Mode: local Codex automation loop
```

Allowed foreground mode:

```text
Mode: foreground operator run
```

Future optional mode:

```text
Mode: hosted orchestrator adapter
```

The hosted adapter mode is documentation-only for now. It must wrap the same policy, invariant checker, install, refresh, and checkpoint contract.

## What It Does

The workflow runs:

1. Repo instruction and CLI verification.
2. Baseline policy capture and loop lock acquisition.
3. Fresh non-main branch creation.
4. Dirty worktree preservation commit when needed.
5. Party Mode target decision.
6. Plan.
7. Party Mode critique.
8. Revised plan.
9. TDD implementation.
10. Targeted validation and fix attempts.
11. `npm ci && npm run quality`.
12. BMAD compile/install.
13. Codex refresh evidence.
14. Local Conventional Commit.
15. Final checkpoint.
16. Continuation decision.

## Launch Prompt

```text
Run bmad-self-improve on /Users/edam/Documents/TODA/BMAD-METHOD.

Mode: local Codex automation loop
Base ref: current HEAD
Scope: any BMAD repo target selected by Party Mode
Stop condition: checkpoint written or max caps reached
Automation schedule/config: read effective automation metadata or operator-provided params; do not infer cadence from name or prompt text
max_iterations: 3
daily_cap: 3
max_fix_attempts: 5

Required policy:
- Read docs/workspace/self-improvement-automation-policy.md.
- Capture SELF_IMPROVE_BASE_REF before edits.
- Use a fresh codex/self-improve-* branch.
- Never run implementation work on main.
- Never push.
- Use local Conventional Commits only.
- Preserve dirty worktree in a separate commit before improvement edits.
- Run Party Mode before plan and before implementation.
- Use TDD for scoped code/docs/skill changes.
- Run npm ci && npm run quality before code commit, install, refresh, or continuation.
- Run npm run validate:self-improve-invariants for policy or self-edit changes.
- Install repo-local/test target first, then /Users/edam/.agents when applicable.
- Actively request Codex skill reload when available; otherwise record fallback evidence.
- Write checkpoint under _bmad-output/self-improvement/.
- Allow continuation only after gates, commit, install/refresh evidence, checkpoint, effective schedule/config, and caps pass.

Task:
[PASTE OPTIONAL SELF-IMPROVEMENT GOAL HERE]
```

## Self-Edit and Policy-Edit

Automation may edit `bmad-self-improve` and the policy file. The current loop uses baseline rules captured at start. Party Mode consensus for policy changes requires at least three BMAD voices, including Developer and Architect, and the checkpoint records that evidence.

The deterministic invariant checker blocks weakened non-negotiables. If the checker cannot classify a policy change, the loop stops for human review with no install, no refresh, and continuation blocked.

## Stop Conditions

Stop and report before continuing when:

- Required input or finite stop condition is missing.
- Policy baseline cannot be captured.
- Lock exists without checkpointed stale-lock failure evidence.
- Fresh non-main branch cannot be created.
- Push would be required.
- Dirty state contains a secret or huge generated artifact.
- Tests or quality still fail after `max_fix_attempts=5`.
- Install or refresh fails after quality passes.
- Party Mode conflicts with repo rules, tests, or policy.
- Policy change weakens a non-negotiable invariant.
- The invariant checker cannot classify a policy change.
- compile/install evidence is missing when generated skills change.
- Refresh status cannot be recorded.

## Checkpoint Evidence

Write checkpoints under:

```text
_bmad-output/self-improvement/<YYYYMMDD-HHMM>-<slug>.md
```

Each checkpoint records objective, question, mode and inputs, effective automation schedule/config, base SHA, baseline policy hash, branch, dirty preservation commit, Party Mode decision and critique, policy consensus evidence, plan status, changed files, tests run, pass/fail output, full gate output, compile/install evidence, refresh evidence, local commit SHAs, lock result, continuation decision, resume command, unresolved risks, and next operator decision.
