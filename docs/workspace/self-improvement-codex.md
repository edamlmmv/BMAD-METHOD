---
title: "bmad-self-improve Instance Runbook"
description: BMAD repository improvement as a predefined bmad-loop instance
---

# `bmad-self-improve` Instance Runbook

`bmad-self-improve` is the BMAD repository instance of
[BMAD Loop](./bmad-loop.md). It keeps the public self-improvement entrypoint and
uses generic `bmad-loop` mechanics for branch safety, Party Mode planning, TDD,
quality gates, install/refresh evidence, checkpointing, and continuation.
This remains a local Codex automation loop for improving BMAD itself.

In loop platform v1, Self-Improve is thin repo-owned loop instance. Its
self-improvement docs and templates act as `WorkflowBundle` assets, while its
resolved `LoopRunConfig` inherits from `bmad-loop` and resolves unspecified
fields from that generic loop contract.

Read [BMAD Loop Automation Policy](./bmad-loop-automation-policy.md) before
running or editing this workflow. Self-Improvement Automation Policy is the
legacy name for this self-improve instance policy surface.

## Foreground Resume Quickstart

Resume a foreground run by reading the latest checkpoint, validating Activation
State, Resume Contract, and Session Identity, then continuing only when the
checkpoint allows continuation and current repo state still matches the recorded
evidence.

## Evidence Gate v1 Boundary

Evidence Gate v1 language is future-compatible with Workspace packet v5.
Self-Improve does not actively enforce Evidence Gate v1 in v1 and does not mark
gates pass/fail. Hosted orchestrators such as Vercel Workflow WDK remain future
optional adapters and are not part of the local self-improve run.

## Migration Notes

- Existing `bmad-self-improve` users now provide a direct operator goal,
  readable `workflow.goal_ref`, or non-empty `workflow.scope`.
- Old baked self-improve goal selection is removed. Party Mode may refine an
  instantiated goal, but it must not silently create one.
- Self-Improve now prefers sparse instance overrides. Unspecified generic loop
  fields inherit from `bmad-loop`.
- Existing checkpoints remain under `_bmad-output/self-improvement` unless the
  resolved `workflow.checkpoint_subdir` changes.
- `SI-AUTO-*` invariant names remain compatibility aliases only. New docs prefer
  `LOOP-AUTO-*`.
- SI-AUTO-* invariant names remain compatibility aliases only.

## Required Launch Inputs

Every run defines:

- `repo_path`: BMAD repository path, default `{project-root}`.
- `base_ref`: optional; default is current `HEAD`.
- direct operator goal, `goal_ref`, or `scope`.
- `stop_condition`: finite endpoint such as checkpoint written, max iterations,
  max fix attempts, or operator review.
- `quality_command`: default `npm ci && npm run quality`.
- `max_iterations`: default `1`.
- `daily_cap`: default `1`.
- `max_fix_attempts`: fixed at `5`.
- effective automation schedule/config or explicit operator-provided cadence
  parameters.

When goal input or finite controls are missing, stop before mutation with:

```text
BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
```

## Resolved Instance Defaults

`src/core-skills/bmad-self-improve/customize.toml` defines the shipped instance
overrides:

- `loop_skill = "bmad-loop"`
- `loop_slug = "self-improve"`
- `repo_path = "{project-root}"`
- `branch_prefix = "codex/self-improve-"`
- `checkpoint_subdir = "{output_folder}/self-improvement"`
- `allowed_write_roots = ["{project-root}"]`
- `runbook_ref = "docs/workspace/self-improvement-codex.md"`
- `prompt_template = "docs/workspace/templates/self-improvement-codex-prompt.md"`
- `resume_prompt_template = "docs/workspace/templates/self-improvement-codex-resume-prompt.md"`
- `checkpoint_template = "docs/workspace/templates/self-improvement-checkpoint.template.md"`

`bmad-customize` may author minimal Customize instance config for these exposed
workflow fields. Customize does not bypass branch safety, dirty preflight,
quality gates, install/refresh evidence, validators, or checkpoint requirements.

Other `LoopRunConfig` fields inherit from `bmad-loop` unless Self-Improve
intentionally overrides them later.

## Capability Verifier Boundary

`bmad workspace verify-capability` remains a declared-contract compatibility
check only. A successful verdict is planning evidence, not runtime availability,
write authorization, continuation permission, install readiness, quality
success, or Evidence Gate pass state.

## Required Sequence

1. Resolve self-improve workflow customization.
2. Resolve direct operator goal first, else `workflow.goal_ref`, else
   `workflow.scope`; stop if none exists.
3. Read `docs/workspace/bmad-loop-automation-policy.md`.
4. Capture base SHA, resolved instance fields, and baseline policy hash before
   edits.
5. Acquire `{output_folder}/self-improvement/automation.lock`.
6. Run `git status --porcelain --untracked-files=all` before branch creation.
7. Scan dirty non-ignored files for suspected secrets and huge generated
   artifacts before preservation.
8. Use a fresh non-main branch matching `codex/self-improve-*`.
9. Run `skill:bmad-party-mode` before writing any plan. Party Mode may refine
   the instantiated goal and choose BMAD repo targets inside it.
10. Write a decision-complete plan with acceptance criteria, TDD slices,
    compile/install steps, refresh probe, checkpoint path, and continuation
    preconditions.
11. Run `skill:bmad-party-mode` again before implementation to critique the
    plan.
12. Implement with TDD, one vertical slice at a time.
13. Run targeted validation after each slice.
14. Run `npm ci && npm run quality` on `HEAD` of the exact checkout before local
    code commit, install, refresh, or continuation.
15. Run `npm run validate:bmad-loop-invariants` when generic loop surfaces
    change.
16. Run `npm run validate:self-improve-invariants` when self-improve instance
    surfaces or `SI-AUTO-*` alias behavior changes.
17. compile/install updated BMAD skills with the existing installer when skills
    change.
18. Verify Codex refresh behavior when active skills change. Codex App Server
    facts such as `skills/list` with `forceReload: true`, `skills/changed`, and
    thread start/resume are optional launcher evidence only, never BMAD
    authority.
19. Record Activation State, Resume Contract, Session Identity, local commits,
    warning/LOW disposition, dirty worktree impact, residual risk, and exact
    push/PR next step.
20. Write checkpoint under `_bmad-output/self-improvement` unless
    `checkpoint_subdir` resolves elsewhere. Never push.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Self-Improve consumes these shared capabilities through `bmad-loop` when the
instantiated goal needs them:

- `capability:zoom-out` `zoom-out`
- `capability:tdd` `tdd`
- `capability:ubiquitous-language` `ubiquitous-language`
- `capability:grill-me` `grill-me`

## Completion

Complete only after the instantiated loop writes a checkpoint that records
resolved input, branch, commits, tests, full gate evidence, install/refresh
evidence when relevant, Activation State, Resume Contract, Session Identity,
warning/LOW disposition, dirty worktree impact, residual risk, exact push/PR
next step, and continuation decision.
