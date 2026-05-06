---
title: "Loop Platform v1"
description: Thin pre-established loop platform over the generic bmad-loop contract
---

# Loop Platform v1

`bmad-loop` remains the only runtime and execution contract for BMAD loops.
Pre-established loops in v1 are thin, repo-owned source assets layered on top
of that contract.

## Initial Concepts

### `WorkflowBundle`

Passive repo-owned source asset pack for one reusable workflow goal. A
`WorkflowBundle` may be long-form prompt content, but it becomes a bundle only
when it needs:

- durable goal contract
- explicit success criteria
- reusable prompt, resume, and checkpoint templates
- Party Mode gate guidance
- Workspace evidence guidance
- future slash-command entrypoints

Bundle contents are:

- identity and purpose
- goal-input contract
- success criteria
- recommended BMAD route from `bmad-help`
- Party Mode gate prompt
- `prompt_template`
- `resume_prompt_template`
- `checkpoint_template`
- Workspace evidence guidance

`WorkflowBundle` owns no runtime semantics.

### `LoopRunConfig`

Passive run configuration resolved from `customize.toml` and sparse overrides.
It maps to the `[workflow]` fields already consumed by `bmad-loop`:

- `loop_skill`
- `loop_slug`
- `goal_ref`
- `scope`
- `repo_path`
- `branch_prefix`
- `checkpoint_subdir`
- `allowed_write_roots`
- `policy_ref`
- `runbook_ref`
- `prompt_template`
- `resume_prompt_template`
- `checkpoint_template`
- `stop_condition`
- `quality_command`
- `max_iterations`
- `daily_cap`
- `max_fix_attempts`
- `persistent_facts`
- `activation_steps_prepend`
- `activation_steps_append`
- `on_complete`

Unspecified loop-instance fields inherit from the referenced `loop_skill`
defaults. For predefined loop instances, `loop_skill = "bmad-loop"` keeps new
generic fields available without copy-paste churn unless the instance
intentionally overrides them.

## One-Shot And Recurring

- One-shot workflow = `WorkflowBundle` + `LoopRunConfig` with `max_iterations=1`.
- Recurring loop = same `WorkflowBundle` + explicit recurring caps in
  `LoopRunConfig`.
- Same bundle must support both modes without changing bundle semantics.

## Template Contract

Template roles stay explicit:

- `prompt_template`: operator prompt only. No side effects.
- `resume_prompt_template`: continuation prompt only. No side effects.
- `checkpoint_template`: checkpoint and evidence shape only. No side effects.

Future loop instances should start from
[Workflow Bundle Template](./templates/workflow-bundle.template.md) and
[Loop Party Mode Gate Template](./templates/loop-party-mode-gate.template.md).

## Party Mode Gate

Before every dedicated loop-specific planning pass, run a generic Party Mode
gate. Its durable output records:

- goal
- success metric
- chosen run mode
- recommended BMAD route
- main risks
- required evidence
- open questions
- deferred questions

Gate depth is dynamic:

- `light`
- `standard`
- `deep`

Party Mode is advisory only. Operator owns stop/go.

## Workspace And Slash Hooks

Workspace remains manual and evidence-first. Loop planning may use existing
`launch`, `intake`, `packet`, `status`, `evidence`, `handoff`, `result`, and
`closeout` only as optional scaffolding.

Slash hooks are design-only in v1:

- `/workflow-start <bundle>`
- `/loop-start <bundle>`
- `/loop-resume <bundle>`
- `/loop-plan <candidate>`

All slash hooks are operator-assist only. They are not scheduler, executor,
auto-resume, or Workspace authority.

## Candidate Registry

Candidate loops stay docs-only in v1. See
[Loop Candidate Registry](./loop-candidate-registry.md). Plan one candidate at
a time in a fresh context.

## Explicit Non-Goals

- no first-class chain model
- no first-class queue or scheduler model
- no persisted recursion
- no new Workspace CLI commands
