---
name: bmad-self-improve
description: 'Runs BMAD repository improvement as a predefined bmad-loop instance. Use when improving BMAD itself with explicit operator goal, goal_ref, or scope plus Party Mode, TDD, quality gates, install/refresh evidence, and checkpointed continuation.'
---

# BMAD Self-Improve

## Purpose

`bmad-self-improve` is the BMAD repository instance of `skill:bmad-loop`. It
keeps the public self-improvement entrypoint while delegating generic loop
mechanics to `bmad-loop`. It remains a local Codex automation loop for BMAD
repository changes, with `SI-AUTO-*` compatibility terms preserved for existing
validators, docs, and checkpoints.

Self-Improve is thin repo-owned loop instance. Its self-improve-specific
templates act as `WorkflowBundle` assets, while unresolved `LoopRunConfig`
fields inherit from `bmad-loop` through `loop_skill = "bmad-loop"`.

Self-Improve has no built-in improvement goal. A run starts only when the
operator supplies a direct goal, a readable `workflow.goal_ref`, or a non-empty
`workflow.scope`.

Refusal message when goal input is missing:

```text
BMAD loop needs one of: direct operator goal, workflow.goal_ref, or workflow.scope, plus finite stop_condition and quality_command. Provide input or use bmad-customize to author instance fields.
```

Party Mode may refine an instantiated goal, choose targets inside that goal, and
critique a plan. Party Mode must not silently create a goal when direct operator
goal, `workflow.goal_ref`, and `workflow.scope` are all absent.

## Instance Resolution

Resolve the self-improve workflow surface before planning or implementation:

```bash
python3 {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow
```

Input precedence:

- Direct operator goal wins for the current run.
- Otherwise read `workflow.goal_ref` if it is non-empty and readable.
- Otherwise use non-empty `workflow.scope`.
- If both `goal_ref` and `scope` exist, `scope` constrains the goal and any
  conflict is recorded in the checkpoint.
- If no goal source exists, stop with the refusal message above.

Customize may author Self-Improve instance defaults only. Runtime resolver and
validators still enforce safety, gates, branch rules, checkpoint requirements,
install/refresh evidence, and continuation contract.

## Public Names

- Generic skill: `bmad-loop`
- Generic menu code: `BL`
- Self-improve instance: `bmad-self-improve`
- Self-improve menu code: `SI`
- Generic invariants: `LOOP-AUTO-*`
- Self-improve compatibility aliases: `SI-AUTO-*`

## Compatibility Aliases

`SI-AUTO-*` names remain compatibility aliases for existing docs, checkpoints,
and tests. New self-improvement docs should prefer `LOOP-AUTO-*`.

| Alias | Generic invariant |
| --- | --- |
| `SI-AUTO-001` | `LOOP-AUTO-001` fresh non-main branch |
| `SI-AUTO-002` | `LOOP-AUTO-002` main and push guard |
| `SI-AUTO-003` | `LOOP-AUTO-003` local Conventional Commits |
| `SI-AUTO-004` | `LOOP-AUTO-004` dirty worktree preservation |
| `SI-AUTO-005` | `LOOP-AUTO-005` full gates each loop |
| `SI-AUTO-006` | `LOOP-AUTO-006` fix attempt cap |
| `SI-AUTO-007` | `LOOP-AUTO-007` iteration caps |
| `SI-AUTO-008` | `LOOP-AUTO-008` schedule-aware continuation |
| `SI-AUTO-009` | `LOOP-AUTO-009` install and refresh evidence |
| `SI-AUTO-010` | `LOOP-AUTO-010` loop-edit baseline gate |
| `SI-AUTO-011` | `LOOP-AUTO-011` Party Mode goal boundary |
| `SI-AUTO-012` | `LOOP-AUTO-012` loop lock |
| `SI-AUTO-013` | `LOOP-AUTO-013` future Vercel Workflow WDK hosted adapter boundary |

Self-Improve checkpoints and older prompts may still refer to
`SELF_IMPROVE_BASE_REF`; treat it as the self-improve instance name for the
generic loop `base_ref`. The loop lock remains `automation.lock` under the
resolved checkpoint subdir. Dirty preflight still records
`git status --porcelain --untracked-files=all` before branch mutation. Party Mode consensus is required before implementation, and continuation must consult
the effective automation schedule/config. Continuation also requires that the
active skill hash matches expected and refresh state is known_good.

## Instance Defaults

Self-Improve overrides live in `customize.toml` under `[workflow]`:

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

Other `LoopRunConfig` fields inherit from `bmad-loop` unless Self-Improve
intentionally overrides them later. That keeps future generic loop fields
available without copy-paste drift.

