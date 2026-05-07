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

## Loop Platform v1

`bmad-loop` is runtime contract only. Pre-established loops in v1 stay thin and
repo-owned.

### `WorkflowBundle`

`WorkflowBundle` is passive source asset pack for reusable one-shot or recurring
loop workflow. It contains:

- identity and purpose
- goal-input contract
- success criteria
- recommended BMAD route
- Party Mode gate prompt
- `prompt_template`
- `resume_prompt_template`
- `checkpoint_template`
- Workspace evidence guidance

`WorkflowBundle` owns no runtime semantics.

### `LoopRunConfig`

`LoopRunConfig` is passive resolved run config from sparse `[workflow]` fields.
It includes `loop_skill`, `loop_slug`, goal refs, branch/checkpoint settings,
template refs, caps, facts, hooks, and `on_complete`.

Predefined loop instances should stay thin. Unspecified fields inherit from the
referenced `loop_skill` defaults. For thin repo-owned loop instances, new
generic `bmad-loop` fields pass through unchanged unless the instance
intentionally overrides them.

### Explicit v1 Non-Goals

- no first-class chain model
- no first-class queue or scheduler model
- no persisted recursion
- no new Workspace CLI commands

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

Reusable long prompts become `WorkflowBundle` assets when they need durable goal
contract, resume/checkpoint shape, Workspace evidence guidance, or future slash
hooks such as `/workflow-start`, `/loop-start`, `/loop-resume`, or
`/loop-plan`. Those hooks remain operator-assist-only design surfaces in v1.

## Routing And Authority Matrix

Use `bmad-help` when intent, phase, or tool choice is unclear. Help owns routing
by phase/intent/catalog; it does not own workflow execution.

| Tool | Owns | Does Not Own |
| --- | --- | --- |
| `bmad-help` | routing by phase/intent/catalog | workflow execution |
| `bmad-workspace` | session setup, packets, evidence, result/review/closeout ledger | runtime authority, readiness gate, override authority |
| `bmad-loop` | checkpointed automation, branch safety, quality gate, commits, resume contract | BMM artifact readiness judgment, customize authoring |
| `bmad-self-improve` | thin BMAD repo instance of `bmad-loop` | separate engine or new authority layer |
| `bmad-customize` | sparse `[workflow]` overrides for exposed fields | verifier authority, grants, runtime bypass, safety bypass |
| `bmad-check-implementation-readiness` | BMM Phase 3 to Phase 4 planning gate | every loop run, Workspace setup, generic automation |

Use this trigger matrix before planning:

| Condition | Route |
| --- | --- |
| User asks "which BMAD?" or phase unclear | Start `bmad-help` |
| BMM PRD/UX/Architecture/Epics/Stories move toward Phase 4 implementation | Run `bmad-check-implementation-readiness` |
| Material scope change creates new implementation commitment | Run `bmad-check-implementation-readiness` again |
| Generic bounded automation goal exists | Run `bmad-loop`; no automatic Implementation Readiness |
| BMAD repo improvement goal exists | Run `bmad-self-improve`; inherits `bmad-loop` |
| Need goal_ref/scope/facts/hooks/templates/defaults | Run `bmad-customize`; override only |
| Need session packet, evidence, review, closeout, archive | Run `bmad-workspace` |

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

## One-Shot And Recurring

- One-shot workflow = `WorkflowBundle` + `LoopRunConfig` with `max_iterations=1`.
- Recurring loop = same `WorkflowBundle` + explicit recurring caps.
- Same bundle must support both modes without changing bundle semantics.

## Template Contract

Template roles stay explicit:

- `prompt_template`: operator prompt only. No side effects.
- `resume_prompt_template`: continuation prompt only. No side effects.
- `checkpoint_template`: checkpoint and evidence shape only. No side effects.

Use
[Workflow Bundle Template](./templates/workflow-bundle.template.md) and
[Loop Party Mode Gate Template](./templates/loop-party-mode-gate.template.md)
when defining new repo-owned loop instances.

## Party Mode Gate

Before any dedicated loop-specific planning pass, record:

- goal
- success metric
- chosen run mode
- recommended BMAD route
- main risks
- required evidence
- open questions
- deferred questions

Gate depth is dynamic: `light`, `standard`, or `deep`. Party Mode is advisory
only. Operator owns stop/go.

## Customize Boundary

`bmad-customize` may author minimal Customize instance config for exposed
`[workflow]` fields. It authors `LoopRunConfig` only. Customize does not create
`WorkflowBundle` assets, runtime authority, branch permission, verifier trust,
Workspace schema, scheduler behavior, hidden execution, push permission, gate
bypass, or persisted recursion.

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
