---
name: bmad-loop
description: 'Runs a generic local Codex/BMAD automation loop with checkpointed safety gates. Use when a repeatable local improvement loop needs explicit goal input, branch safety, quality gates, install/refresh evidence, and resumable checkpoints.'
---

# BMAD Loop

## Purpose

`bmad-loop` is the generic local automation loop contract for BMAD. It provides
the reusable mechanics for a bounded Codex/BMAD run: input resolution, branch
safety, dirty-worktree preservation, Party Mode planning, TDD slices, quality
gates, install/refresh evidence, local commit, checkpoint, and resume decision.

`bmad-loop` has no built-in product goal. A run starts only when it receives a
direct operator goal, a readable `workflow.goal_ref`, or a non-empty
`workflow.scope`.

Refusal message when goal input is missing:

```text
BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
```

Customize may author instance defaults only. Runtime resolver and validators
still enforce safety, gates, branch rules, checkpoint requirements, and
continuation contract.

## Activation

1. Resolve workflow customization:

   ```bash
   python3 {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow
   ```

2. Resolve input precedence:

   - Direct operator goal wins for the current run.
   - Otherwise read `workflow.goal_ref` if it is non-empty and readable.
   - Otherwise use non-empty `workflow.scope`.
   - If both `goal_ref` and `scope` exist, `scope` constrains the goal and any
     conflict is recorded in the checkpoint.
   - If no goal source exists, stop with the refusal message above.

3. Require finite `workflow.stop_condition`, non-empty `workflow.quality_command`,
   `workflow.max_fix_attempts=5`, and a branch prefix that does not target
   `main` or `master`.

4. Apply `workflow.activation_steps_prepend`, `workflow.persistent_facts`, and
   `workflow.activation_steps_append` as context only. These fields never bypass
   policy or gates.

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

## Loop Platform v1

`bmad-loop` is runtime contract only.

### `WorkflowBundle`

Passive repo-owned source asset pack for reusable one-shot or recurring loop
workflow. It carries identity, purpose, goal-input contract, success criteria,
recommended BMAD route, Party Mode gate prompt, template refs, and Workspace
evidence guidance. `WorkflowBundle` owns no runtime semantics.

### `LoopRunConfig`

Passive resolved run config from sparse `[workflow]` fields:
`loop_skill`, `loop_slug`, goal refs, branch/checkpoint settings, template
refs, caps, facts, hooks, and `on_complete`.

Thin loop instances inherit unspecified fields from referenced `loop_skill`
defaults. Future generic `bmad-loop` fields pass through unchanged unless the
instance intentionally overrides them.

### Explicit v1 Non-Goals

- no first-class chain model
- no first-class queue or scheduler model
- no persisted recursion
- no new Workspace CLI commands

## LOOP-AUTO Invariants

- `LOOP-AUTO-001` fresh non-main branch from current `HEAD` unless explicit
  `base_ref` is supplied.
- `LOOP-AUTO-002` never run implementation work on `main` and never push.
- `LOOP-AUTO-003` local Conventional Commits only.
- `LOOP-AUTO-004` dirty worktree preservation preflight with
  `git status --porcelain --untracked-files=all`.
- `LOOP-AUTO-005` full gates each loop, including the configured quality command
  on `HEAD` of the exact checkout.
- `LOOP-AUTO-006` `max_fix_attempts=5`.
- `LOOP-AUTO-007` `max_iterations=1` by default; starter automation may set
  `max_iterations=3` and `daily_cap=3`.
- `LOOP-AUTO-008` continuation only after gates, commit when code changed,
  install/refresh evidence, checkpoint, and effective automation schedule/config
  checks succeed.
- `LOOP-AUTO-009` install repo-local/test target first, then any configured user
  target when policy allows; record refresh evidence.
- `LOOP-AUTO-010` loop skill and policy edits use baseline policy gate.
- `LOOP-AUTO-011` Party Mode may refine an instantiated goal, but must not
  silently create one.