Inherited loop controls still apply even when Self-Improve does not override
them locally, including `stop_condition`, `quality_command`,
`max_iterations`, `daily_cap`, and `max_fix_attempts`.

## Shared BMAD Planning Capabilities

Shared BMAD planning capabilities are operator-invoked planning/setup aids discoverable from Help, Workspace, Self-Improve, and Party Mode; they do not run automatically or change Workspace schema.

Self-Improve consumes these shared capabilities through the generic loop when
the instantiated goal needs them:

- `capability:zoom-out` `zoom-out` runs one bounded reframing pass for problem,
  constraints, alternatives, and chosen path.
- `capability:tdd` `tdd` produces failing-test-first implementation guidance
  when implementation risk warrants it.
- `capability:ubiquitous-language` `ubiquitous-language` aligns terms across
  skills, docs, prompts, module help, and code-facing names.
- `capability:grill-me` `grill-me` runs an opt-in or checkpoint-only challenge
  round; record objections plus decisions changed or deferred.

## Workspace Graph Evidence

Self-Improve consumes Workspace graph evidence only, through BMAD Workspace
artifacts such as `intake/graph.json`, `intake/repo-intake.json`, and
`intake/provenance.json`. It must not call Graphify ad hoc and must not silently
regenerate graph artifacts.

Graph evidence is advisory. Source files remain authority before any
recommendation or edit. Workspace graph evidence does not authorize writes,
pushes, MCP activation, hidden execution, or Graphify regeneration.

## Capability Verifier Boundary

`bmad workspace verify-capability` is a declared-contract compatibility check
only. `ok: true` never means runtime availability, write authorization,
continuation permission, install readiness, quality success, or Evidence Gate
pass state.

Evidence Gate v1 is future-compatible context only for this instance unless a
future explicit change promotes it through generic loop policy and tests.

## Customize Boundary

`bmad-customize` is authoring and education only. `_bmad/custom/*.toml` can
guide local agents and define instance defaults, but it is never verifier
authority, central capability config, grant source, runtime authority, or
Self-Improve continuation gate.

Executor Contract is manual readiness only. Workspace Result, Review, and
Closeout are manual evidence only. They do not execute, approve, merge, promote,
push, restore, replay, schedule, watch, or activate adapters.

## Evidence Gate v1 Boundary

Evidence Gate v1 language is future-compatible with Workspace packet v5.
Self-Improve does not actively enforce Evidence Gate v1 in v1 and does not mark
gates pass/fail. Workspace evidence remains advisory unless a separate Workspace
Session contract declares and validates required gates.

## Required Sequence

After resolving a valid goal source, follow `skill:bmad-loop` with these
self-improve instance constraints:

1. Read `docs/workspace/bmad-loop-automation-policy.md` and
   `docs/workspace/self-improvement-codex.md`.
2. Capture base SHA, resolved workflow fields, and baseline policy hash before
   edits.
3. Use branch prefix `codex/self-improve-`.
4. Use checkpoint subdir `{output_folder}/self-improvement`.
5. Run `skill:bmad-party-mode` before writing any plan. Party Mode may refine
   the instantiated goal and choose BMAD repo targets inside it.
6. Run `skill:bmad-party-mode` again before implementation to critique the plan.
7. Implement with TDD, one vertical slice at a time.
8. Run targeted validation after each slice.
9. Run `npm ci && npm run quality` on `HEAD` of the exact checkout before local
   code commit, install, refresh, or continuation.
10. Run `npm run validate:bmad-loop-invariants` when generic loop policy,
    generic loop docs, or `bmad-loop` changes.
11. Run `npm run validate:self-improve-invariants` when self-improve instance
    docs, alias mapping, policy, or `bmad-self-improve` changes.
12. Run compile/install for updated BMAD skills with the existing installer when
    generated skills change.
13. Verify Codex refresh behavior when active skills change. Codex App Server
    facts such as `skills/list` with `forceReload: true`, `skills/changed`, and
    thread start/resume are optional launcher evidence only, never BMAD
    authority.
14. Record Activation State, Resume Contract, Session Identity, local commits,
    warning/LOW disposition, dirty worktree impact, residual risk, and exact
    push/PR next step in the checkpoint.
15. Never push.

## Completion

Complete only after the instantiated loop is implemented or explicitly blocked,
targeted tests are green or failure is recorded after `max_fix_attempts=5`, full
quality gate output is recorded when reached, compile/install and refresh
evidence are recorded when generated skills change, and final checkpoint plus
continuation decision exist.
