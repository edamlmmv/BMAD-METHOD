---
title: "Optimization Loop Workspace Evidence Contract"
description: Setup and evidence contract for the thin-v1 optimization-loop candidate
---

# Optimization Loop Workspace Evidence Contract

This note defines the Workspace-facing contract for the `optimization-loop`
candidate before any bundle or thin config is authored.

## Setup Gate Decisions

| Setup ref | Thin-v1 decision | Current slice status |
| --- | --- | --- |
| `zoomOut` | Required before the first Workspace packet. It must capture the problem, constraints, alternatives, chosen path, and declared metric. | Not yet authored as a dedicated artifact. Derive it next from the candidate brief plus route note before any packet is created. |
| `ubiquitousLanguage` | Optional by default. Create it only if target, metric, or evidence terms drift across docs or prompts. Otherwise skip with explicit reason. | Default skip is acceptable for this slice because terms are still stable. |
| `grillDecisions` | Required when material objections or deferred decisions affect admission, metric, or stop rules. | Satisfied for planning by `file:docs/workspace/optimization-loop-party-mode-gate.md`. |
| `tddPlan` | Required before any implementation packet or code mutation. | Intentionally deferred. This slice is not packet-ready for implementation until the TDD plan exists. |

## Admission Contract

A thin-v1 `optimization-loop` run is valid only when all of the following are
present:

- direct operator goal in plain language
- explicit optimization target
- explicit metric declaration
- bounded scope
- declared action mode: `apply-if-safe` or `propose-only`

`goal_ref` and `scope` may support the run later, but they do not replace the
direct operator goal for this candidate.

### Metric Declaration Minimum

The metric declaration must name:

- metric name
- desired direction of improvement
- unit or rubric
- baseline capture method
- acceptable evidence surface

Without those fields, the run must terminate as `invalid-input`.

## Outcome Classes

The one-shot result contract uses four explicit outcome classes:

- `improved`
  A bounded change was applied and a comparable before/after delta was
  recorded against the declared metric.
- `proposed`
  A concrete next improvement was produced but not applied. This is advisory
  completion only and requires explicit operator next action.
- `blocked`
  No safe credible action remained or no acceptable evidence surface could
  support a trustworthy comparison.
- `invalid-input`
  Admission failed because required goal, target, metric, scope, or action-mode
  inputs were missing or non-comparable.

## Evidence Requirements

### Success Evidence For `improved`

- baseline metric evidence ref
- after-state metric evidence ref captured from the same surface or method
- selected action and rationale
- delta summary tied to the declared metric
- targeted validation outcome
- full quality outcome when repo changes were made

### Advisory Evidence For `proposed`

- baseline metric evidence ref
- proposal artifact or proposal summary ref
- rationale for why the proposal was not applied
- explicit operator next action recommendation

### Blocked Evidence For `blocked`

- baseline or admission evidence refs
- blocker classification
- explanation of why no safe credible action remained
- evidence of rejected or unavailable comparison surface
- explicit recommendation to stop, narrow scope, or restate the goal

## Continuation Versus Stop

- Thin-v1 one-shot mode always stops after one recorded outcome.
- A continuation recommendation may be recorded, but it is advisory only.
- Any second cycle is a new operator decision and a new manual run, never
  automatic recurrence.

## Workspace Artifact Expectations

### Checkpoint Must Record

- resolved direct goal
- optimization target
- metric declaration
- action mode
- selected action or blocked rationale
- outcome class
- evidence refs used
- continuation recommendation

### Result Must Record

- outcome
- summary
- command text when commands were run manually
- baseline ref
- after-state, proposal, or blocked refs
- targeted validation evidence

### Closeout Must Record

- final outcome
- next manual action
- result refs
- review ref when code changes were applied
- exact reason another cycle is or is not recommended

## Decision After Step 5

Step 5 resolves the main gate concerns enough to continue planning, but only
under the stricter admission and outcome contract above.

Step 6 is unblocked if the future bundle keeps these rules intact. Step 6 is
still blocked if bundle authoring tries to relax direct goal admission, blur
`improved` vs `proposed`, or imply automatic continuation.