- `LOOP-AUTO-012` one active loop per repo through
  `{checkpoint_subdir}/automation.lock`.
- `LOOP-AUTO-013` hosted orchestrators such as Vercel Workflow WDK remain future
  optional adapters and must wrap the local policy.

## State Machine

The loop proceeds in this order:

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

Resume must continue from the last checkpointed state. Do not restart discovery
unless checkpoint evidence says the plan is invalid.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

`bmad-loop` may consume these shared capabilities when the instantiated goal
needs them:

- `capability:zoom-out` `zoom-out` runs one bounded reframing pass for problem,
  constraints, alternatives, and chosen path.
- `capability:tdd` `tdd` produces failing-test-first implementation guidance
  when implementation risk warrants it.
- `capability:ubiquitous-language` `ubiquitous-language` aligns terms across
  skills, docs, prompts, module help, and code-facing names.
- `capability:grill-me` `grill-me` runs an opt-in or checkpoint-only challenge
  round; record objections plus decisions changed or deferred.

## One-Shot And Recurring

- One-shot workflow = `WorkflowBundle` + `LoopRunConfig` with `max_iterations=1`.
- Recurring loop = same `WorkflowBundle` + explicit recurring caps.
- Same bundle must support both modes without changing bundle semantics.

## Template Contract

- `prompt_template`: operator prompt only. No side effects.
- `resume_prompt_template`: continuation prompt only. No side effects.
- `checkpoint_template`: checkpoint and evidence shape only. No side effects.

Reusable long prompts become `WorkflowBundle` assets when they need durable goal
contract, resume/checkpoint shape, Workspace evidence guidance, or future slash
hooks such as `/workflow-start`, `/loop-start`, `/loop-resume`, or
`/loop-plan`. Those hooks remain operator-assist-only design surfaces in v1.

## Party Mode Gate

Before any dedicated loop-specific planning pass, Party Mode output records:

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

## Required Sequence

1. Verify repo instructions, current git state, `bmad --version`, and
   `bmad workspace --help`.
2. Read the configured policy reference and capture baseline policy content plus
   base SHA.
3. Read effective automation schedule/config, explicit operator parameters, and
   latest checkpoint.
4. Acquire `{checkpoint_subdir}/automation.lock`.
5. Run `git status --porcelain --untracked-files=all` before branch creation.
6. If dirty non-ignored files exist, scan pending files for suspected secrets
   and huge generated artifacts before preservation.
7. If the scan passes and preservation is required, commit the current checkout
   with `chore: preserve pre-automation worktree state`.
8. Create or switch to a fresh non-main branch matching `workflow.branch_prefix`.
9. Run `skill:bmad-party-mode` before writing any plan.
10. Write a decision-complete plan with acceptance criteria, TDD slices,
    compile/install steps, refresh probe, checkpoint path, continuation
    preconditions, `WorkflowBundle` refs, and `LoopRunConfig` summary.
11. Run `skill:bmad-party-mode` again before implementation to critique the
    plan.
12. Implement with TDD, one vertical slice at a time.
13. Run targeted validation after each slice.
14. Run the configured quality command on `HEAD` of the exact checkout.
15. Run invariant validators when loop policy, loop skill, or loop instance
    surfaces change.
16. Run compile/install for updated BMAD skills when generated skills change.
17. Verify Codex refresh behavior when active skills change. Codex App Server
    facts such as `skills/list` with `forceReload: true`, `skills/changed`, and
    thread start/resume are optional launcher evidence only, never BMAD
    authority.
18. Record Activation State, Resume Contract, and Session Identity.
19. Commit passing work locally with a Conventional Commit message. Never push.
20. Write final checkpoint.
21. Allow continuation only when all Activation State gates pass and caps allow
    another loop.

## Completion

Complete only after the loop writes a checkpoint that records outcome, changed
files, test evidence, quality evidence, install/refresh evidence when relevant,
Activation State, Resume Contract, Session Identity, local commits, and exact
next operator decision.
