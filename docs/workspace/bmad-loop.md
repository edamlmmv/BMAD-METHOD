---
title: "BMAD Loop Runbook"
description: Generic local Codex/BMAD automation loop runbook
---

# BMAD Loop Runbook

`bmad-loop` runs repeatable local Codex/BMAD automation loops. It supplies the
mechanics for a safe bounded loop, but it does not supply a goal. An instance or
operator must provide a direct goal, readable `goal_ref`, or non-empty `scope`.

Read [BMAD Loop Automation Policy](./bmad-loop-automation-policy.md) before
running or editing the loop.

## Public Names

- Skill: `bmad-loop`
- Menu code: `BL`
- Generic invariants: `LOOP-AUTO-*`
- Self-improve instance: `bmad-self-improve`
- Self-improve compatibility aliases: `SI-AUTO-*`

## Required Launch Inputs

- `repo_path`: repository to run against.
- `base_ref`: optional; default is current `HEAD`.
- direct operator goal, `goal_ref`, or `scope`.
- `stop_condition`: finite endpoint such as checkpoint written, max iterations,
  max fix attempts, or operator review.
- `quality_command`: default `npm ci && npm run quality`.
- `max_iterations`: default `1`; starter automation may set `3`.
- `daily_cap`: default `1`; starter automation may set `3`.
- `max_fix_attempts`: fixed at `5`.
- effective automation schedule/config or explicit operator-provided cadence
  parameters.

If goal input or finite controls are missing, stop before mutation with:

```text
BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
```

## State Machine

The loop state order is:

1. Input resolved.
2. Lock acquired.
3. Dirty preflight/scanned.
4. Branch ready.
5. Party Mode plan.
6. Party Mode critique.
7. TDD slices.
8. Quality gate.
9. Install/refresh evidence.
10. Local commit.
11. Checkpoint.
12. Complete, blocked, or continuation-ready.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

`bmad-loop` consumes these shared capabilities when the instantiated goal needs
them:

- `capability:zoom-out` `zoom-out`: reframe the problem, constraints,
  alternatives, and chosen path.
- `capability:tdd` `tdd`: produce failing-test-first implementation guidance.
- `capability:ubiquitous-language` `ubiquitous-language`: align terms across
  docs, prompts, module help, and code-facing names.
- `capability:grill-me` `grill-me`: challenge a plan at checkpoint boundaries
  and record decisions changed or deferred.

## Customize Boundary

`bmad-customize` may author minimal Customize instance config for exposed
`[workflow]` fields. Customize does not create runtime authority, branch
permission, verifier trust, Workspace schema, scheduler behavior, hidden
execution, push permission, or gate bypass.

Runtime resolver rejects unsafe or incomplete config. Validators enforce branch
safety, no-push, dirty preflight, quality gate, install/refresh evidence, and
checkpoint continuation requirements.

## Codex Boundary

Codex app-server facts such as `skills/list` with `forceReload: true`,
`skills/changed`, and thread start/resume can be recorded as launcher evidence.
They do not authorize Workspace writes, BMAD policy changes, tool availability,
hidden execution, or continuation.

Hosted orchestrators such as Vercel Workflow WDK are future optional adapters
only. They must wrap this contract and cannot replace it.
